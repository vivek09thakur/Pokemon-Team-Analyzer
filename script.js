// Pokémon type data with colors
const typeData = {
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

// Type effectiveness chart
const typeChart = {
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

let pokemonDataStore = new Map();
let currentSelectedSlot = null;
let selectedPokemonData = null;
let searchTimeout = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeTeam();
    setupEventListeners();
    updateQuickStats();
});

function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculateAnalysis);
    document.getElementById('reset-btn').addEventListener('click', resetTeam);
    document.getElementById('team-size').addEventListener('change', changeTeamSize);
    document.getElementById('popup-close').addEventListener('click', closePopup);
    document.getElementById('popup-search').addEventListener('input', handlePopupSearch);
    document.getElementById('confirm-add-btn').addEventListener('click', confirmAddPokemon);
    
    // Close popup on overlay click
    document.getElementById('popup-overlay').addEventListener('click', function(e) {
        if (e.target === this) {
            closePopup();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closePopup();
        } else if (e.ctrlKey && e.key === 'Enter') {
            calculateAnalysis();
        }
    });
}

function initializeTeam() {
    const teamSize = parseInt(document.getElementById('team-size').value);
    const teamContainer = document.getElementById('team-container');
    teamContainer.innerHTML = '';
    
    for (let i = 0; i < teamSize; i++) {
        const slot = document.createElement('div');
        slot.className = 'team-slot empty';
        slot.setAttribute('data-slot-index', i);
        slot.innerHTML = `
            <div class="slot-content">
                <span class="material-icons add-icon">add_circle</span>
                <span class="slot-label">Add Pokémon</span>
            </div>
        `;
        
        slot.addEventListener('click', () => openPopup(i));
        teamContainer.appendChild(slot);
    }
}

function openPopup(slotIndex) {
    // Check if slot already has a Pokémon
    if (pokemonDataStore.has(slotIndex)) {
        return;
    }
    
    currentSelectedSlot = slotIndex;
    selectedPokemonData = null;
    
    // Reset popup content
    document.getElementById('popup-search').value = '';
    document.getElementById('popup-search-results').innerHTML = '';
    document.getElementById('popup-search-results').classList.add('hidden');
    document.getElementById('selected-preview').classList.add('hidden');
    document.getElementById('confirm-add-btn').disabled = true;
    
    // Show popup
    document.getElementById('popup-overlay').classList.remove('hidden');
    document.getElementById('popup-search').focus();
}

function closePopup() {
    document.getElementById('popup-overlay').classList.add('hidden');
    currentSelectedSlot = null;
    selectedPokemonData = null;
}

