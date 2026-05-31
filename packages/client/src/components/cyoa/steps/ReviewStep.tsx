import { useState, useEffect } from "react";
import { useReviewCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Check, Loader2 } from "lucide-react";

interface ReviewStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ReviewStep({ document, documentId }: ReviewStepProps) {
  const [jsonText, setJsonText] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const review = useReviewCyoa();

  useEffect(() => {
    if (document?.images) {
      const extractions = document.images
        .sort((a, b) => a.pageNumber - b.pageNumber)
        .filter((img) => img.extractions)
        .map((img) => img.extractions);
      setJsonText(JSON.stringify(extractions, null, 2));
    }
  }, [document]);

  const handleApprove = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setParseError("Extractions must be a JSON array");
        return;
      }
      setParseError(null);
      review.mutate({ documentId, extractions: parsed });
    } catch {
      setParseError("Invalid JSON — please fix syntax errors");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-[var(--muted-foreground)]">
        Review and correct the extracted choices below. Edit the JSON directly, then approve to continue.
      </p>

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

      <div className="flex justify-end">
        <button
          onClick={handleApprove}
          disabled={review.isPending}
          className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {review.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve & Continue
        </button>
      </div>
    </div>
  );
}
