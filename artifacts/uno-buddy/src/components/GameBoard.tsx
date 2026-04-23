import { useEffect, useRef, useState } from "react";
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
  type GameState,
  type UnoCard,
  type UnoColor,
} from "@/lib/uno-engine";
import { UnoCardView } from "@/components/UnoCardView";
import { RulesPanel } from "@/components/RulesPanel";
import { Avatar } from "@/components/Avatar";
import { sfx } from "@/lib/sounds";

const colorSwatch: Record<UnoColor, string> = {
  red: "bg-[hsl(0_85%_50%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
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
  endTurn: () => void;
  resolveSwap: (targetIdx: number) => void;
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
  viewerIdx?: number;       // fixed POV for multiplayer; otherwise pass-and-play
  actions?: GameActions;    // optional remote action handler
  enableBots?: boolean;
  passAndPlay?: boolean;    // if true, show privacy overlays
}) {
  // If viewerIdx is set, that's whose hand we always show. Otherwise show currentPlayer's.
  const isPassAndPlay = passAndPlay ?? viewerIdx === undefined;
  const handViewIdx = viewerIdx ?? game.currentPlayer;

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
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const lastTopRef = useRef<UnoCard | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const currentIdx = game.currentPlayer;
  const currentPlayer = game.players[currentIdx];
  const myTurn = handViewIdx === currentIdx && game.winner === null;
  const isHumanTurn = currentPlayer?.kind === "human" && game.winner === null;
  const top = game.discardPile[game.discardPile.length - 1];
  const upNextIdx = nextPlayer(game);
  const upNext = game.players[upNextIdx];

  // Default actions = direct local mutation
  const act: GameActions = actions ?? {
    play: (cardId, color) => setGame((g) => playCard(g, g.currentPlayer, cardId, color)),
    draw: () => setGame((g) => drawOne(g, g.currentPlayer)),
    endTurn: () => setGame((g) => endTurn(g, g.currentPlayer)),
    resolveSwap: (target) => setGame((g) => resolveSwap(g, target)),
  };

  // Win sound + win banner
  useEffect(() => {
    if (game.winner !== null && !wonRef.current) {
      wonRef.current = true;
      sfx.win();
      setAnnouncement(`🎉 ${nameOf(game.players[game.winner])} WINS!`);
      const t = setTimeout(() => setAnnouncement(null), 2400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [game.winner, game.players]);

  // Action announcements driven by discard top changes
  useEffect(() => {
    const prev = lastTopRef.current;
    lastTopRef.current = top;
    if (!prev || prev.id === top.id) return;
    let msg: string | null = null;
    switch (top.value) {
      case "skip": msg = "SKIPPED!"; break;
      case "reverse": msg = "REVERSE!"; break;
      case "draw2": msg = "+2 DRAW!"; break;
      case "wild4": msg = "+4 WILD!"; break;
      case "wild": msg = "WILD!"; break;
      case "0": if (game.houseRules.sevenZero) msg = "ALL PASS!"; break;
      case "7": if (game.houseRules.sevenZero) msg = "SWAP!"; break;
    }
    if (msg) {
      setAnnouncement(msg);
      const t = setTimeout(() => setAnnouncement(null), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [top, game.houseRules.sevenZero]);

  // Smart privacy logic — only for pass-and-play
  useEffect(() => {
    if (!isPassAndPlay) {
      setRevealed(true);
      setOverlayKind(null);
      return;
    }
    const prev = prevTurnRef.current;
    if (prev === currentIdx) return;
    prevTurnRef.current = currentIdx;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);

    if (game.winner !== null) {
      setRevealed(true);
      setOverlayKind(null);
      return;
    }
    const cur = game.players[currentIdx];
    if (cur.kind === "bot") {
      setRevealed(true);
      setOverlayKind(null);
      return;
    }
    // Human turn — only show overlay when the human is different from the previous human player
    const lastHuman = lastHumanRef.current;
    if (lastHuman === currentIdx) {
      // Same human as last time (e.g., bots played in between). Keep table revealed.
      setRevealed(true);
      setOverlayKind(null);
      sfx.ding();
    } else if (lastHuman === null) {
      // Very first human turn
      setRevealed(false);
      setOverlayKind("pass");
    } else {
      // Different human from last time — privacy needed
      setRevealed(false);
      setOverlayKind("pass");
    }
  }, [currentIdx, game.players, game.winner, isPassAndPlay]);

  // Track lastHumanRef once they actually reveal
  useEffect(() => {
    if (revealed && currentPlayer?.kind === "human") {
      lastHumanRef.current = currentIdx;
    }
  }, [revealed, currentIdx, currentPlayer?.kind]);

  // Bot loop with random 1.2-2.0s pacing
  useEffect(() => {
    if (!enableBots) return;
    if (game.winner !== null) return;
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
      return;
    }
    if (currentPlayer?.kind !== "bot") return;
    const delay = 1200 + Math.random() * 800;
    const t = setTimeout(() => {
      setGame((g) => {
        if (g.winner !== null || g.pendingAction !== null) return g;
        const idx = g.currentPlayer;
        if (g.players[idx].kind !== "bot") return g;
        const move = chooseBotMove(g, idx);
        if (move.type === "play") {
          sfx.swish();
          return playCard(g, idx, move.cardId, move.chosenColor);
        }
        sfx.draw();
        const afterDraw = drawOne(g, idx);
        if (afterDraw === g) return g;
        const newCard = afterDraw.hands[idx][afterDraw.hands[idx].length - 1];
        if (newCard && isValidMove(newCard, afterDraw.discardPile[afterDraw.discardPile.length - 1], afterDraw.activeColor, afterDraw.pendingDraw, afterDraw.houseRules)) {
          const followUp = chooseBotMove(afterDraw, idx);
          if (followUp.type === "play") {
            setTimeout(() => sfx.swish(), 400);
            return playCard(afterDraw, idx, followUp.cardId, followUp.chosenColor);
          }
        }
        return endTurn(afterDraw, idx);
      });
    }, delay);
    return () => clearTimeout(t);
  }, [game.currentPlayer, game.winner, game.pendingAction, currentPlayer, setGame, enableBots]);

  // Edge-clip fix
  useEffect(() => {
    if (!selectedId) return;
    const el = cardRefs.current[selectedId];
    if (el) el.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  // Reset per-turn state for fixed-viewer modes
  useEffect(() => {
    if (isPassAndPlay) return;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);
  }, [currentIdx, isPassAndPlay]);

  const onCardTap = (cardId: string) => {
    if (!myTurn || !revealed) return;
    if (game.pendingAction !== null) return;
    const card = game.hands[handViewIdx].find((c) => c.id === cardId);
    if (!card) return;
    const playable = isValidMove(card, top, game.activeColor, game.pendingDraw, game.houseRules);
    setDrawArmed(false);
    if (!playable) {
      sfx.click();
      setSelectedId(cardId);
      return;
    }
    if (selectedId !== cardId) {
      sfx.click();
      setSelectedId(cardId);
      return;
    }
    confirmPlay();
  };

  const confirmPlay = () => {
    if (!selectedId) return;
    const card = game.hands[handViewIdx].find((c) => c.id === selectedId);
    if (!card) return;
    const playable = isValidMove(card, top, game.activeColor, game.pendingDraw, game.houseRules);
    if (!playable) return;
    if (card.color === "wild") {
      setPickColorFor(selectedId);
      return;
    }
    sfx.swish();
    act.play(selectedId);
    setSelectedId(null);
  };

  const handlePickColor = (color: UnoColor) => {
    if (!pickColorFor) return;
    sfx.swish();
    act.play(pickColorFor, color);
    setPickColorFor(null);
    setSelectedId(null);
  };

  const onDrawPileTap = () => {
    if (!myTurn || !revealed) return;
    if (game.pendingAction !== null) return;
    if (selectedId) {
      setSelectedId(null);
      return;
    }
    if (hasDrawnThisTurn) return;
    if (!drawArmed) {
      sfx.click();
      setDrawArmed(true);
      return;
    }
    sfx.draw();
    act.draw();
    setHasDrawnThisTurn(true);
    setDrawArmed(false);
  };

  const onPass = () => {
    if (!myTurn || !revealed) return;
    act.endTurn();
  };

  const onPickSwap = (targetIdx: number) => {
    act.resolveSwap(targetIdx);
    setSwapPickerFor(null);
  };

  useEffect(() => {
    if (
      game.pendingAction?.type === "swap7" &&
      game.pendingAction.from === handViewIdx &&
      revealed
    ) {
      setSwapPickerFor(game.pendingAction.from);
    } else {
      setSwapPickerFor(null);
    }
  }, [game.pendingAction, handViewIdx, revealed]);

  const myHand = game.hands[handViewIdx] ?? [];
  const playableExists = myTurn && hasPlayableCard(game, handViewIdx);
  const canPass = myTurn && hasDrawnThisTurn && !playableExists && game.pendingAction === null;

  // Seat assignments — viewers own the bottom seat
  const otherIdxs = game.players.map((_, i) => i).filter((i) => i !== handViewIdx);
  const positions = seatLayout(game.players.length);
  const seated: { pos: SeatPos; idx: number }[] = otherIdxs.map((idx, i) => ({
    pos: positions[i] ?? "top",
    idx,
  }));
  const seatAt = (pos: SeatPos) => seated.find((s) => s.pos === pos);

  return (
    <div
      className="min-h-screen w-full flex flex-col text-white animate-[fadeIn_.2s_ease-out]"
      style={{
        background:
          "radial-gradient(ellipse at center, hsl(140 60% 18%) 0%, hsl(140 60% 10%) 55%, #000 100%)",
      }}
    >
      <header className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-black/40 z-10">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="Menu"
        >
          ←
        </button>
        <div className="flex flex-col items-center min-w-0 leading-tight">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs text-white/50">Now playing:</span>
            <span className="text-sm font-bold truncate">
              {currentPlayer?.name}
              {currentPlayer?.kind === "bot" ? " (AI)" : ""}
            </span>
            <span
              className={`w-3 h-3 rounded-full ${colorSwatch[game.activeColor]} border border-white/40`}
            />
            {game.pendingDraw > 0 ? (
              <span className="ml-1 px-2 py-0.5 rounded bg-red-500/40 text-red-50 text-[10px] font-bold">
                +{game.pendingDraw}
              </span>
            ) : null}
          </div>
          {upNext && game.winner === null ? (
            <div className="text-[10px] text-white/50 mt-0.5">
              Next up: <span className="text-white/80 font-semibold">{upNext.name}</span>
              {upNext.kind === "bot" ? " (AI)" : ""}
            </div>
          ) : null}
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm"
          aria-label="Rules"
        >
          ?
        </button>
      </header>

      {/* Table */}
      <div className="flex-1 grid relative" style={tableGridStyle}>
        <div className="row-start-1 col-start-2 flex items-start justify-center pt-2">
          {seatAt("top") ? (
            <SeatView
              orientation="horizontal"
              hand={game.hands[seatAt("top")!.idx]}
              player={game.players[seatAt("top")!.idx]}
              idx={seatAt("top")!.idx}
              active={currentIdx === seatAt("top")!.idx}
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
              active={currentIdx === seatAt("left")!.idx}
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
              active={currentIdx === seatAt("right")!.idx}
            />
          ) : null}
        </div>

        <div
          className="row-start-2 col-start-2 flex items-center justify-center gap-4"
          onClick={() => {
            setSelectedId(null);
            setDrawArmed(false);
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDrawPileTap();
            }}
            disabled={!myTurn || !revealed || hasDrawnThisTurn || game.pendingAction !== null}
            className={`flex flex-col items-center gap-1 transition rounded-xl p-1 ${
              myTurn && revealed && !hasDrawnThisTurn && game.pendingAction === null
                ? "active:scale-95"
                : "opacity-70"
            } ${drawArmed ? "ring-4 ring-white shadow-2xl -translate-y-2" : ""}`}
          >
            <UnoCardView card={{ id: "back", color: "wild", value: "wild" }} faceDown size="md" />
            <span className="text-[10px] text-white/70">
              {hasDrawnThisTurn ? "Drew" : drawArmed ? "Tap again" : "Draw"} ({game.drawPile.length})
            </span>
          </button>
          <div className="flex flex-col items-center gap-1">
            <div key={top.id} className="animate-[flyIn_.35s_ease-out]">
              <UnoCardView card={top} disabled size="md" highlightColor={game.activeColor} />
            </div>
            <span className="text-[10px] text-white/60">Top</span>
          </div>
        </div>

        {/* Impact text overlay */}
        {announcement ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div
              className="font-black tracking-wider text-white animate-[impactText_1.5s_ease-out_forwards]"
              style={{
                fontSize: "clamp(2.5rem, 8vw, 5rem)",
                WebkitTextStroke: "3px black",
                textShadow: "0 6px 18px rgba(0,0,0,0.7), 0 0 30px rgba(255,255,255,0.3)",
                letterSpacing: "0.03em",
              }}
            >
              {announcement}
            </div>
          </div>
        ) : null}
      </div>

      {/* Game Log */}
      <div className="mx-3 mb-2 max-h-14 overflow-y-auto rounded-md bg-black/40 border border-white/10 px-3 py-1.5 text-[11px] text-white/80 space-y-0.5 z-10">
        {game.log.slice(0, 4).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Hand */}
      <div className="border-t border-white/10 pt-2 pb-3 bg-black/50 z-10">
        <div className="flex items-center justify-between mb-1 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              name={game.players[handViewIdx]?.name ?? "?"}
              idx={handViewIdx}
              kind={game.players[handViewIdx]?.kind ?? "human"}
              size="sm"
              glow={myTurn}
            />
            <span className="text-sm font-semibold truncate">
              {game.players[handViewIdx]?.name} ({myHand.length})
            </span>
            {!myTurn && game.winner === null ? (
              <span className="text-[10px] text-white/50 ml-1">waiting…</span>
            ) : null}
          </div>
          {canPass ? (
            <button
              onClick={onPass}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[hsl(48_100%_50%)] text-black active:scale-95"
            >
              End Turn
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
        <div className="overflow-x-auto pt-12 px-3 scroll-smooth">
          <div className="flex gap-2 items-end pb-2">
            {myHand.map((c) => {
              const playable = myTurn && isValidMove(c, top, game.activeColor, game.pendingDraw, game.houseRules);
              const selected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  ref={(el) => { cardRefs.current[c.id] = el; }}
                  className={`shrink-0 transition-transform duration-150 relative ${selected ? "-translate-y-8" : ""}`}
                  style={{ zIndex: selected ? 30 : 1 }}
                >
                  {selected && playable ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmPlay();
                      }}
                      className="absolute left-1/2 -translate-x-1/2 -top-9 px-3 py-1 rounded-full bg-[hsl(140_70%_42%)] text-white text-xs font-bold shadow-lg active:scale-95 whitespace-nowrap z-40"
                    >
                      ✓ Play
                    </button>
                  ) : null}
                  <div className={`rounded-xl ${selected ? "ring-4 ring-white shadow-2xl" : ""}`}>
                    <UnoCardView
                      card={revealed || !myTurn ? c : { ...c, color: "wild", value: "wild" }}
                      onClick={() => onCardTap(c.id)}
                      disabled={!myTurn || !revealed || (!playable && !selected)}
                      faceDown={!revealed && myTurn && isPassAndPlay}
                      size="lg"
                    />
                  </div>
                </div>
              );
            })}
            {myHand.length === 0 ? (
              <span className="text-white/50 text-sm py-6">No cards.</span>
            ) : null}
          </div>
        </div>
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
            sfx.click();
          }}
        />
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}
    </div>
  );
}

