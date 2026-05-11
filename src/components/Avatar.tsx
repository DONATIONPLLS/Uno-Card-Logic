import type { CSSProperties } from "react";

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

  let toneClass = "border-white/25";
  let toneStyle: CSSProperties = {
    boxShadow: "0 0 0 rgba(0,0,0,0)",
  };

  if (effectiveTone === "active") {
    toneClass = "border-[#22c55e]";
    toneStyle = { boxShadow: "0 0 20px rgba(34, 197, 94, 0.85)" };
  } else if (effectiveTone === "next") {
    toneClass = "border-[#f97316]";
    toneStyle = { boxShadow: "0 0 16px rgba(249, 115, 22, 0.75)" };
  }

  return (
    <div
      className={`${dim} ${seatColor(idx)} rounded-full flex items-center justify-center font-black border-2 relative transition-all duration-500 ease-in-out ${toneClass}`}
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
