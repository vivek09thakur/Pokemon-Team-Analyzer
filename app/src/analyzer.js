export class PokemonTeamAnalyzer {
  constructor() {
    this.typeData = {
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

    this.typeChart = {
      normal: { rock: 0.5, ghost: 0, steel: 0.5 },
      fire: {
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 2,
        bug: 2,
        rock: 0.5,
        dragon: 0.5,
        steel: 2,
      },
      water: {
        fire: 2,
        water: 0.5,
        grass: 0.5,
        ground: 2,
        rock: 2,
        dragon: 0.5,
      },
      electric: {
        water: 2,
        electric: 0.5,
        grass: 0.5,
        ground: 0,
        flying: 2,
        dragon: 0.5,
      },
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
      ice: {
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 0.5,
        ground: 2,
        flying: 2,
        dragon: 2,
        steel: 0.5,
      },
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
      poison: {
        grass: 2,
        poison: 0.5,
        ground: 0.5,
        rock: 0.5,
        ghost: 0.5,
        steel: 0,
        fairy: 2,
      },
      ground: {
        fire: 2,
        electric: 2,
        grass: 0.5,
        poison: 2,
        flying: 0,
        bug: 0.5,
        rock: 2,
        steel: 2,
      },
      flying: {
        electric: 0.5,
        grass: 2,
        fighting: 2,
        bug: 2,
        rock: 0.5,
        steel: 0.5,
      },
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
      rock: {
        fire: 2,
        ice: 2,
        fighting: 0.5,
        ground: 0.5,
        flying: 2,
        bug: 2,
        steel: 0.5,
      },
      ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
      dragon: { dragon: 2, steel: 0.5, fairy: 0 },
      dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
      steel: {
        fire: 0.5,
        water: 0.5,
        electric: 0.5,
        ice: 2,
        rock: 2,
        steel: 0.5,
        fairy: 2,
      },
      fairy: {
        fire: 0.5,
        fighting: 2,
        poison: 0.5,
        dragon: 2,
        dark: 2,
        steel: 0.5,
      },
    };

    this.team = new Map();
    this.currentSlot = null;
    this.selectedPokemon = null;
    this.searchTimeout = null;
    this.searchController = null;
    this.pokemonCache = new Map();
    this.pokemonList = [];

    this.init();
  }

  async init() {
    this.setupEventListeners();
    this.initTeamGrid();

    // Load Pokémon data in background but don't wait for it
    this.loadPokemonData().catch((error) => {
      console.error("Failed to load Pokémon data:", error);
    });
  }

  async loadPokemonData() {
    try {
      // Always fetch fresh data from API to ensure we have all Pokémon
      console.log("Fetching fresh Pokémon data from API...");
      await this.fetchFreshPokemonData();
    } catch (error) {
      console.error("Error loading Pokémon list:", error);
      // Try to load from cache as fallback
      try {
        const cached = localStorage.getItem("pokemonList");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            this.pokemonList = parsed;
            console.log("Using cached Pokémon list:", this.pokemonList.length, "pokémon");
          } else if (parsed && Array.isArray(parsed.results)) {
            this.pokemonList = parsed.results;
            console.log("Using cached Pokémon list:", this.pokemonList.length, "pokémon");
          }
        }
      } catch (cacheError) {
        console.error("Cache fallback also failed:", cacheError);
      }

      // If still no data, use fallback
      if (!this.pokemonList || this.pokemonList.length === 0) {
        this.pokemonList = this.createFallbackList();
      }
    }
  }

  // Helper method to fetch fresh data
  async fetchFreshPokemonData() {
    try {
      console.log("Fetching Pokémon data in batches...");

      // Fetch in batches to avoid timeout (400 per batch)
      const batchSize = 400;
      const totalPokemon = 1025; // Gen 1-9 approximate count
      const allPokemon = [];

      // Fetch all batches in parallel for speed
      const batchPromises = [];
      for (let offset = 0; offset < totalPokemon; offset += batchSize) {
        const limit = Math.min(batchSize, totalPokemon - offset);
        const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset}`;
        batchPromises.push(
          fetch(url)
            .then((response) => {
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              return response.json();
            })
            .then((data) => data.results)
            .catch((error) => {
              console.error(`Error fetching batch at offset ${offset}:`, error);
              return [];
            })
        );
      }

      // Wait for all batches
      const batchResults = await Promise.all(batchPromises);

      // Combine all results
      for (const batch of batchResults) {
        allPokemon.push(...batch);
      }

      this.pokemonList = allPokemon;
      localStorage.setItem("pokemonList", JSON.stringify(this.pokemonList));
      console.log("Loaded all Pokémon:", this.pokemonList.length, "pokémon");
    } catch (error) {
      console.error("Error fetching fresh Pokémon data:", error);
      throw error;
    }
  }

  createFallbackList() {
    const popularPokemon = [
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
    return popularPokemon.map((name) => ({ name, url: "" }));
  }

  setupEventListeners() {
    document
      .getElementById("resetBtn")
      .addEventListener("click", () => this.resetTeam());
    document
      .getElementById("teamSize")
      .addEventListener("change", () => this.changeTeamSize());
    document
      .getElementById("closeModal")
      .addEventListener("click", () => this.closeModal());
    document
      .getElementById("addToTeam")
      .addEventListener("click", () => this.addPokemonToTeam());

    const searchInput = document.getElementById("searchInput");
    searchInput.addEventListener("input", (e) => this.handleSearch(e));

    document.getElementById("addModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.closeModal();
    });

    // <img> error events don't bubble; capture them to step through data-fallbacks
    document.addEventListener(
      "error",
      (e) => {
        const img = e.target;
        if (!(img instanceof HTMLImageElement) || !img.dataset.fallbacks) return;
        const [next, ...rest] = img.dataset.fallbacks.split("|").filter(Boolean);
        img.dataset.fallbacks = rest.join("|");
        if (next) img.src = next;
      },
      true
    );
  }

  initTeamGrid() {
    const teamSize = parseInt(document.getElementById("teamSize").value);
    this.teamSize = teamSize;
    const teamGrid = document.getElementById("teamGrid");
    teamGrid.innerHTML = "";

    for (let i = 0; i < teamSize; i++) {
      const slot = this.createTeamSlot(i);
      teamGrid.appendChild(slot);
    }

    this.updateQuickStats();
  }

  createTeamSlot(index) {
    const slot = document.createElement("div");
    slot.dataset.index = index;

    if (this.team.has(index)) {
      this.renderFilledSlot(slot, this.team.get(index));
    } else {
      this.renderEmptySlot(slot);
    }

    slot.addEventListener("click", (e) => {
      if (!e.target.closest(".remove-btn")) {
        this.openModal(index);
      }
    });

    return slot;
  }

  typeChip(type, extraClass = "") {
    const info = this.typeData[type];
    return `<span class="type-chip ${extraClass}" style="background:${
      info?.color || "#666"
    }">${info?.name || type}</span>`;
  }

  renderEmptySlot(slot) {
    slot.className = "team-slot team-slot-empty";
    slot.innerHTML = `
      <span class="material-symbols-rounded text-primary" style="font-size:24px">add_circle</span>
      <div class="title-sm">Add Pokémon</div>
      <div class="label-sm">Slot ${parseInt(slot.dataset.index) + 1}</div>
    `;
  }

  renderFilledSlot(slot, pokemon) {
    slot.className = "team-slot team-slot-filled";
    slot.innerHTML = `
      <button class="remove-btn md-icon-btn md-icon-btn-filled !w-7 !h-7 absolute top-1.5 right-1.5" aria-label="Remove ${pokemon.name}">
        <span class="material-symbols-rounded" style="font-size:16px">close</span>
      </button>
      <div class="slot-sprite-box">${this.spriteImg(pokemon)}</div>
      <div class="title-sm truncate max-w-full">${pokemon.name}</div>
      <div class="flex flex-wrap gap-1 justify-center">
        ${pokemon.types.map((t) => this.typeChip(t, "type-chip-sm")).join("")}
      </div>
      <div class="label-sm">#${pokemon.id.toString().padStart(3, "0")}</div>
    `;
    slot
      .querySelector(".remove-btn")
      .addEventListener("click", () =>
        this.removePokemonFromTeam(parseInt(slot.dataset.index))
      );
  }

  openModal(slotIndex) {
    if (this.team.has(slotIndex)) return;

    this.currentSlot = slotIndex;
    this.selectedPokemon = null;

    const modal = document.getElementById("addModal");
    const searchInput = document.getElementById("searchInput");
    const searchResults = document.getElementById("searchResults");
    const selectedPreview = document.getElementById("selectedPreview");

    searchInput.value = "";
    searchResults.innerHTML = "";
    selectedPreview.classList.add("hidden");

    modal.classList.remove("hidden");
    setTimeout(() => searchInput.focus(), 100);
  }

  closeModal() {
    if (this.searchController) {
      this.searchController.abort();
      this.searchController = null;
    }

    const modal = document.getElementById("addModal");
    modal.classList.add("hidden");
    this.currentSlot = null;
    this.selectedPokemon = null;
  }

  async handleSearch(event) {
    const searchTerm = event.target.value.trim().toLowerCase();
    const resultsContainer = document.getElementById("searchResults");

    if (this.searchTimeout) clearTimeout(this.searchTimeout);
    if (this.searchController) this.searchController.abort();

    if (searchTerm.length < 2) {
      resultsContainer.innerHTML = "";
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      this.searchController = new AbortController();

      try {
        resultsContainer.innerHTML = `
        <div class="col-span-full py-8 text-center">
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-2"></div>
          <div>Searching...</div>
        </div>
      `;

        // Wait for pokemonList to be loaded if it's empty
        if (!this.pokemonList || this.pokemonList.length === 0) {
          await this.loadPokemonData();
        }

        // Check if pokemonList is an array
        if (!Array.isArray(this.pokemonList)) {
          console.error("pokemonList is not an array:", this.pokemonList);
          resultsContainer.innerHTML =
            '<div class="col-span-full py-8 text-center">Error: Pokémon data not loaded properly</div>';
          return;
        }

        // Filter from list - SAFE now
        const filtered = this.pokemonList
          .filter(
            (p) => p && p.name && p.name.toLowerCase().includes(searchTerm)
          )
          .slice(0, 12);

        await this.displaySearchResults(filtered);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Search error:", error);
        resultsContainer.innerHTML =
          '<div class="col-span-full py-8 text-center">Error searching. Please try again.</div>';
      }
    }, 300);
  }

  async displaySearchResults(pokemonList) {
    const resultsContainer = document.getElementById("searchResults");

    if (pokemonList.length === 0) {
      resultsContainer.innerHTML =
        '<div class="col-span-full py-8 text-center body-md">No Pokémon found</div>';
      return;
    }

    // Show loading skeleton
    resultsContainer.innerHTML = Array(12)
      .fill()
      .map(
        () => `
            <div class="animate-pulse md-card-filled p-3">
                <div class="bg-surface-highest rounded-full w-16 h-16 mx-auto mb-3"></div>
                <div class="bg-surface-highest h-3 rounded mb-2"></div>
                <div class="bg-surface-highest h-3 rounded w-3/4 mx-auto"></div>
            </div>
        `
      )
      .join("");

    // Fetch data
    const results = [];
    for (const pokemon of pokemonList) {
      try {
        const pokemonData = await this.fetchPokemonData(pokemon.name);
        if (pokemonData) results.push(pokemonData);
        if (results.length >= 12) break;
      } catch (error) {
        console.warn(`Failed to fetch ${pokemon.name}:`, error);
      }
    }

    // Display results
    resultsContainer.innerHTML = results
      .map(
        (pokemon) => `
            <button type="button" class="search-result md-card-filled md-chip-action p-3 flex flex-col items-center gap-1 text-center w-full">
                ${this.spriteImg(pokemon, "h-16 w-16")}
                <div class="title-sm truncate max-w-full">${pokemon.name}</div>
                <div class="label-sm">#${pokemon.id.toString().padStart(3, "0")}</div>
                <div class="flex flex-wrap justify-center gap-1">
                    ${pokemon.types.map((t) => this.typeChip(t, "type-chip-sm")).join("")}
                </div>
            </button>
        `
      )
      .join("");

    // Add click listeners
    resultsContainer.querySelectorAll(".search-result").forEach((item, index) => {
      item.addEventListener("click", () => this.selectPokemon(results[index]));
    });
  }

  async fetchPokemonData(name) {
    const cacheKey = name.toLowerCase();

    if (this.pokemonCache.has(cacheKey)) {
      return this.pokemonCache.get(cacheKey);
    }

    try {
      // Handle special characters in Pokémon names (like Ho-oh)
      const formattedName = name.toLowerCase().replace(/[^a-z0-9-]/g, "");

      const response = await fetch(
        `https://pokeapi.co/api/v2/pokemon/${formattedName}`
      );

      if (!response.ok) {
        throw new Error(`Pokémon not found: ${name}`);
      }

      const data = await response.json();

      // Drop types the chart doesn't know (e.g. "stellar", "unknown") so the engine never sees undefined
      const types = data.types
        .map((t) => t.type.name)
        .filter((t) => t in this.typeData);
      if (types.length === 0) throw new Error(`No recognised types for ${name}`);

      const pokemonData = {
        id: data.id,
        name: this.capitalize(data.name),
        types,
        height: data.height || 10, // decimetres
        // Showdown names the default form by species, alphanumerics only (mr-mime -> mrmime)
        showdownId: data.species.name.replace(/[^a-z0-9]/g, ""),
      };
      pokemonData.sprite = this.spriteSources(pokemonData)[0];

      this.pokemonCache.set(cacheKey, pokemonData);
      return pokemonData;
    } catch (error) {
      console.error(`Error fetching ${name}:`, error);
      return null;
    }
  }

  selectPokemon(pokemonData) {
    this.selectedPokemon = pokemonData;

    const preview = document.getElementById("selectedPreview");
    const selectedSprite = document.getElementById("selectedSprite");
    const selectedName = document.getElementById("selectedName");
    const selectedTypes = document.getElementById("selectedTypes");

    const [primary, ...fallbacks] = this.spriteSources(pokemonData);
    selectedSprite.dataset.fallbacks = fallbacks.join("|");
    selectedSprite.src = primary;
    selectedSprite.alt = pokemonData.name;
    selectedName.textContent = `${pokemonData.name} #${pokemonData.id
      .toString()
      .padStart(3, "0")}`;

    selectedTypes.innerHTML = pokemonData.types
      .map((type) => this.typeChip(type))
      .join("");

    preview.classList.remove("hidden");
    preview.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  addPokemonToTeam() {
    if (!this.selectedPokemon || this.currentSlot === null) return;

    this.team.set(this.currentSlot, this.selectedPokemon);
    this.updateTeamSlot(this.currentSlot, this.selectedPokemon);
    this.closeModal();
    this.updateQuickStats();
    this.refreshAnalysis();
  }

  updateTeamSlot(slotIndex, pokemon) {
    const slot = document.querySelector(`[data-index="${slotIndex}"]`);
    if (slot) {
      this.renderFilledSlot(slot, pokemon);
    }
  }

  removePokemonFromTeam(slotIndex) {
    if (!confirm("Remove this Pokémon from your team?")) return;

    this.team.delete(slotIndex);
    const slot = document.querySelector(`[data-index="${slotIndex}"]`);
    if (slot) this.renderEmptySlot(slot);

    this.updateQuickStats();
    this.refreshAnalysis();
  }

  changeTeamSize() {
    const select = document.getElementById("teamSize");
    const newSize = parseInt(select.value);
    const overflow = [...this.team.keys()].filter((i) => i >= newSize);

    if (overflow.length > 0) {
      if (
        !confirm(
          `Changing team size will remove ${overflow.length} Pokémon. Continue?`
        )
      ) {
        select.value = this.teamSize;
        return;
      }
      overflow.forEach((i) => this.team.delete(i));
    }

    this.initTeamGrid();
    this.refreshAnalysis();
  }

  resetTeam() {
    if (this.team.size === 0) return;
    if (!confirm("Reset the entire team? This will remove all Pokémon."))
      return;

    this.team.clear();
    this.initTeamGrid();
    this.refreshAnalysis();
  }

  hideResults() {
    document.getElementById("resultsSection").classList.add("hidden");
    document.getElementById("lineupCard").classList.add("hidden");
    document.getElementById("emptyState").classList.remove("hidden");
    document.getElementById("analysisMeta").textContent = "";
  }

  showResults() {
    document.getElementById("resultsSection").classList.remove("hidden");
    document.getElementById("lineupCard").classList.remove("hidden");
    document.getElementById("emptyState").classList.add("hidden");
  }

  updateQuickStats() {
    const typeCount = new Set();
    this.team.forEach((p) => p.types.forEach((t) => typeCount.add(t)));

    document.getElementById("teamCount").textContent = this.team.size;
    document.getElementById("teamSizeLabel").textContent = this.teamSize;
    document.getElementById("typeCount").textContent = typeCount.size;
  }

  // Analysis is cheap (18 types × ≤6 members), so it re-runs on every team change
  refreshAnalysis() {
    if (this.team.size === 0) {
      this.hideResults();
      return;
    }
    try {
      this.displayResults(this.runAnalysis());
      this.showResults();
    } catch (error) {
      console.error("Analysis failed:", error);
      this.hideResults();
    }
  }

  // ---------------------------------------------------------------------
  // Analysis engine
  // ---------------------------------------------------------------------

  get types() {
    return Object.keys(this.typeData);
  }

  typeName(type) {
    return this.typeData[type]?.name || type;
  }

  effectiveness(attacking, defendingTypes) {
    const row = this.typeChart[attacking];
    if (!row) return 1;
    return defendingTypes.reduce((eff, d) => eff * (row[d] ?? 1), 1);
  }

  // Range-based so float noise can never fall between buckets
  bucket(eff) {
    if (eff === 0) return "immune";
    if (eff < 0.5) return "quadResist";
    if (eff < 1) return "resist";
    if (eff < 2) return "neutral";
    if (eff < 4) return "weak";
    return "quadWeak";
  }

  static WEIGHT = {
    immune: -2,
    quadResist: -2,
    resist: -1,
    neutral: 0,
    weak: 1,
    quadWeak: 2,
  };

  static clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  analyzeMember(pokemon) {
    const matchups = {};
    const groups = {
      immune: [],
      quadResist: [],
      resist: [],
      neutral: [],
      weak: [],
      quadWeak: [],
    };
    for (const t of this.types) {
      const eff = this.effectiveness(t, pokemon.types);
      matchups[t] = eff;
      groups[this.bucket(eff)].push(t);
    }
    const score = PokemonTeamAnalyzer.clamp(
      80 +
        groups.immune.length * 8 +
        groups.quadResist.length * 4 +
        groups.resist.length * 2 -
        groups.weak.length * 8 -
        groups.quadWeak.length * 16
    );
    return { pokemon, matchups, groups, score };
  }

  analyzeDefense(members) {
    const W = PokemonTeamAnalyzer.WEIGHT;
    const byType = {};

    for (const t of this.types) {
      const entry = {
        type: t,
        weakBy: [],
        quadWeakBy: [],
        resistBy: [],
        immuneBy: [],
        net: 0,
      };
      for (const m of members) {
        const b = this.bucket(m.matchups[t]);
        entry.net += W[b];
        if (b === "weak" || b === "quadWeak") entry.weakBy.push(m.pokemon);
        if (b === "quadWeak") entry.quadWeakBy.push(m.pokemon);
        if (b === "resist" || b === "quadResist") entry.resistBy.push(m.pokemon);
        if (b === "immune") entry.immuneBy.push(m.pokemon);
      }
      const touched =
        entry.weakBy.length + entry.resistBy.length + entry.immuneBy.length;
      entry.severity =
        touched === 0
          ? "neutral"
          : entry.net >= 3
          ? "critical"
          : entry.net >= 1
          ? "major"
          : entry.net <= -1
          ? "resisted"
          : "balanced";
      byType[t] = entry;
    }

    const entries = Object.values(byType);
    const critical = entries
      .filter((e) => e.severity === "critical")
      .sort((a, b) => b.net - a.net);
    const major = entries
      .filter((e) => e.severity === "major")
      .sort((a, b) => b.net - a.net);
    const resisted = entries
      .filter((e) => e.severity === "resisted")
      .sort((a, b) => a.net - b.net);

    // Penalties scale with how many members a type pressures; resistance bonus is capped
    let score = 100;
    let bonus = 0;
    for (const e of entries) {
      if (e.net > 0) score -= 8 * e.net;
      if (e.severity === "critical") score -= 8;
      if (e.net < 0) bonus += Math.min(-e.net, 2);
    }
    score += Math.min(bonus, 15);

    return {
      byType,
      critical,
      major,
      resisted,
      score: PokemonTeamAnalyzer.clamp(score),
    };
  }

  // Coverage is estimated from STAB types only (no move data is fetched)
  analyzeCoverage(team) {
    const byType = {};
    for (const d of this.types) {
      let best = 0;
      let hitters = [];
      for (const p of team) {
        for (const a of p.types) {
          const eff = this.typeChart[a]?.[d] ?? 1;
          if (eff > best) {
            best = eff;
            hitters = [{ pokemon: p, type: a }];
          } else if (eff === best) {
            hitters.push({ pokemon: p, type: a });
          }
        }
      }
      byType[d] = {
        type: d,
        best,
        hitters: best >= 2 ? hitters : [],
        status: best >= 2 ? "super" : best >= 1 ? "neutral" : "wall",
      };
    }

    const superEffective = this.types.filter((d) => byType[d].status === "super");
    const gaps = this.types.filter((d) => byType[d].status !== "super");
    const walls = this.types.filter((d) => byType[d].status === "wall");

    const stab = new Set(team.flatMap((p) => p.types));
    const suggestions = this.types
      .filter((a) => !stab.has(a))
      .map((a) => ({
        type: a,
        covers: gaps.filter((d) => (this.typeChart[a]?.[d] ?? 1) >= 2),
      }))
      .filter((s) => s.covers.length > 0)
      .sort((x, y) => y.covers.length - x.covers.length)
      .slice(0, 3);

    return {
      byType,
      superEffective,
      gaps,
      walls,
      suggestions,
      score: Math.round((superEffective.length / this.types.length) * 100),
    };
  }

  analyzeDiversity(team) {
    const counts = {};
    team.forEach((p) => p.types.forEach((t) => (counts[t] = (counts[t] || 0) + 1)));
    const unique = Object.keys(counts).length;
    const possible = Math.max(1, Math.min(team.length * 2, this.types.length));
    const duplicates = Object.entries(counts)
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1]);
    return {
      counts,
      unique,
      duplicates,
      score: Math.round((unique / possible) * 100),
    };
  }

  buildRecommendations(team, members, defense, coverage, diversity) {
    const recs = [];
    const names = (list) => list.map((p) => p.name).join(", ");
    const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;
    const resistersOf = (t) =>
      this.types
        .filter((d) => (this.typeChart[t]?.[d] ?? 1) < 1)
        .map((d) => this.typeName(d));

    for (const e of [...defense.critical, ...defense.major].slice(0, 3)) {
      const covered = e.resistBy.length + e.immuneBy.length;
      const quad = e.quadWeakBy.length ? ` (${e.quadWeakBy.length} at 4×)` : "";
      recs.push({
        icon: e.severity === "critical" ? "dangerous" : "warning",
        tone: e.severity === "critical" ? "error" : "warning",
        title: `${this.typeName(e.type)} threatens ${plural(e.weakBy.length, "member")}${quad}`,
        body: `${names(e.weakBy)}. ${
          covered === 0
            ? "Nothing on the team resists it"
            : `Only ${plural(covered, "member")} resist${covered === 1 ? "s" : ""} it`
        } — a ${resistersOf(e.type).slice(0, 4).join(" / ")} type would absorb it.`,
      });
    }

    if (coverage.gaps.length) {
      const sugg = coverage.suggestions
        .map((s) => `${this.typeName(s.type)} (+${s.covers.length})`)
        .join(", ");
      recs.push({
        icon: "gps_off",
        tone: coverage.gaps.length >= 6 ? "warning" : "neutral",
        title: `No super-effective STAB against ${plural(coverage.gaps.length, "type")}`,
        body: `${coverage.gaps.map((d) => this.typeName(d)).join(", ")}.${
          sugg ? ` Adding ${sugg} would close the most gaps.` : ""
        }`,
      });
    }

    if (coverage.walls.length) {
      recs.push({
        icon: "block",
        tone: "error",
        title: `${coverage.walls.map((d) => this.typeName(d)).join(", ")} resist${
          coverage.walls.length === 1 ? "s" : ""
        } every STAB type you have`,
        body: "You'd rely on neutral coverage moves to break through these.",
      });
    }

    if (diversity.duplicates.length) {
      recs.push({
        icon: "content_copy",
        tone: "neutral",
        title: "Overlapping types",
        body: `${diversity.duplicates
          .map(([t, n]) => `${this.typeName(t)} ×${n}`)
          .join(", ")} — shared types stack the same weaknesses.`,
      });
    }

    const weakest = members.reduce((a, b) => (b.score < a.score ? b : a), members[0]);
    if (weakest && weakest.score < 55) {
      const weakTo = [...weakest.groups.quadWeak, ...weakest.groups.weak]
        .map((t) => this.typeName(t))
        .join(", ");
      recs.push({
        icon: "personal_injury",
        tone: "neutral",
        title: `${weakest.pokemon.name} is the most exposed member (${weakest.score}/100)`,
        body: `Weak to ${weakTo}.`,
      });
    }

    if (team.length < this.teamSize) {
      recs.push({
        icon: "group_add",
        tone: "neutral",
        title: `${plural(this.teamSize - team.length, "slot")} still open`,
        body: "Scores assume a full team; fill the remaining slots for a fair reading.",
      });
    }

    if (recs.length === 0) {
      recs.push({
        icon: "verified",
        tone: "success",
        title: "Well balanced",
        body: "No stacked weaknesses or coverage gaps found.",
      });
    }
    return recs;
  }

  runAnalysis() {
    const team = [...this.team.values()].filter(
      (p) => p && Array.isArray(p.types) && p.types.length > 0
    );
    const members = team.map((p) => this.analyzeMember(p));
    const defense = this.analyzeDefense(members);
    const coverage = this.analyzeCoverage(team);
    const diversity = this.analyzeDiversity(team);
    const overall = Math.round(
      coverage.score * 0.4 + defense.score * 0.4 + diversity.score * 0.2
    );
    const recommendations = this.buildRecommendations(
      team,
      members,
      defense,
      coverage,
      diversity
    );
    return { team, members, defense, coverage, diversity, overall, recommendations };
  }

  // ---------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------

  displayResults(r) {
    this.renderScore(r);
    this.renderLineup(r.team, r.coverage);
    this.renderRecommendations(r.recommendations);
    this.renderThreatList(r.defense);
    this.renderMemberCards(r.members);
    this.renderThreats(r.defense);
    document.getElementById("analysisMeta").textContent = `Updated ${new Date().toLocaleTimeString(
      [],
      { hour: "2-digit", minute: "2-digit" }
    )}`;
  }

  renderScore(r) {
    const set = (id, text) => (document.getElementById(id).textContent = text);
    set("overallScore", r.overall);
    set("coverageScore", `${r.coverage.score}%`);
    set("defenseScore", `${r.defense.score}%`);
    set("diversityScore", `${r.diversity.score}%`);

    const grade =
      r.overall >= 85
        ? "Excellent"
        : r.overall >= 70
        ? "Solid"
        : r.overall >= 55
        ? "Decent"
        : r.overall >= 40
        ? "Shaky"
        : "Fragile";
    set("overallGrade", grade);
    set(
      "overallSummary",
      `${r.coverage.superEffective.length}/${this.types.length} types hit super-effectively · ${
        r.defense.critical.length
      } critical threat${r.defense.critical.length === 1 ? "" : "s"} · ${
        r.defense.resisted.length
      } well-resisted`
    );

    const ring = document.getElementById("overallRing");
    const circumference = 2 * Math.PI * 42;
    ring.setAttribute("stroke-dasharray", `0 ${circumference}`);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        ring.setAttribute(
          "stroke-dasharray",
          `${(r.overall / 100) * circumference} ${circumference}`
        );
        document.getElementById("coverageFill").style.width = `${r.coverage.score}%`;
        document.getElementById("defenseFill").style.width = `${r.defense.score}%`;
        document.getElementById("diversityFill").style.width = `${r.diversity.score}%`;
      })
    );
  }

  renderRecommendations(recs) {
    const tone = {
      error: "text-error",
      warning: "text-warning",
      success: "text-success",
      neutral: "text-primary",
    };
    document.getElementById("recommendations").innerHTML = recs
      .map(
        (rec) => `
        <li class="md-list-item !px-0">
          <span class="material-symbols-rounded ${tone[rec.tone]}">${rec.icon}</span>
          <div class="min-w-0">
            <div class="title-sm">${rec.title}</div>
            <div class="body-md">${rec.body}</div>
          </div>
        </li>`
      )
      .join("");
  }

  // One row per attacking type that hits someone: who it hits, and who can switch in
  renderThreatList(defense) {
    const threats = Object.values(defense.byType)
      .filter((e) => e.weakBy.length > 0)
      .sort((a, b) => b.net - a.net || b.weakBy.length - a.weakBy.length);

    const badge = {
      critical: "bg-error text-on-error",
      major: "bg-warning-container text-on-warning-container",
      balanced: "bg-surface-highest text-on-surface-variant",
      resisted: "bg-success-container text-on-success-container",
    };
    const badgeText = {
      critical: "Critical",
      major: "Major",
      balanced: "Covered",
      resisted: "Covered",
    };

    const nameList = (list, quad = []) =>
      list
        .map((p) => (quad.includes(p) ? `<b>${p.name} (4×)</b>` : p.name))
        .join(", ");

    document.getElementById("threatList").innerHTML = threats.length
      ? threats
          .map((e) => {
            const safe = [...e.immuneBy, ...e.resistBy];
            return `
            <li class="md-list-item !px-0 !py-2.5 items-center flex-wrap">
              ${this.typeChip(e.type, "w-20 justify-center shrink-0")}
              <div class="flex-1 min-w-0 body-sm leading-5">
                <div><span class="label-md text-error mr-1">Hits ${e.weakBy.length}</span>${nameList(
                  e.weakBy,
                  e.quadWeakBy
                )}</div>
                <div>${
                  safe.length
                    ? `<span class="label-md text-success mr-1">Switch in</span>${nameList(safe)}`
                    : `<span class="label-md text-error">No safe switch-in</span>`
                }</div>
              </div>
              <span class="label-sm px-2 py-0.5 rounded-full shrink-0 ${badge[e.severity]}">${
                badgeText[e.severity]
              }</span>
            </li>`;
          })
          .join("")
      : `<li class="md-list-item !px-0 body-md">No attacking type hits any member super-effectively.</li>`;
  }

  renderMemberCards(members) {
    const chips = (list, mark = {}) =>
      list.length
        ? list
            .map(
              (t) =>
                `<span class="type-chip type-chip-sm" style="background:${this.typeData[t].color}">${this.typeName(
                  t
                )}${mark[t] ? `<b class="opacity-90">${mark[t]}</b>` : ""}</span>`
            )
            .join("")
        : `<span class="label-sm">—</span>`;

    document.getElementById("memberGrid").innerHTML = members
      .map((m) => {
        const tone =
          m.score >= 75
            ? "bg-success-container text-on-success-container"
            : m.score >= 50
            ? "bg-warning-container text-on-warning-container"
            : "bg-error-container text-on-error-container";
        const weakMarks = Object.fromEntries(m.groups.quadWeak.map((t) => [t, "4×"]));
        const resistMarks = {
          ...Object.fromEntries(m.groups.quadResist.map((t) => [t, "¼"])),
          ...Object.fromEntries(m.groups.immune.map((t) => [t, "0"])),
        };
        return `
        <div class="md-card-filled p-3 flex gap-3">
          <div class="w-16 h-16 shrink-0 flex items-center justify-center">
            ${this.spriteImg(m.pokemon, "max-w-full max-h-full")}
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-2">
              <span class="title-sm truncate">${m.pokemon.name}</span>
              <span class="label-sm px-2 py-0.5 rounded-full ${tone}" title="Defensive score">${m.score}</span>
            </div>
            <div class="flex flex-wrap gap-1 mt-1">${chips(m.pokemon.types)}</div>
            <div class="label-sm mt-2 mb-1">Weak to</div>
            <div class="flex flex-wrap gap-1">${chips(
              [...m.groups.quadWeak, ...m.groups.weak],
              weakMarks
            )}</div>
            <div class="label-sm mt-2 mb-1">Resists</div>
            <div class="flex flex-wrap gap-1">${chips(
              [...m.groups.immune, ...m.groups.quadResist, ...m.groups.resist],
              resistMarks
            )}</div>
          </div>
        </div>`;
      })
      .join("");
  }

  // Sprite height follows real height (sqrt so Wailord doesn't dwarf everyone); 1 m = 80px
  lineupHeight(pokemon) {
    const px = 80 * Math.sqrt((pokemon.height || 10) / 10);
    return Math.round(Math.max(48, Math.min(190, px)));
  }

  renderLineup(team, c) {
    const figures = [];
    for (let i = 0; i < this.teamSize; i++) {
      const p = this.team.get(i);
      figures.push(
        p
          ? `<figure title="${p.name} · ${(p.height / 10).toFixed(1)} m · ${p.types
              .map((t) => this.typeName(t))
              .join(" / ")}">
              ${this.spriteImg(p, "", `height:${this.lineupHeight(p)}px`)}
              <figcaption>${p.name}</figcaption>
            </figure>`
          : `<figure aria-hidden="true"></figure>`
      );
    }
    document.getElementById("lineup").innerHTML = figures.join("");

    const sugg = c.suggestions
      .map((s) => `${this.typeName(s.type)} (+${s.covers.length})`)
      .join(", ");
    document.getElementById("coverageSummary").textContent =
      `STAB hits ${c.superEffective.length} of ${this.types.length} types super-effectively.` +
      (sugg ? ` Best additions: ${sugg}.` : "");
  }

  renderThreats(d) {
    const chips = (entries, tone) =>
      entries
        .map((e) => {
          const detail = [
            e.weakBy.length ? `${e.weakBy.length} weak` : "",
            e.resistBy.length ? `${e.resistBy.length} resist` : "",
            e.immuneBy.length ? `${e.immuneBy.length} immune` : "",
          ]
            .filter(Boolean)
            .join(" · ");
          const count =
            tone === "resisted" ? e.resistBy.length + e.immuneBy.length : e.weakBy.length;
          return `<span class="type-chip" style="background:${this.typeData[e.type].color}" title="${detail}">${this.typeName(
            e.type
          )}<b class="ml-1 opacity-90">×${count}</b></span>`;
        })
        .join("") || `<span class="body-sm">None</span>`;

    document.getElementById("criticalCount").textContent = d.critical.length;
    document.getElementById("criticalTypes").innerHTML = chips(d.critical, "weak");
    document.getElementById("moderateCount").textContent = d.major.length;
    document.getElementById("moderateTypes").innerHTML = chips(d.major, "weak");
    document.getElementById("strongCount").textContent = d.resisted.length;
    document.getElementById("strongTypes").innerHTML = chips(d.resisted, "resisted");
  }

  // Animated XY+ 3D model from Showdown, then Pokémon HOME 3D render, then official artwork
  spriteSources(pokemon) {
    const base = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other";
    return [
      `https://play.pokemonshowdown.com/sprites/ani/${pokemon.showdownId}.gif`,
      `${base}/home/${pokemon.id}.png`,
      `${base}/official-artwork/${pokemon.id}.png`,
    ];
  }

  spriteImg(pokemon, className = "", style = "") {
    const [primary, ...fallbacks] = this.spriteSources(pokemon);
    return `<img src="${primary}" alt="${pokemon.name}" class="sprite-3d ${className}"${
      style ? ` style="${style}"` : ""
    } data-fallbacks="${fallbacks.join("|")}">`;
  }

  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}
