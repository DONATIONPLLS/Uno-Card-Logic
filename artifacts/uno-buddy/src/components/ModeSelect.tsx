import type { GameMode } from "@/lib/uno-engine";

const MODES: {
  id: Exclude<GameMode, "custom"> | "custom";
  title: string;
  blurb: string;
  bg: string;
  accent: string;
}[] = [
  {
    id: "standard",
    title: "Standard Uno",
    blurb: "The classic rules. No stacking, no jump-ins.",
    bg: "bg-[hsl(0_85%_45%)]",
    accent: "Classic",
  },
  {
    id: "chaos",
    title: "Chaos Mode",
    blurb: "Stacking +2/+4, jump-ins, and 7-0 hand swaps. Mayhem.",
    bg: "bg-[hsl(280_70%_45%)]",
    accent: "Wild",
  },
  {
    id: "flip",
    title: "Uno Flip",
    blurb: "Stacking + jump-ins + force-play. Fast and ruthless.",
    bg: "bg-[hsl(48_100%_50%)] text-black",
    accent: "Fast",
  },
  {
    id: "allwild",
    title: "Uno All Wild",
    blurb: "Every card matches every card. Pure speed.",
    bg: "bg-gradient-to-br from-[hsl(0_85%_50%)] via-[hsl(48_100%_55%)] to-[hsl(215_85%_50%)]",
    accent: "Speed",
  },
  {
    id: "custom",
    title: "Custom",
    blurb: "Pick your own house rules.",
    bg: "bg-white/10",
    accent: "Your rules",
  },
];

export function ModeSelect({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (mode: GameMode) => void;
}) {
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
        <h1 className="text-lg font-bold">Choose a Mode</h1>
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => onChoose(m.id as GameMode)}
            className={`w-full ${m.bg} rounded-2xl p-5 text-left active:scale-[.98] transition shadow-lg border border-white/10 ${m.id === "flip" ? "" : "text-white"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xl font-black">{m.title}</div>
                <div className={`text-sm mt-1 ${m.id === "flip" ? "text-black/70" : "text-white/80"}`}>
                  {m.blurb}
                </div>
              </div>
              <span
                className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full ${m.id === "flip" ? "bg-black/20" : "bg-white/20"}`}
              >
                {m.accent}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
