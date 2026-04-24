import { useEffect, useRef, useState } from "react";
import { joinHost, type JoinHandle, type SyncMessage } from "@/lib/peerSync";
import type { GameState } from "@/lib/uno-engine";

export interface JoinStartResult {
  game: GameState;
  join: JoinHandle;
  viewerIdx: number;
}

export function JoinScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (r: JoinStartResult) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("Player 2");
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "waiting" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<JoinHandle | null>(null);
  const viewerIdxRef = useRef<number | null>(null);

  const connect = async () => {
    if (code.length !== 4) {
      setError("Enter the 4-digit code.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const j = await joinHost(code, name.trim() || "Player 2");
      handleRef.current = j;
      setStatus("connected");
      j.onMessage((msg: SyncMessage) => {
        if (msg.type === "assign") {
          viewerIdxRef.current = msg.viewerIdx;
          setStatus("waiting");
        } else if (msg.type === "state") {
          if (viewerIdxRef.current === null) {
            // Defensive: assume idx 1 if assign was missed
            viewerIdxRef.current = 1;
          }
          onStart({
            game: msg.game,
            join: j,
            viewerIdx: viewerIdxRef.current,
          });
        } else if (msg.type === "kicked") {
          setStatus("error");
          setError("The host removed you from the lobby.");
          j.destroy();
        }
      });
      j.onClose(() => {
        setStatus("error");
        setError("Lost connection to the host.");
      });
    } catch (e: any) {
      setStatus("error");
      setError(
        e?.type === "peer-unavailable"
          ? "No room found with that code."
          : e?.message ?? "Connection failed.",
      );
    }
  };

  useEffect(() => {
    return () => {
      if (handleRef.current && viewerIdxRef.current === null) {
        handleRef.current.destroy();
      }
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col text-white"
      style={{
        background:
          "radial-gradient(ellipse 60% 60% at 30% 10%, hsl(215 55% 22% / 0.65), transparent 60%), radial-gradient(ellipse 60% 60% at 80% 90%, hsl(280 50% 18% / 0.65), transparent 60%), #060608",
      }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-base font-semibold tracking-wide">Join a Game</h1>
      </header>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full space-y-4">
        <div>
          <div className="text-[11px] text-white/55 uppercase tracking-widest mb-1.5">
            Room code
          </div>
          <input
            inputMode="numeric"
            maxLength={4}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="0000"
            className="w-full bg-white/[0.04] border border-white/10 rounded-2xl px-3 py-5 text-center text-4xl tracking-[0.5em] font-black tabular-nums focus:outline-none focus:border-white/30"
          />
        </div>

        <div>
          <div className="text-[11px] text-white/55 uppercase tracking-widest mb-1.5">
            Your name
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-white/30"
          />
        </div>

        <button
          onClick={connect}
          disabled={status === "connecting" || status === "connected" || status === "waiting"}
          className="w-full py-4 rounded-2xl font-semibold text-base bg-gradient-to-b from-[hsl(215_70%_50%)] to-[hsl(215_70%_32%)] text-white border border-[hsl(215_70%_60%)]/40 shadow-[0_8px_30px_-12px_hsl(215_70%_55%/.6)] active:scale-[.98] transition disabled:opacity-50"
        >
          {status === "idle"
            ? "Connect"
            : status === "connecting"
            ? "Connecting…"
            : status === "connected"
            ? "Connected — waiting for host"
            : status === "waiting"
            ? "Waiting for host to start…"
            : "Try again"}
        </button>

        {error ? (
          <div className="text-xs text-red-300 text-center bg-red-500/10 border border-red-500/20 rounded-lg py-2 px-3">
            {error}
          </div>
        ) : null}

        <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 text-[11px] text-white/55 leading-relaxed">
          Make sure both phones are on the same Wi-Fi or hotspot for the best
          connection.
        </div>
      </div>
    </div>
  );
}
