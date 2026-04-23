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

export interface GameState {
  drawPile: UnoCard[];
  discardPile: UnoCard[];
  hands: UnoCard[][];
  currentPlayer: number;
  direction: 1 | -1;
  activeColor: UnoColor;
  pendingDraw: number;
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
): boolean {
  if (pendingDraw > 0) {
    if (topCard.value === "draw2" && card.value === "draw2") return true;
    if (topCard.value === "wild4" && card.value === "wild4") return true;
    return false;
  }
  if (card.color === "wild") return true;
  if (card.color === activeColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function dealNewGame(numPlayers: number): GameState {
  let deck = shuffle(buildDeck());
  const hands: UnoCard[][] = [];
  for (let p = 0; p < numPlayers; p++) {
    hands.push(deck.splice(0, 7));
  }
  // first non-wild card to start
  let firstIdx = deck.findIndex((c) => c.color !== "wild" && !["skip", "reverse", "draw2"].includes(c.value));
  if (firstIdx === -1) firstIdx = 0;
  const first = deck.splice(firstIdx, 1)[0];
  return {
    drawPile: deck,
    discardPile: [first],
    hands,
    currentPlayer: 0,
    direction: 1,
    activeColor: first.color === "wild" ? "red" : (first.color as UnoColor),
    pendingDraw: 0,
    log: [`Game started with ${numPlayers} players. Top card: ${describe(first)}.`],
    winner: null,
  };
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
      // reshuffle discards (keep top)
      const top = s.discardPile.pop()!;
      const reshuffled = shuffle(
        s.discardPile.map((c) => (c.value === "wild" || c.value === "wild4" ? { ...c, color: "wild" as WildColor } : c)),
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
  if (s.winner !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;
  const hand = s.hands[playerIdx];
  const idx = hand.findIndex((c) => c.id === cardId);
  if (idx === -1) return s;
  const card = hand[idx];
  const top = s.discardPile[s.discardPile.length - 1];
  if (!isValidMove(card, top, s.activeColor, s.pendingDraw)) return s;

  hand.splice(idx, 1);
  s.discardPile.push(card);
  s.log.unshift(`Player ${playerIdx + 1} played ${describe(card)}.`);

  if (card.color !== "wild") {
    s.activeColor = card.color as UnoColor;
  } else {
    s.activeColor = chosenColor ?? "red";
    s.log.unshift(`Player ${playerIdx + 1} chose ${s.activeColor}.`);
  }

  if (hand.length === 0) {
    s.winner = playerIdx;
    s.log.unshift(`Player ${playerIdx + 1} wins!`);
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

  s.currentPlayer = nextPlayer(s, skipNext);

  if (s.pendingDraw > 0 && !canStack(s)) {
    s = drawCards(s, s.currentPlayer, s.pendingDraw);
    s.log.unshift(`Player ${s.currentPlayer + 1} drew ${s.pendingDraw} cards.`);
    s.pendingDraw = 0;
    s.currentPlayer = nextPlayer(s);
  }

  return s;
}

function canStack(state: GameState): boolean {
  const top = state.discardPile[state.discardPile.length - 1];
  const hand = state.hands[state.currentPlayer];
  return hand.some((c) => isValidMove(c, top, state.activeColor, state.pendingDraw));
}

export function drawTurn(state: GameState, playerIdx: number): GameState {
  let s = cloneState(state);
  if (s.winner !== null) return s;
  if (playerIdx !== s.currentPlayer) return s;
  const drawn = Math.max(1, s.pendingDraw);
  s = drawCards(s, playerIdx, drawn);
  s.log.unshift(`Player ${playerIdx + 1} drew ${drawn} card${drawn > 1 ? "s" : ""}.`);
  s.pendingDraw = 0;
  s.currentPlayer = nextPlayer(s);
  return s;
}

function cloneState(s: GameState): GameState {
  return {
    drawPile: [...s.drawPile],
    discardPile: [...s.discardPile],
    hands: s.hands.map((h) => [...h]),
    currentPlayer: s.currentPlayer,
    direction: s.direction,
    activeColor: s.activeColor,
    pendingDraw: s.pendingDraw,
    log: [...s.log],
    winner: s.winner,
  };
}
