const SUPABASE_URL = "https://ydnaqebwlhuovhlmtqfq.supabase.co";
const SUPABASE_KEY = "sb_publishable_5vKUrs9n04Ph1ObyK9rRrA__lk9qFKH";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const playerNameInput = document.getElementById("playerName");
const enterButton = document.getElementById("enterButton");
const cpuButton = document.getElementById("cpuButton");
const errorMessage = document.getElementById("errorMessage");

const startScreen = document.getElementById("startScreen");
const teamScreen = document.getElementById("teamScreen");
const lobbyScreen = document.getElementById("lobbyScreen");

const trainerName = document.getElementById("trainerName");
const lobbyTrainerName = document.getElementById("lobbyTrainerName");

const pokemonGrid = document.getElementById("pokemonGrid");
const pokemonSearch = document.getElementById("pokemonSearch");

const selectedTeam = document.getElementById("selectedTeam");
const continueButton = document.getElementById("continueButton");

const playersList = document.getElementById("playersList");

const battleScreen = document.getElementById("battleScreen");

const enemyName = document.getElementById("enemyName");
const enemyPokemonSprite = document.getElementById("enemyPokemonSprite");
const enemyHpBar = document.getElementById("enemyHpBar");

const playerBattleName = document.getElementById("playerBattleName");
const playerPokemonSprite = document.getElementById("playerPokemonSprite");
const playerHpBar = document.getElementById("playerHpBar");

const battleMessage = document.getElementById("battleMessage");
const movesBox = document.getElementById("movesBox");

let allPokemons = [];
let playerTeam = [];
let currentPlayerId = localStorage.getItem("playerId");

let currentBattle = null;
let activeBattleId = null;

enterButton.addEventListener("click", () => {
    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        errorMessage.textContent = "Digite o nome do treinador.";
        return;
    }

    if (playerName.length < 3) {
        errorMessage.textContent = "Nome muito curto.";
        return;
    }

    localStorage.setItem("playerName", playerName);

    trainerName.textContent = `Treinador: ${playerName}`;

    startScreen.classList.add("hidden");
    teamScreen.classList.remove("hidden");

    loadPokemons();
});

cpuButton.addEventListener("click", () => {

    localStorage.setItem("battleMode", "cpu");

    const playerName = playerNameInput.value.trim();

    if (!playerName) {
        errorMessage.textContent =
            "Digite o nome do treinador.";
        return;
    }

    localStorage.setItem("playerName", playerName);

    trainerName.textContent =
        `Treinador: ${playerName}`;

    startScreen.classList.add("hidden");
    teamScreen.classList.remove("hidden");

    loadPokemons();
});

