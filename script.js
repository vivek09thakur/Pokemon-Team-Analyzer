class PokemonTeamAnalyzer {
    constructor() {
        this.typeData = {
            normal: { color: "var(--type-normal)", name: "Normal" },
            fire: { color: "var(--type-fire)", name: "Fire" },
            water: { color: "var(--type-water)", name: "Water" },
            electric: { color: "var(--type-electric)", name: "Electric" },
            grass: { color: "var(--type-grass)", name: "Grass" },
            ice: { color: "var(--type-ice)", name: "Ice" },
            fighting: { color: "var(--type-fighting)", name: "Fighting" },
            poison: { color: "var(--type-poison)", name: "Poison" },
            ground: { color: "var(--type-ground)", name: "Ground" },
            flying: { color: "var(--type-flying)", name: "Flying" },
            psychic: { color: "var(--type-psychic)", name: "Psychic" },
            bug: { color: "var(--type-bug)", name: "Bug" },
            rock: { color: "var(--type-rock)", name: "Rock" },
            ghost: { color: "var(--type-ghost)", name: "Ghost" },
            dragon: { color: "var(--type-dragon)", name: "Dragon" },
            dark: { color: "var(--type-dark)", name: "Dark" },
            steel: { color: "var(--type-steel)", name: "Steel" },
            fairy: { color: "var(--type-fairy)", name: "Fairy" }
        };

        this.typeChart = {
            normal: { rock: 0.5, ghost: 0, steel: 0.5 },
            fire: { fire: 0.5, water: 0.5, grass: 2, ice: 2, bug: 2, rock: 0.5, dragon: 0.5, steel: 2 },
            water: { fire: 2, water: 0.5, grass: 0.5, ground: 2, rock: 2, dragon: 0.5 },
            electric: { water: 2, electric: 0.5, grass: 0.5, ground: 0, flying: 2, dragon: 0.5 },
            grass: { fire: 0.5, water: 2, grass: 0.5, poison: 0.5, ground: 2, flying: 0.5, bug: 0.5, rock: 2, dragon: 0.5, steel: 0.5 },
            ice: { fire: 0.5, water: 0.5, grass: 2, ice: 0.5, ground: 2, flying: 2, dragon: 2, steel: 0.5 },
            fighting: { normal: 2, ice: 2, poison: 0.5, flying: 0.5, psychic: 0.5, bug: 0.5, rock: 2, ghost: 0, dark: 2, steel: 2, fairy: 0.5 },
            poison: { grass: 2, poison: 0.5, ground: 0.5, rock: 0.5, ghost: 0.5, steel: 0, fairy: 2 },
            ground: { fire: 2, electric: 2, grass: 0.5, poison: 2, flying: 0, bug: 0.5, rock: 2, steel: 2 },
            flying: { electric: 0.5, grass: 2, fighting: 2, bug: 2, rock: 0.5, steel: 0.5 },
            psychic: { fighting: 2, poison: 2, psychic: 0.5, dark: 0, steel: 0.5 },
            bug: { fire: 0.5, grass: 2, fighting: 0.5, poison: 0.5, flying: 0.5, psychic: 2, ghost: 0.5, dark: 2, steel: 0.5, fairy: 0.5 },
            rock: { fire: 2, ice: 2, fighting: 0.5, ground: 0.5, flying: 2, bug: 2, steel: 0.5 },
            ghost: { normal: 0, psychic: 2, ghost: 2, dark: 0.5 },
            dragon: { dragon: 2, steel: 0.5, fairy: 0 },
            dark: { fighting: 0.5, psychic: 2, ghost: 2, dark: 0.5, fairy: 0.5 },
            steel: { fire: 0.5, water: 0.5, electric: 0.5, ice: 2, rock: 2, steel: 0.5, fairy: 2 },
            fairy: { fire: 0.5, fighting: 2, poison: 0.5, dragon: 2, dark: 2, steel: 0.5 }
        };

        this.team = new Map();
        this.currentSlot = null;
        this.selectedPokemon = null;
        this.searchTimeout = null;

        this.init();
    }

    init() {
        this.setupMobileNavigation();
        this.setupEventListeners();
        this.initTeamGrid();
    }

    setupMobileNavigation() {
        const menuToggle = document.getElementById('menuToggle');
        const mobileOverlay = document.getElementById('mobileOverlay');
        const sidebar = document.getElementById('sidebar');

        const toggleSidebar = () => {
            sidebar.classList.toggle('active');
            mobileOverlay.classList.toggle('active');
            document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
        };

        menuToggle.addEventListener('click', toggleSidebar);
        mobileOverlay.addEventListener('click', toggleSidebar);

        // Close sidebar on window resize if it's desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 1024) {
                sidebar.classList.remove('active');
                mobileOverlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }

    setupEventListeners() {
        document.getElementById('analyzeBtn').addEventListener('click', () => this.analyzeTeam());
        document.getElementById('resetBtn').addEventListener('click', () => this.resetTeam());
        document.getElementById('teamSize').addEventListener('change', () => this.changeTeamSize());
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('addToTeam').addEventListener('click', () => this.addPokemonToTeam());
        document.getElementById('searchInput').addEventListener('input', (e) => this.handleSearch(e));

        document.getElementById('addModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this.closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
        });
    }

    initTeamGrid() {
        const teamSize = parseInt(document.getElementById('teamSize').value);
        const teamGrid = document.getElementById('teamGrid');
        teamGrid.innerHTML = '';

        for (let i = 0; i < teamSize; i++) {
            const slot = this.createTeamSlot(i);
            teamGrid.appendChild(slot);
        }

        this.updateQuickStats();
    }

    createTeamSlot(index) {
        const slot = document.createElement('div');
        slot.className = 'team-slot empty';
        slot.dataset.index = index;

        if (this.team.has(index)) {
            const pokemon = this.team.get(index);
            this.renderFilledSlot(slot, pokemon);
        } else {
            this.renderEmptySlot(slot);
        }

        slot.addEventListener('click', (e) => {
            if (!e.target.closest('.remove-btn')) {
                this.openModal(index);
            }
        });

        return slot;
    }

    renderEmptySlot(slot) {
        slot.innerHTML = `
            <div class="slot-content">
                <span class="material-icons">add_circle</span>
                <span>Add Pokémon</span>
            </div>
        `;
    }

    renderFilledSlot(slot, pokemon) {
        const typesHtml = pokemon.types.map(type => 
            `<span class="type-badge small" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        ).join('');

        slot.innerHTML = `
            <button class="remove-btn" onclick="app.removePokemonFromTeam(${slot.dataset.index})">
                <span class="material-icons">close</span>
            </button>
            <div class="slot-content">
                <img src="${this.getPokemonSprite(pokemon.id)}" class="pokemon-sprite" alt="${pokemon.name}">
                <div class="pokemon-name">${pokemon.name}</div>
                <div class="pokemon-types">${typesHtml}</div>
            </div>
        `;
        slot.className = 'team-slot filled';
    }

    openModal(slotIndex) {
        if (this.team.has(slotIndex)) return;

        this.currentSlot = slotIndex;
        this.selectedPokemon = null;
        
        const modal = document.getElementById('addModal');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const selectedPreview = document.getElementById('selectedPreview');
        
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchResults.style.display = 'none';
        selectedPreview.classList.add('hidden');
        
        modal.classList.add('active');
        searchInput.focus();
    }

    closeModal() {
        const modal = document.getElementById('addModal');
        modal.classList.remove('active');
        this.currentSlot = null;
        this.selectedPokemon = null;
    }

    async handleSearch(event) {
        const searchTerm = event.target.value.trim().toLowerCase();
        const resultsContainer = document.getElementById('searchResults');

        if (searchTerm.length < 2) {
            resultsContainer.style.display = 'none';
            return;
        }

        if (this.searchTimeout) clearTimeout(this.searchTimeout);

        this.searchTimeout = setTimeout(async () => {
            try {
                resultsContainer.innerHTML = '<div class="search-item">Searching...</div>';
                resultsContainer.style.display = 'block';

                const response = await fetch('https://pokeapi.co/api/v2/pokemon?limit=1000');
                const data = await response.json();

                const filtered = data.results.filter(p => 
                    p.name.toLowerCase().includes(searchTerm)
                ).slice(0, 8);

                await this.displaySearchResults(filtered);
            } catch (error) {
                resultsContainer.innerHTML = '<div class="search-item">Error loading results</div>';
            }
        }, 300);
    }

    async displaySearchResults(results) {
        const resultsContainer = document.getElementById('searchResults');
        resultsContainer.innerHTML = '';

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="search-item">No Pokémon found</div>';
            return;
        }

        for (const result of results) {
            try {
                const response = await fetch(result.url);
                const data = await response.json();

                const item = document.createElement('div');
                item.className = 'search-item';
                item.innerHTML = `
                    <img src="${this.getPokemonSprite(data.id)}" alt="${data.name}">
                    <div class="search-info">
                        <div class="search-name">${this.capitalize(data.name)} #${data.id.toString().padStart(3, '0')}</div>
                        <div class="search-types">
                            ${data.types.map(t => 
                                `<span class="type-badge small" style="background: ${this.typeData[t.type.name].color}">
                                    ${this.typeData[t.type.name].name}
                                </span>`
                            ).join('')}
                        </div>
                    </div>
                `;

                item.addEventListener('click', () => this.selectPokemon(data));
                resultsContainer.appendChild(item);
            } catch (error) {
                console.error('Error loading Pokémon data:', error);
            }
        }

        resultsContainer.style.display = 'block';
    }

    selectPokemon(pokemonData) {
        this.selectedPokemon = {
            id: pokemonData.id,
            name: this.capitalize(pokemonData.name),
            types: pokemonData.types.map(t => t.type.name)
        };

        const preview = document.getElementById('selectedPreview');
        const selectedSprite = document.getElementById('selectedSprite');
        const selectedName = document.getElementById('selectedName');
        const selectedTypes = document.getElementById('selectedTypes');
        const searchResults = document.getElementById('searchResults');

        selectedSprite.src = this.getPokemonSprite(pokemonData.id);
        selectedName.textContent = `${this.capitalize(pokemonData.name)} #${pokemonData.id.toString().padStart(3, '0')}`;
        
        selectedTypes.innerHTML = pokemonData.types.map(t => 
            `<span class="type-badge" style="background: ${this.typeData[t.type.name].color}">
                ${this.typeData[t.type.name].name}
            </span>`
        ).join('');

        preview.classList.remove('hidden');
        searchResults.style.display = 'none';
    }

    addPokemonToTeam() {
        if (!this.selectedPokemon || this.currentSlot === null) return;

        this.team.set(this.currentSlot, this.selectedPokemon);
        this.updateTeamSlot(this.currentSlot, this.selectedPokemon);
        this.closeModal();
        this.updateQuickStats();
    }

    updateTeamSlot(slotIndex, pokemon) {
        const slot = document.querySelector(`.team-slot[data-index="${slotIndex}"]`);
        if (!slot) return;
        
        this.renderFilledSlot(slot, pokemon);
    }

    removePokemonFromTeam(slotIndex) {
        if (!confirm('Remove this Pokémon from your team?')) return;

        this.team.delete(slotIndex);
        const slot = document.querySelector(`.team-slot[data-index="${slotIndex}"]`);
        this.renderEmptySlot(slot);
        slot.className = 'team-slot empty';
        
        this.updateQuickStats();
        this.hideResults();
    }

    changeTeamSize() {
        const newSize = parseInt(document.getElementById('teamSize').value);
        const currentSize = this.team.size;

        if (currentSize > newSize) {
            if (!confirm(`Changing team size will remove ${currentSize - newSize} Pokémon. Continue?`)) {
                document.getElementById('teamSize').value = currentSize;
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
        if (!confirm('Reset the entire team? This will remove all Pokémon.')) return;

        this.team.clear();
        this.initTeamGrid();
        this.hideResults();
    }

    hideResults() {
        document.getElementById('resultsSection').classList.add('hidden');
    }

    updateQuickStats() {
        const teamSize = this.team.size;
        const stats = document.getElementById('quickStats');
        
        stats.innerHTML = `
            <div class="stat-box">
                <span class="stat-label">Team Size</span>
                <span class="stat-value">${teamSize}</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Coverage</span>
                <span class="stat-value">${teamSize > 0 ? '??' : '0'}%</span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Score</span>
                <span class="stat-value">${teamSize > 0 ? '??' : '0'}/100</span>
            </div>
        `;
    }

    analyzeTeam() {
        if (this.team.size === 0) {
            alert('Please add at least one Pokémon to your team!');
            return;
        }

        const analyzeBtn = document.getElementById('analyzeBtn');
        const originalText = analyzeBtn.innerHTML;
        analyzeBtn.innerHTML = 'Analyzing...';
        analyzeBtn.disabled = true;

        setTimeout(() => {
            const teamArray = Array.from(this.team.values());
            const coverage = this.calculateCoverage(teamArray);
            const weaknesses = this.calculateTeamWeaknesses(teamArray);
            const stats = this.calculateTeamStats(teamArray, coverage, weaknesses);

            this.displayResults(teamArray, coverage, weaknesses, stats);
            
            analyzeBtn.innerHTML = originalText;
            analyzeBtn.disabled = false;
            document.getElementById('resultsSection').classList.remove('hidden');
            
            document.getElementById('resultsSection').scrollIntoView({ behavior: 'smooth' });
        }, 500);
    }

    calculateCoverage(team) {
        const coverage = {};
        
        for (const type in this.typeData) {
            coverage[type] = 1;
        }

        team.forEach(pokemon => {
            pokemon.types.forEach(type => {
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
            coverage[defendingType] = Math.max(coverage[defendingType], effectiveness);
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
            quadWeaknesses: []
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
        const { immunities, quadResistances, resistances, weaknesses, quadWeaknesses } = pokemonWeaknesses.detailed;
        
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
            quadWeaknesses: []
        };

        for (const type in this.typeData) {
            weaknesses[type] = 1;
        }

        team.forEach(pokemon => {
            const pokemonWeaknesses = this.calculatePokemonWeaknesses(pokemon.types[0], pokemon.types[1]);
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
        team.forEach(p => p.types.forEach(t => uniqueTypes.add(t)));
        const diversityPercentage = Math.round((uniqueTypes.size / Math.min(team.length * 2, 18)) * 100);
        
        const overallScore = Math.round(
            (coveragePercentage * 0.4) + 
            (defenseScore * 0.4) + 
            (diversityPercentage * 0.2)
        );
        
        return {
            overallScore,
            coveragePercentage,
            defenseScore,
            diversityPercentage
        };
    }

    displayResults(team, coverage, weaknesses, stats) {
        document.getElementById('overallScore').textContent = stats.overallScore;
        document.getElementById('coverageScore').textContent = `${stats.coveragePercentage}%`;
        document.getElementById('defenseScore').textContent = `${stats.defenseScore}%`;
        document.getElementById('diversityScore').textContent = `${stats.diversityPercentage}%`;
        
        document.getElementById('coverageFill').style.width = `${stats.coveragePercentage}%`;
        document.getElementById('defenseFill').style.width = `${stats.defenseScore}%`;
        document.getElementById('diversityFill').style.width = `${stats.diversityPercentage}%`;
        
        this.displayTeamTable(team);
        this.displayWeaknessSummary(weaknesses.teamWeaknesses);
    }

    displayTeamTable(team) {
        const tableBody = document.getElementById('teamTableBody');
        tableBody.innerHTML = '';
        
        team.forEach((pokemon) => {
            const pokemonWeaknesses = this.calculatePokemonWeaknesses(pokemon.types[0], pokemon.types[1]);
            const individualScore = this.calculateIndividualScore(pokemonWeaknesses);
            
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="pokemon-cell">
                    <img src="${this.getPokemonSprite(pokemon.id)}" alt="${pokemon.name}">
                    <div class="pokemon-info">
                        <div class="pokemon-name">${pokemon.name}</div>
                        <div class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</div>
                    </div>
                </td>
                <td class="types-cell">
                    ${pokemon.types.map(type => 
                        `<span class="type-badge small" style="background: ${this.typeData[type].color}">
                            ${this.typeData[type].name}
                        </span>`
                    ).join('')}
                </td>
                <td class="weakness-cell">
                    ${pokemonWeaknesses.detailed.weaknesses.concat(pokemonWeaknesses.detailed.quadWeaknesses).map(type => 
                        `<span class="type-badge small" style="background: ${this.typeData[type].color}">
                            ${this.typeData[type].name}
                        </span>`
                    ).join('')}
                    ${pokemonWeaknesses.detailed.weaknesses.length + pokemonWeaknesses.detailed.quadWeaknesses.length === 0 ? 
                      '<span style="color: var(--text-tertiary); font-size: 0.875rem;">None</span>' : ''}
                </td>
                <td class="resistance-cell">
                    ${pokemonWeaknesses.detailed.resistances.concat(
                        pokemonWeaknesses.detailed.quadResistances, 
                        pokemonWeaknesses.detailed.immunities
                    ).map(type => 
                        `<span class="type-badge small" style="background: ${this.typeData[type].color}">
                            ${this.typeData[type].name}
                        </span>`
                    ).join('')}
                    ${pokemonWeaknesses.detailed.resistances.length + 
                      pokemonWeaknesses.detailed.quadResistances.length + 
                      pokemonWeaknesses.detailed.immunities.length === 0 ? 
                      '<span style="color: var(--text-tertiary); font-size: 0.875rem;">None</span>' : ''}
                </td>
                <td class="score-cell">
                    <span class="individual-score">${individualScore}</span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    }

    displayWeaknessSummary(teamWeaknesses) {
        document.getElementById('criticalCount').textContent = teamWeaknesses.quadWeaknesses.length;
        document.getElementById('criticalTypes').innerHTML = teamWeaknesses.quadWeaknesses.map(type => 
            `<span class="type-badge" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        ).join('');
        
        document.getElementById('moderateCount').textContent = teamWeaknesses.weaknesses.length;
        document.getElementById('moderateTypes').innerHTML = teamWeaknesses.weaknesses.map(type => 
            `<span class="type-badge" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        ).join('');
        
        const strongCount = teamWeaknesses.immunities.length + 
                           teamWeaknesses.quadResistances.length + 
                           teamWeaknesses.resistances.length;
        document.getElementById('strongCount').textContent = strongCount;
        document.getElementById('strongTypes').innerHTML = [
            ...teamWeaknesses.immunities,
            ...teamWeaknesses.quadResistances,
            ...teamWeaknesses.resistances
        ].map(type => 
            `<span class="type-badge" style="background: ${this.typeData[type].color}">
                ${this.typeData[type].name}
            </span>`
        ).join('');
    }

    getPokemonSprite(id) {
        return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
    }

    capitalize(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
    }
}

// Initialize the application
const app = new PokemonTeamAnalyzer();