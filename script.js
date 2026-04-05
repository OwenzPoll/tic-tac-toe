/* ============================================
   TIC TAC TOE — script.js
   Fitur: Minimax + Alpha-Beta, mode PvP/AI,
   3 tingkat kesulitan, leaderboard Firebase
   ============================================ */

"use strict";

// ── Firebase ──────────────────────────────────
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
const $    = id => document.getElementById(id);
const cells = ()  => document.querySelectorAll(".cell");

function getMode()       { return ($("mode")?.value)       ?? "ai"; }
function getDifficulty() { return ($("difficulty")?.value) ?? "hard"; }

// ═══════════════════════════════════════════════
// GAME LOGIC
// ═══════════════════════════════════════════════

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
    mark.className   = `mark ${player.toLowerCase()} show`;
  } else {
    cell.textContent = player;
    cell.classList.add(player.toLowerCase());
  }
}

// ── AI ────────────────────────────────────────
function doAiMove() {
  if (gameOver) return;
  const move = chooseAiMove();
  if (move == null) return;
  placeMove(move, AI);
  if (checkWin(AI)) { endGame(AI);  lockBoard(false); return; }
  if (isDraw())     { endGame(null); lockBoard(false); return; }
  currentPlayer = HUMAN;
  updateStatusDisplay();
  lockBoard(false);
}

function chooseAiMove() {
  const diff  = getDifficulty();
  const empty = emptySquares(board);
  if (!empty.length) return null;

  if (diff === "easy") return randomMove(empty);

  if (diff === "normal") {
    // Block/win jika bisa, sisanya acak 60%
    const win   = findWinningMove(AI);
    const block = findWinningMove(HUMAN);
    if (win   != null) return win;
    if (block != null) return block;
    return Math.random() < 0.6 ? randomMove(empty) : minimaxRoot(board);
  }

  return minimaxRoot(board); // hard
}

function randomMove(empty) {
  return empty[Math.floor(Math.random() * empty.length)];
}

function findWinningMove(player) {
  for (const i of emptySquares(board)) {
    board[i] = player;
    const wins = checkWinState(board, player);
    board[i]   = "";
    if (wins) return i;
  }
  return null;
}

function minimaxRoot(b) {
  let best = -Infinity, idx = null;
  for (const i of emptySquares(b)) {
    b[i] = AI;
    const s = minimax(b, 0, false, -Infinity, Infinity);
    b[i] = "";
    if (s > best) { best = s; idx = i; }
  }
  return idx;
}

