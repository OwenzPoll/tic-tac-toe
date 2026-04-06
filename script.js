   /* ============================================
   TIC TAC TOE — script.js
   Fitur: Minimax + Alpha-Beta, pilih simbol,
   garis menang animasi, leaderboard Firebase
   ============================================ */

"use strict";

// ── Firebase ──────────────────────────────────
const FIREBASE_URL = "https://tic-tac-toe-614f0-default-rtdb.asia-southeast1.firebasedatabase.app";

// ── State ─────────────────────────────────────
let board         = Array(9).fill("");
let currentPlayer = "X";
let gameOver      = false;

let HUMAN = "X";   // bisa berubah saat player pilih simbol
let AI    = "O";

const WIN_COMBOS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const scores = { X: 0, O: 0, draw: 0 };

// ── DOM ───────────────────────────────────────
const $     = id => document.getElementById(id);
const cells = ()  => document.querySelectorAll(".cell");

function getDifficulty() { return ($("difficulty")?.value) ?? "hard"; }

// ═══════════════════════════════════════════════
// PILIH SIMBOL
// ═══════════════════════════════════════════════

function pickSymbol(sym) {
  if (gameOver === false && board.some(v => v !== "")) {
    // Game sedang berjalan, konfirmasi dulu
    if (!confirm("Game sedang berjalan. Reset dan ganti simbol?")) return;
  }

  HUMAN = sym;
  AI    = sym === "X" ? "O" : "X";

  // Update tombol picker
  $("pick-x").className = "sym-btn" + (sym === "X" ? " active-x" : "");
  $("pick-o").className = "sym-btn" + (sym === "O" ? " active-o" : "");

  // Update label scorebar
  $("label-x").textContent = sym === "X" ? "Kamu (X)" : "A.I (X)";
  $("label-o").textContent = sym === "O" ? "Kamu (O)" : "A.I (O)";

  // Reset board dengan simbol baru
  resetGame();

  // Kalau player pilih O, AI jalan duluan
  if (HUMAN === "O") {
    lockBoard(true);
    setTimeout(doAiMove, 400);
  }
}

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

  if (currentPlayer === AI && !gameOver) {
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
    const win   = findWinningMove(AI);
    const block = findWinningMove(HUMAN);
    if (win   != null) return win;
    if (block != null) return block;
    return Math.random() < 0.6 ? randomMove(empty) : minimaxRoot(board);
  }

  return minimaxRoot(board);
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
function checkWin(p)         { return checkWinState(board, p); }
function checkWinState(b, p) { return WIN_COMBOS.some(c => c.every(i => b[i] === p)); }
function isDraw()            { return !board.includes("") && !checkWin("X") && !checkWin("O"); }
function emptySquares(b)     { return b.reduce((a,v,i) => v===""?[...a,i]:a, []); }

function getWinCombo(p) {
  return WIN_COMBOS.find(c => c.every(i => board[i] === p)) ?? null;
}

// ── End Game ──────────────────────────────────
function endGame(winner) {
  gameOver = true;
  if (winner) {
    scores[winner]++;
    updateScoreDisplay();
    highlightWinCells(winner);
    drawWinLine(winner);
    showStatus(winner === "X" ? "X Menang!" : "O Menang!");
  } else {
    scores.draw++;
    updateScoreDisplay();
    showStatus("Seri!");
  }
  // Tunda overlay supaya garis terlihat dulu
  setTimeout(() => showWinOverlay(winner), 600);
}

// ═══════════════════════════════════════════════
// WIN LINE — SVG animasi garis menang
// ═══════════════════════════════════════════════

/*
  Board layout (3x3 grid, SVG viewBox 0 0 3 3):
  Setiap cell = 1 unit. Center cell[i]:
    row = Math.floor(i/3), col = i%3
    cx = col + 0.5, cy = row + 0.5
*/

function cellCenter(i) {
  return {
    x: (i % 3) + 0.5,
    y: Math.floor(i / 3) + 0.5
  };
}

// Perpanjang sedikit supaya garis keluar dari tepi cell
function extendLine(x1, y1, x2, y2, ext) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.sqrt(dx*dx + dy*dy);
  const ux = dx/len, uy = dy/len;
  return {
    x1: x1 - ux*ext, y1: y1 - uy*ext,
    x2: x2 + ux*ext, y2: y2 + uy*ext
  };
}

function drawWinLine(winner) {
  const combo = getWinCombo(winner);
  if (!combo) return;

  const [a, , c] = combo;
  const start = cellCenter(a);
  const end   = cellCenter(c);
  const ext   = extendLine(start.x, start.y, end.x, end.y, 0.35);

  const line  = $("win-line-path");
  const color = winner === "X" ? "#e85d75" : "#4fc3f7";

  // Reset animasi
  line.setAttribute("x1", ext.x1);
  line.setAttribute("y1", ext.y1);
  line.setAttribute("x2", ext.x2);
  line.setAttribute("y2", ext.y2);
  line.setAttribute("stroke", color);
  line.classList.remove("animate");

  // Hitung panjang garis untuk dasharray
  const dx = ext.x2 - ext.x1, dy = ext.y2 - ext.y1;
  const lineLen = Math.sqrt(dx*dx + dy*dy);
  line.style.strokeDasharray  = lineLen;
  line.style.strokeDashoffset = lineLen;

  // Trigger animasi
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      line.style.strokeDashoffset = "0";
      line.style.transition = "stroke-dashoffset 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    });
  });
}

