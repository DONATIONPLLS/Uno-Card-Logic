export function MainMenu({
  hasSavedGame,
  onContinue,
  onNew,
  onLocalMultiplayer,
  onScoring,
  onRules,
}: {
  hasSavedGame: boolean;
  onContinue: () => void;
  onNew: () => void;
  onLocalMultiplayer: () => void;
  onScoring: () => void;
  onRules: () => void;
}) {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-between px-6 py-10"
      style={{
        background:
          "radial-gradient(ellipse 60% 60% at 20% 0%, hsl(0 80% 35% / 0.85), transparent 60%), radial-gradient(ellipse 60% 60% at 90% 20%, hsl(48 95% 45% / 0.75), transparent 60%), radial-gradient(ellipse 70% 70% at 50% 100%, hsl(215 80% 35% / 0.85), transparent 60%), radial-gradient(ellipse 50% 50% at 0% 100%, hsl(140 70% 30% / 0.7), transparent 60%), #0a0a0a",
      }}
    >
      {/* Floating blurred color blobs */}
      <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-[hsl(0_85%_50%)]/30 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 bg-[hsl(48_100%_50%)]/25 blur-3xl rounded-full" />
      <div className="pointer-events-none absolute -bottom-20 left-1/4 w-80 h-80 bg-[hsl(215_85%_50%)]/30 blur-3xl rounded-full" />

      <div className="relative flex-1 flex flex-col items-center justify-center gap-5 text-center">
        <div className="relative">
          <div className="absolute -inset-8 bg-white/5 backdrop-blur-2xl rounded-full" />
          <h1 className="relative text-7xl sm:text-8xl font-black italic tracking-tight drop-shadow-2xl">
            <span className="text-[hsl(0_85%_60%)]">U</span>
            <span className="text-[hsl(48_100%_60%)]">N</span>
            <span className="text-[hsl(140_70%_50%)]">O</span>
          </h1>
          <div className="text-2xl font-bold text-white/95 tracking-[0.4em] mt-1">
            BUDDY
          </div>
        </div>
        <p className="text-white/70 text-sm max-w-xs">
          Your offline scorekeeper, rulebook, and digital deck — all in one.
        </p>
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-3">
        {hasSavedGame ? (
          <GlassButton onClick={onContinue} accent="emerald">
            ▶ Continue Game
          </GlassButton>
        ) : null}
        <GlassButton onClick={onNew} accent="red">
          Start New Game
        </GlassButton>
        <GlassButton onClick={onLocalMultiplayer} accent="violet">
          Local Multiplayer
        </GlassButton>
        <div className="grid grid-cols-2 gap-3">
          <GlassButton onClick={onScoring} accent="blue" small>
            Scoring
          </GlassButton>
          <GlassButton onClick={onRules} accent="neutral" small>
            Rules
          </GlassButton>
        </div>
      </div>
    </div>
  );
}

function GlassButton({
  children,
  onClick,
  accent,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent: "red" | "blue" | "emerald" | "violet" | "neutral";
  small?: boolean;
}) {
  const accentBg: Record<string, string> = {
    red: "from-[hsl(0_85%_55%)]/90 to-[hsl(0_75%_40%)]/90",
    blue: "from-[hsl(215_85%_55%)]/90 to-[hsl(215_75%_38%)]/90",
    emerald: "from-[hsl(140_70%_50%)]/90 to-[hsl(140_70%_32%)]/90",
    violet: "from-[hsl(280_70%_60%)]/90 to-[hsl(260_70%_42%)]/90",
    neutral: "from-white/15 to-white/5",
  };
  return (
    <button
      onClick={onClick}
      className={`group relative w-full ${small ? "py-3" : "py-4"} rounded-2xl text-white font-bold ${
        small ? "text-sm" : "text-lg"
      } overflow-hidden border border-white/20 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.35)] active:scale-[.98] transition`}
    >
      <span
        className={`absolute inset-0 bg-gradient-to-br ${accentBg[accent]}`}
      />
      <span className="absolute inset-0 bg-white/5 opacity-0 group-active:opacity-100 transition" />
      <span className="absolute top-0 inset-x-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent" />
      <span className="relative tracking-wide">{children}</span>
    </button>
  );
}
