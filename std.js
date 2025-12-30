// ==UserScript==
// @name        Lichess WASM Chess Engine
// @version     2.0
// @description Uses Rust/WASM for chess logic with Chess.js for SAN parsing
// @match       https://lichess.org/*
// @grant       none
// @run-at      document-start
// @require     https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/stockfish.js
// @require     https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/chess.js
// ==/UserScript==

// ============================================================
// PASTE YOUR BASE64 WASM HERE (or leave null for Chess.js only)
// ============================================================
const WASM_BASE64 = null;

// ============================================================
// WASM LOADER WITH STRING SUPPORT
// ============================================================
class ChessEngineWASM {
    constructor(exports, memory) {
        this._exports = exports;
        this._memory = memory;
        this._textEncoder = new TextEncoder();
        this._textDecoder = new TextDecoder();
        
        // Get buffer pointers if available
        if (exports.get_input_buffer_ptr && exports.get_output_buffer_ptr) {
            const inputPtr = exports.get_input_buffer_ptr();
            const outputPtr = exports.get_output_buffer_ptr();
            this._inputBuffer = new Uint8Array(memory.buffer, inputPtr, 256);
            this._outputBuffer = new Uint8Array(memory.buffer, outputPtr, 256);
            this._hasStringSupport = true;
        } else {
            this._hasStringSupport = false;
        }
        
        if (exports.reset) exports.reset();
    }
    
    _writeString(str) {
        if (!this._hasStringSupport) return;
        const bytes = this._textEncoder.encode(str);
        this._inputBuffer.set(bytes);
        this._inputBuffer[bytes.length] = 0;
    }
    
    _readString() {
        if (!this._hasStringSupport) return '';
        let len = 0;
        while (len < 256 && this._outputBuffer[len] !== 0) len++;
        return this._textDecoder.decode(this._outputBuffer.subarray(0, len));
    }
    
    _uciToInts(uci) {
        const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
        const ranks = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };
        const promos = { q: 1, r: 2, b: 3, n: 4 };
        
        if (!uci || uci.length < 4) return null;
        
        const ff = files[uci[0]], fr = ranks[uci[1]];
        const tf = files[uci[2]], tr = ranks[uci[3]];
        const p = uci.length > 4 ? (promos[uci[4]] || 0) : 0;
        
        if (ff === undefined || fr === undefined || tf === undefined || tr === undefined) {
            return null;
        }
        return [ff, fr, tf, tr, p];
    }
    
    reset() {
        if (this._exports.reset) this._exports.reset();
    }
    
    turn() {
        if (!this._exports.turn) return 'w';
        return this._exports.turn() === 0 ? 'w' : 'b';
    }
    
    make_san(san) {
        if (this._hasStringSupport && this._exports.make_san) {
            this._writeString(san);
            return this._exports.make_san() === 1;
        }
        return false;
    }
    
    make_move(uci) {
        if (this._hasStringSupport && this._exports.make_uci) {
            this._writeString(uci);
            return this._exports.make_uci() === 1;
        }
        
        if (this._exports.make_move) {
            const ints = this._uciToInts(uci);
            if (!ints) return false;
            return this._exports.make_move(ints[0], ints[1], ints[2], ints[3], ints[4]) === 1;
        }
        return false;
    }
    
    move_causes_draw(uci) {
        if (this._hasStringSupport && this._exports.move_causes_draw_uci) {
            this._writeString(uci);
            return this._exports.move_causes_draw_uci() === 1;
        }
        
        if (this._exports.move_causes_draw) {
            const ints = this._uciToInts(uci);
            if (!ints) return false;
            return this._exports.move_causes_draw(ints[0], ints[1], ints[2], ints[3], ints[4]) === 1;
        }
        return false;
    }
    
    fen() {
        if (this._hasStringSupport && this._exports.get_fen) {
            this._exports.get_fen();
            return this._readString();
        }
        return '';
    }
    
    load_fen(fen) {
        if (this._hasStringSupport && this._exports.load_fen) {
            this._writeString(fen);
            return this._exports.load_fen() === 1;
        }
        return false;
    }
    
    get(sq) {
        if (!sq || sq.length < 2) return '';
        
        const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
        const ranks = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };
        const pieceMap = ['', 'wp', 'wn', 'wb', 'wr', 'wq', 'wk', 'bp', 'bn', 'bb', 'br', 'bq', 'bk'];
        
        if (this._hasStringSupport && this._exports.get_piece_at) {
            this._writeString(sq);
            const piece = this._exports.get_piece_at();
            return pieceMap[piece] || '';
        }
        
        if (this._exports.get_piece) {
            const f = files[sq[0]], r = ranks[sq[1]];
            if (f === undefined || r === undefined) return '';
            const piece = this._exports.get_piece(f, r);
            return pieceMap[piece] || '';
        }
        return '';
    }
    
    piece_count() {
        return this._exports.piece_count ? this._exports.piece_count() : 32;
    }
    
    is_check() { return this._exports.is_check?.() === 1; }
    is_checkmate() { return this._exports.is_checkmate?.() === 1; }
    is_stalemate() { return this._exports.is_stalemate?.() === 1; }
    is_game_over() { return this._exports.is_game_over?.() === 1; }
    is_insufficient_material() { return this._exports.is_insufficient_material?.() === 1; }
    in_threefold_repetition() { return this._exports.in_threefold?.() === 1; }
    
    in_draw() {
        return this.is_stalemate() || this.is_insufficient_material() || this.in_threefold_repetition();
    }
}

