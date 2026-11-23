document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  // =========================
  // ELEMENTS
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
  const GAME_TIME = 30;

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

  let timeLeft = GAME_TIME;

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

  function showScreen(screen) {

    document
      .querySelectorAll(".screen")
      .forEach(s =>
        s.classList.remove("active")
      );

    screen.classList.add("active");
  }


  // =========================
  // ROOM CODE
  // =========================

  function generateRoomCode() {

    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {

      code +=
        chars[
          Math.floor(
            Math.random() *
            chars.length
          )
        ];

    }

    return code;
  }


  // =========================
  // PLAYER
  // =========================

  function createPlayer(
    id,
    name,
    host = false
  ) {

    return {

      id,

      name:
        name ||
        "PLAYER",

      host,

      x:
        Math.random() * 80 + 10,

      y:
        Math.random() * 70 + 15,

      alive: true,

      score: 0

    };

  }


  // =========================
  // CREATE PEER
  // =========================

  function createPeer(id = null) {

    return new Promise(
      (resolve, reject) => {

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

        } catch (err) {

          reject(err);

          return;

        }


        let done = false;


        p.on("open", peerId => {

          if (done) return;

          done = true;

          console.log(
            "Peer opened:",
            peerId
          );

          resolve(p);

        });


        p.on("error", err => {

          console.error(
            "Peer error:",
            err
          );

          if (!done) {

            done = true;

            reject(err);

          }

        });

      }
    );

  }


  // =========================
  // CREATE ROOM
  // =========================

  async function createRoom() {

    homeError.textContent = "";

    createBtn.disabled = true;

    createBtn.textContent =
      "CREATING...";


    try {

      isHost = true;

      room =
        generateRoomCode();


      peer =
        await createPeer(
          "lastalive-" +
          room.toLowerCase()
        );


      myId =
        peer.id;


      const enteredName =
        playerName.value.trim();


      myName =
        (
          enteredName ||
          "HOST"
        ).slice(0, 14);


      players = {};


      players[myId] =
        createPlayer(
          myId,
          myName,
          true
        );


      roomCode.textContent =
        room;


      setupHost();


      showScreen(lobby);


      renderLobby();


      lobbyHint.textContent =
        "Waiting for players...";


      console.log(
        "ROOM CREATED:",
        room
      );


    } catch (err) {

      console.error(
        "Create room failed:",
        err
      );


      isHost = false;


      homeError.textContent =
        "Could not create room. Refresh and try again.";

    }


    createBtn.disabled = false;

    createBtn.innerHTML =
      "CREATE ROOM <span>→</span>";

  }


  // =========================
  // JOIN ROOM
  // =========================

  async function joinRoom() {

    homeError.textContent = "";

    const code =
      joinCode.value
        .trim()
        .toUpperCase();


    if (code.length !== 6) {

      homeError.textContent =
        "Enter a valid 6-character room code.";

      return;

    }


    joinBtn.disabled = true;

    joinBtn.textContent =
      "JOINING...";


    try {

      isHost = false;

      room = code;


      peer =
        await createPeer();


      myId =
        peer.id;


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


      setupConnection(conn);


      conn.on("open", () => {

        console.log(
          "CONNECTED TO HOST"
        );


        conn.send({

          type: "hello",

          id: myId,

          name:
            playerName.value.trim() ||
            "PLAYER"

        });


        roomCode.textContent =
          room;


        showScreen(lobby);


        lobbyHint.textContent =
          "Connected. Waiting for host...";

      });


    } catch (err) {

      console.error(
        "Join failed:",
        err
      );


      homeError.textContent =
        "Could not join room. Check the code.";

    }


    joinBtn.disabled = false;

    joinBtn.textContent =
      "JOIN";

  }


  // =========================
  // HOST
  // =========================

  function setupHost() {

    peer.on(
      "connection",
      conn => {

        console.log(
          "Incoming connection:",
          conn.peer
        );


        if (
          Object.keys(players)
            .length >=
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


        setupConnection(conn);

      }
    );


    peer.on(
      "disconnected",
      () => {

        console.warn(
          "Host disconnected from PeerJS"
        );

      }
    );

  }


  // =========================
  // CLIENT
  // =========================

  function setupClient() {

    peer.on(
      "disconnected",
      () => {

        console.warn(
          "Client disconnected"
        );

      }
    );

  }


  // =========================
  // CONNECTION
  // =========================

  function setupConnection(conn) {

    connections.set(
      conn.peer,
      conn
    );


    conn.on(
      "data",
      data => {

        receiveData(
          data,
          conn
        );

      }
    );


    conn.on(
      "close",
      () => {

        console.log(
          "Connection closed:",
          conn.peer
        );


        connections.delete(
          conn.peer
        );


        if (isHost) {

          delete players[
            conn.peer
          ];


          broadcastState();


          renderLobby();

        }

      }
    );


    conn.on(
      "error",
      err => {

        console.error(
          "Connection error:",
          err
        );

      }
    );

  }


  // =========================
  // RECEIVE
  // =========================

  function receiveData(
    data,
    conn
  ) {

    if (
      !data ||
      !data.type
    ) return;


    console.log(
      "DATA:",
      data.type
    );


    // PLAYER JOIN
    if (
      data.type === "hello" &&
      isHost
    ) {

      if (
        Object.keys(players)
          .length >=
        MAX_PLAYERS
      ) {

        conn.send({
          type: "full"
        });

        return;

      }


      players[conn.peer] =
        createPlayer(
          conn.peer,
          data.name ||
            "PLAYER"
        );


      console.log(
        "PLAYER ADDED:",
        players[conn.peer]
      );


      broadcast({
        type: "lobby",
        players
      });


      conn.send({
        type: "lobby",
        players
      });


      renderLobby();


      lobbyHint.textContent =
        "Player joined!";

    }


    // LOBBY
    if (
      data.type === "lobby" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      renderLobby();

    }


    // NAME
    if (
      data.type === "name"
    ) {

      if (
        players[data.id]
      ) {

        players[
          data.id
        ].name =
          data.name;

      }


      renderLobby();


      if (isHost) {

        broadcastState();

      }

    }


    // START
    if (
      data.type === "start"
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

      timeLeft =
        GAME_TIME;


      startRound(false);

    }


    // MOVEMENT
    if (
      data.type === "move" &&
      isHost
    ) {

      const p =
        players[data.id];


      if (
        !p ||
        !p.alive
      ) return;


      p.x =
        clamp(
          p.x +
          data.dx,
          3,
          97
        );


      p.y =
        clamp(
          p.y +
          data.dy,
          5,
          95
        );


      checkHazard(p);


      broadcastState();

    }


    // STATE
    if (
      data.type === "state" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      hazards =
        data.hazards ||
        [];

      timeLeft =
        typeof data.timeLeft ===
        "number"
          ? data.timeLeft
          : timeLeft;


      round =
        data.round ||
        round;


      renderGame();

    }


    // RESULT
    if (
      data.type === "result" &&
      !isHost
    ) {

      players =
        data.players ||
        {};

      endRound();

    }


    // REMATCH
    if (
      data.type === "rematch" &&
      isHost
    ) {

      startNewRound();

    }


    // FULL
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
      conn => {

        if (
          conn &&
          conn.open
        ) {

          try {

            conn.send(data);

          } catch (err) {

            console.error(
              err
            );

          }

        }

      }
    );

  }


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
  // LOBBY
  // =========================

  function renderLobby() {

    const list =
      Object.values(players);


    playerCount.textContent =
      `${list.length} / ${MAX_PLAYERS}`;


    playerList.innerHTML = "";


    list.forEach(
      (p, index) => {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "player";


        row.innerHTML = `

          <span
            class="player-dot"
            style="
              background:${getColor(index)}
            "
          ></span>

          <span>
            ${escapeHTML(
              p.name
            )}
          </span>

          ${
            p.id === myId
              ? `<small>YOU</small>`
              : ""
          }

          ${
            p.host
              ? `<small>HOST</small>`
              : ""
          }

        `;


        playerList.appendChild(
          row
        );

      }
    );


    startBtn.disabled =
      !isHost ||
      list.length < 2;

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


      if (players[myId]) {

        players[
          myId
        ].name =
          name;

      }


      if (isHost) {

        broadcastState();

      } else {

        const conn =
          connections.values()
            .next().value;


        if (
          conn &&
          conn.open
        ) {

          conn.send({

            type: "name",

            id: myId,

            name

          });

        }

      }


      renderLobby();

    }
  );


  // =========================
  // START
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


      startNewRound();

    }
  );


  // =========================
  // NEW ROUND
  // =========================

  function startNewRound() {

    if (!isHost) return;


    Object.values(players)
      .forEach(
        (p, index) => {

          p.alive = true;

          p.x =
            10 +
            (index * 11) %
              80;

          p.y =
            15 +
            (index * 13) %
              70;

        }
      );


    hazards =
      createHazards();


    timeLeft =
      GAME_TIME;


    running = true;


    broadcast({

      type: "start",

      players,

      hazards,

      round

    });


    startRound(true);

  }


  // =========================
  // START ROUND
  // =========================

  function startRound(host) {

    running = true;


    showScreen(game);


    renderGame();


    if (host) {

      runHostLoop();

    }

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

        id: i,

        type:
          i % 3 === 0
            ? "pit"
            : i % 3 === 1
            ? "wall"
            : "bomb",

        x:
          Math.random() *
            84 +
          8,

        y:
          Math.random() *
            78 +
          10

      });

    }


    return list;

  }


  // =========================
  // HOST LOOP
  // =========================

  function runHostLoop() {

    clearInterval(
      gameTimer
    );


    gameTimer =
      setInterval(
        () => {

          if (!running) {

            clearInterval(
              gameTimer
            );

            return;

          }


          timeLeft -= 0.1;


          moveHazards();


          Object.values(players)
            .forEach(
              checkHazard
            );


          const alive =
            Object.values(players)
              .filter(
                p =>
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

        },
        100
      );

  }


  // =========================
  // MOVE HAZARDS
  // =========================

  function moveHazards() {

    hazards.forEach(
      (h, i) => {

        if (
          h.type !==
          "bomb"
        ) return;


        h.x +=
          Math.sin(
            Date.now() /
              500 +
              i
          ) *
          0.15;


        h.y +=
          Math.cos(
            Date.now() /
              650 +
              i
          ) *
          0.12;

      }
    );

  }


  // =========================
  // CHECK HAZARD
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
        distance < 5
      ) {

        p.alive =
          false;

        break;

      }

    }

  }


  // =========================
  // FINISH
  // =========================

  function finishHost() {

    if (!running) return;


    running = false;


    clearInterval(
      gameTimer
    );


    Object.values(players)
      .filter(
        p =>
          p.alive
      )
      .forEach(
        p =>
          p.score += 500
      );


    broadcast({

      type: "result",

      players

    });


    endRound();

  }


  function endRound() {

    running = false;


    clearInterval(
      gameTimer
    );


    const sorted =
      Object.values(players)
        .sort(
          (a, b) =>
            b.score -
            a.score
        );


    const winner =
      sorted[0];


    if (winner) {

      winnerTitle.textContent =
        winner.name.toUpperCase() +
        " WINS";


      winnerSub.textContent =
        winner.alive
          ? "They survived the arena."
          : "Highest score wins.";

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


    showScreen(result);

  }


  // =========================
  // RENDER GAME
  // =========================

  function renderGame() {

    aliveCount.textContent =
      Object.values(players)
        .filter(
          p =>
            p.alive
        )
        .length;


    roundNo.textContent =
      String(round)
        .padStart(2, "0");


    timerEl.textContent =
      Math.max(
        0,
        timeLeft
      ).toFixed(1);


    playersEl.innerHTML =
      Object.values(players)
        .map(
          p => `

            <div
              class="
                player-dot
                ${p.id === myId ? "me" : ""}
                ${p.alive ? "" : "dead"}
              "
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
          h => `

            <div
              class="
                hazard
                ${h.type}
              "
              style="
                left:${h.x}%;
                top:${h.y}%;
              "
            ></div>

          `
        )
        .join("");

  }


  // =========================
  // MOVEMENT
  // =========================

  setInterval(
    () => {

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

        const me =
          players[myId];


        if (
          !me ||
          !me.alive
        ) return;


        me.x =
          clamp(
            me.x +
              dx *
                speed,
            3,
            97
          );


        me.y =
          clamp(
            me.y +
              dy *
                speed,
            5,
            95
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

            type: "move",

            id: myId,

            dx:
              dx *
              speed,

            dy:
              dy *
              speed

          });

        }

      }

    },
    45
  );


  // =========================
  // KEYBOARD
  // =========================

  document.addEventListener(
    "keydown",
    e => {

      const k =
        e.key.toLowerCase();


      if (
        Object.prototype
          .hasOwnProperty
          .call(
            keys,
            k
          )
      {

        keys[k] = true;

        e.preventDefault();

      }

    }
  );


  document.addEventListener(
    "keyup",
    e => {

      const k =
        e.key.toLowerCase();


      if (
        Object.prototype
          .hasOwnProperty
          .call(
            keys,
            k
          )
      {

        keys[k] = false;

      }

    }
  );


  // =========================
  // COPY
  // =========================

  copyCode.addEventListener(
    "click",
    async () => {

      try {

        await navigator.clipboard
          .writeText(room);


        copyCode.textContent =
          "COPIED";


        setTimeout(
          () => {

            copyCode.textContent =
              "COPY";

          },
          1200
        );


      } catch {

        alert(room);

      }

    }
  );


  // =========================
  // REMATCH
  // =========================

  rematchBtn.addEventListener(
    "click",
    () => {

      if (isHost) {

        round++;

        startNewRound();

      } else {

        const conn =
          connections.values()
            .next().value;


        if (
          conn &&
          conn.open
        ) {

          conn.send({

            type:
              "rematch"

          });


          rematchBtn.disabled =
            true;


          rematchBtn.textContent =
            "WAITING...";

        }

      }

    }
  );


  // =========================
  // MENU
  // =========================

  homeBtn.addEventListener(
    "click",
    () => {

      location.reload();

    }
  );


  leaveGame.addEventListener(
    "click",
    () => {

      location.reload();

    }
  );


  // =========================
  // JOIN ENTER
  // =========================

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


  joinCode.addEventListener(
    "keydown",
    e => {

      if (
        e.key === "Enter"
      ) {

        joinRoom();

      }

    }
  );


  // =========================
  // HELPERS
  // =========================

  function clamp(
    value,
    min,
    max
  ) {

    return Math.max(
      min,
      Math.min(
        max,
        value
      )
    );

  }


  function getColor(index) {

    return colors[
      index %
      colors.length
    ];

  }


  function escapeHTML(str) {

    return String(str)
      .replace(
        /[&<>"']/g,
        m =>
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
  // INIT
  // =========================

  renderLobby();

  console.log(
    "%c LAST//ALIVE READY ",
    "background:#111;color:#b7ff3c;font-size:16px;padding:8px"
  );

});
