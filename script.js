/* ============================================
   TIC TAC TOE — script.js
   Fitur: Minimax + Alpha-Beta, mode PvP/AI,
   3 tingkat kesulitan, skor persisten, animasi
   ============================================ */

"use strict";

// ── State ────────────────────────────────────
let board        = Array(9).fill("");
let currentPlayer = "X";
let gameOver     = false;

const HUMAN = "X";
const AI    = "O";

const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],   // baris
  [0,3,6],[1,4,7],[2,5,8],   // kolom
  [0,4,8],[2,4,6]            // diagonal
];

const scores = { X: 0, O: 0, draw: 0 };

// ── DOM Helpers ──────────────────────────────
const $ = id => document.getElementById(id);
const cells = () => document.querySelectorAll(".cell");

function getMode()       { return ($("mode")?.value)       ?? "pvp"; }
function getDifficulty() { return ($("difficulty")?.value) ?? "hard"; }

// ── Main Click ───────────────────────────────
function klik(i) {
  if (board[i] !== "" || gameOver) return;

  placeMove(i, currentPlayer);

  if (checkWin(currentPlayer)) { endGame(currentPlayer); return; }
  if (isDraw())                 { endGame(null);           return; }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatusDisplay();

  if (getMode() === "ai" && currentPlayer === AI && !gameOver) {
    lockBoard(true);
    setTimeout(doAiMove, 320);
  }
}

// ── Place a move ─────────────────────────────
function placeMove(i, player) {
  board[i] = player;
  renderCell(i, player);
}

function renderCell(i, player) {
  const cellList = cells();
  const cell = cellList[i];
  if (!cell) return;

  cell.classList.add("taken");

  // Support both plain text and .mark span patterns
  const mark = cell.querySelector(".mark");
  if (mark) {
    mark.textContent = player;
    mark.className = `mark ${player.toLowerCase()} show`;
  } else {
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
  }
}

// ── AI Move ──────────────────────────────────
function doAiMove() {
  if (gameOver) return;

  const move = chooseAiMove();
  if (move === null || move === undefined) return;

  placeMove(move, AI);

  if (checkWin(AI)) { endGame(AI);  lockBoard(false); return; }
  if (isDraw())      { endGame(null); lockBoard(false); return; }

  currentPlayer = HUMAN;
  updateStatusDisplay();
  lockBoard(false);
}

function chooseAiMove() {
  const difficulty = getDifficulty();
  const empty = emptySquares(board);
  if (empty.length === 0) return null;

  if (difficulty === "easy") {
    return randomMove(empty);
  }

  if (difficulty === "normal") {
    // 50% random, 50% smart
    return Math.random() < 0.5
      ? randomMove(empty)
      : minimaxRoot(board);
  }

  // hard — full minimax with alpha-beta
  return minimaxRoot(board);
}

function randomMove(empty) {
  return empty[Math.floor(Math.random() * empty.length)];
}