async function loadStandaloneWasm(base64) {
    try {
        const wasmBytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const wasmModule = await WebAssembly.compile(wasmBytes);
        const instance = await WebAssembly.instantiate(wasmModule, {});
        
        const exports = instance.exports;
        const memory = exports.memory;
        
        console.log('[WASM] ✅ Loaded! Exports:', Object.keys(exports));
        
        return { exports, memory };
    } catch (e) {
        console.error('[WASM] Failed:', e);
        return null;
    }
}

// ============================================================
// CHESS.JS FALLBACK
// ============================================================
class ChessEngineFallback {
    constructor() {
        this._chess = new Chess();
        this._history = [];
    }
    
    reset() {
        this._chess = new Chess();
        this._history = [];
    }
    
    fen() { return this._chess.fen(); }
    turn() { return this._chess.turn(); }
    
    make_move(uci) {
        if (!uci || uci.length < 4) return false;
        try {
            const result = this._chess.move({
                from: uci.substring(0, 2),
                to: uci.substring(2, 4),
                promotion: uci.length > 4 ? uci[4] : undefined
            });
            if (result) {
                this._history.push(this._chess.fen());
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    make_san(san) {
        try {
            const result = this._chess.move(san);
            if (result) {
                this._history.push(this._chess.fen());
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    get(square) {
        const piece = this._chess.get(square);
        if (!piece) return '';
        return piece.color + piece.type;
    }
    
    piece_count() {
        const fen = this._chess.fen().split(' ')[0];
        return (fen.match(/[pnbrqkPNBRQK]/g) || []).length;
    }
    
    is_check() { return this._chess.in_check(); }
    is_checkmate() { return this._chess.in_checkmate(); }
    is_stalemate() { return this._chess.in_stalemate(); }
    is_game_over() { return this._chess.game_over(); }
    is_insufficient_material() { return this._chess.insufficient_material(); }
    in_threefold_repetition() { return this._chess.in_threefold_repetition(); }
    in_draw() { return this._chess.in_draw(); }
    
    move_causes_draw(uci) {
        if (!uci || uci.length < 4) return false;
        try {
            const result = this._chess.move({
                from: uci.substring(0, 2),
                to: uci.substring(2, 4),
                promotion: uci.length > 4 ? uci[4] : 'q'
            });
            if (!result) return false;
            
            const isDraw = this._chess.in_draw() || 
                           this._chess.in_threefold_repetition() ||
                           this._chess.in_stalemate();
            
            this._chess.undo();
            return isDraw;
        } catch (e) {
            return false;
        }
    }
    
    load_fen(fen) {
        try {
            this._chess.load(fen);
            this._history = [];
            return true;
        } catch (e) {
            return false;
        }
    }
}

// ============================================================
// ENGINE INITIALIZATION
// ============================================================
let ChessEngine = null;
let useWasm = false;
let wasmInstance = null;

// Chess.js instance for SAN -> UCI conversion
let syncChess = null;

async function initChessEngine() {
    if (WASM_BASE64) {
        const result = await loadStandaloneWasm(WASM_BASE64);
        if (result) {
            wasmInstance = result;
            useWasm = true;
            ChessEngine = class {
                constructor() {
                    return new ChessEngineWASM(result.exports, result.memory);
                }
            };
            console.log('[Engine] ✅ Using WASM');
            return;
        }
    }
    
    ChessEngine = ChessEngineFallback;
    console.log('[Engine] ✅ Using Chess.js fallback');
}

// ============================================================
// STOCKFISH
// ============================================================
let engineReady = false;
const sfListeners = new Set();

function setupStockfish() {
    if (typeof stockfish === 'undefined') {
        console.error('[Stockfish] ❌ Not loaded!');
        return;
    }
    
    stockfish.onmessage = (e) => {
        const data = String(e.data || e);
        if (data === 'readyok') {
            engineReady = true;
            console.log('[Stockfish] ✅ Ready!');
        }
        for (const fn of sfListeners) {
            try { fn({ data }); } catch {}
        }
    };
    
    console.log('[Stockfish] ✅ Listeners attached');
}

function configureEngine() {
    return new Promise((resolve) => {
        if (typeof stockfish === 'undefined') { resolve(); return; }
        
        console.log('[Stockfish] Configuring...');
        stockfish.postMessage('uci');
        stockfish.postMessage('setoption name Threads value 1');
        stockfish.postMessage('setoption name MultiPV value 4');
        stockfish.postMessage('isready');

        const check = setInterval(() => {
            if (engineReady) { clearInterval(check); resolve(); }
        }, 50);

        setTimeout(() => { clearInterval(check); engineReady = true; resolve(); }, 3000);
    });
}

// ============================================================
// SOCKET WRAPPER
// ============================================================
let webSocketWrapper = null;
let currentAck = 0;

const webSocketProxy = new Proxy(window.WebSocket, {
    construct(target, args) {
        const ws = new target(...args);
        webSocketWrapper = ws;
        ws.addEventListener("message", (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.t === 'move' && msg.d?.ply !== undefined) {
                    currentAck = msg.d.ply;
                }
            } catch (e) {}
        });
        return ws;
    }
});
window.WebSocket = webSocketProxy;

// ============================================================
// GAME STATE & SETTINGS
// ============================================================
let game = null;

let autoHint = localStorage.getItem('autorun') === "1";
let humanMode = localStorage.getItem('humanMode') === "1";
let variedMode = localStorage.getItem('variedMode') !== "0";
let configMode = localStorage.getItem('configMode') || "15s";

const PRESETS = {
    '7.5s': {
        engineMs: 12,
        varied: { maxCpLoss: 900, weights: [8, 40, 28, 24], maxBlundersPerGame: 50, blunderThreshold: 100, blunderChance: 0.45 },
        human: { baseDelayMs: 180, maxDelayMs: 600, quickMoveChance: 0.35, tankChance: 0.008 }
    },
    '15s': {
        engineMs: 20,
        varied:  { maxCpLoss: 300, weights: [10, 45, 23, 22], maxBlundersPerGame: 10, blunderThreshold: 100, blunderChance: 0.16 },
        human: { baseDelayMs: 250, maxDelayMs: 800, quickMoveChance: 0.25, tankChance: 0.01 }
    },
    '30s': {
        engineMs: 60,
        varied:  { maxCpLoss: 200, weights: [30, 55, 10, 5], maxBlundersPerGame: 5, blunderThreshold: 100, blunderChance: 0.08 },
        human: { baseDelayMs: 500, maxDelayMs: 1200, quickMoveChance: 0.20, tankChance: 0.05 }
    }
};

let activeConfig = PRESETS[configMode] || PRESETS['15s'];

let gameBlunderCount = 0;
let varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
let isProcessing = false;
let panicThreshold = 1.5;
let lastMoveSent = null;
let lastMoveSentTime = 0;

// ============================================================
// HELPERS
// ============================================================
function getClockSeconds() {
    const clockEl = document.querySelector('.rclock-bottom .time');
    if (!clockEl) return 999;
    
    const match = clockEl.textContent.match(/(\d+):(\d+)(?:\.(\d))?/);
    if (!match) return 999;
    
    return parseInt(match[1]) * 60 + parseInt(match[2]) + (match[3] ? parseInt(match[3]) / 10 : 0);
}

function waitForElement(sel) {
    return new Promise(resolve => {
        const el = document.querySelector(sel);
        if (el) { resolve(el); return; }
        
        const obs = new MutationObserver(() => {
            const el = document.querySelector(sel);
            if (el) { obs.disconnect(); resolve(el); }
        });
        obs.observe(document.documentElement, { childList: true, subtree: true });
    });
}

// ============================================================
// SYNC GAME STATE (SAN -> UCI conversion)
// ============================================================
function syncGameState() {
    if (!ChessEngine) return;
    
    // Reset WASM/Fallback engine
    game = new ChessEngine();
    
    // Initialize sync chess if needed
    if (!syncChess) syncChess = new Chess();
    syncChess.reset();
    
    const moves = document.querySelectorAll('kwdb, u8t');
    let moveCount = 0;
    
    for (const moveEl of moves) {
        const san = moveEl.textContent.replace('✓', '').trim();
        if (!san) continue;
        
        try {
            // Use Chess.js to parse SAN and get move details
            const result = syncChess.move(san);
            if (result) {
                // Convert to UCI format
                const uci = result.from + result.to + (result.promotion || '');
                
                // Make move in our engine (WASM or fallback)
                if (game.make_move(uci)) {
                    moveCount++;
                } else {
                    console.warn(`[Sync] Engine rejected: ${uci}`);
                }
            }
        } catch (e) {
            console.warn(`[Sync] Failed to parse: ${san}`, e);
        }
    }
    
    console.log(`[Sync] ${moveCount} moves | Turn: ${game.turn()} | Pieces: ${game.piece_count()}`);
}

// ============================================================
// MOVE SELECTION (Anti-Draw)
// ============================================================
function selectVariedMove(pvs) {
    if (!pvs || pvs.length === 0) return null;

    const valid = [];
    const cfg = activeConfig.varied;

    for (let i = 0; i < pvs.length && i < 4; i++) {
        if (!pvs[i]?.firstMove) continue;
        
        const uci = pvs[i].firstMove;

        // Check if move causes draw
        if (game.move_causes_draw(uci)) {
            console.log(`[Anti-Draw] 🚫 Skipping ${uci}`);
            continue;
        }

        valid.push({ ...pvs[i], idx: i });
    }

    // Fallback if all moves are draws
    if (valid.length === 0) {
        console.log('[Anti-Draw] ⚠️ Forced draw');
        for (let i = 0; i < pvs.length && i < 4; i++) {
            if (pvs[i]) valid.push({ ...pvs[i], idx: i });
        }
    }

    if (valid.length === 0) return null;

    const topEval = valid[0].evalCp || 0;

    // Blunder logic
    let allowBlunder = gameBlunderCount < cfg.maxBlundersPerGame && 
                       topEval > -100 && 
                       Math.random() < cfg.blunderChance;

    const candidates = [];
    for (const pv of valid) {
        const cpLoss = topEval - (pv.evalCp || 0);
        
        if (pv.evalType === 'mate' && pv.mateVal < 0 && pv.mateVal >= -3) continue;
        if (cpLoss > cfg.maxCpLoss && !allowBlunder) continue;

        let weight = cfg.weights[pv.idx] || 5;
        weight = Math.max(weight - cpLoss * 0.1, 3);
        
        candidates.push({ ...pv, weight, cpLoss, isBlunder: cpLoss >= cfg.blunderThreshold });
    }

    if (candidates.length === 0) {
        varietyStats.pv1++;
        return { ...valid[0], move: valid[0].firstMove };
    }

    // Weighted random selection
    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = candidates[0];

    for (const c of candidates) {
        rand -= c.weight;
        if (rand <= 0) { selected = c; break; }
    }

    const pvKey = `pv${selected.idx + 1}`;
    if (varietyStats[pvKey] !== undefined) varietyStats[pvKey]++;
    
    if (selected.isBlunder) {
        gameBlunderCount++;
        varietyStats.blunders++;
        console.log(`[Vary] ⚠️ BLUNDER! (${gameBlunderCount}/${cfg.maxBlundersPerGame})`);
    }

    return { ...selected, move: selected.firstMove };
}

// ============================================================
// EXECUTE MOVE
// ============================================================
function executeMove(uci) {
    if (!uci || !webSocketWrapper || webSocketWrapper.readyState !== 1) return false;

    const cgWrap = document.querySelector('.cg-wrap');
    if (!cgWrap) return false;

    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (game.turn() !== myCol) return false;

    const now = Date.now();
    const clockSecs = getClockSeconds();

    if (clockSecs > 2.0 && uci === lastMoveSent && (now - lastMoveSentTime) < 200) {
        console.log(`[Exec] ⚠️ Duplicate: ${uci}`);
        return false;
    }

    lastMoveSent = uci;
    lastMoveSentTime = now;

    console.log(`[Exec] ✅ ${uci}`);
    webSocketWrapper.send(JSON.stringify({ 
        t: "move", 
        d: { u: uci, a: currentAck, b: 0, l: 10000 } 
    }));
    
    return true;
}

function executeMoveHumanized(uci) {
    if (!uci) return;

    const clockSecs = getClockSeconds();

    // Low time - instant
    if (clockSecs < panicThreshold) {
        console.log(`[⚡ PANIC] ${uci}`);
        executeMove(uci);
        return;
    }

    // Capture - instant
    const targetPiece = game.get(uci.substring(2, 4));
    if (targetPiece) {
        console.log(`[⚡ CAPTURE] ${uci}`);
        executeMove(uci);
        return;
    }

    // Human delay
    const cfg = activeConfig.human;
    let delay = cfg.baseDelayMs * (0.75 + Math.random() * 0.5);
    
    if (Math.random() < cfg.quickMoveChance) delay = Math.random() * 50;
    else if (Math.random() < cfg.tankChance) delay = 400 + Math.random() * 400;

    delay = Math.min(delay, cfg.maxDelayMs);

    console.log(`[Human] ${uci} | ${Math.round(delay)}ms`);
    setTimeout(() => executeMove(uci), delay);
}

// ============================================================
// STOCKFISH ANALYSIS
// ============================================================
function getMultiPV(fen) {
    return new Promise((resolve) => {
        if (typeof stockfish === 'undefined' || !engineReady) {
            resolve([]);
            return;
        }

        const pvs = new Map();
        let resolved = false;

        const clockSecs = getClockSeconds();
        const isLowTime = clockSecs < panicThreshold;

        const handler = (e) => {
            if (resolved) return;
            const txt = String(e.data || '');

            if (txt.startsWith('info ')) {
                const mpv = txt.match(/multipv (\d+)/);
                const cp = txt.match(/score cp (-?\d+)/);
                const mate = txt.match(/score mate (-?\d+)/);
                const pv = txt.match(/ pv (.+)$/);

                if (pv) {
                    let evalCp = null, evalType = 'cp', mateVal = null;
                    if (cp) evalCp = parseInt(cp[1]);
                    else if (mate) {
                        mateVal = parseInt(mate[1]);
                        evalCp = (mateVal > 0 ? 100000 : -100000) + mateVal;
                        evalType = 'mate';
                    }

                    if (evalCp !== null) {
                        pvs.set(mpv ? parseInt(mpv[1]) : 1, {
                            multipv: mpv ? parseInt(mpv[1]) : 1,
                            evalType, evalCp, mateVal,
                            firstMove: pv[1].trim().split(' ')[0]
                        });
                    }
                }
            }

            if (txt.startsWith('bestmove')) {
                resolved = true;
                sfListeners.delete(handler);
                resolve([...pvs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v));
            }
        };

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                sfListeners.delete(handler);
                resolve([...pvs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v));
            }
        }, isLowTime ? 400 : 2000);

        sfListeners.add(handler);
        stockfish.postMessage('stop');
        stockfish.postMessage('position fen ' + fen);
        stockfish.postMessage(isLowTime ? 'go depth 1' : `go movetime ${activeConfig.engineMs}`);
    });
}

// ============================================================
// PROCESS TURN
// ============================================================
async function processTurn() {
    if (isProcessing || !game) return;

    const cgWrap = document.querySelector('.cg-wrap');
    if (!cgWrap || !autoHint) return;

    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (game.turn() !== myCol) return;

    isProcessing = true;
    panicThreshold = 1.0 + Math.random() * 0.7;

    try {
        // Get FEN - use syncChess if WASM doesn't support FEN
        let fen;
        if (useWasm && !game.fen()) {
            fen = syncChess ? syncChess.fen() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        } else {
            fen = game.fen();
        }
        
        const pvs = await getMultiPV(fen);

        if (!pvs || pvs.length === 0) {
            isProcessing = false;
            setTimeout(processTurn, 500);
            return;
        }

        const chosen = variedMode ? selectVariedMove(pvs) : { ...pvs[0], move: pvs[0].firstMove };

        if (chosen?.move) {
            if (humanMode) executeMoveHumanized(chosen.move);
            else executeMove(chosen.move);
        }
    } catch (err) {
        console.error('[Turn] Error:', err);
    }

    isProcessing = false;
}

// ============================================================
// RESET
// ============================================================
function resetStats() {
    gameBlunderCount = 0;
    varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
    isProcessing = false;
    lastMoveSent = null;
    lastMoveSentTime = 0;
    if (syncChess) syncChess.reset();
    console.log('[Stats] Reset');
}

// ============================================================
// UI
// ============================================================
function createUI() {
    const btnCont = document.querySelector('div.ricons');
    if (!btnCont) return;

    // Auto button
    const autoBtn = document.createElement('button');
    autoBtn.innerText = autoHint ? 'Auto-ON' : 'Auto-OFF';
    autoBtn.classList.add('fbt');
    autoBtn.style.backgroundColor = autoHint ? "green" : "";
    autoBtn.onclick = () => {
        autoHint = !autoHint;
        localStorage.setItem('autorun', autoHint ? "1" : "0");
        autoBtn.innerText = autoHint ? 'Auto-ON' : 'Auto-OFF';
        autoBtn.style.backgroundColor = autoHint ? "green" : "";
        if (autoHint) { isProcessing = false; processTurn(); }
    };
    btnCont.appendChild(autoBtn);

    // Config button
    const CFG_ORDER = ['7.5s', '15s', '30s'];
    const CFG_COLORS = { '7.5s': "#8E44AD", '15s': "#A93226", '30s': "#229954" };

    const configBtn = document.createElement('button');
    configBtn.innerText = `Cfg: ${configMode}`;
    configBtn.classList.add('fbt');
    configBtn.style.backgroundColor = CFG_COLORS[configMode] || "#229954";
    configBtn.style.fontSize = "10px";
    configBtn.onclick = () => {
        const idx = Math.max(0, CFG_ORDER.indexOf(configMode));
        configMode = CFG_ORDER[(idx + 1) % CFG_ORDER.length];
        activeConfig = PRESETS[configMode];
        localStorage.setItem('configMode', configMode);
        configBtn.innerText = `Cfg: ${configMode}`;
        configBtn.style.backgroundColor = CFG_COLORS[configMode] || "#229954";
    };
    btnCont.appendChild(configBtn);

    // Human button
    const humanBtn = document.createElement('button');
    humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
    humanBtn.classList.add('fbt');
    humanBtn.style.fontSize = "9px";
    humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "";
    humanBtn.onclick = () => {
        humanMode = !humanMode;
        localStorage.setItem('humanMode', humanMode ? "1" : "0");
        humanBtn.innerText = humanMode ? 'Human-ON' : 'Human-OFF';
        humanBtn.style.backgroundColor = humanMode ? "#E74C3C" : "";
        if (humanMode) resetStats();
    };
    btnCont.appendChild(humanBtn);

    // Vary button
    const varyBtn = document.createElement('button');
    varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
    varyBtn.classList.add('fbt');
    varyBtn.style.fontSize = "9px";
    varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "";
    varyBtn.onclick = () => {
        variedMode = !variedMode;
        localStorage.setItem('variedMode', variedMode ? "1" : "0");
        varyBtn.innerText = variedMode ? 'Vary-ON' : 'Vary-OFF';
        varyBtn.style.backgroundColor = variedMode ? "#9B59B6" : "";
    };
    btnCont.appendChild(varyBtn);

    // Engine indicator
    const engineIndicator = document.createElement('span');
    engineIndicator.style.cssText = 'font-size: 9px;color:#888;margin-left:5px;';
    engineIndicator.innerText = useWasm ? '🦀' : '📜';
    engineIndicator.title = useWasm ? 'Using WASM' : 'Using Chess.js';
    btnCont.appendChild(engineIndicator);

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === "w") autoBtn.click();
        if (e.key === "h") humanBtn.click();
        if (e.key === "v") varyBtn.click();
    });
    
    console.log('[UI] ✅ Ready');
}

