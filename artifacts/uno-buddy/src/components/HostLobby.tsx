import { useEffect, useRef, useState } from "react";
import {
  createHost,
  makeRoomCode,
  type HostHandle,
  type SyncMessage,
} from "@/lib/peerSync";
import {
  dealNewGame,
  MODE_PRESETS,
  type GameMode,
  type GameState,
  type PlayerConfig,
} from "@/lib/uno-engine";

const MAX_SLOTS = 4;

type Slot =
  | { kind: "host"; name: string }
  | { kind: "open" }
  | { kind: "peer"; connId: string; name: string }
  | { kind: "bot"; name: string }
  | { kind: "off" };

const BOT_NAMES = ["Botley", "Sparky", "Ada", "Cinder", "Pixel"];

export interface HostStartResult {
  game: GameState;
  host: HostHandle;
  viewerIdx: number;
  peerAssignments: Record<string, number>;
}

export function HostLobby({
  mode,
  onBack,
  onStart,
}: {
  mode: GameMode;
  onBack: () => void;
  onStart: (r: HostStartResult) => void;
}) {
  const [code] = useState(() => makeRoomCode());
  const [hostName, setHostName] = useState("Player 1");
  const [status, setStatus] = useState<"creating" | "ready" | "error">("creating");
  const [error, setError] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[]>([
    { kind: "host", name: "Player 1" },
    { kind: "open" },
    { kind: "off" },
    { kind: "off" },
  ]);
  const handleRef = useRef<HostHandle | null>(null);

  useEffect(() => {
    let cancelled = false;
    createHost(code)
      .then((h) => {
        if (cancelled) {
          h.destroy();
          return;
        }
        handleRef.current = h;
        setStatus("ready");
        h.onJoin((info) => {
          setSlots((prev) => {
            const idx = prev.findIndex((s) => s.kind === "open");
            if (idx === -1) {
              h.kick(info.connId);
              return prev;
            }
            const next = [...prev];
            next[idx] = { kind: "peer", connId: info.connId, name: info.name };
            return next;
          });
        });
        h.onLeave((connId) => {
          setSlots((prev) =>
            prev.map((s) =>
              s.kind === "peer" && s.connId === connId ? { kind: "open" } : s,
            ),
          );
        });
      })
      .catch((err) => {
        setStatus("error");
        setError(err?.message ?? "Couldn't create the room.");
      });
    return () => {
      cancelled = true;
      if (handleRef.current) {
        // Don't destroy here if we'll continue into game; let parent handle.
      }
    };
  }, [code]);

  // Sync first slot name with host name
  useEffect(() => {
    setSlots((prev) => {
      const next = [...prev];
      if (next[0]?.kind === "host") next[0] = { kind: "host", name: hostName };
      return next;
    });
  }, [hostName]);

  const updateSlot = (i: number, change: Slot) => {
    setSlots((prev) => {
      const next = [...prev];
      const cur = prev[i];
      if (cur.kind === "peer" && handleRef.current) {
        // Kicking peer
        handleRef.current.kick(cur.connId);
      }
      next[i] = change;
      return next;
    });
  };

  const addBotAt = (i: number) => {
    const usedNames = new Set(
      slots.flatMap((s) => (s.kind === "bot" ? [s.name] : [])),
    );
    const name =
      BOT_NAMES.find((n) => !usedNames.has(n)) ?? `Bot ${i + 1}`;
    updateSlot(i, { kind: "bot", name });
  };

  const liveCount = slots.filter(
    (s) => s.kind === "host" || s.kind === "peer" || s.kind === "bot",
  ).length;
  const canStart = liveCount >= 2 && status === "ready";

  const begin = () => {
    if (!handleRef.current || !canStart) return;

    const players: PlayerConfig[] = [];
    const peerAssignments: Record<string, number> = {};
    for (const s of slots) {
      if (s.kind === "host") players.push({ name: s.name || "Player 1", kind: "human" });
      else if (s.kind === "peer") {
        peerAssignments[s.connId] = players.length;
        players.push({ name: s.name, kind: "human" });
      } else if (s.kind === "bot") players.push({ name: s.name, kind: "bot" });
    }

    const game = dealNewGame({
      players,
      houseRules: mode === "custom" ? undefined : MODE_PRESETS[mode],
      mode,
    });

    // Send assignments + initial state to each peer
    for (const [connId, idx] of Object.entries(peerAssignments)) {
      const assignMsg: SyncMessage = {
        type: "assign",
        viewerIdx: idx,
        players: players.map((p) => ({ name: p.name, kind: p.kind })),
      };
      handleRef.current.sendTo(connId, assignMsg);
    }
    handleRef.current.broadcast({ type: "state", game });

    onStart({
      game,
      host: handleRef.current,
      viewerIdx: 0,
      peerAssignments,
    });
  };

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
        <h1 className="text-base font-semibold tracking-wide">Host Lobby</h1>
        <span className="ml-auto text-xs text-white/50 uppercase tracking-widest">
          {mode}
        </span>
      </header>

      <div className="flex-1 px-5 py-5 max-w-md mx-auto w-full space-y-4">
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-2xl p-4 text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/45 font-semibold">
            Room Code
          </div>
          <div className="text-5xl font-black tracking-[0.25em] mt-2 text-white tabular-nums">
            {code}
          </div>
          <div className="text-[11px] text-white/45 mt-2">
            {status === "creating" && "Setting up…"}
            {status === "ready" && "Share this code with friends nearby."}
            {status === "error" && (
              <span className="text-red-300">{error ?? "Connection error"}</span>
            )}
          </div>
        </div>

        <label className="block">
          <div className="text-[11px] text-white/55 uppercase tracking-widest mb-1.5">
            Your name
          </div>
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </label>

        <div className="space-y-2">
          <div className="text-[11px] text-white/55 uppercase tracking-widest">
            Players
          </div>
          {slots.map((s, i) => (
            <SlotRow
              key={i}
              slot={s}
              index={i}
              onSetOpen={() => updateSlot(i, { kind: "open" })}
              onSetBot={() => addBotAt(i)}
              onSetOff={() => updateSlot(i, { kind: "off" })}
              onKick={() => updateSlot(i, { kind: "open" })}
            />
          ))}
        </div>

        <button
          onClick={begin}
          disabled={!canStart}
          className={`w-full py-4 rounded-2xl font-semibold text-base mt-2 transition active:scale-[.98] ${
            canStart
              ? "bg-gradient-to-b from-[hsl(140_55%_45%)] to-[hsl(140_55%_30%)] text-white shadow-[0_8px_30px_-12px_hsl(140_60%_50%/.6)] border border-[hsl(140_55%_55%)]/40"
              : "bg-white/[0.04] border border-white/10 text-white/40"
          }`}
        >
          Start Game ({liveCount} {liveCount === 1 ? "player" : "players"})
        </button>

        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-white/55 leading-relaxed">
          Tip: Local Multiplayer works best on the same Wi-Fi or hotspot. You can
          fill empty seats with AI bots.
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  index,
  onSetOpen,
  onSetBot,
  onSetOff,
  onKick,
}: {
  slot: Slot;
  index: number;
  onSetOpen: () => void;
  onSetBot: () => void;
  onSetOff: () => void;
  onKick: () => void;
}) {
  const num = `Slot ${index + 1}`;
  if (slot.kind === "host") {
    return (
      <Row label={num}>
        <div className="flex items-center gap-2 flex-1">
          <Pill color="emerald">You</Pill>
          <span className="text-sm font-medium truncate">{slot.name}</span>
        </div>
      </Row>
    );
  }
  if (slot.kind === "peer") {
    return (
      <Row label={num}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Pill color="violet">Connected</Pill>
          <span className="text-sm font-medium truncate">{slot.name}</span>
        </div>
        <button
          onClick={onKick}
          className="text-[11px] px-2.5 py-1 rounded-md bg-red-500/15 text-red-200 border border-red-500/20 hover:bg-red-500/25"
        >
          Kick
        </button>
      </Row>
    );
  }
  if (slot.kind === "bot") {
    return (
      <Row label={num}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Pill color="amber">AI</Pill>
          <span className="text-sm font-medium truncate">{slot.name}</span>
        </div>
        <button
          onClick={onSetOff}
          className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/70 border border-white/10 hover:bg-white/[0.1]"
        >
          Remove
        </button>
      </Row>
    );
  }
  if (slot.kind === "open") {
    return (
      <Row label={num}>
        <div className="flex items-center gap-2 flex-1">
          <Pill color="sky">Waiting…</Pill>
          <span className="text-sm text-white/50">Open for a friend</span>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={onSetBot}
            className="text-[11px] px-2.5 py-1 rounded-md bg-[hsl(48_90%_50%)]/15 text-[hsl(48_100%_75%)] border border-[hsl(48_90%_50%)]/25 hover:bg-[hsl(48_90%_50%)]/25"
          >
            + Bot
          </button>
          <button
            onClick={onSetOff}
            className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/60 border border-white/10"
          >
            Off
          </button>
        </div>
      </Row>
    );
  }
  // off
  return (
    <Row label={num}>
      <div className="flex items-center gap-2 flex-1">
        <Pill color="neutral">Empty</Pill>
        <span className="text-sm text-white/35">No player</span>
      </div>
      <div className="flex gap-1.5">
        <button
          onClick={onSetOpen}
          className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.06] text-white/70 border border-white/10"
        >
          Open
        </button>
        <button
          onClick={onSetBot}
          className="text-[11px] px-2.5 py-1 rounded-md bg-[hsl(48_90%_50%)]/15 text-[hsl(48_100%_75%)] border border-[hsl(48_90%_50%)]/25"
        >
          + Bot
        </button>
      </div>
    </Row>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 backdrop-blur-xl">
      <span className="text-[10px] text-white/40 uppercase tracking-widest w-12 shrink-0">
        {label}
      </span>
      {children}
    </div>
  );
}

function Pill({
  color,
  children,
}: {
  color: "emerald" | "violet" | "amber" | "sky" | "neutral";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    emerald: "bg-[hsl(140_55%_45%)]/20 text-[hsl(140_70%_75%)] border-[hsl(140_55%_55%)]/30",
    violet: "bg-[hsl(280_55%_55%)]/20 text-[hsl(280_70%_85%)] border-[hsl(280_55%_65%)]/30",
    amber: "bg-[hsl(48_90%_55%)]/20 text-[hsl(48_100%_80%)] border-[hsl(48_90%_55%)]/30",
    sky: "bg-[hsl(215_75%_55%)]/15 text-[hsl(215_80%_85%)] border-[hsl(215_75%_60%)]/30",
    neutral: "bg-white/[0.06] text-white/55 border-white/10",
  };
  return (
    <span
      className={`text-[10px] uppercase font-semibold tracking-widest px-2 py-0.5 rounded-md border ${map[color]}`}
    >
      {children}
    </span>
  );
}