// ── Minimax (Alpha-Beta pruning) ─────────────
function minimaxRoot(b) {
  let bestScore = -Infinity;
  let bestIndex = null;

  for (const i of emptySquares(b)) {
    b[i] = AI;
    const score = minimax(b, 0, false, -Infinity, Infinity);
    b[i] = "";

    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  return bestIndex;
}

function minimax(b, depth, isMaximizing, alpha, beta) {
  if (checkWinState(b, AI))    return 10 - depth;
  if (checkWinState(b, HUMAN)) return depth - 10;

  const empty = emptySquares(b);
  if (empty.length === 0)      return 0;

  if (isMaximizing) {
    let best = -Infinity;
    for (const i of empty) {
      b[i] = AI;
      best = Math.max(best, minimax(b, depth + 1, false, alpha, beta));
      b[i] = "";
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break; // prune
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      b[i] = HUMAN;
      best = Math.min(best, minimax(b, depth + 1, true, alpha, beta));
      b[i] = "";
      beta = Math.min(beta, best);
      if (beta <= alpha) break; // prune
    }
    return best;
  }
}

// ── Win / Draw Checks ─────────────────────────
function checkWin(player) {
  return checkWinState(board, player);
}

function checkWinState(b, player) {
  return WIN_COMBOS.some(combo => combo.every(i => b[i] === player));
}

function isDraw() {
  return !board.includes("") && !checkWin("X") && !checkWin("O");
}

function emptySquares(b) {
  return b.reduce((acc, v, i) => (v === "" ? [...acc, i] : acc), []);
}

function getWinCombo(player) {
  return WIN_COMBOS.find(combo => combo.every(i => board[i] === player)) ?? null;
}

// ── End Game ──────────────────────────────────
function endGame(winner) {
  gameOver = true;

  if (winner) {
    scores[winner]++;
    updateScoreDisplay();
    highlightWinCells(winner);
    showStatus(winner === "X"
      ? "X Menang! 🎉"
      : "O Menang! 🎉"
    );
  } else {
    scores.draw++;
    updateScoreDisplay();
    showStatus("Seri! 🤝");
    // 🔥 kirim ke leaderboard kalau player menang
if (winner === "X") {
  const name = prompt("Masukkan nama kamu:");
  if (name) {
    submitScore(name, scores.X);
  }
}
  }

  showWinOverlay(winner);
}

// ── UI Updates ────────────────────────────────
function updateStatusDisplay() {
  const statusEl = $("status");
  if (!statusEl) return;

  const cls = currentPlayer.toLowerCase();
  statusEl.innerHTML = `Giliran: <span class="token ${cls}">${currentPlayer}</span>`;

  // Update active score highlight
  $("score-x-wrap") && ($("score-x-wrap").className =
    "score-item" + (currentPlayer === "X" ? " active-x" : ""));
  $("score-o-wrap") && ($("score-o-wrap").className =
    "score-item" + (currentPlayer === "O" ? " active-o" : ""));
}

function showStatus(text) {
  const statusEl = $("status");
  if (statusEl) statusEl.textContent = text;
}

function updateScoreDisplay() {
  if ($("score-x"))    $("score-x").textContent    = scores.X;
  if ($("score-o"))    $("score-o").textContent    = scores.O;
  if ($("score-draw")) $("score-draw").textContent = scores.draw;
}

function highlightWinCells(player) {
  const combo = getWinCombo(player);
  if (!combo) return;
  const cellList = cells();
  combo.forEach(i => cellList[i]?.classList.add("win-cell"));
}

function showWinOverlay(winner) {
  const overlay = $("win-msg");
  const textEl  = $("win-msg-text");
  if (!overlay || !textEl) return;

  if (winner) {
    const color = winner === "X" ? "#e85d75" : "#4fc3f7";
    textEl.innerHTML = `<span style="color:${color}">${winner}</span> Menang! 🎉
      <small>Klik reset untuk main lagi</small>`;
  } else {
    textEl.innerHTML = `Seri! 🤝<small>Klik reset untuk main lagi</small>`;
  }

  overlay.classList.add("show");
}

function lockBoard(locked) {
  cells().forEach(c => {
    c.style.pointerEvents = locked ? "none" : "";
  });
}

// ── Reset ─────────────────────────────────────
function resetGame() {
  board         = Array(9).fill("");
  currentPlayer = "X";
  gameOver      = false;
  
  // ================================
// 🔥 LEADERBOARD SYSTEM (ONLINE)
// ================================

// Ganti dengan URL API kamu nanti (Vercel / Firebase)
const API_URL = "AIzaSyDX-Hd1wp8RnSHtqetTQyCKbiodE21H3FE";

// Ambil data leaderboard
async function loadLeaderboard() {
  try {
    const res = await fetch(API_URL);
    const data = await res.json();

    const list = document.getElementById("leaderboard-list");
    if (!list) return;

    list.innerHTML = "";

    data.forEach((player, index) => {
      const div = document.createElement("div");
      div.className = "Ib-card";

      div.innerHTML = `
        <span class="Ib-rank">#${index + 1}</span>
        <span class="Ib-name">${player.name}</span>
        <span class="Ib-score">${player.score}</span>
      `;

      list.appendChild(div);
    });

  } catch (err) {
    console.error("Gagal load leaderboard:", err);
  }
}

// Kirim skor ke server
async function submitScore(name, score) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, score })
    });

    loadLeaderboard();
  } catch (err) {
    console.error("Gagal kirim skor:", err);
  }
}

  // Clear all cells
  cells().forEach(cell => {
    cell.classList.remove("taken", "win-cell", "x", "o");
    cell.style.pointerEvents = "";
    const mark = cell.querySelector(".mark");
    if (mark) {
      mark.textContent = "";
      mark.className   = "mark";
    } else {
      cell.textContent = "";
    }
  });

  // Close overlay
  $("win-msg")?.classList.remove("show");

  // Reset status
  updateStatusDisplay();
}