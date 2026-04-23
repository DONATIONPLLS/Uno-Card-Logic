import { useEffect, useRef, useState } from "react";
import {
  createHost,
  joinHost,
  makeRoomCode,
  type HostHandle,
  type JoinHandle,
} from "@/lib/peerSync";
import {
  dealNewGame,
  type GameState,
  type PlayerConfig,
} from "@/lib/uno-engine";

type Stage = "menu" | "host" | "join";

export function LocalMultiplayer({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (
    initialGame: GameState,
    role: "host" | "join",
    viewerIdx: number,
    host: HostHandle | null,
    join: JoinHandle | null,
  ) => void;
}) {
  const [stage, setStage] = useState<Stage>("menu");
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[hsl(280_50%_18%)] via-neutral-900 to-black text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={() => (stage === "menu" ? onBack() : setStage("menu"))}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Local Multiplayer</h1>
      </header>
      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full">
        {stage === "menu" ? <MenuStage onSelect={setStage} /> : null}
        {stage === "host" ? <HostStage onStart={onStart} /> : null}
        {stage === "join" ? <JoinStage onStart={onStart} /> : null}
      </div>
    </div>
  );
}

function NoteBlock() {
  return (
    <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-xs text-white/70 leading-relaxed mt-3">
      <strong className="text-white">Connection tip:</strong> Local Multiplayer uses
      a peer-to-peer connection. It works best when both phones are on the same
      Wi-Fi network, or when one phone is connected to the other's mobile hotspot.
      Both phones need an internet connection to set up the link.
    </div>
  );
}

function MenuStage({ onSelect }: { onSelect: (s: Stage) => void }) {
  return (
    <div className="space-y-4">
      <button
        onClick={() => onSelect("host")}
        className="w-full p-5 rounded-2xl bg-gradient-to-br from-[hsl(280_70%_55%)] to-[hsl(260_70%_38%)] text-left border border-white/20 active:scale-[.98] transition shadow-lg"
      >
        <div className="text-xl font-black">Host a game</div>
        <div className="text-sm text-white/80 mt-1">
          Get a 4-digit code. Share it with the other phone.
        </div>
      </button>
      <button
        onClick={() => onSelect("join")}
        className="w-full p-5 rounded-2xl bg-gradient-to-br from-[hsl(215_85%_50%)] to-[hsl(215_75%_30%)] text-left border border-white/20 active:scale-[.98] transition shadow-lg"
      >
        <div className="text-xl font-black">Join a game</div>
        <div className="text-sm text-white/80 mt-1">
          Enter the 4-digit code from the host's screen.
        </div>
      </button>
      <NoteBlock />
    </div>
  );
}

function HostStage({
  onStart,
}: {
  onStart: (
    g: GameState,
    role: "host" | "join",
    viewerIdx: number,
    host: HostHandle | null,
    join: JoinHandle | null,
  ) => void;
}) {
  const [code] = useState(() => makeRoomCode());
  const [hostName, setHostName] = useState("Player 1");
  const [status, setStatus] = useState<"creating" | "waiting" | "joined" | "error">("creating");
  const [error, setError] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string | null>(null);
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
        setStatus("waiting");
        h.onJoin((_conn, name) => {
          setOpponentName(name);
          setStatus("joined");
        });
      })
      .catch((err) => {
        setStatus("error");
        setError(err?.message ?? "Couldn't create the room. Try a different code.");
      });
    return () => {
      cancelled = true;
      if (handleRef.current) handleRef.current.destroy();
    };
  }, [code]);

  const begin = () => {
    if (!handleRef.current || !opponentName) return;
    const players: PlayerConfig[] = [
      { name: hostName.trim() || "Player 1", kind: "human" },
      { name: opponentName, kind: "human" },
    ];
    const game = dealNewGame({ players });
    handleRef.current.broadcast({ type: "state", game });
    onStart(game, "host", 0, handleRef.current, null);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 text-center backdrop-blur-xl">
        <div className="text-xs uppercase tracking-widest text-white/50 font-bold">
          Room Code
        </div>
        <div className="text-6xl font-black tracking-[0.3em] mt-2 text-white">
          {code}
        </div>
        <div className="text-xs text-white/50 mt-3">
          {status === "creating" && "Setting up the room…"}
          {status === "waiting" && "Waiting for the other phone to join…"}
          {status === "joined" && `${opponentName} joined! Ready when you are.`}
          {status === "error" && (
            <span className="text-red-300">{error ?? "Something went wrong."}</span>
          )}
        </div>
      </div>

      <label className="block">
        <div className="text-xs text-white/60 mb-1">Your name</div>
        <input
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
        />
      </label>

      <button
        onClick={begin}
        disabled={status !== "joined"}
        className="w-full py-4 rounded-2xl bg-[hsl(140_70%_42%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition disabled:opacity-40"
      >
        Start Game
      </button>
      <NoteBlock />
    </div>
  );
}

function JoinStage({
  onStart,
}: {
  onStart: (
    g: GameState,
    role: "host" | "join",
    viewerIdx: number,
    host: HostHandle | null,
    join: JoinHandle | null,
  ) => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("Player 2");
  const [status, setStatus] = useState<"idle" | "connecting" | "waiting" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const handleRef = useRef<JoinHandle | null>(null);

  const connect = async () => {
    if (code.length !== 4) {
      setError("Enter the 4-digit code.");
      return;
    }
    setError(null);
    setStatus("connecting");
    try {
      const h = await joinHost(code, name.trim() || "Player 2");
      handleRef.current = h;
      setStatus("waiting");
      h.onMessage((msg) => {
        if (msg.type === "state") {
          onStart(msg.game, "join", 1, null, h);
        }
      });
    } catch (e: any) {
      setStatus("error");
      setError(
        e?.type === "peer-unavailable"
          ? "Couldn't find a room with that code."
          : e?.message ?? "Connection failed.",
      );
    }
  };

  useEffect(() => {
    return () => {
      if (handleRef.current) handleRef.current.destroy();
    };
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-white/60 mb-1">Room code</div>
        <input
          inputMode="numeric"
          maxLength={4}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="0000"
          className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-4 text-center text-3xl tracking-[0.5em] font-black focus:outline-none focus:border-white/40"
        />
      </div>
      <div>
        <div className="text-xs text-white/60 mb-1">Your name</div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white/40"
        />
      </div>
      <button
        onClick={connect}
        disabled={status === "connecting" || status === "waiting"}
        className="w-full py-4 rounded-2xl bg-[hsl(215_85%_50%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition disabled:opacity-50"
      >
        {status === "connecting"
          ? "Connecting…"
          : status === "waiting"
          ? "Waiting for host to start…"
          : "Connect"}
      </button>
      {error ? (
        <div className="text-xs text-red-300 text-center">{error}</div>
      ) : null}
      <NoteBlock />
    </div>
  );
}