const tableGridStyle: React.CSSProperties = {
  gridTemplateColumns: "minmax(60px, 1fr) 3fr minmax(60px, 1fr)",
  gridTemplateRows: "auto 1fr",
  minHeight: "260px",
};

function SeatView({
  orientation,
  hand,
  player,
  idx,
  active,
}: {
  orientation: "horizontal" | "vertical";
  hand: UnoCard[];
  player: { name: string; kind: "human" | "bot" };
  idx: number;
  active: boolean;
}) {
  const shown = hand.slice(0, 7);
  const extra = hand.length - shown.length;
  return (
    <div className="flex flex-col items-center gap-1">
      <Avatar name={player.name} idx={idx} kind={player.kind} size="sm" glow={active} />
      <div className="text-[10px] text-white/70 text-center max-w-[80px] truncate">
        {player.name}
        {player.kind === "bot" ? " (AI)" : ""}
        <div className="text-white/50">{hand.length} cards</div>
      </div>
      <div
        className={`flex items-center ${orientation === "horizontal" ? "flex-row -space-x-3" : "flex-col -space-y-7"}`}
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
            <UnoCardView card={c} faceDown size="sm" />
          </div>
        ))}
        {extra > 0 ? (
          <div className="text-[10px] text-white/60 ml-1">+{extra}</div>
        ) : null}
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
    <div className="fixed inset-0 z-40 bg-gradient-to-br from-[hsl(0_60%_15%)] via-black to-black flex flex-col items-center justify-center px-6 text-center animate-[fadeIn_.2s_ease-out]">
      <div className="mb-4">
        <Avatar name={name} idx={idx} kind="human" size="lg" glow />
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
