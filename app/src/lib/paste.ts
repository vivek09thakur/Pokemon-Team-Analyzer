import { MOVE_SLOTS } from "./constants";
import { formatName } from "./calculation";
import { fetchPokemon, loadPokemonList } from "./pokeapi";
import { loadHeldItems, loadMoveIndex, moveInfo, psId } from "./showdown";
import type { ListEntry, Member, Team } from "./types";

export async function exportTeam(team: Team, teamSize: number): Promise<string> {
  await loadMoveIndex().catch(() => {});
  const blocks: string[] = [];
  for (let i = 0; i < teamSize; i++) {
    const m = team.get(i);
    if (!m) continue;
    const lines = [m.item ? `${m.showdownName} @ ${formatName(m.item)}` : m.showdownName];
    if (m.ability) lines.push(`Ability: ${m.ability}`);
    for (const slug of m.selectedMoves) {
      if (slug) lines.push(`- ${moveInfo(slug)?.name ?? formatName(slug)}`);
    }
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

export interface PastedSet {
  species: string;
  item?: string;
  ability?: string;
  moves: string[];
}

export function parseTeam(text: string): PastedSet[] {
  const sets: PastedSet[] = [];
  let cur: PastedSet | null = null;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("===")) {
      cur = null;
      continue;
    }
    if (cur) {
      if (/^[-–•]/.test(line)) {
        const move = line.slice(1).split("/")[0].trim();
        if (move) cur.moves.push(move);
      } else {
        const kv = line.match(/^([A-Za-z ]+):\s*(.*)$/);
        if (kv && kv[1].toLowerCase() === "ability") cur.ability = kv[2].trim();
      }
      continue;
    }
    const [head, item] = line.split(/\s+@\s+/);
    let species = head.replace(/\s*\((M|F|N)\)$/, "").trim();
    const nick = species.match(/^.*\(([^()]+)\)$/);
    if (nick) species = nick[1].trim();
    cur = { species, item: item?.trim() || undefined, moves: [] };
    sets.push(cur);
  }
  return sets;
}

export interface ImportResult {
  members: Member[];
  issues: string[];
}

const strip = (s: string) => psId(s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

interface SpeciesEntry {
  id: string;
  slug: string;
  num: number;
}

const speciesIndex = (list: ListEntry[]): SpeciesEntry[] =>
  list.map((e) => ({
    id: strip(e.name),
    slug: e.name,
    num: parseInt(e.url.match(/\/(\d+)\/?$/)?.[1] ?? "0") || 0,
  }));

function resolveSpecies(name: string, index: SpeciesEntry[]): string | null {
  const id = strip(name);
  if (!id) return null;
  const exact = index.find((e) => e.id === id);
  if (exact) return exact.slug;
  const forms = index.filter((e) => e.id.startsWith(id));
  if (forms.length) {
    const main = forms.find((e) => e.num > 0 && e.num < 10000);
    return (main ?? forms.sort((a, b) => a.slug.length - b.slug.length)[0]).slug;
  }
  const cut = name.lastIndexOf("-");
  return cut > 0 ? resolveSpecies(name.slice(0, cut), index) : null;
}

async function resolveSet(
  set: PastedSet,
  index: SpeciesEntry[],
  items: Map<string, string>,
  issues: string[]
): Promise<Member | null> {
  const slug = resolveSpecies(set.species, index);
  const pokemon = slug ? await fetchPokemon(slug) : null;
  if (!pokemon) {
    issues.push(`Couldn't find “${set.species}”.`);
    return null;
  }
  const label = pokemon.showdownName;
  if (strip(label) !== strip(set.species)) issues.push(`“${set.species}” was added as ${label}.`);

  let ability = pokemon.abilities[0]?.name || "";
  if (set.ability) {
    const hit = pokemon.abilities.find((a) => strip(a.name) === strip(set.ability!));
    if (hit) ability = hit.name;
    else issues.push(`${label}: unknown ability “${set.ability}”.`);
  }

  const selectedMoves: string[] = Array(MOVE_SLOTS).fill("");
  let n = 0;
  for (const move of set.moves) {
    if (n >= MOVE_SLOTS) break;
    const id = strip(move).replace(/^hiddenpower.*/, "hiddenpower");
    const hit = pokemon.moves.find((m) => strip(m.slug) === id);
    if (!hit) issues.push(`${label}: doesn't learn “${move}”.`);
    else if (!selectedMoves.includes(hit.slug)) selectedMoves[n++] = hit.slug;
  }

  let item = "";
  if (set.item) {
    const hit = items.get(strip(set.item));
    if (hit) item = hit;
    else issues.push(`${label}: unknown item “${set.item}”.`);
  }

  return { ...pokemon, ability, selectedMoves, item };
}

export async function importTeam(text: string, max: number): Promise<ImportResult> {
  const sets = parseTeam(text);
  const issues: string[] = [];
  if (sets.length === 0) return { members: [], issues: ["No Pokémon found in the pasted text."] };
  if (sets.length > max) issues.push(`Only the first ${max} Pokémon were imported.`);

  const [list, heldItems] = await Promise.all([
    loadPokemonList(),
    sets.some((s) => s.item) ? loadHeldItems().catch(() => []) : Promise.resolve([]),
  ]);
  const index = speciesIndex(list);
  const items = new Map(heldItems.map((i) => [strip(i.slug), i.slug]));

  const perSet = sets.slice(0, max).map(() => [] as string[]);
  const members = await Promise.all(
    sets.slice(0, max).map((s, i) => resolveSet(s, index, items, perSet[i]))
  );
  return {
    members: members.filter((m): m is Member => m !== null),
    issues: [...issues, ...perSet.flat()],
  };
}
