// Pure helpers: type math, formatting, sprite URLs. No DOM, no network.
import {
  TYPE_CHART,
  TYPE_DATA,
  SHOWDOWN_SPRITES,
  POKEAPI_SPRITES,
  SWITCH_SPRITE_SETS,
} from "./constants.js";

export const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

export const typeName = (type) => TYPE_DATA[type]?.name || type;

export const typeColor = (type) => TYPE_DATA[type]?.color || "#666";

export function effectiveness(attacking, defendingTypes) {
  const row = TYPE_CHART[attacking];
  if (!row) return 1;
  return defendingTypes.reduce((eff, d) => eff * (row[d] ?? 1), 1);
}

// Range-based so float noise can never fall between buckets
export function bucket(eff) {
  if (eff === 0) return "immune";
  if (eff < 0.5) return "quadResist";
  if (eff < 1) return "resist";
  if (eff < 2) return "neutral";
  if (eff < 4) return "weak";
  return "quadWeak";
}

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const formatName = (slug) => slug.split("-").map(capitalize).join(" ");

export const padId = (id) => id.toString().padStart(3, "0");

export const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

// Switch-era game sprites (SwSh first), then Pokémon HOME render, then animated Showdown gif, then artwork
export function spriteSources(pokemon) {
  return [
    ...SWITCH_SPRITE_SETS.map((base) => `${base}/${pokemon.id}.webp`),
    `${POKEAPI_SPRITES}/home/${pokemon.id}.png`,
    `${SHOWDOWN_SPRITES}/${pokemon.showdownId}.gif`,
    `${POKEAPI_SPRITES}/official-artwork/${pokemon.id}.png`,
  ];
}

// Sprite height is linear in real height so members read true-to-scale; 1 m = 100px
export function lineupHeight(pokemon) {
  const px = 100 * ((pokemon.height || 10) / 10);
  return Math.round(Math.max(40, Math.min(240, px)));
}

// Game renders all share one canvas, so slot sprites are sized by real height (45–100% of the box)
export function slotSpriteScale(pokemon) {
  const scale = Math.sqrt((pokemon.height || 10) / 10) / 1.35;
  return Math.round(Math.max(0.45, Math.min(1, scale)) * 100);
}

// Shape raw PokeAPI /pokemon JSON into the app's member model
export function toPokemon(data) {
  // Drop types the chart doesn't know (e.g. "stellar", "unknown") so the engine never sees undefined
  const types = data.types.map((t) => t.type.name).filter((t) => t in TYPE_DATA);
  if (types.length === 0) return null;

  const pokemon = {
    id: data.id,
    name: capitalize(data.name),
    types,
    height: data.height || 10, // decimetres
    // Showdown names the default form by species, alphanumerics only (mr-mime -> mrmime)
    showdownId: data.species.name.replace(/[^a-z0-9]/g, ""),
    abilities: data.abilities.map((a) => ({
      name: formatName(a.ability.name),
      hidden: a.is_hidden,
    })),
    moves: [...new Set(data.moves.map((m) => m.move.name))]
      .sort()
      .map((slug) => ({ slug, name: formatName(slug) })),
  };
  pokemon.sprite = spriteSources(pokemon)[0];
  return pokemon;
}
