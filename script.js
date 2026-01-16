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
    }
}

// Function to get the best available sprite
function getBestSprite(id, name) {
    // Try different sprite sources
    const spriteSources = [
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        `https://play.pokemonshowdown.com/sprites/ani/${name}.gif`
    ];
    
    return spriteSources[0];
}

function changeTeamSize() {
    initializeTeam();
    resetResults();
    pokemonDataStore.clear();
}

function resetTeam() {
    if (confirm('Reset the entire team? This will remove all Pokémon.')) {
        initializeTeam();
        resetResults();
        pokemonDataStore.clear();
    }
}

function resetResults() {
    document.getElementById('results-section').classList.add('hidden');
    document.getElementById('team-sprites').innerHTML = '';
    document.getElementById('coverage-body').innerHTML = '';
    document.getElementById('weakness-body').innerHTML = '';
    document.getElementById('summary-points').innerHTML = '';
}

// ===========================================
// ANALYSIS FUNCTIONS - THESE WERE MISSING!
// ===========================================

function calculateAnalysis() {
    const team = [];
    const teamSize = parseInt(document.getElementById('team-size').value);
    let hasValidPokemon = false;
    
    for (let i = 0; i < teamSize; i++) {
        if (pokemonDataStore.has(i)) {
            hasValidPokemon = true;
            const pokemonData = pokemonDataStore.get(i);
            const types = pokemonData.types.map(t => t.type.name);
            team.push({ 
                name: capitalizeFirstLetter(pokemonData.name), 
                type1: types[0], 
                type2: types[1] || ''
            });
        }
    }
    
    if (!hasValidPokemon) {
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
        displayResults(team, coverage, weaknesses);
        
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

function calculateDetailedStats(team) {
    const stats = {
        typeDistribution: {},
        typeCombinations: [],
        totalTypes: 0
    };

    team.forEach(pokemon => {
        stats.typeDistribution[pokemon.type1] = (stats.typeDistribution[pokemon.type1] || 0) + 1;
        stats.totalTypes++;
        
        if (pokemon.type2) {
            stats.typeDistribution[pokemon.type2] = (stats.typeDistribution[pokemon.type2] || 0) + 1;
            stats.totalTypes++;
        }
        
        const combo = pokemon.type2 ? `${pokemon.type1}/${pokemon.type2}` : pokemon.type1;
        if (!stats.typeCombinations.includes(combo)) {
            stats.typeCombinations.push(combo);
        }
    });

    return stats;
}

function displayResults(team, coverage, weaknesses) {
    displayTeamSprites(team);
    displayDetailedAnalysis(team);
    displayWeaknesses(weaknesses);
    displaySummary(team, coverage, weaknesses);
    
    document.getElementById('results-section').classList.remove('hidden');
}

function displayTeamSprites(team) {
    const spritesContainer = document.getElementById('team-sprites');
    spritesContainer.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    team.forEach((pokemon, index) => {
        const pokemonData = pokemonDataStore.get(index);
        const spriteDiv = document.createElement('div');
        spriteDiv.className = 'pokemon-sprite';
        
        const spriteUrl = pokemonData ? getBestSprite(pokemonData.id, pokemonData.name) : 
                         `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png`;
        
        spriteDiv.innerHTML = `
            <img src="${spriteUrl}" 
                 alt="${pokemon.name}"
                 loading="lazy"
                 onerror="this.onerror=null; this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'">
            <div class="pokemon-name">${pokemon.name}</div>
            <div class="pokemon-types">
                ${pokemon.type1 ? `<span class="type-badge small" style="background-color: ${typeData[pokemon.type1].color}">
                    ${typeData[pokemon.type1].name}
                </span>` : ''}
                ${pokemon.type2 ? `<span class="type-badge small" style="background-color: ${typeData[pokemon.type2].color}">
                    ${typeData[pokemon.type2].name}
                </span>` : ''}
            </div>
        `;
        
        fragment.appendChild(spriteDiv);
    });
    
    spritesContainer.appendChild(fragment);
}

function displayDetailedAnalysis(team) {
    const stats = calculateDetailedStats(team);
    const analysisBody = document.getElementById('coverage-body');
    analysisBody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    // Team composition analysis
    const compositionDiv = document.createElement('div');
    compositionDiv.className = 'analysis-section';
    compositionDiv.innerHTML = `
        <div class="section-subtitle">
            <span class="material-icons">pie_chart</span>
            Team Composition
        </div>
        <div class="detailed-content">
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${team.length}</div>
                    <div class="stat-label">Pokémon</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.typeCombinations.length}</div>
                    <div class="stat-label">Unique Combos</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${Object.keys(stats.typeDistribution).length}</div>
                    <div class="stat-label">Unique Types</div>
                </div>
            </div>
            
            <div class="type-distribution">
                <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 10px;">Type Distribution</div>
                ${Object.entries(stats.typeDistribution)
                    .sort((a, b) => b[1] - a[1])
                    .map(([type, count]) => `
                    <div class="distribution-item">
                        <span class="type-badge small" style="background-color: ${typeData[type].color}">
                            ${typeData[type].name}
                        </span>
                        <span class="distribution-count">${count}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    fragment.appendChild(compositionDiv);

    // Individual Pokémon analysis
    team.forEach((pokemon, index) => {
        const pokemonWeaknesses = calculatePokemonWeaknesses(pokemon.type1, pokemon.type2);
        const pokemonDiv = document.createElement('div');
        pokemonDiv.className = 'analysis-section';
        
        pokemonDiv.innerHTML = `
            <div class="section-subtitle">
                <span class="material-icons">catching_pokemon</span>
                ${pokemon.name}
                <span class="pokemon-types">
                    ${pokemon.type1 ? `<span class="type-badge small" style="background-color: ${typeData[pokemon.type1].color}">
                        ${typeData[pokemon.type1].name}
                    </span>` : ''}
                    ${pokemon.type2 ? `<span class="type-badge small" style="background-color: ${typeData[pokemon.type2].color}">
                        ${typeData[pokemon.type2].name}
                    </span>` : ''}
                </span>
            </div>
            <div class="detailed-content">
                <div class="defensive-stats">
                    <div class="defense-category ${pokemonWeaknesses.detailed.immunities.length > 0 ? 'positive' : ''}">
                        <span class="category-label">Immunities</span>
                        <div class="type-list">
                            ${pokemonWeaknesses.detailed.immunities.map(type => `
                                <span class="type-badge small" style="background-color: ${typeData[type].color}">
                                    ${typeData[type].name}
                                </span>
                            `).join('')}
                            ${pokemonWeaknesses.detailed.immunities.length === 0 ? '<span class="no-data">None</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="defense-category ${pokemonWeaknesses.detailed.quadResistances.length > 0 ? 'positive' : ''}">
                        <span class="category-label">4× Resist</span>
                        <div class="type-list">
                            ${pokemonWeaknesses.detailed.quadResistances.map(type => `
                                <span class="type-badge small" style="background-color: ${typeData[type].color}">
                                    ${typeData[type].name}
                                </span>
                            `).join('')}
                            ${pokemonWeaknesses.detailed.quadResistances.length === 0 ? '<span class="no-data">None</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="defense-category ${pokemonWeaknesses.detailed.resistances.length > 0 ? 'positive' : ''}">
                        <span class="category-label">Resistances</span>
                        <div class="type-list">
                            ${pokemonWeaknesses.detailed.resistances.map(type => `
                                <span class="type-badge small" style="background-color: ${typeData[type].color}">
                                    ${typeData[type].name}
                                </span>
                            `).join('')}
                            ${pokemonWeaknesses.detailed.resistances.length === 0 ? '<span class="no-data">None</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="defense-category ${pokemonWeaknesses.detailed.weaknesses.length > 0 ? 'warning' : ''}">
                        <span class="category-label">Weaknesses</span>
                        <div class="type-list">
                            ${pokemonWeaknesses.detailed.weaknesses.map(type => `
                                <span class="type-badge small" style="background-color: ${typeData[type].color}">
                                    ${typeData[type].name}
                                </span>
                            `).join('')}
                            ${pokemonWeaknesses.detailed.weaknesses.length === 0 ? '<span class="no-data">None</span>' : ''}
                        </div>
                    </div>
                    
                    <div class="defense-category ${pokemonWeaknesses.detailed.quadWeaknesses.length > 0 ? 'danger' : ''}">
                        <span class="category-label">4× Weak</span>
                        <div class="type-list">
                            ${pokemonWeaknesses.detailed.quadWeaknesses.map(type => `
                                <span class="type-badge small" style="background-color: ${typeData[type].color}">
                                    ${typeData[type].name}
                                </span>
                            `).join('')}
                            ${pokemonWeaknesses.detailed.quadWeaknesses.length === 0 ? '<span class="no-data">None</span>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;
        fragment.appendChild(pokemonDiv);
    });
    
    analysisBody.appendChild(fragment);
}

function displayWeaknesses(weaknesses) {
    const weaknessBody = document.getElementById('weakness-body');
    weaknessBody.innerHTML = '';
    
    const fragment = document.createDocumentFragment();
    
    const categories = [
        { 
            title: 'Critical Weaknesses (4×+)',
            types: weaknesses.teamWeaknesses.quadWeaknesses,
            icon: 'dangerous',
            className: 'danger',
            description: 'Types that deal 4× or more damage to your entire team'
        },
        { 
            title: 'Major Weaknesses (2×)',
            types: weaknesses.teamWeaknesses.weaknesses,
            icon: 'warning',
            className: 'warning',
            description: 'Types that deal 2× damage to your entire team'
        },
        { 
            title: 'Team Resistances',
            types: weaknesses.teamWeaknesses.resistances,
            icon: 'shield',
            className: 'positive',
            description: 'Types your team resists (0.5× damage)'
        },
        { 
            title: 'Quadruple Resistances',
            types: weaknesses.teamWeaknesses.quadResistances,
            icon: 'health_and_safety',
            className: 'positive',
            description: 'Types your team strongly resists (0.25× damage)'
        },
        { 
            title: 'Immunities',
            types: weaknesses.teamWeaknesses.immunities,
            icon: 'block',
            className: 'positive',
            description: 'Types that deal no damage to your team'
        }
    ];

    categories.forEach(category => {
        if (category.types.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'weakness-category';
            categoryDiv.innerHTML = `
                <div class="category-header ${category.className}" title="${category.description}">
                    <span class="material-icons">${category.icon}</span>
                    ${category.title} <span class="count-badge">${category.types.length}</span>
                </div>
                <div class="category-types">
                    ${category.types.map(type => `
                        <span class="type-badge small" style="background-color: ${typeData[type].color}" title="${typeData[type].name}">
                            ${typeData[type].name}
                        </span>
                    `).join('')}
                </div>
            `;
            fragment.appendChild(categoryDiv);
        }
    });

    if (fragment.children.length === 0) {
        const item = document.createElement('div');
        item.className = 'analysis-item';
        item.innerHTML = '<span class="no-data">No significant weaknesses or resistances found!</span>';
        fragment.appendChild(item);
    }
    
    weaknessBody.appendChild(fragment);
}

function calculateBalanceScore(team, coverage, weaknesses) {
    let score = 0;
    
    // Coverage score (0-40 points)
    const superEffectiveTypes = Object.values(coverage).filter(v => v >= 2).length;
    const coverageScore = (superEffectiveTypes / 18) * 40;
    
    // Defense score (0-40 points)
    const defenseScore = 40 - (weaknesses.teamWeaknesses.quadWeaknesses.length * 8) 
                        - (weaknesses.teamWeaknesses.weaknesses.length * 3);
    
    // Type diversity score (0-20 points)
    const uniqueTypes = new Set();
    team.forEach(p => {
        uniqueTypes.add(p.type1);
        if (p.type2) uniqueTypes.add(p.type2);
    });
    const diversityScore = (uniqueTypes.size / Math.min(team.length * 2, 18)) * 20;
    
    score = Math.max(0, Math.min(100, Math.round(coverageScore + defenseScore + diversityScore)));
    
    // Add bonus for immunities
    if (weaknesses.teamWeaknesses.immunities.length > 0) {
        score += Math.min(10, weaknesses.teamWeaknesses.immunities.length * 3);
    }
    
    return Math.min(100, score);
}

function displaySummary(team, coverage, weaknesses) {
    const summaryPoints = document.getElementById('summary-points');
    summaryPoints.innerHTML = '';
    
    let superEffectiveCount = 0;
    let resistedCount = 0;
    
    for (const type in coverage) {
        if (coverage[type] >= 2) superEffectiveCount++;
        if (coverage[type] <= 0.5) resistedCount++;
    }
    
    const detailedStats = calculateDetailedStats(team);
    const balanceScore = calculateBalanceScore(team, coverage, weaknesses);
    
    const summaryItems = [
        {
            title: 'Team Size',
            value: team.length,
            icon: 'groups',
            description: 'Number of Pokémon in team'
        },
        {
            title: 'Type Coverage',
            value: `${Math.round((superEffectiveCount / 18) * 100)}%`,
            icon: 'coverage',
            description: 'Percentage of types your team hits super-effectively'
        },
        {
            title: 'Unique Types',
            value: Object.keys(detailedStats.typeDistribution).length,
            icon: 'category',
            description: 'Number of unique types in team'
        },
        {
            title: 'Immunities',
            value: weaknesses.teamWeaknesses.immunities.length,
            icon: 'shield',
            description: 'Types that deal no damage to your team'
        },
        {
            title: 'Critical Weak',
            value: weaknesses.teamWeaknesses.quadWeaknesses.length,
            icon: 'dangerous',
            description: 'Types that deal 4×+ damage to entire team'
        },
        {
            title: 'Resistances',
            value: weaknesses.teamWeaknesses.resistances.length + 
                   weaknesses.teamWeaknesses.quadResistances.length,
            icon: 'security',
            description: 'Types your team resists (0.5× or 0.25×)'
        },
        {
            title: 'Weaknesses',
            value: weaknesses.teamWeaknesses.weaknesses.length,
            icon: 'warning',
            description: 'Types that deal 2× damage to entire team'
        },
        {
            title: 'Balance Score',
            value: balanceScore,
            icon: 'balance',
            description: 'Overall team balance (0-100)',
            showScore: true
        }
    ];
    
    const fragment = document.createDocumentFragment();
    
    summaryItems.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-card';
        summaryItem.setAttribute('title', item.description);
        
        const scoreClass = item.showScore ? 
            (item.value >= 80 ? 'score-excellent' : 
             item.value >= 60 ? 'score-good' : 
             item.value >= 40 ? 'score-average' : 'score-poor') : '';
        
        summaryItem.innerHTML = `
            <div class="summary-icon">
                <span class="material-icons">${item.icon}</span>
            </div>
            <div class="summary-value ${scoreClass}">${item.value}${item.showScore ? '/100' : ''}</div>
            <div class="summary-label">${item.title}</div>
        `;
        
        fragment.appendChild(summaryItem);
    });
    
    summaryPoints.appendChild(fragment);
    
    // Add score color styles
    const style = document.createElement('style');
    style.textContent = `
        .score-excellent { color: var(--success) !important; }
        .score-good { color: var(--info) !important; }
        .score-average { color: var(--warning) !important; }
        .score-poor { color: var(--error) !important; }
        .count-badge {
            background: var(--surface-light);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 14px;
            margin-left: 8px;
        }
        .analysis-section {
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border-color);
        }
        .analysis-section:last-child {
            border-bottom: none;
        }
        .section-subtitle {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 15px;
        }
        .detailed-content {
            background: var(--surface-light);
            border-radius: 12px;
            padding: 15px;
            border: 1px solid var(--border-color);
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
            gap: 10px;
            margin-bottom: 15px;
        }
        .stat-item {
            text-align: center;
            padding: 12px;
            background: var(--surface-color);
            border-radius: 8px;
            border: 1px solid var(--border-color);
        }
        .stat-value {
            font-size: 24px;
            font-weight: 700;
            color: var(--text-primary);
        }
        .stat-label {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .defensive-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
            gap: 10px;
        }
        .defense-category {
            background: var(--surface-color);
            border-radius: 8px;
            padding: 12px;
            border-left: 4px solid var(--border-color);
        }
        .defense-category.positive {
            border-left-color: var(--success);
        }
        .defense-category.warning {
            border-left-color: var(--warning);
        }
        .defense-category.danger {
            border-left-color: var(--error);
        }
        .category-label {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--text-primary);
        }
        .type-list {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            min-height: 24px;
        }
        .no-data {
            font-size: 12px;
            color: var(--text-secondary);
            font-style: italic;
        }
        .analysis-item {
            background: var(--surface-light);
            border-radius: 8px;
            padding: 15px;
            text-align: center;
            color: var(--text-secondary);
            border: 1px solid var(--border-color);
        }
    `;
    document.head.appendChild(style);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}