# Pokémon Team Analyzer

Build a Pokémon team and analyse its type coverage, weaknesses, threats and switch-ins. Data from [PokéAPI](https://pokeapi.co); sprites from the PokéAPI sprite repo and Pokémon Showdown.

Next.js 16 (App Router, TypeScript, Tailwind v4). Fully client-rendered; no server/API keys required.

## Scripts

```bash
npm install
npm run dev     # http://localhost:3000
npm run build
npm start
npm run lint
```

## Layout

- `src/app/` — root layout (fonts, theme seed) and the page
- `src/components/` — React UI: `TeamAnalyzer` (state owner), slots, lineup, analysis panel, dialogs, shell
- `src/lib/` — pure logic: `constants`, `calculation`, `analysis`; `pokeapi` (fetch + caches); `sprites` (pixel-accurate sprite fitting)
