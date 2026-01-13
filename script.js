// Pokémon type data with colors
const typeData = {
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
    fairy: { color: "#EE99AC", name: "Fairy" }
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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeTeam();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('calculate-btn').addEventListener('click', calculateAnalysis);
    document.getElementById('reset-btn').addEventListener('click', resetTeam);
    document.getElementById('team-size').addEventListener('change', changeTeamSize);
}

function initializeTeam() {
    const teamSize = parseInt(document.getElementById('team-size').value);
    const teamContainer = document.getElementById('team-container');
    teamContainer.innerHTML = '';
    
    for (let i = 0; i < teamSize; i++) {
        const entry = document.createElement('div');
        entry.className = 'team-slot';
        
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
                       oninput="handlePokemonInput(${i})"
                       autocomplete="off">
                <div class="search-results hidden" id="search-results-${i}"></div>
            </div>
            
            <div class="type-selection">
                <select class="select-field" 
                        id="type1-${i}" onchange="updateTypeBadges(${i})">
                    ${getTypeOptions('')}
                </select>
                <select class="select-field" 
                        id="type2-${i}" onchange="updateTypeBadges(${i})">
                    <option value="">None</option>
                    ${getTypeOptions('')}
                </select>
            </div>
            
            <div class="type-badges" id="type-badges-${i}"></div>
        `;
        
        teamContainer.appendChild(entry);
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

async function searchPokemon(index) {
    const nameInput = document.getElementById(`name-${index}`);
    const pokemonName = nameInput.value.trim().toLowerCase();
    
    if (!pokemonName) return;
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
        if (!response.ok) throw new Error('Pokémon not found');
        
        const pokemonData = await response.json();
        pokemonDataStore.set(index, pokemonData);
        updatePokemonUI(index, pokemonData);
        
    } catch (error) {
        console.log('Pokémon not found');
    }
}

function updatePokemonUI(index, pokemonData) {
    const nameInput = document.getElementById(`name-${index}`);
    const slotStatus = nameInput.parentElement.parentElement.querySelector('.team-slot-status');
    const slotTitle = nameInput.parentElement.parentElement.querySelector('.team-slot-title');
    const types = pokemonData.types.map(t => t.type.name);
    
    nameInput.value = capitalizeFirstLetter(pokemonData.name);
    slotTitle.textContent = capitalizeFirstLetter(pokemonData.name);
    slotStatus.textContent = 'Filled';
    
    document.getElementById(`type1-${index}`).value = types[0] || '';
    document.getElementById(`type2-${index}`).value = types[1] || '';
    updateTypeBadges(index);
}

function updateTypeBadges(index) {
    const type1 = document.getElementById(`type1-${index}`).value;
    const type2 = document.getElementById(`type2-${index}`).value;
    const badgesContainer = document.getElementById(`type-badges-${index}`);
    
    badgesContainer.innerHTML = '';
    
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

async function handlePokemonInput(index) {
    const input = document.getElementById(`name-${index}`);
    const searchTerm = input.value.trim().toLowerCase();
    const resultsContainer = document.getElementById(`search-results-${index}`);
    
    if (searchTerm.length < 2) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=900`);
        const data = await response.json();
        
        const filteredResults = data.results.filter(pokemon => 
            pokemon.name.toLowerCase().includes(searchTerm)
        ).slice(0, 5);
        
        await displaySearchResults(index, filteredResults);
        
    } catch (error) {
        console.error('Search error:', error);
    }
}

