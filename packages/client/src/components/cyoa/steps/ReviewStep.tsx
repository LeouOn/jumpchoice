import { useState, useEffect, useMemo } from "react";
import { useReviewCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Check, Loader2, AlertTriangle, ChevronDown, ChevronRight, Eye } from "lucide-react";
import { useTranslation as useUiTranslation } from "react-i18next";

// ── Types for the structured extraction data ──
interface CyoaChoice {
  id?: string;
  name: string;
  pointCost: number;
  category: string;
  description: string;
  tags: string[];
  prerequisites: string[];
  stealth?: boolean;
}

interface CyoaExtraction {
  imageId: string;
  pageNumber: number;
  extractionMethod: string;
  title: string | null;
  description: string | null;
  pointBudget: number | null;
  categories: string[];
  choices: CyoaChoice[];
  warnings: string[];
}

interface ReviewStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

// ── Helpers ──
function getImageExtractions(doc: CyoaDocument | undefined): { img: CyoaDocument["images"][number]; extraction: CyoaExtraction }[] {
  if (!doc?.images) return [];
  return doc.images
    .filter((img) => img.extractions != null)
    .sort((a, b) => a.pageNumber - b.pageNumber)
    .map((img) => ({ img, extraction: img.extractions as unknown as CyoaExtraction }));
}

function collectAllChoices(entries: { img: CyoaDocument["images"][number]; extraction: CyoaExtraction }[]): (CyoaChoice & { pageNumber: number; imageName: string })[] {
  const result: (CyoaChoice & { pageNumber: number; imageName: string })[] = [];
  for (const { extraction, img } of entries) {
    for (const choice of extraction.choices) {
      result.push({ ...choice, pageNumber: img.pageNumber, imageName: img.originalName ?? img.filename ?? "" });
    }
  }
  return result;
}

function allWarnings(entries: { extraction: CyoaExtraction }[]): { pageNumber: number; text: string }[] {
  const result: { pageNumber: number; text: string }[] = [];
  for (const { extraction } of entries) {
    for (const w of extraction.warnings ?? []) {
      result.push({ pageNumber: extraction.pageNumber, text: w });
    }
  }
  return result;
}

// ── Inline Editable Field ──
function EditableField({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  small,
}: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  small?: boolean;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={`font-medium text-[var(--muted-foreground)] ${small ? "text-[10px]" : "text-[11px]"}`}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`rounded border border-[var(--border)] bg-[var(--input)] px-2 text-[var(--foreground)] outline-none transition-colors focus:border-[var(--primary)]/50 ${
          small ? "py-1 text-xs" : "py-1.5 text-xs"
        }`}
      />
    </label>
  );
}

