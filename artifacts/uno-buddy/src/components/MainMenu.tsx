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
    <div className="min-h-screen flex flex-col items-center justify-between px-6 py-10 bg-gradient-to-b from-[hsl(0_75%_25%)] via-neutral-900 to-black">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center">
        <div className="relative">
          <div className="absolute -inset-6 bg-[hsl(0_85%_50%)]/30 blur-3xl rounded-full" />
          <h1 className="relative text-7xl font-black italic tracking-tight drop-shadow-2xl">
            <span className="text-[hsl(0_85%_55%)]">U</span>
            <span className="text-[hsl(48_100%_55%)]">N</span>
            <span className="text-[hsl(140_70%_45%)]">O</span>
          </h1>
          <div className="text-2xl font-bold text-white/90 tracking-widest mt-1">
            BUDDY
          </div>
        </div>
        <p className="text-white/60 text-sm max-w-xs">
          Your offline scorekeeper, rulebook, and digital deck — all in one.
        </p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-3">
        {hasSavedGame ? (
          <button
            onClick={onContinue}
            className="w-full py-4 rounded-2xl bg-[hsl(140_70%_42%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition"
          >
            Continue Game
          </button>
        ) : null}
        <button
          onClick={onNew}
          className="w-full py-4 rounded-2xl bg-[hsl(0_85%_50%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition"
        >
          Start New Game
        </button>
        <button
          onClick={onScoring}
          className="w-full py-4 rounded-2xl bg-[hsl(215_85%_45%)] text-white font-bold text-lg shadow-lg active:scale-[.98] transition"
        >
          Scoring Mode
        </button>
        <button
          onClick={onRules}
          className="w-full py-4 rounded-2xl bg-white/10 text-white font-semibold text-base active:scale-[.98] transition"
        >
          Official Rules
        </button>
      </div>
    </div>
  );
}