async function loadPokemons() {
    pokemonGrid.innerHTML = "<p>Carregando Pokémon...</p>";

    try {
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=1025");
        const data = await response.json();

        allPokemons = data.results.map((pokemon, index) => {
            const id = index + 1;

            return {
                id,
                name: pokemon.name,
                image: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`
            };
        });

        renderPokemons(allPokemons);
    } catch (error) {
        pokemonGrid.innerHTML = "<p>Erro ao carregar Pokémon.</p>";
        console.error(error);
    }
}

function renderPokemons(pokemons) {
    pokemonGrid.innerHTML = "";

    pokemons.forEach((pokemon) => {
        const card = document.createElement("div");
        card.className = "pokemon-card";

        const isSelected = playerTeam.some(p => p.id === pokemon.id);

        if (isSelected) {
            card.classList.add("selected");
        }

        card.innerHTML = `
      <img src="${pokemon.image}" alt="${pokemon.name}" />
      <h3>${pokemon.name}</h3>
    `;

        card.addEventListener("click", () => {
            togglePokemonSelection(pokemon);
        });

        pokemonGrid.appendChild(card);
    });
}

async function togglePokemonSelection(pokemon) {
    const alreadySelected = playerTeam.some(p => p.id === pokemon.id);

    if (alreadySelected) {
        playerTeam = playerTeam.filter(p => p.id !== pokemon.id);
        updateSelectedTeam();
        renderPokemons(allPokemons);
        return;
    }

    if (playerTeam.length >= 6) {
        alert("Seu time já possui 6 Pokémon.");
        return;
    }

    const detailedPokemon = await getPokemonDetails(pokemon);

    playerTeam.push(detailedPokemon);

    updateSelectedTeam();
    renderPokemons(allPokemons);
}

function updateSelectedTeam() {
    selectedTeam.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        const slot = document.createElement("div");
        slot.className = "team-slot";

        if (playerTeam[i]) {
            slot.innerHTML = `
                <img src="${playerTeam[i].image}" title="${playerTeam[i].moves.map(move => move.name).join(", ")}" />
                `;
        }

        selectedTeam.appendChild(slot);
    }

    continueButton.disabled = playerTeam.length !== 6;

    localStorage.setItem("playerTeam", JSON.stringify(playerTeam));
}

pokemonSearch.addEventListener("input", () => {
    const searchTerm = pokemonSearch.value.toLowerCase().trim();

    const filteredPokemons = allPokemons.filter(pokemon =>
        pokemon.name.includes(searchTerm)
    );

    renderPokemons(filteredPokemons);
});

continueButton.addEventListener("click", async () => {
    const battleMode = localStorage.getItem("battleMode");

    if (battleMode === "cpu") {
        await startCpuBattle();
        return;
    }

    await enterLobby();
});

async function enterLobby() {
    const playerName = localStorage.getItem("playerName");

    const playerData = {
        name: playerName,
        status: "online",
        team: playerTeam
    };

    currentPlayerId = localStorage.getItem("playerId");

    currentPlayerId = localStorage.getItem("playerId");

    if (currentPlayerId) {
        const { data: updatedPlayer, error } = await supabaseClient
            .from("players")
            .update(playerData)
            .eq("id", currentPlayerId)
            .select()
            .maybeSingle();

        if (error) {
            console.error(error);
            alert("Erro ao atualizar jogador no lobby.");
            return;
        }

        if (!updatedPlayer) {
            localStorage.removeItem("playerId");
            currentPlayerId = null;
        }
    }

    if (!currentPlayerId) {
        const { data, error } = await supabaseClient
            .from("players")
            .insert(playerData)
            .select()
            .single();

        if (error) {
            console.error(error);
            alert("Erro ao entrar no lobby.");
            return;
        }

        currentPlayerId = data.id;
        localStorage.setItem("playerId", currentPlayerId);
    }

    teamScreen.classList.add("hidden");
    lobbyScreen.classList.remove("hidden");

    lobbyTrainerName.textContent = `Treinador: ${playerName}`;

    await loadOnlinePlayers();

    setTimeout(async () => {
        await loadOnlinePlayers();
    }, 1000);

    listenPlayersRealtime();
    listenBattleInvites();
    listenAcceptedBattles();
}

async function loadOnlinePlayers() {
    const { data, error } = await supabaseClient
        .from("players")
        .select("*")
        .eq("status", "online")
        .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        playersList.innerHTML = "<p>Erro ao carregar jogadores.</p>";
        return;
    }

    renderPlayers(data);
}

function renderPlayers(players) {
    playersList.innerHTML = "";

    console.log("Meu ID atual:", currentPlayerId);
    console.log("Players vindos do Supabase:", players);

    const otherPlayers = players.filter(player =>
        player.id !== currentPlayerId
    );

    if (otherPlayers.length === 0) {
        playersList.innerHTML = "<p>Nenhum outro treinador online ainda.</p>";
        return;
    }

    otherPlayers.forEach(player => {
        const card = document.createElement("div");
        card.className = "player-card";

        card.innerHTML = `
      <div>
        <strong>${player.name}</strong>
        <div class="player-status">● online</div>
      </div>

      <button class="challenge-button">
        Desafiar
      </button>
    `;

        card.querySelector("button").addEventListener("click", async () => {
            await sendBattleInvite(player);
        });

        playersList.appendChild(card);
    });
}

function listenPlayersRealtime() {
    supabaseClient
        .channel("players-changes")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "players"
            },
            async () => {
                await loadOnlinePlayers();
            }
        )
        .subscribe();
}

async function sendBattleInvite(targetPlayer) {
    const playerName = localStorage.getItem("playerName");

    const inviteData = {
        from_player_id: currentPlayerId,
        from_player_name: playerName,
        to_player_id: targetPlayer.id,
        status: "pending"
    };

    const { error } = await supabaseClient
        .from("battle_invites")
        .insert(inviteData);

    if (error) {
        console.error(error);
        alert("Erro ao enviar desafio.");
        return;
    }

    alert(`Desafio enviado para ${targetPlayer.name}!`);
}

function listenBattleInvites() {

    console.log("=================================");
    console.log("INICIANDO LISTENER DE CONVITES");
    console.log("Meu playerId:", currentPlayerId);
    console.log("=================================");

    supabaseClient
        .channel(`battle-invites-${currentPlayerId}`)
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "battle_invites"
            },
            (payload) => {

                console.log("=================================");
                console.log("EVENTO REALTIME RECEBIDO");
                console.log(payload);
                console.log("=================================");

                const invite = payload.new;

                console.log("to_player_id:", invite.to_player_id);
                console.log("meu currentPlayerId:", currentPlayerId);

                if (invite.to_player_id === currentPlayerId) {

                    console.log("CONVITE É PARA MIM");

                    const accepted = confirm(
                        `${invite.from_player_name} quer batalhar com você. Aceitar?`
                    );

                    if (accepted) {
                        acceptBattleInvite(invite);
                    } else {
                        refuseBattleInvite(invite);
                    }

                } else {

                    console.log("Convite NÃO é para mim");

                }
            }
        )
        .subscribe((status) => {

            console.log("=================================");
            console.log("STATUS DO CANAL:");
            console.log(status);
            console.log("=================================");

        });
}

async function acceptBattleInvite(invite) {
    const playerName = localStorage.getItem("playerName");

    const { data: challenger, error: challengerError } = await supabaseClient
        .from("players")
        .select("*")
        .eq("id", invite.from_player_id)
        .single();

    if (challengerError) {
        console.error(challengerError);
        alert("Erro ao buscar desafiante.");
        return;
    }

    const { data: currentPlayer, error: currentPlayerError } = await supabaseClient
        .from("players")
        .select("*")
        .eq("id", currentPlayerId)
        .single();

    if (currentPlayerError) {
        console.error(currentPlayerError);
        alert("Erro ao buscar seu jogador.");
        return;
    }

    const challengerSpeed = challenger.team[0].stats.speed;
    const currentPlayerSpeed = currentPlayer.team[0].stats.speed;

    const firstTurn =
        challengerSpeed >= currentPlayerSpeed
            ? challenger.id
            : currentPlayer.id;

    const battleData = {
        player1_id: challenger.id,
        player1_name: challenger.name,
        player1_team: challenger.team,

        player2_id: currentPlayer.id,
        player2_name: currentPlayer.name,
        player2_team: currentPlayer.team,

        player1_hp: calculatePokemonHp(challenger.team[0]),
        player2_hp: calculatePokemonHp(currentPlayer.team[0]),

        player1_active_index: 0,
        player2_active_index: 0,

        current_turn: firstTurn,
        status: "active"
    };

    const { data: battle, error: battleError } = await supabaseClient
        .from("battles")
        .insert(battleData)
        .select()
        .single();

    if (battleError) {
        console.error(battleError);
        alert("Erro ao criar sala de batalha.");
        return;
    }

    await supabaseClient
        .from("battle_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id);

    localStorage.setItem("battleId", battle.id);

    await openBattleScreen(battle.id);
}

async function refuseBattleInvite(invite) {
    const { error } = await supabaseClient
        .from("battle_invites")
        .update({ status: "refused" })
        .eq("id", invite.id);

    if (error) {
        console.error(error);
        alert("Erro ao recusar batalha.");
    }
}

function listenAcceptedBattles() {
    supabaseClient
        .channel("accepted-battles")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "battles"
            },
            (payload) => {
                const battle = payload.new;

                if (
                    battle.player1_id === currentPlayerId ||
                    battle.player2_id === currentPlayerId
                ) {
                    localStorage.setItem("battleId", battle.id);
                    openBattleScreen(battle.id);
                }
            }
        )
        .subscribe((status) => {
            console.log("Status canal battles:", status);
        });
}

async function openBattleScreen(battleId) {
    if (activeBattleId === battleId) {
        return;
    }

    activeBattleId = battleId;

    const { data: battle, error } = await supabaseClient
        .from("battles")
        .select("*")
        .eq("id", battleId)
        .single();

    if (error) {
        console.error(error);
        alert("Erro ao carregar batalha.");
        return;
    }

    currentBattle = battle;

    lobbyScreen.classList.add("hidden");
    teamScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    battleScreen.classList.remove("hidden");


    const isPlayer1 = battle.player1_id === currentPlayerId;

    const myName = isPlayer1 ? battle.player1_name : battle.player2_name;
    const enemyTrainerName = isPlayer1 ? battle.player2_name : battle.player1_name;

    const myTeam = isPlayer1 ? battle.player1_team : battle.player2_team;
    const enemyTeam = isPlayer1 ? battle.player2_team : battle.player1_team;

    const myIndex = isPlayer1
        ? battle.player1_active_index
        : battle.player2_active_index;

    const enemyIndex = isPlayer1
        ? battle.player2_active_index
        : battle.player1_active_index;

    const myActivePokemon = myTeam[myIndex];
    const enemyActivePokemon = enemyTeam[enemyIndex];

    renderMoveButtons(myActivePokemon.moves);
    playerBattleName.textContent = `${myName} - ${capitalize(myActivePokemon.name)}`;
    enemyName.textContent = `${enemyTrainerName} - ${capitalize(enemyActivePokemon.name)}`;

    playerPokemonSprite.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${myActivePokemon.id}.png`;
    enemyPokemonSprite.src = enemyActivePokemon.image;

    updateBattleHP(battle);

    battleMessage.textContent = `A batalha começou! ${capitalize(myActivePokemon.name)} está pronto!`;
    listenBattleRealtime(battle.id);
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function updateBattleHP(battle) {
    if (battle.mode === "cpu") {
        const myPokemon = battle.player1_team[battle.player1_active_index];
        const enemyPokemon = battle.player2_team[battle.player2_active_index];

        if (!myPokemon || !enemyPokemon) return;

        const myMaxHp = calculatePokemonHp(myPokemon);
        const enemyMaxHp = calculatePokemonHp(enemyPokemon);

        const myHpPercent = Math.max((battle.player1_hp / myMaxHp) * 100, 0);
        const enemyHpPercent = Math.max((battle.player2_hp / enemyMaxHp) * 100, 0);

        playerHpBar.style.width = `${myHpPercent}%`;
        enemyHpBar.style.width = `${enemyHpPercent}%`;

        playerHpBar.style.background = getHpColor(myHpPercent);
        enemyHpBar.style.background = getHpColor(enemyHpPercent);

        return;
    }
    const isPlayer1 = battle.player1_id === currentPlayerId;

    const myTeam = isPlayer1 ? battle.player1_team : battle.player2_team;
    const enemyTeam = isPlayer1 ? battle.player2_team : battle.player1_team;

    const myIndex = isPlayer1
        ? battle.player1_active_index
        : battle.player2_active_index;

    const enemyIndex = isPlayer1
        ? battle.player2_active_index
        : battle.player1_active_index;

    const myPokemon = myTeam[myIndex];
    const enemyPokemon = enemyTeam[enemyIndex];

    if (!myPokemon || !enemyPokemon) {
        return;
    }

    const myMaxHp = calculatePokemonHp(myPokemon);
    const enemyMaxHp = calculatePokemonHp(enemyPokemon);

    const myHp = isPlayer1 ? battle.player1_hp : battle.player2_hp;
    const enemyHp = isPlayer1 ? battle.player2_hp : battle.player1_hp;

    const myHpPercent = Math.max((myHp / myMaxHp) * 100, 0);
    const enemyHpPercent = Math.max((enemyHp / enemyMaxHp) * 100, 0);

    playerHpBar.style.width = `${myHpPercent}%`;
    enemyHpBar.style.width = `${enemyHpPercent}%`;

    playerHpBar.style.background = getHpColor(myHpPercent);
    enemyHpBar.style.background = getHpColor(enemyHpPercent);
}

function getHpColor(hp) {
    if (hp <= 20) return "#f44336";
    if (hp <= 50) return "#ff9800";
    return "#4caf50";
}

const typeChart = {

    normal: {
        rock: 0.5,
        ghost: 0,
        steel: 0.5
    },

    fire: {
        fire: 0.5,
        water: 0.5,
        grass: 2,
        ice: 2,
        bug: 2,
        rock: 0.5,
        dragon: 0.5,
        steel: 2
    },

    water: {
        fire: 2,
        water: 0.5,
        grass: 0.5,
        ground: 2,
        rock: 2,
        dragon: 0.5
    },

    electric: {
        water: 2,
        electric: 0.5,
        grass: 0.5,
        ground: 0,
        flying: 2,
        dragon: 0.5
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
        steel: 0.5
    }
};

function getTypeMultiplier(moveType, defenderTypes) {

    let multiplier = 1;

    defenderTypes.forEach(type => {

        const effectiveness =
            typeChart[moveType]?.[type];

        if (effectiveness !== undefined) {
            multiplier *= effectiveness;
        }
    });

    return multiplier;
}

async function useMove(move) {
    if (currentBattle?.mode === "cpu") {
        useMoveAgainstCpu(move);
        return;
    }

    if (!currentBattle) return;

    const isPlayer1 = currentBattle.player1_id === currentPlayerId;

    if (currentBattle.current_turn !== currentPlayerId) {
        battleMessage.textContent = "Não é seu turno.";
        return;
    }

    const hitRoll = Math.floor(Math.random() * 100) + 1;

    if (hitRoll > move.accuracy) {
        battleMessage.textContent = `${capitalizeMoveName(move.name)} errou!`;

        const nextTurn = isPlayer1
            ? currentBattle.player2_id
            : currentBattle.player1_id;

        await supabaseClient
            .from("battles")
            .update({
                current_turn: nextTurn
            })
            .eq("id", currentBattle.id);

        return;
    }

    playAttackAnimation();
    let newPlayer1Hp = currentBattle.player1_hp;
    let newPlayer2Hp = currentBattle.player2_hp;

    const myTeam = isPlayer1
        ? currentBattle.player1_team
        : currentBattle.player2_team;

    const enemyTeam = isPlayer1
        ? currentBattle.player2_team
        : currentBattle.player1_team;

    const myIndex = isPlayer1
        ? currentBattle.player1_active_index
        : currentBattle.player2_active_index;

    const enemyIndex = isPlayer1
        ? currentBattle.player2_active_index
        : currentBattle.player1_active_index;

    const myPokemon = myTeam[myIndex];
    const enemyPokemon = enemyTeam[enemyIndex];

    const typeMultiplier = getTypeMultiplier(
        move.type,
        enemyPokemon.types
    );

    const attackStat =
        move.damageClass === "physical"
            ? myPokemon.stats.attack
            : myPokemon.stats.attack;

    const defenseStat = enemyPokemon.stats.defense;

    const baseDamage = Math.floor(
        ((move.power * attackStat) / defenseStat) / 3
    );

    const randomBonus = Math.floor(Math.random() * 8);

    let damage = baseDamage + randomBonus;

    const hasStab = myPokemon.types.includes(move.type);
    const stabMultiplier = hasStab ? 1.5 : 1;

    damage = Math.floor(
        damage * typeMultiplier * stabMultiplier
    );

    const isCritical = Math.random() <= 0.1;

    if (isCritical) {
        damage = Math.floor(damage * 1.5);
    }

    if (isPlayer1) {
        newPlayer2Hp -= damage;
        if (newPlayer2Hp < 0) newPlayer2Hp = 0;
    } else {
        newPlayer1Hp -= damage;
        if (newPlayer1Hp < 0) newPlayer1Hp = 0;
    }

    const nextTurn = isPlayer1
        ? currentBattle.player2_id
        : currentBattle.player1_id;

    let newPlayer1Index =
        currentBattle.player1_active_index;

    let newPlayer2Index =
        currentBattle.player2_active_index;

    if (newPlayer1Hp <= 0) {

        newPlayer1Index++;

        if (
            newPlayer1Index <
            currentBattle.player1_team.length
        ) {

            const nextPokemon =
                currentBattle.player1_team[newPlayer1Index];

            newPlayer1Hp =
                calculatePokemonHp(nextPokemon);

            battleMessage.textContent =
                `${capitalize(nextPokemon.name)} entrou na batalha!`;
        }
    }

    if (newPlayer2Hp <= 0) {

        newPlayer2Index++;

        if (
            newPlayer2Index <
            currentBattle.player2_team.length
        ) {

            const nextPokemon =
                currentBattle.player2_team[newPlayer2Index];

            newPlayer2Hp =
                calculatePokemonHp(nextPokemon);

            battleMessage.textContent =
                `${capitalize(nextPokemon.name)} entrou na batalha!`;
        }
    }

    let criticalMessage = "";

    if (isCritical) {
        criticalMessage = " Acerto crítico!";
    }

    let effectivenessMessage = "";

    if (typeMultiplier >= 2) {
        effectivenessMessage =
            " Super efetivo!";
    }

    if (typeMultiplier > 0 && typeMultiplier < 1) {
        effectivenessMessage =
            " Não foi muito efetivo...";
    }

    if (typeMultiplier === 0) {
        effectivenessMessage =
            " Não teve efeito...";
    }

    battleMessage.textContent =
        `${capitalizeMoveName(move.name)} causou ${damage} de dano!${criticalMessage}${effectivenessMessage}`;

    const { error } = await supabaseClient
        .from("battles")
        .update({
            player1_hp: newPlayer1Hp,
            player2_hp: newPlayer2Hp,

            player1_active_index: newPlayer1Index,
            player2_active_index: newPlayer2Index,

            current_turn: nextTurn
        })
        .eq("id", currentBattle.id);

    if (error) {
        console.error(error);
    }
}

function listenBattleRealtime(battleId) {

    supabaseClient
        .channel(`battle-${battleId}`)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "battles"
            },
            (payload) => {

                const updatedBattle =
                    payload.new;

                if (updatedBattle.id !== battleId)
                    return;

                currentBattle = {
                    ...currentBattle,
                    ...updatedBattle
                };

                updateBattleHP(currentBattle);
                updateBattlePokemonDisplay(currentBattle);

                const isMyTurn =
                    updatedBattle.current_turn === currentPlayerId;

                if (isMyTurn) {

                    battleMessage.textContent =
                        "Seu turno!";

                } else {

                    battleMessage.textContent =
                        "Turno do oponente.";
                }

                const player1Lost =
                    currentBattle.player1_active_index >= currentBattle.player1_team.length;

                const player2Lost =
                    currentBattle.player2_active_index >= currentBattle.player2_team.length;

                if (player1Lost) {
                    battleMessage.textContent = `${currentBattle.player2_name} venceu!`;
                    enemyHpBar.style.width = currentBattle.player2_id === currentPlayerId ? "100%" : enemyHpBar.style.width;
                    playerHpBar.style.width = currentBattle.player1_id === currentPlayerId ? "0%" : playerHpBar.style.width;
                    disableMoveButtons();
                    setTimeout(() => {
                        finishBattleCleanup();
                    }, 3000);
                }

                if (player2Lost) {
                    battleMessage.textContent = `${currentBattle.player1_name} venceu!`;
                    enemyHpBar.style.width = currentBattle.player1_id === currentPlayerId ? "100%" : enemyHpBar.style.width;
                    playerHpBar.style.width = currentBattle.player2_id === currentPlayerId ? "0%" : playerHpBar.style.width;
                    disableMoveButtons();
                    setTimeout(() => {
                        finishBattleCleanup();
                    }, 3000);
                }
            }
        )
        .subscribe();
}

async function getPokemonDetails(pokemon) {
    const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemon.id}`);
    const data = await response.json();

    const types = data.types.map(item => item.type.name);

    const stats = {
        hp: getStat(data.stats, "hp"),
        attack: getStat(data.stats, "attack"),
        defense: getStat(data.stats, "defense"),
        speed: getStat(data.stats, "speed")
    };

    const moves = await getPokemonMoves(data.moves);

    return {
        id: pokemon.id,
        name: pokemon.name,
        image: pokemon.image,
        types,
        stats,
        moves
    };
}

function getStat(stats, statName) {
    const foundStat = stats.find(item => item.stat.name === statName);
    return foundStat ? foundStat.base_stat : 50;
}

async function getPokemonMoves(movesData) {
    const shuffledMoves = movesData.sort(() => Math.random() - 0.5);

    const selectedMoves = [];

    for (const moveItem of shuffledMoves) {
        if (selectedMoves.length >= 4) break;

        try {
            const response = await fetch(moveItem.move.url);
            const move = await response.json();

            if (
                move.power &&
                move.accuracy &&
                move.damage_class.name !== "status"
            ) {
                selectedMoves.push({
                    name: move.name,
                    power: move.power,
                    accuracy: move.accuracy,
                    type: move.type.name,
                    damageClass: move.damage_class.name
                });
            }
        } catch (error) {
            console.error("Erro ao buscar golpe:", error);
        }
    }

    return selectedMoves;
}

function renderMoveButtons(moves) {
    movesBox.innerHTML = "";

    moves.forEach(move => {
        const button = document.createElement("button");
        button.className = "move-button";
        button.textContent = capitalizeMoveName(move.name);

        button.addEventListener("click", () => {
            useMove(move);
        });

        movesBox.appendChild(button);
    });
}

function capitalizeMoveName(name) {
    return name
        .split("-")
        .map(word => capitalize(word))
        .join(" ");
}

function disableMoveButtons() {
    const buttons = movesBox.querySelectorAll("button");
    buttons.forEach(button => {
        button.disabled = true;
    });
}

function calculatePokemonHp(pokemon) {
    if (!pokemon || !pokemon.stats) {
        return 0;
    }

    return pokemon.stats.hp * 3;
}

function updateBattlePokemonDisplay(battle) {
    if (battle.mode === "cpu") {
        const myPokemon = battle.player1_team[battle.player1_active_index];
        const enemyPokemon = battle.player2_team[battle.player2_active_index];

        if (!myPokemon || !enemyPokemon) return;

        playerBattleName.textContent =
            `${battle.player1_name} - ${capitalize(myPokemon.name)}`;

        enemyName.textContent =
            `${battle.player2_name} - ${capitalize(enemyPokemon.name)}`;

        playerPokemonSprite.src =
            `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${myPokemon.id}.png`;

        enemyPokemonSprite.src = enemyPokemon.image;

        renderMoveButtons(myPokemon.moves);

        return;
    }
    const isPlayer1 = battle.player1_id === currentPlayerId;

    const myTeam = isPlayer1 ? battle.player1_team : battle.player2_team;
    const enemyTeam = isPlayer1 ? battle.player2_team : battle.player1_team;

    const myIndex = isPlayer1
        ? battle.player1_active_index
        : battle.player2_active_index;

    const enemyIndex = isPlayer1
        ? battle.player2_active_index
        : battle.player1_active_index;

    const myPokemon = myTeam[myIndex];
    const enemyPokemon = enemyTeam[enemyIndex];

    if (!myPokemon || !enemyPokemon) return;

    const myName = isPlayer1 ? battle.player1_name : battle.player2_name;
    const enemyTrainerName = isPlayer1 ? battle.player2_name : battle.player1_name;

    playerBattleName.textContent = `${myName} - ${capitalize(myPokemon.name)}`;
    enemyName.textContent = `${enemyTrainerName} - ${capitalize(enemyPokemon.name)}`;

    playerPokemonSprite.src =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${myPokemon.id}.png`;

    enemyPokemonSprite.src = enemyPokemon.image;

    renderMoveButtons(myPokemon.moves);
}

async function finishBattleCleanup() {

    if (!currentBattle) return;

    await supabaseClient
        .from("players")
        .delete()
        .in("id", [
            currentBattle.player1_id,
            currentBattle.player2_id
        ]);

    await supabaseClient
        .from("battle_invites")
        .delete()
        .or(
            `from_player_id.eq.${currentBattle.player1_id},from_player_id.eq.${currentBattle.player2_id}`
        );

    await supabaseClient
        .from("battles")
        .delete()
        .eq("id", currentBattle.id);

    localStorage.clear();

    location.reload(true);
}

window.addEventListener("beforeunload", () => {

    const playerId =
        localStorage.getItem("playerId");

    if (!playerId) return;

    const headers = {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
    };

    // Remove convites
    fetch(
        `${SUPABASE_URL}/rest/v1/battle_invites?or=(from_player_id.eq.${playerId},to_player_id.eq.${playerId})`,
        {
            method: "DELETE",
            keepalive: true,
            headers
        }
    );

    // Remove batalhas
    fetch(
        `${SUPABASE_URL}/rest/v1/battles?or=(player1_id.eq.${playerId},player2_id.eq.${playerId})`,
        {
            method: "DELETE",
            keepalive: true,
            headers
        }
    );

    // Remove player
    fetch(
        `${SUPABASE_URL}/rest/v1/players?id=eq.${playerId}`,
        {
            method: "DELETE",
            keepalive: true,
            headers
        }
    );

    localStorage.clear();
});

function playAttackAnimation() {
    playerPokemonSprite.classList.add("attack-lunge");
    enemyPokemonSprite.classList.add("damage-shake");
    battleScreen.classList.add("battle-flash");

    setTimeout(() => {
        playerPokemonSprite.classList.remove("attack-lunge");
        enemyPokemonSprite.classList.remove("damage-shake");
        battleScreen.classList.remove("battle-flash");
    }, 400);
}

async function startCpuBattle() {
    const playerName = localStorage.getItem("playerName");

    const cpuTeam = await createCpuTeam();

    const playerSpeed = playerTeam[0].stats.speed;
    const cpuSpeed = cpuTeam[0].stats.speed;

    const firstTurn =
        playerSpeed >= cpuSpeed
            ? "player"
            : "cpu";

    currentBattle = {
        id: "cpu-battle",
        mode: "cpu",

        player1_id: "player",
        player1_name: playerName,
        player1_team: playerTeam,
        player1_hp: calculatePokemonHp(playerTeam[0]),
        player1_active_index: 0,

        player2_id: "cpu",
        player2_name: "CPU",
        player2_team: cpuTeam,
        player2_hp: calculatePokemonHp(cpuTeam[0]),
        player2_active_index: 0,

        current_turn: firstTurn,
        status: "active"
    };

    teamScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    startScreen.classList.add("hidden");
    battleScreen.classList.remove("hidden");

    activeBattleId = "cpu-battle";

    openLocalBattleScreen();

    if (currentBattle.current_turn === "cpu") {
        setTimeout(cpuTurn, 1200);
    }
}

async function createCpuTeam() {
    const shuffled = [...allPokemons].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, 6);

    const cpuTeam = [];

    for (const pokemon of selected) {
        const detailedPokemon = await getPokemonDetails(pokemon);
        cpuTeam.push(detailedPokemon);
    }

    return cpuTeam;
}

function useMoveAgainstCpu(move) {
    if (!currentBattle) return;

    if (currentBattle.current_turn !== "player") {
        battleMessage.textContent = "Não é seu turno.";
        return;
    }

    executeLocalAttack("player", move);

    if (currentBattle.status === "finished") return;

    currentBattle.current_turn = "cpu";

    setTimeout(() => {
        openLocalBattleScreen();
        setTimeout(cpuTurn, 900);
    }, 900);
}

function cpuTurn() {
    if (!currentBattle || currentBattle.status === "finished") return;

    const cpuPokemon =
        currentBattle.player2_team[currentBattle.player2_active_index];

    const randomMove =
        cpuPokemon.moves[Math.floor(Math.random() * cpuPokemon.moves.length)];

    executeLocalAttack("cpu", randomMove);

    if (currentBattle.status === "finished") return;

    currentBattle.current_turn = "player";

    setTimeout(() => {
        openLocalBattleScreen();
    }, 900);
}

function executeLocalAttack(attacker, move) {
    const isPlayer = attacker === "player";

    const myTeam = isPlayer
        ? currentBattle.player1_team
        : currentBattle.player2_team;

    const enemyTeam = isPlayer
        ? currentBattle.player2_team
        : currentBattle.player1_team;

    const myIndex = isPlayer
        ? currentBattle.player1_active_index
        : currentBattle.player2_active_index;

    const enemyIndex = isPlayer
        ? currentBattle.player2_active_index
        : currentBattle.player1_active_index;

    const myPokemon = myTeam[myIndex];
    const enemyPokemon = enemyTeam[enemyIndex];

    const hitRoll = Math.floor(Math.random() * 100) + 1;

    if (hitRoll > move.accuracy) {
        battleMessage.textContent =
            `${capitalize(myPokemon.name)} usou ${capitalizeMoveName(move.name)}, mas errou!`;
        return;
    }

    playAttackAnimation();

    const typeMultiplier = getTypeMultiplier(move.type, enemyPokemon.types);

    const attackStat = myPokemon.stats.attack;
    const defenseStat = enemyPokemon.stats.defense;

    let damage = Math.floor(
        ((move.power * attackStat) / defenseStat) / 3
    );

    damage += Math.floor(Math.random() * 8);

    const hasStab = myPokemon.types.includes(move.type);
    const stabMultiplier = hasStab ? 1.5 : 1;

    damage = Math.floor(damage * typeMultiplier * stabMultiplier);

    const isCritical = Math.random() <= 0.1;

    if (isCritical) {
        damage = Math.floor(damage * 1.5);
    }

    if (isPlayer) {
        currentBattle.player2_hp -= damage;
        if (currentBattle.player2_hp < 0) currentBattle.player2_hp = 0;
    } else {
        currentBattle.player1_hp -= damage;
        if (currentBattle.player1_hp < 0) currentBattle.player1_hp = 0;
    }

    let message =
        `${capitalize(myPokemon.name)} usou ${capitalizeMoveName(move.name)} e causou ${damage} de dano!`;

    if (isCritical) message += " Acerto crítico!";
    if (typeMultiplier >= 2) message += " Super efetivo!";
    if (typeMultiplier > 0 && typeMultiplier < 1) message += " Não foi muito efetivo...";
    if (typeMultiplier === 0) message += " Não teve efeito...";

    battleMessage.textContent = message;

    handleLocalKo();
    updateBattleHP(currentBattle);
    updateBattlePokemonDisplay(currentBattle);
}

function openLocalBattleScreen() {

    const myPokemon =
        currentBattle.player1_team[
        currentBattle.player1_active_index
        ];

    const enemyPokemon =
        currentBattle.player2_team[
        currentBattle.player2_active_index
        ];

    playerBattleName.textContent =
        `${currentBattle.player1_name} - ${capitalize(myPokemon.name)}`;

    enemyName.textContent =
        `${currentBattle.player2_name} - ${capitalize(enemyPokemon.name)}`;

    playerPokemonSprite.src =
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${myPokemon.id}.png`;

    enemyPokemonSprite.src =
        enemyPokemon.image;

    renderMoveButtons(myPokemon.moves);

    updateBattleHP(currentBattle);

    battleMessage.textContent =
        currentBattle.current_turn === "player"
            ? "Seu turno!"
            : "Turno da CPU.";
}

function handleLocalKo() {
    if (currentBattle.player1_hp <= 0) {
        currentBattle.player1_active_index++;

        if (currentBattle.player1_active_index >= currentBattle.player1_team.length) {
            currentBattle.status = "finished";
            battleMessage.textContent = "CPU venceu!";
            disableMoveButtons();

            setTimeout(() => {
                resetGame();
            }, 3500);

            return;
        }

        const nextPokemon =
            currentBattle.player1_team[currentBattle.player1_active_index];

        currentBattle.player1_hp = calculatePokemonHp(nextPokemon);
    }

    if (currentBattle.player2_hp <= 0) {
        currentBattle.player2_active_index++;

        if (currentBattle.player2_active_index >= currentBattle.player2_team.length) {
            currentBattle.status = "finished";
            battleMessage.textContent =
                `${currentBattle.player1_name} venceu!`;

            disableMoveButtons();

            setTimeout(() => {
                resetGame();
            }, 3500);

            return;
        }

        const nextPokemon =
            currentBattle.player2_team[currentBattle.player2_active_index];

        currentBattle.player2_hp = calculatePokemonHp(nextPokemon);
    }
}

function resetGame() {

    currentBattle = null;
    activeBattleId = null;

    playerTeam = [];

    localStorage.clear();

    battleScreen.classList.add("hidden");
    lobbyScreen.classList.add("hidden");
    teamScreen.classList.add("hidden");

    startScreen.classList.remove("hidden");

    battleMessage.textContent = "A batalha começou!";

    movesBox.innerHTML = "";

    playersList.innerHTML = "";

    selectedTeam.innerHTML = "";

    continueButton.disabled = true;
}