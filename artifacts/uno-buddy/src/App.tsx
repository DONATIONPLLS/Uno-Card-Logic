import { useEffect, useState } from "react";
import {
  dealNewGame,
  type GameState,
  type HouseRules,
  type PlayerConfig,
} from "@/lib/uno-engine";
import { MainMenu } from "@/components/MainMenu";
import { SetupScreen } from "@/components/SetupScreen";
import { GameBoard } from "@/components/GameBoard";
import { RulesPanel } from "@/components/RulesPanel";

const STORAGE_KEY = "uno-buddy:game";

type Screen = "menu" | "setup" | "game" | "scoring";

function loadGame(): GameState | null {
  if (typeof window === "undefined") return null;
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) return null;
  try {
    const g = JSON.parse(saved) as GameState;
    if (!g.players || !g.hands) return null;
    return g;
  } catch {
    return null;
  }
}

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    if (game) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    }
  }, [game]);

  const handleStart = (players: PlayerConfig[], rules: HouseRules) => {
    const g = dealNewGame({ players, houseRules: rules });
    setGame(g);
    setScreen("game");
  };

  const updateGame = (updater: (g: GameState) => GameState) => {
    setGame((prev) => (prev ? updater(prev) : prev));
  };

  return (
    <div key={screen} className="animate-[fadeIn_.22s_ease-out]">
      {screen === "menu" ? (
        <MainMenu
          hasSavedGame={game !== null && game.winner === null}
          onContinue={() => setScreen("game")}
          onNew={() => setScreen("setup")}
          onScoring={() => setScreen("scoring")}
          onRules={() => setShowRules(true)}
        />
      ) : null}

      {screen === "setup" ? (
        <SetupScreen onBack={() => setScreen("menu")} onStart={handleStart} />
      ) : null}

      {screen === "game" && game ? (
        <GameBoard
          game={game}
          setGame={updateGame}
          onExit={() => setScreen("menu")}
        />
      ) : null}

      {screen === "scoring" ? (
        <ScoringPlaceholder onBack={() => setScreen("menu")} />
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}

function ScoringPlaceholder({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[hsl(215_85%_25%)] via-neutral-900 to-black text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Scoring Mode</h1>
      </header>
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div className="space-y-3 max-w-xs">
          <div className="text-5xl">📋</div>
          <h2 className="text-2xl font-bold">Coming next</h2>
          <p className="text-white/60 text-sm">
            A digital scorecard for tracking points across rounds of physical Uno.
            Players, round-by-round scores, and running totals — all saved on your device.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
