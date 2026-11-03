// ──────────────────────────────────────────────
// "Render this moment" (JumpChoice fork feature)
// ──────────────────────────────────────────────
// Two steps, always: compose → review the exact prompt → Confirm. Nothing is sent
// to an image provider (and no money is spent) until the user presses Confirm.
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Monitor, ScrollText, Smartphone, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation as useUiTranslation } from "react-i18next";
import {
  MOMENT_CUSTOM_STYLE_ID,
  MOMENT_STYLE_PRESETS,
  type MomentAspect,
  type MomentPreviewResponse,
  type MomentSpendStatus,
  type MomentStyleId,
} from "@jumpchoice/shared";
import { Modal } from "../ui/Modal";
import { cn } from "../../lib/utils";
import { useUIStore } from "../../stores/ui.store";
import { useCharacters } from "../../hooks/use-characters";
import { useMomentPreview, useMomentRender, useMomentScene } from "../../hooks/use-moments";

type Props = {
  open: boolean;
  chatId: string;
  onClose: () => void;
};

type Step = "compose" | "review";

function formatUsd(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `$${value.toFixed(2)}` : "—";
}

function readCharacterName(row: { id?: unknown; data?: unknown }): string {
  let data: unknown = row.data;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      data = null;
    }
  }
  const name = data && typeof data === "object" ? (data as Record<string, unknown>).name : null;
  return typeof name === "string" && name.trim() ? name.trim() : String(row.id ?? "");
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function MomentRenderModal({ open, chatId, onClose }: Props) {
  const { t: localizeUi } = useUiTranslation();
  const debugMode = useUIStore((s) => s.debugMode);
  const { data: characterRows } = useCharacters(open);
  const preview = useMomentPreview(chatId);
  const render = useMomentRender(chatId);
  const sceneDraft = useMomentScene(chatId);

  const [step, setStep] = useState<Step>("compose");
  const [hydrated, setHydrated] = useState(false);
  const [styleId, setStyleId] = useState<MomentStyleId>("classic-pixel");
  const [customStyle, setCustomStyle] = useState("");
  const [aspect, setAspect] = useState<MomentAspect>("desktop");
  const [characterId, setCharacterId] = useState<string>("");
  const [scene, setScene] = useState("");
  const [reviewed, setReviewed] = useState<MomentPreviewResponse | null>(null);
  const [promptDraft, setPromptDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const characters = useMemo(
    () =>
      (characterRows ?? [])
        .map((row) => ({ id: String((row as { id?: unknown }).id ?? ""), name: readCharacterName(row) }))
        .filter((row) => row.id)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [characterRows],
  );

  // On open, load the chat's remembered choices with a free preview call (no provider is contacted).
  useEffect(() => {
    if (!open) {
      setStep("compose");
      setHydrated(false);
      setReviewed(null);
      setError(null);
      return;
    }
    if (hydrated) return;
    let cancelled = false;
    preview
      .mutateAsync({ scene: "" })
      .then((result) => {
        if (cancelled) return;
        setStyleId(result.styleId);
        setCustomStyle(result.customStyle);
        setAspect(result.aspect);
        setCharacterId(result.character?.id ?? "");
        setHydrated(true);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(errorMessage(err));
          setHydrated(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, hydrated]);

  const draftInput = () => ({
    characterId: characterId || undefined,
    styleId,
    customStyle,
    aspect,
    scene,
    debugMode,
  });

  const handleDraftScene = async () => {
    setError(null);
    try {
      const result = await sceneDraft.mutateAsync({ characterId: characterId || undefined, debugMode });
      setScene(result.scene);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handlePreview = async () => {
    setError(null);
    try {
      const result = await preview.mutateAsync(draftInput());
      setReviewed(result);
      setPromptDraft(result.prompt);
      setStep("review");
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const handleConfirm = async () => {
    if (!reviewed || !promptDraft.trim() || render.isPending) return;
    setError(null);
    try {
      const result = await render.mutateAsync({ ...draftInput(), prompt: promptDraft });
      toast.success(
        localizeUi("ui.moments.rendered", {
          cost: formatUsd(result.costUsd),
          source:
            result.costSource === "provider"
              ? localizeUi("ui.moments.costSourceProvider")
              : localizeUi("ui.moments.costSourceEstimate"),
        }),
      );
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const busy = preview.isPending || render.isPending || sceneDraft.isPending;
  const edited = reviewed !== null && promptDraft !== reviewed.prompt;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (!render.isPending) onClose();
      }}
      title={localizeUi("ui.moments.title")}
      width="max-w-2xl"
      closeDisabled={render.isPending}
    >
      <div className="flex flex-col gap-4 text-sm">
        {step === "compose" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {localizeUi("ui.moments.style")}
                </span>
                <select
                  value={styleId}
                  onChange={(event) => setStyleId(event.target.value as MomentStyleId)}
                  className="rounded-lg bg-[var(--secondary)] px-2 py-2 text-xs ring-1 ring-[var(--border)]"
                >
                  {MOMENT_STYLE_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.label}
                    </option>
                  ))}
                  <option value={MOMENT_CUSTOM_STYLE_ID}>{localizeUi("ui.moments.styleCustom")}</option>
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {localizeUi("ui.moments.companion")}
                </span>
                <select
                  value={characterId}
                  onChange={(event) => setCharacterId(event.target.value)}
                  className="rounded-lg bg-[var(--secondary)] px-2 py-2 text-xs ring-1 ring-[var(--border)]"
                >
                  <option value="">{localizeUi("ui.moments.companionNone")}</option>
                  {characters.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {styleId === MOMENT_CUSTOM_STYLE_ID && (
              <textarea
                value={customStyle}
                onChange={(event) => setCustomStyle(event.target.value)}
                rows={4}
                placeholder={localizeUi("ui.moments.customStylePlaceholder")}
                className="rounded-lg bg-[var(--secondary)] p-2 text-xs ring-1 ring-[var(--border)]"
              />
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">
                {localizeUi("ui.moments.format")}
              </span>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["desktop", Monitor, "ui.moments.formatDesktop"],
                    ["phone", Smartphone, "ui.moments.formatPhone"],
                  ] as const
                ).map(([value, Icon, labelKey]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAspect(value)}
                    aria-pressed={aspect === value}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs ring-1 ring-[var(--border)] transition-colors",
                      aspect === value
                        ? "bg-[var(--primary)]/20 text-[var(--primary)] ring-[var(--primary)]"
                        : "bg-[var(--secondary)] hover:bg-[var(--accent)]",
                    )}
                  >
                    <Icon size="0.875rem" />
                    {localizeUi(labelKey)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-[var(--muted-foreground)]">
                  {localizeUi("ui.moments.scene")}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDraftScene()}
                  disabled={busy}
                  title={localizeUi("ui.moments.draftSceneHelp")}
                  className="flex items-center gap-1 rounded-md bg-[var(--secondary)] px-2 py-1 text-[0.6875rem] ring-1 ring-[var(--border)] hover:bg-[var(--accent)] disabled:opacity-60"
                >
                  {sceneDraft.isPending ? (
                    <Loader2 size="0.75rem" className="animate-spin" />
                  ) : (
                    <Sparkles size="0.75rem" />
                  )}
                  {localizeUi("ui.moments.draftScene")}
                </button>
              </div>
              <textarea
                value={scene}
                onChange={(event) => setScene(event.target.value)}
                rows={5}
                placeholder={localizeUi("ui.moments.scenePlaceholder")}
                className="rounded-lg bg-[var(--secondary)] p-2 text-xs ring-1 ring-[var(--border)]"
              />
              <p className="text-[0.6875rem] text-[var(--muted-foreground)]">
                {localizeUi("ui.moments.draftSceneHelp")}
              </p>
            </div>
          </>
        ) : reviewed ? (
          <>
            <p className="text-xs text-[var(--muted-foreground)]">{localizeUi("ui.moments.reviewIntro")}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-[var(--muted-foreground)]">{localizeUi("ui.moments.model")}</dt>
                <dd className="break-all font-mono">{reviewed.model || "—"}</dd>
                <dt className="text-[var(--muted-foreground)]">{localizeUi("ui.moments.connection")}</dt>
                <dd>{reviewed.connectionName || "—"}</dd>
                <dt className="text-[var(--muted-foreground)]">{localizeUi("ui.moments.aspect")}</dt>
                <dd>
                  {reviewed.aspectRatio} · {reviewed.width}×{reviewed.height}
                </dd>
                <dt className="text-[var(--muted-foreground)]">{localizeUi("ui.moments.estimate")}</dt>
                <dd>{formatUsd(reviewed.estimatedCostUsd)}</dd>
              </dl>
              <div className="flex flex-col items-center gap-1">
                {reviewed.referenceThumbs[0] ? (
                  <>
                    <img
                      src={reviewed.referenceThumbs[0]}
                      alt={localizeUi("ui.moments.referenceAlt")}
                      className="h-24 w-24 rounded-lg object-cover ring-1 ring-[var(--border)]"
                    />
                    <span className="text-[0.6875rem] text-[var(--muted-foreground)]">
                      {localizeUi("ui.moments.referenceAttached", { source: reviewed.referenceSource ?? "" })}
                    </span>
                  </>
                ) : (
                  <span className="max-w-32 text-center text-[0.6875rem] text-[var(--muted-foreground)]">
                    {localizeUi("ui.moments.noReference")}
                  </span>
                )}
              </div>
            </div>
            <SpendSummary spend={reviewed.spend} />
            <label className="flex flex-col gap-1">
              <span className="flex items-center justify-between text-xs font-medium text-[var(--muted-foreground)]">
                {localizeUi("ui.moments.exactPrompt")}
                {edited && <span className="text-[var(--primary)]">{localizeUi("ui.moments.edited")}</span>}
              </span>
              <textarea
                value={promptDraft}
                onChange={(event) => setPromptDraft(event.target.value)}
                rows={14}
                className="rounded-lg bg-[var(--secondary)] p-2 font-mono text-[0.6875rem] leading-relaxed ring-1 ring-[var(--border)]"
              />
            </label>
            {reviewed.blockedReason && (
              <p className="rounded-lg bg-[var(--destructive)]/15 p-2 text-xs text-[var(--destructive)]">
                {reviewed.blockedReason}
              </p>
            )}
          </>
        ) : null}

        {error && (
          <p role="alert" className="rounded-lg bg-[var(--destructive)]/15 p-2 text-xs text-[var(--destructive)]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2">
          {step === "review" && (
            <button
              type="button"
              onClick={() => {
                setStep("compose");
                setError(null);
              }}
              disabled={render.isPending}
              className="mr-auto flex items-center gap-1 rounded-lg px-3 py-2 text-xs hover:bg-[var(--accent)] disabled:opacity-60"
            >
              <ArrowLeft size="0.875rem" />
              {localizeUi("ui.moments.back")}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={render.isPending}
            className="rounded-lg px-3 py-2 text-xs hover:bg-[var(--accent)] disabled:opacity-60"
          >
            {localizeUi("ui.moments.cancel")}
          </button>
          {step === "compose" ? (
            <button
              type="button"
              onClick={() => void handlePreview()}
              disabled={busy || !hydrated || (styleId === MOMENT_CUSTOM_STYLE_ID && !customStyle.trim())}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {preview.isPending ? (
                <Loader2 size="0.875rem" className="animate-spin" />
              ) : (
                <ScrollText size="0.875rem" />
              )}
              {localizeUi("ui.moments.previewPrompt")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={render.isPending || !promptDraft.trim() || !!reviewed?.blockedReason}
              aria-busy={render.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-xs font-medium text-[var(--primary-foreground)] disabled:opacity-60"
            >
              {render.isPending && <Loader2 size="0.875rem" className="animate-spin" />}
              {render.isPending
                ? localizeUi("ui.moments.rendering")
                : localizeUi("ui.moments.confirm", { cost: formatUsd(reviewed?.estimatedCostUsd) })}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

function SpendSummary({ spend }: { spend: MomentSpendStatus }) {
  const { t: localizeUi } = useUiTranslation();
  return (
    <div className="rounded-lg bg-[var(--secondary)] p-2 text-xs ring-1 ring-[var(--border)]">
      <div>
        {localizeUi("ui.moments.spendToday", { spent: formatUsd(spend.todayUsd), cap: formatUsd(spend.dailyCapUsd) })}
      </div>
      <div>
        {localizeUi("ui.moments.spendTotal", { spent: formatUsd(spend.totalUsd), cap: formatUsd(spend.totalCapUsd) })}
      </div>
      {spend.accountUsageCeilingUsd !== null && (
        <div>{localizeUi("ui.moments.spendCeiling", { ceiling: formatUsd(spend.accountUsageCeilingUsd) })}</div>
      )}
      {spend.pendingCount > 0 && (
        <div className="text-[var(--muted-foreground)]">
          {localizeUi("ui.moments.spendPending", { count: spend.pendingCount })}
        </div>
      )}
    </div>
  );
}
