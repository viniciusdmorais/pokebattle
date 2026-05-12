const SUPABASE_URL = "https://ydnaqebwlhuovhlmtqfq.supabase.co";
const SUPABASE_KEY = "sb_publishable_5vKUrs9n04Ph1ObyK9rRrA__lk9qFKH";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const playerNameInput = document.getElementById("playerName");
const enterButton = document.getElementById("enterButton");
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
const attackButton = document.getElementById("attackButton");

let allPokemons = [];
let playerTeam = [];
let currentPlayerId = localStorage.getItem("playerId");

let currentBattle = null;

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

async function loadPokemons() {
    pokemonGrid.innerHTML = "<p>Carregando Pokémon...</p>";

    try {
        const response = await fetch("https://pokeapi.co/api/v2/pokemon?limit=151");
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

function togglePokemonSelection(pokemon) {
    const alreadySelected = playerTeam.some(p => p.id === pokemon.id);

    if (alreadySelected) {
        playerTeam = playerTeam.filter(p => p.id !== pokemon.id);
    } else {
        if (playerTeam.length >= 6) {
            alert("Seu time já possui 6 Pokémon.");
            return;
        }

        playerTeam.push(pokemon);
    }

    updateSelectedTeam();
    renderPokemons(allPokemons);
}

function updateSelectedTeam() {
    selectedTeam.innerHTML = "";

    for (let i = 0; i < 6; i++) {
        const slot = document.createElement("div");
        slot.className = "team-slot";

        if (playerTeam[i]) {
            slot.innerHTML = `<img src="${playerTeam[i].image}" />`;
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
    await enterLobby();
});

async function enterLobby() {
    const playerName = localStorage.getItem("playerName");

    const playerData = {
        name: playerName,
        status: "online",
        team: playerTeam
    };

    if (currentPlayerId) {
        const { error } = await supabaseClient
            .from("players")
            .update(playerData)
            .eq("id", currentPlayerId);

        if (error) {
            console.error(error);
            alert("Erro ao atualizar jogador no lobby.");
            return;
        }
    } else {
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

    const battleData = {
        player1_id: challenger.id,
        player1_name: challenger.name,
        player1_team: challenger.team,

        player2_id: currentPlayer.id,
        player2_name: currentPlayer.name,
        player2_team: currentPlayer.team,

        player1_hp: 100,
        player2_hp: 100,

        current_turn: challenger.id,
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

    const myActivePokemon = myTeam[0];
    const enemyActivePokemon = enemyTeam[0];

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
  const isPlayer1 = battle.player1_id === currentPlayerId;

  const myHp = isPlayer1 ? battle.player1_hp : battle.player2_hp;
  const enemyHp = isPlayer1 ? battle.player2_hp : battle.player1_hp;

  playerHpBar.style.width = `${myHp}%`;
  enemyHpBar.style.width = `${enemyHp}%`;

  playerHpBar.style.background = getHpColor(myHp);
  enemyHpBar.style.background = getHpColor(enemyHp);
}

function getHpColor(hp) {
  if (hp <= 20) return "#f44336";
  if (hp <= 50) return "#ff9800";
  return "#4caf50";
}

attackButton.addEventListener("click", async () => {

    if (!currentBattle) return;

    const isPlayer1 =
        currentBattle.player1_id === currentPlayerId;

    if (currentBattle.current_turn !== currentPlayerId) {

        battleMessage.textContent =
            "Não é seu turno.";

        return;
    }

    let newPlayer1Hp =
        currentBattle.player1_hp;

    let newPlayer2Hp =
        currentBattle.player2_hp;

    const damage =
        Math.floor(Math.random() * 15) + 10;

    if (isPlayer1) {

        newPlayer2Hp -= damage;

        if (newPlayer2Hp < 0) {
            newPlayer2Hp = 0;
        }

    } else {

        newPlayer1Hp -= damage;

        if (newPlayer1Hp < 0) {
            newPlayer1Hp = 0;
        }
    }

    const nextTurn =
        isPlayer1
            ? currentBattle.player2_id
            : currentBattle.player1_id;

    const { error } = await supabaseClient
        .from("battles")
        .update({
            player1_hp: newPlayer1Hp,
            player2_hp: newPlayer2Hp,
            current_turn: nextTurn
        })
        .eq("id", currentBattle.id);

    if (error) {
        console.error(error);
    }
});

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

                currentBattle =
                    updatedBattle;

                updateBattleHP(updatedBattle);

                const isMyTurn =
                    updatedBattle.current_turn === currentPlayerId;

                if (isMyTurn) {

                    battleMessage.textContent =
                        "Seu turno!";

                } else {

                    battleMessage.textContent =
                        "Turno do oponente.";
                }

                if (updatedBattle.player1_hp <= 0) {

                    battleMessage.textContent =
                        `${updatedBattle.player2_name} venceu!`;

                    attackButton.disabled = true;
                }

                if (updatedBattle.player2_hp <= 0) {

                    battleMessage.textContent =
                        `${updatedBattle.player1_name} venceu!`;

                    attackButton.disabled = true;
                }
            }
        )
        .subscribe();
}