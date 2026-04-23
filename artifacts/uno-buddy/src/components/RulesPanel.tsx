import { useMemo, useState } from "react";
import { RULES } from "@/lib/rules";

export function RulesPanel({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return RULES;
    return RULES.filter((r) =>
      [r.title, r.body, r.category, ...(r.keywords ?? [])]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [q]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof RULES>();
    for (const r of filtered) {
      if (!map.has(r.category)) map.set(r.category, []);
      map.get(r.category)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center animate-[fadeIn_.18s_ease-out]">
      <div className="w-full sm:max-w-md h-[88vh] sm:h-[80vh] bg-neutral-900 border-t sm:border border-white/10 sm:rounded-2xl rounded-t-2xl flex flex-col overflow-hidden animate-[slideUp_.22s_ease-out]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h2 className="text-lg font-bold">Official Rules</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 py-3 border-b border-white/10">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            type="search"
            placeholder="Search rules… (e.g. wild, stack, +4)"
            className="w-full px-3 py-2.5 rounded-lg bg-white/10 text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
          {grouped.length === 0 ? (
            <p className="text-white/50 text-sm text-center py-10">
              No rules matched "{q}"
            </p>
          ) : (
            grouped.map(([cat, items]) => (
              <section key={cat}>
                <h3 className="text-xs uppercase tracking-wider text-white/50 mb-2 font-semibold">
                  {cat}
                </h3>
                <div className="space-y-2">
                  {items.map((r) => (
                    <div
                      key={r.id}
                      className="rounded-lg bg-white/5 border border-white/10 p-3"
                    >
                      <div className="font-semibold text-sm mb-1">{r.title}</div>
                      <div className="text-sm text-white/75 leading-relaxed">
                        {r.body}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  );
}
