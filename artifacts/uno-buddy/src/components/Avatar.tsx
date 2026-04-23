const SEAT_COLORS = [
  "bg-[hsl(0_85%_50%)]",
  "bg-[hsl(48_100%_50%)] text-black",
  "bg-[hsl(140_70%_42%)]",
  "bg-[hsl(215_85%_50%)]",
];

export function seatColor(idx: number) {
  return SEAT_COLORS[idx % SEAT_COLORS.length];
}

export function Avatar({
  name,
  idx,
  kind,
  size = "md",
  glow = false,
}: {
  name: string;
  idx: number;
  kind: "human" | "bot";
  size?: "sm" | "md" | "lg";
  glow?: boolean;
}) {
  const dim =
    size === "sm" ? "w-8 h-8 text-xs" : size === "lg" ? "w-12 h-12 text-base" : "w-10 h-10 text-sm";
  const initial = (name.trim()[0] ?? "?").toUpperCase();
  return (
    <div
      className={`${dim} ${seatColor(idx)} rounded-full flex items-center justify-center font-black border-2 ${
        glow ? "border-white shadow-[0_0_18px_rgba(255,255,255,0.7)] animate-pulse" : "border-white/20"
      } relative`}
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
