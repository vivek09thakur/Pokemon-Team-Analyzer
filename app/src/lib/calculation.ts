// Pure helpers: type math, formatting, sprite URLs. No DOM, no network.
import {
  TYPE_CHART,
  TYPE_DATA,
  SHOWDOWN_SPRITES,
  POKEAPI_SPRITES,
  SWITCH_SPRITE_SETS,
  SWITCH_ICON_SETS,
  isTypeName,
  type Bucket,
  type TypeName,
} from "./constants";
import type { Pokemon, PokemonSummary } from "./types";

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

export const typeName = (type: string) => (isTypeName(type) ? TYPE_DATA[type].name : type);

export const typeColor = (type: string) => (isTypeName(type) ? TYPE_DATA[type].color : "#666");

export function effectiveness(attacking: TypeName, defendingTypes: TypeName[]) {
  const row = TYPE_CHART[attacking];
  if (!row) return 1;
  return defendingTypes.reduce((eff, d) => eff * (row[d] ?? 1), 1);
}

// Range-based so float noise can never fall between buckets
export function bucket(eff: number): Bucket {
  if (eff === 0) return "immune";
  if (eff < 0.5) return "quadResist";
  if (eff < 1) return "resist";
  if (eff < 2) return "neutral";
  if (eff < 4) return "weak";
  return "quadWeak";
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatName = (slug: string) => slug.split("-").map(capitalize).join(" ");

// "charizard-mega-x" → "Mega Charizard X", "rotom-wash" → "Rotom Wash", "venusaur-gmax" → "Gigantamax Venusaur"
export function displayName(slug: string) {
  const [base, ...rest] = slug.split("-");
  const form = rest.join("-");
  if (form === "gmax") return `Gigantamax ${capitalize(base)}`;
  if (form.startsWith("mega")) {
    const suffix = form.slice(4).replace(/^-/, "");
    return `Mega ${capitalize(base)}${suffix ? ` ${suffix.toUpperCase()}` : ""}`;
  }
  if (form.startsWith("alola")) return `Alolan ${capitalize(base)}`;
  if (form.startsWith("galar")) return `Galarian ${capitalize(base)}`;
  if (form.startsWith("hisui")) return `Hisuian ${capitalize(base)}`;
  if (form.startsWith("paldea")) return `Paldean ${capitalize(base)}`;
  return formatName(slug);
}

const SHOWDOWN_SPECIES: Record<string, string> = {
  "mr-mime": "Mr. Mime",
  "mime-jr": "Mime Jr.",
  "mr-rime": "Mr. Rime",
  farfetchd: "Farfetch'd",
  sirfetchd: "Sirfetch'd",
  "ho-oh": "Ho-Oh",
  "porygon-z": "Porygon-Z",
  "jangmo-o": "Jangmo-o",
  "hakamo-o": "Hakamo-o",
  "kommo-o": "Kommo-o",
  "type-null": "Type: Null",
  "nidoran-f": "Nidoran-F",
  "nidoran-m": "Nidoran-M",
  flabebe: "Flabébé",
  "wo-chien": "Wo-Chien",
  "chien-pao": "Chien-Pao",
  "ting-lu": "Ting-Lu",
  "chi-yu": "Chi-Yu",
};
const SHOWDOWN_FORMS: Record<string, string> = {
  "necrozma-dusk": "Dusk-Mane",
  "necrozma-dawn": "Dawn-Wings",
  "zygarde-10-power-construct": "10%",
  "zygarde-50-power-construct": "",
};

export function showdownName(slug: string, species: string, isDefault: boolean) {
  const base = SHOWDOWN_SPECIES[species] ?? formatName(species);
  if (isDefault || !slug.startsWith(`${species}-`)) return base;
  const form =
    SHOWDOWN_FORMS[slug] ??
    slug
      .slice(species.length + 1)
      .replace(/-(mask|breed|plumage|standard)$/, "")
      .replace(/^(fe)?male$/, (g) => g[0])
      .split("-")
      .map(capitalize)
      .join("-");
  return form ? `${base}-${form}` : base;
}

export const padId = (id: number) => id.toString().padStart(3, "0");

export const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Switch-era game sprites (SwSh first), then Pokémon HOME render, then animated Showdown gif, then artwork
export function spriteSources(pokemon: Pick<Pokemon, "id" | "showdownId">) {
  return [
    ...SWITCH_SPRITE_SETS.map((base) => `${base}/${pokemon.id}.webp`),
    `${POKEAPI_SPRITES}/home/${pokemon.id}.png`,
    `${SHOWDOWN_SPRITES}/${pokemon.showdownId}.gif`,
    `${POKEAPI_SPRITES}/official-artwork/${pokemon.id}.png`,
  ];
}

// Small previews: Scarlet/Violet box icons (then other Switch games), HOME render as last resort
export function thumbSources(pokemon: Pick<Pokemon, "id" | "showdownId">) {
  return [
    ...SWITCH_ICON_SETS.map((base) => `${base}/${pokemon.id}.png`),
    `${POKEAPI_SPRITES}/home/${pokemon.id}.png`,
    `${POKEAPI_SPRITES}/official-artwork/${pokemon.id}.png`,
  ];
}

// Sprite height is linear in real height so members read true-to-scale; 1 m = 100px
export function lineupHeight(pokemon: Pick<Pokemon, "height">) {
  const px = 100 * ((pokemon.height || 10) / 10);
  return Math.round(Math.max(40, Math.min(240, px)));
}

// Game renders all share one canvas, so slot sprites are sized by real height (45–100% of the box)
export function slotSpriteScale(pokemon: Pick<Pokemon, "height">) {
  const scale = Math.sqrt((pokemon.height || 10) / 10) / 1.35;
  return Math.round(Math.max(0.45, Math.min(1, scale)) * 100);
}

interface RawPokemon {
  id: number;
  name: string;
  height?: number;
  is_default?: boolean;
  types: { type: { name: string } }[];
  species: { name: string };
  abilities: { ability: { name: string }; is_hidden: boolean }[];
  moves: { move: { name: string } }[];
}

// Shape raw PokeAPI /pokemon JSON into the app's species model
export function toPokemon(data: RawPokemon): Pokemon | null {
  // Drop types the chart doesn't know (e.g. "stellar", "unknown") so the engine never sees undefined
  const types = data.types.map((t) => t.type.name).filter(isTypeName);
  if (types.length === 0) return null;

  const isDefault = data.is_default !== false;
  const base = {
    id: data.id,
    name: displayName(data.name),
    types,
    height: data.height || 10,
    // Showdown keys the default form by species (deoxys-normal → deoxys) and other forms by
    // their full name (charizard-mega-x → charizardmegax), alphanumerics only
    showdownId: (isDefault ? data.species.name : data.name).replace(/[^a-z0-9]/g, ""),
    showdownName: showdownName(data.name, data.species.name, isDefault),
    abilities: data.abilities.map((a) => ({
      name: formatName(a.ability.name),
      hidden: a.is_hidden,
    })),
    moves: [...new Set(data.moves.map((m) => m.move.name))]
      .sort()
      .map((slug) => ({ slug, name: formatName(slug) })),
  };
  return { ...base, sprite: spriteSources(base)[0] };
}

interface RawForm {
  name: string;
  form_name?: string;
  pokemon: { url: string };
  types: { type: { name: string } }[];
}

// Shape raw PokeAPI /pokemon-form JSON into a search summary
export function toSummary(data: RawForm): PokemonSummary | null {
  const types = data.types.map((t) => t.type.name).filter(isTypeName);
  if (types.length === 0) return null;
  const id = parseInt(data.pokemon.url.replace(/\/$/, "").split("/").pop() || "0");
  const base = data.name.split("-")[0];
  return {
    slug: data.name,
    id,
    name: displayName(data.name),
    types,
    // Default forms are keyed by species on Showdown ("deoxys", not "deoxysnormal")
    showdownId: (data.form_name ? data.name : base).replace(/[^a-z0-9]/g, ""),
  };
}

export const summaryOf = (p: Pokemon, slug: string): PokemonSummary => ({
  slug,
  id: p.id,
  name: p.name,
  types: p.types,
  showdownId: p.showdownId,
});
