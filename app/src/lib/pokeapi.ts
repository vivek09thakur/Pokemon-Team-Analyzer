// PokeAPI access with in-memory + localStorage caches. Browser-only (uses localStorage).
import {
  API_BASE,
  FALLBACK_POKEMON,
  LIST_BATCH_SIZE,
  STORAGE_KEYS,
  TOTAL_POKEMON,
} from "./constants";
import { toPokemon } from "./calculation";
import type { ListEntry, Pokemon } from "./types";

let pokemonList: ListEntry[] = [];
let listPromise: Promise<ListEntry[]> | null = null;
const pokemonCache = new Map<string, Promise<Pokemon | null>>();

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

// move slug -> type name; persisted so repeat picks don't hit the API
const moveTypeCache = new Map<string, string>(
  typeof window === "undefined"
    ? []
    : Object.entries(readJSON<Record<string, string>>(STORAGE_KEYS.moveTypes, {}))
);

export const knownMoveType = (slug: string) => moveTypeCache.get(slug);

export const hasPokemonList = () => pokemonList.length > 0;

async function fetchFreshList(): Promise<ListEntry[]> {
  // First page also tells us the total, which includes alternate forms (megas, Rotom, regional…)
  // that live past the National Dex range
  const firstRes = await fetch(`${API_BASE}/pokemon?limit=${LIST_BATCH_SIZE}&offset=0`);
  if (!firstRes.ok) throw new Error(`HTTP error! status: ${firstRes.status}`);
  const first = (await firstRes.json()) as { count: number; results: ListEntry[] };
  const total = Math.max(first.count || 0, TOTAL_POKEMON);

  const batches: Promise<ListEntry[]>[] = [];
  for (let offset = LIST_BATCH_SIZE; offset < total; offset += LIST_BATCH_SIZE) {
    const limit = Math.min(LIST_BATCH_SIZE, total - offset);
    batches.push(
      fetch(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json() as Promise<{ results: ListEntry[] }>;
        })
        .then((data) => data.results)
        .catch((error) => {
          console.error(`Error fetching batch at offset ${offset}:`, error);
          return [];
        })
    );
  }
  const list = [...first.results, ...(await Promise.all(batches)).flat()].filter(
    (p) => !UNSEARCHABLE_FORMS.test(p.name)
  );
  if (list.length === 0) throw new Error("Empty Pokémon list");
  localStorage.setItem(STORAGE_KEYS.pokemonList, JSON.stringify(list));
  return list;
}

// Cosmetic/battle-only variants that just add noise to search results (forms that change
// typing — megas, regionals, Rotom, Ogerpon masks, Crowned, Bloodmoon… — stay searchable)
const UNSEARCHABLE_FORMS =
  /-(totem|starter|cap|cosplay|belle|libre|phd|pop-star|rock-star|battle-bond|ash|eternal|busted|school|zen|blade|10|eternamax|limited|dada|original|hangry|noice|roaming|stellar|terastal|family-of-three|three-segment)(-|$)/;

// Full species list; falls back to the cached copy, then a small built-in list
export function loadPokemonList(): Promise<ListEntry[]> {
  if (pokemonList.length) return Promise.resolve(pokemonList);
  if (listPromise) return listPromise;
  listPromise = fetchFreshList()
    .catch((error) => {
      console.error("Error loading Pokémon list:", error);
      const cached = readJSON<ListEntry[] | { results: ListEntry[] } | null>(
        STORAGE_KEYS.pokemonList,
        null
      );
      if (Array.isArray(cached)) return cached;
      if (cached && Array.isArray(cached.results)) return cached.results;
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
  const promise = fetch(`${API_BASE}/pokemon/${slug}`)
    .then((res) => {
      if (!res.ok) throw new Error(`Pokémon not found: ${name}`);
      return res.json();
    })
    .then((data) => {
      const pokemon = toPokemon(data);
      if (!pokemon) throw new Error(`No recognised types for ${name}`);
      return pokemon;
    })
    .catch((error) => {
      console.error(`Error fetching ${name}:`, error);
      pokemonCache.delete(key); // allow a retry later
      return null;
    });
  pokemonCache.set(key, promise);
  return promise;
}

export async function fetchMoveType(slug: string): Promise<string | null> {
  const hit = moveTypeCache.get(slug);
  if (hit) return hit;
  try {
    const res = await fetch(`${API_BASE}/move/${slug}`);
    if (!res.ok) return null;
    const type: string | null = (await res.json()).type?.name || null;
    if (type) {
      moveTypeCache.set(slug, type);
      localStorage.setItem(
        STORAGE_KEYS.moveTypes,
        JSON.stringify(Object.fromEntries(moveTypeCache))
      );
    }
    return type;
  } catch {
    return null;
  }
}
