// ── Picker dropdown (for adding characters / lorebooks) ──
import { useRef, useEffect } from "react";
import { Search, X } from "lucide-react";

export function PickerDropdown({
  search,
  onSearchChange,
  onClose,
  placeholder,
  children,
  footer,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  onClose: () => void;
  placeholder: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div ref={ref} className="mt-2 rounded-lg ring-1 ring-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2">
        <Search size="0.75rem" className="text-[var(--muted-foreground)]" />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-[var(--muted-foreground)]"
        />
        <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          <X size="0.75rem" />
        </button>
      </div>
      {/* List */}
      <div className="max-h-48 overflow-y-auto">{children}</div>
      {/* Footer — always visible below the scrollable list */}
      {footer}
    </div>
  );
}