async function handlePopupSearch() {
    const searchInput = document.getElementById('popup-search');
    const searchTerm = searchInput.value.trim().toLowerCase();
    const resultsContainer = document.getElementById('popup-search-results');
    
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        document.getElementById('selected-preview').classList.add('hidden');
        return;
    }
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Debounce search
    searchTimeout = setTimeout(async () => {
        try {
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">Searching...</div>';
            resultsContainer.classList.remove('hidden');
            
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=1000`);
            const data = await response.json();
            
            const filteredResults = data.results.filter(pokemon => 
                pokemon.name.toLowerCase().includes(searchTerm)
            ).slice(0, 8);
            
            await displaySearchResults(filteredResults);
            
        } catch (error) {
            resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--error);">Error loading results</div>';
        }
    }, 300);
}

async function displaySearchResults(results) {
    const resultsContainer = document.getElementById('popup-search-results');
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-secondary);">No Pokémon found</div>';
        return;
    }
    
    const fragment = document.createDocumentFragment();
    
    for (const pokemon of results) {
        try {
            const response = await fetch(pokemon.url);
            const data = await response.json();
            
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${getBestSprite(data.id, data.name)}" 
                     alt="${data.name}" 
                     class="search-result-img"
                     loading="lazy">
                <div class="search-result-info">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <h4>${capitalizeFirstLetter(data.name)}</h4>
                        <span class="pokemon-id">#${data.id.toString().padStart(3, '0')}</span>
                    </div>
                    <div class="type-container">
                        ${data.types.map(t => `
                            <span class="type-badge small" style="background-color: ${typeData[t.type.name].color}">
                                ${typeData[t.type.name].name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
            
            resultItem.addEventListener('click', () => selectPokemonFromSearch(data));
            fragment.appendChild(resultItem);
        } catch (error) {
            console.error('Error fetching sprite:', error);
        }
    }
    
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(fragment);
    resultsContainer.classList.remove('hidden');
}

function selectPokemonFromSearch(pokemonData) {
    selectedPokemonData = pokemonData;
    
    // Hide search results
    document.getElementById('popup-search-results').classList.add('hidden');
    
    // Show selected preview
    const preview = document.getElementById('selected-preview');
    document.getElementById('selected-sprite').src = getBestSprite(pokemonData.id, pokemonData.name);
    document.getElementById('selected-name').textContent = `${capitalizeFirstLetter(pokemonData.name)} #${pokemonData.id.toString().padStart(3, '0')}`;
    
    const typesContainer = document.getElementById('selected-types');
    typesContainer.innerHTML = pokemonData.types.map(t => `
        <span class="type-badge" style="background-color: ${typeData[t.type.name].color}">
            ${typeData[t.type.name].name}
        </span>
    `).join('');
    
    preview.classList.remove('hidden');
    document.getElementById('confirm-add-btn').disabled = false;
    
    // Scroll to confirm button
    preview.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function confirmAddPokemon() {
    if (!selectedPokemonData || currentSelectedSlot === null) return;
    
    pokemonDataStore.set(currentSelectedSlot, selectedPokemonData);
    updateTeamSlot(currentSelectedSlot, selectedPokemonData);
    closePopup();
    updateQuickStats();
}

function updateTeamSlot(slotIndex, pokemonData) {
    const slot = document.querySelector(`.team-slot[data-slot-index="${slotIndex}"]`);
    if (!slot) return;
    
    slot.className = 'team-slot filled';
    const types = pokemonData.types.map(t => t.type.name);
    
    slot.innerHTML = `
        <button class="remove-btn" onclick="removePokemon(${slotIndex})">
            <span class="material-icons">close</span>
        </button>
        <div class="slot-content">
            <img src="${getBestSprite(pokemonData.id, pokemonData.name)}" 
                 alt="${pokemonData.name}" 
                 class="pokemon-sprite-large">
            <div class="pokemon-name">${capitalizeFirstLetter(pokemonData.name)}</div>
            <div class="pokemon-types">
                ${types.map(type => `
                    <span class="type-badge small" style="background-color: ${typeData[type].color}">
                        ${typeData[type].name}
                    </span>
                `).join('')}
            </div>
        </div>
    `;
}

function removePokemon(slotIndex) {
    event.stopPropagation(); // Prevent triggering slot click
    
    if (confirm('Remove this Pokémon from your team?')) {
        pokemonDataStore.delete(slotIndex);
        
        const slot = document.querySelector(`.team-slot[data-slot-index="${slotIndex}"]`);
        slot.className = 'team-slot empty';
        slot.innerHTML = `
            <div class="slot-content">
                <span class="material-icons add-icon">add_circle</span>
                <span class="slot-label">Add Pokémon</span>
            </div>
        `;
        
        // Re-add click event
        slot.addEventListener('click', () => openPopup(slotIndex));
        updateQuickStats();
    }
}

// Function to get the best available sprite
function getBestSprite(id, name) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function changeTeamSize() {
    const newSize = parseInt(document.getElementById('team-size').value);
    const currentSize = pokemonDataStore.size;
    
    if (currentSize > newSize) {
        if (!confirm(`Changing team size to ${newSize} will remove ${currentSize - newSize} Pokémon from your team. Continue?`)) {
            document.getElementById('team-size').value = currentSize;
            return;
        }
    }
    
    // Clear data for removed slots
    for (let i = newSize; i < 6; i++) {
        pokemonDataStore.delete(i);
    }
    
    initializeTeam();
    resetResults();
    updateQuickStats();
}

function resetTeam() {
    if (confirm('Reset the entire team? This will remove all Pokémon.')) {
        pokemonDataStore.clear();
        initializeTeam();
        resetResults();
        updateQuickStats();
    }
}

function resetResults() {
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('team-table-body').innerHTML = '';
    document.getElementById('critical-types').innerHTML = '';
    document.getElementById('moderate-types').innerHTML = '';
    document.getElementById('strong-types').innerHTML = '';
}

function updateQuickStats() {
    const teamSize = pokemonDataStore.size;
    const team = Array.from(pokemonDataStore.entries()).map(([index, data]) => ({
        name: capitalizeFirstLetter(data.name),
        type1: data.types[0].type.name,
        type2: data.types[1] ? data.types[1].type.name : ''
    }));
    
    const stats = document.getElementById('quick-stats');
    stats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Team Size</span>
            <span class="stat-value">${teamSize}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Type Coverage</span>
            <span class="stat-value">${teamSize > 0 ? '??' : '0'}%</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Team Score</span>
            <span class="stat-value">${teamSize > 0 ? '??' : '0'}/100</span>
        </div>
    `;
}

function calculateAnalysis() {
    const team = [];
    const teamSize = parseInt(document.getElementById('team-size').value);
    
    for (let i = 0; i < teamSize; i++) {
        if (pokemonDataStore.has(i)) {
            const pokemonData = pokemonDataStore.get(i);
            const types = pokemonData.types.map(t => t.type.name);
            team.push({ 
                id: pokemonData.id,
                name: capitalizeFirstLetter(pokemonData.name), 
                type1: types[0], 
                type2: types[1] || '',
                sprite: getBestSprite(pokemonData.id, pokemonData.name)
            });
        }
    }
    
    if (team.length === 0) {
        alert('Please add at least one Pokémon to your team!');
        return;
    }
    
    const calculateBtn = document.getElementById('calculate-btn');
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = '<span class="loading"></span>Analyzing...';
    calculateBtn.disabled = true;
    
    setTimeout(() => {
        const coverage = calculateCoverage(team);
        const weaknesses = calculateWeaknesses(team);
        const teamStats = calculateTeamStats(team, coverage, weaknesses);
        
        displayTeamTable(team);
        displayScoreSummary(teamStats);
        displayWeaknessSummary(weaknesses);
        
        document.getElementById('results-section').classList.remove('hidden');
        calculateBtn.innerHTML = originalText;
        calculateBtn.disabled = false;
        
        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 500);
}

function calculateCoverage(team) {
    const coverage = {};
    
    for (const type in typeData) {
        coverage[type] = 1;
    }
    
    team.forEach(pokemon => {
        updateCoverageForType(coverage, pokemon.type1);
        if (pokemon.type2) updateCoverageForType(coverage, pokemon.type2);
    });
    
    return coverage;
}

function updateCoverageForType(coverage, attackingType) {
    if (!attackingType) return;
    
    for (const defendingType in typeData) {
        let effectiveness = 1;
        if (typeChart[attackingType] && typeChart[attackingType][defendingType] !== undefined) {
            effectiveness = typeChart[attackingType][defendingType];
        }
        coverage[defendingType] = Math.max(coverage[defendingType], effectiveness);
    }
}

function calculatePokemonWeaknesses(type1, type2) {
    const weaknesses = {};
    const detailed = {
        immunities: [],
        quadResistances: [],
        resistances: [],
        neutral: [],
        weaknesses: [],
        quadWeaknesses: []
    };

    for (const attackingType in typeData) {
        let effectiveness = 1;
        
        if (typeChart[attackingType]) {
            if (typeChart[attackingType][type1] !== undefined) {
                effectiveness *= typeChart[attackingType][type1];
            }
            if (type2 && typeChart[attackingType][type2] !== undefined) {
                effectiveness *= typeChart[attackingType][type2];
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

function calculateIndividualScore(pokemonWeaknesses) {
    let score = 100;
    const { immunities, quadResistances, resistances, weaknesses, quadWeaknesses } = pokemonWeaknesses.detailed;
    
    // Bonus for immunities and resistances
    score += immunities.length * 15;
    score += quadResistances.length * 10;
    score += resistances.length * 5;
    
    // Penalty for weaknesses
    score -= weaknesses.length * 10;
    score -= quadWeaknesses.length * 25;
    
    // Ensure score is between 0-100
    return Math.max(0, Math.min(100, Math.round(score)));
}

function calculateWeaknesses(team) {
    const weaknesses = {};
    const teamWeaknesses = {
        immunities: [],
        quadResistances: [],
        resistances: [],
        neutral: [],
        weaknesses: [],
        quadWeaknesses: []
    };

    for (const type in typeData) {
        weaknesses[type] = 1;
    }

    team.forEach(pokemon => {
        const pokemonWeaknesses = calculatePokemonWeaknesses(pokemon.type1, pokemon.type2);
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

function calculateTeamStats(team, coverage, weaknesses) {
    let superEffectiveCount = 0;
    for (const type in coverage) {
        if (coverage[type] >= 2) superEffectiveCount++;
    }
    
    const coveragePercentage = Math.round((superEffectiveCount / 18) * 100);
    
    // Calculate defense score
    let defenseScore = 100;
    defenseScore -= weaknesses.teamWeaknesses.quadWeaknesses.length * 20;
    defenseScore -= weaknesses.teamWeaknesses.weaknesses.length * 10;
    defenseScore += weaknesses.teamWeaknesses.immunities.length * 15;
    defenseScore += weaknesses.teamWeaknesses.quadResistances.length * 10;
    defenseScore += weaknesses.teamWeaknesses.resistances.length * 5;
    defenseScore = Math.max(0, Math.min(100, defenseScore));
    
    // Calculate type diversity
    const uniqueTypes = new Set();
    team.forEach(p => {
        uniqueTypes.add(p.type1);
        if (p.type2) uniqueTypes.add(p.type2);
    });
    const diversityPercentage = Math.round((uniqueTypes.size / Math.min(team.length * 2, 18)) * 100);
    
    // Overall score (weighted average)
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

function displayTeamTable(team) {
    const tableBody = document.getElementById('team-table-body');
    tableBody.innerHTML = '';
    
    team.forEach((pokemon, index) => {
        const pokemonWeaknesses = calculatePokemonWeaknesses(pokemon.type1, pokemon.type2);
        const individualScore = calculateIndividualScore(pokemonWeaknesses);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="pokemon-cell">
                <img src="${pokemon.sprite}" alt="${pokemon.name}">
                <div class="pokemon-info">
                    <span class="pokemon-name">${pokemon.name}</span>
                    <span class="pokemon-id">#${pokemon.id.toString().padStart(3, '0')}</span>
                </div>
            </td>
            <td class="types-cell">
                <div style="display: flex; flex-direction: column; gap: 8px;">
                    <span class="type-badge" style="background-color: ${typeData[pokemon.type1].color}">
                        ${typeData[pokemon.type1].name}
                    </span>
                    ${pokemon.type2 ? `
                    <span class="type-badge" style="background-color: ${typeData[pokemon.type2].color}">
                        ${typeData[pokemon.type2].name}
                    </span>
                    ` : ''}
                </div>
            </td>
            <td class="weakness-cell">
                ${pokemonWeaknesses.detailed.weaknesses.concat(pokemonWeaknesses.detailed.quadWeaknesses).map(type => `
                    <span class="type-badge small" style="background-color: ${typeData[type].color}">
                        ${typeData[type].name}
                    </span>
                `).join('')}
                ${pokemonWeaknesses.detailed.weaknesses.length + pokemonWeaknesses.detailed.quadWeaknesses.length === 0 ? 
                  '<span style="color: var(--text-secondary); font-style: italic;">None</span>' : ''}
            </td>
            <td class="resistance-cell">
                ${pokemonWeaknesses.detailed.resistances.concat(pokemonWeaknesses.detailed.quadResistances, pokemonWeaknesses.detailed.immunities).map(type => `
                    <span class="type-badge small" style="background-color: ${typeData[type].color}">
                        ${typeData[type].name}
                    </span>
                `).join('')}
                ${pokemonWeaknesses.detailed.resistances.length + pokemonWeaknesses.detailed.quadResistances.length + pokemonWeaknesses.detailed.immunities.length === 0 ? 
                  '<span style="color: var(--text-secondary); font-style: italic;">None</span>' : ''}
            </td>
            <td class="score-cell">
                <span class="individual-score ${individualScore >= 80 ? 'score-excellent' : individualScore >= 60 ? 'score-good' : individualScore >= 40 ? 'score-average' : 'score-poor'}">
                    ${individualScore}
                </span>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function displayScoreSummary(stats) {
    document.getElementById('overall-score').textContent = stats.overallScore;
    document.getElementById('coverage-score').textContent = `${stats.coveragePercentage}%`;
    document.getElementById('defense-score').textContent = `${stats.defenseScore}%`;
    document.getElementById('diversity-score').textContent = `${stats.diversityPercentage}%`;
    
    // Update progress bars
    document.getElementById('coverage-fill').style.width = `${stats.coveragePercentage}%`;
    document.getElementById('defense-fill').style.width = `${stats.defenseScore}%`;
    document.getElementById('diversity-fill').style.width = `${stats.diversityPercentage}%`;
}

function displayWeaknessSummary(weaknesses) {
    const { teamWeaknesses } = weaknesses;
    
    // Critical weaknesses (4x+)
    document.getElementById('critical-count').textContent = teamWeaknesses.quadWeaknesses.length;
    const criticalTypes = document.getElementById('critical-types');
    criticalTypes.innerHTML = teamWeaknesses.quadWeaknesses.map(type => `
        <span class="type-badge" style="background-color: ${typeData[type].color}">
            ${typeData[type].name}
        </span>
    `).join('');
    
    // Moderate weaknesses (2x)
    document.getElementById('moderate-count').textContent = teamWeaknesses.weaknesses.length;
    const moderateTypes = document.getElementById('moderate-types');
    moderateTypes.innerHTML = teamWeaknesses.weaknesses.map(type => `
        <span class="type-badge" style="background-color: ${typeData[type].color}">
            ${typeData[type].name}
        </span>
    `).join('');
    
    // Strong resistances (immunities + 0.25x + 0.5x)
    const strongCount = teamWeaknesses.immunities.length + teamWeaknesses.quadResistances.length + teamWeaknesses.resistances.length;
    document.getElementById('strong-count').textContent = strongCount;
    const strongTypes = document.getElementById('strong-types');
    strongTypes.innerHTML = [
        ...teamWeaknesses.immunities,
        ...teamWeaknesses.quadResistances,
        ...teamWeaknesses.resistances
    ].map(type => `
        <span class="type-badge" style="background-color: ${typeData[type].color}">
            ${typeData[type].name}
        </span>
    `).join('');
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}