import type { UnoCard, CardValue, WildColor } from "@/lib/uno-engine";

const cardBg: Record<WildColor, string> = {
  red: "bg-[hsl(0_85%_48%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
  wild: "bg-neutral-900",
};

const ovalColor: Record<WildColor, string> = {
  red: "text-[hsl(0_85%_48%)]",
  yellow: "text-[hsl(45_100%_45%)]",
  green: "text-[hsl(140_70%_35%)]",
  blue: "text-[hsl(215_85%_40%)]",
  wild: "text-white",
};

const cornerLabel: Record<CardValue, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  skip: "⊘", reverse: "↺", draw2: "+2", wild: "★", wild4: "+4",
};

export type CardSize = "sm" | "md" | "lg";

const sizeMap: Record<CardSize, { box: string; oval: string; big: string; corner: string }> = {
  sm: { box: "w-10 h-14", oval: "w-7 h-9", big: "text-xs", corner: "text-[8px]" },
  md: { box: "w-16 h-24", oval: "w-12 h-16", big: "text-2xl", corner: "text-[11px]" },
  lg: { box: "w-20 h-28", oval: "w-14 h-20", big: "text-3xl", corner: "text-xs" },
};

export function UnoCardView({
  card,
  onClick,
  disabled,
  faceDown,
  size = "md",
  small,
}: {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
  size?: CardSize;
  small?: boolean;
}) {
  if (small && size === "md") size = "sm";
  const s = sizeMap[size];

  if (faceDown) {
    return (
      <div
        className={`${s.box} rounded-xl bg-[hsl(0_75%_18%)] border-[3px] border-white flex items-center justify-center shadow-md select-none`}
      >
        <div className="bg-[hsl(0_85%_48%)] rounded-full px-2 py-0.5 -rotate-12">
          <span className="text-white font-black italic text-xs tracking-tight">UNO</span>
        </div>
      </div>
    );
  }

  const big = bigGlyph(card.value);

  if (card.color === "wild") {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`${s.box} relative rounded-xl border-[3px] border-white overflow-hidden shadow-md transition ${
          onClick && !disabled ? "active:scale-95" : ""
        } ${disabled ? "opacity-90" : ""} select-none bg-black`}
      >
        {/* 4-color quadrants */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="bg-[hsl(0_85%_48%)]" />
          <div className="bg-[hsl(48_100%_50%)]" />
          <div className="bg-[hsl(215_85%_45%)]" />
          <div className="bg-[hsl(140_70%_38%)]" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`${s.oval} bg-black rounded-full flex items-center justify-center -rotate-[18deg] border border-black/40`}>
            <span className={`${s.big} text-white font-black`}>{big}</span>
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
          <span className={`${s.big} ${ovalColor[card.color]} font-black leading-none`}>
            {big}
          </span>
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
    case "wild": return "★";
    case "wild4": return "+4";
    default: return v;
  }
}
