import { fetchJSON, fetchWithTimeout } from "@/common/lib/http";
import { readJSON, writeJSON } from "@/common/lib/storage";
import {
  API_BASE,
  FALLBACK_POKEMON,
  LIST_BATCH_SIZE,
  STORAGE_KEYS,
  TOTAL_POKEMON,
} from "./constants";
import { summaryOf, toPokemon, toSummary } from "./calculation";
import { moveInfo } from "./showdown";
import type { ListEntry, Pokemon, PokemonSummary } from "./types";

let pokemonList: ListEntry[] = [];
let listPromise: Promise<ListEntry[]> | null = null;
const pokemonCache = new Map<string, Promise<Pokemon | null>>();
const summaryCache = new Map<string, Promise<PokemonSummary | null>>();

const moveTypeCache = new Map<string, string>(
  typeof window === "undefined"
    ? []
    : Object.entries(readJSON<Record<string, string>>(STORAGE_KEYS.moveTypes, {}))
);

export const knownMoveType = (slug: string) => moveTypeCache.get(slug) ?? moveInfo(slug)?.type;

export const hasPokemonList = () => pokemonList.length > 0;

async function fetchFreshList(): Promise<ListEntry[]> {
  const first = await fetchJSON<{ count: number; results: ListEntry[] }>(
    `${API_BASE}/pokemon?limit=${LIST_BATCH_SIZE}&offset=0`
  );
  const total = Math.max(first.count || 0, TOTAL_POKEMON);

  let failed = false;
  const batches: Promise<ListEntry[]>[] = [];
  for (let offset = LIST_BATCH_SIZE; offset < total; offset += LIST_BATCH_SIZE) {
    const limit = Math.min(LIST_BATCH_SIZE, total - offset);
    batches.push(
      fetchJSON<{ results: ListEntry[] }>(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`)
        .then((data) => data.results)
        .catch((error) => {
          console.error(`Error fetching batch at offset ${offset}:`, error);
          failed = true;
          return [];
        })
    );
  }
  const list = [...(first.results ?? []), ...(await Promise.all(batches)).flat()].filter(
    (p) => typeof p?.name === "string" && !UNSEARCHABLE_FORMS.test(p.name)
  );
  if (list.length === 0) throw new Error("Empty Pokémon list");
  if (!failed) writeJSON(STORAGE_KEYS.pokemonList, list);
  return list;
}

const UNSEARCHABLE_FORMS =
  /-(totem|starter|cap|cosplay|belle|libre|phd|pop-star|rock-star|battle-bond|ash|eternal|busted|school|zen|blade|10|eternamax|limited|dada|original|hangry|noice|roaming|stellar|terastal|family-of-three|three-segment)(-|$)/;

function cachedList(): ListEntry[] | null {
  const cached = readJSON<ListEntry[] | { results: ListEntry[] } | null>(STORAGE_KEYS.pokemonList, null);
  if (Array.isArray(cached) && cached.length) return cached;
  if (cached && !Array.isArray(cached) && Array.isArray(cached.results) && cached.results.length)
    return cached.results;
  return null;
}

export function loadPokemonList(): Promise<ListEntry[]> {
  if (pokemonList.length) return Promise.resolve(pokemonList);
  if (listPromise) return listPromise;
  const cached = cachedList();
  if (cached) {
    pokemonList = cached;
    fetchFreshList()
      .then((list) => {
        if (list.length >= pokemonList.length) pokemonList = list;
      })
      .catch(() => {});
    return Promise.resolve(cached);
  }
  listPromise = fetchFreshList()
    .catch((error) => {
      console.error("Error loading Pokémon list:", error);
      return FALLBACK_POKEMON.map((name) => ({ name, url: "" }));
    })
    .then((list) => {
      pokemonList = list;
      return list;
    })
    .finally(() => {
      listPromise = null;
    });
  return listPromise;
}

export function fetchPokemon(name: string): Promise<Pokemon | null> {
  const key = name.toLowerCase();
  const hit = pokemonCache.get(key);
  if (hit) return hit;
  const slug = key.replace(/[^a-z0-9-]/g, "");
  const promise = fetchJSON<Parameters<typeof toPokemon>[0]>(`${API_BASE}/pokemon/${slug}`)
    .then((data) => {
      const pokemon = toPokemon(data);
      if (!pokemon) throw new Error(`No recognised types for ${name}`);
      return pokemon;
    })
    .catch((error) => {
      console.error(`Error fetching ${name}:`, error);
      pokemonCache.delete(key);
      return null;
    });
  pokemonCache.set(key, promise);
  return promise;
}

export function fetchPokemonSummary(name: string): Promise<PokemonSummary | null> {
  const key = name.toLowerCase();
  const hit = summaryCache.get(key);
  if (hit) return hit;
  const slug = key.replace(/[^a-z0-9-]/g, "");
  const promise = fetchWithTimeout(`${API_BASE}/pokemon-form/${slug}`)
    .then(async (res) => {
      if (res.ok) return toSummary(await res.json());
      if (res.status !== 404) throw new Error(`HTTP error! status: ${res.status}`);
      const full = await fetchPokemon(name);
      return full ? summaryOf(full, slug) : null;
    })
    .catch((error) => {
      console.error(`Error fetching ${name}:`, error);
      summaryCache.delete(key);
      return null;
    });
  summaryCache.set(key, promise);
  return promise;
}

export async function fetchMoveType(slug: string): Promise<string | null> {
  const hit = knownMoveType(slug);
  if (hit) return hit;
  try {
    const res = await fetchWithTimeout(`${API_BASE}/move/${slug}`);
    if (!res.ok) return null;
    const type: string | null = (await res.json()).type?.name || null;
    if (type) {
      moveTypeCache.set(slug, type);
      writeJSON(STORAGE_KEYS.moveTypes, Object.fromEntries(moveTypeCache));
    }
    return type;
  } catch {
    return null;
  }
}
