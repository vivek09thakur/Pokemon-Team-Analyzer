import type { TypeName } from "./constants";

export interface Ability {
  name: string;
  hidden: boolean;
}

export interface Move {
  slug: string;
  name: string;
}

export interface Pokemon {
  id: number;
  name: string;
  types: TypeName[];
  height: number;
  showdownId: string;
  showdownName: string;
  abilities: Ability[];
  moves: Move[];
  sprite: string;
}

export interface PokemonSummary {
  slug: string;
  id: number;
  name: string;
  types: TypeName[];
  showdownId: string;
}

export interface Member extends Pokemon {
  ability: string;
  selectedMoves: string[];
  item: string;
  shiny?: boolean;
}

export type Team = Map<number, Member>;

export interface ListEntry {
  name: string;
  url: string;
}
