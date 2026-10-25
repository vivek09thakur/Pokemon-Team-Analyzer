// Entry point + app controller: owns state, events, network, and dialogs.
// Pure logic lives in calculation.js / analysis.js, DOM output in render.js.
import "./style.css";
import {
  API_BASE,
  FALLBACK_POKEMON,
  LIST_BATCH_SIZE,
  MOVE_SLOTS,
  SEARCH_LIMIT,
  STORAGE_KEYS,
  TOTAL_POKEMON,
} from "./constants.js";
import { toPokemon } from "./calculation.js";
import { runAnalysis } from "./analysis.js";
import {
  displayResults,
  hideResults,
  paintMoveButton,
  renderEmptySlot,
  renderEmptyLineup,
  renderFilledSlot,
  renderMoveList,
  renderSearchMessage,
  renderSearchResults,
  renderSearchSkeleton,
  renderSearching,
  renderSelectedPreview,
  showResults,
  updateQuickStats,
} from "./render.js";

const $ = (id) => document.getElementById(id);

class TeamAnalyzerApp {
  constructor() {
    this.team = new Map();
    this.teamSize = 6;
    this.currentSlot = null;
    this.selectedPokemon = null;
    this.moveTarget = null;
    this.searchTimeout = null;
    this.searchController = null;
    this.pokemonCache = new Map();
    this.pokemonList = [];
    // move slug -> type name; persisted so repeat picks don't hit the API
    this.moveTypeCache = new Map(
      Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEYS.moveTypes) || "{}"))
    );

    this.setupEventListeners();
    this.initTeamGrid();
    renderEmptyLineup(this.teamSize);
    this.loadPokemonData().catch((error) =>
      console.error("Failed to load Pokémon data:", error)
    );
  }

  // ---------- Data loading ----------

  async loadPokemonData() {
    try {
      await this.fetchFreshPokemonData();
    } catch (error) {
      console.error("Error loading Pokémon list:", error);
      try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.pokemonList) || "null");
        if (Array.isArray(parsed)) this.pokemonList = parsed;
        else if (parsed && Array.isArray(parsed.results)) this.pokemonList = parsed.results;
      } catch (cacheError) {
        console.error("Cache fallback also failed:", cacheError);
      }
      if (!this.pokemonList?.length) {
        this.pokemonList = FALLBACK_POKEMON.map((name) => ({ name, url: "" }));
      }
    }
  }

  async fetchFreshPokemonData() {
    const batches = [];
    for (let offset = 0; offset < TOTAL_POKEMON; offset += LIST_BATCH_SIZE) {
      const limit = Math.min(LIST_BATCH_SIZE, TOTAL_POKEMON - offset);
      batches.push(
        fetch(`${API_BASE}/pokemon?limit=${limit}&offset=${offset}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then((data) => data.results)
          .catch((error) => {
            console.error(`Error fetching batch at offset ${offset}:`, error);
            return [];
          })
      );
    }
    this.pokemonList = (await Promise.all(batches)).flat();
    localStorage.setItem(STORAGE_KEYS.pokemonList, JSON.stringify(this.pokemonList));
  }

  async fetchPokemonData(name) {
    const cacheKey = name.toLowerCase();
    if (this.pokemonCache.has(cacheKey)) return this.pokemonCache.get(cacheKey);

    try {
      const slug = cacheKey.replace(/[^a-z0-9-]/g, "");
      const response = await fetch(`${API_BASE}/pokemon/${slug}`);
      if (!response.ok) throw new Error(`Pokémon not found: ${name}`);
      const pokemon = toPokemon(await response.json());
      if (!pokemon) throw new Error(`No recognised types for ${name}`);
      this.pokemonCache.set(cacheKey, pokemon);
      return pokemon;
    } catch (error) {
      console.error(`Error fetching ${name}:`, error);
      return null;
    }
  }

  async fetchMoveType(slug) {
    if (this.moveTypeCache.has(slug)) return this.moveTypeCache.get(slug);
    try {
      const res = await fetch(`${API_BASE}/move/${slug}`);
      if (!res.ok) return null;
      const type = (await res.json()).type?.name || null;
      if (type) {
        this.moveTypeCache.set(slug, type);
        localStorage.setItem(
          STORAGE_KEYS.moveTypes,
          JSON.stringify(Object.fromEntries(this.moveTypeCache))
        );
      }
      return type;
    } catch {
      return null;
    }
  }

  // ---------- Events ----------

  setupEventListeners() {
    $("resetBtn").addEventListener("click", () => this.resetTeam());
    $("teamSize").addEventListener("change", () => this.changeTeamSize());

    $("closeModal").addEventListener("click", () => this.closeModal());
    $("addToTeam").addEventListener("click", () => this.addPokemonToTeam());
    $("searchInput").addEventListener("input", (e) => this.handleSearch(e));
    $("addModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.closeModal();
    });

    $("closeMoveModal").addEventListener("click", () => this.closeMoveModal());
    $("clearMove").addEventListener("click", () => this.pickMove(""));
    $("moveSearch").addEventListener("input", (e) => this.renderMoves(e.target.value));
    $("moveModal").addEventListener("click", (e) => {
      if (e.target === e.currentTarget) this.closeMoveModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this.moveTarget) this.closeMoveModal();
      else this.closeModal();
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

  // ---------- Team grid ----------

  initTeamGrid() {
    this.teamSize = parseInt($("teamSize").value);
    const grid = $("teamGrid");
    grid.innerHTML = "";
    for (let i = 0; i < this.teamSize; i++) grid.appendChild(this.createTeamSlot(i));
    updateQuickStats(this.team, this.teamSize);
  }

  createTeamSlot(index) {
    const slot = document.createElement("div");
    slot.dataset.index = index;
    if (this.team.has(index)) this.fillSlot(slot, this.team.get(index));
    else renderEmptySlot(slot);

    slot.addEventListener("click", (e) => {
      if (!e.target.closest(".remove-btn")) this.openModal(index);
    });
    return slot;
  }

  fillSlot(slot, pokemon) {
    const index = parseInt(slot.dataset.index);
    renderFilledSlot(slot, pokemon, {
      onRemove: () => this.removePokemonFromTeam(index),
      onAbilityChange: (value) => (pokemon.ability = value),
      onMoveClick: (moveIndex) => this.openMoveModal(index, moveIndex),
      getMoveType: (slug) => this.fetchMoveType(slug),
    });
  }

  slotElement(index) {
    return document.querySelector(`[data-index="${index}"]`);
  }

  addPokemonToTeam() {
    if (!this.selectedPokemon || this.currentSlot === null) return;

    // Per-slot copy so ability/move picks don't leak into the shared cache entry
    const member = {
      ...this.selectedPokemon,
      ability: this.selectedPokemon.abilities?.[0]?.name || "",
      selectedMoves: Array(MOVE_SLOTS).fill(""),
    };
    this.team.set(this.currentSlot, member);
    const slot = this.slotElement(this.currentSlot);
    if (slot) this.fillSlot(slot, member);
    this.closeModal();
    this.refreshAnalysis();
  }

  removePokemonFromTeam(index) {
    if (!confirm("Remove this Pokémon from your team?")) return;
    this.team.delete(index);
    const slot = this.slotElement(index);
    if (slot) renderEmptySlot(slot);
    this.refreshAnalysis();
  }

  changeTeamSize() {
    const select = $("teamSize");
    const newSize = parseInt(select.value);
    const overflow = [...this.team.keys()].filter((i) => i >= newSize);

    if (overflow.length > 0) {
      if (!confirm(`Changing team size will remove ${overflow.length} Pokémon. Continue?`)) {
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
    if (!confirm("Reset the entire team? This will remove all Pokémon.")) return;
    this.team.clear();
    this.initTeamGrid();
    this.refreshAnalysis();
  }

  refreshAnalysis() {
    updateQuickStats(this.team, this.teamSize);
    if (this.team.size === 0) {
      hideResults();
      renderEmptyLineup(this.teamSize);
      return;
    }
    try {
      displayResults(runAnalysis(this.team, this.teamSize), this.team, this.teamSize);
      showResults();
    } catch (error) {
      console.error("Analysis failed:", error);
      hideResults();
    }
  }

  // ---------- Add-Pokémon dialog ----------

  openModal(slotIndex) {
    if (this.team.has(slotIndex)) return;
    this.currentSlot = slotIndex;
    this.selectedPokemon = null;

    $("searchInput").value = "";
    $("searchResults").innerHTML = "";
    $("selectedPreview").classList.add("hidden");
    $("addModal").classList.remove("hidden");
    setTimeout(() => $("searchInput").focus(), 100);
  }

  closeModal() {
    this.searchController?.abort();
    this.searchController = null;
    $("addModal").classList.add("hidden");
    this.currentSlot = null;
    this.selectedPokemon = null;
  }

  handleSearch(event) {
    const term = event.target.value.trim().toLowerCase();
    clearTimeout(this.searchTimeout);
    this.searchController?.abort();

    if (term.length < 2) {
      $("searchResults").innerHTML = "";
      return;
    }

    this.searchTimeout = setTimeout(async () => {
      this.searchController = new AbortController();
      try {
        renderSearching();
        if (!this.pokemonList?.length) await this.loadPokemonData();

        const filtered = this.pokemonList
          .filter((p) => p?.name?.toLowerCase().includes(term))
          .slice(0, SEARCH_LIMIT);
        if (filtered.length === 0) {
          renderSearchMessage("No Pokémon found");
          return;
        }

        renderSearchSkeleton();
        const results = [];
        for (const entry of filtered) {
          const data = await this.fetchPokemonData(entry.name);
          if (data) results.push(data);
          if (results.length >= SEARCH_LIMIT) break;
        }
        renderSearchResults(results, (pokemon) => this.selectPokemon(pokemon));
      } catch (error) {
        if (error.name === "AbortError") return;
        console.error("Search error:", error);
        renderSearchMessage("Error searching. Please try again.");
      }
    }, 300);
  }

  selectPokemon(pokemon) {
    this.selectedPokemon = pokemon;
    renderSelectedPreview(pokemon);
  }

  // ---------- Move picker ----------

  openMoveModal(slotIndex, moveIndex) {
    const pokemon = this.team.get(slotIndex);
    if (!pokemon) return;
    this.moveTarget = { slotIndex, moveIndex };

    $("moveModalTitle").textContent = `Move ${moveIndex + 1}`;
    $("moveModalSub").textContent = pokemon.name;
    $("moveSearch").value = "";
    this.renderMoves("");
    $("moveModal").classList.remove("hidden");
    setTimeout(() => $("moveSearch").focus(), 50);
  }

  closeMoveModal() {
    $("moveModal").classList.add("hidden");
    this.moveTarget = null;
  }

  renderMoves(filter) {
    if (!this.moveTarget) return;
    const pokemon = this.team.get(this.moveTarget.slotIndex);
    renderMoveList(pokemon, this.moveTarget.moveIndex, filter, {
      knownType: (slug) => this.moveTypeCache.get(slug),
      getMoveType: (slug) => this.fetchMoveType(slug),
      onPick: (slug) => this.pickMove(slug),
    });
  }

  pickMove(slug) {
    if (!this.moveTarget) return;
    const { slotIndex, moveIndex } = this.moveTarget;
    const pokemon = this.team.get(slotIndex);
    if (!pokemon) return;
    pokemon.selectedMoves = pokemon.selectedMoves || Array(MOVE_SLOTS).fill("");
    pokemon.selectedMoves[moveIndex] = slug;

    const btn = this.slotElement(slotIndex)?.querySelector(`.slot-move[data-move="${moveIndex}"]`);
    if (btn) paintMoveButton(btn, pokemon, (s) => this.fetchMoveType(s));
    this.closeMoveModal();
  }
}

// ---------- Shell: theme, drawer, recommendations dialog ----------

function initShell() {
  const root = document.documentElement;
  const themeIcon = $("themeIcon");
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    root.classList.add("dark");
    themeIcon.textContent = "light_mode";
  }
  $("themeToggle").addEventListener("click", () => {
    root.classList.toggle("dark");
    themeIcon.textContent = root.classList.contains("dark") ? "light_mode" : "dark_mode";
  });

  const recModal = $("recModal");
  const closeRec = () => recModal.classList.add("hidden");
  $("recommendationsCard").addEventListener("click", () => recModal.classList.remove("hidden"));
  $("closeRecModal").addEventListener("click", closeRec);
  recModal.addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeRec();
  });

  const sidebar = $("sidebar");
  const overlay = $("mobileOverlay");

  // Same controls/theme toggle live in the drawer on mobile and in the left column on desktop
  const controls = $("controls");
  const themeToggle = $("themeToggle");
  const desktop = window.matchMedia("(min-width: 1024px)");
  const placeControls = () => {
    const dock = desktop.matches ? $("controlsDock") : $("drawerDock");
    if (controls.parentElement !== dock) dock.appendChild(controls);
    const themeDock = desktop.matches ? $("navThemeDock") : $("drawerThemeDock");
    if (themeToggle.parentElement !== themeDock) themeDock.appendChild(themeToggle);
  };
  placeControls();
  desktop.addEventListener("change", placeControls);

  const toggleSidebar = () => {
    sidebar.classList.toggle("-translate-x-full");
    overlay.classList.toggle("hidden");
  };
  $("menuToggle").addEventListener("click", toggleSidebar);
  $("closeSidebar").addEventListener("click", toggleSidebar);
  overlay.addEventListener("click", toggleSidebar);

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeRec();
    if (window.innerWidth < 1024 && !sidebar.classList.contains("-translate-x-full")) toggleSidebar();
  });
  window.addEventListener("resize", () => {
    placeControls();
    if (window.innerWidth >= 1024) {
      sidebar.classList.remove("-translate-x-full");
      overlay.classList.add("hidden");
    } else if (overlay.classList.contains("hidden")) {
      // Crossing back below the breakpoint: drawer must be closed unless it was opened on mobile
      sidebar.classList.add("-translate-x-full");
    }
  });
}

initShell();
new TeamAnalyzerApp();
