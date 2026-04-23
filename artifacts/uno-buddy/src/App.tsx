import { useEffect, useState } from "react";
import {
  dealNewGame,
  drawTurn,
  playCard,
  type GameState,
  type UnoColor,
} from "@/lib/uno-engine";
import { UnoCardView } from "@/components/UnoCardView";

const STORAGE_KEY = "uno-buddy:game";

const colorSwatch: Record<UnoColor, string> = {
  red: "bg-[hsl(0_85%_50%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
};

function App() {
  const [game, setGame] = useState<GameState>(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved) as GameState;
        } catch {
          // ignore
        }
      }
    }
    return dealNewGame(2);
  });
  const [pickColorFor, setPickColorFor] = useState<string | null>(null);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
  }, [game]);

  const top = game.discardPile[game.discardPile.length - 1];
  const me = 0;
  const myHand = game.hands[me];
  const isMyTurn = game.currentPlayer === me && game.winner === null;

  const handlePlay = (cardId: string) => {
    const card = myHand.find((c) => c.id === cardId);
    if (!card) return;
    if (card.color === "wild") {
      setPickColorFor(cardId);
      return;
    }
    setGame((g) => playCard(g, me, cardId));
  };

  const handlePickColor = (color: UnoColor) => {
    if (!pickColorFor) return;
    setGame((g) => playCard(g, me, pickColorFor, color));
    setPickColorFor(null);
  };

  const handleDraw = () => {
    setGame((g) => drawTurn(g, me));
  };

  const handleNewGame = () => {
    setGame(dealNewGame(2));
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-gradient-to-b from-neutral-900 to-neutral-800 text-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h1 className="text-xl font-black italic tracking-tight">
          <span className="text-[hsl(0_85%_55%)]">U</span>
          <span className="text-[hsl(48_100%_55%)]">N</span>
          <span className="text-[hsl(140_70%_45%)]">O</span>
          <span className="text-white"> Buddy</span>
        </h1>
        <button
          onClick={handleNewGame}
          className="px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 text-sm font-semibold"
        >
          New Game
        </button>
      </header>

      {/* Opponent */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white/70">
            Player 2 · {game.hands[1].length} cards
          </span>
          {game.currentPlayer === 1 && game.winner === null ? (
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20">Their turn</span>
          ) : null}
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          {game.hands[1].map((c) => (
            <UnoCardView key={c.id} card={c} small faceDown />
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4 py-6">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center gap-1">
            <UnoCardView card={{ id: "back", color: "wild", value: "wild" }} faceDown />
            <span className="text-xs text-white/60">Draw ({game.drawPile.length})</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <UnoCardView card={top} disabled />
            <span className="text-xs text-white/60">Top card</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/60">Active color:</span>
          <span className={`w-5 h-5 rounded-full ${colorSwatch[game.activeColor]} border border-white/40`} />
          <span className="capitalize">{game.activeColor}</span>
          {game.pendingDraw > 0 ? (
            <span className="ml-3 px-2 py-0.5 rounded bg-red-500/30 text-red-100 text-xs font-bold">
              +{game.pendingDraw} pending
            </span>
          ) : null}
        </div>
        {game.winner !== null ? (
          <div className="text-2xl font-black text-center">
            🎉 Player {game.winner + 1} wins!
          </div>
        ) : null}
      </div>

      {/* Game Log */}
      <div className="mx-4 mb-3 max-h-24 overflow-y-auto rounded-md bg-black/40 border border-white/10 px-3 py-2 text-xs text-white/80 space-y-0.5">
        {game.log.slice(0, 6).map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>

      {/* Hand */}
      <div className="border-t border-white/10 px-3 pt-3 pb-4 bg-black/30">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-sm font-semibold">
            Your hand ({myHand.length})
          </span>
          <button
            onClick={handleDraw}
            disabled={!isMyTurn}
            className={`px-3 py-1.5 rounded-md text-sm font-semibold ${
              isMyTurn
                ? "bg-white text-black active:scale-95"
                : "bg-white/10 text-white/40"
            }`}
          >
            {game.pendingDraw > 0 ? `Draw ${game.pendingDraw}` : "Draw card"}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 px-1">
          {myHand.map((c) => (
            <div key={c.id} className="shrink-0">
              <UnoCardView
                card={c}
                onClick={() => handlePlay(c.id)}
                disabled={!isMyTurn}
              />
            </div>
          ))}
          {myHand.length === 0 ? (
            <span className="text-white/50 text-sm py-6">No cards.</span>
          ) : null}
        </div>
      </div>

      {/* Color picker modal */}
      {pickColorFor ? (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-6">
          <div className="bg-neutral-900 rounded-xl p-5 w-full max-w-xs border border-white/10">
            <div className="text-center text-sm font-semibold mb-3">Choose a color</div>
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
            <button
              onClick={() => setPickColorFor(null)}
              className="w-full mt-3 text-xs text-white/60 py-1"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default App;
