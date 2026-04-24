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
} from "@/lib/uno-engine";
import { MainMenu } from "@/components/MainMenu";
import { ModeSelect } from "@/components/ModeSelect";
import { SetupScreen } from "@/components/SetupScreen";
import { GameBoard, type GameActions } from "@/components/GameBoard";
import { RulesPanel } from "@/components/RulesPanel";
import { StartGameChoice } from "@/components/StartGameChoice";
import { HostLobby, type HostStartResult } from "@/components/HostLobby";
import { JoinScreen, type JoinStartResult } from "@/components/JoinScreen";
import type { HostHandle, JoinHandle, SyncMessage } from "@/lib/peerSync";

const STORAGE_KEY = "uno-buddy:game";

type Screen =
  | "menu"
  | "startMode"
  | "modeOffline"
  | "modeOnline"
  | "setup"
  | "hostLobby"
  | "joinLobby"
  | "joinFlow"
  | "game"
  | "scoring";

type Intent = "offline" | "online-host" | "online-join";

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
  peerAssignments: Record<string, number>;
}

function App() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [intent, setIntent] = useState<Intent>("offline");
  const [chosenMode, setChosenMode] = useState<GameMode>("standard");
  const [game, setGame] = useState<GameState | null>(() => loadGame());
  const [showRules, setShowRules] = useState(false);
  const [multi, setMulti] = useState<MultiSession | null>(null);
  const gameRef = useRef<GameState | null>(game);
  gameRef.current = game;

  // Persist solo games only
  useEffect(() => {
    if (game && !multi) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(game));
    }
  }, [game, multi]);

  // === Multiplayer wiring ===
  // Host: handle incoming actions from any peer.
  useEffect(() => {
    if (!multi || multi.role !== "host" || !multi.host) return;
    const h = multi.host;
    h.onMessage((connId, msg) => {
      if (msg.type !== "action") return;
      const peerIdx = multi.peerAssignments[connId];
      if (peerIdx === undefined) return;
      setGame((g) => {
        if (!g) return g;
        // Validate that this peer is the current player.
        if (g.currentPlayer !== peerIdx && msg.action.kind !== "swap") return g;
        if (
          msg.action.kind === "swap" &&
          (g.pendingAction?.type !== "swap7" || g.pendingAction.from !== peerIdx)
        ) {
          return g;
        }
        const a = msg.action;
        if (a.kind === "play") return playCard(g, peerIdx, a.cardId, a.color);
        if (a.kind === "draw") return drawOne(g, peerIdx);
        if (a.kind === "endTurn") return endTurn(g, peerIdx);
        if (a.kind === "swap") return resolveSwap(g, a.targetIdx);
        return g;
      });
    });
    h.onLeave(() => {
      // Player disconnected mid-game — keep game running (their slot just won't act).
    });
  }, [multi]);

  // Host: broadcast latest state on every game change. (Source of truth)
  useEffect(() => {
    if (!multi || multi.role !== "host" || !multi.host || !game) return;
    multi.host.broadcast({ type: "state", game } as SyncMessage);
  }, [game, multi]);

  // Joiner: incoming state updates the local game.
  useEffect(() => {
    if (!multi || multi.role !== "join" || !multi.join) return;
    const j = multi.join;
    j.onMessage((msg) => {
      if (msg.type === "state") setGame(msg.game);
      else if (msg.type === "kicked") {
        cleanupMulti();
        setScreen("menu");
      }
    });
    j.onClose(() => {
      cleanupMulti();
      setScreen("menu");
    });
  }, [multi]);

  const cleanupMulti = () => {
    if (multi) {
      multi.host?.destroy();
      multi.join?.destroy();
    }
    setMulti(null);
  };

  const handleStartOffline = (
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
    cleanupMulti();
    setScreen("menu");
  };

  const joinerActions: GameActions | undefined =
    multi?.role === "join" && multi.join
      ? {
          play: (cardId, color) =>
            multi.join!.send({
              type: "action",
              action: { kind: "play", cardId, color },
            }),
          draw: () =>
            multi.join!.send({ type: "action", action: { kind: "draw" } }),
          endTurn: () =>
            multi.join!.send({ type: "action", action: { kind: "endTurn" } }),
          resolveSwap: (targetIdx) =>
            multi.join!.send({
              type: "action",
              action: { kind: "swap", targetIdx },
            }),
        }
      : undefined;

  const onHostStart = (r: HostStartResult) => {
    setGame(r.game);
    setMulti({
      role: "host",
      viewerIdx: r.viewerIdx,
      host: r.host,
      join: null,
      peerAssignments: r.peerAssignments,
    });
    setScreen("game");
  };

  const onJoinStart = (r: JoinStartResult) => {
    setGame(r.game);
    setMulti({
      role: "join",
      viewerIdx: r.viewerIdx,
      host: null,
      join: r.join,
      peerAssignments: {},
    });
    setScreen("game");
  };

  return (
    <div key={screen} className="animate-[fadeSlide_.28s_cubic-bezier(.2,.8,.2,1)]">
      {screen === "menu" ? (
        <MainMenu
          hasSavedGame={game !== null && game.winner === null && !multi}
          onContinue={() => setScreen("game")}
          onNew={() => setScreen("startMode")}
          onScoring={() => setScreen("scoring")}
          onRules={() => setShowRules(true)}
        />
      ) : null}

      {screen === "startMode" ? (
        <StartGameChoice
          onBack={() => setScreen("menu")}
          onChoose={(choice) => {
            if (choice === "offline") {
              setIntent("offline");
              setScreen("modeOffline");
            } else {
              // Local network — first sub-choice is host vs join
              setScreen("joinFlow");
            }
          }}
        />
      ) : null}

      {screen === "joinFlow" ? (
        <NetworkChoice
          onBack={() => setScreen("startMode")}
          onHost={() => {
            setIntent("online-host");
            setScreen("modeOnline");
          }}
          onJoin={() => {
            setIntent("online-join");
            setScreen("joinLobby");
          }}
        />
      ) : null}

      {screen === "modeOffline" ? (
        <ModeSelect
          onBack={() => setScreen("startMode")}
          onChoose={(m) => {
            setChosenMode(m);
            setScreen("setup");
          }}
        />
      ) : null}

      {screen === "modeOnline" ? (
        <ModeSelect
          onBack={() => setScreen("joinFlow")}
          onChoose={(m) => {
            setChosenMode(m);
            setScreen("hostLobby");
          }}
        />
      ) : null}

      {screen === "setup" ? (
        <SetupScreen
          mode={chosenMode}
          onBack={() => setScreen("modeOffline")}
          onStart={handleStartOffline}
        />
      ) : null}

      {screen === "hostLobby" ? (
        <HostLobby
          mode={chosenMode}
          onBack={() => setScreen("modeOnline")}
          onStart={onHostStart}
        />
      ) : null}

      {screen === "joinLobby" ? (
        <JoinScreen
          onBack={() => setScreen("joinFlow")}
          onStart={onJoinStart}
        />
      ) : null}

      {screen === "game" && game ? (
        <GameBoard
          game={game}
          setGame={updateGame}
          onExit={exitGame}
          viewerIdx={multi?.viewerIdx}
          actions={joinerActions}
          enableBots={!multi || multi.role === "host"}
          passAndPlay={!multi}
        />
      ) : null}

      {screen === "scoring" ? (
        <ScoringPlaceholder onBack={() => setScreen("menu")} />
      ) : null}

      {showRules ? <RulesPanel onClose={() => setShowRules(false)} /> : null}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(8px) scale(.995); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
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

function NetworkChoice({
  onBack,
  onHost,
  onJoin,
}: {
  onBack: () => void;
  onHost: () => void;
  onJoin: () => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background:
          "radial-gradient(ellipse 60% 60% at 30% 10%, hsl(280 50% 22% / 0.65), transparent 60%), radial-gradient(ellipse 60% 60% at 80% 90%, hsl(215 50% 18% / 0.65), transparent 60%), #060608",
      }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-semibold tracking-wide">Local Network</h1>
      </header>
      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full flex flex-col gap-3 justify-center">
        <button
          onClick={onHost}
          className="rounded-3xl bg-gradient-to-br from-[hsl(280_55%_35%)]/40 to-[hsl(260_55%_22%)]/30 border border-[hsl(280_55%_55%)]/30 backdrop-blur-2xl px-5 py-6 text-left active:scale-[.98] transition shadow-[0_8px_60px_-30px_hsl(280_60%_55%/.7)] relative"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="text-xs uppercase tracking-[0.25em] text-white/55 font-semibold">
            Be the host
          </div>
          <div className="text-2xl font-bold mt-0.5">Create a Room</div>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Get a 4-digit code to share. You set the mode and manage the lobby.
          </p>
        </button>
        <button
          onClick={onJoin}
          className="rounded-3xl bg-gradient-to-br from-[hsl(215_70%_30%)]/40 to-[hsl(215_70%_18%)]/30 border border-[hsl(215_70%_60%)]/30 backdrop-blur-2xl px-5 py-6 text-left active:scale-[.98] transition shadow-[0_8px_60px_-30px_hsl(215_70%_55%/.7)] relative"
        >
          <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="text-xs uppercase tracking-[0.25em] text-white/55 font-semibold">
            Join a friend
          </div>
          <div className="text-2xl font-bold mt-0.5">Enter a Code</div>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            Enter the 4-digit code your host shared with you.
          </p>
        </button>
      </div>
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