// ============================================================
// MAIN
// ============================================================
async function run() {
    console.log('[Init] Starting...');
    
    await initChessEngine();
    
    setupStockfish();
    await configureEngine();
    
    game = new ChessEngine();
    syncGameState();

    // Watch for moves
    const moveList = await waitForElement('rm6');
    const observer = new MutationObserver((muts) => {
        for (const mut of muts) {
            if (mut.addedNodes.length === 0) continue;
            
            isProcessing = false;
            lastMoveSent = null;
            lastMoveSentTime = 0;
            
            syncGameState();
            setTimeout(processTurn, 100);
        }
    });
    observer.observe(moveList, { childList: true, subtree: true });

    // Watch for game end
    const rcontrols = document.querySelector('div.rcontrols');
    if (rcontrols) {
        const endObs = new MutationObserver(() => {
            if (rcontrols.textContent.includes("Rematch")) {
                resetStats();
            }
        });
        endObs.observe(rcontrols, { childList: true, subtree: true });
    }

    // Create UI
    waitForElement('div.ricons').then(createUI);

    // Initial turn
    const cgWrap = document.querySelector('.cg-wrap');
    if (cgWrap) {
        const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
        if (game.turn() === myCol && autoHint) {
            setTimeout(processTurn, 500);
        }
    }

    // Fallback polling
    setInterval(() => {
        if (!isProcessing && autoHint) processTurn();
    }, 3000);

    console.log('[Init] ✅ Ready!');
}

waitForElement('rm6').then(run);
