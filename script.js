// LAST//ALIVE — FIXED MULTIPLAYER

document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // =========================
  // ELEMENTS — MATCHES HTML
  // =========================
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
  const lobbyHint = $("lobbyHint");
  const lobbyError = $("lobbyError");

  const arena = $("arena");
  const playersEl = $("players");
  const hazardsEl = $("hazards");

  const timerEl = $("timer");
  const aliveCount = $("aliveCount");
  const roundNo = $("roundNo");

  const arenaMessage = $("arenaMessage");

  const winnerTitle = $("winnerTitle");
  const winnerSub = $("winnerSub");
  const finalScores = $("finalScores");

  const rematchBtn = $("rematchBtn");
  const homeBtn = $("homeBtn");
  const leaveGame = $("leaveGame");

  // =========================
  // STATE
  // =========================
  const MAX_PLAYERS = 8;

  let peer = null;
  let isHost = false;

  let myId = "";
  let myName = "PLAYER";
  let room = "";

  let players = {};
  let connections = new Map();

  let hazards = [];

  let running = false;
  let round = 0;
  let timeLeft = 30;

  let gameTimer = null;

  const keys = {
    w: false,
    a: false,
    s: false,
    d: false
  };

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

  // =========================
  // SCREEN
  // =========================
  function show(screen) {
    [home, lobby, game, result].forEach((s) => {
      if (s) s.classList.remove("active");
    });

    if (screen) screen.classList.add("active");
  }

  function error(el, message) {
    if (el) el.textContent = message || "";
  }

  // =========================
  // ROOM CODE
  // =========================
  function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
  }

  // =========================
  // PEER CREATION
  // =========================
  function createPeer(id = undefined) {
    return new Promise((resolve, reject) => {
      let p;

      try {
        if (id) {
          p = new Peer(id, {
            debug: 1
          });
        } else {
          p = new Peer({
            debug: 1
          });
        }
      } catch (e) {
        reject(e);
        return;
      }

      let settled = false;

      p.on("open", (peerId) => {
        if (settled) return;

        settled = true;

        console.log("PEER OPEN:", peerId);

        resolve(p);
      });

      p.on("error", (err) => {
        console.error("PEER ERROR:", err);

        if (!settled) {
          settled = true;
          reject(err);
        }
      });
    });
  }

  // =========================
  // PLAYER
  // =========================
  function createPlayer(id, name, host = false) {
    return {
      id,
      name: name || "PLAYER",
      host,

      x: Math.random() * 80 + 10,
      y: Math.random() * 70 + 15,

      alive: true,
      score: 0
    };
  }

  // =========================
  // CREATE ROOM
  // =========================
  async function createRoom() {
    error(homeError, "");

    createBtn.disabled = true;
    createBtn.textContent = "CREATING...";

    try {
      isHost = true;

      room = generateRoomCode();

      console.log("Creating room:", room);

      peer = await createPeer(
        "lastalive-" + room.toLowerCase()
      );

      myId = peer.id;

      const enteredName =
        playerName.value.trim();

      myName =
        (enteredName || "HOST")
          .slice(0, 14);

      players = {};

      players[myId] =
        createPlayer(
          myId,
          myName,
          true
        );

      roomCode.textContent = room;

      setupHost();

      show(lobby);

      renderLobby();

      console.log(
        "ROOM CREATED:",
        room
      );
    } catch (e) {
      console.error(
        "CREATE ROOM ERROR:",
        e
      );

      isHost = false;
      peer = null;

      error(
        homeError,
        "Could not create room. Refresh and try again."
      );
    }

    createBtn.disabled = false;
    createBtn.innerHTML =
      'CREATE ROOM <span>→</span>';
  }

  // =========================
  // JOIN ROOM
  // =========================
  async function joinRoom() {
    error(homeError, "");

    const entered =
      joinCode.value
        .trim()
        .toUpperCase();

    if (entered.length !== 6) {
      error(
        homeError,
        "Enter a 6-character room code."
      );

      return;
    }

    joinBtn.disabled = true;
    joinBtn.textContent = "JOINING...";

    try {
      isHost = false;

      room = entered;

      console.log(
        "Joining room:",
        room
      );

      peer = await createPeer();

      myId = peer.id;

      console.log(
        "My peer ID:",
        myId
      );

      setupClient();

      const hostId =
        "lastalive-" +
        room.toLowerCase();

      console.log(
        "Connecting to:",
        hostId
      );

      const conn =
        peer.connect(
          hostId,
          {
            reliable: true
          }
        );

      await waitForConnection(conn);

      connections.set(
        conn.peer,
        conn
      );

      conn.send({
        type: "hello",
        id: myId,
        name: "PLAYER"
      });

      roomCode.textContent = room;

      show(lobby);

      lobbyHint.textContent =
        "Connected. Waiting for host...";

      console.log(
        "CONNECTED TO HOST"
      );
    } catch (e) {
      console.error(
        "JOIN ERROR:",
        e
      );

      error(
        homeError,
        "Room not found or host is offline."
      );

      if (peer) {
        try {
          peer.destroy();
        } catch (_) {}
      }

      peer = null;
    }

    joinBtn.disabled = false;
    joinBtn.textContent = "JOIN";
  }

  // =========================
  // HOST SETUP
  // =========================
  function setupHost() {
    if (!peer) return;

    peer.on(
      "connection",
      (conn) => {
        console.log(
          "INCOMING PLAYER:",
          conn.peer
        );

        if (
          Object.keys(players).length >=
          MAX_PLAYERS
        ) {
          conn.on("open", () => {
            conn.send({
              type: "full"
            });

            conn.close();
          });

          return;
        }

        connections.set(
          conn.peer,
          conn
        );

        conn.on("open", () => {
          console.log(
            "PLAYER CONNECTION OPEN:",
            conn.peer
          );
        });

        conn.on("data", (data) => {
          receiveData(
            data,
            conn
          );
        });

        conn.on("close", () => {
          console.log(
            "PLAYER LEFT:",
            conn.peer
          );

          delete players[
            conn.peer
          ];

          connections.delete(
            conn.peer
          );

          broadcastState();

          renderLobby();
        });

        conn.on("error", (err) => {
          console.error(
            "PLAYER CONNECTION ERROR:",
            err
          );
        });
      }
    );

    peer.on("error", (err) => {
      console.error(
        "HOST PEER ERROR:",
        err
      );
    });
  }

  // =========================
  // CLIENT SETUP
  // =========================
  function setupClient() {
    peer.on("error", (err) => {
      console.error(
        "CLIENT PEER ERROR:",
        err
      );
    });

    peer.on("disconnected", () => {
      console.warn(
        "Disconnected from PeerJS server"
      );
    });
  }

  // =========================
  // WAIT CONNECTION
  // =========================
  function waitForConnection(conn) {
    return new Promise(
      (resolve, reject) => {
        if (conn.open) {
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
          }, 10000);

        conn.on("open", () => {
          clearTimeout(timeout);
          resolve();
        });

        conn.on("error", (err) => {
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
    conn
  ) {
    if (
      !data ||
      !data.type
    ) {
      return;
    }

    console.log(
      "RECEIVED:",
      data.type
    );

    // PLAYER JOINED
    if (
      data.type === "hello" &&
      isHost
    ) {
      if (
        Object.keys(players).length >=
        MAX_PLAYERS
      ) {
        conn.send({
          type: "full"
        });

        return;
      }

      const player =
        createPlayer(
          conn.peer,
          data.name ||
            "PLAYER",
          false
        );

      players[conn.peer] =
        player;

      console.log(
        "PLAYER ADDED:",
        player
      );

      conn.send({
        type: "state",
        players,
        code: room
      });

      broadcastState();

      renderLobby();

      lobbyHint.textContent =
        "Player joined. Ready!";
    }

    // STATE
    if (
      data.type === "state" &&
      !isHost
    ) {
      players =
        data.players || {};

      room =
        data.code || room;

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
    }

    // NAME
    if (
      data.type === "name" &&
      isHost
    ) {
      if (
        players[conn.peer]
      ) {
        players[
          conn.peer
        ].name =
          data.name;
      }

      broadcastState();

      renderLobby();
    }

    // START
    if (
      data.type === "start" &&
      !isHost
    ) {
      players =
        data.players || {};

      hazards =
        data.hazards || [];

      round =
        data.round || 1;

      startRound(false);
    }

    // MOVEMENT
    if (
      data.type === "input" &&
      isHost
    ) {
      const p =
        players[data.id];

      if (
        !p ||
        !p.alive
      ) {
        return;
      }

      p.x =
        Math.max(
          3,
          Math.min(
            97,
            p.x + data.dx
          )
        );

      p.y =
        Math.max(
          5,
          Math.min(
            95,
            p.y + data.dy
          )
        );

      checkHazard(p);

      broadcastState();

      renderGame();
    }

    // RESULT
    if (
      data.type === "result" &&
      !isHost
    ) {
      players =
        data.players || {};

      endRound();
    }

    // REMATCH
    if (
      data.type === "rematch" &&
      isHost
    ) {
      round++;

      startRound(true);
    }

    // ROOM FULL
    if (
      data.type === "full"
    ) {
      alert(
        "This room is full."
      );
    }
  }

  // =========================
  // BROADCAST
  // =========================
  function broadcast(data) {
    connections.forEach(
      (conn) => {
        if (
          conn &&
          conn.open
        ) {
          try {
            conn.send(data);
          } catch (e) {
            console.error(e);
          }
        }
      }
    );
  }

  function broadcastState() {
    broadcast({
      type: "state",
      players,
      code: room
    });
  }

  // =========================
  // NAME
  // =========================
  setName.addEventListener(
    "click",
    () => {
      const n =
        (
          playerName.value.trim() ||
          "PLAYER"
        ).slice(0, 14);

      myName = n;

      if (players[myId]) {
        players[myId].name =
          n;
      }

      if (isHost) {
        broadcastState();
        renderLobby();
      } else {
        broadcast({
          type: "name",
          name: n
        });
      }
    }
  );

  // =========================
  // BUTTONS
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
          .replace(
            /[^A-Z0-9]/g,
            ""
          )
          .slice(0, 6);
    }
  );

  // =========================
  // COPY
  // =========================
  copyCode.addEventListener(
    "click",
    async () => {
      try {
        await navigator.clipboard.writeText(
          room
        );

        copyCode.textContent =
          "COPIED";

        setTimeout(() => {
          copyCode.textContent =
            "COPY";
        }, 1200);
      } catch (e) {
        prompt(
          "Copy this room code:",
          room
        );
      }
    }
  );

  // =========================
  // START GAME
  // =========================
  startBtn.addEventListener(
    "click",
    () => {
      if (!isHost) return;

      if (
        Object.keys(players)
          .length < 2
      ) {
        return;
      }

      round++;

      startRound(true);
    }
  );

  // =========================
  // START ROUND
  // =========================
  function startRound(
    hostStarting
  ) {
    if (
      isHost &&
      hostStarting
    ) {
      Object.values(
        players
      ).forEach((p) => {
        p.alive = true;
        p.x =
          Math.random() *
            80 +
          10;
        p.y =
          Math.random() *
            70 +
          15;
      });

      hazards =
        createHazards();

      timeLeft = 30;

      broadcast({
        type: "start",
        players,
        round,
        hazards
      });
    }

    running = true;

    show(game);

    roundNo.textContent =
      String(round).padStart(
        2,
        "0"
      );

    if (
      isHost &&
      hostStarting
    ) {
      runHostLoop();
    }

    renderGame();
  }

  // =========================
  // HAZARDS
  // =========================
  function createHazards() {
    const list = [];

    for (
      let i = 0;
      i < 8;
      i++
    ) {
      list.push({
        type:
          i % 3 === 0
            ? "pit"
            : i % 3 === 1
            ? "wall"
            : "bomb",

        x:
          Math.random() *
            88 +
          6,

        y:
          Math.random() *
            84 +
          8,

        r:
          i % 3 === 0
            ? 5
            : 3
      });
    }

    return list;
  }

  // =========================
  // HOST GAME LOOP
  // =========================
  function runHostLoop() {
    clearInterval(
      gameTimer
    );

    timeLeft = 30;

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

        // MOVE BOMBS
        hazards.forEach(
          (h, i) => {
            if (
              h.type ===
              "bomb"
            ) {
              h.x +=
                Math.sin(
                  Date.now() /
                    500 +
                    i
                ) *
                0.18;

              h.y +=
                Math.cos(
                  Date.now() /
                    650 +
                    i
                ) *
                0.15;
            }
          }
        );

        Object.values(
          players
        ).forEach(
          checkHazard
        );

        const alive =
          Object.values(
            players
          ).filter(
            (p) =>
              p.alive
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
  // HAZARD CHECK
  // =========================
  function checkHazard(p) {
    if (!p.alive) return;

    for (
      const h of hazards
    ) {
      const dx =
        p.x - h.x;

      const dy =
        p.y - h.y;

      const distance =
        Math.sqrt(
          dx * dx +
            dy * dy
        );

      if (
        distance <
        h.r + 1.8
      ) {
        p.alive = false;

        break;
      }
    }
  }

  // =========================
  // FINISH HOST
  // =========================
  function finishHost() {
    if (!running) return;

    running = false;

    clearInterval(
      gameTimer
    );

    const alive =
      Object.values(
        players
      ).filter(
        (p) =>
          p.alive
      );

    alive.forEach(
      (p) => {
        p.score += 500;
      }
    );

    broadcast({
      type: "result",
      players
    });

    endRound();
  }

  // =========================
  // END ROUND
  // =========================
  function endRound() {
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

    if (
      sorted.length
    ) {
      winnerTitle.textContent =
        sorted[0].name.toUpperCase() +
        " WINS";

      winnerSub.textContent =
        sorted[0].alive
          ? "They survived the arena."
          : "Highest score takes it.";
    }

    finalScores.innerHTML =
      sorted
        .map(
          (p, i) => `
          <div class="score">
            <span>
              ${i + 1}.
              ${escapeHTML(
                p.name
              )}
            </span>
            <b>
              ${p.score}
            </b>
          </div>
        `
        )
        .join("");

    show(result);
  }

  // =========================
  // GAME RENDER
  // =========================
  function renderGame() {
    playersEl.innerHTML =
      Object.values(
        players
      )
        .map(
          (p) => `
          <div
            class="player-dot
              ${p.id === myId ? "me" : ""}
              ${p.alive ? "" : "dead"}"
            style="
              left:${p.x}%;
              top:${p.y}%;
            "
            title="${escapeHTML(
              p.name
            )}"
          ></div>
        `
        )
        .join("");

    hazardsEl.innerHTML =
      hazards
        .map(
          (h) => `
          <div
            class="hazard ${h.type}"
            style="
              left:${h.x}%;
              top:${h.y}%;
            "
          ></div>
        `
        )
        .join("");

    aliveCount.textContent =
      Object.values(
        players
      ).filter(
        (p) =>
          p.alive
      ).length;

    roundNo.textContent =
      String(round).padStart(
        2,
        "0"
      );

    timerEl.textContent =
      Math.max(
        0,
        timeLeft
      ).toFixed(1);
  }

  // =========================
  // MOVEMENT
  // =========================
  document.addEventListener(
    "keydown",
    (e) => {
      const k =
        e.key.toLowerCase();

      if (
        Object.prototype.hasOwnProperty.call(
          keys,
          k
        )
      ) {
        keys[k] = true;
        e.preventDefault();
      }
    }
  );

  document.addEventListener(
    "keyup",
    (e) => {
      const k =
        e.key.toLowerCase();

      if (
        Object.prototype.hasOwnProperty.call(
          keys,
          k
        )
      ) {
        keys[k] = false;
      }
    }
  );

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

    const me =
      players[myId];

    if (!me || !me.alive) {
      return;
    }

    if (isHost) {
      me.x =
        Math.max(
          3,
          Math.min(
            97,
            me.x +
              dx *
                speed
          )
        );

      me.y =
        Math.max(
          5,
          Math.min(
            95,
            me.y +
              dy *
                speed
          )
        );

      checkHazard(me);

      renderGame();
    } else {
      const conn =
        connections.values()
          .next().value;

      if (
        conn &&
        conn.open
      ) {
        conn.send({
          type: "input",
          id: myId,
          dx:
            dx * speed,
          dy:
            dy * speed
        });
      }
    }
  }, 45);

  // =========================
  // REMATCH
  // =========================
  rematchBtn.addEventListener(
    "click",
    () => {
      if (isHost) {
        round++;

        startRound(true);
      } else {
        broadcast({
          type: "rematch"
        });

        rematchBtn.disabled =
          true;

        rematchBtn.textContent =
          "WAITING FOR HOST...";
      }
    }
  );

  // =========================
  // LEAVE
  // =========================
  leaveGame.addEventListener(
    "click",
    () => {
      location.reload();
    }
  );

  homeBtn.addEventListener(
    "click",
    () => {
      location.reload();
    }
  );

  // =========================
  // ESCAPE HTML
  // =========================
  function escapeHTML(str) {
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[m])
    );
  }

  // =========================
  // INITIAL
  // =========================
  renderLobby();

  console.log(
    "LAST//ALIVE multiplayer loaded."
  );
});
