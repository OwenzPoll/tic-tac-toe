/* ============================================
   TIC TAC TOE — script.js
   Fitur: Minimax + Alpha-Beta, mode PvP/AI,
   3 tingkat kesulitan, skor persisten, animasi,
   leaderboard online via Firebase
   ============================================ */

"use strict";

// ── Firebase Config ───────────────────────────
// Ganti dengan URL Firebase Realtime Database kamu:
// Format: https://NAMA-PROJECT-default-rtdb.firebaseio.com
const FIREBASE_URL = "https://tic-tac-toe-614f0-default-rtdb.asia-southeast1.firebasedatabase.app/";

// ── State ─────────────────────────────────────
let board         = Array(9).fill("");
let currentPlayer = "X";
let gameOver      = false;

const HUMAN = "X";
const AI    = "O";

const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const scores = { X: 0, O: 0, draw: 0 };

// ── DOM Helpers ───────────────────────────────
const $ = id => document.getElementById(id);
const cells = () => document.querySelectorAll(".cell");

function getMode()       { return ($("mode")?.value)       ?? "ai"; }
function getDifficulty() { return ($("difficulty")?.value) ?? "hard"; }

// ═══════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════

// ── Main Click ────────────────────────────────
function klik(i) {
  if (board[i] !== "" || gameOver) return;

  placeMove(i, currentPlayer);

  if (checkWin(currentPlayer)) { endGame(currentPlayer); return; }
  if (isDraw())                 { endGame(null);          return; }

  currentPlayer = currentPlayer === "X" ? "O" : "X";
  updateStatusDisplay();

  if (getMode() === "ai" && currentPlayer === AI && !gameOver) {
    lockBoard(true);
    setTimeout(doAiMove, 350);
  }
}

// ── Place a move ──────────────────────────────
function placeMove(i, player) {
  board[i] = player;
  renderCell(i, player);
}

function renderCell(i, player) {
  const cell = cells()[i];
  if (!cell) return;
  cell.classList.add("taken");

  const mark = cell.querySelector(".mark");
  if (mark) {
    mark.textContent = player;
    mark.className = `mark ${player.toLowerCase()} show`;
  } else {
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
  }
}

// ── AI Move ───────────────────────────────────
function doAiMove() {
  if (gameOver) return;

  const move = chooseAiMove();
  if (move === null || move === undefined) return;

  placeMove(move, AI);

  if (checkWin(AI)) { endGame(AI);  lockBoard(false); return; }
  if (isDraw())     { endGame(null); lockBoard(false); return; }

  currentPlayer = HUMAN;
  updateStatusDisplay();
  lockBoard(false);
}

function chooseAiMove() {
  const difficulty = getDifficulty();
  const empty = emptySquares(board);
  if (empty.length === 0) return null;

  if (difficulty === "easy") {
    // Murni random
    return randomMove(empty);
  }

  if (difficulty === "normal") {
    // Cek dulu: kalau bisa menang 1 langkah, ambil
    // Kalau player mau menang, block
    // Sisanya 60% random
    const win   = findWinningMove(AI);
    const block = findWinningMove(HUMAN);
    if (win   !== null) return win;
    if (block !== null) return block;
    return Math.random() < 0.6 ? randomMove(empty) : minimaxRoot(board);
  }

  // hard — full minimax + alpha-beta, tidak bisa dikalahkan
  return minimaxRoot(board);
}

function randomMove(empty) {
  return empty[Math.floor(Math.random() * empty.length)];
}

// Cari langkah menang 1 step untuk player tertentu
function findWinningMove(player) {
  for (const i of emptySquares(board)) {
    board[i] = player;
    const wins = checkWinState(board, player);
    board[i] = "";
    if (wins) return i;
  }
  return null;
}

