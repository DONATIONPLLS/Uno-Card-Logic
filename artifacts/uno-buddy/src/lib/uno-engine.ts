export type UnoColor = "red" | "yellow" | "green" | "blue";
export type WildColor = UnoColor | "wild";

export type CardValue =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface UnoCard {
  id: string;
  color: WildColor;
  value: CardValue;
}

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
}

export const DEFAULT_HOUSE_RULES: HouseRules = {
  stackDraws: false,
  jumpIn: false,
  forcePlay: false,
  drawUntilPlayable: false,
  sevenZero: false,
  allWild: false,
};

export type GameMode = "standard" | "chaos" | "flip" | "allwild" | "custom";

export const MODE_PRESETS: Record<Exclude<GameMode, "custom">, HouseRules> = {
  standard: { ...DEFAULT_HOUSE_RULES },
  chaos: { ...DEFAULT_HOUSE_RULES, stackDraws: true, jumpIn: true, sevenZero: true },
  flip: { ...DEFAULT_HOUSE_RULES, stackDraws: true, jumpIn: true, forcePlay: true },
  allwild: { ...DEFAULT_HOUSE_RULES, allWild: true },
};

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
  currentPlayer: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  pendingDraw: number;
  pendingAction: PendingSwap | null;
  log: string[];
  winner: number | null;
}

const COLORS: UnoColor[] = ["red", "yellow", "green", "blue"];
const NUMBERS: CardValue[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const ACTIONS: CardValue[] = ["skip", "reverse", "draw2"];

let idCounter = 0;
const nextId = () => `c${++idCounter}`;

export function buildDeck(): UnoCard[] {
  const deck: UnoCard[] = [];
  for (const color of COLORS) {
    deck.push({ id: nextId(), color, value: "0" });
    for (const n of NUMBERS.slice(1)) {
      deck.push({ id: nextId(), color, value: n });
      deck.push({ id: nextId(), color, value: n });
    }
    for (const a of ACTIONS) {
      deck.push({ id: nextId(), color, value: a });
      deck.push({ id: nextId(), color, value: a });
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: nextId(), color: "wild", value: "wild" });
    deck.push({ id: nextId(), color: "wild", value: "wild4" });
  }
  return deck;
}

