// ── Selfie prompt controls ──
import { useState, useEffect, useCallback } from "react";

export function SelfiePromptControls({
  promptTemplate,
  positivePrompt,
  legacyTags,
  negativePrompt,
  onCommitPromptTemplate,
  onCommitPositivePrompt,
  onCommitNegativePrompt,
}: {
  promptTemplate: string | null | undefined;
  positivePrompt: string | undefined;
  legacyTags: string[];
  negativePrompt: string;
  onCommitPromptTemplate: (value: string | null) => void;
  onCommitPositivePrompt: (value: string) => void;
  onCommitNegativePrompt: (value: string) => void;
}) {
  const legacyTagText = legacyTags.join(", ");
  const displayPositivePrompt = positivePrompt ?? legacyTagText;
  const displayPromptTemplate = promptTemplate ?? "";
  const [promptDraft, setPromptDraft] = useState(displayPromptTemplate);
  const [positiveDraft, setPositiveDraft] = useState(displayPositivePrompt);
  const [negativeDraft, setNegativeDraft] = useState(negativePrompt);

  useEffect(() => {
    setPromptDraft(displayPromptTemplate);
  }, [displayPromptTemplate]);

  useEffect(() => {
    setPositiveDraft(displayPositivePrompt);
  }, [displayPositivePrompt]);

  useEffect(() => {
    setNegativeDraft(negativePrompt);
  }, [negativePrompt]);

  const commitPromptTemplate = useCallback(() => {
    const nextValue = promptDraft.trim().length > 0 ? promptDraft : null;
    if ((nextValue ?? "") !== displayPromptTemplate) onCommitPromptTemplate(nextValue);
  }, [displayPromptTemplate, onCommitPromptTemplate, promptDraft]);

  const commitPositivePrompt = useCallback(() => {
    if (positiveDraft !== displayPositivePrompt) onCommitPositivePrompt(positiveDraft);
  }, [displayPositivePrompt, onCommitPositivePrompt, positiveDraft]);

  const commitNegativePrompt = useCallback(() => {
    if (negativeDraft !== negativePrompt) onCommitNegativePrompt(negativeDraft);
  }, [negativeDraft, negativePrompt, onCommitNegativePrompt]);

  return (
    <div className="mt-2 space-y-2">
      <label className="flex flex-col gap-1">
        <span className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">Selfie prompt</span>
        <textarea
          value={promptDraft}
          onChange={(e) => setPromptDraft(e.target.value)}
          onBlur={commitPromptTemplate}
          placeholder={`You are an image prompt generator. Create a concise selfie prompt for ${"${charName}"} using this appearance: ${"${appearance}"}.\nOutput ONLY the prompt text, nothing else.`}
          className="min-h-[7rem] resize-y rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-2 text-[0.6875rem] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)]/45 focus:border-[var(--primary)]/50"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">Positive tags</span>
        <textarea
          value={positiveDraft}
          onChange={(e) => setPositiveDraft(e.target.value)}
          onBlur={commitPositivePrompt}
          placeholder="masterpiece, best quality, detailed eyes"
          className="min-h-[4rem] resize-y rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-2 text-[0.6875rem] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)]/45 focus:border-[var(--primary)]/50"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[0.6875rem] font-medium text-[var(--muted-foreground)]">Negative prompt</span>
        <textarea
          value={negativeDraft}
          onChange={(e) => setNegativeDraft(e.target.value)}
          onBlur={commitNegativePrompt}
          placeholder="lowres, bad anatomy, extra fingers"
          className="min-h-[4rem] resize-y rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-2 text-[0.6875rem] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--muted-foreground)]/45 focus:border-[var(--primary)]/50"
        />
      </label>
      <p className="text-[0.55rem] text-[var(--muted-foreground)]">
        Saved for this chat. Leave the selfie prompt blank to use the default prompt. The template can use{" "}
        {"${charName}"} and {"${appearance}"}. Positive tags are appended to the generated selfie prompt; negative tags
        are sent directly to the image generator.
      </p>
    </div>
  );
}
