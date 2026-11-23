// LAST//ALIVE — Multiplayer Survival Game
// PeerJS WebRTC multiplayer

document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // ELEMENTS
  // =========================

  const $ = (id) => document.getElementById(id);

  const home = $("home");
  const lobby = $("lobby");
  const game = $("game");
  const result = $("result");

  const createBtn = $("createBtn");
  const joinBtn = $("joinBtn");
  const joinCode = $("joinCode");
  const homeError = $("homeError");

  const roomCode = $("roomCode");
  const copyCode = $("copyCode");

  const playerName = $("playerName");
  const setName = $("setName");
  const playerList = $("playerList");
  const playerCount = $("playerCount");
  const startBtn = $("startBtn");
  const lobbyError = $("lobbyError");

  const playersEl = $("players");
  const hazardsEl = $("hazards");

  const timerEl = $("timer");
  const aliveCount = $("aliveCount");
  const roundNo = $("roundNo");

  const winnerTitle = $("winnerTitle");
  const winnerSub = $("winnerSub");
  const finalScores = $("finalScores");

  const rematchBtn = $("rematchBtn");
  const homeBtn = $("homeBtn");
  const leaveGame = $("leaveGame");


  // =========================
  // GAME STATE
  // =========================

  const MAX_PLAYERS = 8;

  let peer = null;
  let isHost = false;

  let myId = null;
  let myName = "PLAYER";

  let room = "";
  let round = 0;

  let players = {};
  let connections = new Map();

  let hazards = [];

  let running = false;
  let gameTimer = null;

  let timeLeft = 30;

  const keys = {
    w: false,
    a: false,
    s: false,
    d: false
  };


  // =========================
  // SCREEN CONTROL
  // =========================

  function showScreen(screen) {

    [home, lobby, game, result].forEach((screenElement) => {
      screenElement.classList.remove("active");
    });

    screen.classList.add("active");
  }


  // =========================
  // ERROR
  // =========================

  function error(element, message) {

    if (element) {
      element.textContent = message || "";
    }

  }


  // =========================
  // ROOM CODE
  // =========================

  function generateRoomCode() {

    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let result = "";

    for (let i = 0; i < 6; i++) {

      result +=
        chars[Math.floor(Math.random() * chars.length)];

    }

    return result;

  }


  // =========================
  // CREATE PEER
  // =========================

  function createPeer(id = undefined) {

    return new Promise((resolve, reject) => {

      let p;

      try {

        if (id) {
          p = new Peer(id, {
            debug: 0
          });
        } else {
          p = new Peer({
            debug: 0
          });
        }

      } catch (err) {

        reject(err);
        return;

      }


      p.on("open", (peerId) => {

        resolve({
          peer: p,
          id: peerId
        });

      });


      p.on("error", (err) => {

        reject(err);

      });

    });

  }


  // =========================
  // PLAYER OBJECT
  // =========================

  function createPlayer(
    id,
    name,
    host = false
  ) {

    return {

      id: id,

      name:
        name ||
        "PLAYER",

      host: host,

      x:
        Math.random() * 80 + 10,

      y:
        Math.random() * 70 + 15,

      alive: true,

      score: 0

    };

  }


  // =========================
  // CREATE ROOM
  // =========================

  async function createRoom() {

    error(homeError, "");

    try {

      isHost = true;

      room = generateRoomCode();

      const result = await createPeer(
        "lastalive-" + room.toLowerCase()
      );

      peer = result.peer;
      myId = result.id;

      myName =
        (playerName.value.trim() ||
          "HOST").slice(0, 14);


      players = {};

      players[myId] =
        createPlayer(
          myId,
          myName,
          true
        );


      roomCode.textContent = room;

      setupPeer();

      showScreen(lobby);

      renderLobby();

    } catch (err) {

      console.error(err);

      error(
        homeError,
        "Room create nahi hua. Internet check kar."
      );

    }

  }


  // =========================
  // JOIN ROOM
  // =========================

  async function joinRoom() {

    error(homeError, "");

    const code =
      joinCode.value
        .trim()
        .toUpperCase();


    if (code.length !== 6) {

      error(
        homeError,
        "6-character room code daal."
      );

      return;

    }


    try {

      isHost = false;

      room = code;


      const result =
        await createPeer();


      peer = result.peer;
      myId = result.id;


      setupPeer();


      const connection =
        peer.connect(
          "lastalive-" +
          code.toLowerCase(),
          {
            reliable: true
          }
        );


      await waitForConnection(connection);


      connections.set(
        connection.peer,
        connection
      );


      connection.on("data", (data) => {

        receiveData(
          data,
          connection
        );

      });


      connection.on("close", () => {

        connections.delete(
          connection.peer
        );

      });


      roomCode.textContent = room;

      showScreen(lobby);

    } catch (err) {

      console.error(err);

      error(
        homeError,
        "Room nahi mila ya host offline hai."
      );

    }

  }


  // =========================
  // SETUP PEER
  // =========================

  function setupPeer() {

    peer.on(
      "connection",
      (connection) => {

        if (!isHost) return;


        if (
          Object.keys(players).length >=
          MAX_PLAYERS
        ) {

          connection.on("open", () => {

            connection.send({
              type: "room-full"
            });

          });

          return;

        }


        connections.set(
          connection.peer,
          connection
        );


        connection.on(
          "data",
          (data) => {

            receiveData(
              data,
              connection
            );

          }
        );


        connection.on("close", () => {

          delete players[
            connection.peer
          ];

          connections.delete(
            connection.peer
          );

          broadcastState();

          renderLobby();

        });

      }
    );


    peer.on("error", (err) => {

      console.error(
        "PeerJS:",
        err
      );

    });

  }


  // =========================
  // CONNECTION WAIT
  // =========================

  function waitForConnection(connection) {

    return new Promise(
      (resolve, reject) => {

        if (connection.open) {

          resolve();

          return;

        }


        const timeout =
          setTimeout(() => {

            reject(
              new Error(
                "Connection timeout"
              )
            );

          }, 8000);


        connection.on("open", () => {

          clearTimeout(timeout);

          resolve();

        });


        connection.on("error", (err) => {

          clearTimeout(timeout);

          reject(err);

        });

      }
    );

  }


  // =========================
  // RECEIVE DATA
  // =========================

  function receiveData(
    data,
    connection
  ) {

    if (!data || !data.type) return;


    // New player joining
    if (
      data.type === "hello" &&
      isHost
    ) {

      if (
        Object.keys(players).length >=
        MAX_PLAYERS
      ) {

        connection.send({
          type: "room-full"
        });

        return;

      }


      players[connection.peer] =
        createPlayer(
          connection.peer,
          data.name ||
            "PLAYER"
        );


      connection.send({

        type: "state",

        players: players,

        room: room

      });


      broadcastState();

      renderLobby();

      return;

    }


    // State update
    if (
      data.type === "state" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      room =
        data.room ||
        room;


      roomCode.textContent =
        room;


      renderLobby();


      if (
        game.classList.contains(
          "active"
        )
      ) {

        renderGame();

      }


      return;

    }


    // Name change
    if (
      data.type === "name" &&
      isHost
    ) {

      if (
        players[
          connection.peer
        ]
      ) {

        players[
          connection.peer
        ].name =
          data.name;

      }


      broadcastState();

      renderLobby();

      return;

    }


    // Start game
    if (
      data.type === "start" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      hazards =
        data.hazards ||
        [];

      round =
        data.round ||
        1;


      startGame(false);

      return;

    }


    // Movement
    if (
      data.type === "move" &&
      isHost
    ) {

      const player =
        players[data.id];


      if (
        !player ||
        !player.alive
      ) {

        return;

      }


      player.x =
        Math.max(
          3,
          Math.min(
            97,
            player.x +
              data.dx
          )
        );


      player.y =
        Math.max(
          5,
          Math.min(
            95,
            player.y +
              data.dy
          )
        );


      checkHazards(player);


      broadcastState();

      renderGame();

      return;

    }


    // Rematch
    if (
      data.type === "rematch" &&
      isHost
    ) {

      startGame(true);

      return;

    }


    // Result
    if (
      data.type === "result" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      finishGame();

      return;

    }

  }


  // =========================
  // BROADCAST
  // =========================

  function broadcast(message) {

    connections.forEach(
      (connection) => {

        if (connection.open) {

          try {

            connection.send(
              message
            );

          } catch (err) {

            console.error(err);

          }

        }

      }
    );

  }


  function broadcastState() {

    broadcast({

      type: "state",

      players: players,

      room: room

    });

  }


  // =========================
  // NAME
  // =========================

  setName.addEventListener(
    "click",
    () => {

      const name =
        (
          playerName.value.trim() ||
          "PLAYER"
        ).slice(0, 14);


      myName = name;


      if (isHost) {

        players[myId].name =
          name;


        broadcastState();

        renderLobby();

      } else {

        broadcast({

          type: "name",

          name: name

        });

      }

    }
  );


  // =========================
  // CREATE / JOIN
  // =========================

  createBtn.addEventListener(
    "click",
    createRoom
  );


  joinBtn.addEventListener(
    "click",
    joinRoom
  );


  joinCode.addEventListener(
    "input",
    () => {

      joinCode.value =
        joinCode.value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .slice(0, 6);

    }
  );


  // =========================
  // COPY ROOM CODE
  // =========================

  copyCode.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard
          .writeText(room);


        copyCode.textContent =
          "COPIED";


        setTimeout(() => {

          copyCode.textContent =
            "COPY";

        }, 1200);

      } catch (err) {

        console.log(err);

      }

    }
  );


  // =========================
  // RENDER LOBBY
  // =========================

  function renderLobby() {

    const list =
      Object.values(players);


    playerCount.textContent =
      `${list.length} / ${MAX_PLAYERS}`;


    playerList.innerHTML =
      list
        .map(
          (player, index) => {

            return `
              <div class="player">

                <span>
                  <b style="
                    color:${getPlayerColor(index)}
                  ">●</b>

                  ${escapeHTML(
                    player.name
                  )}

                </span>

                ${
                  player.id === myId
                    ? `<span class="you">
                         YOU
                       </span>`
                    : player.host
                      ? `<span class="you">
                           HOST
                         </span>`
                      : ""
                }

              </div>
            `;

          }
        )
        .join("");


    startBtn.disabled =
      !(
        isHost &&
        list.length >= 2
      );


    const hint =
      $("lobbyHint");


    if (isHost) {

      hint.textContent =
        list.length < 2
          ? "Waiting for a friend..."
          : "Everyone ready? Start the arena.";

    } else {

      hint.textContent =
        "Waiting for the host...";

    }

  }


  // =========================
  // START BUTTON
  // =========================

  startBtn.addEventListener(
    "click",
    () => {

      if (
        !isHost ||
        Object.keys(players).length < 2
      ) {

        return;

      }


      round++;


      Object.values(players)
        .forEach((player) => {

          player.alive = true;

          player.score = 0;

          player.x =
            Math.random() *
              80 +
            10;

          player.y =
            Math.random() *
              70 +
            15;

        });


      hazards =
        createHazards();


      broadcast({

        type: "start",

        players: players,

        hazards: hazards,

        round: round

      });


      startGame(true);

    }
  );


  // =========================
  // CREATE HAZARDS
  // =========================

  function createHazards() {

    const list = [];


    for (
      let i = 0;
      i < 9;
      i++
    ) {

      const type =
        i % 3 === 0
          ? "pit"
          : i % 3 === 1
            ? "wall"
            : "bomb";


      list.push({

        type: type,

        x:
          Math.random() *
            88 +
          6,

        y:
          Math.random() *
            84 +
          8,

        r:
          type === "pit"
            ? 5
            : 3

      });

    }


    return list;

  }


  // =========================
  // START GAME
  // =========================

  function startGame(hostStart) {

    running = true;

    timeLeft = 30;


    showScreen(game);


    roundNo.textContent =
      String(round).padStart(
        2,
        "0"
      );


    timerEl.textContent =
      timeLeft.toFixed(1);


    renderGame();


    if (isHost && hostStart) {

      runHostTimer();

    }

  }


  // =========================
  // HOST TIMER
  // =========================

  function runHostTimer() {

    clearInterval(
      gameTimer
    );


    gameTimer =
      setInterval(() => {

        if (!running) {

          clearInterval(
            gameTimer
          );

          return;

        }


        timeLeft -= 0.1;


        timerEl.textContent =
          Math.max(
            0,
            timeLeft
          ).toFixed(1);


        moveHazards();


        Object.values(players)
          .forEach(
            checkHazards
          );


        const alive =
          Object.values(
            players
          ).filter(
            player =>
              player.alive
          );


        if (
          alive.length <= 1 ||
          timeLeft <= 0
        ) {

          finishHost();

          return;

        }


        broadcastState();

        renderGame();

      }, 100);

  }


  // =========================
  // MOVE HAZARDS
  // =========================

  function moveHazards() {

    const now =
      Date.now();


    hazards.forEach(
      (hazard, index) => {

        if (
          hazard.type ===
          "bomb"
        ) {

          hazard.x +=
            Math.sin(
              now / 500 +
              index
            ) * 0.12;

          hazard.y +=
            Math.cos(
              now / 650 +
              index
            ) * 0.1;

        }

      }
    );

  }


  // =========================
  // CHECK HAZARDS
  // =========================

  function checkHazards(
    player
  ) {

    if (
      !player.alive
    ) {

      return;

    }


    for (
      const hazard of hazards
    ) {

      const dx =
        player.x -
        hazard.x;


      const dy =
        player.y -
        hazard.y;


      const distance =
        Math.sqrt(
          dx * dx +
          dy * dy
        );


      if (
        distance <
        hazard.r + 1.8
      ) {

        player.alive =
          false;


        return;

      }

    }

  }


  // =========================
  // FINISH HOST
  // =========================

  function finishHost() {

    running = false;


    clearInterval(
      gameTimer
    );


    const alive =
      Object.values(
        players
      ).filter(
        player =>
          player.alive
      );


    alive.forEach(
      player => {

        player.score +=
          500;

      }
    );


    broadcast({

      type: "result",

      players: players

    });


    finishGame();

  }


  // =========================
  // FINISH GAME
  // =========================

  function finishGame() {

    running = false;


    clearInterval(
      gameTimer
    );


    const sorted =
      Object.values(
        players
      ).sort(
        (a, b) =>
          b.score -
          a.score
      );


    showScreen(result);


    if (sorted[0]) {

      winnerTitle.textContent =
        sorted[0].name
          .toUpperCase() +
        " WINS";


      winnerSub.textContent =
        sorted[0].alive
          ? "They survived the arena."
          : "Highest score wins.";

    }


    finalScores.innerHTML =
      sorted
        .map(
          (player, index) => {

            return `
              <div class="score">

                <span>
                  ${index + 1}.
                  ${escapeHTML(
                    player.name
                  )}
                </span>

                <b>
                  ${player.score}
                </b>

              </div>
            `;

          }
        )
        .join("");

  }


  // =========================
  // RENDER GAME
  // =========================

  function renderGame() {

    playersEl.innerHTML =
      Object.values(players)
        .map(
          player => {

            return `
              <div
                class="player-dot
                  ${
                    player.id === myId
                      ? "me"
                      : ""
                  }
                  ${
                    player.alive
                      ? ""
                      : "dead"
                  }"
                style="
                  left:${player.x}%;
                  top:${player.y}%;
                "
                title="${escapeHTML(
                  player.name
                )}"
              ></div>
            `;

          }
        )
        .join("");


    hazardsEl.innerHTML =
      hazards
        .map(
          hazard => {

            return `
              <div
                class="hazard ${hazard.type}"
                style="
                  left:${hazard.x}%;
                  top:${hazard.y}%;
                "
              ></div>
            `;

          }
        )
        .join("");


    aliveCount.textContent =
      Object.values(
        players
      ).filter(
        player =>
          player.alive
      ).length;

  }


  // =========================
  // KEYBOARD MOVEMENT
  // =========================

  document.addEventListener(
    "keydown",
    (event) => {

      const key =
        event.key.toLowerCase();


      if (
        keys.hasOwnProperty(key)
      ) {

        keys[key] = true;

        event.preventDefault();

      }

    }
  );


  document.addEventListener(
    "keyup",
    (event) => {

      const key =
        event.key.toLowerCase();


      if (
        keys.hasOwnProperty(key)
      ) {

        keys[key] = false;

      }

    }
  );


  // =========================
  // MOVEMENT LOOP
  // =========================

  setInterval(() => {

    if (
      !running ||
      !game.classList.contains(
        "active"
      )
    ) {

      return;

    }


    let dx = 0;
    let dy = 0;


    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;


    if (
      dx === 0 &&
      dy === 0
    ) {

      return;

    }


    const speed = 0.9;


    if (isHost) {

      const player =
        players[myId];


      if (!player) return;


      player.x =
        Math.max(
          3,
          Math.min(
            97,
            player.x +
              dx * speed
          )
        );


      player.y =
        Math.max(
          5,
          Math.min(
            95,
            player.y +
              dy * speed
          )
        );


      checkHazards(
        player
      );


      renderGame();

    } else {

      const player =
        players[myId];


      if (!player) return;


      player.x =
        Math.max(
          3,
          Math.min(
            97,
            player.x +
              dx * speed
          )
        );


      player.y =
        Math.max(
          5,
          Math.min(
            95,
            player.y +
              dy * speed
          )
        );


      const hostConnection =
        connections
          .values()
          .next()
          .value;


      if (
        hostConnection &&
        hostConnection.open
      ) {

        hostConnection.send({

          type: "move",

          id: myId,

          dx:
            dx * speed,

          dy:
            dy * speed

        });

      }


      renderGame();

    }

  }, 45);


  // =========================
  // LEAVE
  // =========================

  leaveGame.addEventListener(
    "click",
    () => {

      location.reload();

    }
  );


  // =========================
  // REMATCH
  // =========================

  rematchBtn.addEventListener(
    "click",
    () => {

      if (isHost) {

        startGame(true);

      } else {

        broadcast({

          type: "rematch"

        });


        rematchBtn.disabled =
          true;


        rematchBtn.textContent =
          "WAITING...";

      }

    }
  );


  // =========================
  // HOME
  // =========================

  homeBtn.addEventListener(
    "click",
    () => {

      location.reload();

    }
  );


  // =========================
  // HELPERS
  // =========================

  function getPlayerColor(
    index
  ) {

    const colors = [

      "#54b8ff",
      "#ff3b30",
      "#b7ff3c",
      "#ff9f1c",
      "#c084fc",
      "#22d3ee",
      "#fb7185",
      "#facc15"

    ];


    return colors[
      index %
      colors.length
    ];

  }


  function escapeHTML(
    value
  ) {

    return String(
      value
    ).replace(
      /[&<>"']/g,
      char => {

        const map = {

          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"

        };


        return map[char];

      }
    );

  }


  // =========================
  // INITIAL
  // =========================

  renderLobby();

  console.log(
    "LAST//ALIVE loaded."
  );

});
