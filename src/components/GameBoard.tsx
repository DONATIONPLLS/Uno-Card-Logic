// src/components/GameBoard.tsx
import { useEffect, useRef, useState, useCallback} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  chooseBotMove,
  chooseBotSwapTarget,
  drawOne,
  endTurn,
  isValidMove,
  nameOf,
  nextPlayer,
  playCard,
  resolveSwap,
  drawPenaltyThenEnd,
  type GameState,
  type UnoCard,
  type UnoColor,
  drawSingle,
} from "@/lib/uno-engine";
import { UnoCardView } from "@/components/UnoCardView";
import { RulesPanel } from "@/components/RulesPanel";
import { Avatar, type AvatarTone } from "@/components/Avatar";
import { sfx } from "@/lib/sounds";
import { haptics } from "@/lib/haptics";

const colorSwatch: Record<UnoColor, string> = {
  red: "bg-[hsl(0_85%_50%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
  pink: "bg-[hsl(330_75%_55%)]",
  teal: "bg-[hsl(180_60%_45%)]",
  orange: "bg-[hsl(30_90%_55%)]",
  purple: "bg-[hsl(270_70%_50%)]",
};

const impactHex: Record<UnoColor, string> = {
  red: "#ef4444",
  yellow: "#facc15",
  green: "#22c55e",
  blue: "#3b82f6",
  pink: "#f472b6",
  teal: "#2dd4bf",
  orange: "#fb923c",
  purple: "#a78bfa",
};

type SeatPos = "top" | "left" | "right";

function seatLayout(n: number): SeatPos[] {
  if (n === 2) return ["top"];
  if (n === 3) return ["left", "right"];
  return ["left", "top", "right"];
}

export interface GameActions {
  play: (cardId: string, color?: UnoColor) => void;
  draw: () => void;
  endTurn: (skipNext?: boolean) => void;
  resolveSwap: (targetIdx: number) => void;
}

interface Flight {
  id: string;
  card: UnoCard;
  start: { x: number; y: number };
  end: { x: number; y: number };
  faceDown: boolean;
  initialRotate?: number;
}

interface PendingOrigin {
  cardId: string;
  rect: { x: number; y: number };
}