// ── Minimax + Alpha-Beta ──────────────────────
function minimaxRoot(b) {
  let bestScore = -Infinity;
  let bestIndex = null;

  for (const i of emptySquares(b)) {
    b[i] = AI;
    const score = minimax(b, 0, false, -Infinity, Infinity);
    b[i] = "";
    if (score > bestScore) { bestScore = score; bestIndex = i; }
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
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      b[i] = HUMAN;
      best = Math.min(best, minimax(b, depth + 1, true, alpha, beta));
      b[i] = "";
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── Win / Draw ────────────────────────────────
function checkWin(player)          { return checkWinState(board, player); }
function checkWinState(b, player)  { return WIN_COMBOS.some(c => c.every(i => b[i] === player)); }
function isDraw()                  { return !board.includes("") && !checkWin("X") && !checkWin("O"); }
function emptySquares(b)           { return b.reduce((a, v, i) => v === "" ? [...a, i] : a, []); }
function getWinCombo(player)       { return WIN_COMBOS.find(c => c.every(i => board[i] === player)) ?? null; }

// ── End Game ──────────────────────────────────
function endGame(winner) {
  gameOver = true;

  if (winner) {
    scores[winner]++;
    updateScoreDisplay();
    highlightWinCells(winner);
    showStatus(winner === "X" ? "X Menang! 🎉" : "O Menang! 🎉");
  } else {
    scores.draw++;
    updateScoreDisplay();
    showStatus("Seri! 🤝");
  }

  showWinOverlay(winner);
}

// ═══════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════

function updateStatusDisplay() {
  const el = $("status");
  if (!el) return;
  const cls = currentPlayer.toLowerCase();
  el.innerHTML = `Giliran: <span class="token ${cls}">${currentPlayer}</span>`;

  $("score-x-wrap") && ($("score-x-wrap").className =
    "score-item" + (currentPlayer === "X" ? " active-x" : ""));
  $("score-o-wrap") && ($("score-o-wrap").className =
    "score-item" + (currentPlayer === "O" ? " active-o" : ""));
}

function showStatus(text) {
  const el = $("status");
  if (el) el.textContent = text;
}

function updateScoreDisplay() {
  if ($("score-x"))    $("score-x").textContent    = scores.X;
  if ($("score-o"))    $("score-o").textContent    = scores.O;
  if ($("score-draw")) $("score-draw").textContent = scores.draw;
}

function highlightWinCells(player) {
  const combo = getWinCombo(player);
  if (!combo) return;
  combo.forEach(i => cells()[i]?.classList.add("win-cell"));
}

function showWinOverlay(winner) {
  const overlay = $("win-msg");
  const textEl  = $("win-msg-text");
  if (!overlay || !textEl) return;

  if (winner) {
    const color = winner === "X" ? "#e85d75" : "#4fc3f7";
    textEl.innerHTML = `<span style="color:${color}">${winner}</span> Menang! 🎉<small>Klik reset untuk main lagi</small>`;
  } else {
    textEl.innerHTML = `Seri! 🤝<small>Klik reset untuk main lagi</small>`;
  }

  overlay.classList.add("show");
}

function lockBoard(locked) {
  cells().forEach(c => { c.style.pointerEvents = locked ? "none" : ""; });
}

// ── Reset ─────────────────────────────────────
function resetGame() {
  board         = Array(9).fill("");
  currentPlayer = "X";
  gameOver      = false;

  cells().forEach(cell => {
    cell.classList.remove("taken", "win-cell", "x", "o");
    cell.style.pointerEvents = "";
    const mark = cell.querySelector(".mark");
    if (mark) { mark.textContent = ""; mark.className = "mark"; }
    else       { cell.textContent = ""; }
  });

  $("win-msg")?.classList.remove("show");
  updateStatusDisplay();
}

// ═══════════════════════════════════════════════
// LEADERBOARD — Firebase Realtime Database
// ═══════════════════════════════════════════════

// Ambil & tampilkan leaderboard (top 10, urut skor tertinggi)
async function loadLeaderboard() {
  const list = $("leaderboard-list");
  if (!list) return;
  list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;">Memuat...</p>`;

  try {
    const res  = await fetch(`${FIREBASE_URL}/scores.json`);
    const data = await res.json();

    if (!data) {
      list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;">Belum ada skor.</p>`;
      return;
    }

    // Firebase mengembalikan objek {key: {name, score, ts}}
    // Ubah jadi array, urutkan tertinggi, ambil top 10
    const entries = Object.values(data)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    list.innerHTML = "";
    const medals = ["gold", "silver", "bronze"];

    entries.forEach((entry, i) => {
      const medal = medals[i] ?? "";
      const icon  = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`;

      const card = document.createElement("div");
      card.className = `lb-card ${medal}`;
      card.innerHTML = `
        <span class="lb-rank">${icon}</span>
        <span class="lb-name">${escapeHtml(entry.name)}</span>
        <span class="lb-score">${entry.score}</span>
      `;
      list.appendChild(card);
    });

  } catch (err) {
    console.error("Gagal load leaderboard:", err);
    list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;">Gagal memuat data.</p>`;
  }
}

// Kirim skor ke Firebase
async function submitScore(name, score) {
  try {
    // POST ke /scores.json membuat entry baru dengan key unik
    await fetch(`${FIREBASE_URL}/scores.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:  name.trim(),
        score: score,
        ts:    Date.now()   // timestamp untuk tie-breaking
      })
    });

    await loadLeaderboard(); // refresh tampilan
  } catch (err) {
    console.error("Gagal kirim skor:", err);
  }
}

// Dipanggil dari tombol "Simpan Skor" di HTML
function saveScore() {
  const input = $("playerName");
  const name  = input?.value?.trim();

  if (!name) {
    alert("Masukkan nama dulu!");
    return;
  }

  // Ambil skor X (pemain manusia) sebagai skor yang disimpan
  const totalWins = scores.X;

  if (totalWins === 0) {
    alert("Menangkan setidaknya 1 ronde dulu!");
    return;
  }

  submitScore(name, totalWins);

  if (input) input.value = "";
  alert(`Skor "${name}" (${totalWins} menang) berhasil disimpan! 🎉`);
}

// Sanitasi supaya nama tidak bisa inject HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── Init ──────────────────────────────────────
// Load leaderboard saat halaman pertama dibuka
loadLeaderboard();