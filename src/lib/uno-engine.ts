export type UnoColor = "red" | "yellow" | "green" | "blue" | "pink" | "teal" | "orange" | "purple";

export type WildColor = UnoColor | "wild";

export type CardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4" | "flip"
  | "draw1" | "wild_draw2"    // light side only
  | "draw_to_color"            // dark side only
  | "skip_all"                 // dark side only
  | "draw5";                   // dark side only (+5)

export interface UnoCard {
  id: string;
  color: WildColor;
  value: CardValue;
  darkId?: string;
}

// ── DECK BUILDER (replace the old buildDeck) ──
let idCounter = 0;
const nextId = () => `c${++idCounter}`;

// ── DECK BUILDER ──
export function buildDeck(mode: GameMode, allWild = false): { lightDeck: UnoCard[]; darkDeck: UnoCard[]; flipMap: Record<string, UnoCard> } {
  const light: UnoCard[] = [];
  const dark: UnoCard[] = [];

  // ── All‑Wild mode ──
  if (allWild) {
    for (let i = 0; i < 36; i++) {
      const l: UnoCard = { id: nextId(), color: "wild", value: "wild" };
      const d: UnoCard = { id: nextId(), color: "wild", value: "wild" };
      l.darkId = d.id; d.darkId = l.id;
      light.push(l); dark.push(d);
    }
    for (let i = 0; i < 24; i++) {
      const l: UnoCard = { id: nextId(), color: "wild", value: "wild4" };
      const d: UnoCard = { id: nextId(), color: "wild", value: "wild4" };
      l.darkId = d.id; d.darkId = l.id;
      light.push(l); dark.push(d);
    }
    const flipMap: Record<string, UnoCard> = {};
    for (const c of [...light, ...dark]) {
      if (c.darkId) flipMap[c.id] = [...light, ...dark].find(x => x.id === c.darkId)!;
    }
    return { lightDeck: light, darkDeck: dark, flipMap };
  }

  // ── Standard / Chaos / Custom (no Flip) ──
  if (mode !== "flip") {
    const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
    for (const color of COLORS) {
      light.push({ id: nextId(), color, value: "0" });
      for (let n = 1; n <= 9; n++) {
        for (let d = 0; d < 2; d++) {
          light.push({ id: nextId(), color, value: String(n) as CardValue });
        }
      }
      for (const v of ["skip", "reverse", "draw2"] as CardValue[]) {
        for (let d = 0; d < 2; d++) {
          light.push({ id: nextId(), color, value: v });
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      light.push({ id: nextId(), color: "wild", value: "wild" });
      light.push({ id: nextId(), color: "wild", value: "wild4" });
    }
    return { lightDeck: light, darkDeck: [], flipMap: {} };
  }

  // ── Uno Flip mode ──
  const LIGHT_COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
  const DARK_COLORS: UnoColor[] = ["pink", "teal", "orange", "purple"];

  // Build light and dark decks separately without pairing
  for (let ci = 0; ci < 4; ci++) {
    const lc = LIGHT_COLORS[ci];
    const dc = DARK_COLORS[ci];

    // Numbers 1‑9 (two of each) – no 0 card in Flip
    for (let n = 1; n <= 9; n++) {
      for (let d = 0; d < 2; d++) {
        light.push({ id: nextId(), color: lc, value: String(n) as CardValue });
        dark.push({ id: nextId(), color: dc, value: String(n) as CardValue });
      }
    }

    // Reverse (both sides)
    for (let d = 0; d < 2; d++) {
      light.push({ id: nextId(), color: lc, value: "reverse" });
      dark.push({ id: nextId(), color: dc, value: "reverse" });
    }

    // Light Skip → Dark Skip Everyone
    for (let d = 0; d < 2; d++) {
      light.push({ id: nextId(), color: lc, value: "skip" });
      dark.push({ id: nextId(), color: dc, value: "skip_all" });
    }

    // Light Draw One → Dark Draw Five
    for (let d = 0; d < 2; d++) {
      light.push({ id: nextId(), color: lc, value: "draw1" });
      dark.push({ id: nextId(), color: dc, value: "draw5" });
    }

    // Flip cards
    for (let d = 0; d < 2; d++) {
      light.push({ id: nextId(), color: lc, value: "flip" });
      dark.push({ id: nextId(), color: dc, value: "flip" });
    }
  }

  // Wilds – added independently to each side
  for (let i = 0; i < 4; i++) {
    light.push({ id: nextId(), color: "wild", value: "wild" });
    dark.push({ id: nextId(), color: "wild", value: "wild" });
  }
  for (let i = 0; i < 4; i++) {
    light.push({ id: nextId(), color: "wild", value: "wild_draw2" });
    dark.push({ id: nextId(), color: "wild", value: "draw_to_color" });
  }

  // Both decks must have exactly 112 cards (check official PDF)
  if (light.length !== 112 || dark.length !== 112) {
    throw new Error(`Flip deck sizes wrong: light=${light.length}, dark=${dark.length}`);
  }

  // Shuffle the two decks independently – this gives random, unpredictable pairings
  const shuffledLight = shuffle(light);
  const shuffledDark = shuffle(dark);

  // Now pair them by index – a light card gets a random dark card as its flip side
  const flipMap: Record<string, UnoCard> = {};
  for (let i = 0; i < shuffledLight.length; i++) {
    const l = shuffledLight[i];
    const d = shuffledDark[i];
    l.darkId = d.id;
    d.darkId = l.id;
    flipMap[l.id] = d;
    flipMap[d.id] = l;
  }

  return { lightDeck: shuffledLight, darkDeck: shuffledDark, flipMap };
}

// ⚠️ IMPORTANT: Make sure the file ends right after this function.
// Remove any leftover code that looks like:
//   // Flip cards (if mode === "flip") ...
//   // Wilds (light) and Wilds (dark) ...
//   // Ensure equal lengths ...
// That block is the cause of your build errors.

export type PlayerKind = "human" | "bot";

export interface PlayerConfig {
  name: string;
  kind: PlayerKind;
}

export interface HouseRules {
  stackDraws: boolean;
  jumpIn: boolean;
  forcePlay: boolean;
  drawUntilPlayable: boolean;
  sevenZero: boolean;
  allWild: boolean;
  sameNumberCombo: boolean;
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  stackDraws: true,
  jumpIn: false,
  forcePlay: false,
  drawUntilPlayable: false,
  sevenZero: false,
  allWild: false,
  sameNumberCombo: false,
};

export type GameMode = "standard" | "chaos" | "flip" | "allwild" | "custom";

export const MODE_PRESETS: Record<Exclude<GameMode, "custom">, HouseRules> = {
  standard: { ...DEFAULT_HOUSE_RULES },
  chaos: { ...DEFAULT_HOUSE_RULES, stackDraws: true, jumpIn: true, sevenZero: true },
  flip: { ...DEFAULT_HOUSE_RULES, stackDraws: true, jumpIn: true, forcePlay: true },
  allwild: { ...DEFAULT_HOUSE_RULES, allWild: true },
};
// sameNumberCombo stays false – only toggleable in custom.

export interface PendingSwap {
  type: "swap7";
  from: number;
}

export interface GameState {
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  hands: UnoCard[][];
  players: PlayerConfig[];
  houseRules: HouseRules;
  mode: GameMode;
  gameSide: "light" | "dark";
  currentPlayer: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  pendingDraw: number;
  pendingAction: PendingSwap | null;
  log: string[];
  winner: number | null;
  scores: number[];
  skipNext: boolean;
  flipMap: Record<string, UnoCard>; //new
  queuedSkipNext: boolean;   // <-- add this
  turnSerial?: number;
}

export function cardPointValue(c: UnoCard): number {
  if (c.value === "wild" || c.value === "wild4") return 50;
  if (c.value === "skip" || c.value === "reverse" || c.value === "draw2" || c.value === "flip") return 20;
  return parseInt(c.value, 10) || 0;
}

// ── Uno Flip symmetric card mapping (involution) ──
// Each light card has a dark counterpart and vice‑versa.
// Apply this function after flipping to transform the whole game state.
export function flipCard(card: UnoCard, flipMap: Record<string, UnoCard>): UnoCard {
  if (card.darkId && flipMap[card.darkId]) {
    return flipMap[card.darkId];
  }
  // fallback – should not happen, but keep it safe
  return { ...card, color: "wild", value: "wild" };
}

export function tallyRoundScore(state: GameState, winnerIdx: number): number {
  let total = 0;
  state.hands.forEach((hand, i) => {
    if (i === winnerIdx) return;
    for (const c of hand) total += cardPointValue(c);
  });
  return total;
}
const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Determines whether `card` is a legal play given the current game state.
 *
 * STACKING FIX (Bug #1):
 *   When pendingDraw > 0 and stacking is enabled, the player may play:
 *     - Another +2 (when a +2 is pending)  — escalates the draw
 *     - Any card matching the activeColor   — "colour escape" house rule
 *     - Another +4 (when a +4 is pending)  — escalates the draw
 *   Previously the code only allowed same-value stacking, making it
 *   impossible to play a colour-matching non-draw card.
 */
const isNumberCard = (v: string) => /^[0-9]$/.test(v);

export function isValidMove(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: UnoColor,
  pendingDraw: number,
  rules: HouseRules,
  comboActive = false,
): boolean {
  // Same Number Combo is locked down completely while the chain is active.
  // The only legal follow-up is an exact matching number card.
  if (comboActive) {
    return isNumberCard(card.value) && card.value === topCard.value;
  }

  // ── All-Wild mode: every card plays on everything ──
  if (rules.allWild) return true;

  // ── Pending draw: only stacking moves are legal ──
  if (pendingDraw > 0) {
    if (!rules.stackDraws) return false;

    // Same-value stacking is always allowed.
    if (topCard.value === "draw2" && card.value === "draw2") return true;
    if (topCard.value === "wild4" && card.value === "wild4") return true;

    // Cross-stack: a +2 may answer a +4 only when it matches the chosen colour.
    if (
      topCard.value === "wild4" &&
      card.value === "draw2" &&
      card.color === activeColor
    ) {
      return true;
    }

    // Preserve the existing draw2 -> wild4 escalation rule.
    if (topCard.value === "draw2" && card.value === "wild4") return true;
    return false;
  }

  // Normal turn
  if (card.color === "wild") return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  // allow draw1, wild_draw2, draw_to_color, skip_all, draw5
  if (
    card.value === "draw1" ||
    card.value === "wild_draw2" ||
    card.value === "draw_to_color" ||
    card.value === "skip_all" ||
    card.value === "draw5"
  ) {
    return true;
  }
  return false;
}


export interface NewGameOptions {
  players: PlayerConfig[];
  houseRules?: Partial<HouseRules>;
  mode?: GameMode;
  previousScores?: number[];
}

export function dealNewGame(opts: NewGameOptions): GameState {
  const houseRules: HouseRules = { ...DEFAULT_HOUSE_RULES, ...(opts.houseRules ?? {}) };
  const players = opts.players;
  const { lightDeck, flipMap } = buildDeck(opts.mode ?? "standard", houseRules.allWild);
  let deck = shuffle(lightDeck);
  const hands: UnoCard[][] = [];
  for (let p = 0; p < players.length; p++) {
    hands.push(deck.splice(0, 7));
  }
  let first: UnoCard;
  if (houseRules.allWild) {
    first = deck.splice(0, 1)[0];
  } else {
    let firstIdx = deck.findIndex(
      (c) => c.color !== "wild" && !["skip", "reverse", "draw2", "flip"].includes(c.value),
    );
    if (firstIdx === -1) firstIdx = 0;
    first = deck.splice(firstIdx, 1)[0];
  }
  const startColor: UnoColor =
    first.color === "wild" ? COLORS[Math.floor(Math.random() * 4)] : (first.color as UnoColor);
  return {
    drawPile: deck,
    discardPile: [first],
    hands,
    players,
    houseRules,
    mode: opts.mode ?? "standard",
    gameSide: "light",
    currentPlayer: 0,
    direction: 1,
    activeColor: startColor,
    pendingDraw: 0,
    pendingAction: null,
    log: [`Game started. Top card: ${describe(first)}.`, `${nameOf(players[0])} starts.`],
    winner: null,
    scores:
      opts.previousScores && opts.previousScores.length === players.length
        ? [...opts.previousScores]
        : new Array(players.length).fill(0),
    skipNext: false,
    flipMap,
    queuedSkipNext: false,
    turnSerial: 0,
  };
}

export function nameOf(p: PlayerConfig): string {
  return p.kind === "bot" ? `${p.name} (AI)` : p.name;
}

export function describe(c: UnoCard): string {
  const colorName =
    c.color === "wild" ? "" : c.color.charAt(0).toUpperCase() + c.color.slice(1) + " ";
  const valueName: Record<CardValue, string> = {
    "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
    "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
    skip: "Skip", reverse: "Reverse", draw2: "Draw 2",
    wild: "Wild", wild4: "Wild Draw 4", flip: "Flip",
     draw1: "+1",
      wild_draw2: "Wild +2",
      draw_to_color: "Draw Color",
       skip_all: "Skip All",
       draw5: "+5",
  };
  return (colorName + valueName[c.value]).trim();
}

export function drawCards(state: GameState, playerIdx: number, n: number): GameState {
  const s = cloneState(state);
  for (let i = 0; i < n; i++) {
    if (s.drawPile.length === 0) {
      const top = s.discardPile.pop()!;
      const reshuffled = shuffle(
        s.discardPile.map((c) =>
          c.value === "wild" || c.value === "wild4" ? { ...c, color: "wild" as WildColor } : c,
        ),
      );
      s.drawPile = reshuffled;
      s.discardPile = [top];
      if (s.drawPile.length === 0) break;
    }
    const card = s.drawPile.shift()!;
    s.hands[playerIdx].push(card);
  }
  return s;
}

export function nextPlayer(state: GameState, skip = false): number {
  const n = state.hands.length;
  const step = (skip ? 2 : 1) * state.direction;
  return ((state.currentPlayer + step) % n + n) % n;
}

export function playCard(
  state: GameState,
  playerIdx: number,
  cardId: string,
  chosenColor?: UnoColor,
  comboActive = false,
): GameState {
  let s = cloneState(state);
  if (s.winner !== null || s.pendingAction !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;
  const hand = s.hands[playerIdx];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return s;
  const card = hand[idx];
  const top = s.discardPile[s.discardPile.length - 1];
  if (!isValidMove(card, top, s.activeColor, s.pendingDraw, s.houseRules, comboActive)) return s;

  hand.splice(idx, 1);
  s.discardPile.push(card);
  s.log.unshift(`${nameOf(s.players[playerIdx])} played ${describe(card)}.`);

  if (card.color !== "wild") {
    s.activeColor = card.color as UnoColor;
  } else {
    s.activeColor = chosenColor ?? "red";
    s.log.unshift(`${nameOf(s.players[playerIdx])} chose ${s.activeColor}.`);
  }

  if (card.value === "flip") {
    s.gameSide = s.gameSide === "light" ? "dark" : "light";
    s.discardPile = s.discardPile.map(c => flipCard(c, s.flipMap));
    s.drawPile = s.drawPile.map(c => flipCard(c, s.flipMap));
    s.hands = s.hands.map(hand => hand.map(c => flipCard(c, s.flipMap)));
    s.log.unshift(`All cards have flipped to the ${s.gameSide} side!`);
  }

  if (hand.length === 0) {
    s.winner = playerIdx;
    const earned = tallyRoundScore(s, playerIdx);
    s.scores = s.scores.map((v, i) => (i === playerIdx ? v + earned : v));
    s.log.unshift(`${nameOf(s.players[playerIdx])} wins! (+${earned} pts)`);
    return s;
  }

  let skipNext = false;
  switch (card.value) {
    case "skip":
      skipNext = true;
      break;
    case "reverse":
      s.direction = (s.direction === 1 ? -1 : 1) as 1 | -1;
      if (s.hands.length === 2) skipNext = true;
      break;
    case "draw2":
      s.pendingDraw += 2;
      break;
    case "wild4":
      s.pendingDraw += 4;
      break;
  }

  if (s.houseRules.sevenZero && card.value === "0") {
    const dir = s.direction;
    const n = s.hands.length;
    const newHands: UnoCard[][] = new Array(n);
    for (let i = 0; i < n; i++) {
      const fromIdx = ((i - dir) % n + n) % n;
      newHands[i] = s.hands[fromIdx];
    }
    s.hands = newHands;
    s.log.unshift(`Everyone passes their hand!`);
  }

  if (s.houseRules.sevenZero && card.value === "7") {
    s.pendingAction = { type: "swap7", from: playerIdx };
    s.log.unshift(
      `${nameOf(s.players[playerIdx])} must choose someone to swap hands with.`,
    );
    return s;
  }

const canCombo =
  s.houseRules.sameNumberCombo &&
  isNumberCard(card.value) &&
  hand.some(
    (c) =>
      c.id !== card.id &&
      isNumberCard(c.value) &&
      c.value === card.value
  );

if (skipNext) {
  s.queuedSkipNext = true;
  if (canCombo) {
    // keep turn on the same player for combo chaining
    skipNext = false;
  }
}

return s;
}

export function resolveSwap(state: GameState, targetIdx: number): GameState {
  if (state.pendingAction?.type !== "swap7") return state;
  const s = cloneState(state);
  const from = s.pendingAction!.from;
  const tmp = s.hands[from];
  s.hands[from] = s.hands[targetIdx];
  s.hands[targetIdx] = tmp;
  s.log.unshift(
    `${nameOf(s.players[from])} swapped hands with ${nameOf(s.players[targetIdx])}.`,
  );
  s.pendingAction = null;
  s.currentPlayer = nextPlayer(s);
  return s;
}

export function hasPlayableCard(state: GameState, playerIdx: number): boolean {
  const top = state.discardPile[state.discardPile.length - 1];
  return state.hands[playerIdx].some((c) =>
    isValidMove(c, top, state.activeColor, state.pendingDraw, state.houseRules),
  );
}

export function drawOne(state: GameState, playerIdx: number): GameState {
  let s = cloneState(state);
  if (s.winner !== null || s.pendingAction !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;
  const drawn = Math.max(1, s.pendingDraw);
  s = drawCards(s, playerIdx, drawn);
  s.log.unshift(`${nameOf(s.players[playerIdx])} drew ${drawn} card${drawn > 1 ? "s" : ""}.`);
  s.pendingDraw = 0;
  return s;
}

/**
 * Draw a single card for the player. If pendingDraw > 0, it decrements that
 * count by 1; otherwise it simply draws one card (used for incremental animations).
 */
export function drawSingle(state: GameState, playerIdx: number): GameState {
  const s = cloneState(state);
  if (s.winner !== null || s.pendingAction !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;

  // Reshuffle if needed
  if (s.drawPile.length === 0) {
    const top = s.discardPile.pop()!;
    const reshuffled = shuffle(
      s.discardPile.map((c) =>
        c.value === "wild" || c.value === "wild4" ? { ...c, color: "wild" as WildColor } : c,
      ),
    );
    s.drawPile = reshuffled;
    s.discardPile = [top];
    if (s.drawPile.length === 0) return s;
  }

  const card = s.drawPile.shift()!;
  s.hands[playerIdx].push(card);

  // Decrement the pending draw counter
  s.pendingDraw = Math.max(0, (s.pendingDraw ?? 0) - 1);

  return s;
}

export function endTurn(state: GameState, playerIdx: number): GameState {
  if (state.winner !== null || state.pendingAction !== null) return state;
  if (playerIdx !== state.currentPlayer) return state;
  let s = cloneState(state);

  // Apply a queued skip that was produced by an action card during a combo.
  if (s.queuedSkipNext) {
    s.skipNext = true;
    s.queuedSkipNext = false;
  }

  if (s.skipNext) {
    s.currentPlayer = nextPlayer(s, true);
    s.skipNext = false;
  } else {
    s.currentPlayer = nextPlayer(s);
  }

  s.turnSerial = (s.turnSerial ?? 0) + 1;
  return s;
}

/**
 * Draw the pending penalty cards and immediately end the player's turn.
 * This mirrors the official rule: the victim draws and is skipped.
 */
export function drawPenaltyThenEnd(state: GameState, playerIdx: number): GameState {
  // Draw the required cards (same logic as drawOne but we force endTurn)
  let s = cloneState(state);
  if (s.winner !== null || s.pendingAction !== null || playerIdx !== s.currentPlayer) return s;

  const drawn = Math.max(1, s.pendingDraw);
  s = drawCards(s, playerIdx, drawn);
  s.pendingDraw = 0;

  // Log the draw
  s.log.unshift(`${nameOf(s.players[playerIdx])} drew ${drawn} card${drawn > 1 ? "s" : ""}.`);

  // Now skip the player
  s.currentPlayer = nextPlayer(s);
  s.turnSerial = (s.turnSerial ?? 0) + 1;
  return s;
}

export type BotMove =
  | { type: "play"; cardId: string; chosenColor?: UnoColor }
  | { type: "draw" };

export function chooseBotMove(state: GameState, playerIdx: number, comboActive = false): BotMove {
  const hand = state.hands[playerIdx];
  const top = state.discardPile[state.discardPile.length - 1];
  const rules = state.houseRules;
  const playable = hand.filter((c) =>
    isValidMove(c, top, state.activeColor, state.pendingDraw, rules, comboActive),
  );
  if (playable.length === 0) return { type: "draw" };

  if (state.pendingDraw > 0) {
    return { type: "play", cardId: playable[0].id };
  }

  const colorCount: Record<UnoColor, number> = { red: 0, yellow: 0, green: 0, blue: 0, pink: 0, teal: 0, orange: 0, purple: 0 };
  for (const c of hand) {
    if (c.color !== "wild") colorCount[c.color as UnoColor]++;
  }

  const opponentMin = Math.min(
    ...state.hands.map((h, i) => (i === playerIdx ? Infinity : h.length)),
  );

  const cardScore = (c: UnoCard): number => {
    let score = 0;
    switch (c.value) {
      case "draw2": score = 18; break;
      case "skip": score = 15; break;
      case "reverse": score = 14; break;
      case "wild": score = 50; break;
      case "wild4": score = 60; break;
      case "flip": score = 100; break;
      case "draw5": score = 25; break;
      default: score = 5 + Number(c.value);
    }
    if (c.value === "draw2" || c.value === "wild4") {
      if (opponentMin <= 3) score += 100;
      else score -= 30;
    }
    if (c.value === "wild") score -= 20;
    if (c.color === state.activeColor) score += 5;
    return score;
  };

  playable.sort((a, b) => cardScore(b) - cardScore(a));
  const choice = playable[0];

  if (choice.color === "wild") {
    let best: UnoColor = "red";
    let bestN = -1;
    for (const c of COLORS) {
      if (colorCount[c] > bestN) {
        bestN = colorCount[c];
        best = c;
      }
    }
    return { type: "play", cardId: choice.id, chosenColor: best };
  }

  return { type: "play", cardId: choice.id };
}

export function chooseBotSwapTarget(state: GameState): number {
  if (state.pendingAction?.type !== "swap7") return state.currentPlayer;
  const from = state.pendingAction.from;
  let best = from;
  let bestN = Infinity;
  for (let i = 0; i < state.hands.length; i++) {
    if (i === from) continue;
    if (state.hands[i].length < bestN) {
      bestN = state.hands[i].length;
      best = i;
    }
  }
  return best;
}

export function cloneState(s: GameState): GameState {
  return {
    drawPile: [...s.drawPile],
    discardPile: [...s.discardPile],
    hands: s.hands.map((h) => [...h]),
    players: s.players.map((p) => ({ ...p })),
    houseRules: { ...s.houseRules },
    mode: s.mode,
    gameSide: s.gameSide,
    currentPlayer: s.currentPlayer,
    direction: s.direction,
    activeColor: s.activeColor,
    pendingDraw: s.pendingDraw,
    pendingAction: s.pendingAction ? { ...s.pendingAction } : null,
    log: [...s.log],
    winner: s.winner,
    scores: [...s.scores],
    skipNext: s.skipNext,
    queuedSkipNext: s.queuedSkipNext,   // only once
    turnSerial: s.turnSerial ?? 0,
    flipMap: { ...s.flipMap },
  };
 }







