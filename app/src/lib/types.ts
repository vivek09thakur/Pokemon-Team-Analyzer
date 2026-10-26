import type { TypeName } from "./constants";

export interface Ability {
  name: string;
  hidden: boolean;
}

export interface Move {
  slug: string;
  name: string;
}

// A species as fetched from PokeAPI (shared, cached)
export interface Pokemon {
  id: number;
  name: string;
  types: TypeName[];
  height: number; // decimetres
  showdownId: string;
  abilities: Ability[];
  moves: Move[];
  sprite: string;
}

// What the search grid needs (from the ~15 KB /pokemon-form doc, not the ~115 KB /pokemon one)
export interface PokemonSummary {
  slug: string;
  id: number;
  name: string;
  types: TypeName[];
  showdownId: string;
}

// A species placed in a slot: per-slot picks live here, not on the cached Pokemon
export interface Member extends Pokemon {
  ability: string;
  selectedMoves: string[];
  item: string; // PokeAPI item slug, "" for none
}

export type Team = Map<number, Member>;

export interface ListEntry {
  name: string;
  url: string;
}
