export function StartGameChoice({
  onBack,
  onChoose,
}: {
  onBack: () => void;
  onChoose: (intent: "offline" | "online") => void;
}) {
  return (
    <div
      className="min-h-screen flex flex-col text-white relative overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 60% 60% at 30% 10%, hsl(280 50% 25% / 0.65), transparent 60%), radial-gradient(ellipse 60% 60% at 80% 90%, hsl(215 60% 25% / 0.65), transparent 60%), #060608",
      }}
    >
      <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-xl">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center"
          aria-label="Back"
        >
          ←
        </button>
        <h1 className="text-base font-semibold tracking-wide">New Game</h1>
      </header>

      <div className="flex-1 px-5 py-6 max-w-md mx-auto w-full flex flex-col gap-4 justify-center">
        <Card
          title="Offline"
          subtitle="Solo vs Bots"
          description="Pass-and-play with friends or test yourself against the AI on this device."
          accent="from-[hsl(140_55%_30%)]/40 to-[hsl(140_55%_18%)]/30 border-[hsl(140_55%_45%)]/30"
          glow="shadow-[0_8px_60px_-30px_hsl(140_60%_50%/.6)]"
          icon="◐"
          onClick={() => onChoose("offline")}
        />
        <Card
          title="Local Network"
          subtitle="Connect Friends"
          description="Pair up to 4 phones over the same Wi-Fi or hotspot. Add bots to fill seats."
          accent="from-[hsl(280_55%_35%)]/40 to-[hsl(260_55%_22%)]/30 border-[hsl(280_55%_55%)]/30"
          glow="shadow-[0_8px_60px_-30px_hsl(280_60%_55%/.7)]"
          icon="⌬"
          onClick={() => onChoose("online")}
        />
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  description,
  accent,
  glow,
  icon,
  onClick,
}: {
  title: string;
  subtitle: string;
  description: string;
  accent: string;
  glow: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative text-left rounded-3xl bg-gradient-to-br ${accent} border backdrop-blur-2xl px-5 py-6 active:scale-[.98] transition ${glow}`}
    >
      <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl bg-white/[0.08] border border-white/15 flex items-center justify-center text-2xl">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs uppercase tracking-[0.25em] text-white/55 font-semibold">
            {subtitle}
          </div>
          <div className="text-2xl font-bold mt-0.5">{title}</div>
          <p className="text-sm text-white/70 mt-2 leading-relaxed">
            {description}
          </p>
        </div>
        <span className="text-white/40 text-2xl leading-none">›</span>
      </div>
    </button>
  );
}