export function GameBoard({
  game,
  setGame,
  onExit,
  viewerIdx,
  actions,
  enableBots = true,
  passAndPlay,
}: {
  game: GameState;
  setGame: (updater: (g: GameState) => GameState) => void;
  onExit: () => void;
  viewerIdx?: number;
  actions?: GameActions;
  enableBots?: boolean;
  passAndPlay?: boolean;
}) {
  const isPassAndPlay = passAndPlay ?? viewerIdx === undefined;
  const handViewIdx = viewerIdx ?? game.currentPlayer;
  const flipMode = game.mode === "flip";

  const pendingPlayFlight = useRef(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasPlayedThisTurn, setHasPlayedThisTurn] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickColorFor, setPickColorFor] = useState<string | null>(null);
  const [swapPickerFor, setSwapPickerFor] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [revealed, setRevealed] = useState(viewerIdx !== undefined);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [drawArmed, setDrawArmed] = useState(false);
  const prevTurnRef = useRef<number | null>(null);
  const lastHumanRef = useRef<number | null>(null);
  const [overlayKind, setOverlayKind] = useState<"pass" | "yourturn" | null>(null);
  const wonRef = useRef(false);
  const [announcement, setAnnouncement] = useState<{
    text: string;
    color: UnoColor | "white";
  } | null>(null);
  const lastTopRef = useRef<UnoCard | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const seatRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const drawPileRef = useRef<HTMLDivElement | null>(null);
  const discardRef = useRef<HTMLDivElement | null>(null);
  const handZoneRef = useRef<HTMLDivElement | null>(null);
  const pendingOriginRef = useRef<PendingOrigin | null>(null);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [suppressedTopId, setSuppressedTopId] = useState<string | null>(null);
  const prevGameRef = useRef<GameState>(game);
  const prevDrawLenRef = useRef<number>(game.drawPile.length);
  const gameRef = useRef<GameState | null>(game);
  gameRef.current = game;

  const drawIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const botTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startDrawAnimation = useCallback(
    (playerIdx: number, numCards: number, onComplete?: () => void) => {
      if (isDrawing) return;
      setIsDrawing(true);
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);

      let count = 0;
      const launchOne = () => {
        if (count >= numCards) return;
        const currentIndex = count;
        const src = drawPileRef.current;
        if (!src) return;
        const sRect = src.getBoundingClientRect();

        let endX: number, endY: number;
        if (playerIdx === handViewIdx && handZoneRef.current) {
          const hz = handZoneRef.current.getBoundingClientRect();
          endX = hz.right - 40;
          endY = hz.top + hz.height / 2;
        } else {
          const seat = seatRefs.current[playerIdx];
          if (!seat) return;
          const seatRect = seat.getBoundingClientRect();
          endX = seatRect.left + seatRect.width / 2;
          endY = seatRect.top + seatRect.height / 2;
        }

        const flightId = `draw-${playerIdx}-${Date.now()}-${currentIndex}`;
        const placeholderCard: UnoCard = { id: flightId, color: "wild", value: "wild" };
        const flight: Flight = {
          id: flightId,
          card: placeholderCard,
          start: { x: sRect.left + sRect.width / 2, y: sRect.top + sRect.height / 2 },
          end: { x: endX, y: endY },
          faceDown: true,
        };

        setFlights((prev) => [...prev, flight]);
        setTimeout(() => {
          setFlights((prev) => prev.filter((f) => f.id !== flightId));
          setGame((g) => drawSingle(g, playerIdx));
          if (currentIndex === numCards - 1) {
            setTimeout(() => {
              setIsDrawing(false);
              onComplete?.();
            }, 40);
          }
        }, 520);

        count++;
        if (count < numCards) setTimeout(launchOne, 500);
      };
      launchOne();
    },
    [handViewIdx, isDrawing, setFlights, setGame],
  );

  const processBotTurn = useCallback(() => {
    const g = gameRef.current;
    if (!g || g.winner || g.pendingAction || isDrawing) return;
    if (g.players[g.currentPlayer]?.kind !== "bot") return;

    const move = chooseBotMove(g, g.currentPlayer);

    if (move.type === "draw") {
      const toDraw = g.pendingDraw > 0 ? g.pendingDraw : 1;
      if (g.pendingDraw > 0) {
        startDrawAnimation(g.currentPlayer, toDraw, () => {
          setGame((prev) => drawPenaltyThenEnd(prev, prev.currentPlayer));
        });
      } else {
        startDrawAnimation(g.currentPlayer, toDraw, () => {
          setGame((prev) => endTurn(prev, prev.currentPlayer));
        });
      }
    } else if (move.type === "play") {
      setGame((prev) => playCard(prev, prev.currentPlayer, move.cardId, move.chosenColor));
      const delay = 800 + Math.random() * 600;
      botTimeoutRef.current = setTimeout(() => {
        setGame((prev) => endTurn(prev, prev.currentPlayer));
      }, delay);
    }
  }, [startDrawAnimation, setGame, isDrawing]);

  const currentIdx = game.currentPlayer;
  const currentPlayer = game.players[currentIdx];
  const myTurn = handViewIdx === currentIdx && game.winner === null;
  const isHumanTurn = currentPlayer?.kind === "human" && game.winner === null;
  const top = game.discardPile[game.discardPile.length - 1];
  const upNextIdx = nextPlayer(game);
  const upNext = game.players[upNextIdx];
  const viewerPlayer = game.players[handViewIdx];
  const viewerIsBot = viewerPlayer?.kind === "bot";
  const visibleTop =
    suppressedTopId && suppressedTopId === top.id && game.discardPile.length >= 2
      ? game.discardPile[game.discardPile.length - 2]
      : top;

  const act: GameActions = actions ?? {
    play: (cardId, color) => setGame((g) => playCard(g, g.currentPlayer, cardId, color)),
    draw: () => setGame((g) => drawOne(g, g.currentPlayer)),
    endTurn: () => setGame((g) => endTurn(g, g.currentPlayer)),
    resolveSwap: (target) => setGame((g) => resolveSwap(g, target)),
  };

  // ── Card flight animations (play only) ──
  useEffect(() => {
    const prev = prevGameRef.current;
    prevGameRef.current = game;
    if (prev === game) return;

    if (game.drawPile.length > prevDrawLenRef.current + 0) {
      const grew = game.drawPile.length - prevDrawLenRef.current;
      if (grew > 5) sfx.shuffle();
    }
    prevDrawLenRef.current = game.drawPile.length;

    const newFlights: Flight[] = [];
    let newTopSuppress: string | null = null;
    const now = Date.now();

    game.players.forEach((_, i) => {
      const before = prev.hands[i]?.length ?? 0;
      const after = game.hands[i]?.length ?? 0;
      const delta = after - before;
      const seat = seatRefs.current[i];

      if (delta === -1 && game.discardPile.length === prev.discardPile.length + 1) {
        const playedCard = game.discardPile[game.discardPile.length - 1];
        const dst = discardRef.current;
        if (!dst || !playedCard) return;
        const d = dst.getBoundingClientRect();
        let startX: number;
        let startY: number;
        if (
          i === handViewIdx &&
          pendingOriginRef.current &&
          pendingOriginRef.current.cardId === playedCard.id
        ) {
          startX = pendingOriginRef.current.rect.x;
          startY = pendingOriginRef.current.rect.y;
          pendingOriginRef.current = null;
        } else if (seat) {
          const s = seat.getBoundingClientRect();
          startX = s.left + s.width / 2;
          startY = s.top + s.height / 2;
        } else {
          return;
        }
        newFlights.push({
          id: `play-${playedCard.id}-${now}`,
          card: playedCard,
          start: { x: startX, y: startY },
          end: { x: d.left + d.width / 2, y: d.top + d.height / 2 },
          faceDown: false,
          initialRotate: Math.random() * 20 - 10,
        });
        newTopSuppress = playedCard.id;
      }
    });

    if (newFlights.length === 0) return;
    setFlights((prevFs) => [...prevFs, ...newFlights]);
    if (newTopSuppress) setSuppressedTopId(newTopSuppress);
    pendingPlayFlight.current = true;
    const ids = newFlights.map((f) => f.id);
    const t = setTimeout(() => {
      setFlights((prevFs) => prevFs.filter((f) => !ids.includes(f.id)));
      if (newTopSuppress) setSuppressedTopId(null);
      pendingPlayFlight.current = false;
    }, 520);
    return () => clearTimeout(t);
  }, [game, handViewIdx]);

  // Win detection
  useEffect(() => {
    if (game.winner !== null && !wonRef.current) {
      wonRef.current = true;
      sfx.win();
      haptics.heavy();
      setAnnouncement({ text: `${nameOf(game.players[game.winner])} WINS!`, color: "white" });
      const t = setTimeout(() => setAnnouncement(null), 2400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [game.winner, game.players]);

  // Action card announcement
  useEffect(() => {
    const prev = lastTopRef.current;
    lastTopRef.current = top;
    if (!prev || prev.id === top.id) return;
    let msg: string | null = null;
    let heavy = false;
    switch (top.value) {
      case "skip":   msg = "SKIPPED!";  heavy = true; break;
      case "reverse": msg = "REVERSE!";              break;
      case "draw2":  msg = "+2 DRAW!"; heavy = true; break;
      case "wild4":  msg = "+4 WILD!"; heavy = true; break;
      case "wild":   msg = "WILD!";                  break;
      case "0":  if (game.houseRules.sevenZero) msg = "ALL PASS!"; break;
      case "7":  if (game.houseRules.sevenZero) msg = "SWAP!";     break;
      case "flip": msg = "FLIP!"; heavy = true; break;
    }
    if (msg) {
      const c: UnoColor | "white" = top.color === "wild" ? game.activeColor : top.color;
      setAnnouncement({ text: msg, color: c });
      if (heavy) { sfx.impact(); haptics.heavy(); }
      const t = setTimeout(() => setAnnouncement(null), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [top, game.houseRules.sevenZero, game.activeColor]);

  // Pass-and-play overlays
  useEffect(() => {
    if (!isPassAndPlay) {
      setRevealed(true);
      setOverlayKind(null);
      return;
    }
    if (isDrawing) return;
    const prev = prevTurnRef.current;
    if (prev === currentIdx) return;
    prevTurnRef.current = currentIdx;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);
    setHasPlayedThisTurn(false);

    if (game.winner !== null) { setRevealed(true); setOverlayKind(null); return; }
    const cur = game.players[currentIdx];
    if (cur.kind === "bot") { setRevealed(true); setOverlayKind(null); return; }
    const lastHuman = lastHumanRef.current;
    if (lastHuman === currentIdx) {
      setRevealed(true); setOverlayKind(null); sfx.ding();
    } else {
      setRevealed(false); setOverlayKind("pass");
    }
  }, [currentIdx, game.players, game.winner, isPassAndPlay, isDrawing]);

  useEffect(() => {
    if (revealed && currentPlayer?.kind === "human") {
      lastHumanRef.current = currentIdx;
    }
  }, [revealed, currentIdx, currentPlayer?.kind]);

  // Your-turn alert (network mode)
  useEffect(() => {
    if (isPassAndPlay) return;
    if (myTurn && !viewerIsBot) { sfx.yourTurn(); haptics.medium(); }
  }, [myTurn, isPassAndPlay, viewerIsBot]);

  // Bot swap handling
  useEffect(() => {
    if (!enableBots) return;
    if (game.pendingAction?.type === "swap7") {
      const fromKind = game.players[game.pendingAction.from].kind;
      if (fromKind === "bot") {
        const t = setTimeout(() => {
          setGame((g) => {
            if (g.pendingAction?.type !== "swap7") return g;
            return resolveSwap(g, chooseBotSwapTarget(g));
          });
        }, 1100 + Math.random() * 600);
        return () => clearTimeout(t);
      }
    }
  }, [game.pendingAction, game.players, enableBots, setGame]);

  useEffect(() => {
    return () => {
      if (drawIntervalRef.current) clearInterval(drawIntervalRef.current);
    };
  }, []);

  // Bot loop
  useEffect(() => {
    if (!enableBots || game.winner || isDrawing || pendingPlayFlight.current) return;
    const current = game.players[game.currentPlayer];
    if (!current || current.kind !== "bot") return;
    const delay = 1200 + Math.random() * 800;
    botTimeoutRef.current = setTimeout(processBotTurn, delay);
    return () => {
      if (botTimeoutRef.current) clearTimeout(botTimeoutRef.current);
    };
  }, [game.currentPlayer, game.winner, enableBots, pendingPlayFlight.current, processBotTurn, isDrawing]);

  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  useEffect(() => {
    if (isPassAndPlay) return;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);
    setHasPlayedThisTurn(false);
  }, [currentIdx, isPassAndPlay]);

  const captureOriginFor = (cardId: string) => {
    const el = cardRefs.current[cardId];
    if (!el) return;
    const r = el.getBoundingClientRect();
    pendingOriginRef.current = {
      cardId,
      rect: { x: r.left + r.width / 2, y: r.top + r.height / 2 },
    };
  };

  const onCardTap = (cardId: string) => {
    if (!myTurn || !revealed || viewerIsBot) return;
    if (game.pendingAction !== null) return;
    const card = game.hands[handViewIdx].find((c) => c.id === cardId);
    if (!card) return;

    const isComboPhase = hasPlayedThisTurn;
    let playable: boolean;
    if (isComboPhase) {
      playable = card.color === top.color && card.value === top.value;
    } else {
      playable = isValidMove(card, top, game.activeColor, game.pendingDraw, game.houseRules);
    }
    setDrawArmed(false);

    if (!playable) {
      sfx.click(); haptics.light(); setSelectedId(cardId); return;
    }
    if (selectedId !== cardId) {
      sfx.click(); haptics.light(); setSelectedId(cardId); return;
    }
    confirmPlay();
  };

  const confirmPlay = () => {
    if (!selectedId) return;
    const card = game.hands[handViewIdx].find((c) => c.id === selectedId);
    if (!card) return;
    const isComboPhase = hasPlayedThisTurn;
    const playable = isComboPhase
      ? (card.color === top.color && card.value === top.value)
      : isValidMove(card, top, game.activeColor, game.pendingDraw, game.houseRules);
    if (!playable) return;

    if (card.color === "wild") { setPickColorFor(selectedId); return; }
    captureOriginFor(selectedId);
    sfx.swish(); haptics.medium();
    act.play(selectedId);
    setSelectedId(null);
    setHasPlayedThisTurn(true);
  };

  const handlePickColor = (color: UnoColor) => {
    if (!pickColorFor) return;
    captureOriginFor(pickColorFor);
    sfx.swish(); haptics.medium();
    act.play(pickColorFor, color);
    setPickColorFor(null);
    setSelectedId(null);
    setHasPlayedThisTurn(true);
  };

  const onPass = () => {
    if (!myTurn || !revealed) return;
    haptics.light();
    act.endTurn();
  };

  const onDrawPileTap = () => {
    if (!myTurn || !revealed || viewerIsBot || game.pendingAction !== null) return;
    if (isDrawing || hasPlayedThisTurn) return;

    if (selectedId) { setSelectedId(null); return; }
    if (hasDrawnThisTurn) return;

    if (!drawArmed) {
      sfx.click(); haptics.light(); setDrawArmed(true); return;
    }

    const cardsToDraw = game.pendingDraw > 0 ? game.pendingDraw : 1;
    setDrawArmed(false);
    setHasDrawnThisTurn(true);
    startDrawAnimation(handViewIdx, cardsToDraw);
  };

  const onPickSwap = (targetIdx: number) => {
    haptics.medium();
    act.resolveSwap(targetIdx);
    setSwapPickerFor(null);
  };

  useEffect(() => {
    if (
      game.pendingAction?.type === "swap7" &&
      game.pendingAction.from === handViewIdx &&
      revealed &&
      !viewerIsBot
    ) {
      setSwapPickerFor(game.pendingAction.from);
    } else {
      setSwapPickerFor(null);
    }
  }, [game.pendingAction, handViewIdx, revealed, viewerIsBot]);

  const myHand = game.hands[handViewIdx] ?? [];

  const canEndTurn =
    myTurn &&
    !isDrawing &&
    game.pendingAction === null &&
    !pickColorFor &&
    !swapPickerFor &&
    (hasPlayedThisTurn || hasDrawnThisTurn);

  const selectedCard = selectedId ? myHand.find((c) => c.id === selectedId) ?? null : null;
  const isComboPhase = hasPlayedThisTurn;
  const selectedPlayable =
    selectedCard !== null &&
    (isComboPhase
      ? (selectedCard.color === top.color && selectedCard.value === top.value)
      : isValidMove(selectedCard, top, game.activeColor, game.pendingDraw, game.houseRules));

  const otherIdxs = game.players.map((_, i) => i).filter((i) => i !== handViewIdx);
  const positions = seatLayout(game.players.length);
  const seated: { pos: SeatPos; idx: number }[] = otherIdxs.map((idx, i) => ({
    pos: positions[i] ?? "top",
    idx,
  }));
  const seatAt = (pos: SeatPos) => seated.find((s) => s.pos === pos);

  const tableBg = flipMode
    ? game.gameSide === "dark"
      ? "radial-gradient(ellipse at center, #0f0f14 0%, #06060a 55%, #000 100%)"
      : "radial-gradient(ellipse at center, #1d1f23 0%, #0d0e10 60%, #000 100%)"
    : "radial-gradient(ellipse at center, hsl(140 60% 18%) 0%, hsl(140 60% 10%) 55%, #000 100%)";

  const toneFor = (idx: number): AvatarTone => {
    if (idx === handViewIdx) return "viewer";
    if (idx === currentIdx) return "active";
    if (idx === upNextIdx && currentIdx !== idx) return "next";
    return "idle";
  };

  const darkSide = game.gameSide === "dark";
  const backDarkSide = flipMode ? !darkSide : false;

  return (
    <div
      className="min-h-screen w-full flex flex-col text-white animate-[fadeIn_.22s_ease-out]"
      style={{ background: tableBg }}
    >
      <header
        className="flex items-center justify-between px-3 pb-2 border-b border-white/10 bg-[#0a0a0c] z-10 gap-2"
        style={{ paddingTop: "max(env(safe-area-inset-top), 0.5rem)" }}
      >
        <button
          onClick={() => { sfx.click(); haptics.light(); onExit(); }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center shrink-0"
          aria-label="Menu"
        >
          ←
        </button>
        <div className="flex-1 flex items-center justify-center gap-2 min-w-0">
          <TurnBadge
            label="Now"
            name={`${currentPlayer?.name}${currentPlayer?.kind === "bot" ? " (AI)" : ""}`}
            tone="green"
          />
          <span
            className={`w-3 h-3 rounded-full ${colorSwatch[game.activeColor]} border border-white/40 shrink-0`}
            title={`Active color: ${game.activeColor}`}
          />
          {upNext && game.winner === null ? (
            <TurnBadge
              label="Next"
              name={`${upNext.name}${upNext.kind === "bot" ? " (AI)" : ""}`}
              tone="orange"
            />
          ) : null}
          {game.pendingDraw > 0 ? (
            <span className="px-2 py-0.5 rounded bg-red-500/40 text-red-50 text-[10px] font-bold shrink-0">
              +{game.pendingDraw}
            </span>
          ) : null}
          {flipMode && game.gameSide === "dark" ? (
            <span className="px-2 py-0.5 rounded bg-purple-500/40 text-purple-100 text-[10px] font-bold shrink-0">
              DARK
            </span>
          ) : null}
        </div>
        <button
          onClick={() => { sfx.click(); haptics.light(); setShowRules(true); }}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm shrink-0"
          aria-label="Rules"
        >
          ?
        </button>
      </header>

      <div className="flex-1 grid relative" style={tableGridStyle}>
        <div className="row-start-1 col-start-2 flex items-start justify-center pt-2">
          {seatAt("top") ? (
            <SeatView
              orientation="horizontal"
              hand={game.hands[seatAt("top")!.idx]}
              player={game.players[seatAt("top")!.idx]}
              idx={seatAt("top")!.idx}
              tone={toneFor(seatAt("top")!.idx)}
              flipMode={flipMode}
              score={game.scores[seatAt("top")!.idx]}
              avatarRef={(el) => { seatRefs.current[seatAt("top")!.idx] = el; }}
              darkSide={backDarkSide}
              flipMap={game.flipMap} 
            />
          ) : null}
        </div>
        <div className="row-start-2 col-start-1 flex items-center justify-start pl-1">
          {seatAt("left") ? (
            <SeatView
              orientation="vertical"
              hand={game.hands[seatAt("left")!.idx]}
              player={game.players[seatAt("left")!.idx]}
              idx={seatAt("left")!.idx}
              tone={toneFor(seatAt("left")!.idx)}
              flipMode={flipMode}
              score={game.scores[seatAt("left")!.idx]}
              avatarRef={(el) => { seatRefs.current[seatAt("left")!.idx] = el; }}
              darkSide={backDarkSide}
              flipMap={game.flipMap} 
            />
          ) : null}
        </div>
        <div className="row-start-2 col-start-3 flex items-center justify-end pr-1">
          {seatAt("right") ? (
            <SeatView
              orientation="vertical"
              hand={game.hands[seatAt("right")!.idx]}
              player={game.players[seatAt("right")!.idx]}
              idx={seatAt("right")!.idx}
              tone={toneFor(seatAt("right")!.idx)}
              flipMode={flipMode}
              score={game.scores[seatAt("right")!.idx]}
              avatarRef={(el) => { seatRefs.current[seatAt("right")!.idx] = el; }}
              darkSide={backDarkSide}
              flipMap={game.flipMap} 
            />
          ) : null}
        </div>

        <div
          className="row-start-2 col-start-2 flex items-center justify-center gap-4"
          onClick={() => { setSelectedId(null); setDrawArmed(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDrawPileTap(); }}
            disabled={
              !myTurn ||
              !revealed ||
              hasDrawnThisTurn ||
              game.pendingAction !== null ||
              viewerIsBot ||
              isDrawing ||
              hasPlayedThisTurn
            }
            className={`flex flex-col items-center gap-1 transition rounded-xl p-1 ${
              myTurn && revealed && !hasDrawnThisTurn && game.pendingAction === null && !viewerIsBot && !isDrawing && !hasPlayedThisTurn
                ? "active:scale-95"
                : "opacity-70"
            } ${drawArmed ? "ring-4 ring-white shadow-2xl -translate-y-2" : ""}`}
          >
            <div ref={drawPileRef}>
              <UnoCardView
                card={{ id: "back", color: "wild", value: "wild" }}
                faceDown
                flipMode={flipMode}
                size="md"
                darkSide={backDarkSide}
                flipMap={game.flipMap} 
              />
            </div>
            <span className="text-[10px] text-white/70">
              {hasDrawnThisTurn ? "Drew" : drawArmed ? "Tap again" : "Draw"} ({game.drawPile.length})
            </span>
          </button>

          <div className="flex flex-col items-center gap-1">
            <motion.div ref={discardRef} key={visibleTop.id}>
              <UnoCardView card={visibleTop} disabled size="md" highlightColor={game.activeColor} darkSide={darkSide} 
              flipMap={game.flipMap} />
            </motion.div>
            <span className="text-[10px] text-white/60">Top</span>
          </div>
        </div>

        {announcement ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className="font-black tracking-wider animate-[impactPop_1.5s_cubic-bezier(.22,1.6,.36,1)_forwards] select-none"
              style={{
                color: announcement.color === "white" ? "#ffffff" : impactHex[announcement.color],
                WebkitTextStroke: "2px #1a1a1a",
                fontSize: "clamp(3rem, 11vw, 6rem)",
                letterSpacing: "0.04em",
                textShadow: "0 6px 24px rgba(0,0,0,0.55)",
                fontStyle: "italic",
              }}
            >
              {announcement.text}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mx-3 mb-2 max-h-14 overflow-y-auto rounded-md bg-black/40 border border-white/10 px-3 py-1.5 text-[11px] text-white/80 space-y-0.5 z-10">
        {game.log.slice(0, 4).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      <div className="border-t border-white/10 pt-2 pb-3 bg-[#0f0f13] z-10">
        <div className="flex items-center justify-between mb-2 px-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div ref={(el) => { seatRefs.current[handViewIdx] = el; }}>
              <Avatar
                name={viewerPlayer?.name ?? "?"}
                idx={handViewIdx}
                kind={viewerPlayer?.kind ?? "human"}
                size="sm"
                tone={myTurn ? "active" : "viewer"}
              />
            </div>
            <span className="text-sm font-semibold truncate">
              {viewerPlayer?.name}
              {viewerIsBot ? " (AI)" : ""}
            </span>
            <ScoreBadge score={game.scores[handViewIdx] ?? 0} />
            <span className="text-[10px] text-white/50 ml-1">{myHand.length} cards</span>
          </div>

          {/* Buttons */}
          {canEndTurn && !selectedId ? (
            <button
              onClick={onPass}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[hsl(48_100%_50%)] text-black active:scale-95"
            >
              End Turn
            </button>
          ) : selectedId && selectedPlayable ? (
            <button
              onClick={confirmPlay}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[hsl(140_70%_42%)] text-white shadow-lg active:scale-95 whitespace-nowrap"
            >
              ✓ Play Card
            </button>
          ) : selectedId ? (
            <button
              onClick={() => setSelectedId(null)}
              className="px-3 py-1.5 rounded-md text-xs text-white/70 bg-white/10"
            >
              Cancel
            </button>
          ) : null}
        </div>

        <div
          ref={handZoneRef}
          className="px-3 scroll-smooth"
          style={{ overflowX: "auto", overflowY: "visible", paddingTop: "2.5rem" }}
        >
          <div className="flex gap-2 items-end pb-2">
            <AnimatePresence initial={false}>
              {myHand.map((c, i) => {
                const showFaceDown = viewerIsBot || (!revealed && myTurn && isPassAndPlay);
                const isComboPhase = hasPlayedThisTurn;
                const playable =
                  myTurn &&
                  !viewerIsBot &&
                  (isComboPhase
                    ? (c.color === top.color && c.value === top.value)
                    : isValidMove(c, top, game.activeColor, game.pendingDraw, game.houseRules));
                const selected = selectedId === c.id;
                return (
                  <motion.div
                    key={c.id}
                    layoutId={`card-${c.id}`}
                    initial={{ opacity: 0, scale: 0.6, y: 20 }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      y: selected ? -32 : 0,
                      rotate: (i - (myHand.length - 1) / 2) * 4,
                    }}
                    exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.12 } }}
                    transition={{ type: "spring", stiffness: 380, damping: 28 }}
                    ref={(el) => { cardRefs.current[c.id] = el as HTMLDivElement | null; }}
                    className="shrink-0 relative"
                    style={{ zIndex: selected ? 30 : 1 }}
                  >
                    <div className={`rounded-xl ${selected ? "ring-4 ring-white shadow-2xl" : ""}`}>
                      <UnoCardView
                        card={showFaceDown ? { ...c, color: "wild", value: "wild" } : c}
                        onClick={viewerIsBot ? undefined : () => onCardTap(c.id)}
                        disabled={!myTurn || !revealed || viewerIsBot || (!playable && !selected)}
                        faceDown={showFaceDown}
                        flipMode={flipMode}
                        size="lg"
                        darkSide={darkSide}
                        flipMap={game.flipMap} 
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {myHand.length === 0 ? (
              <span className="text-white/50 text-sm py-6">No cards.</span>
            ) : null}
          </div>
        </div>
        {viewerIsBot ? (
          <div className="text-center text-[11px] text-white/45 mt-1">AI turn — cards hidden</div>
        ) : null}
      </div>

      <div className="fixed inset-0 pointer-events-none z-40">
        {flights.map((f) => (
          <motion.div
            key={f.id}
            className="absolute"
            initial={{
              x: f.start.x - 32,
              y: f.start.y - 48,
              opacity: 0,
              rotate: f.initialRotate ?? 0,
            }}
            animate={{
              x: f.end.x - 32,
              y: f.end.y - 48,
              opacity: [0, 1, 1, 1],
              rotate: 0,
            }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <UnoCardView card={f.card} faceDown={f.faceDown} flipMode={flipMode} size="md" darkSide={darkSide}
            flipMap={game.flipMap} />
          </motion.div>
        ))}
      </div>

      {pickColorFor ? (
        <Modal onClose={() => setPickColorFor(null)} title="Choose a color">
          <div className="grid grid-cols-2 gap-3">
            {(["red", "yellow", "green", "blue"] as UnoColor[]).map((c) => (
              <button
                key={c}
                onClick={() => handlePickColor(c)}
                className={`${colorSwatch[c]} h-16 rounded-lg border-2 border-white/30 active:scale-95 capitalize font-bold ${c === "yellow" ? "text-black" : "text-white"}`}
              >
                {c}
              </button>
            ))}
          </div>
        </Modal>
      ) : null}

      {swapPickerFor !== null ? (
        <Modal title="Swap hands with…">
          <div className="space-y-2">
            {game.players.map((p, i) =>
              i === swapPickerFor ? null : (
                <button
                  key={i}
                  onClick={() => onPickSwap(i)}
                  className="w-full flex items-center gap-3 bg-white/10 hover:bg-white/20 rounded-lg px-3 py-3"
                >
                  <Avatar name={p.name} idx={i} kind={p.kind} size="sm" />
                  <span className="font-semibold flex-1 text-left">{p.name}</span>
                  <span className="text-xs text-white/60">{game.hands[i].length} cards</span>
                </button>
              ),
            )}
          </div>
        </Modal>
      ) : null}

      {isPassAndPlay && isHumanTurn && !revealed && overlayKind && game.winner === null ? (
        <PassOverlay
          name={currentPlayer.name}
          idx={currentIdx}
          variant={overlayKind}
          onReveal={() => {
            setRevealed(true);
            setOverlayKind(null);
            sfx.ding();
            haptics.medium();
          }}
        />
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
const tableGridStyle: React.CSSProperties = {
  gridTemplateColumns: "minmax(60px, 1fr) 3fr minmax(60px, 1fr)",
  gridTemplateRows: "auto 1fr",
  minHeight: "260px",
};

function ScoreBadge({ score }: { score: number }) {
  return (
    <span
      className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums border border-[#facc15]/40 text-[#facc15] bg-[#facc15]/10"
      title="Score"
    >
      {score} pts
    </span>
  );
}

function TurnBadge({
  label,
  name,
  tone,
}: {
  label: string;
  name: string;
  tone: "green" | "orange";
}) {
  const styles =
    tone === "green"
      ? "border-[hsl(140_70%_50%)]/60 bg-[hsl(140_70%_42%)]/20 shadow-[0_0_16px_-2px_hsl(140_80%_55%/.7)]"
      : "border-[hsl(28_95%_60%)]/55 bg-[hsl(28_95%_55%)]/15 shadow-[0_0_14px_-3px_hsl(28_95%_60%/.6)]";
  const dot =
    tone === "green" ? "bg-[hsl(140_80%_55%)]" : "bg-[hsl(28_95%_60%)]";
  return (
    <span
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border backdrop-blur-md min-w-0 max-w-[40%] ${styles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      <span className="text-[9px] uppercase tracking-widest font-bold text-white/70">{label}</span>
      <span className="text-[11px] font-semibold truncate">{name}</span>
    </span>
  );
}

function SeatView({
  orientation,
  hand,
  player,
  idx,
  tone,
  flipMode,
  score,
  avatarRef,
  darkSide,
  flipMap,
}: {
  orientation: "horizontal" | "vertical";
  hand: UnoCard[];
  player: { name: string; kind: "human" | "bot" };
  idx: number;
  tone: AvatarTone;
  flipMode?: boolean;
  score: number;
  avatarRef?: (el: HTMLDivElement | null) => void;
  darkSide?: boolean
  flipMap?: Record<string, UnoCard>;   // add this
}) {
  const shown = hand.slice(0, 7);
  const extra = hand.length - shown.length;
  return (
    <div className="flex flex-col items-center gap-1">
      <div ref={avatarRef} className="relative">
        <Avatar name={player.name} idx={idx} kind={player.kind} size="sm" tone={tone} />
        <span
          className="absolute -bottom-1 -left-2 px-1 rounded-md text-[9px] font-bold tabular-nums border border-[#facc15]/50 text-[#facc15] bg-black/70 backdrop-blur-sm"
          title="Score"
        >
          {score}
        </span>
      </div>
      <div className="text-[10px] text-white/70 text-center max-w-[90px] truncate">
        {player.name}
        {player.kind === "bot" ? " (AI)" : ""}
        <div className="text-white/50">{hand.length} cards</div>
      </div>
      <div
        className={`flex items-center ${
          orientation === "horizontal" ? "flex-row -space-x-3" : "flex-col -space-y-7"
        }`}
      >
        {shown.map((c, i) => (
          <div
            key={c.id}
            style={{
              transform:
                orientation === "horizontal"
                  ? `rotate(${(i - shown.length / 2) * 4}deg)`
                  : `rotate(90deg)`,
              zIndex: i,
            }}
          >
            <UnoCardView card={c} faceDown flipMode={flipMode} size="sm" darkSide={darkSide}
            flipMap={flipMap} />
          </div>
        ))}
        {extra > 0 ? <div className="text-[10px] text-white/60 ml-1">+{extra}</div> : null}
      </div>
    </div>
  );
}

function PassOverlay({
  name,
  idx,
  variant,
  onReveal,
}: {
  name: string;
  idx: number;
  variant: "pass" | "yourturn";
  onReveal: () => void;
}) {
  const heading = variant === "yourturn" ? "Your turn!" : `${name}'s turn`;
  const subheading =
    variant === "yourturn"
      ? "Take the phone back."
      : "Pass the phone — only this player should see the next screen.";
  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-[hsl(0_60%_15%)] via-black to-black flex flex-col items-center justify-center px-6 text-center animate-[fadeIn_.2s_ease-out]">
      <div className="mb-4">
        <Avatar name={name} idx={idx} kind="human" size="lg" tone="viewer" />
      </div>
      <div className="text-xs uppercase tracking-widest text-white/50 font-bold mb-2">
        {variant === "yourturn" ? "Heads up" : "Pass the phone"}
      </div>
      <h2 className="text-3xl font-black mb-1">{heading}</h2>
      <div className="text-lg font-semibold text-white/80 mb-1">{name}</div>
      <p className="text-white/60 text-sm max-w-xs mb-8 mt-2">{subheading}</p>
      <button
        onClick={onReveal}
        className="px-8 py-4 rounded-2xl bg-[hsl(140_70%_42%)] text-white font-bold text-lg shadow-lg active:scale-[.98]"
      >
        Confirm Identity
      </button>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
      <div className="bg-neutral-900 rounded-xl p-5 w-full max-w-xs border border-white/10">
        <div className="text-center text-sm font-semibold mb-3">{title}</div>
        {children}
        {onClose ? (
          <button onClick={onClose} className="w-full mt-3 text-xs text-white/60 py-1">
            Cancel
          </button>
        ) : null}
      </div>
    </div>
  );
}