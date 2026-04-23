import type { UnoCard, CardValue } from "@/lib/uno-engine";

const colorBg: Record<string, string> = {
  red: "bg-[hsl(0_85%_50%)]",
  yellow: "bg-[hsl(48_100%_50%)] text-black",
  green: "bg-[hsl(140_70%_38%)]",
  blue: "bg-[hsl(215_85%_45%)]",
  wild: "bg-neutral-900",
};

const labels: Record<CardValue, string> = {
  "0": "0", "1": "1", "2": "2", "3": "3", "4": "4",
  "5": "5", "6": "6", "7": "7", "8": "8", "9": "9",
  skip: "⊘", reverse: "↺", draw2: "+2", wild: "★", wild4: "+4",
};

export function UnoCardView({
  card,
  onClick,
  disabled,
  small,
  faceDown,
}: {
  card: UnoCard;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  faceDown?: boolean;
}) {
  const size = small
    ? "w-14 h-20 text-base"
    : "w-20 h-28 text-2xl";
  if (faceDown) {
    return (
      <div
        className={`${size} rounded-lg bg-neutral-900 border-2 border-white/40 flex items-center justify-center shadow-md`}
      >
        <span className="text-white font-black italic text-lg tracking-tight">UNO</span>
      </div>
    );
  }
  const bg = colorBg[card.color] ?? "bg-neutral-700";
  const textColor = card.color === "yellow" ? "text-black" : "text-white";
  const isWild =
    card.value === "wild" || card.value === "wild4";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${size} ${bg} ${textColor} rounded-lg border-2 border-white/80 shadow-md
        flex flex-col items-center justify-center font-black relative
        transition-transform active:scale-95
        ${disabled ? "opacity-50 cursor-not-allowed" : "hover:-translate-y-2"}`}
    >
      {isWild ? (
        <div className="grid grid-cols-2 grid-rows-2 gap-0.5 w-10 h-10 rounded-full overflow-hidden border-2 border-white">
          <div className="bg-[hsl(0_85%_50%)]" />
          <div className="bg-[hsl(48_100%_50%)]" />
          <div className="bg-[hsl(215_85%_45%)]" />
          <div className="bg-[hsl(140_70%_38%)]" />
        </div>
      ) : null}
      <span className={`${isWild ? "absolute bottom-1 right-1 text-sm" : ""}`}>
        {labels[card.value]}
      </span>
    </button>
  );
}
