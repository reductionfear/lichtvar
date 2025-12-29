# Chess Variant Support

This document describes the chess variant support added to the Lichess automation script.

## Supported Variants

The script now supports all Lichess chess variants:

1. **Standard Chess** - The classic game (backward compatible)
2. **Crazyhouse** - Captured pieces can be dropped back on the board
3. **Atomic** - Captures cause explosions that destroy surrounding pieces
4. **Antichess** - The goal is to lose all your pieces
5. **King of the Hill** - Get your king to the center to win
6. **Three-check** - Give check three times to win
7. **Racing Kings** - Race your king to the 8th rank
8. **Horde** - White has 36 pawns vs Black's normal setup

## Technical Implementation

### Libraries Used

- **chessops**: A modern TypeScript chess library with full variant support
  - Source: `https://raw.githubusercontent.com/redwhitedaffodil/licht-squirrels/main/chessops-bundle.js`
  - Provides: Position management, move parsing (SAN/UCI), FEN handling, variant rules

- **Fairy-Stockfish**: Chess variant engine supporting all variants
  - Source: `https://raw.githubusercontent.com/Psyyke/A.C.A.S/main/app/assets/engines/fairy-stockfish-nnue.wasm/stockfish.js`
  - UCI_Variant option configures the engine for specific variants

### Variant Detection

The script automatically detects the current variant by examining the DOM:

```javascript
function detectVariant() {
  const link = document.querySelector('a.variant-link');
  if (!link) return 'chess';
  
  const href = link.getAttribute('href') || '';
  if (href.includes('crazyhouse')) return 'crazyhouse';
  if (href.includes('atomic')) return 'atomic';
  // ... etc
}
```

### Position Management

Positions are created using chessops variant-specific constructors:

```javascript
// Starting position for a variant
const pos = Crazyhouse.default();

// From FEN string
const setup = parseFen(fen);
const pos = setupPosition('crazyhouse', setup.value);
```

### Move Handling

The script handles both regular moves and Crazyhouse drops:

- **Regular moves**: `e2e4`, `e7e8q` (with promotion)
- **Drop moves**: `N@e4` (Crazyhouse only)

### UCI Variant Names

| Lichess Variant | UCI_Variant Value | chessops Rules |
|-----------------|-------------------|----------------|
| Standard | `chess` | `chess` |
| Crazyhouse | `crazyhouse` | `crazyhouse` |
| Atomic | `atomic` | `atomic` |
| Antichess | `antichess` | `antichess` |
| King of the Hill | `kingofthehill` | `kingofthehill` |
| Three-check | `3check` | `3check` |
| Racing Kings | `racingkings` | `racingkings` |
| Horde | `horde` | `horde` |

## Special Features

### Crazyhouse Drop Visualization

Drop moves are displayed differently from regular moves:
- Regular moves: Arrows from source to target square
- Drop moves: Circles on the target square

### Variant-Specific Logic

- **Horde**: Adjusted piece count defaults (48 pieces instead of 32)
- **Draw detection**: Uses chessops' `isStalemate()` and `isInsufficientMaterial()`
- **Capture detection**: Skips for drop moves (which use `@` notation)

## Testing

To test the variant support:

1. **Standard Chess**: Start a regular game on Lichess
   - The script should work exactly as before
   - Engine configured with `UCI_Variant value chess`

2. **Crazyhouse**: Start a Crazyhouse game
   - Drop moves should be suggested with circles
   - Captured pieces can be dropped with `P@e4` notation
   - Engine configured with `UCI_Variant value crazyhouse`

3. **Other Variants**: Start games in any supported variant
   - Variant should be detected automatically
   - Engine should analyze according to variant rules
   - Arrows/circles should display correctly

## Code Structure

### Key Functions

- `detectVariant()`: Identifies current variant from DOM
- `createPosition(variant, fen)`: Creates position for any variant
- `getFen()`: Gets FEN from current position
- `getTurn()`: Gets current turn ('w' or 'b')
- `playMove(uci)`: Plays a move in UCI notation
- `playMoveSan(san)`: Plays a move in SAN notation
- `configureEngine()`: Configures Fairy-Stockfish with variant

### Compatibility Layer

A `game` object provides chess.js-like API for backward compatibility:

```javascript
const game = {
  fen: () => getFen(),
  turn: () => getTurn(),
  move: (moveOrConfig) => { /* handles both SAN and UCI */ },
  get: (square) => { /* returns piece at square */ }
  // ... etc
}
```

## Future Enhancements

Potential improvements for variant support:

1. **Three-fold repetition**: Track position history for repetition detection
2. **Variant-specific evaluation**: Adjust evaluation display for non-standard goals
3. **Pocket display**: Show captured pieces in Crazyhouse
4. **Check counter**: Display checks given in Three-check variant
5. **King position indicator**: Highlight king position in King of the Hill

## Compatibility Notes

- **Backward Compatible**: Standard chess works exactly as before
- **Immutable Positions**: chessops uses immutable data structures (no clone needed)
- **Security**: No vulnerabilities detected by CodeQL scanner
- **Performance**: Similar to original implementation with chess.js