async function displaySearchResults(index, results) {
    const resultsContainer = document.getElementById(`search-results-${index}`);
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.classList.add('hidden');
        return;
    }
    
    for (const pokemon of results) {
        try {
            const response = await fetch(pokemon.url);
            const data = await response.json();
            
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${data.sprites.front_default || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'}" 
                     alt="${data.name}" 
                     class="search-result-img">
                <div class="search-result-info">
                    <h4>${capitalizeFirstLetter(data.name)}</h4>
                    <div class="type-container">
                        ${data.types.map(t => `
                            <span class="type-badge" style="background-color: ${typeData[t.type.name].color}">
                                ${typeData[t.type.name].name}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
            resultItem.onclick = () => selectPokemonFromSearch(index, data);
            resultsContainer.appendChild(resultItem);
        } catch (error) {
            console.error('Error fetching sprite:', error);
        }
    }
    
    resultsContainer.classList.remove('hidden');
}

async function selectPokemonFromSearch(index, pokemonData) {
    document.getElementById(`search-results-${index}`).classList.add('hidden');
    pokemonDataStore.set(index, pokemonData);
    updatePokemonUI(index, pokemonData);
}

function changeTeamSize() {
    initializeTeam();
    resetResults();
}

function resetTeam() {
    initializeTeam();
    resetResults();
    pokemonDataStore.clear();
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
    
    for (let i = 0; i < teamSize; i++) {
        const name = document.getElementById(`name-${i}`).value || `Pokémon ${i+1}`;
        const type1 = document.getElementById(`type1-${i}`).value;
        
        if (type1) {
            const type2 = document.getElementById(`type2-${i}`).value || '';
            team.push({ name, type1, type2 });
        }
    }
    
    if (team.length === 0) {
        alert('Please select types for at least one Pokémon!');
        return;
    }
    
    const coverage = calculateCoverage(team);
    const weaknesses = calculateWeaknesses(team);
    displayResults(team, coverage, weaknesses);
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

function calculateWeaknesses(team) {
    const weaknesses = {};
    
    for (const type in typeData) {
        weaknesses[type] = 1;
    }
    
    team.forEach(pokemon => {
        const pokemonWeaknesses = calculatePokemonWeaknesses(pokemon.type1, pokemon.type2);
        for (const type in pokemonWeaknesses) {
            weaknesses[type] *= pokemonWeaknesses[type];
        }
    });
    
    return weaknesses;
}

function calculatePokemonWeaknesses(type1, type2) {
    const weaknesses = {};
    
    for (const type in typeData) {
        weaknesses[type] = 1;
    }
    
    applyDefensiveEffectiveness(weaknesses, type1);
    if (type2) applyDefensiveEffectiveness(weaknesses, type2);
    
    return weaknesses;
}

function applyDefensiveEffectiveness(weaknesses, defendingType) {
    if (!defendingType) return;
    
    for (const attackingType in typeData) {
        let effectiveness = 1;
        if (typeChart[attackingType] && typeChart[attackingType][defendingType] !== undefined) {
            effectiveness = typeChart[attackingType][defendingType];
        }
        weaknesses[attackingType] *= effectiveness;
    }
}

function displayResults(team, coverage, weaknesses) {
    displayTeamSprites(team);
    displayCoverage(coverage);
    displayWeaknesses(weaknesses);
    displaySummary(team, coverage, weaknesses);
    
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });
}

function displayTeamSprites(team) {
    const spritesContainer = document.getElementById('team-sprites');
    spritesContainer.innerHTML = '';
    
    team.forEach((pokemon, index) => {
        const pokemonData = pokemonDataStore.get(index);
        const spriteDiv = document.createElement('div');
        spriteDiv.className = 'pokemon-sprite';
        
        spriteDiv.innerHTML = `
            <img src="${pokemonData?.sprites?.front_default || 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/0.png'}" 
                 alt="${pokemon.name}">
            <div class="pokemon-sprite-name">${pokemon.name}</div>
            <div class="pokemon-sprite-types">
                ${pokemon.type1 ? `<span class="type-badge" style="background-color: ${typeData[pokemon.type1].color}">
                    ${typeData[pokemon.type1].name}
                </span>` : ''}
                ${pokemon.type2 ? `<span class="type-badge" style="background-color: ${typeData[pokemon.type2].color}">
                    ${typeData[pokemon.type2].name}
                </span>` : ''}
            </div>
        `;
        
        spritesContainer.appendChild(spriteDiv);
    });
}

function displayCoverage(coverage) {
    const coverageBody = document.getElementById('coverage-body');
    coverageBody.innerHTML = '';
    
    const sortedCoverage = Object.entries(coverage).sort((a, b) => b[1] - a[1]);
    
    sortedCoverage.forEach(([type, effectiveness]) => {
        const item = document.createElement('div');
        item.className = 'analysis-item';
        item.innerHTML = `
            <div class="analysis-item-left">
                <div class="type-indicator" style="background-color: ${typeData[type].color}">
                    ${typeData[type].name.charAt(0)}
                </div>
                <span>${typeData[type].name}</span>
            </div>
            <div class="analysis-item-right ${getEffectivenessClass(effectiveness)}">
                ${getEffectivenessText(effectiveness)}
            </div>
        `;
        
        coverageBody.appendChild(item);
    });
}

function displayWeaknesses(weaknesses) {
    const weaknessBody = document.getElementById('weakness-body');
    weaknessBody.innerHTML = '';
    
    const sortedWeaknesses = Object.entries(weaknesses)
        .filter(([_, effectiveness]) => effectiveness >= 2)
        .sort((a, b) => b[1] - a[1]);
    
    if (sortedWeaknesses.length === 0) {
        const item = document.createElement('div');
        item.className = 'analysis-item';
        item.innerHTML = '<span class="text-secondary">No major weaknesses found!</span>';
        weaknessBody.appendChild(item);
        return;
    }
    
    sortedWeaknesses.forEach(([type, effectiveness]) => {
        const item = document.createElement('div');
        item.className = 'analysis-item';
        item.innerHTML = `
            <div class="analysis-item-left">
                <div class="type-indicator" style="background-color: ${typeData[type].color}">
                    ${typeData[type].name.charAt(0)}
                </div>
                <span>${typeData[type].name}</span>
            </div>
            <div class="analysis-item-right ${getEffectivenessClass(effectiveness)}">
                ${getEffectivenessText(effectiveness)}
            </div>
        `;
        
        weaknessBody.appendChild(item);
    });
}

function getEffectivenessClass(effectiveness) {
    if (effectiveness === 0) return 'effectiveness-0';
    if (effectiveness === 0.25 || effectiveness === 0.5) return 'effectiveness-05';
    if (effectiveness === 1) return 'effectiveness-1';
    if (effectiveness === 2) return 'effectiveness-2';
    if (effectiveness >= 4) return 'effectiveness-4';
    return '';
}

function getEffectivenessText(effectiveness) {
    if (effectiveness === 0) return 'Immune';
    if (effectiveness === 0.25) return '¼×';
    if (effectiveness === 0.5) return '½×';
    if (effectiveness === 1) return 'Normal';
    if (effectiveness === 2) return '2×';
    if (effectiveness === 4) return '4×';
    return '';
}

function displaySummary(team, coverage, weaknesses) {
    const summaryPoints = document.getElementById('summary-points');
    summaryPoints.innerHTML = '';
    
    let superEffectiveCount = 0;
    for (const type in coverage) {
        if (coverage[type] >= 2) superEffectiveCount++;
    }
    
    const biggestWeaknesses = Object.entries(weaknesses)
        .filter(([_, effectiveness]) => effectiveness >= 2);
    
    const resistantCount = Object.values(weaknesses).filter(v => v <= 0.5 && v > 0).length;
    const immuneCount = Object.values(weaknesses).filter(v => v === 0).length;
    
    const summaryItems = [
        {
            title: 'Team Size',
            value: team.length
        },
        {
            title: 'Super Effective',
            value: superEffectiveCount
        },
        {
            title: 'Resistances',
            value: resistantCount
        },
        {
            title: 'Weaknesses',
            value: biggestWeaknesses.length
        }
    ];
    
    summaryItems.forEach(item => {
        const summaryItem = document.createElement('div');
        summaryItem.className = 'summary-card';
        summaryItem.innerHTML = `
            <div class="summary-value">${item.value}</div>
            <div class="summary-label">${item.title}</div>
        `;
        
        summaryPoints.appendChild(summaryItem);
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}