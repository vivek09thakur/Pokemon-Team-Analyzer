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
let searchTimeouts = {};

// Better Sprite APIs (choose one or fallback chain)
const spriteAPIs = [
    // Official Pokémon Showdown Sprites (HD)
    (id) => `https://play.pokemonshowdown.com/sprites/xyani/${pokemon.name}.gif`,
    
    // Pokémon Home-style Sprites
    (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
    
    // Pokémon Dream World Art
    (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${id}.svg`,
    
    // 8-bit Pixel Sprites (retro)
    (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`,
    
    // 3D Models (Gen 8 style)
    (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
    
    // Default fallback
    (id) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
];

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeTeam();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculateAnalysis);
    document.getElementById('reset-btn').addEventListener('click', resetTeam);
    document.getElementById('team-size').addEventListener('change', changeTeamSize);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            calculateAnalysis();
        }
    });
}

function initializeTeam() {
    const teamSize = parseInt(document.getElementById('team-size').value);
    const teamContainer = document.getElementById('team-container');
    teamContainer.innerHTML = '';
    
    for (let i = 0; i < teamSize; i++) {
        const entry = document.createElement('div');
        entry.className = 'team-slot';
        entry.setAttribute('data-slot-index', i);
        
        entry.innerHTML = `
            <div class="team-slot-header">
                <span class="team-slot-title">Slot ${i + 1}</span>
                <span class="team-slot-status">Empty</span>
            </div>
            
            <div class="search-container">
                <input type="text" 
                       class="search-input"
                       id="name-${i}" 
                       placeholder="Search Pokémon..."
                       autocomplete="off">
                <div class="search-results hidden" id="search-results-${i}"></div>
            </div>
            
            <div class="type-selection">
                <select class="select-field" 
                        id="type1-${i}">
                    ${getTypeOptions('')}
                </select>
                <select class="select-field" 
                        id="type2-${i}">
                    <option value="">None</option>
                    ${getTypeOptions('')}
                </select>
            </div>
            
            <div class="type-badges" id="type-badges-${i}"></div>
        `;
        
        teamContainer.appendChild(entry);
        
        // Add event listeners
        const nameInput = document.getElementById(`name-${i}`);
        const type1Select = document.getElementById(`type1-${i}`);
        const type2Select = document.getElementById(`type2-${i}`);
        
        nameInput.addEventListener('input', () => handlePokemonInput(i));
        nameInput.addEventListener('focus', () => handlePokemonInput(i));
        type1Select.addEventListener('change', () => updateTypeBadges(i));
        type2Select.addEventListener('change', () => updateTypeBadges(i));
    }
}

function getTypeOptions(selectedType) {
    let options = '<option value="">Type</option>';
    for (const typeKey in typeData) {
        const type = typeData[typeKey];
        const selected = selectedType === typeKey ? 'selected' : '';
        options += `<option value="${typeKey}" ${selected}>${type.name}</option>`;
    }
    return options;
}