function minimax(b, depth, isMax, alpha, beta) {
  if (checkWinState(b, AI))    return 10 - depth;
  if (checkWinState(b, HUMAN)) return depth - 10;
  const empty = emptySquares(b);
  if (!empty.length)           return 0;

  if (isMax) {
    let best = -Infinity;
    for (const i of empty) {
      b[i]  = AI;
      best  = Math.max(best, minimax(b, depth+1, false, alpha, beta));
      b[i]  = "";
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  } else {
    let best = Infinity;
    for (const i of empty) {
      b[i] = HUMAN;
      best = Math.min(best, minimax(b, depth+1, true, alpha, beta));
      b[i] = "";
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }
}

// ── Win / Draw ────────────────────────────────
function checkWin(p)           { return checkWinState(board, p); }
function checkWinState(b, p)   { return WIN_COMBOS.some(c => c.every(i => b[i] === p)); }
function isDraw()              { return !board.includes("") && !checkWin("X") && !checkWin("O"); }
function emptySquares(b)       { return b.reduce((a,v,i) => v===""?[...a,i]:a, []); }
function getWinCombo(p)        { return WIN_COMBOS.find(c => c.every(i => board[i]===p)) ?? null; }

// ── End Game ──────────────────────────────────
function endGame(winner) {
  gameOver = true;
  if (winner) {
    scores[winner]++;
    updateScoreDisplay();
    highlightWinCells(winner);
    showStatus(winner === "X" ? "X Menang!" : "O Menang!");
  } else {
    scores.draw++;
    updateScoreDisplay();
    showStatus("Seri!");
  }
  showWinOverlay(winner);
}

// ═══════════════════════════════════════════════
// UI
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
  const el = $("status"); if (el) el.textContent = text;
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
  const overlay = $("win-msg"), textEl = $("win-msg-text");
  if (!overlay || !textEl) return;
  if (winner) {
    const color = winner === "X" ? "#e85d75" : "#4fc3f7";
    textEl.innerHTML = `<span style="color:${color}">${winner}</span> Menang! <small>Klik reset untuk main lagi</small>`;
  } else {
    textEl.innerHTML = `Seri! <small>Klik reset untuk main lagi</small>`;
  }
  overlay.classList.add("show");
}

function lockBoard(locked) {
  cells().forEach(c => { c.style.pointerEvents = locked ? "none" : ""; });
}

function resetGame() {
  board = Array(9).fill("");
  currentPlayer = "X";
  gameOver      = false;
  cells().forEach(cell => {
    cell.classList.remove("taken","win-cell","x","o");
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

async function loadLeaderboard() {
  const list = $("leaderboard-list");
  if (!list) return;
  list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;text-align:center;">Memuat...</p>`;

  try {
    // Ambil semua skor, urutkan dari terbesar, limit 10
    const url = `${FIREBASE_URL}/scores.json?orderBy="score"&limitToLast=10`;
    const res  = await fetch(url);

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.json();

    if (!raw || typeof raw !== "object") {
      list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;text-align:center;">Belum ada skor.</p>`;
      return;
    }

    // raw = { "-key1": {name:"...", score:3, ts:...}, ... }
    const entries = Object.entries(raw)
      .map(([key, val]) => ({
        key,
        name:  String(val.name  ?? "Anonim"),
        score: Number(val.score ?? 0),
        ts:    Number(val.ts    ?? 0)
      }))
      .filter(e => e.name && e.score > 0)   // buang entry kosong
      .sort((a, b) => b.score - a.score || b.ts - a.ts) // skor desc, ts desc
      .slice(0, 10);

    if (!entries.length) {
      list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;text-align:center;">Belum ada skor.</p>`;
      return;
    }

    list.innerHTML = "";
    const medals  = ["1st","2nd","3rd"];
    const icons   = ["🥇","🥈","🥉"];

    entries.forEach((entry, i) => {
      const card = document.createElement("div");
      card.className = `lb-card ${medals[i] ?? ""}`;
      card.innerHTML = `
        <span class="lb-rank">${icons[i] ?? "#" + (i+1)}</span>
        <span class="lb-name">${escapeHtml(entry.name)}</span>
        <span class="lb-score">${entry.score}</span>
      `;
      list.appendChild(card);
    });

  } catch (err) {
    console.error("Gagal load leaderboard:", err);
    list.innerHTML = `<p style="opacity:0.5;font-size:0.8rem;text-align:center;">Gagal memuat. Cek koneksi.</p>`;
  }
}

async function submitScore(name, score) {
  try {
    const res = await fetch(`${FIREBASE_URL}/scores.json`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:  name.trim(),
        score: Number(score),
        ts:    Date.now()
      })
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    await loadLeaderboard(); // refresh
  } catch (err) {
    console.error("Gagal kirim skor:", err);
    alert("Gagal menyimpan skor. Cek koneksi internet.");
  }
}

// Dipanggil dari tombol "Simpan Skor"
function saveScore() {
  const input = $("playerName");
  const name  = input?.value?.trim();

  if (!name) {
    alert("Masukkan nama dulu!");
    return;
  }

  const wins = scores.X;
  if (wins === 0) {
    alert("Menangkan setidaknya 1 ronde dulu!");
    return;
  }

  submitScore(name, wins).then(() => {
    alert(` Skor "${name}" (${wins} menang) berhasil disimpan!`);
    if (input) input.value = "";
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Pastikan Firebase Rules mengizinkan akses ──
// Di Firebase Console → Realtime Database → Rules, set:
// { "rules": { ".read": true, ".write": true } }

// ── Init ──────────────────────────────────────
loadLeaderboard();