export function ReviewStep({ document, documentId }: ReviewStepProps) {
  const { t: localizeUi } = useUiTranslation();
  const review = useReviewCyoa();
  const [editMode, setEditMode] = useState<"structured" | "json">("structured");
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [expandedPages, setExpandedPages] = useState<Set<number>>(new Set());
  const [editedChoices, setEditedChoices] = useState<Map<string, CyoaChoice>>(new Map());

  const entries = useMemo(() => getImageExtractions(document), [document]);
  const allChoices = useMemo(() => collectAllChoices(entries), [entries]);
  const warnings = useMemo(() => allWarnings(entries), [entries]);

  // Derive total data for summary bar
  const totalChoices = allChoices.length;
  const categories = useMemo(
    () => [...new Set(allChoices.map((c) => c.category).filter(Boolean))],
    [allChoices],
  );
  const totalBudget = entries.reduce((sum, { extraction }) => sum + (extraction.pointBudget ?? 0), 0);
  const pagesWithExtractions = entries.length;

  // Build the current state as JSON for the raw edit mode
  const currentExtractions = useMemo(() => {
    return entries.map(({ extraction }) => {
      // Apply any inline edits to the choices
      const choices = extraction.choices.map((c) => {
        const key = `${extraction.imageId}:${c.name}`;
        return editedChoices.get(key) ?? c;
      });
      return { ...extraction, choices };
    });
  }, [entries, editedChoices]);

  // Keep JSON text in sync for raw mode
  useEffect(() => {
    setJsonText(JSON.stringify(currentExtractions, null, 2));
  }, [currentExtractions]);

  const togglePage = (pageNumber: number) => {
    setExpandedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pageNumber)) next.delete(pageNumber);
      else next.add(pageNumber);
      return next;
    });
  };

  const expandAll = () => {
    if (expandedPages.size === entries.length) {
      setExpandedPages(new Set());
    } else {
      setExpandedPages(new Set(entries.map((e) => e.extraction.pageNumber)));
    }
  };

  const updateChoice = (imageId: string, choiceName: string, field: keyof CyoaChoice, value: string | number | boolean) => {
    const key = `${imageId}:${choiceName}`;
    setEditedChoices((prev) => {
      const next = new Map(prev);
      const existing = next.get(key) ?? { name: choiceName, pointCost: 0, category: "", description: "", tags: [], prerequisites: [] };
      next.set(key, { ...existing, [field]: value });
      return next;
    });
  };

  const hasEdits = editedChoices.size > 0;

  const handleApprove = () => {
    try {
      const toSubmit = editMode === "json" ? JSON.parse(jsonText) : currentExtractions;
      if (!Array.isArray(toSubmit)) {
        setParseError("Extractions must be a JSON array");
        return;
      }
      setParseError(null);
      review.mutate({ documentId, extractions: toSubmit });
    } catch {
      setParseError("Invalid JSON — please fix syntax errors");
    }
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <Eye className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.reviewstep.noExtractedDataToReviewYet")}</p>
        <p className="text-xs text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.reviewstep.runExtractionOnTheExtractTabFirst")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── Summary Bar ── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2.5">
        <span className="text-xs font-medium text-[var(--foreground)]">{localizeUi("ui.chat.summarieseditormodal.summary")}</span>
        <span className="text-[10px] text-[var(--muted-foreground)]">
          {totalChoices} {localizeUi("ui.cyoa.analyzestep.choice")}{totalChoices !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
        </span>
        {totalBudget > 0 && (
          <span className="rounded bg-[var(--accent)]/60 px-1.5 py-0.5 text-[10px] text-[var(--foreground)]">
            {totalBudget} {localizeUi("ui.cyoa.reviewstep.ptBudget")}</span>
        )}
        {categories.length > 0 && (
          <span className="text-[10px] text-[var(--muted-foreground)]">
            {categories.length} {localizeUi("ui.cyoa.reviewstep.categor")}{categories.length !== 1 ?localizeUi("ui.characters.lorebooktab.ies") :localizeUi("ui.characters.lorebooktab.y")}: {categories.join(", ")}
          </span>
        )}
        <span className="text-[10px] text-[var(--muted-foreground)]">{pagesWithExtractions} {localizeUi("ui.cyoa.reviewstep.page")}{pagesWithExtractions !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}</span>
        {warnings.length > 0 && (
          <span className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            {warnings.length} {localizeUi("ui.modals.stbulkimportmodal.warning")}{warnings.length !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
          </span>
        )}
        {hasEdits && (
          <span className="rounded bg-[var(--primary)]/15 px-1.5 py-0.5 text-[10px] font-medium text-[var(--primary)]">{localizeUi("ui.chat.mariediteasyviewer.actionEdited")}</span>
        )}
      </div>

      {/* ── Mode Toggle ── */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setEditMode("structured")}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            editMode === "structured"
              ? "bg-[var(--accent)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          }`}
        >{localizeUi("ui.cyoa.reviewstep.structured")}</button>
        <button
          onClick={() => setEditMode("json")}
          className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
            editMode === "json"
              ? "bg-[var(--accent)] text-[var(--foreground)]"
              : "text-[var(--muted-foreground)] hover:bg-[var(--secondary)]"
          }`}
        >{localizeUi("ui.cyoa.reviewstep.rawJson")}</button>
        <button
          onClick={expandAll}
          className="ml-auto rounded-md px-2.5 py-1 text-[11px] font-medium text-[var(--muted-foreground)] transition-colors hover:bg-[var(--secondary)]"
        >
          {expandedPages.size === entries.length ?localizeUi("ui.cyoa.reviewstep.collapseAll") :localizeUi("ui.cyoa.reviewstep.expandAll")}
        </button>
      </div>

      {/* ── Warnings ── */}
      {warnings.length > 0 && (
        <div className="flex flex-col gap-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] text-amber-400">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              <span>
                <span className="font-medium">{localizeUi("ui.botBrowser.botbrowserview.page")} {w.pageNumber}:</span> {w.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── Structured Review — Per-Page Cards ── */}
      {editMode === "structured" && (
        <div className="flex flex-col gap-3">
          {entries.map(({ extraction }) => {
            const isExpanded = expandedPages.has(extraction.pageNumber);
            const choices = extraction.choices.map((c) => {
              const key = `${extraction.imageId}:${c.name}`;
              return editedChoices.get(key) ?? c;
            });

            return (
              <div key={extraction.imageId} className="overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]">
                {/* Page header */}
                <button
                  onClick={() => togglePage(extraction.pageNumber)}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-[var(--accent)]/30"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" />
                  )}
                  <span className="text-xs font-medium text-[var(--foreground)]">{localizeUi("ui.botBrowser.botbrowserview.page")} {extraction.pageNumber}
                  </span>
                  {extraction.title && (
                    <span className="text-[11px] text-[var(--muted-foreground)]">— {extraction.title}</span>
                  )}
                  <span className="ml-auto rounded bg-[var(--muted)]/50 px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]">
                    {extraction.extractionMethod}
                  </span>
                  <span className="text-[10px] text-[var(--muted-foreground)]">
                    {choices.length} {localizeUi("ui.cyoa.analyzestep.choice")}{choices.length !== 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
                  </span>
                </button>

                {/* Expanded: choices table */}
                {isExpanded && (
                  <div className="border-t border-[var(--border)] px-3 py-2">
                    {/* Page metadata */}
                    {extraction.description && (
                      <p className="mb-2 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                        {extraction.description}
                      </p>
                    )}

                    {choices.length === 0 ? (
                      <p className="py-2 text-center text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.reviewstep.noChoicesExtractedFromThisPage")}</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {choices.map((choice, ci) => (
                          <div
                            key={ci}
                            className="rounded-md border border-[var(--border)] bg-[var(--background)]/50 p-2"
                          >
                            {/* Choice row — name + cost */}
                            <div className="flex items-start gap-2">
                              <EditableField
                                label={localizeUi("settings.customGenerationParameters.name")}
                                value={choice.name}
                                onChange={(v) => updateChoice(extraction.imageId, choice.name, "name", v)}
                                small
                              />
                              <EditableField
                                label={localizeUi("ui.cyoa.analyzestep.cost")}
                                value={choice.pointCost}
                                onChange={(v) => updateChoice(extraction.imageId, choice.name, "pointCost", Number(v) || 0)}
                                type="number"
                                small
                              />
                              <EditableField
                                label={localizeUi("ui.lorebooks.lorebookeditor.category")}
                                value={choice.category}
                                onChange={(v) => updateChoice(extraction.imageId, choice.name, "category", v)}
                                small
                              />
                              {choice.stealth && (
                                <span className="mt-4 shrink-0 rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-400">{localizeUi("ui.cyoa.reviewstep.stealth")}</span>
                              )}
                            </div>
                            {/* Description */}
                            <div className="mt-1.5">
                              <EditableField
                                label={localizeUi("chat.settings.inlineEditor.fields.description")}
                                value={choice.description}
                                onChange={(v) => updateChoice(extraction.imageId, choice.name, "description", v)}
                                placeholder={localizeUi("ui.cyoa.reviewstep.choiceDescription")}
                              />
                            </div>
                            {/* Tags */}
                            {choice.tags.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1">
                                {choice.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="rounded bg-[var(--muted)]/40 px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Raw JSON Mode ── */}
      {editMode === "json" && (
        <>
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              setParseError(null);
            }}
            className="h-[400px] w-full resize-y rounded-md border border-[var(--border)] bg-[var(--input)] p-3 font-mono text-xs text-[var(--foreground)]"
            spellCheck={false}
          />
          {parseError && <p className="text-xs text-red-400">{parseError}</p>}
        </>
      )}

      {/* ── Approve Button ── */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-[var(--muted-foreground)]">
          {editMode === "structured"
            ?localizeUi("ui.cyoa.reviewstep.editAnyFieldInlineChangesAreSavedLocallyUntil")
            :localizeUi("ui.cyoa.reviewstep.editTheRawJsonThenApproveToSave")}
        </p>
        <button
          onClick={handleApprove}
          disabled={review.isPending}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {review.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}{localizeUi("ui.cyoa.reviewstep.approveContinue")}</button>
      </div>
    </div>
  );
}
