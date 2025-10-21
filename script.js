// ===================================================================================
// SCRIPT.JS - VERSÃO FINAL COM COLUNA "SEXO"
// ===================================================================================

// --- 1. ELEMENTOS DO DOM ---
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const guessesContainer = document.getElementById('guesses-container');
const victoryOverlay = document.getElementById('victory-overlay');
const victoryText = document.getElementById('victory-text');
const victoryImage = document.getElementById('victory-image');
const playAgainButton = document.getElementById('play-again-button');
const suggestionsContainer = document.getElementById('suggestions-container');

// --- 2. ESTADO DO JOGO ---
let dailyCharacter;
let allCharacters = [];
let previousGuesses = [];

// --- 3. FUNÇÕES PRINCIPAIS DO JOGO ---

async function initGame() {
    victoryOverlay.classList.add('hidden');
    previousGuesses = [];
    guessInput.disabled = true;
    guessInput.value = '';
    guessButton.disabled = true;
    guessButton.textContent = 'Carregando...';
    document.querySelectorAll('.guess-row').forEach(row => row.remove());

    try {
        if (allCharacters.length === 0) {
            console.log("Buscando personagens na API Jikan...");
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000);
            const response = await fetch('https://api.jikan.moe/v4/manga/116778/characters', { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            allCharacters = data.data;
        }

        const randomIndex = Math.floor(Math.random() * allCharacters.length);
        const apiCharData = allCharacters[randomIndex];
        
        const charName = apiCharData.character.name.split(',').reverse().join(' ').trim();
        // Adicionamos um valor padrão para gênero caso não esteja no lore.js
        const extraLore = loreData[charName] || { species: "N/A", contract: "N/A", gender: "N/A" };
        
        // ATUALIZADO PARA USAR 'gender' E REMOVER 'kanji'
        dailyCharacter = {
            name: charName,
            imageUrl: apiCharData.character.images.jpg.image_url,
            role: apiCharData.role,
            species: extraLore.species,
            contract: extraLore.contract,
            gender: extraLore.gender
        };
        
        console.log("Personagem do dia (Enriquecido):", dailyCharacter);

        guessInput.disabled = false;
        guessButton.disabled = false;
        guessButton.textContent = 'Adivinhar';

    } catch (error) {
        console.error("Erro ao buscar dados da API:", error);
        guessButton.textContent = 'API Falhou!';
        alert("Não foi possível carregar os personagens. A API pode estar fora do ar. Tente recarregar a página em alguns minutos.");
    }
}

async function handleGuess() {
    const userGuess = guessInput.value.trim();
    if (!userGuess) return;
    
    hideSuggestions();

    if (previousGuesses.includes(userGuess.toLowerCase())) {
        alert(`Você já tentou o personagem "${userGuess}". Tente outro.`);
        return;
    }

    const guessedCharacterData = allCharacters.find(char => {
        if (!char || !char.character || typeof char.character.name !== 'string') return false;
        const fullName = char.character.name.split(',').reverse().join(' ').trim().toLowerCase();
        return fullName.includes(userGuess.toLowerCase());
    });

    if (!guessedCharacterData) {
        alert("Personagem não encontrado! Certifique-se de que o nome está correto.");
        return;
    }

    const guessedCharName = guessedCharacterData.character.name.split(',').reverse().join(' ').trim();
    
    if (previousGuesses.includes(guessedCharName.toLowerCase())) {
        alert(`Você já tentou o personagem "${guessedCharName}". Tente outro.`);
        return;
    }

    previousGuesses.push(guessedCharName.toLowerCase());

    const guessedExtraLore = loreData[guessedCharName] || { species: "N/A", contract: "N/A", gender: "N/A" };
    // ATUALIZADO PARA USAR 'gender' E REMOVER 'kanji'
    const guessedCharacter = {
        name: guessedCharName,
        imageUrl: guessedCharacterData.character.images.jpg.image_url,
        role: guessedCharacterData.role,
        species: guessedExtraLore.species,
        contract: guessedExtraLore.contract,
        gender: guessedExtraLore.gender
    };

    await displayResult(guessedCharacter);
    guessInput.value = "";
    checkGameOver(guessedCharacter.name.toLowerCase() === dailyCharacter.name.toLowerCase());
}

async function displayResult(guessedChar) {
    const row = document.createElement('div');
    row.classList.add('guess-row');

    // ATUALIZADO PARA EXIBIR 'gender' E REMOVER 'kanji'
    const cells = [
        createCell("Foto", guessedChar.imageUrl, dailyCharacter.imageUrl),
        createCell("Personagem", guessedChar.name, dailyCharacter.name),
        createCell("Espécie", guessedChar.species, dailyCharacter.species),
        createCell("Contrato", guessedChar.contract, dailyCharacter.contract),
        createCell("Função", guessedChar.role, dailyCharacter.role),
        createCell("Sexo", guessedChar.gender, dailyCharacter.gender)
    ];

    cells.forEach(cell => row.appendChild(cell));
    guessesContainer.appendChild(row);
    for (const cell of cells) {
        await sleep(300);
        cell.querySelector('.cell-inner').classList.add('is-flipped');
    }
    await sleep(600);
}

function createCell(title, guessedProperty, correctProperty) {
    const cell = document.createElement('div');
    cell.classList.add('guess-cell');
    const cellInner = document.createElement('div');
    cellInner.classList.add('cell-inner');
    const cellFront = document.createElement('div');
    cellFront.classList.add('cell-front');
    const cellBack = document.createElement('div');
    cellBack.classList.add('cell-back');
    if (title === "Foto") {
        const img = document.createElement('img');
        img.src = guessedProperty;
        img.classList.add('guess-image');
        cellBack.appendChild(img);
    } else {
        const titleElement = document.createElement('span');
        titleElement.classList.add('property-title');
        titleElement.textContent = title;
        const valueElement = document.createElement('span');
        valueElement.classList.add('property-value');
        valueElement.textContent = guessedProperty;
        cellBack.appendChild(titleElement);
        cellBack.appendChild(valueElement);
    }
    if (String(guessedProperty).toLowerCase() === String(correctProperty).toLowerCase()) {
        cellBack.classList.add('correct');
    } else {
        cellBack.classList.add('incorrect');
    }
    cellInner.appendChild(cellFront);
    cellInner.appendChild(cellBack);
    cell.appendChild(cellInner);
    return cell;
}

// --- Funções de Autocomplete e Utilitárias ---
function showSuggestions(filteredCharacters) {
    suggestionsContainer.innerHTML = '';
    const suggestionsToShow = filteredCharacters.slice(0, 5);
    suggestionsToShow.forEach(apiChar => {
        if (!apiChar.character || !apiChar.character.name || typeof apiChar.character.name !== 'string') return;
        const char = apiChar.character;
        const suggestionItem = document.createElement('div');
        suggestionItem.classList.add('suggestion-item');
        const charName = char.name.split(',').reverse().join(' ').trim();
        suggestionItem.innerHTML = `<img src="${char.images.jpg.image_url}" alt="${charName}"><span>${charName}</span>`;
        suggestionItem.addEventListener('click', () => {
            guessInput.value = charName;
            handleGuess();
        });
        suggestionsContainer.appendChild(suggestionItem);
    });
}
function hideSuggestions() {
    suggestionsContainer.innerHTML = '';
}
function checkGameOver(wasCorrect) {
    // Agora só verificamos se o jogador acertou
    if (wasCorrect) {
        showVictoryScreen(dailyCharacter);
        disableGame();
    }
    // A condição 'else if' de derrota foi removida.
    // O jogo simplesmente continua se 'wasCorrect' for falso.
}
function showVictoryScreen(character) {
    victoryText.textContent = `Você acertou! O personagem era ${character.name}.`;
    victoryImage.src = character.imageUrl;
    victoryOverlay.classList.remove('hidden');
}
function disableGame() {
    guessInput.disabled = true;
    guessButton.disabled = true;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===================================================================================
// --- 5. INICIALIZAÇÃO E EVENT LISTENERS (VERSÃO CORRIGIDA E FINAL) ---
// ===================================================================================

// Listener para quando o usuário DIGITA no campo de autocomplete
guessInput.addEventListener('input', () => {
    if (!allCharacters || allCharacters.length === 0) return;
    const inputText = guessInput.value.trim().toLowerCase();
    if (inputText.length < 2) {
        hideSuggestions();
        return;
    }
    const filtered = allCharacters.filter(char => {
        if (!char || !char.character || typeof char.character.name !== 'string') return false;
        const fullName = char.character.name.split(',').reverse().join(' ').trim().toLowerCase();
        const originalName = char.character.name.toLowerCase();
        return originalName.includes(inputText) || fullName.includes(inputText);
    });
    showSuggestions(filtered);
});

// Listener para o clique no botão de "Adivinhar"
guessButton.addEventListener('click', handleGuess);

// Listener para a tecla "Enter" no campo de input
guessInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        handleGuess();
    }
});

// Listener para o botão "Jogar Novamente" na tela de vitória
playAgainButton.addEventListener('click', initGame);

// Listener para fechar as sugestões se o usuário clicar em qualquer outro lugar da página
document.addEventListener('click', (event) => {
    // A condição verifica se o clique NÃO foi no input e NÃO foi no container de sugestões
    if (!guessInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
        hideSuggestions();
    }
});

// Inicia o jogo assim que a página é carregada
initGame();