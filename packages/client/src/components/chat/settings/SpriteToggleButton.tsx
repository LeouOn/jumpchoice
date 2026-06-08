// ── Sprite toggle button (per character) ──
import { cn } from "../../../lib/utils";
import { Image } from "lucide-react";

export function SpriteToggleButton({
  active,
  disabled,
  onToggle,
}: {
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[0.625rem] font-medium transition-colors ring-1",
        active
          ? "bg-[var(--primary)]/10 text-[var(--primary)] ring-[var(--primary)]/30 hover:bg-[var(--primary)]/15"
          : "text-[var(--muted-foreground)] ring-[var(--border)] hover:bg-[var(--accent)]",
        disabled && "opacity-30 cursor-not-allowed",
      )}
      title={active ? "Disable sprite" : disabled ? "Max 3 sprites" : "Enable sprite"}
    >
      <Image size="0.6875rem" />
      <span>{active ? "Enabled" : "Enable"}</span>
    </button>
  );
}