async function handlePokemonInput(index) {
    const input = document.getElementById(`name-${index}`);
    const searchTerm = input.value.trim().toLowerCase();
    const resultsContainer = document.getElementById(`search-results-${index}`);
    
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    // Clear previous timeout
    if (searchTimeouts[index]) {
        clearTimeout(searchTimeouts[index]);
    }
    
    // Debounce search
    searchTimeouts[index] = setTimeout(async () => {
        try {
            // Show loading
            resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">Searching...</div>';
            resultsContainer.classList.remove('hidden');
            
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=1000`);
            const data = await response.json();
            
            const filteredResults = data.results.filter(pokemon => 
                pokemon.name.toLowerCase().includes(searchTerm)
            ).slice(0, 8);
            
            await displaySearchResults(index, filteredResults);
            
        } catch (error) {
            resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--error);">Error loading results</div>';
        }
    }, 300);
}

async function displaySearchResults(index, results) {
    const resultsContainer = document.getElementById(`search-results-${index}`);
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div style="padding: 10px; color: var(--text-secondary);">No Pokémon found</div>';
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
                    <h4>${capitalizeFirstLetter(data.name)} #${data.id}</h4>
                    <div class="type-container">
                        ${data.types.map(t => `
                            <span class="type-badge small" style="background-color: ${typeData[t.type.name].color}">
                                ${typeData[t.type.name].name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
            resultItem.onclick = () => selectPokemonFromSearch(index, data);
            fragment.appendChild(resultItem);
        } catch (error) {
            console.error('Error fetching sprite:', error);
        }
    }
    
    resultsContainer.innerHTML = '';
    resultsContainer.appendChild(fragment);
    resultsContainer.classList.remove('hidden');
    
    // Close on outside click
    setTimeout(() => {
        const closeResults = (e) => {
            if (!resultsContainer.contains(e.target) && !document.getElementById(`name-${index}`).contains(e.target)) {
                resultsContainer.classList.add('hidden');
                document.removeEventListener('click', closeResults);
            }
        };
        document.addEventListener('click', closeResults);
    }, 100);
}

// Function to get the best available sprite
function getBestSprite(id, name) {
    // Try different sprite sources in order of preference
    const spriteSources = [
        // Official artwork (highest quality)
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
        // Home sprites
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`,
        // Dream World art
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/dream-world/${id}.svg`,
        // Default sprite
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
        // Fallback to Pokémon Showdown
        `https://play.pokemonshowdown.com/sprites/ani/${name}.gif`
    ];
    
    // Return first source (they'll fail gracefully if not available)
    return spriteSources[0];
}

async function selectPokemonFromSearch(index, pokemonData) {
    document.getElementById(`search-results-${index}`).classList.add('hidden');
    pokemonDataStore.set(index, pokemonData);
    updatePokemonUI(index, pokemonData);
}

function updatePokemonUI(index, pokemonData) {
    const nameInput = document.getElementById(`name-${index}`);
    const slotStatus = nameInput.parentElement.parentElement.querySelector('.team-slot-status');
    const slotTitle = nameInput.parentElement.parentElement.querySelector('.team-slot-title');
    const types = pokemonData.types.map(t => t.type.name);
    
    nameInput.value = capitalizeFirstLetter(pokemonData.name);
    slotTitle.textContent = `${capitalizeFirstLetter(pokemonData.name)} #${pokemonData.id}`;
    slotStatus.textContent = '✓ Filled';
    slotStatus.style.color = 'var(--success)';
    
    document.getElementById(`type1-${index}`).value = types[0] || '';
    document.getElementById(`type2-${index}`).value = types[1] || '';
    updateTypeBadges(index);
}

function updateTypeBadges(index) {
    const type1 = document.getElementById(`type1-${index}`).value;
    const type2 = document.getElementById(`type2-${index}`).value;
    const badgesContainer = document.getElementById(`type-badges-${index}`);
    const slotStatus = document.querySelector(`#name-${index}`).parentElement.parentElement.querySelector('.team-slot-status');
    
    badgesContainer.innerHTML = '';
    
    if (type1 || type2) {
        slotStatus.textContent = type1 ? '✓ Filled' : 'Types Set';
        slotStatus.style.color = 'var(--success)';
    } else {
        slotStatus.textContent = 'Empty';
        slotStatus.style.color = 'var(--text-secondary)';
    }
    
    if (type1) {
        badgesContainer.appendChild(createTypeBadge(type1));
    }
    
    if (type2) {
        badgesContainer.appendChild(createTypeBadge(type2));
    }
}

function createTypeBadge(type) {
    const badge = document.createElement('span');
    badge.className = 'type-badge';
    badge.style.backgroundColor = typeData[type].color;
    badge.textContent = typeData[type].name;
    return badge;
}

function changeTeamSize() {
    initializeTeam();
    resetResults();
}

function resetTeam() {
    if (confirm('Reset the entire team?')) {
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

function calculateAnalysis() {
    const team = [];
    const teamSize = parseInt(document.getElementById('team-size').value);
    let hasValidPokemon = false;
    
    for (let i = 0; i < teamSize; i++) {
        const name = document.getElementById(`name-${i}`).value || `Pokémon ${i+1}`;
        const type1 = document.getElementById(`type1-${i}`).value;
        
        if (type1) {
            hasValidPokemon = true;
            const type2 = document.getElementById(`type2-${i}`).value || '';
            team.push({ name, type1, type2 });
        }
    }
    
    if (!hasValidPokemon) {
        alert('Please select types for at least one Pokémon!');
        return;
    }
    
    const calculateBtn = document.getElementById('calculate-btn');
    const originalText = calculateBtn.innerHTML;
    calculateBtn.innerHTML = '<span class="material-icons" style="margin-right: 8px;">hourglass_empty</span>Analyzing...';
    calculateBtn.disabled = true;
    
    setTimeout(() => {
        const coverage = calculateCoverage(team);
        const weaknesses = calculateWeaknesses(team);
        displayResults(team, coverage, weaknesses);
        
        calculateBtn.innerHTML = originalText;
        calculateBtn.disabled = false;
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

function displayResults(team, coverage, weaknesses) {
    displayTeamSprites(team);
    displayDetailedAnalysis(team);
    displayWeaknesses(weaknesses);
    displaySummary(team, coverage, weaknesses);
    
    document.getElementById('results-section').classList.remove('hidden');
    
    setTimeout(() => {
        document.getElementById('results-section').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 100);
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
            <div class="pokemon-sprite-name">${pokemon.name}</div>
            <div class="pokemon-sprite-types">
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
    compositionDiv.className = 'analysis-section detailed-section';
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
        pokemonDiv.className = 'analysis-section detailed-section';
        
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
            className: 'danger'
        },
        { 
            title: 'Major Weaknesses (2×)',
            types: weaknesses.teamWeaknesses.weaknesses,
            icon: 'warning',
            className: 'warning'
        },
        { 
            title: 'Team Resistances',
            types: weaknesses.teamWeaknesses.resistances,
            icon: 'shield',
            className: 'positive'
        },
        { 
            title: 'Quadruple Resistances',
            types: weaknesses.teamWeaknesses.quadResistances,
            icon: 'health_and_safety',
            className: 'positive'
        },
        { 
            title: 'Immunities',
            types: weaknesses.teamWeaknesses.immunities,
            icon: 'block',
            className: 'positive'
        }
    ];

    categories.forEach(category => {
        if (category.types.length > 0) {
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'weakness-category';
            categoryDiv.innerHTML = `
                <div class="category-header ${category.className}">
                    <span class="material-icons">${category.icon}</span>
                    ${category.title} <span style="margin-left: 8px; font-size: 14px; opacity: 0.8;">(${category.types.length})</span>
                </div>
                <div class="category-types">
                    ${category.types.map(type => `
                        <span class="type-badge small" style="background-color: ${typeData[type].color}">
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
    
    const superEffectiveTypes = Object.values(coverage).filter(v => v >= 2).length;
    const coverageScore = (superEffectiveTypes / 18) * 40;
    
    const defenseScore = 40 - (weaknesses.teamWeaknesses.quadWeaknesses.length * 8) 
                        - (weaknesses.teamWeaknesses.weaknesses.length * 3);
    
    const uniqueTypes = new Set();
    team.forEach(p => {
        uniqueTypes.add(p.type1);
        if (p.type2) uniqueTypes.add(p.type2);
    });
    const diversityScore = (uniqueTypes.size / Math.min(team.length * 2, 18)) * 20;
    
    score = Math.max(0, Math.min(100, Math.round(coverageScore + defenseScore + diversityScore)));
    
    if (weaknesses.teamWeaknesses.immunities.length > 0) {
        score += Math.min(10, weaknesses.teamWeaknesses.immunities.length * 3);
    }
    
    return Math.min(100, score);
}

function displaySummary(team, coverage, weaknesses) {
    const summaryPoints = document.getElementById('summary-points');
    summaryPoints.innerHTML = '';
    
    let superEffectiveCount = 0;
    
    for (const type in coverage) {
        if (coverage[type] >= 2) superEffectiveCount++;
    }
    
    const detailedStats = calculateDetailedStats(team);
    const balanceScore = calculateBalanceScore(team, coverage, weaknesses);
    
    const summaryItems = [
        {
            title: 'Team Size',
            value: team.length,
            icon: 'groups'
        },
        {
            title: 'Type Coverage',
            value: `${Math.round((superEffectiveCount / 18) * 100)}%`,
            icon: 'coverage'
        },
        {
            title: 'Unique Types',
            value: Object.keys(detailedStats.typeDistribution).length,
            icon: 'category'
        },
        {
            title: 'Immunities',
            value: weaknesses.teamWeaknesses.immunities.length,
            icon: 'shield'
        },
        {
            title: 'Critical Weak',
            value: weaknesses.teamWeaknesses.quadWeaknesses.length,
            icon: 'dangerous'
        },
        {
            title: 'Resistances',
            value: weaknesses.teamWeaknesses.resistances.length + 
                   weaknesses.teamWeaknesses.quadResistances.length,
            icon: 'security'
        },
        {
            title: 'Weaknesses',
            value: weaknesses.teamWeaknesses.weaknesses.length,
            icon: 'warning'
        },
        {
            title: 'Balance Score',
            value: balanceScore,
            icon: 'balance',
            showScore: true
        }
    ];
    
    const fragment = document.createDocumentFragment();
    
    summaryItems.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-card';
        
        const scoreClass = item.showScore ? 
            (item.value >= 80 ? 'score-excellent' : 
             item.value >= 60 ? 'score-good' : 
             item.value >= 40 ? 'score-average' : 'score-poor') : '';
        
        summaryItem.innerHTML = `
            <div class="summary-icon">
                <span class="material-icons">${item.icon}</span>
            </div>
            <div class="summary-value ${scoreClass}">${item.value}${item.showScore ? '' : ''}</div>
            <div class="summary-label">${item.title}</div>
        `;
        
        fragment.appendChild(summaryItem);
    });
    
    summaryPoints.appendChild(fragment);
    
    // Add score styles
    const style = document.createElement('style');
    style.textContent = `
        .score-excellent { color: var(--success) !important; }
        .score-good { color: var(--info) !important; }
        .score-average { color: var(--warning) !important; }
        .score-poor { color: var(--error) !important; }
    `;
    document.head.appendChild(style);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}