// src/components/GameBoard.tsx
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  chooseBotMove,
  chooseBotSwapTarget,
  drawOne,
  endTurn,
  hasPlayableCard,
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
};

const impactHex: Record<UnoColor, string> = {
  red: "#ef4444",
  yellow: "#facc15",
  green: "#22c55e",
  blue: "#3b82f6",
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
        // bot must draw penalty, then auto-end turn
        startDrawAnimation(g.currentPlayer, toDraw, () => {
          setGame((prev) => drawPenaltyThenEnd(prev, prev.currentPlayer));
        });
      } else {
        // regular draw
        startDrawAnimation(g.currentPlayer, toDraw, () => {
          setGame((prev) => endTurn(prev, prev.currentPlayer));
        });
      }
    } else if (move.type === "play") {
      // bot plays, then after animation we end turn
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

  // Win detection, announcement, overlays, bot loop (existing) – keep unchanged
  // ... (keep existing win detection, action announcement, etc.)

  // ── Reset flags on turn change ──
  useEffect(() => {
    if (isPassAndPlay) return;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);
    setHasPlayedThisTurn(false);
  }, [currentIdx, isPassAndPlay]);

  // ── Pass-and-play overlays (keep existing) ──

  // Card tap
  const onCardTap = (cardId: string) => {
    if (!myTurn || !revealed || viewerIsBot) return;
    if (game.pendingAction !== null) return;
    const card = game.hands[handViewIdx].find((c) => c.id === cardId);
    if (!card) return;

    const isComboPhase = hasPlayedThisTurn;
    let playable: boolean;
    if (isComboPhase) {
      // Only identical cards allowed (same color & value)
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
    startDrawAnimation(handViewIdx, cardsToDraw, () => {
      // after drawing penalty, do NOT auto-end for human; they must press End Turn
    });
  };

  // Can End Turn button logic
  const canEndTurn =
    myTurn &&
    !isDrawing &&
    game.pendingAction === null &&
    !pickColorFor &&
    !swapPickerFor &&
    (hasPlayedThisTurn || hasDrawnThisTurn || hasPlayableCard(game, handViewIdx));

  const darkSide = game.gameSide === "dark";
  const backDarkSide = flipMode ? !darkSide : false;   // for face-down cards in Flip mode

  return (
    <div
      className="min-h-screen w-full flex flex-col text-white animate-[fadeIn_.22s_ease-out]"
      style={{ background: tableBg }}
    >
      {/* Header unchanged */}
      {/* ... */}

      <div className="flex-1 grid relative" style={tableGridStyle}>
        <div className="row-start-1 col-start-2 flex items-start justify-center pt-2">
          {seatAt("top") ? (
            <SeatView ... darkSide={backDarkSide} />  // pass backDarkSide
          ) : null}
        </div>
        <div className="row-start-2 col-start-1 flex items-center justify-start pl-1">
          {seatAt("left") ? (
            <SeatView ... darkSide={backDarkSide} />
          ) : null}
        </div>
        <div className="row-start-2 col-start-3 flex items-center justify-end pr-1">
          {seatAt("right") ? (
            <SeatView ... darkSide={backDarkSide} />
          ) : null}
        </div>

        <div className="row-start-2 col-start-2 flex items-center justify-center gap-4"
          onClick={() => { setSelectedId(null); setDrawArmed(false); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onDrawPileTap(); }}
            disabled={!myTurn || !revealed || hasDrawnThisTurn || game.pendingAction !== null || viewerIsBot || isDrawing || hasPlayedThisTurn}
            className={`flex flex-col items-center gap-1 transition rounded-xl p-1 ${
              myTurn && revealed && !hasDrawnThisTurn && game.pendingAction === null && !viewerIsBot && !isDrawing && !hasPlayedThisTurn
                ? "active:scale-95" : "opacity-70"
            } ${drawArmed ? "ring-4 ring-white shadow-2xl -translate-y-2" : ""}`}
          >
            <div ref={drawPileRef}>
              <UnoCardView
                card={{ id: "back", color: "wild", value: "wild" }}
                faceDown
                flipMode={flipMode}
                size="md"
                darkSide={backDarkSide}   // <-- fix back
              />
            </div>
            <span className="text-[10px] text-white/70">
              {hasDrawnThisTurn ? "Drew" : drawArmed ? "Tap again" : "Draw"} ({game.drawPile.length})
            </span>
          </button>

          <div className="flex flex-col items-center gap-1">
            <motion.div ref={discardRef} key={visibleTop.id}>
              <UnoCardView card={visibleTop} disabled size="md" highlightColor={game.activeColor} darkSide={darkSide} />
            </motion.div>
            <span className="text-[10px] text-white/60">Top</span>
          </div>
        </div>

        {/* Announcement etc. */}
      </div>

      <div className="border-t border-white/10 pt-2 pb-3 bg-[#0f0f13] z-10">
        <div className="flex items-center justify-between mb-2 px-3 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Avatar and name unchanged */}
          </div>

          {/* Buttons: End Turn always visible when allowed, else Play Card, etc. */}
          {canEndTurn && !selectedId ? (
            <button
              onClick={onPass}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[hsl(48_100%_50%)] text-black active:scale-95"
            >
              End Turn
            </button>
          ) : selectedId && (hasPlayedThisTurn ? (selectedCard && selectedCard.color === top.color && selectedCard.value === top.value) : isValidMove(selectedCard!, top, game.activeColor, game.pendingDraw, game.houseRules)) ? (
            <button
              onClick={confirmPlay}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[hsl(140_70%_42%)] text-white shadow-lg active:scale-95 whitespace-nowrap"
            >
              ✓ Play Card
            </button>
          ) : selectedId ? (
            <button onClick={() => setSelectedId(null)} className="px-3 py-1.5 rounded-md text-xs text-white/70 bg-white/10">
              Cancel
            </button>
          ) : null}
        </div>

        {/* Hand rendering (use backDarkSide for opponent faceDown cards) */}
        {/* ... */}
      </div>

      {/* Flights, modals, etc. */}
    </div>
  );
}

// SeatView, PassOverlay, Modal – unchanged but accept and pass darkSide prop for cards.