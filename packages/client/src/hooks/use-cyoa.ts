import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface CyoaImage {
  id: string;
  documentId: string;
  filename: string;
  originalName: string;
  pageNumber: number;
  mimeType: string;
  sizeBytes: number;
  extractions: unknown | null;
  reviewedExtractions: unknown | null;
  extractionMethod: string | null;
  createdAt: string;
}

interface CyoaChoice {
  id: string;
  documentId: string;
  name: string;
  pointCost: number | null;
  category: string | null;
  description: string | null;
  tags: string[];
  prerequisites: string[];
  tier: string | null;
  costEfficiency: number | null;
  synergies: unknown | null;
  analysis: unknown | null;
  sourceImageIds: string[];
}

interface CyoaDocument {
  id: string;
  name: string;
  description: string | null;
  status: string;
  pointBudget: number | null;
  extractions: unknown | null;
  reviewedExtractions: unknown | null;
  mergedDocument: unknown | null;
  analysis: unknown | null;
  extractionProgress: { total: number; done: number; status: "extracting" | "pending" | "done" } | null;
  choiceCount: number;
  images: CyoaImage[];
  choices: CyoaChoice[];
  createdAt: string;
  updatedAt: string;
}

export const cyoaKeys = {
  all: ["cyoa"] as const,
  list: () => [...cyoaKeys.all, "list"] as const,
  detail: (id: string) => [...cyoaKeys.all, "detail", id] as const,
};

export function useCyoaDocuments() {
  return useQuery({
    queryKey: cyoaKeys.list(),
    queryFn: () => api.get<CyoaDocument[]>("/cyoa"),
    staleTime: 5 * 60_000,
  });
}

export function useCyoaDocument(id: string | null, options?: { refetchInterval?: number | false }) {
  return useQuery({
    queryKey: cyoaKeys.detail(id ?? ""),
    queryFn: () => api.get<CyoaDocument>(`/cyoa/${id}`),
    enabled: !!id,
    staleTime: options?.refetchInterval ? 0 : 5 * 60_000,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

export function useCreateCyoaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ file, name, description }: { file: File; name?: string; description?: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      if (name) formData.append("name", name);
      if (description) formData.append("description", description);
      return api.upload<CyoaDocument>("/cyoa/upload", formData);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useAddCyoaImage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentId, file }: { documentId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      return api.upload<CyoaImage>(`/cyoa/${documentId}/add-image`, formData);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useExtractCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, connectionId }: { documentId: string; connectionId: string }) =>
      api.post<CyoaDocument>("/cyoa/extract", { documentId, connectionId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export function useReviewCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, extractions }: { documentId: string; extractions: unknown[] }) =>
      api.put<CyoaDocument>("/cyoa/review", { documentId, extractions }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useMergeCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId }: { documentId: string }) =>
      api.post<CyoaDocument>("/cyoa/merge", { documentId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useAnalyzeCyoa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, connectionId }: { documentId: string; connectionId: string }) =>
      api.post<CyoaDocument>("/cyoa/analyze", { documentId, connectionId }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: cyoaKeys.detail(variables.documentId) });
    },
  });
}

export function useDeleteCyoaDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cyoa/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: cyoaKeys.list() });
    },
  });
}

export type { CyoaDocument, CyoaImage, CyoaChoice };
