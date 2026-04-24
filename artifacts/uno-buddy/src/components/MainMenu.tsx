export function MainMenu({
  hasSavedGame,
  onContinue,
  onNew,
  onScoring,
  onRules,
}: {
  hasSavedGame: boolean;
  onContinue: () => void;
  onNew: () => void;
  onScoring: () => void;
  onRules: () => void;
}) {
  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center justify-between px-6 py-10"
      style={{
        background:
          "radial-gradient(ellipse 60% 60% at 20% 10%, hsl(0 70% 28% / 0.85), transparent 60%), radial-gradient(ellipse 60% 60% at 90% 25%, hsl(48 80% 38% / 0.55), transparent 60%), radial-gradient(ellipse 70% 70% at 50% 95%, hsl(215 70% 28% / 0.85), transparent 60%), radial-gradient(ellipse 50% 50% at 5% 100%, hsl(140 65% 22% / 0.7), transparent 60%), #050505",
      }}
    >
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-[hsl(0_85%_50%)]/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 bg-[hsl(48_100%_50%)]/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 w-80 h-80 bg-[hsl(215_85%_50%)]/20 blur-[120px] rounded-full" />

      <div className="relative flex-1 flex flex-col items-center justify-center gap-8 text-center w-full">
        <div className="relative inline-flex flex-col items-center justify-center">
          {/* Halo — shrunk ~15% (was w-44/h-44 → now w-[9.4rem]/h-[9.4rem]) */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[9.4rem] h-[9.4rem] rounded-full bg-white/[0.04] border border-white/10"
            style={{
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              boxShadow: "inset 0 0 40px rgba(255,255,255,0.05)",
            }}
          />
          {/* UNO — italic letters slant right; pad-right keeps the glyphs centered inside the halo */}
          <h1 className="relative text-6xl font-black italic tracking-tight pr-3 leading-none">
            <span className="text-[hsl(0_85%_60%)]">U</span>
            <span className="text-[hsl(48_100%_60%)]">N</span>
            <span className="text-[hsl(140_70%_50%)]">O</span>
          </h1>
          <div className="relative text-[10px] font-semibold text-white/65 tracking-[0.55em] mt-2 pl-[0.55em]">
            BUDDY
          </div>
        </div>
        <p className="text-white/55 text-sm max-w-[260px] leading-relaxed mt-2">
          Your offline scorekeeper, rulebook, and digital deck — all in one place.
        </p>
      </div>

      <div className="relative w-full max-w-sm flex flex-col gap-3">
        {hasSavedGame ? (
          <SoftButton onClick={onContinue} accent="emerald">
            Continue Game
          </SoftButton>
        ) : null}
        <SoftButton onClick={onNew} accent="primary">
          Start New Game
        </SoftButton>
        <div className="grid grid-cols-2 gap-3">
          <SoftButton onClick={onScoring} accent="ghost" small>
            Scoring
          </SoftButton>
          <SoftButton onClick={onRules} accent="ghost" small>
            Rules
          </SoftButton>
        </div>
      </div>
    </div>
  );
}

function SoftButton({
  children,
  onClick,
  accent,
  small,
}: {
  children: React.ReactNode;
  onClick: () => void;
  accent: "primary" | "emerald" | "ghost";
  small?: boolean;
}) {
  const accentBg: Record<string, string> = {
    primary: "rgba(255,255,255,0.06)",
    emerald: "rgba(34,197,94,0.10)",
    ghost: "rgba(255,255,255,0.035)",
  };
  const accentBorder: Record<string, string> = {
    primary: "rgba(255,255,255,0.14)",
    emerald: "rgba(34,197,94,0.28)",
    ghost: "rgba(255,255,255,0.10)",
  };
  return (
    <button
      onClick={onClick}
      className={`relative w-full ${small ? "py-3 text-sm" : "py-4 text-base"} rounded-2xl font-semibold tracking-wide text-white border transition active:scale-[.98] hover:bg-white/10`}
      style={{
        background: accentBg[accent],
        borderColor: accentBorder[accent],
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      {children}
    </button>
  );
}
