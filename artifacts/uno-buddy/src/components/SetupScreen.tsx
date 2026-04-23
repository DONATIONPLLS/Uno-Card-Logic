import { useMemo, useState } from "react";
import {
  MODE_PRESETS,
  type GameMode,
  type HouseRules,
  type PlayerConfig,
  type PlayerKind,
} from "@/lib/uno-engine";
import { Avatar } from "@/components/Avatar";

const BOT_NAMES = [
  "Sparky",
  "Bluffing Ben",
  "Uno Master",
  "Lucky Luna",
  "Wild Wendy",
  "Quick Quinn",
  "Cunning Cleo",
  "Dizzy Dex",
  "Sly Sam",
  "Jumpy Jules",
];

function pickBotNames(n: number): string[] {
  const pool = [...BOT_NAMES];
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0] ?? `UnoBot ${i + 1}`);
  }
  return out;
}

const MODE_LABEL: Record<GameMode, string> = {
  standard: "Standard Uno",
  chaos: "Chaos Mode",
  flip: "Uno Flip",
  allwild: "Uno All Wild",
  custom: "Custom",
};

export function SetupScreen({
  mode,
  onBack,
  onStart,
}: {
  mode: GameMode;
  onBack: () => void;
  onStart: (players: PlayerConfig[], rules: HouseRules, mode: GameMode) => void;
}) {
  const presetRules =
    mode === "custom" ? MODE_PRESETS.standard : MODE_PRESETS[mode];

  const initialBots = useMemo(() => pickBotNames(4), []);
  const [count, setCount] = useState(2);
  const [players, setPlayers] = useState<PlayerConfig[]>([
    { name: "Player 1", kind: "human" },
    { name: initialBots[0], kind: "bot" },
    { name: initialBots[1], kind: "bot" },
    { name: initialBots[2], kind: "bot" },
  ]);
  const [rules, setRules] = useState<HouseRules>(presetRules);

  const isDefaultName = (name: string, i: number) =>
    name === `Player ${i + 1}` || BOT_NAMES.includes(name);

  const setKind = (i: number, kind: PlayerKind) =>
    setPlayers((p) =>
      p.map((pl, idx) => {
        if (idx !== i) return pl;
        // If the player hasn't typed a custom name, swap to a sensible default
        if (isDefaultName(pl.name, i)) {
          if (kind === "bot") {
            const used = new Set(p.filter((_, j) => j !== i).map((x) => x.name));
            const free = BOT_NAMES.filter((n) => !used.has(n));
            const name = free[Math.floor(Math.random() * free.length)] ?? `UnoBot ${i + 1}`;
            return { name, kind };
          }
          return { name: `Player ${i + 1}`, kind };
        }
        return { ...pl, kind };
      }),
    );
  const setName = (i: number, name: string) =>
    setPlayers((p) => p.map((pl, idx) => (idx === i ? { ...pl, name } : pl)));

  const start = () => {
    const final = players.slice(0, count).map((p, i) => ({
      ...p,
      name:
        p.name.trim() ||
        (p.kind === "bot" ? `UnoBot ${i}` : `Player ${i + 1}`),
    }));
    onStart(final, rules, mode);
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
        <div className="rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="text-xs uppercase tracking-wider text-white/50 font-semibold">
            Mode
          </div>
          <div className="font-bold text-lg">{MODE_LABEL[mode]}</div>
        </div>

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

        <section className="space-y-2">
          {players.slice(0, count).map((p, i) => (
            <div
              key={i}
              className="rounded-xl bg-white/5 border border-white/10 p-3 flex items-center gap-3"
            >
              <Avatar name={p.name} idx={i} kind={p.kind} />
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

        {mode === "custom" ? (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
              House Rules
            </h2>
            <div className="rounded-xl bg-white/5 border border-white/10 divide-y divide-white/10">
              <Toggle
                label="Stacking +2 / +4"
                hint="Pass the draw penalty by stacking"
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
                label="7-0 hand swaps"
                hint="Play 7: swap hands. Play 0: everyone passes."
                value={rules.sevenZero}
                onChange={(v) => setRules({ ...rules, sevenZero: v })}
              />
              <Toggle
                label="All cards wild"
                hint="Every card matches every card"
                value={rules.allWild}
                onChange={(v) => setRules({ ...rules, allWild: v })}
              />
            </div>
          </section>
        ) : (
          <section>
            <h2 className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
              Active Rules
            </h2>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm text-white/80 space-y-1">
              <RuleRow on={rules.stackDraws} label="Stacking +2 / +4" />
              <RuleRow on={rules.jumpIn} label="Jump-in play" />
              <RuleRow on={rules.forcePlay} label="Force play after draw" />
              <RuleRow on={rules.sevenZero} label="7-0 hand swaps" />
              <RuleRow on={rules.allWild} label="All cards wild" />
            </div>
          </section>
        )}
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

function RuleRow({ on, label }: { on: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`text-xs font-bold ${on ? "text-[hsl(140_70%_55%)]" : "text-white/40"}`}>
        {on ? "ON" : "OFF"}
      </span>
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
