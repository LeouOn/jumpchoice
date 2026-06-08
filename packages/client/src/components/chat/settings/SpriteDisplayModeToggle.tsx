// ── Sprite display mode toggle ──
import { cn } from "../../../lib/utils";
import { hasSpriteDisplayMode, type SpriteDisplayMode } from "../sprite-display-modes";

export function SpriteDisplayModeToggle({
  modes,
  onToggle,
}: {
  modes: readonly SpriteDisplayMode[];
  onToggle: (mode: SpriteDisplayMode) => void;
}) {
  const options: Array<{ id: SpriteDisplayMode; label: string }> = [
    { id: "expressions", label: "Expressions" },
    { id: "full-body", label: "Full-body" },
  ];

  return (
    <div className="space-y-1.5 rounded-lg bg-[var(--background)]/75 px-3 py-2 ring-1 ring-[var(--border)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.6875rem] font-medium text-[var(--foreground)]">Sprite Source</span>
        <span className="text-[0.5625rem] text-[var(--muted-foreground)]">choose one or both</span>
      </div>
      <div className="grid grid-cols-2 overflow-hidden rounded-md ring-1 ring-[var(--border)]">
        {options.map((option, index) => {
          const active = hasSpriteDisplayMode(modes, option.id);
          const isLastActive = active && modes.length === 1;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              disabled={isLastActive}
              className={cn(
                "min-w-0 px-2.5 py-1.5 text-[0.625rem] font-medium transition-colors",
                index > 0 && "border-l border-[var(--border)]",
                active
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]",
                isLastActive && "cursor-not-allowed",
              )}
              title={isLastActive ? "At least one sprite source must stay enabled" : `${option.label} sprites`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
