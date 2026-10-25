export const API_BASE = "https://pokeapi.co/api/v2";
export const SHOWDOWN_SPRITES = "https://play.pokemonshowdown.com/sprites/ani";
const POKEAPI_REPO = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
export const POKEAPI_SPRITES = `${POKEAPI_REPO}/other`;
// Switch-era battle sprites (webp) share one render style; each game only covers its own dex,
// so they're tried in order until one exists for the species
const GEN8 = `${POKEAPI_REPO}/versions/generation-viii`;
const GEN9 = `${POKEAPI_REPO}/versions/generation-ix`;
export const SWITCH_SPRITE_SETS = [
  `${GEN8}/sword-shield`,
  `${GEN9}/scarlet-violet`,
  `${GEN8}/legends-arceus`,
  `${GEN8}/brilliant-diamond-shining-pearl`,
  `${GEN9}/legends-za`,
];

export const TOTAL_POKEMON = 1025; // Gen 1-9
export const LIST_BATCH_SIZE = 400;
export const SEARCH_LIMIT = 12;
export const MOVE_SLOTS = 4;

export const STORAGE_KEYS = {
  pokemonList: "pokemonList",
  moveTypes: "moveTypes",
};

export const TYPE_DATA = {
  normal: { color: "#A8A878", name: "Normal" },
  fire: { color: "#F08030", name: "Fire" },
  water: { color: "#6890F0", name: "Water" },
  electric: { color: "#F8D030", name: "Electric" },
  grass: { color: "#78C850", name: "Grass" },
  ice: { color: "#98D8D8", name: "Ice" },
  fighting: { color: "#C03028", name: "Fighting" },
  poison: { color: "#A040A0", name: "Poison" },
  ground: { color: "#E0C068", name: "Ground" },
  flying: { color: "#A890F0", name: "Flying" },
  psychic: { color: "#F85888", name: "Psychic" },
  bug: { color: "#A8B820", name: "Bug" },
  rock: { color: "#B8A038", name: "Rock" },
  ghost: { color: "#705898", name: "Ghost" },
  dragon: { color: "#7038F8", name: "Dragon" },
  dark: { color: "#705848", name: "Dark" },
  steel: { color: "#B8B8D0", name: "Steel" },
  fairy: { color: "#EE99AC", name: "Fairy" },
};

export const TYPES = Object.keys(TYPE_DATA);

// TYPE_CHART[attacking][defending] = multiplier (missing = 1)
export const TYPE_CHART = {
  normal: { rock: 0.5, ghost: 0, steel: 0.5 },
  fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
  water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
  electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
  grass: {
    fire: 0.5,
    water: 2,
    grass: 0.5,
    poison: 0.5,
    ground: 2,
    flying: 0.5,
    bug: 0.5,
    rock: 2,
    dragon: 0.5,
    steel: 0.5,
  },
  ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
  fighting: {
    normal: 2,
    ice: 2,
    poison: 0.5,
    flying: 0.5,
    psychic: 0.5,
    bug: 0.5,
    rock: 2,
    ghost: 0,
    dark: 2,
    steel: 2,
    fairy: 0.5,
  },
  poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
  ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
  flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
  psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
  bug: {
    fire: 0.5,
    grass: 2,
    fighting: 0.5,
    poison: 0.5,
    flying: 0.5,
    psychic: 2,
    ghost: 0.5,
    dark: 2,
    steel: 0.5,
    fairy: 0.5,
  },
  rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
  ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
  dragon: { dragon: 2, steel: 0.5, fairy: 0 },
  dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
  steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
  fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 },
};

// Score contribution of each defensive bucket when summed across a team
export const BUCKET_WEIGHT = {
  immune: -2,
  quadResist: -2,
  resist: -1,
  neutral: 0,
  weak: 1,
  quadWeak: 2,
};

export const FALLBACK_POKEMON = [
  "pikachu",
  "charizard",
  "blastoise",
  "venusaur",
  "mewtwo",
  "gyarados",
  "dragonite",
  "gengar",
  "snorlax",
  "mew",
  "lucario",
  "greninja",
  "tyranitar",
  "salamence",
  "metagross",
];
