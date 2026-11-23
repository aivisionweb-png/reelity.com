document.addEventListener("DOMContentLoaded", () => {
  const $ = (id) => document.getElementById(id);

  // =========================
  // ELEMENTS
  // =========================
  const homeScreen = $("home");
  const lobbyScreen = $("lobby");
  const gameScreen = $("game");
  const resultScreen = $("result");

  const createRoomBtn = $("createRoom");
  const joinRoomBtn = $("joinRoom");
  const roomInput = $("roomInput");

  const roomCodeEl = $("roomCode");
  const copyBtn = $("copyCode");

  const nameInput = $("nameInput");
  const setNameBtn = $("setName");

  const playerList = $("playerList");
  const playerCount = $("playerCount");

  const startBtn = $("startGame");
  const lobbyStatus = $("lobbyStatus");

  const roundEl = $("round");
  const timerEl = $("timer");
  const aliveEl = $("alive");
  const arena = $("arena");

  const winnerEl = $("winner");
  const finalScores = $("finalScores");

  const rematchBtn = $("rematch");
  const menuBtn = $("mainMenu");

  // =========================
  // GAME STATE
  // =========================
  const MAX_PLAYERS = 8;
  const GAME_TIME = 30;

  let peer = null;
  let isHost = false;
  let myId = "";
  let myName = "PLAYER";
  let room = "";

  let players = {};
  let connections = {};

  let hazards = [];
  let running = false;
  let timeLeft = GAME_TIME;
  let round = 0;

  let gameTimer = null;
  let moveLoop = null;

  const keys = {
    w: false,
    a: false,
    s: false,
    d: false
  };

  // =========================
  // SCREEN
  // =========================
  function showScreen(screen) {
    document.querySelectorAll(".screen").forEach((s) => {
      s.classList.remove("active");
    });

    if (screen) screen.classList.add("active");
  }

  function showError(message) {
    console.error(message);

    if (lobbyStatus) {
      lobbyStatus.textContent = message;
      lobbyStatus.style.color = "#ff4444";
    }

    alert(message);
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
  // CREATE PLAYER
  // =========================
  function createPlayer(id, name) {
    return {
      id,
      name: name || "PLAYER",
      x: 50,
      y: 50,
      alive: true,
      score: 0,
      color: getPlayerColor(id)
    };
  }

  // =========================
  // CREATE ROOM
  // =========================
  function createRoom() {
    room = generateRoomCode();
    isHost = true;

    roomCodeEl.textContent = room;

    players = {};
    connections = {};

    createPeer("lastalive-" + room.toLowerCase());
  }

  // =========================
  // JOIN ROOM
  // =========================
  function joinRoom() {
    const code = roomInput.value.trim().toUpperCase();

    if (!code || code.length !== 6) {
      alert("Enter a valid 6-character room code.");
      return;
    }

    room = code;
    isHost = false;

    roomCodeEl.textContent = room;

    createPeer();
  }

  // =========================
  // CREATE PEER
  // =========================
  function createPeer(peerId = undefined) {
    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
    }

    try {
      peer = peerId
        ? new Peer(peerId)
        : new Peer();
    } catch (err) {
      showError("PeerJS could not start.");
      return;
    }

    peer.on("open", (id) => {
      myId = id;

      console.log("Peer opened:", id);

      if (isHost) {
        players[myId] = createPlayer(myId, myName);

        renderLobby();
        showScreen(lobbyScreen);

        lobbyStatus.textContent = "Waiting for players...";
        lobbyStatus.style.color = "";

        console.log("HOST READY:", room);
      } else {
        connectToHost();
      }
    });

    peer.on("connection", (conn) => {
      console.log("Incoming connection:", conn.peer);

      if (!isHost) return;

      setupConnection(conn);
    });

    peer.on("error", (err) => {
      console.error("PEER ERROR:", err);

      if (err.type === "peer-unavailable") {
        showError("Room not found. Check the room code.");
      } else if (err.type === "unavailable-id") {
        showError("Room is already being used. Create another room.");
      } else if (err.type === "network") {
        showError("Network error. Check your internet connection.");
      } else {
        console.log("PeerJS error:", err.type);
      }
    });

    peer.on("disconnected", () => {
      console.warn("Peer disconnected.");
    });

    peer.on("close", () => {
      console.warn("Peer closed.");
    });
  }

  // =========================
  // CONNECT TO HOST
  // =========================
  function connectToHost() {
    const hostId = "lastalive-" + room.toLowerCase();

    console.log("Connecting to host:", hostId);

    const conn = peer.connect(hostId, {
      reliable: true
    });

    if (!conn) {
      showError("Could not create connection.");
      return;
    }

    setupConnection(conn);

    conn.on("open", () => {
      console.log("CONNECTED TO HOST!");

      conn.send({
        type: "hello",
        id: myId,
        name: myName
      });

      showScreen(lobbyScreen);

      lobbyStatus.textContent = "Connected. Waiting for host...";
      lobbyStatus.style.color = "";
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
      showError("Could not connect to this room.");
    });
  }

  // =========================
  // SETUP CONNECTION
  // =========================
  function setupConnection(conn) {
    if (!conn) return;

    connections[conn.peer] = conn;

    conn.on("open", () => {
      console.log("Connection OPEN:", conn.peer);

      if (isHost) {
        conn.send({
          type: "host-ready",
          room,
          players
        });
      }
    });

    conn.on("data", (data) => {
      receiveData(data, conn);
    });

    conn.on("close", () => {
      console.log("Connection closed:", conn.peer);

      if (isHost) {
        delete connections[conn.peer];

        if (players[conn.peer]) {
          delete players[conn.peer];
          broadcastState();
          renderLobby();
        }
      }
    });

    conn.on("error", (err) => {
      console.error("Connection error:", err);
    });
  }

  // =========================
  // RECEIVE DATA
  // =========================
  function receiveData(data, conn) {
    if (!data || !data.type) return;

    console.log("DATA:", data.type, data);

    // -------------------------
    // HOST RECEIVES HELLO
    // -------------------------
    if (data.type === "hello" && isHost) {
      if (Object.keys(players).length >= MAX_PLAYERS) {
        conn.send({
          type: "full"
        });

        return;
      }

      const id = data.id || conn.peer;

      players[id] = createPlayer(
        id,
        data.name || "PLAYER"
      );

      connections[id] = conn;

      conn.send({
        type: "lobby",
        players
      });

      broadcast({
        type: "lobby",
        players
      });

      renderLobby();

      lobbyStatus.textContent =
        `${Object.keys(players).length} player(s) connected`;

      console.log("PLAYER ADDED:", players[id]);
    }

    // -------------------------
    // CLIENT RECEIVES LOBBY
    // -------------------------
    if (data.type === "lobby" && !isHost) {
      players = data.players || {};

      renderLobby();

      lobbyStatus.textContent = "Waiting for host...";
    }

    // -------------------------
    // HOST READY
    // -------------------------
    if (data.type === "host-ready" && !isHost) {
      players = data.players || {};

      renderLobby();
    }

    // -------------------------
    // ROOM FULL
    // -------------------------
    if (data.type === "full") {
      showError("This room is full.");
    }

    // -------------------------
    // NAME CHANGE
    // -------------------------
    if (data.type === "name") {
      if (players[data.id]) {
        players[data.id].name = data.name;
      }

      renderLobby();
    }

    // -------------------------
    // GAME START
    // -------------------------
    if (data.type === "start") {
      players = data.players || {};
      hazards = data.hazards || [];
      round = data.round || 1;
      timeLeft = GAME_TIME;

      startGame(false);
    }

    // -------------------------
    // MOVEMENT
    // -------------------------
    if (data.type === "move" && isHost) {
      const p = players[data.id];

      if (!p || !p.alive) return;

      p.x = Math.max(
        4,
        Math.min(96, p.x + data.dx)
      );

      p.y = Math.max(
        4,
        Math.min(96, p.y + data.dy)
      );

      checkHazardForPlayer(p);
    }

    // -------------------------
    // STATE SYNC
    // -------------------------
    if (data.type === "state" && !isHost) {
      players = data.players || {};
      hazards = data.hazards || [];

      if (typeof data.timeLeft === "number") {
        timeLeft = data.timeLeft;
      }

      if (typeof data.round === "number") {
        round = data.round;
      }

      renderGame();
    }

    // -------------------------
    // RESULT
    // -------------------------
    if (data.type === "result") {
      players = data.players || {};

      running = false;

      clearInterval(gameTimer);
      cancelAnimationFrame(moveLoop);

      finishGame();
    }

    // -------------------------
    // REMATCH
    // -------------------------
    if (data.type === "rematch" && isHost) {
      startNewRound();
    }

    // -------------------------
    // HOST LEFT
    // -------------------------
    if (data.type === "host-left") {
      running = false;

      clearInterval(gameTimer);
      cancelAnimationFrame(moveLoop);

      alert("Host left the game.");

      showScreen(homeScreen);
    }
  }

  // =========================
  // BROADCAST
  // =========================
  function broadcast(data) {
    Object.values(connections).forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send(data);
        } catch (err) {
          console.error("Send error:", err);
        }
      }
    });
  }

  // =========================
  // STATE BROADCAST
  // =========================
  function broadcastState() {
    broadcast({
      type: "state",
      players,
      hazards,
      timeLeft,
      round
    });
  }

  // =========================
  // NAME
  // =========================
  function setName() {
    const name = nameInput.value.trim();

    if (!name) {
      alert("Enter your name.");
      return;
    }

    myName = name.slice(0, 16);

    if (!players[myId]) {
      players[myId] = createPlayer(myId, myName);
    } else {
      players[myId].name = myName;
    }

    if (isHost) {
      broadcast({
        type: "name",
        id: myId,
        name: myName
      });
    } else {
      const hostConn = Object.values(connections)[0];

      if (hostConn && hostConn.open) {
        hostConn.send({
          type: "name",
          id: myId,
          name: myName
        });
      }
    }

    renderLobby();
  }

  // =========================
  // LOBBY RENDER
  // =========================
  function renderLobby() {
    if (!playerList) return;

    const list = Object.values(players);

    playerCount.textContent =
      `${list.length} / ${MAX_PLAYERS}`;

    playerList.innerHTML = "";

    list.forEach((player) => {
      const row = document.createElement("div");

      row.className = "player-row";

      row.innerHTML = `
        <span class="player-dot"
          style="background:${player.color}">
        </span>

        <span class="player-name">
          ${escapeHTML(player.name)}
        </span>

        ${
          player.id === myId
            ? `<span class="you-label">YOU</span>`
            : ""
        }

        ${
          player.id === Object.keys(players)[0]
            ? `<span class="host-label">HOST</span>`
            : ""
        }
      `;

      playerList.appendChild(row);
    });

    if (startBtn) {
      startBtn.disabled =
        !isHost || list.length < 2;

      startBtn.style.opacity =
        startBtn.disabled ? "0.45" : "1";
    }
  }

  // =========================
  // START BUTTON
  // =========================
  startBtn?.addEventListener("click", () => {
    if (!isHost) return;

    const count = Object.keys(players).length;

    if (count < 2) {
      alert("At least 2 players are required.");
      return;
    }

    startNewRound();
  });

  // =========================
  // START NEW ROUND
  // =========================
  function startNewRound() {
    if (!isHost) return;

    round++;

    Object.values(players).forEach((p, index) => {
      p.alive = true;
      p.x = 15 + ((index * 12) % 70);
      p.y = 15 + ((index * 17) % 70);
    });

    createHazards();

    timeLeft = GAME_TIME;
    running = true;

    broadcast({
      type: "start",
      players,
      hazards,
      round
    });

    startGame(true);
  }

  // =========================
  // HAZARDS
  // =========================
  function createHazards() {
    hazards = [];

    for (let i = 0; i < 7; i++) {
      hazards.push({
        id: i,
        type: ["bomb", "wall", "pit"][
          Math.floor(Math.random() * 3)
        ],
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35
      });
    }
  }

  // =========================
  // START GAME
  // =========================
  function startGame(hostStart) {
    running = true;
    timeLeft = GAME_TIME;

    showScreen(gameScreen);

    renderGame();

    cancelAnimationFrame(moveLoop);

    moveLoop = requestAnimationFrame(gameLoop);

    if (hostStart) {
      clearInterval(gameTimer);

      gameTimer = setInterval(() => {
        if (!running) return;

        timeLeft -= 0.1;

        moveHazards();

        checkHazards();

        const alivePlayers =
          Object.values(players)
            .filter((p) => p.alive);

        if (
          alivePlayers.length <= 1 ||
          timeLeft <= 0
        ) {
          finishHost();
          return;
        }

        broadcastState();

        renderGame();
      }, 100);
    }
  }

  // =========================
  // HAZARD MOVEMENT
  // =========================
  function moveHazards() {
    hazards.forEach((h) => {
      h.x += h.vx;
      h.y += h.vy;

      if (h.x < 5 || h.x > 95) {
        h.vx *= -1;
      }

      if (h.y < 5 || h.y > 95) {
        h.vy *= -1;
      }
    });
  }

  // =========================
  // CHECK ALL HAZARDS
  // =========================
  function checkHazards() {
    Object.values(players).forEach((p) => {
      if (p.alive) {
        checkHazardForPlayer(p);
      }
    });
  }

  // =========================
  // CHECK PLAYER HAZARD
  // =========================
  function checkHazardForPlayer(player) {
    hazards.forEach((h) => {
      const dx = player.x - h.x;
      const dy = player.y - h.y;

      const distance = Math.sqrt(
        dx * dx + dy * dy
      );

      if (distance < 5) {
        player.alive = false;
      }
    });
  }

  // =========================
  // FINISH HOST
  // =========================
  function finishHost() {
    if (!running) return;

    running = false;

    clearInterval(gameTimer);
    cancelAnimationFrame(moveLoop);

    const alivePlayers =
      Object.values(players)
        .filter((p) => p.alive);

    alivePlayers.forEach((p) => {
      p.score += 500;
    });

    broadcast({
      type: "result",
      players
    });

    finishGame();
  }

  // =========================
  // FINISH GAME
  // =========================
  function finishGame() {
    running = false;

    clearInterval(gameTimer);
    cancelAnimationFrame(moveLoop);

    const list = Object.values(players);

    list.sort((a, b) => b.score - a.score);

    const winner =
      list.find((p) => p.alive) || list[0];

    winnerEl.textContent =
      winner
        ? `${winner.name} WINS`
        : "NO WINNER";

    finalScores.innerHTML = "";

    list.forEach((p) => {
      const row = document.createElement("div");

      row.className = "score-row";

      row.innerHTML = `
        <span>
          <span
            class="player-dot"
            style="background:${p.color}">
          </span>

          ${escapeHTML(p.name)}
        </span>

        <strong>${p.score}</strong>
      `;

      finalScores.appendChild(row);
    });

    showScreen(resultScreen);
  }

  // =========================
  // GAME LOOP
  // =========================
  function gameLoop() {
    if (!running) return;

    const me = players[myId];

    if (me && me.alive) {
      let dx = 0;
      let dy = 0;

      const speed = 0.8;

      if (keys.w) dy -= speed;
      if (keys.s) dy += speed;
      if (keys.a) dx -= speed;
      if (keys.d) dx += speed;

      if (dx !== 0 || dy !== 0) {
        if (isHost) {
          me.x = Math.max(
            4,
            Math.min(96, me.x + dx)
          );

          me.y = Math.max(
            4,
            Math.min(96, me.y + dy)
          );

          checkHazardForPlayer(me);
        } else {
          const hostConn =
            Object.values(connections)[0];

          if (hostConn && hostConn.open) {
            hostConn.send({
              type: "move",
              id: myId,
              dx,
              dy
            });
          }

          me.x = Math.max(
            4,
            Math.min(96, me.x + dx)
          );

          me.y = Math.max(
            4,
            Math.min(96, me.y + dy)
          );
        }
      }
    }

    renderGame();

    moveLoop =
      requestAnimationFrame(gameLoop);
  }

  // =========================
  // RENDER GAME
  // =========================
  function renderGame() {
    if (!arena) return;

    roundEl.textContent = round;

    timerEl.textContent =
      Math.max(0, timeLeft).toFixed(1);

    const aliveCount =
      Object.values(players)
        .filter((p) => p.alive).length;

    aliveEl.textContent = aliveCount;

    arena.innerHTML = "";

    // HAZARDS
    hazards.forEach((h) => {
      const el = document.createElement("div");

      el.className = `hazard ${h.type}`;

      el.style.left = `${h.x}%`;
      el.style.top = `${h.y}%`;

      arena.appendChild(el);
    });

    // PLAYERS
    Object.values(players).forEach((p) => {
      const el = document.createElement("div");

      el.className =
        `player ${p.alive ? "" : "dead"}`;

      el.style.left = `${p.x}%`;
      el.style.top = `${p.y}%`;

      el.style.background = p.color;

      el.title = p.name;

      arena.appendChild(el);
    });
  }

  // =========================
  // KEYBOARD
  // =========================
  window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();

    if (key === "w") keys.w = true;
    if (key === "a") keys.a = true;
    if (key === "s") keys.s = true;
    if (key === "d") keys.d = true;
  });

  window.addEventListener("keyup", (e) => {
    const key = e.key.toLowerCase();

    if (key === "w") keys.w = false;
    if (key === "a") keys.a = false;
    if (key === "s") keys.s = false;
    if (key === "d") keys.d = false;
  });

  // =========================
  // COPY ROOM
  // =========================
  copyBtn?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(room);

      copyBtn.textContent = "COPIED";

      setTimeout(() => {
        copyBtn.textContent = "COPY";
      }, 1200);
    } catch (err) {
      alert(room);
    }
  });

  // =========================
  // REMATCH
  // =========================
  rematchBtn?.addEventListener("click", () => {
    if (isHost) {
      startNewRound();
    } else {
      const hostConn =
        Object.values(connections)[0];

      if (hostConn && hostConn.open) {
        hostConn.send({
          type: "rematch"
        });

        rematchBtn.disabled = true;
        rematchBtn.textContent = "WAITING...";
      }
    }
  });

  // =========================
  // MAIN MENU
  // =========================
  menuBtn?.addEventListener("click", () => {
    running = false;

    clearInterval(gameTimer);
    cancelAnimationFrame(moveLoop);

    if (peer) {
      try {
        peer.destroy();
      } catch (e) {}
    }

    peer = null;
    players = {};
    connections = {};
    hazards = [];

    showScreen(homeScreen);
  });

  // =========================
  // CREATE / JOIN BUTTONS
  // =========================
  createRoomBtn?.addEventListener(
    "click",
    createRoom
  );

  joinRoomBtn?.addEventListener(
    "click",
    joinRoom
  );

  setNameBtn?.addEventListener(
    "click",
    setName
  );

  roomInput?.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        joinRoom();
      }
    }
  );

  nameInput?.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        setName();
      }
    }
  );

  // =========================
  // COLORS
  // =========================
  function getPlayerColor(id) {
    const colors = [
      "#4DB8FF",
      "#FF4D6D",
      "#A7FF3D",
      "#FFB84D",
      "#C77DFF",
      "#4DFFB8",
      "#FFFFFF",
      "#FF6BFF"
    ];

    let hash = 0;

    for (let i = 0; i < id.length; i++) {
      hash =
        (hash << 5) -
        hash +
        id.charCodeAt(i);

      hash |= 0;
    }

    return colors[
      Math.abs(hash) % colors.length
    ];
  }

  // =========================
  // ESCAPE HTML
  // =========================
  function escapeHTML(str) {
    return String(str)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  // =========================
  // INITIAL
  // =========================
  showScreen(homeScreen);

  console.log(
    "%c LAST//ALIVE ",
    "background:#111;color:#A7FF3D;font-size:20px;padding:8px"
  );

  console.log("Multiplayer system ready.");
});
