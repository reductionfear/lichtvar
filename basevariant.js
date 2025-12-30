// ==UserScript==
// @name        Lichess Fairy-Stockfish (Embedded)
// @version     6.2
// @description Embedded Fairy-Stockfish WASM - Fixed variant detection & Bottom UI
// @match       https://lichess.org/*
// @grant       none
// @run-at      document-start
// @require     https://raw.githubusercontent.com/mchappychen/lichess-funnies/main/chess.js
// ==/UserScript==

// ============================================================
// EMBEDDED FAIRY-STOCKFISH - Paste your base64 strings here
// ============================================================
const STOCKFISH_JS_BASE64 = "YOUR_JS_BASE64_HERE";
const STOCKFISH_WASM_BASE64 = "YOUR_WASM_BASE64_HERE";

// ============================================================
// BASE64 DECODER
// ============================================================
function base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

function base64ToString(base64) {
    return atob(base64);
}

// ============================================================
// VARIANT DETECTION (FIXED)
// ============================================================
const VARIANTS = {
    'standard': { uci: 'chess', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    'crazyhouse': { uci: 'crazyhouse', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR[] w KQkq - 0 1' },
    'atomic': { uci: 'atomic', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    'antichess': { uci: 'antichess', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w - - 0 1' },
    'kingOfTheHill': { uci: 'kingofthehill', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
    'threeCheck': { uci: '3check', startFen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 3+3 0 1' },
    'horde': { uci: 'horde', startFen: 'rnbqkbnr/pppppppp/8/1PP2PP1/PPPPPPPP/PPPPPPPP/PPPPPPPP w kq - 0 1' },
    'racingKings': { uci: 'racingkings', startFen: '8/8/8/8/8/8/krbnNBRK/qrbnNBRQ w - - 0 1' },
};

function detectVariant() {
    // Method 1: Check URL path
    const url = window.location.href.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    
    // Direct URL checks
    if (url.includes('crazyhouse') || path.includes('crazyhouse')) return 'crazyhouse';
    if (url.includes('atomic') || path.includes('atomic')) return 'atomic';
    if (url.includes('antichess') || path.includes('antichess')) return 'antichess';
    if (url.includes('kingofthehill') || path.includes('kingofthehill')) return 'kingOfTheHill';
    if (url.includes('threecheck') || url.includes('3check') || path.includes('threecheck')) return 'threeCheck';
    if (url.includes('horde') || path.includes('horde')) return 'horde';
    if (url.includes('racingkings') || path.includes('racingkings')) return 'racingKings';
    
    // Method 2: Check game info in DOM
    const gameInfoSelectors = [
        '.game__meta .header .setup',
        '.game__meta',
        '.setup',
        '.variant-link',
        '.header .setup',
        'section.game__meta',
        '.crosstable__users',
        '.game-infos'
    ];
    
    for (const selector of gameInfoSelectors) {
        const el = document.querySelector(selector);
        if (el) {
            const text = el.textContent.toLowerCase();
            if (text.includes('crazyhouse')) return 'crazyhouse';
            if (text.includes('atomic')) return 'atomic';
            if (text.includes('antichess') || text.includes('suicide')) return 'antichess';
            if (text.includes('king of the hill')) return 'kingOfTheHill';
            if (text.includes('three-check') || text.includes('3check') || text.includes('three check')) return 'threeCheck';
            if (text.includes('horde')) return 'horde';
            if (text.includes('racing kings')) return 'racingKings';
        }
    }
    
    // Method 3: Check for variant-specific elements
    if (document.querySelector('.pocket') || document.querySelector('piece.pocket')) {
        return 'crazyhouse';
    }
    
    // Method 4: Check data attributes
    const gameEl = document.querySelector('.round__app');
    if (gameEl) {
        const dataVariant = gameEl.getAttribute('data-variant');
        if (dataVariant) {
            const v = dataVariant.toLowerCase();
            if (v.includes('crazyhouse')) return 'crazyhouse';
            if (v.includes('atomic')) return 'atomic';
            if (v.includes('antichess')) return 'antichess';
            if (v.includes('kingofthehill')) return 'kingOfTheHill';
            if (v.includes('threecheck') || v.includes('3check')) return 'threeCheck';
            if (v.includes('horde')) return 'horde';
            if (v.includes('racingkings')) return 'racingKings';
        }
    }
    
    // Method 5: Check Lichess global object
    try {
        if (window.lichess?.data?.game?.variant?.key) {
            const key = window.lichess.data.game.variant.key.toLowerCase();
            if (key === 'crazyhouse') return 'crazyhouse';
            if (key === 'atomic') return 'atomic';
            if (key === 'antichess') return 'antichess';
            if (key === 'kingofthehill') return 'kingOfTheHill';
            if (key === 'threecheck') return 'threeCheck';
            if (key === 'horde') return 'horde';
            if (key === 'racingkings') return 'racingKings';
        }
    } catch (e) {}
    
    // Method 6: Check page title
    const title = document.title.toLowerCase();
    if (title.includes('crazyhouse')) return 'crazyhouse';
    if (title.includes('atomic')) return 'atomic';
    if (title.includes('antichess')) return 'antichess';
    if (title.includes('king of the hill')) return 'kingOfTheHill';
    if (title.includes('three-check')) return 'threeCheck';
    if (title.includes('horde')) return 'horde';
    if (title.includes('racing kings')) return 'racingKings';
    
    return 'standard';
}

// Re-detect variant periodically (for SPA navigation)
let currentVariant = 'standard';
let variantCheckInterval = null;

function startVariantDetection() {
    // Check immediately
    const detected = detectVariant();
    if (detected !== currentVariant) {
        currentVariant = detected;
        console.log(`[Variant] Detected: ${currentVariant}`);
        updateEngineVariant();
    }
    
    // Check periodically for SPA navigation
    if (!variantCheckInterval) {
        variantCheckInterval = setInterval(() => {
            const detected = detectVariant();
            if (detected !== currentVariant) {
                currentVariant = detected;
                console.log(`[Variant] Changed to: ${currentVariant}`);
                updateEngineVariant();
            }
        }, 1000);
    }
}

function updateEngineVariant() {
    if (fairyEngine && engineReady) {
        const variantUci = VARIANTS[currentVariant]?.uci || 'chess';
        fairyEngine.postMessage(`setoption name UCI_Variant value ${variantUci}`);
        fairyEngine.postMessage('isready');
        console.log(`[Engine] Variant set: ${variantUci}`);
    }
}

// ============================================================
// EMBEDDED ENGINE LOADER
// ============================================================
let fairyEngine = null;
let engineReady = false;
let stockfishType = 'none';
const sfListeners = new Set();

async function loadEmbeddedFairyStockfish() {
    console.log('[Fairy-SF] Loading embedded engine...');
    
    if (!STOCKFISH_JS_BASE64 || STOCKFISH_JS_BASE64.includes('YOUR_') ||
        !STOCKFISH_WASM_BASE64 || STOCKFISH_WASM_BASE64.includes('YOUR_')) {
        console.error('[Fairy-SF] ❌ Base64 not embedded!');
        return null;
    }
    
    try {
        const stockfishJs = base64ToString(STOCKFISH_JS_BASE64);
        const wasmBinary = base64ToArrayBuffer(STOCKFISH_WASM_BASE64);
        
        console.log(`[Fairy-SF] Decoded JS: ${stockfishJs.length} bytes, WASM: ${wasmBinary.byteLength} bytes`);
        
        const workerCode = `
            let engine = null;
            let wasmBinary = null;
            
            const originalFetch = self.fetch;
            self.fetch = async function(url, options) {
                if (url.endsWith('.wasm') && wasmBinary) {
                    return new Response(wasmBinary, {
                        status: 200,
                        headers: { 'Content-Type': 'application/wasm' }
                    });
                }
                return originalFetch(url, options);
            };
            
            self.onmessage = async function(e) {
                const msg = e.data;
                
                if (msg.type === 'init') {
                    try {
                        wasmBinary = msg.wasmBinary;
                        eval(msg.stockfishJs);
                        
                        if (typeof Stockfish === 'function') {
                            Stockfish().then(sf => {
                                engine = sf;
                                engine.addMessageListener(line => {
                                    self.postMessage({ type: 'sf', data: line });
                                });
                                self.postMessage({ type: 'ready' });
                            }).catch(err => {
                                self.postMessage({ type: 'error', data: 'Init: ' + err.message });
                            });
                        } else {
                            self.postMessage({ type: 'error', data: 'Stockfish not found' });
                        }
                    } catch (err) {
                        self.postMessage({ type: 'error', data: err.message });
                    }
                } else if (msg.type === 'cmd' && engine) {
                    engine.postMessage(msg.data);
                }
            };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        
        return new Promise((resolve) => {
            const timeout = setTimeout(() => {
                console.error('[Fairy-SF] Timeout');
                resolve(null);
            }, 30000);
            
            worker.onmessage = (e) => {
                const msg = e.data;
                
                if (msg.type === 'ready') {
                    clearTimeout(timeout);
                    console.log('[Fairy-SF] ✅ Embedded engine ready!');
                    engineReady = true;
                    stockfishType = 'fairy-embedded';
                    
                    fairyEngine = {
                        postMessage: (cmd) => worker.postMessage({ type: 'cmd', data: cmd }),
                        terminate: () => worker.terminate()
                    };
                    
                    resolve(fairyEngine);
                } else if (msg.type === 'sf') {
                    if (msg.data === 'readyok') engineReady = true;
                    for (const fn of sfListeners) {
                        try { fn({ data: msg.data }); } catch {}
                    }
                } else if (msg.type === 'error') {
                    console.error('[Fairy-SF] Error:', msg.data);
                }
            };
            
            worker.postMessage({
                type: 'init',
                stockfishJs: stockfishJs,
                wasmBinary: wasmBinary
            }, [wasmBinary]);
        });
        
    } catch (e) {
        console.error('[Fairy-SF] Load error:', e);
        return null;
    }
}

// ============================================================
// UCI PARSING
// ============================================================
function parseUci(uci) {
    if (!uci || uci.length < 2) return null;
    
    // Drop: P@e4, N@f3
    const dropMatch = uci.match(/^([PNBRQK])@([a-h][1-8])$/i);
    if (dropMatch) {
        return { type: 'drop', piece: dropMatch[1].toUpperCase(), to: dropMatch[2], uci: uci.toUpperCase() };
    }
    
    // Normal move
    if (uci.length >= 4) {
        const files = { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6, h: 7 };
        const ranks = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7 };
        const promos = { q: 1, r: 2, b: 3, n: 4 };
        
        const ff = files[uci[0]], fr = ranks[uci[1]];
        const tf = files[uci[2]], tr = ranks[uci[3]];
        const p = uci.length > 4 ? (promos[uci[4]] || 0) : 0;
        
        if (ff !== undefined && fr !== undefined && tf !== undefined && tr !== undefined) {
            return { type: 'move', from: uci.substring(0, 2), to: uci.substring(2, 4),
                     fromFile: ff, fromRank: fr, toFile: tf, toRank: tr, promo: p, uci };
        }
    }
    return null;
}

// ============================================================
// CHESS ENGINE FALLBACK
// ============================================================
class ChessEngineFallback {
    constructor() { this._chess = new Chess(); this._variant = 'standard'; }
    setVariant(v) { this._variant = v; this.reset(); }
    getVariant() { return this._variant; }
    reset() { this._chess = new Chess(); }
    fen() { return this._chess.fen(); }
    turn() { return this._chess.turn(); }
    
    make_move(uci) {
        const parsed = parseUci(uci);
        if (!parsed) return false;
        if (parsed.type === 'drop') return true;
        try {
            return !!this._chess.move({ from: parsed.from, to: parsed.to,
                promotion: parsed.promo > 0 ? ['', 'q', 'r', 'b', 'n'][parsed.promo] : undefined });
        } catch (e) { return false; }
    }
    
    make_san(san) {
        if (san.includes('@')) return true;
        try { return !!this._chess.move(san); } catch (e) { return false; }
    }
    
    get(sq) {
        const piece = this._chess.get(sq);
        return piece ? piece.color + piece.type : '';
    }
    
    move_causes_draw(uci) {
        const parsed = parseUci(uci);
        if (!parsed || parsed.type === 'drop') return false;
        try {
            const result = this._chess.move({ from: parsed.from, to: parsed.to, promotion: 'q' });
            if (!result) return false;
            const isDraw = this._chess.in_draw() || this._chess.in_threefold_repetition();
            this._chess.undo();
            return isDraw;
        } catch (e) { return false; }
    }
}

// ============================================================
// GLOBALS
// ============================================================
let game = null;
let syncChess = null;
let moveCount = 0;
let moveHistory = [];
let cachedFen = null;

let autoHint = localStorage.getItem('autorun') === "1";
let humanMode = localStorage.getItem('humanMode') === "1";
let variedMode = localStorage.getItem('variedMode') !== "0";
let configMode = localStorage.getItem('configMode') || "15s";

const PRESETS = {
    '7.5s': { engineMs: 12, varied: { maxCpLoss: 900, weights: [8, 40, 28, 24], maxBlundersPerGame: 50, blunderThreshold: 100, blunderChance: 0.45 }, human: { baseDelayMs: 180, maxDelayMs: 600, quickMoveChance: 0.35, tankChance: 0.008 } },
    '15s': { engineMs: 20, varied: { maxCpLoss: 300, weights: [10, 45, 23, 22], maxBlundersPerGame: 10, blunderThreshold: 100, blunderChance: 0.16 }, human: { baseDelayMs: 250, maxDelayMs: 800, quickMoveChance: 0.25, tankChance: 0.01 } },
    '30s': { engineMs: 60, varied: { maxCpLoss: 200, weights: [30, 55, 10, 5], maxBlundersPerGame: 5, blunderThreshold: 100, blunderChance: 0.08 }, human: { baseDelayMs: 500, maxDelayMs: 1200, quickMoveChance: 0.20, tankChance: 0.05 } }
};

let activeConfig = PRESETS[configMode] || PRESETS['15s'];
let gameBlunderCount = 0;
let varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
let isProcessing = false;
let panicThreshold = 1.5;
let lastMoveSent = null;
let lastMoveSentTime = 0;

// WebSocket
let webSocketWrapper = null;
let currentAck = 0;

const webSocketProxy = new Proxy(window.WebSocket, {
    construct(target, args) {
        const ws = new target(...args);
        webSocketWrapper = ws;
        ws.addEventListener("message", (event) => {
            try {
                const msg = JSON.parse(event.data);
                if (msg.t === 'move' && msg.d?.ply !== undefined) currentAck = msg.d.ply;
            } catch (e) {}
        });
        return ws;
    }
});
window.WebSocket = webSocketProxy;

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

function getCurrentTurn() { return (moveCount % 2 === 0) ? 'w' : 'b'; }

// ============================================================
// SYNC GAME STATE
// ============================================================
function syncGameState() {
    // Re-detect variant each sync
    startVariantDetection();
    
    game = new ChessEngineFallback();
    game.setVariant(currentVariant);
    
    if (!syncChess) syncChess = new Chess();
    syncChess.reset();
    
    const moves = document.querySelectorAll('kwdb, u8t');
    moveCount = 0;
    moveHistory = [];
    
    for (const moveEl of moves) {
        const san = moveEl.textContent.replace('✓', '').trim();
        if (!san) continue;
        
        try {
            // Crazyhouse drop
            if (san.includes('@')) {
                const dropMatch = san.match(/([PNBRQK])@([a-h][1-8])/i);
                if (dropMatch) {
                    const uci = dropMatch[1].toUpperCase() + '@' + dropMatch[2].toLowerCase();
                    game.make_move(uci);
                    moveHistory.push(uci);
                    moveCount++;
                }
                continue;
            }
            
            // Normal move
            const result = syncChess.move(san);
            if (result) {
                const uci = result.from + result.to + (result.promotion || '');
                game.make_move(uci);
                moveHistory.push(uci);
                moveCount++;
            }
        } catch (e) {}
    }
    
    cachedFen = syncChess.fen();
    console.log(`[Sync] ${currentVariant} | ${moveCount} moves | Turn: ${getCurrentTurn()}`);
}

// ============================================================
// STOCKFISH
// ============================================================
function configureEngine() {
    return new Promise((resolve) => {
        if (!fairyEngine) { resolve(); return; }
        
        fairyEngine.postMessage('uci');
        fairyEngine.postMessage('setoption name Threads value 1');
        fairyEngine.postMessage('setoption name MultiPV value 4');
        
        // Set variant
        const variantUci = VARIANTS[currentVariant]?.uci || 'chess';
        fairyEngine.postMessage(`setoption name UCI_Variant value ${variantUci}`);
        console.log(`[Engine] Configuring for variant: ${variantUci}`);
        
        fairyEngine.postMessage('isready');

        const check = setInterval(() => { if (engineReady) { clearInterval(check); resolve(); } }, 50);
        setTimeout(() => { clearInterval(check); engineReady = true; resolve(); }, 10000);
    });
}

function getMultiPV(fen) {
    return new Promise((resolve) => {
        if (!fairyEngine || !engineReady) { 
            console.log('[SF] Engine not ready');
            resolve([]); 
            return; 
        }

        const pvs = new Map();
        let resolved = false;
        const isLowTime = getClockSeconds() < panicThreshold;

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
                const result = [...pvs.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);
                console.log(`[SF] ${result.length} PVs: `, result.map(p => p.firstMove).join(', '));
                resolve(result);
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
        fairyEngine.postMessage('stop');
        
        // Use position with moves for variants (especially Crazyhouse)
        if (moveHistory.length > 0) {
            const startFen = VARIANTS[currentVariant]?.startFen || VARIANTS['standard'].startFen;
            const posCmd = `position fen ${startFen} moves ${moveHistory.join(' ')}`;
            console.log(`[SF] ${posCmd.substring(0, 80)}...`);
            fairyEngine.postMessage(posCmd);
        } else {
            fairyEngine.postMessage('position fen ' + fen);
        }
        
        fairyEngine.postMessage(isLowTime ? 'go depth 1' : `go movetime ${activeConfig.engineMs}`);
    });
}

// ============================================================
// MOVE SELECTION & EXECUTION
// ============================================================
function selectVariedMove(pvs) {
    if (!pvs || pvs.length === 0) return null;
    const cfg = activeConfig.varied;
    const valid = [];

    for (let i = 0; i < pvs.length && i < 4; i++) {
        if (!pvs[i]?.firstMove) continue;
        const uci = pvs[i].firstMove;
        const parsed = parseUci(uci);
        if (parsed?.type !== 'drop' && game.move_causes_draw(uci)) continue;
        valid.push({ ...pvs[i], idx: i });
    }

    if (valid.length === 0) {
        for (let i = 0; i < pvs.length && i < 4; i++) {
            if (pvs[i]) valid.push({ ...pvs[i], idx: i });
        }
    }
    if (valid.length === 0) return null;

    const topEval = valid[0].evalCp || 0;
    const allowBlunder = gameBlunderCount < cfg.maxBlundersPerGame && topEval > -100 && Math.random() < cfg.blunderChance;

    const candidates = [];
    for (const pv of valid) {
        const cpLoss = topEval - (pv.evalCp || 0);
        if (pv.evalType === 'mate' && pv.mateVal < 0 && pv.mateVal >= -3) continue;
        if (cpLoss > cfg.maxCpLoss && !allowBlunder) continue;
        let weight = Math.max((cfg.weights[pv.idx] || 5) - cpLoss * 0.1, 3);
        candidates.push({ ...pv, weight, isBlunder: cpLoss >= cfg.blunderThreshold });
    }

    if (candidates.length === 0) { varietyStats.pv1++; return { ...valid[0], move: valid[0].firstMove }; }

    const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
    let rand = Math.random() * totalWeight;
    let selected = candidates[0];
    for (const c of candidates) { rand -= c.weight; if (rand <= 0) { selected = c; break; } }

    varietyStats[`pv${selected.idx + 1}`]++;
    if (selected.isBlunder) { gameBlunderCount++; varietyStats.blunders++; }
    return { ...selected, move: selected.firstMove };
}

function executeMove(uci) {
    if (!uci || !webSocketWrapper || webSocketWrapper.readyState !== 1) return false;
    const cgWrap = document.querySelector('.cg-wrap');
    if (!cgWrap) return false;

    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (getCurrentTurn() !== myCol) return false;

    const now = Date.now();
    if (getClockSeconds() > 2.0 && uci === lastMoveSent && (now - lastMoveSentTime) < 300) return false;

    lastMoveSent = uci;
    lastMoveSentTime = now;

    const parsed = parseUci(uci);
    console.log(`[Exec] ✅ ${parsed?.type === 'drop' ? 'DROP' : 'MOVE'}: ${uci}`);
    
    webSocketWrapper.send(JSON.stringify({ t: "move", d: { u: uci, a: currentAck, b: 0, l: 10000 } }));
    return true;
}

function executeMoveHumanized(uci) {
    if (!uci) return;
    const clockSecs = getClockSeconds();
    if (clockSecs < panicThreshold) { executeMove(uci); return; }

    const parsed = parseUci(uci);
    if (parsed?.type === 'drop') { setTimeout(() => executeMove(uci), Math.random() * 100); return; }
    if (parsed?.type === 'move' && game.get(parsed.to)) { executeMove(uci); return; }

    const cfg = activeConfig.human;
    let delay = cfg.baseDelayMs * (0.75 + Math.random() * 0.5);
    if (Math.random() < cfg.quickMoveChance) delay = Math.random() * 50;
    else if (Math.random() < cfg.tankChance) delay = 400 + Math.random() * 400;
    setTimeout(() => executeMove(uci), Math.min(delay, cfg.maxDelayMs));
}

// ============================================================
// PROCESS TURN
// ============================================================
async function processTurn() {
    if (isProcessing) return;
    const cgWrap = document.querySelector('.cg-wrap');
    if (!cgWrap || !autoHint) return;

    const myCol = cgWrap.classList.contains('orientation-white') ? 'w' : 'b';
    if (getCurrentTurn() !== myCol) return;

    isProcessing = true;
    panicThreshold = 1.0 + Math.random() * 0.7;

    try {
        const fen = cachedFen || VARIANTS['standard'].startFen;
        const pvs = await getMultiPV(fen);

        if (!pvs || pvs.length === 0) {
            console.log('[Turn] No moves from engine');
            isProcessing = false;
            setTimeout(processTurn, 500);
            return;
        }

        const chosen = variedMode ? selectVariedMove(pvs) : { ...pvs[0], move: pvs[0].firstMove };
        if (chosen?.move) {
            console.log(`[Turn] Playing: ${chosen.move}`);
            if (humanMode) executeMoveHumanized(chosen.move);
            else executeMove(chosen.move);
        }
    } catch (err) { console.error('[Turn]', err); }

    isProcessing = false;
}

// ============================================================
// RESET & UI
// ============================================================
function resetStats() {
    gameBlunderCount = 0;
    varietyStats = { pv1: 0, pv2: 0, pv3: 0, pv4: 0, blunders: 0 };
    isProcessing = false;
    lastMoveSent = null;
    moveCount = 0;
    moveHistory = [];
    if (syncChess) syncChess.reset();
}

function createUI() {
    // Remove existing if any
    const existing = document.getElementById('fairy-ui-bar');
    if (existing) existing.remove();

    const btnCont = document.createElement('div');
    btnCont.id = 'fairy-ui-bar';
    btnCont.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        height: 40px;
        background: #262421;
        border-top: 1px solid #404040;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        z-index: 10000;
        box-shadow: 0 -4px 10px rgba(0,0,0,0.3);
        font-family: 'Noto Sans', sans-serif;
    `;
    
    const btnStyle = `
        background: none;
        border: 1px solid #404040;
        border-radius: 4px;
        padding: 4px 10px;
        color: #bababa;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
        font-weight: bold;
    `;

    // Auto Button
    const autoBtn = document.createElement('button');
    autoBtn.innerText = autoHint ? 'Auto: ON' : 'Auto: OFF';
    autoBtn.style.cssText = btnStyle;
    if (autoHint) {
        autoBtn.style.background = '#229954';
        autoBtn.style.borderColor = '#229954';
        autoBtn.style.color = '#fff';
    }
    
    autoBtn.onclick = () => {
        autoHint = !autoHint;
        localStorage.setItem('autorun', autoHint ? "1" : "0");
        autoBtn.innerText = autoHint ? 'Auto: ON' : 'Auto: OFF';
        if (autoHint) {
            autoBtn.style.background = '#229954';
            autoBtn.style.borderColor = '#229954';
            autoBtn.style.color = '#fff';
            isProcessing = false; 
            processTurn();
        } else {
            autoBtn.style.background = 'none';
            autoBtn.style.borderColor = '#404040';
            autoBtn.style.color = '#bababa';
        }
    };
    btnCont.appendChild(autoBtn);

    // Config Button
    const CFG_ORDER = ['7.5s', '15s', '30s'];
    const CFG_COLORS = { '7.5s': "#8E44AD", '15s': "#A93226", '30s': "#229954" };

    const configBtn = document.createElement('button');
    configBtn.innerText = `Cfg: ${configMode}`;
    configBtn.style.cssText = btnStyle;
    configBtn.style.borderColor = CFG_COLORS[configMode] || "#404040";
    configBtn.style.color = CFG_COLORS[configMode] || "#bababa";
    
    configBtn.onclick = () => {
        const idx = Math.max(0, CFG_ORDER.indexOf(configMode));
        configMode = CFG_ORDER[(idx + 1) % CFG_ORDER.length];
        activeConfig = PRESETS[configMode];
        localStorage.setItem('configMode', configMode);
        
        configBtn.innerText = `Cfg: ${configMode}`;
        configBtn.style.borderColor = CFG_COLORS[configMode];
        configBtn.style.color = CFG_COLORS[configMode];
    };
    btnCont.appendChild(configBtn);

    // Human Button
    const humanBtn = document.createElement('button');
    humanBtn.innerText = humanMode ? 'Human: ON' : 'Human: OFF';
    humanBtn.style.cssText = btnStyle;
    if (humanMode) {
        humanBtn.style.background = '#E74C3C';
        humanBtn.style.borderColor = '#E74C3C';
        humanBtn.style.color = '#fff';
    }
    
    humanBtn.onclick = () => {
        humanMode = !humanMode;
        localStorage.setItem('humanMode', humanMode ? "1" : "0");
        humanBtn.innerText = humanMode ? 'Human: ON' : 'Human: OFF';
        if (humanMode) {
            humanBtn.style.background = '#E74C3C';
            humanBtn.style.borderColor = '#E74C3C';
            humanBtn.style.color = '#fff';
        } else {
            humanBtn.style.background = 'none';
            humanBtn.style.borderColor = '#404040';
            humanBtn.style.color = '#bababa';
        }
    };
    btnCont.appendChild(humanBtn);

    // Vary Button
    const varyBtn = document.createElement('button');
    varyBtn.innerText = variedMode ? 'Vary: ON' : 'Vary: OFF';
    varyBtn.style.cssText = btnStyle;
    if (variedMode) {
        varyBtn.style.background = '#9B59B6';
        varyBtn.style.borderColor = '#9B59B6';
        varyBtn.style.color = '#fff';
    }
    
    varyBtn.onclick = () => {
        variedMode = !variedMode;
        localStorage.setItem('variedMode', variedMode ? "1" : "0");
        varyBtn.innerText = variedMode ? 'Vary: ON' : 'Vary: OFF';
        if (variedMode) {
            varyBtn.style.background = '#9B59B6';
            varyBtn.style.borderColor = '#9B59B6';
            varyBtn.style.color = '#fff';
        } else {
            varyBtn.style.background = 'none';
            varyBtn.style.borderColor = '#404040';
            varyBtn.style.color = '#bababa';
        }
    };
    btnCont.appendChild(varyBtn);

    // Engine Indicator
    const indicator = document.createElement('span');
    indicator.style.cssText = 'font-size: 14px; margin-left: 10px; cursor: help;';
    updateIndicator();
    btnCont.appendChild(indicator);
    
    function updateIndicator() {
        let icon = stockfishType.includes('fairy') ? '🧚' : '❌';
        if (currentVariant !== 'standard') icon += ` [${currentVariant}]`;
        indicator.innerText = icon;
        indicator.title = `Engine: ${stockfishType}, Variant: ${currentVariant}`;
    }
    
    // Update indicator periodically
    setInterval(updateIndicator, 1000);

    document.body.appendChild(btnCont);

    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.key === "w") autoBtn.click();
        if (e.key === "h") humanBtn.click();
        if (e.key === "v") varyBtn.click();
    });
}

// ============================================================
// MAIN
// ============================================================
async function run() {
    console.log('[Init] Loading EMBEDDED Fairy-Stockfish...');
    
    // Detect variant BEFORE loading engine
    startVariantDetection();
    console.log(`[Variant] Initial: ${currentVariant}`);
    
    // Load embedded engine
    await loadEmbeddedFairyStockfish();
    
    if (fairyEngine) {
        await configureEngine();
        console.log(`[Engine] ✅ ${stockfishType} configured for ${currentVariant}`);
    } else {
        console.error('[Engine] ❌ Failed to load!');
    }
    
    game = new ChessEngineFallback();
    game.setVariant(currentVariant);
    syncGameState();

    // Watch for moves
    const moveList = await waitForElement('rm6');
    new MutationObserver((muts) => {
        for (const mut of muts) {
            if (mut.addedNodes.length === 0) continue;
            isProcessing = false;
            lastMoveSent = null;
            syncGameState();
            setTimeout(processTurn, 100);
        }
    }).observe(moveList, { childList: true, subtree: true });

    // Watch for game end
    const rcontrols = document.querySelector('div.rcontrols');
    if (rcontrols) {
        new MutationObserver(() => {
            if (rcontrols.textContent.includes("Rematch")) resetStats();
        }).observe(rcontrols, { childList: true, subtree: true });
    }

    createUI();

    // Initial turn check
    const cgWrap = document.querySelector('.cg-wrap');
    if (cgWrap && getCurrentTurn() === (cgWrap.classList.contains('orientation-white') ? 'w' : 'b') && autoHint) {
        setTimeout(processTurn, 500);
    }

    // Fallback polling
    setInterval(() => { if (!isProcessing && autoHint) processTurn(); }, 3000);
    
    console.log('[Init] ✅ Ready!');
}

waitForElement('rm6').then(run);
