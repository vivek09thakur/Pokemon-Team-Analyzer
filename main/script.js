class PokemonTeamAnalyzer {
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
            .then(response => {
              if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
              return response.json();
            })
            .then(data => data.results)
            .catch(error => {
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
      .getElementById("analyzeBtn")
      .addEventListener("click", () => this.analyzeTeam());
    document
      .getElementById("analyzeBtnMobile")
      .addEventListener("click", () => this.analyzeTeam());
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
  }

  initTeamGrid() {
    const teamSize = parseInt(document.getElementById("teamSize").value);
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
    slot.className =
      "bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pokemon-red transition-colors team-slot";
    slot.dataset.index = index;

    if (this.team.has(index)) {
      const pokemon = this.team.get(index);
      this.renderFilledSlot(slot, pokemon);
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

  renderEmptySlot(slot) {
    slot.innerHTML = `
            <div class="flex flex-col items-center text-center">
                <span class="material-icons text-gray-400 text-4xl mb-2">add_circle</span>
                <p class="text-gray-600 dark:text-gray-400 font-medium">Add Pokémon</p>
                <p class="text-sm text-gray-400 dark:text-gray-500 mt-1">Click to select</p>
            </div>
        `;
  }

  renderFilledSlot(slot, pokemon) {
    const typesHtml = pokemon.types
      .map(
        (type) =>
          `<span class="px-3 py-1 rounded-full text-white text-xs font-semibold" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
      )
      .join("");

    slot.innerHTML = `
            <div class="w-full h-full relative">
                <button class="remove-btn absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors z-10" 
                        onclick="app.removePokemonFromTeam(${
                          slot.dataset.index
                        })">
                    <span class="material-icons text-sm">close</span>
                </button>
                <div class="flex flex-col items-center h-full justify-between">
                    <img src="${this.getPokemonSprite(pokemon.id)}" 
                         class="w-20 h-20 mb-3 slot-sprite"
                         alt="${pokemon.name}"
                         onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                           pokemon.id
                         }.png'">
                    <div class="text-center">
                        <div class="text-lg font-bold text-gray-900 dark:text-white mb-2 truncate">${
                          pokemon.name
                        }</div>
                        <div class="flex flex-wrap gap-1 justify-center mb-2">${typesHtml}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">#${pokemon.id
                          .toString()
                          .padStart(3, "0")}</div>
                    </div>
                </div>
            </div>
        `;
    slot.className =
      "bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-4 flex flex-col items-center justify-center relative h-full";
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
          <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-pokemon-red mx-auto mb-2"></div>
          <div class="text-gray-500 dark:text-gray-400">Searching...</div>
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
            '<div class="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">Error: Pokémon data not loaded properly</div>';
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
          '<div class="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">Error searching. Please try again.</div>';
      }
    }, 300);
  }

  async displaySearchResults(pokemonList) {
    const resultsContainer = document.getElementById("searchResults");

    if (pokemonList.length === 0) {
      resultsContainer.innerHTML =
        '<div class="col-span-full py-8 text-center text-gray-500 dark:text-gray-400">No Pokémon found</div>';
      return;
    }

    // Show loading skeleton
    resultsContainer.innerHTML = Array(12)
      .fill()
      .map(
        () => `
            <div class="animate-pulse">
                <div class="bg-gray-200 dark:bg-gray-700 rounded-lg p-4">
                    <div class="bg-gray-300 dark:bg-gray-600 rounded-full w-16 h-16 mx-auto mb-3"></div>
                    <div class="bg-gray-300 dark:bg-gray-600 h-4 rounded mb-2"></div>
                    <div class="bg-gray-300 dark:bg-gray-600 h-3 rounded w-3/4 mx-auto"></div>
                </div>
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
            <div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex flex-col items-center h-full">
                <img src="${pokemon.sprite}" alt="${
          pokemon.name
        }" class="w-16 h-16 mb-2">
                <div class="text-center flex-1">
                    <div class="font-semibold text-gray-900 dark:text-white text-sm mb-1">${
                      pokemon.name
                    }</div>
                    <div class="text-xs text-gray-600 dark:text-gray-400 mb-2">#${pokemon.id
                      .toString()
                      .padStart(3, "0")}</div>
                    <div class="flex flex-wrap justify-center gap-1">
                        ${pokemon.types
                          .map(
                            (type) => `
                            <span class="px-2 py-0.5 rounded-full text-white text-xs font-semibold" style="background: ${
                              this.typeData[type]?.color || "#666"
                            }">
                                ${this.typeData[type]?.name || type}
                            </span>
                        `
                          )
                          .join("")}
                    </div>
                </div>
            </div>
        `
      )
      .join("");

    // Add click listeners
    resultsContainer
      .querySelectorAll('div[class*="bg-gray-50"]')
      .forEach((item, index) => {
        item.addEventListener("click", () =>
          this.selectPokemon(results[index])
        );
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

      const pokemonData = {
        id: data.id,
        name: this.capitalize(data.name),
        types: data.types.map((t) => t.type.name),
        sprite: this.getPokemonSprite(data.id),
      };

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

    selectedSprite.src = pokemonData.sprite;
    selectedName.textContent = `${pokemonData.name} #${pokemonData.id
      .toString()
      .padStart(3, "0")}`;

    selectedTypes.innerHTML = pokemonData.types
      .map(
        (type) =>
          `<span class="px-3 py-1 rounded-full text-white text-sm font-semibold" style="background: ${
            this.typeData[type]?.color || "#666"
          }">
                ${this.typeData[type]?.name || type}
            </span>`
      )
      .join("");

    preview.classList.remove("hidden");
  }

  addPokemonToTeam() {
    if (!this.selectedPokemon || this.currentSlot === null) return;

    this.team.set(this.currentSlot, this.selectedPokemon);
    this.updateTeamSlot(this.currentSlot, this.selectedPokemon);
    this.closeModal();
    this.updateQuickStats();
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
    this.renderEmptySlot(slot);
    slot.className =
      "bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:border-pokemon-red transition-colors h-full";

    this.updateQuickStats();
    this.hideResults();
  }

  changeTeamSize() {
    const newSize = parseInt(document.getElementById("teamSize").value);
    const currentSize = this.team.size;

    if (currentSize > newSize) {
      if (
        !confirm(
          `Changing team size will remove ${
            currentSize - newSize
          } Pokémon. Continue?`
        )
      ) {
        document.getElementById("teamSize").value = currentSize;
        return;
      }

      for (let i = newSize; i < 6; i++) {
        this.team.delete(i);
      }
    }

    this.initTeamGrid();
    this.hideResults();
  }

  resetTeam() {
    if (!confirm("Reset the entire team? This will remove all Pokémon."))
      return;

    this.team.clear();
    this.initTeamGrid();
    this.hideResults();
  }

  hideResults() {
    document.getElementById("resultsSection").classList.add("hidden");
  }

  updateQuickStats() {
    const teamCount = this.team.size;
    const typeCount = new Set();
    this.team.forEach((p) => p.types.forEach((t) => typeCount.add(t)));

    document.getElementById("teamCount").textContent = teamCount;
    document.getElementById("typeCount").textContent = typeCount.size;
  }

  analyzeTeam() {
    if (this.team.size === 0) {
      alert("Please add at least one Pokémon to your team!");
      return;
    }

    const analyzeBtn = document.getElementById("analyzeBtn");
    const analyzeBtnMobile = document.getElementById("analyzeBtnMobile");
    const originalText = analyzeBtn.innerHTML;
    const originalTextMobile = analyzeBtnMobile.innerHTML;

    analyzeBtn.innerHTML =
      '<span class="material-icons animate-spin mr-2">refresh</span><span>Analyzing...</span>';
    analyzeBtnMobile.innerHTML =
      '<span class="material-icons animate-spin mr-2">refresh</span><span>Analyzing...</span>';
    analyzeBtn.disabled = true;
    analyzeBtnMobile.disabled = true;

    setTimeout(() => {
      const teamArray = Array.from(this.team.values());
      const coverage = this.calculateCoverage(teamArray);
      const weaknesses = this.calculateTeamWeaknesses(teamArray);
      const stats = this.calculateTeamStats(teamArray, coverage, weaknesses);

      this.displayResults(teamArray, coverage, weaknesses, stats);

      analyzeBtn.innerHTML = originalText;
      analyzeBtnMobile.innerHTML = originalTextMobile;
      analyzeBtn.disabled = false;
      analyzeBtnMobile.disabled = false;

      const resultsSection = document.getElementById("resultsSection");
      resultsSection.classList.remove("hidden");
      resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 300);
  }

  calculateCoverage(team) {
    const coverage = {};

    for (const type in this.typeData) {
      coverage[type] = 1;
    }

    team.forEach((pokemon) => {
      pokemon.types.forEach((type) => {
        this.updateCoverageForType(coverage, type);
      });
    });

    return coverage;
  }

  updateCoverageForType(coverage, attackingType) {
    if (!this.typeChart[attackingType]) return;

    for (const defendingType in this.typeData) {
      let effectiveness = 1;
      if (this.typeChart[attackingType][defendingType] !== undefined) {
        effectiveness = this.typeChart[attackingType][defendingType];
      }
      coverage[defendingType] = Math.max(
        coverage[defendingType],
        effectiveness
      );
    }
  }

  calculatePokemonWeaknesses(type1, type2 = null) {
    const weaknesses = {};
    const detailed = {
      immunities: [],
      quadResistances: [],
      resistances: [],
      neutral: [],
      weaknesses: [],
      quadWeaknesses: [],
    };

    for (const attackingType in this.typeData) {
      let effectiveness = 1;

      if (this.typeChart[attackingType]) {
        if (this.typeChart[attackingType][type1] !== undefined) {
          effectiveness *= this.typeChart[attackingType][type1];
        }
        if (type2 && this.typeChart[attackingType][type2] !== undefined) {
          effectiveness *= this.typeChart[attackingType][type2];
        }
      }

      weaknesses[attackingType] = effectiveness;

      if (effectiveness === 0) {
        detailed.immunities.push(attackingType);
      } else if (effectiveness === 0.25) {
        detailed.quadResistances.push(attackingType);
      } else if (effectiveness === 0.5) {
        detailed.resistances.push(attackingType);
      } else if (effectiveness === 1) {
        detailed.neutral.push(attackingType);
      } else if (effectiveness === 2) {
        detailed.weaknesses.push(attackingType);
      } else if (effectiveness >= 4) {
        detailed.quadWeaknesses.push(attackingType);
      }
    }

    return { weaknesses, detailed };
  }

  calculateIndividualScore(pokemonWeaknesses) {
    let score = 100;
    const {
      immunities,
      quadResistances,
      resistances,
      weaknesses,
      quadWeaknesses,
    } = pokemonWeaknesses.detailed;

    score += immunities.length * 15;
    score += quadResistances.length * 10;
    score += resistances.length * 5;
    score -= weaknesses.length * 10;
    score -= quadWeaknesses.length * 25;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  calculateTeamWeaknesses(team) {
    const weaknesses = {};
    const teamWeaknesses = {
      immunities: [],
      quadResistances: [],
      resistances: [],
      neutral: [],
      weaknesses: [],
      quadWeaknesses: [],
    };

    for (const type in this.typeData) {
      weaknesses[type] = 1;
    }

    team.forEach((pokemon) => {
      const pokemonWeaknesses = this.calculatePokemonWeaknesses(
        pokemon.types[0],
        pokemon.types[1]
      );
      for (const type in weaknesses) {
        weaknesses[type] *= pokemonWeaknesses.weaknesses[type];
      }
    });

    for (const type in weaknesses) {
      const effectiveness = weaknesses[type];
      if (effectiveness === 0) {
        teamWeaknesses.immunities.push(type);
      } else if (effectiveness === 0.25) {
        teamWeaknesses.quadResistances.push(type);
      } else if (effectiveness === 0.5) {
        teamWeaknesses.resistances.push(type);
      } else if (effectiveness === 1) {
        teamWeaknesses.neutral.push(type);
      } else if (effectiveness === 2) {
        teamWeaknesses.weaknesses.push(type);
      } else if (effectiveness >= 4) {
        teamWeaknesses.quadWeaknesses.push(type);
      }
    }

    return { weaknesses, teamWeaknesses };
  }

  calculateTeamStats(team, coverage, weaknesses) {
    let superEffectiveCount = 0;
    for (const type in coverage) {
      if (coverage[type] >= 2) superEffectiveCount++;
    }
    const coveragePercentage = Math.round((superEffectiveCount / 18) * 100);

    let defenseScore = 100;
    defenseScore -= weaknesses.teamWeaknesses.quadWeaknesses.length * 20;
    defenseScore -= weaknesses.teamWeaknesses.weaknesses.length * 10;
    defenseScore += weaknesses.teamWeaknesses.immunities.length * 15;
    defenseScore += weaknesses.teamWeaknesses.quadResistances.length * 10;
    defenseScore += weaknesses.teamWeaknesses.resistances.length * 5;
    defenseScore = Math.max(0, Math.min(100, defenseScore));

    const uniqueTypes = new Set();
    team.forEach((p) => p.types.forEach((t) => uniqueTypes.add(t)));
    const diversityPercentage = Math.round(
      (uniqueTypes.size / Math.min(team.length * 2, 18)) * 100
    );

    const overallScore = Math.round(
      coveragePercentage * 0.4 + defenseScore * 0.4 + diversityPercentage * 0.2
    );

    return {
      overallScore,
      coveragePercentage,
      defenseScore,
      diversityPercentage,
    };
  }

  displayResults(team, coverage, weaknesses, stats) {
    document.getElementById("overallScore").textContent = stats.overallScore;
    document.getElementById(
      "coverageScore"
    ).textContent = `${stats.coveragePercentage}%`;
    document.getElementById(
      "defenseScore"
    ).textContent = `${stats.defenseScore}%`;
    document.getElementById(
      "diversityScore"
    ).textContent = `${stats.diversityPercentage}%`;

    setTimeout(() => {
      document.getElementById(
        "coverageFill"
      ).style.width = `${stats.coveragePercentage}%`;
      document.getElementById(
        "defenseFill"
      ).style.width = `${stats.defenseScore}%`;
      document.getElementById(
        "diversityFill"
      ).style.width = `${stats.diversityPercentage}%`;
    }, 100);

    this.displayTeamTable(team);
    this.displayWeaknessSummary(weaknesses.teamWeaknesses);
  }

  displayTeamTable(team) {
    const tableBody = document.getElementById("teamTableBody");
    tableBody.innerHTML = "";

    team.forEach((pokemon) => {
      const pokemonWeaknesses = this.calculatePokemonWeaknesses(
        pokemon.types[0],
        pokemon.types[1]
      );
      const individualScore = this.calculateIndividualScore(pokemonWeaknesses);

      const row = document.createElement("tr");
      row.className =
        "border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900";
      row.innerHTML = `
                <td class="py-4 px-6">
                    <div class="flex items-center space-x-4">
                        <img src="${this.getPokemonSprite(pokemon.id)}" 
                             alt="${pokemon.name}" 
                             class="w-12 h-12"
                             onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${
                               pokemon.id
                             }.png'">
                        <div>
                            <div class="font-semibold text-gray-900 dark:text-white">${
                              pokemon.name
                            }</div>
                            <div class="text-sm text-gray-500 dark:text-gray-400">#${pokemon.id
                              .toString()
                              .padStart(3, "0")}</div>
                        </div>
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="flex flex-wrap gap-2">
                        ${pokemon.types
                          .map(
                            (type) =>
                              `<span class="px-3 py-1 rounded-full text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                                ${this.typeData[type].name}
                            </span>`
                          )
                          .join("")}
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="flex flex-wrap gap-2">
                        ${pokemonWeaknesses.detailed.weaknesses
                          .concat(pokemonWeaknesses.detailed.quadWeaknesses)
                          .map(
                            (type) =>
                              `<span class="px-2 py-1 rounded text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                                ${this.typeData[type].name}
                            </span>`
                          )
                          .join("")}
                        ${
                          pokemonWeaknesses.detailed.weaknesses.length +
                            pokemonWeaknesses.detailed.quadWeaknesses.length ===
                          0
                            ? '<span class="text-gray-500 dark:text-gray-400 text-sm">None</span>'
                            : ""
                        }
                    </div>
                </td>
                <td class="py-4 px-6">
                    <div class="flex flex-wrap gap-2">
                        ${pokemonWeaknesses.detailed.resistances
                          .concat(
                            pokemonWeaknesses.detailed.quadResistances,
                            pokemonWeaknesses.detailed.immunities
                          )
                          .map(
                            (type) =>
                              `<span class="px-2 py-1 rounded text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                                ${this.typeData[type].name}
                            </span>`
                          )
                          .join("")}
                        ${
                          pokemonWeaknesses.detailed.resistances.length +
                            pokemonWeaknesses.detailed.quadResistances.length +
                            pokemonWeaknesses.detailed.immunities.length ===
                          0
                            ? '<span class="text-gray-500 dark:text-gray-400 text-sm">None</span>'
                            : ""
                        }
                    </div>
                </td>
                <td class="py-4 px-6">
                    <span class="inline-flex items-center justify-center w-10 h-10 rounded-full text-lg font-bold
                        ${
                          individualScore >= 80
                            ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                            : individualScore >= 60
                            ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                            : "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                        }">
                        ${individualScore}
                    </span>
                </td>
            `;
      tableBody.appendChild(row);
    });
  }

  displayWeaknessSummary(teamWeaknesses) {
    document.getElementById("criticalCount").textContent =
      teamWeaknesses.quadWeaknesses.length;
    document.getElementById("criticalTypes").innerHTML =
      teamWeaknesses.quadWeaknesses
        .map(
          (type) =>
            `<span class="px-3 py-1 rounded-full text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        )
        .join("");

    document.getElementById("moderateCount").textContent =
      teamWeaknesses.weaknesses.length;
    document.getElementById("moderateTypes").innerHTML =
      teamWeaknesses.weaknesses
        .map(
          (type) =>
            `<span class="px-3 py-1 rounded-full text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        )
        .join("");

    const strongCount =
      teamWeaknesses.immunities.length +
      teamWeaknesses.quadResistances.length +
      teamWeaknesses.resistances.length;
    document.getElementById("strongCount").textContent = strongCount;
    document.getElementById("strongTypes").innerHTML = [
      ...teamWeaknesses.immunities,
      ...teamWeaknesses.quadResistances,
      ...teamWeaknesses.resistances,
    ]
      .map(
        (type) =>
          `<span class="px-3 py-1 rounded-full text-white text-sm font-semibold" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
      )
      .join("");
  }

  getPokemonSprite(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }
}

// Initialize
const app = new PokemonTeamAnalyzer();
