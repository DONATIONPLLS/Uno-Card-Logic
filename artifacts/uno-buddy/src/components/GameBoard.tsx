import { useEffect, useRef, useState } from "react";
import {
  chooseBotMove,
  chooseBotSwapTarget,
  describe,
  drawOne,
  endTurn,
  hasPlayableCard,
  isValidMove,
  nameOf,
  playCard,
  resolveSwap,
  type GameState,
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

export function GameBoard({
  game,
  setGame,
  onExit,
}: {
  game: GameState;
  setGame: (updater: (g: GameState) => GameState) => void;
  onExit: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pickColorFor, setPickColorFor] = useState<string | null>(null);
  const [swapPickerFor, setSwapPickerFor] = useState<number | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [hasDrawnThisTurn, setHasDrawnThisTurn] = useState(false);
  const [drawArmed, setDrawArmed] = useState(false);
  const prevTurnRef = useRef<{ idx: number; kind: "human" | "bot" } | null>(null);
  const [overlayKind, setOverlayKind] = useState<"pass" | "yourturn" | null>(null);
  const wonRef = useRef(false);

  const currentIdx = game.currentPlayer;
  const currentPlayer = game.players[currentIdx];
  const isHumanTurn = currentPlayer?.kind === "human" && game.winner === null;
  const top = game.discardPile[game.discardPile.length - 1];

  // Win sound (once)
  useEffect(() => {
    if (game.winner !== null && !wonRef.current) {
      wonRef.current = true;
      sfx.win();
    }
  }, [game.winner]);

  // Turn change handling: privacy overlay logic + reset
  useEffect(() => {
    const prev = prevTurnRef.current;
    const cur = { idx: currentIdx, kind: currentPlayer?.kind ?? "human" };
    if (prev?.idx === cur.idx) return;
    prevTurnRef.current = cur;
    setSelectedId(null);
    setPickColorFor(null);
    setHasDrawnThisTurn(false);
    setDrawArmed(false);

    if (game.winner !== null) {
      setRevealed(true);
      setOverlayKind(null);
      return;
    }

    if (cur.kind === "bot") {
      // No privacy for bot turns — reveal table immediately
      setRevealed(true);
      setOverlayKind(null);
      return;
    }
    // Human turn
    setRevealed(false);
    if (!prev) {
      setOverlayKind("pass"); // start of game
    } else if (prev.kind === "bot") {
      setOverlayKind("yourturn");
      sfx.ding();
    } else {
      setOverlayKind("pass");
    }
  }, [currentIdx, currentPlayer?.kind, game.winner]);

  // Bot turn loop
  useEffect(() => {
    if (game.winner !== null) return;
    if (game.pendingAction?.type === "swap7") {
      const fromKind = game.players[game.pendingAction.from].kind;
      if (fromKind === "bot") {
        const t = setTimeout(() => {
          setGame((g) => {
            if (g.pendingAction?.type !== "swap7") return g;
            return resolveSwap(g, chooseBotSwapTarget(g));
          });
        }, 700);
        return () => clearTimeout(t);
      }
      return;
    }
    if (currentPlayer?.kind !== "bot") return;
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
            setTimeout(() => sfx.swish(), 300);
            return playCard(afterDraw, idx, followUp.cardId, followUp.chosenColor);
          }
        }
        return endTurn(afterDraw, idx);
      });
    }, 850);
    return () => clearTimeout(t);
  }, [game.currentPlayer, game.winner, game.pendingAction, currentPlayer, setGame]);

  const onCardTap = (cardId: string) => {
    if (!isHumanTurn || !revealed) return;
    if (game.pendingAction !== null) return;
    const card = game.hands[currentIdx].find((c) => c.id === cardId);
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
    if (card.color === "wild") {
      setPickColorFor(cardId);
      return;
    }
    sfx.swish();
    setGame((g) => playCard(g, currentIdx, cardId));
    setSelectedId(null);
  };

  const handlePickColor = (color: UnoColor) => {
    if (!pickColorFor) return;
    sfx.swish();
    setGame((g) => playCard(g, currentIdx, pickColorFor, color));
    setPickColorFor(null);
    setSelectedId(null);
  };

  const onDrawPileTap = () => {
    if (!isHumanTurn || !revealed) return;
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
    setGame((g) => drawOne(g, currentIdx));
    setHasDrawnThisTurn(true);
    setDrawArmed(false);
  };

  const onPass = () => {
    if (!isHumanTurn || !revealed) return;
    setGame((g) => endTurn(g, currentIdx));
  };

  const onPickSwap = (targetIdx: number) => {
    setGame((g) => resolveSwap(g, targetIdx));
    setSwapPickerFor(null);
  };

  useEffect(() => {
    if (
      game.pendingAction?.type === "swap7" &&
      game.players[game.pendingAction.from].kind === "human" &&
      revealed
    ) {
      setSwapPickerFor(game.pendingAction.from);
    } else {
      setSwapPickerFor(null);
    }
  }, [game.pendingAction, game.players, revealed]);

  const myHand = game.hands[currentIdx] ?? [];
  const playableExists = isHumanTurn && hasPlayableCard(game, currentIdx);
  const canPass = isHumanTurn && hasDrawnThisTurn && !playableExists && game.pendingAction === null;

  const opponents = game.hands
    .map((h, i) => ({ hand: h, player: game.players[i], idx: i }))
    .filter((o) => o.idx !== currentIdx);

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-900 to-neutral-800 text-white animate-[fadeIn_.2s_ease-out]">
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
        <button
          onClick={onExit}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="Menu"
        >
          ←
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Avatar
            name={currentPlayer?.name ?? "?"}
            idx={currentIdx}
            kind={currentPlayer?.kind ?? "human"}
            size="sm"
            glow
          />
          <div className="min-w-0">
            <div className="text-xs text-white/50 leading-tight">Now playing</div>
            <div className="text-sm font-bold truncate">
              {currentPlayer?.name}
              {currentPlayer?.kind === "bot" ? " (AI)" : ""}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowRules(true)}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center font-bold text-sm"
          aria-label="Rules"
        >
          ?
        </button>
      </header>

      {/* Opponents */}
      <div className="px-4 pt-3 space-y-2">
        {opponents.map((o) => (
          <div key={o.idx} className="flex items-center gap-2">
            <Avatar
              name={o.player.name}
              idx={o.idx}
              kind={o.player.kind}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <div className="text-xs text-white/70 truncate">
                {o.player.name}
                {o.player.kind === "bot" ? " (AI)" : ""} · {o.hand.length} cards
              </div>
              <div className="flex gap-0.5 overflow-x-auto pb-0.5">
                {o.hand.map((c) => (
                  <UnoCardView key={c.id} card={c} small faceDown />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="flex-1 flex flex-col items-center justify-center gap-3 px-4 py-4"
        onClick={() => {
          setSelectedId(null);
          setDrawArmed(false);
        }}
      >
        <div className="flex items-center gap-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDrawPileTap();
            }}
            disabled={!isHumanTurn || !revealed || hasDrawnThisTurn || game.pendingAction !== null}
            className={`flex flex-col items-center gap-1 transition rounded-xl p-1 ${
              isHumanTurn && revealed && !hasDrawnThisTurn && game.pendingAction === null
                ? "active:scale-95"
                : "opacity-60"
            } ${drawArmed ? "ring-4 ring-white shadow-2xl -translate-y-2" : ""}`}
          >
            <UnoCardView card={{ id: "back", color: "wild", value: "wild" }} faceDown />
            <span className="text-xs text-white/70">
              {hasDrawnThisTurn
                ? "Drew"
                : drawArmed
                ? "Tap again to draw"
                : "Tap to draw"}{" "}
              ({game.drawPile.length})
            </span>
          </button>
          <div className="flex flex-col items-center gap-1">
            <div key={top.id} className="animate-[flyIn_.35s_ease-out]">
              <UnoCardView card={top} disabled />
            </div>
            <span className="text-xs text-white/60">Top</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Active:</span>
          <span className={`w-5 h-5 rounded-full ${colorSwatch[game.activeColor]} border border-white/40`} />
          <span className="capitalize">{game.activeColor}</span>
          {game.pendingDraw > 0 ? (
            <span className="ml-3 px-2 py-0.5 rounded bg-red-500/30 text-red-100 text-xs font-bold">
              +{game.pendingDraw} pending
            </span>
          ) : null}
        </div>
        {game.winner !== null ? (
          <div className="text-2xl font-black text-center mt-2">
            🎉 {nameOf(game.players[game.winner])} wins!
          </div>
        ) : null}
      </div>

      {/* Game Log */}
      <div className="mx-4 mb-3 max-h-20 overflow-y-auto rounded-md bg-black/40 border border-white/10 px-3 py-2 text-xs text-white/80 space-y-0.5">
        {game.log.slice(0, 5).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Hand — overflow-visible vertically so a lifted card isn't clipped */}
      <div className="border-t border-white/10 pt-2 pb-4 bg-black/30">
        <div className="flex items-center justify-between mb-1 px-3">
          <div className="flex items-center gap-2 min-w-0">
            <Avatar
              name={currentPlayer?.name ?? "?"}
              idx={currentIdx}
              kind={currentPlayer?.kind ?? "human"}
              size="sm"
              glow={isHumanTurn}
            />
            <span className="text-sm font-semibold truncate">
              {currentPlayer?.name} ({myHand.length})
            </span>
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
        <div className="overflow-x-auto pt-8 px-3">
          <div className="flex gap-2 items-end pb-2">
            {myHand.map((c) => {
              const playable = isHumanTurn && isValidMove(c, top, game.activeColor, game.pendingDraw, game.houseRules);
              const selected = selectedId === c.id;
              return (
                <div
                  key={c.id}
                  className={`shrink-0 transition-transform duration-150 ${selected ? "-translate-y-6" : ""}`}
                  style={{ zIndex: selected ? 30 : 1, position: "relative" }}
                >
                  <div className={`rounded-xl ${selected ? "ring-4 ring-white shadow-2xl" : ""}`}>
                    <UnoCardView
                      card={revealed || !isHumanTurn ? c : { ...c, color: "wild", value: "wild" }}
                      onClick={() => onCardTap(c.id)}
                      disabled={!isHumanTurn || !revealed || (!playable && !selected)}
                      faceDown={!revealed && isHumanTurn}
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
        {selectedId && !canPass ? (
          <div className="text-center text-xs text-white/60 px-1">
            Tap the same card again to play, or tap anywhere to cancel.
          </div>
        ) : null}
      </div>

      {/* Color picker */}
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

      {/* Swap picker */}
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

      {/* Privacy overlay */}
      {isHumanTurn && !revealed && overlayKind && game.winner === null ? (
        <PassOverlay
          name={currentPlayer.name}
          idx={currentIdx}
          kind="human"
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

function PassOverlay({
  name,
  idx,
  kind,
  variant,
  onReveal,
}: {
  name: string;
  idx: number;
  kind: "human";
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
        <Avatar name={name} idx={idx} kind={kind} size="lg" glow />
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
