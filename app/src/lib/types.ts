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

// A species placed in a slot: per-slot picks live here, not on the cached Pokemon
export interface Member extends Pokemon {
  ability: string;
  selectedMoves: string[];
}

export type Team = Map<number, Member>;

export interface ListEntry {
  name: string;
  url: string;
}
