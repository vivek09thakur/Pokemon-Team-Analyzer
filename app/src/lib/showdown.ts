import { fetchJSON } from "@/common/lib/http";
import { readJSON, writeJSON } from "@/common/lib/storage";
import { API_BASE } from "./constants";
import { formatName } from "./calculation";
import type { Pokemon } from "./types";

const SETS_BASE = "https://data.pkmn.cc/sets";
const PS_MOVES = "https://play.pokemonshowdown.com/data/moves.json";
const ITEM_SPRITES = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items";

export const psId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
export const apiSlug = (s: string) =>
  s
    .toLowerCase()
    .replace(/['.]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const itemSprite = (slug: string) => `${ITEM_SPRITES}/${slug}.png`;

export interface MoveInfo {
  name: string;
  type: string;
  basePower: number;
  category: "Physical" | "Special" | "Status";
}

let moveIndex: Map<string, MoveInfo> | null = null;
let movePromise: Promise<Map<string, MoveInfo>> | null = null;

interface PsMove {
  name: string;
  type: string;
  basePower: number;
  category: MoveInfo["category"];
}

const LARGE_FILE_TIMEOUT_MS = 45_000;

export function loadMoveIndex() {
  if (moveIndex) return Promise.resolve(moveIndex);
  if (movePromise) return movePromise;
  movePromise = fetchJSON<Record<string, PsMove>>(PS_MOVES, LARGE_FILE_TIMEOUT_MS)
    .then((data) => {
      moveIndex = new Map(
        Object.entries(data)
          .filter(([, m]) => typeof m?.type === "string")
          .map(([id, m]) => [
            id,
            { name: m.name, type: m.type.toLowerCase(), basePower: m.basePower, category: m.category },
          ])
      );
      return moveIndex;
    })
    .finally(() => {
      movePromise = null;
    });
  return movePromise;
}

export const moveInfo = (slug: string) => moveIndex?.get(psId(slug));

export interface SuggestedSet {
  format: string;
  name: string;
  moves: string[];
  ability?: string;
  item?: string;
  gen: number;
}

type RawSet = {
  moves: (string | string[])[];
  ability?: string | string[];
  item?: string | string[];
};
type SetsFile = Record<string, Record<string, Record<string, RawSet>>>;

const GENS = [9, 8, 7] as const;
const setFiles = new Map<number, Promise<Map<string, Record<string, Record<string, RawSet>>>>>();

function loadGen(gen: number) {
  const hit = setFiles.get(gen);
  if (hit) return hit;
  const p = fetchJSON<SetsFile>(`${SETS_BASE}/gen${gen}.json`, LARGE_FILE_TIMEOUT_MS)
    .then((data) => new Map(Object.entries(data).map(([species, v]) => [psId(species), v])))
    .catch((e) => {
      console.error(e);
      setFiles.delete(gen);
      return new Map<string, Record<string, Record<string, RawSet>>>();
    });
  setFiles.set(gen, p);
  return p;
}

export const prefetchSets = () => {
  loadGen(9);
  loadMoveIndex().catch(() => {});
};

const FORMAT_RANK = [
  "ou", "uu", "ru", "nu", "pu", "zu", "ubers", "ubersuu", "nationaldex", "nationaldexuu",
  "nationaldexru", "nationaldexubers", "monotype", "nationaldexmonotype", "lc", "nfe",
  "doublesou", "vgc2025", "vgc2024", "vgc2023", "battlestadiumsingles", "1v1", "anythinggoes",
];
const formatRank = (f: string) => {
  const i = FORMAT_RANK.indexOf(f);
  return i === -1 ? FORMAT_RANK.length + (f.startsWith("vgc") ? 0 : 10) : i;
};
export const formatLabel = (f: string) =>
  f.replace(/^nationaldex/, "NatDex ").replace(/^vgc(\d+)/, "VGC $1").toUpperCase().replace("NATDEX ", "NatDex ");

const first = <T,>(v: T | T[] | undefined) => (Array.isArray(v) ? v[0] : v);

function resolveMoves(raw: RawSet["moves"], learnset: Set<string>) {
  const out: string[] = [];
  for (const entry of raw) {
    const options = Array.isArray(entry) ? entry : [entry];
    const pick = options.map(apiSlug).find((s) => learnset.has(s) && !out.includes(s));
    if (pick) out.push(pick);
  }
  return out;
}

export async function suggestedSets(pokemon: Pokemon): Promise<SuggestedSet[]> {
  const learnset = new Set(pokemon.moves.map((m) => m.slug));
  const keys = [pokemon.showdownId, psId(pokemon.name.split(" ").pop() || "")];
  const abilityNames = new Map(pokemon.abilities.map((a) => [psId(a.name), a.name]));
  const results: SuggestedSet[] = [];

  for (const gen of GENS) {
    const file = await loadGen(gen);
    const entry = keys.map((k) => file.get(k)).find(Boolean);
    if (!entry) continue;
    for (const [format, sets] of Object.entries(entry)) {
      for (const [name, raw] of Object.entries(sets)) {
        const moves = resolveMoves(raw.moves, learnset);
        if (moves.length === 0) continue;
        const ab = first(raw.ability);
        results.push({
          format,
          name,
          moves,
          ability: ab ? abilityNames.get(psId(ab)) : undefined,
          item: first(raw.item) ? apiSlug(first(raw.item)!) : undefined,
          gen,
        });
      }
    }
    if (results.length) break;
  }
  return results.sort((a, b) => formatRank(a.format) - formatRank(b.format));
}

export async function fallbackSet(pokemon: Pokemon): Promise<string[]> {
  const idx = await loadMoveIndex();
  const scored = pokemon.moves
    .map((m) => ({ slug: m.slug, info: idx.get(psId(m.slug)) }))
    .filter((m): m is { slug: string; info: MoveInfo } => !!m.info && m.info.basePower > 0);
  const picks: string[] = [];
  const usedTypes = new Set<string>();
  const take = (candidates: typeof scored) => {
    for (const c of candidates.sort((a, b) => b.info.basePower - a.info.basePower)) {
      if (picks.length >= 4) return;
      if (picks.includes(c.slug) || usedTypes.has(c.info.type)) continue;
      picks.push(c.slug);
      usedTypes.add(c.info.type);
    }
  };
  take(scored.filter((m) => pokemon.types.includes(m.info.type as Pokemon["types"][number])));
  take(scored);
  return picks;
}

export interface HeldItem {
  slug: string;
  name: string;
}

const ITEM_CATEGORIES = [
  "held-items", "choice", "bad-held-items", "type-enhancement", "plates", "species-specific",
  "mega-stones", "effort-training", "jewels", "memories", "scarves", "in-a-pinch",
  "type-protection", "picky-healing", "medicine", "other",
];
const ITEMS_KEY = "heldItems:v1";
let itemsPromise: Promise<HeldItem[]> | null = null;

export function loadHeldItems(): Promise<HeldItem[]> {
  if (itemsPromise) return itemsPromise;
  const cached = readJSON<HeldItem[] | null>(ITEMS_KEY, null);
  if (Array.isArray(cached) && cached.length) return (itemsPromise = Promise.resolve(cached));
  let failed = false;
  itemsPromise = Promise.all(
    ITEM_CATEGORIES.map((c) =>
      fetchJSON<{ items: { name: string }[] }>(`${API_BASE}/item-category/${c}`)
        .then((d) => d.items.map((i) => i.name))
        .catch(() => {
          failed = true;
          return [] as string[];
        })
    )
  ).then((lists) => {
    const slugs = [...new Set(lists.flat())].sort();
    const items = slugs.map((slug) => ({ slug, name: formatName(slug) }));
    if (failed || items.length === 0) itemsPromise = null;
    else writeJSON(ITEMS_KEY, items);
    return items;
  });
  return itemsPromise;
}
