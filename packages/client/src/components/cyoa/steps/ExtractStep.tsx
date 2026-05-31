import { useState } from "react";
import { useCyoaDocument, useExtractCyoa } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Loader2, CheckCircle2, XCircle, Zap } from "lucide-react";
import { useConnections } from "@/hooks/use-connections";

interface ExtractStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

export function ExtractStep({ document, documentId }: ExtractStepProps) {
  const [connectionId, setConnectionId] = useState("");
  const extract = useExtractCyoa();
  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];
  const { data: freshDoc } = useCyoaDocument(documentId);
  const doc = freshDoc ?? document;

  const images = doc?.images ?? [];
  const isExtracting = extract.isPending;

  const handleExtract = () => {
    if (!connectionId) return;
    extract.mutate({ documentId, connectionId });
  };

  const allExtracted = images.length > 0 && images.every((img) => img.extractions !== null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-[var(--muted-foreground)]">
          Select LLM Connection
        </label>
        <select
          value={connectionId}
          onChange={(e) => setConnectionId(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
          disabled={isExtracting}
        >
          <option value="">Choose a connection...</option>
          {typedConnections.map((conn) => (
            <option key={conn.id} value={conn.id}>
              {conn.name} ({conn.provider})
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleExtract}
        disabled={!connectionId || isExtracting || allExtracted}
        className="flex items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isExtracting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Zap className="h-4 w-4" />
        )}
        {isExtracting ? "Extracting..." : allExtracted ? "Extraction Complete" : "Start Extraction"}
      </button>

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">
            Image Progress ({images.filter((img) => img.extractions).length}/{images.length})
          </h3>
          <div className="flex flex-col gap-1.5">
            {images
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((img) => {
                const done = img.extractions !== null;
                return (
                  <div
                    key={img.id}
                    className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2"
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                    ) : isExtracting ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--primary)]" />
                    ) : (
                      <XCircle className="h-4 w-4 shrink-0 text-[var(--muted-foreground)]" />
                    )}
                    <span className="text-sm text-[var(--foreground)]">
                      Page {img.pageNumber}
                    </span>
                    {img.extractionMethod && (
                      <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">
                        {img.extractionMethod}
                      </span>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
