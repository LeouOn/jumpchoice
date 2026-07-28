import { useState, useCallback } from "react";
import { useCreateCyoaDocument, useAddCyoaImage } from "@/hooks/use-cyoa";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { Upload, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/ui.store";
import { useTranslation as useUiTranslation } from "react-i18next";

interface UploadStepProps {
  document: CyoaDocument | undefined;
  documentId: string;
}

const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".avif"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

function isAcceptedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return ACCEPTED_EXTENSIONS.includes(ext) && file.size <= MAX_SIZE_BYTES;
}

export function UploadStep({ document, documentId }: UploadStepProps) {
  const { t: localizeUi } = useUiTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const openCyoa = useUIStore((s) => s.openCyoa);

  const createDoc = useCreateCyoaDocument();
  const addImage = useAddCyoaImage();

  const images = document?.images ?? [];
  const isExistingDoc = !!document;

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const accepted = Array.from(files).filter(isAcceptedFile);
      if (!accepted.length) {
        setError("No valid image files selected (jpg, png, gif, webp, avif, max 20MB)");
        return;
      }
      setError(null);

      for (const file of accepted) {
        setUploadingFiles((prev) => [...prev, file.name]);
        try {
          if (!isExistingDoc) {
            const result = await createDoc.mutateAsync({ file, name: file.name });
            openCyoa(result.id);
          } else {
            await addImage.mutateAsync({ documentId, file });
          }
        } catch {
          setError(`Failed to upload ${file.name}`);
        } finally {
          setUploadingFiles((prev) => prev.filter((n) => n !== file.name));
        }
      }
    },
    [isExistingDoc, documentId, createDoc, addImage, openCyoa],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      uploadFiles(e.dataTransfer.files);
    },
    [uploadFiles],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) uploadFiles(e.target.files);
    },
    [uploadFiles],
  );

  return (
    <div className="flex flex-col gap-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed py-10 transition-colors ${
          isDragging
            ? "border-[var(--primary)] bg-[var(--primary)]/5"
            : "border-[var(--border)] hover:border-[var(--muted-foreground)]"
        }`}
      >
        <Upload className="h-8 w-8 text-[var(--muted-foreground)]" />
        <p className="text-sm text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.uploadstep.dragDropCyoaImagesHereOrClickToBrowse")}</p>
        <label className="cursor-pointer rounded-md bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90">{localizeUi("ui.cyoa.uploadstep.browseFiles")}<input
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.avif"
            multiple
            className="hidden"
            onChange={handleFileInput}
          />
        </label>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}

      {uploadingFiles.length > 0 && (
        <div className="flex flex-col gap-1">
          {uploadingFiles.map((name) => (
            <div key={name} className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <Loader2 className="h-3 w-3 animate-spin" />{localizeUi("ui.noodle.noodleprofilesurface.uploading_de27240")} {name}...
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.uploadstep.uploadedPages")}{images.length})
          </h3>
          <div className="grid grid-cols-4 gap-2">
            {images
              .sort((a, b) => a.pageNumber - b.pageNumber)
              .map((img) => (
                <div
                  key={img.id}
                  className="group relative flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--card)]"
                >
                  <img
                    src={`/api/cyoa/file/${documentId}/${img.filename}`}
                    alt={localizeUi("ui.cyoa.uploadstep.pageValue1", { value1: img.pageNumber })}
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1 py-0.5 text-[10px] text-white">
                    {img.pageNumber}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {images.length > 0 && (
        <div className="flex justify-end">
          <p className="text-xs text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.uploadstep.readyToExtractChoicesFrom")} {images.length} {localizeUi("ui.cyoa.reviewstep.page")}{images.length > 1 ?localizeUi("ui.noodle.stageprofileview.s") : ""}
          </p>
        </div>
      )}
    </div>
  );
}
