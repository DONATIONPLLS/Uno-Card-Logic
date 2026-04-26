import type { UnoCard, CardValue, WildColor } from "@/lib/uno-engine";

const cardBg: Record<WildColor, string> = {
  red: "bg-[hsl(0_85%_48%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
  wild: "bg-white",
};

const ovalColor: Record<WildColor, string> = {
  red: "text-[hsl(0_85%_48%)]",
  yellow: "text-[hsl(45_100%_45%)]",
  green: "text-[hsl(140_70%_35%)]",
  blue: "text-[hsl(215_85%_40%)]",
  wild: "text-black",
};

const cornerLabel: Record<CardValue, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  skip: "⊘", reverse: "↺", draw2: "+2", wild: "★", wild4: "+4", flip: "⇄",
};

export type CardSize = "sm" | "md" | "lg";

const sizeMap: Record<CardSize, { box: string; oval: string; big: string; corner: string; back: string }> = {
  sm: { box: "w-10 h-14", oval: "w-7 h-9", big: "text-xs", corner: "text-[8px]", back: "w-7 h-3 text-[8px]" },
  md: { box: "w-16 h-24", oval: "w-12 h-16", big: "text-2xl", corner: "text-[11px]", back: "w-12 h-5 text-xs" },
  lg: { box: "w-20 h-28", oval: "w-14 h-20", big: "text-3xl", corner: "text-xs", back: "w-14 h-6 text-sm" },
};

export function UnoCardView({
  card,
  onClick,
  disabled,
  faceDown,
  size = "md",
  small,
  highlightColor,
  flipMode,
}: {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
  size?: CardSize;
  small?: boolean;
  highlightColor?: "red" | "yellow" | "green" | "blue";
  flipMode?: boolean;
}) {
  if (small && size === "md") size = "sm";
  const s = sizeMap[size];

  if (faceDown) {
    if (flipMode) {
      return (
        <div
          className={`${s.box} rounded-xl border-[3px] border-white/30 flex items-center justify-center shadow-md select-none overflow-hidden relative`}
          style={{
            background:
              "linear-gradient(135deg, #1a1a1f 0%, #2a2a30 50%, #0e0e12 100%)",
          }}
        >
          <div
            className={`${s.back} rounded-full -rotate-12 flex items-center justify-center`}
            style={{
              background:
                "linear-gradient(135deg, #0a0a0a 0%, #25252a 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-white/85 font-black italic tracking-tight leading-none drop-shadow-[0_0_2px_rgba(0,0,0,1)]">
              UNO
            </span>
          </div>
        </div>
      );
    }
    return (
      <div
        className={`${s.box} rounded-xl bg-[hsl(0_75%_18%)] border-[3px] border-white flex items-center justify-center shadow-md select-none overflow-hidden`}
      >
        <div className={`${s.back} bg-[hsl(0_85%_48%)] rounded-full -rotate-12 flex items-center justify-center`}>
          <span className="text-white font-black italic tracking-tight leading-none">UNO</span>
        </div>
      </div>
    );
  }

  const big = bigGlyph(card.value);
  const ringForChosen =
    highlightColor && card.color === "wild"
      ? colorRing(highlightColor)
      : "";

  if (card.color === "wild") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`${s.box} relative rounded-xl border-[3px] border-white overflow-hidden shadow-md transition bg-white ${
          onClick && !disabled ? "active:scale-95" : ""
        } ${disabled ? "opacity-90" : ""} select-none ${ringForChosen}`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`${s.oval} rounded-full -rotate-[18deg]`}
            style={{
              background:
                "conic-gradient(from 0deg, hsl(0 85% 50%) 0deg 90deg, hsl(48 100% 50%) 90deg 180deg, hsl(140 70% 40%) 180deg 270deg, hsl(215 85% 48%) 270deg 360deg)",
              clipPath:
                "polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%)",
            }}
          />
        </div>
        <span className={`absolute top-1 left-1 ${s.corner} font-black text-black drop-shadow`}>
          {cornerLabel[card.value]}
        </span>
        <span className={`absolute bottom-1 right-1 ${s.corner} font-black text-black drop-shadow rotate-180`}>
          {cornerLabel[card.value]}
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`${s.box} relative rounded-xl border-[3px] border-white shadow-md transition ${cardBg[card.color]} ${
        onClick && !disabled ? "active:scale-95" : ""
      } ${disabled ? "opacity-90" : ""} select-none`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${s.oval} bg-white rounded-full flex items-center justify-center -rotate-[18deg]`}>
          <span className={`${s.big} ${ovalColor[card.color]} font-black leading-none`}>{big}</span>
        </div>
      </div>
      <span className={`absolute top-1 left-1 ${s.corner} font-black text-white drop-shadow`}>
        {cornerLabel[card.value]}
      </span>
      <span className={`absolute bottom-1 right-1 ${s.corner} font-black text-white drop-shadow rotate-180`}>
        {cornerLabel[card.value]}
      </span>
    </button>
  );
}

function bigGlyph(v: CardValue): string {
  switch (v) {
    case "skip": return "⊘";
    case "reverse": return "↺";
    case "draw2": return "+2";
    case "wild": return "";
    case "wild4": return "+4";
    case "flip": return "⇄";
    default: return v;
  }
}

function colorRing(c: "red" | "yellow" | "green" | "blue"): string {
  return {
    red: "ring-[6px] ring-[hsl(0_85%_50%)]",
    yellow: "ring-[6px] ring-[hsl(48_100%_50%)]",
    green: "ring-[6px] ring-[hsl(140_70%_40%)]",
    blue: "ring-[6px] ring-[hsl(215_85%_48%)]",
  }[c];
}
