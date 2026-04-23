import { useState } from "react";
import {
  DEFAULT_HOUSE_RULES,
  type HouseRules,
  type PlayerConfig,
  type PlayerKind,
} from "@/lib/uno-engine";

export function SetupScreen({
  onBack,
  onStart,
}: {
  onBack: () => void;
  onStart: (players: PlayerConfig[], rules: HouseRules) => void;
}) {
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: "You", kind: "human" },
    { name: "UnoBot 1", kind: "bot" },
    { name: "UnoBot 2", kind: "bot" },
    { name: "UnoBot 3", kind: "bot" },
  ]);
  const [rules, setRules] = useState<HouseRules>(DEFAULT_HOUSE_RULES);

  const setKind = (i: number, kind: PlayerKind) => {
    setPlayers((p) => p.map((pl, idx) => (idx === i ? { ...pl, kind } : pl)));
  };
  const setName = (i: number, name: string) => {
    setPlayers((p) => p.map((pl, idx) => (idx === i ? { ...pl, name } : pl)));
  };

  const start = () => {
    const final = players.slice(0, count).map((p, i) => ({
      ...p,
      name: p.name.trim() || (p.kind === "bot" ? `UnoBot ${i}` : `Player ${i + 1}`),
    }));
    onStart(final, rules);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-neutral-900 to-black text-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">Game Setup</h1>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6 pb-32">
        {/* Player count */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
            Players
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`py-3 rounded-xl font-bold text-lg transition ${
                  count === n
                    ? "bg-[hsl(0_85%_50%)] text-white"
                    : "bg-white/10 text-white/70"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </section>

        {/* Players list */}
        <section className="space-y-2">
          {players.slice(0, count).map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm ${
                  ["bg-[hsl(0_85%_50%)]", "bg-[hsl(48_100%_50%)] text-black", "bg-[hsl(140_70%_42%)]", "bg-[hsl(215_85%_45%)]"][i]
                }`}
              >
                P{i + 1}
              </div>
              <input
                value={p.name}
                onChange={(e) => setName(i, e.target.value)}
                className="flex-1 min-w-0 bg-transparent text-sm font-medium focus:outline-none"
              />
              <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs">
                <button
                  onClick={() => setKind(i, "human")}
                  className={`px-3 py-1.5 font-semibold ${
                    p.kind === "human" ? "bg-white text-black" : "bg-white/5 text-white/60"
                  }`}
                >
                  Human
                </button>
                <button
                  onClick={() => setKind(i, "bot")}
                  className={`px-3 py-1.5 font-semibold ${
                    p.kind === "bot" ? "bg-white text-black" : "bg-white/5 text-white/60"
                  }`}
                >
                  UnoBot
                </button>
              </div>
            </div>
          ))}
        </section>

        {/* House rules */}
        <section>
          <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
            House Rules
          </h2>
          <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10">
            <Toggle
              label="Stacking +2 / +4"
              hint="Pass the draw penalty to the next player by stacking"
              value={rules.stackDraws}
              onChange={(v) => setRules({ ...rules, stackDraws: v })}
            />
            <Toggle
              label="Jump-in play"
              hint="Play an identical card out of turn"
              value={rules.jumpIn}
              onChange={(v) => setRules({ ...rules, jumpIn: v })}
            />
            <Toggle
              label="Force play after draw"
              hint="Must play the drawn card if it's playable"
              value={rules.forcePlay}
              onChange={(v) => setRules({ ...rules, forcePlay: v })}
            />
            <Toggle
              label="Draw until playable"
              hint="Keep drawing until you get a playable card"
              value={rules.drawUntilPlayable}
              onChange={(v) => setRules({ ...rules, drawUntilPlayable: v })}
            />
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 inset-x-0 px-4 pb-5 pt-3 bg-gradient-to-t from-black via-black/95 to-transparent">
        <button
          onClick={start}
          className="w-full py-4 rounded-2xl bg-[hsl(0_85%_50%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition"
        >
          Start Game
        </button>
      </div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-white/5"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{label}</div>
        <div className="text-xs text-white/50">{hint}</div>
      </div>
      <div
        className={`w-11 h-6 rounded-full p-0.5 transition ${
          value ? "bg-[hsl(140_70%_42%)]" : "bg-white/15"
        }`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white transition-transform ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
    </button>
  );
}