function clearWinLine() {
  const line = $("win-line-path");
  line.style.transition      = "none";
  line.style.strokeDashoffset = line.style.strokeDasharray || "400";
  // Reset posisi
  line.setAttribute("x1","0"); line.setAttribute("y1","0");
  line.setAttribute("x2","0"); line.setAttribute("y2","0");
}

// ═══════════════════════════════════════════════
// UI UPDATES
// ═══════════════════════════════════════════════

function updateStatusDisplay() {
  const el = $("status");
  if (!el) return;
  const cls = currentPlayer.toLowerCase();
  const isHuman = currentPlayer === HUMAN;
  const label = isHuman ? `Giliran kamu` : `Giliran A.I`;
  el.innerHTML = `${label}: <span class="token ${cls}">${currentPlayer}</span>`;

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
    const isMe  = winner === HUMAN;
    textEl.innerHTML = `<span style="color:${color}">${winner}</span> Menang!${isMe ? " 🎉" : " 🤖"}<small>Klik reset untuk main lagi</small>`;
  } else {
    textEl.innerHTML = `Seri!<small>Klik reset untuk main lagi</small>`;
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
    cell.classList.remove("taken","win-cell","x","o");
    cell.style.pointerEvents = "";
    const mark = cell.querySelector(".mark");
    if (mark) { mark.textContent = ""; mark.className = "mark"; }
    else       { cell.textContent = ""; }
  });

  clearWinLine();
  $("win-msg")?.classList.remove("show");
  updateStatusDisplay();
}

// ═══════════════════════════════════════════════
// LEADERBOARD — Firebase Realtime Database
// ═══════════════════════════════════════════════

async function loadLeaderboard() {
  const list = $("leaderboard-list");
  if (!list) return;
  list.innerHTML = `<p style="opacity:0.4;font-size:0.8rem;text-align:center;padding:1rem">Memuat...</p>`;

  try {
    const res = await fetch(`${FIREBASE_URL}/scores.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    if (!raw || typeof raw !== "object") {
      list.innerHTML = `<p style="opacity:0.4;font-size:0.8rem;text-align:center;padding:0.8rem">Belum ada skor.</p>`;
      return;
    }

    const entries = Object.values(raw)
      .map(val => ({
        name:  String(val?.name  ?? "Anonim"),
        score: Number(val?.score ?? 0),
        ts:    Number(val?.ts    ?? 0)
      }))
      .filter(e => e.score > 0)
      .sort((a, b) => b.score - a.score || b.ts - a.ts)
      .slice(0, 10);

    if (!entries.length) {
      list.innerHTML = `<p style="opacity:0.4;font-size:0.8rem;text-align:center;padding:0.8rem">Belum ada skor.</p>`;
      return;
    }

    list.innerHTML = "";
    const medals = ["gold","silver","bronze"];
    const icons  = ["🥇","🥈","🥉"];

    entries.forEach((entry, i) => {
      const card = document.createElement("div");
      card.className = `lb-card ${medals[i] ?? ""}`;
      card.style.animationDelay = `${i * 55}ms`;
      card.innerHTML = `
        <span class="lb-rank">${icons[i] ?? "#"+(i+1)}</span>
        <span class="lb-name">${escapeHtml(entry.name)}</span>
        <span class="lb-score">${entry.score}</span>
      `;
      list.appendChild(card);
    });

  } catch (err) {
    console.error("Leaderboard error:", err);
    list.innerHTML = `<p style="opacity:0.4;font-size:0.8rem;text-align:center;padding:0.8rem">⚠️ Gagal memuat.</p>`;
  }
}

async function submitScore(name, score) {
  const res = await fetch(`${FIREBASE_URL}/scores.json`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ name: name.trim(), score: Number(score), ts: Date.now() })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await loadLeaderboard();
}

function saveScore() {
  const input = $("playerName");
  const name  = input?.value?.trim();
  if (!name) { alert("Masukkan nama dulu!"); return; }

  const wins = scores[HUMAN];
  if (wins === 0) { alert("Menangkan setidaknya 1 ronde dulu!"); return; }

  submitScore(name, wins)
    .then(() => {
      alert(`Skor "${name}" (${wins} menang) tersimpan!`);
      if (input) input.value = "";
    })
    .catch(() => alert("Gagal menyimpan. Cek koneksi."));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

// ── Init ──────────────────────────────────────
loadLeaderboard();
updateStatusDisplay();
