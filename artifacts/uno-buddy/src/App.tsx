import { useEffect, useRef, useState } from "react";
import {
  dealNewGame,
  drawOne,
  endTurn,
  playCard,
  resolveSwap,
  type GameMode,
  type GameState,
  type HouseRules,
  type PlayerConfig,
  type UnoColor,
} from "@/lib/uno-engine";
import { MainMenu } from "@/components/MainMenu";
import { ModeSelect } from "@/components/ModeSelect";
import { SetupScreen } from "@/components/SetupScreen";
import { GameBoard, type GameActions } from "@/components/GameBoard";
import { RulesPanel } from "@/components/RulesPanel";
import { LocalMultiplayer } from "@/components/LocalMultiplayer";
import type { HostHandle, JoinHandle } from "@/lib/peerSync";

const STORAGE_KEY = "uno-buddy:game";

type Screen = "menu" | "mode" | "setup" | "game" | "scoring" | "lobby";

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

interface MultiSession {
  role: "host" | "join";
  viewerIdx: number;
  host: HostHandle | null;
  join: JoinHandle | null;
}

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [chosenMode, setChosenMode] = useState<GameMode>("standard");
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [showRules, setShowRules] = useState(false);
  const [multi, setMulti] = useState<MultiSession | null>(null);
  const gameRef = useRef<GameState | null>(game);
  gameRef.current = game;

  useEffect(() => {
    if (game && !multi) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    }
  }, [game, multi]);

  // Multiplayer wiring
  useEffect(() => {
    if (!multi) return;
    if (multi.role === "host" && multi.host) {
      const h = multi.host;
      h.onMessage((msg) => {
        if (msg.type === "action") {
          setGame((g) => {
            if (!g) return g;
            const a = msg.action;
            let next = g;
            if (a.kind === "play") next = playCard(g, 1, a.cardId, a.color);
            else if (a.kind === "draw") next = drawOne(g, 1);
            else if (a.kind === "endTurn") next = endTurn(g, 1);
            else if (a.kind === "swap") next = resolveSwap(g, a.targetIdx);
            h.broadcast({ type: "state", game: next });
            return next;
          });
        }
      });
    } else if (multi.role === "join" && multi.join) {
      const j = multi.join;
      j.onMessage((msg) => {
        if (msg.type === "state") setGame(msg.game);
      });
    }
  }, [multi]);

  // Host: re-broadcast whenever local game changes
  useEffect(() => {
    if (!multi || multi.role !== "host" || !multi.host || !game) return;
    multi.host.broadcast({ type: "state", game });
  }, [game, multi]);

  const handleStart = (
    players: PlayerConfig[],
    rules: HouseRules,
    mode: GameMode,
  ) => {
    const g = dealNewGame({ players, houseRules: rules, mode });
    setGame(g);
    setScreen("game");
  };

  const updateGame = (updater: (g: GameState) => GameState) => {
    setGame((prev) => (prev ? updater(prev) : prev));
  };

  const exitGame = () => {
    if (multi) {
      multi.host?.destroy();
      multi.join?.destroy();
      setMulti(null);
    }
    setScreen("menu");
  };

  // Joiner-side action sender
  const joinerActions: GameActions | undefined =
    multi?.role === "join" && multi.join
      ? {
          play: (cardId, color) =>
            multi.join!.send({ type: "action", action: { kind: "play", cardId, color } }),
          draw: () =>
            multi.join!.send({ type: "action", action: { kind: "draw" } }),
          endTurn: () =>
            multi.join!.send({ type: "action", action: { kind: "endTurn" } }),
          resolveSwap: (targetIdx) =>
            multi.join!.send({ type: "action", action: { kind: "swap", targetIdx } }),
        }
      : undefined;

  const onMultiStart = (
    initialGame: GameState,
    role: "host" | "join",
    viewerIdx: number,
    host: HostHandle | null,
    join: JoinHandle | null,
  ) => {
    setGame(initialGame);
    setMulti({ role, viewerIdx, host, join });
    setScreen("game");
  };

  return (
    <div key={screen} className="animate-[fadeIn_.22s_ease-out]">
      {screen === "menu" ? (
        <MainMenu
          hasSavedGame={game !== null && game.winner === null && !multi}
          onContinue={() => setScreen("game")}
          onNew={() => setScreen("mode")}
          onLocalMultiplayer={() => setScreen("lobby")}
          onScoring={() => setScreen("scoring")}
          onRules={() => setShowRules(true)}
        />
      ) : null}

      {screen === "mode" ? (
        <ModeSelect
          onBack={() => setScreen("menu")}
          onChoose={(m) => {
            setChosenMode(m);
            setScreen("setup");
          }}
        />
      ) : null}

      {screen === "setup" ? (
        <SetupScreen
          mode={chosenMode}
          onBack={() => setScreen("mode")}
          onStart={handleStart}
        />
      ) : null}

      {screen === "lobby" ? (
        <LocalMultiplayer
          onBack={() => setScreen("menu")}
          onStart={onMultiStart}
        />
      ) : null}

      {screen === "game" && game ? (
        <GameBoard
          game={game}
          setGame={updateGame}
          onExit={exitGame}
          viewerIdx={multi?.viewerIdx}
          actions={joinerActions}
          enableBots={!multi}
          passAndPlay={!multi}
        />
      ) : null}

      {screen === "scoring" ? (
        <ScoringPlaceholder onBack={() => setScreen("menu")} />
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px) } to { opacity: 1; transform: translateY(0) } }
        @keyframes flyIn {
          from { opacity: 0; transform: translateY(-180px) scale(.7) rotate(-12deg); }
          60% { opacity: 1; }
          to { opacity: 1; transform: translateY(0) scale(1) rotate(0); }
        }
        @keyframes impactText {
          0% { transform: scale(0); opacity: 0; }
          18% { transform: scale(1.25); opacity: 1; }
          32% { transform: scale(1); opacity: 1; }
          70% { transform: scale(1) translateY(0); opacity: 1; }
          100% { transform: scale(1.05) translateY(-50px); opacity: 0; }
        }
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
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
