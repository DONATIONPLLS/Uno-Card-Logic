const SEAT_COLORS = [
  "bg-[hsl(0_85%_50%)]",
  "bg-[hsl(48_100%_50%)] text-black",
  "bg-[hsl(140_70%_42%)]",
  "bg-[hsl(215_85%_50%)]",
];

export function seatColor(idx: number) {
  return SEAT_COLORS[idx % SEAT_COLORS.length];
}

export type AvatarTone = "active" | "next" | "viewer" | "idle";

export function Avatar({
  name,
  idx,
  kind,
  size = "md",
  glow = false,
  tone,
}: {
  name: string;
  idx: number;
  kind: "human" | "bot";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
  tone?: AvatarTone;
}) {
  const dim =
    size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const initial = (name.trim()[0] ?? "?").toUpperCase();

  const effectiveTone: AvatarTone = tone ?? (glow ? "active" : "idle");

  let toneClass = "border-white/20";
  let toneStyle: React.CSSProperties = {};
  if (effectiveTone === "active") {
    toneClass = "border-[#22c55e] animate-pulse";
    toneStyle = { boxShadow: "0 0 20px #22c55e" };
  } else if (effectiveTone === "next") {
    toneClass = "border-[#f97316]";
    toneStyle = { boxShadow: "0 0 15px #f97316" };
  } else if (effectiveTone === "viewer") {
    toneClass = "border-[#facc15]";
    toneStyle = { boxShadow: "0 0 10px rgba(250, 204, 21, 0.55)" };
  }

  return (
    <div
      className={`${dim} ${seatColor(idx)} rounded-full flex items-center justify-center font-black border-2 ${toneClass} relative`}
      style={toneStyle}
    >
      {initial}
      {kind === "bot" ? (
        <span className="absolute -bottom-1 -right-1 bg-black text-white text-[8px] font-bold px-1 rounded-full border border-white/30">
          AI
        </span>
      ) : null}
    </div>
  );
}
