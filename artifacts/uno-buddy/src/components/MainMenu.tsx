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
      {/* Soft floating blurred color blobs */}
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-[hsl(0_85%_50%)]/20 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute top-1/3 -right-24 w-80 h-80 bg-[hsl(48_100%_50%)]/15 blur-[120px] rounded-full" />
      <div className="pointer-events-none absolute -bottom-24 left-1/4 w-80 h-80 bg-[hsl(215_85%_50%)]/20 blur-[120px] rounded-full" />

      <div className="relative flex-1 flex flex-col items-center justify-center gap-6 text-center w-full">
        <div className="relative inline-flex flex-col items-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.05)]" />
          <h1 className="relative text-7xl font-black italic tracking-tight">
            <span className="text-[hsl(0_85%_60%)]">U</span>
            <span className="text-[hsl(48_100%_60%)]">N</span>
            <span className="text-[hsl(140_70%_50%)]">O</span>
          </h1>
          <div className="relative text-[11px] font-semibold text-white/70 tracking-[0.55em] mt-2 pl-[0.55em]">
            BUDDY
          </div>
        </div>
        <p className="text-white/55 text-sm max-w-[260px] leading-relaxed">
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
  const styles: Record<string, string> = {
    primary:
      "bg-gradient-to-b from-white/10 to-white/[0.04] border-white/15 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_30px_-12px_rgba(255,255,255,0.25)]",
    emerald:
      "bg-gradient-to-b from-[hsl(140_60%_45%)]/30 to-[hsl(140_60%_25%)]/20 border-[hsl(140_60%_50%)]/30 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_30px_-12px_hsl(140_60%_50%/.4)]",
    ghost:
      "bg-white/[0.04] border-white/10 text-white/85",
  };
  return (
    <button
      onClick={onClick}
      className={`group relative w-full ${small ? "py-3 text-sm" : "py-4 text-base"} rounded-2xl font-semibold tracking-wide overflow-hidden border backdrop-blur-xl transition active:scale-[.98] hover:border-white/30 ${styles[accent]}`}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      <span className="relative">{children}</span>
    </button>
  );
}
