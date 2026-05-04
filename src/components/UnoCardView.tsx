import type { UnoCard, CardValue, UnoColor, WildColor } from "@/lib/uno-engine";

// Light side colours
const lightCardBg: Record<WildColor, string> = {
  red: "bg-[hsl(0_85%_48%)]",
  yellow: "bg-[hsl(48_100%_50%)]",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
  wild: "bg-white",
  pink: "", teal: "", orange: "", purple: "",  // not used on light side
};

// Dark side colours
const darkCardBg: Record<WildColor, string> = {
  pink: "bg-[hsl(330_75%_55%)]",
  teal: "bg-[hsl(180_60%_45%)]",
  orange: "bg-[hsl(30_90%_55%)]",
  purple: "bg-[hsl(270_70%_50%)]",
  wild: "bg-[#1a1a1f]",
  red: "", yellow: "", green: "", blue: "",  // not used on dark side
};

const lightOvalColor: Record<WildColor, string> = {
  red: "text-[hsl(0_85%_48%)]",
  yellow: "text-[hsl(45_100%_45%)]",
  green: "text-[hsl(140_70%_35%)]",
  blue: "text-[hsl(215_85%_40%)]",
  wild: "text-black",
  pink: "", teal: "", orange: "", purple: "",
};

const darkOvalColor: Record<WildColor, string> = {
  pink: "text-[hsl(330_75%_55%)]",
  teal: "text-[hsl(180_60%_45%)]",
  orange: "text-[hsl(30_90%_55%)]",
  purple: "text-[hsl(270_70%_50%)]",
  wild: "text-white",
  red: "", yellow: "", green: "", blue: "",
};

const cornerLabel: Record<CardValue, string> = {
  "0":"0","1":"1","2":"2","3":"3","4":"4","5":"5","6":"6","7":"7","8":"8","9":"9",
  skip:"⊘", reverse:"↺", draw2:"+2", wild:"★", wild4:"+4", flip:"⇄",
  draw1:"+1", wild_draw2:"⊕2", draw_to_color:"?", skip_all:"⟳", draw5: "+5",   // <-- add this
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
  darkSide,
  flipMap,
}: {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  faceDown?: boolean;
  size?: CardSize;
  small?: boolean;
  highlightColor?: UnoColor;
  flipMode?: boolean;
  darkSide?: boolean;
  flipMap?: Record<string, UnoCard>;
}) {
  if (small && size === "md") size = "sm";
  const s = sizeMap[size];

  // ── Uno Flip face‑down: render the opposite side, fully styled ──
  if (faceDown && flipMode && flipMap) {
    const opposite = flipMap[card.id];
    if (opposite) {
      // Render the opposite card face‑up, but with the "back" appearance
      // We pass darkSide = !darkSide so the styles match the opposite side
      return (
        <div className={`${s.box} rounded-xl border-[3px] border-white/30 flex items-center justify-center shadow-md select-none overflow-hidden relative ${!darkSide ? "card-dark-flip" : ""}`}
             style={{ background: !darkSide ? "#1a1a1f" : "#ffffff" }}>
          <UnoCardView
            card={opposite}
            size={size}
            flipMode={false}          // prevent recursion
            darkSide={!darkSide}      // key: shows the opposite side's colours
            flipMap={undefined}       // we are no longer in flip mode
          />
        </div>
      );
    }
  }

  // Normal face‑down (non‑Flip or missing map) – classic Uno back
  if (faceDown) {
    return (
      <div className={`${s.box} rounded-xl bg-[hsl(0_75%_18%)] border-[3px] border-white flex items-center justify-center shadow-md select-none overflow-hidden`}>
        <div className={`${s.back} bg-[hsl(0_85%_48%)] rounded-full -rotate-12 flex items-center justify-center`}>
          <span className="text-white font-black italic tracking-tight leading-none">UNO</span>
        </div>
      </div>
    );
  }

  // Face‑up card
  const color = card.color === "wild" ? "wild" : card.color;
  const bg = darkSide ? darkCardBg[color] : lightCardBg[color];
  const ovalCol = darkSide ? darkOvalColor[color] : lightOvalColor[color];

  const big = bigGlyph(card.value);
  const ringForChosen =
    highlightColor && card.color === "wild"
      ? colorRing(highlightColor)
      : "";

  if (card.color === "wild") {
    const wildBg = darkSide ? "#1a1a1f" : "#ffffff";
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !onClick}
        className={`${s.box} relative rounded-xl border-[3px] border-white overflow-hidden shadow-md transition ${darkSide ? "card-dark-flip" : ""} ${
          onClick && !disabled ? "active:scale-95" : ""
        } ${disabled ? "opacity-90" : ""} select-none ${ringForChosen}`}
        style={{ background: wildBg }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className={`${s.oval} rounded-full -rotate-[18deg]`}
            style={{
              background: darkSide
                ? "conic-gradient(from 0deg, hsl(330_75%_55%) 0deg 90deg, hsl(180_60%_45%) 90deg 180deg, hsl(30_90%_55%) 180deg 270deg, hsl(270_70%_50%) 270deg 360deg)"
                : "conic-gradient(from 0deg, hsl(0 85% 50%) 0deg 90deg, hsl(48 100% 50%) 90deg 180deg, hsl(140 70% 40%) 180deg 270deg, hsl(215 85% 48%) 270deg 360deg)",
              clipPath: "polygon(50% 0%, 60% 35%, 100% 50%, 60% 65%, 50% 100%, 40% 65%, 0% 50%, 40% 35%)",
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
      className={`${s.box} relative rounded-xl border-[3px] border-white shadow-md transition ${bg ?? ""} ${darkSide ? "card-dark-flip" : ""} ${
        onClick && !disabled ? "active:scale-95" : ""
      } ${disabled ? "opacity-90" : ""} select-none`}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`${s.oval} bg-white rounded-full flex items-center justify-center -rotate-[18deg]`}>
          <span className={`${s.big} ${ovalCol ?? "text-white"} font-black leading-none`}>{big}</span>
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
    case "draw1": return "+1";
    case "wild_draw2": return "⊕2";
    case "draw_to_color": return "?";
    case "skip_all": return "⟳";
    default: return v;
  }
}

function colorRing(c: UnoColor): string {
  const rings: Record<string, string> = {
    red: "ring-[6px] ring-[hsl(0_85%_50%)]",
    yellow: "ring-[6px] ring-[hsl(48_100%_50%)]",
    green: "ring-[6px] ring-[hsl(140_70%_40%)]",
    blue: "ring-[6px] ring-[hsl(215_85%_48%)]",
    pink: "ring-[6px] ring-[hsl(330_75%_55%)]",
    teal: "ring-[6px] ring-[hsl(180_60%_45%)]",
    orange: "ring-[6px] ring-[hsl(30_90%_55%)]",
    purple: "ring-[6px] ring-[hsl(270_70%_50%)]",
  };
  return rings[c] ?? "";
}