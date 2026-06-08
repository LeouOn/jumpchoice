// ── Agent category sub-section (collapsible within Agents section) ──
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";

export function AgentCategorySection({
  label,
  icon,
  description,
  count,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  description: string;
  count?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--border)] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-[var(--accent)]/50"
      >
        <span className="text-[var(--muted-foreground)]">{icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-[0.6875rem] font-semibold">{label}</span>
          {!open && (
            <p className="text-[0.5625rem] text-[var(--muted-foreground)] leading-tight truncate">{description}</p>
          )}
        </div>
        {count != null && count > 0 && (
          <span className="rounded-full bg-[var(--primary)]/15 px-1.5 py-0.5 text-[0.5625rem] font-medium text-[var(--primary)]">
            {count}
          </span>
        )}
        <ChevronDown
          size="0.625rem"
          className={cn("text-[var(--muted-foreground)] transition-transform shrink-0", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="px-3 pb-2.5 space-y-1.5">
          <p className="text-[0.5625rem] text-[var(--muted-foreground)] leading-tight">{description}</p>
          {children}
        </div>
      )}
    </div>
  );
}