export function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function isValidMove(
  card: UnoCard,
  topCard: UnoCard,
  activeColor: UnoColor,
  pendingDraw: number,
  rules: HouseRules,
): boolean {
  if (pendingDraw > 0) {
    if (!rules.stackDraws) return false;
    if (topCard.value === "draw2" && card.value === "draw2") return true;
    if (topCard.value === "wild4" && card.value === "wild4") return true;
    return false;
  }
  if (rules.allWild) return true;
  if (card.color === "wild") return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export interface NewGameOptions {
  players: PlayerConfig[];
  houseRules?: Partial<HouseRules>;
  mode?: GameMode;
}

export function dealNewGame(opts: NewGameOptions): GameState {
  const houseRules: HouseRules = { ...DEFAULT_HOUSE_RULES, ...(opts.houseRules ?? {}) };
  const players = opts.players;
  let deck = shuffle(buildDeck());
  const hands: UnoCard[][] = [];
  for (let p = 0; p < players.length; p++) {
    hands.push(deck.splice(0, 7));
  }
  let firstIdx = deck.findIndex(
    (c) => c.color !== "wild" && !["skip", "reverse", "draw2"].includes(c.value),
  );
  if (firstIdx === -1) firstIdx = 0;
  const first = deck.splice(firstIdx, 1)[0];
  return {
    drawPile: deck,
    discardPile: [first],
    hands,
    players,
    houseRules,
    mode: opts.mode ?? "standard",
    currentPlayer: 0,
    direction: 1,
    activeColor: first.color === "wild" ? "red" : (first.color as UnoColor),
    pendingDraw: 0,
    pendingAction: null,
    log: [`Game started. Top card: ${describe(first)}.`, `${nameOf(players[0])} starts.`],
    winner: null,
  };
}

export function nameOf(p: PlayerConfig): string {
  return p.kind === "bot" ? `${p.name} (AI)` : p.name;
}

export function describe(c: UnoCard): string {
  const colorName = c.color === "wild" ? "" : c.color.charAt(0).toUpperCase() + c.color.slice(1) + " ";
  const valueName: Record<CardValue, string> = {
    "0": "0", "1": "1", "2": "2", "3": "3", "4": "4", "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
    skip: "Skip", reverse: "Reverse", draw2: "Draw 2", wild: "Wild", wild4: "Wild Draw 4",
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
): GameState {
  let s = cloneState(state);
  if (s.winner !== null || s.pendingAction !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;
  const hand = s.hands[playerIdx];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return s;
  const card = hand[idx];
  const top = s.discardPile[s.discardPile.length - 1];
  if (!isValidMove(card, top, s.activeColor, s.pendingDraw, s.houseRules)) return s;

  hand.splice(idx, 1);
  s.discardPile.push(card);
  s.log.unshift(`${nameOf(s.players[playerIdx])} played ${describe(card)}.`);

  if (card.color !== "wild") {
    s.activeColor = card.color as UnoColor;
  } else {
    s.activeColor = chosenColor ?? "red";
    s.log.unshift(`${nameOf(s.players[playerIdx])} chose ${s.activeColor}.`);
  }

  if (hand.length === 0) {
    s.winner = playerIdx;
    s.log.unshift(`${nameOf(s.players[playerIdx])} wins!`);
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

  // 7-0 rules
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
    s.log.unshift(`${nameOf(s.players[playerIdx])} must choose someone to swap hands with.`);
    return s;
  }

  s.currentPlayer = nextPlayer(s, skipNext);

  if (s.pendingDraw > 0 && !canStack(s)) {
    const target = s.currentPlayer;
    s = drawCards(s, target, s.pendingDraw);
    s.log.unshift(`${nameOf(s.players[target])} drew ${s.pendingDraw} cards.`);
    s.pendingDraw = 0;
    s.currentPlayer = nextPlayer(s);
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
  s.log.unshift(`${nameOf(s.players[from])} swapped hands with ${nameOf(s.players[targetIdx])}.`);
  s.pendingAction = null;
  s.currentPlayer = nextPlayer(s);
  return s;
}

function canStack(state: GameState): boolean {
  if (!state.houseRules.stackDraws) return false;
  const top = state.discardPile[state.discardPile.length - 1];
  const hand = state.hands[state.currentPlayer];
  return hand.some((c) => isValidMove(c, top, state.activeColor, state.pendingDraw, state.houseRules));
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

export function endTurn(state: GameState, playerIdx: number): GameState {
  if (state.winner !== null || state.pendingAction !== null) return state;
  if (playerIdx !== state.currentPlayer) return state;
  const s = cloneState(state);
  s.currentPlayer = nextPlayer(s);
  return s;
}

// Smart bot: picks best playable card. Returns the move it wants to make.
export type BotMove =
  | { type: "play"; cardId: string; chosenColor?: UnoColor }
  | { type: "draw" };

export function chooseBotMove(state: GameState, playerIdx: number): BotMove {
  const hand = state.hands[playerIdx];
  const top = state.discardPile[state.discardPile.length - 1];
  const rules = state.houseRules;
  const playable = hand.filter((c) => isValidMove(c, top, state.activeColor, state.pendingDraw, rules));
  if (playable.length === 0) return { type: "draw" };

  // Stacking case: just play the matching draw card
  if (state.pendingDraw > 0) {
    return { type: "play", cardId: playable[0].id };
  }

  // Color counts in hand for wild choice
  const colorCount: Record<UnoColor, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) {
    if (c.color !== "wild") colorCount[c.color as UnoColor]++;
  }

  const opponentMin = Math.min(
    ...state.hands.map((h, i) => (i === playerIdx ? Infinity : h.length)),
  );

  const cardScore = (c: UnoCard): number => {
    let score = 0;
    // High-value action cards score higher
    switch (c.value) {
      case "draw2": score = 18; break;
      case "skip": score = 15; break;
      case "reverse": score = 14; break;
      case "wild": score = 50; break;   // wilds are flexible — save by default
      case "wild4": score = 60; break;
      default: score = 5 + Number(c.value); // 5..14 for numbers
    }
    // Save +2 / +4 unless opponent has 3 or fewer cards
    if (c.value === "draw2" || c.value === "wild4") {
      if (opponentMin <= 3) score += 100;
      else score -= 30; // hold it
    }
    // Save plain wild for when stuck (penalize playing it if alternatives exist)
    if (c.value === "wild") score -= 20;
    // Prefer matching active color over a value-only match (keeps options open)
    if (c.color === state.activeColor) score += 5;
    return score;
  };

  playable.sort((a, b) => cardScore(b) - cardScore(a));
  const choice = playable[0];

  if (choice.color === "wild") {
    // pick color we hold most of
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
  // pick player with smallest hand (excluding self)
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

function cloneState(s: GameState): GameState {
  return {
    drawPile: [...s.drawPile],
    discardPile: [...s.discardPile],
    hands: s.hands.map((h) => [...h]),
    players: s.players.map((p) => ({ ...p })),
    houseRules: { ...s.houseRules },
    mode: s.mode,
    currentPlayer: s.currentPlayer,
    direction: s.direction,
    activeColor: s.activeColor,
    pendingDraw: s.pendingDraw,
    pendingAction: s.pendingAction ? { ...s.pendingAction } : null,
    log: [...s.log],
    winner: s.winner,
  };
}
