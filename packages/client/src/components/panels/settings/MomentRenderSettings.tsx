// Settings → Images → Moments (JumpChoice fork feature): moment model and hard spending caps.
// Caps are stored and enforced on the server; this form only edits them.
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { DEFAULT_MOMENT_MODEL, type MomentRenderSettings as MomentRenderSettingsValue } from "@jumpchoice/shared";
import { useConnections } from "../../../hooks/use-connections";
import { useMomentSettings, useUpdateMomentSettings } from "../../../hooks/use-moments";

type Draft = {
  model: string;
  connectionId: string;
  dailyCapUsd: string;
  totalCapUsd: string;
  accountUsageCeilingUsd: string;
};

function toDraft(settings: MomentRenderSettingsValue): Draft {
  return {
    model: settings.model,
    connectionId: settings.connectionId,
    dailyCapUsd: String(settings.dailyCapUsd),
    totalCapUsd: String(settings.totalCapUsd),
    accountUsageCeilingUsd: settings.accountUsageCeilingUsd === null ? "" : String(settings.accountUsageCeilingUsd),
  };
}

function parseUsd(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const numeric = Number(trimmed);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : NaN;
}

const inputClass =
  "w-full rounded-lg bg-[var(--secondary)] px-2 py-1.5 text-xs text-[var(--foreground)] outline-none ring-1 ring-[var(--border)]";

export function MomentRenderSettings() {
  const { t: localizeUi } = useTranslation();
  const { data, isLoading } = useMomentSettings();
  const update = useUpdateMomentSettings();
  const { data: connectionRows } = useConnections();
  const [draft, setDraft] = useState<Draft | null>(null);

  useEffect(() => {
    if (data && draft === null) setDraft(toDraft(data.settings));
  }, [data, draft]);

  const imageConnections = useMemo(
    () =>
      ((connectionRows ?? []) as Array<{ id: string; name: string; provider: string }>).filter(
        (row) => row.provider === "image_generation",
      ),
    [connectionRows],
  );

  if (isLoading || !draft || !data) {
    return <Loader2 size="1rem" className="animate-spin text-[var(--muted-foreground)]" />;
  }

  const handleSave = async () => {
    const daily = parseUsd(draft.dailyCapUsd);
    const total = parseUsd(draft.totalCapUsd);
    const ceiling = parseUsd(draft.accountUsageCeilingUsd);
    if (daily === null || total === null || Number.isNaN(daily) || Number.isNaN(total) || Number.isNaN(ceiling)) {
      toast.error(localizeUi("ui.moments.settings.invalidAmount"));
      return;
    }
    try {
      const saved = await update.mutateAsync({
        model: draft.model.trim(),
        connectionId: draft.connectionId,
        dailyCapUsd: daily,
        totalCapUsd: total,
        accountUsageCeilingUsd: ceiling,
      });
      setDraft(toDraft(saved.settings));
      toast.success(localizeUi("ui.moments.settings.saved"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  const set = (key: keyof Draft) => (event: { target: { value: string } }) =>
    setDraft((current) => (current ? { ...current, [key]: event.target.value } : current));

  return (
    <div className="flex flex-col gap-2.5 rounded-lg p-2 ring-1 ring-[var(--border)]">
      <div className="text-xs font-medium text-[var(--foreground)]">{localizeUi("ui.moments.settings.title")}</div>
      <p className="text-[0.6875rem] text-[var(--muted-foreground)]">{localizeUi("ui.moments.settings.intro")}</p>
      <label className="flex flex-col gap-1 text-[0.6875rem]">
        {localizeUi("ui.moments.settings.model")}
        <input value={draft.model} onChange={set("model")} placeholder={DEFAULT_MOMENT_MODEL} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-[0.6875rem]">
        {localizeUi("ui.moments.settings.connection")}
        <select value={draft.connectionId} onChange={set("connectionId")} className={inputClass}>
          <option value="">{localizeUi("ui.moments.settings.connectionDefault")}</option>
          {imageConnections.map((connection) => (
            <option key={connection.id} value={connection.id}>
              {connection.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[0.6875rem]">
          {localizeUi("ui.moments.settings.dailyCap")}
          <input inputMode="decimal" value={draft.dailyCapUsd} onChange={set("dailyCapUsd")} className={inputClass} />
        </label>
        <label className="flex flex-col gap-1 text-[0.6875rem]">
          {localizeUi("ui.moments.settings.totalCap")}
          <input inputMode="decimal" value={draft.totalCapUsd} onChange={set("totalCapUsd")} className={inputClass} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[0.6875rem]">
        {localizeUi("ui.moments.settings.ceiling")}
        <input
          inputMode="decimal"
          value={draft.accountUsageCeilingUsd}
          onChange={set("accountUsageCeilingUsd")}
          placeholder={localizeUi("ui.moments.settings.ceilingPlaceholder")}
          className={inputClass}
        />
        <span className="text-[var(--muted-foreground)]">{localizeUi("ui.moments.settings.ceilingHelp")}</span>
      </label>
      <p className="text-[0.6875rem] text-[var(--muted-foreground)]">
        {localizeUi("ui.moments.settings.spent", {
          today: `$${data.spend.todayUsd.toFixed(2)}`,
          total: `$${data.spend.totalUsd.toFixed(2)}`,
        })}
      </p>
      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={update.isPending}
        className="self-end rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-60"
      >
        {localizeUi("ui.moments.settings.save")}
      </button>
    </div>
  );
}
