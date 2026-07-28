import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

interface CyoaBuild {
  id: string;
  documentId: string;
  name: string;
  description: string;
  selectedChoiceIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export const buildKeys = {
  all: (docId: string) => ["cyoa-builds", docId] as const,
  list: (docId: string) => [...buildKeys.all(docId), "list"] as const,
  detail: (docId: string, id: string) => [...buildKeys.all(docId), "detail", id] as const,
};

export function useCyoaBuilds(docId: string) {
  return useQuery({
    queryKey: buildKeys.list(docId),
    queryFn: () => api.get<CyoaBuild[]>(`/cyoa/${docId}/builds`),
    enabled: !!docId,
    staleTime: 5 * 60_000,
  });
}

export function useCyoaBuild(docId: string, id: string | null) {
  return useQuery({
    queryKey: buildKeys.detail(docId, id ?? ""),
    queryFn: () => api.get<CyoaBuild>(`/cyoa/${docId}/builds/${id}`),
    enabled: !!docId && !!id,
    staleTime: 5 * 60_000,
  });
}

export function useCreateCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      api.post<CyoaBuild>(`/cyoa/${docId}/builds`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
    },
  });
}

export function useUpdateCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string; name?: string; description?: string; selectedChoiceIds?: string[]; notes?: string }) =>
      api.patch<CyoaBuild>(`/cyoa/${docId}/builds/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
      qc.invalidateQueries({ queryKey: buildKeys.detail(docId, variables.id) });
    },
  });
}

export function useDeleteCyoaBuild(docId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/cyoa/${docId}/builds/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: buildKeys.all(docId) });
    },
  });
}

export interface CyoaDifficulty {
  directorAggression: number;      // 1-5
  worldEscalation: number;         // 1-5
  informationLeakage: number;      // 1-5
  adversaryEnabled: boolean;
  stealthDisabled: boolean;
}

export interface CyoaNarratorPrompts {
  narrator: string;
  director: string;
  world: string;
  characters: string;
  adversary: string | null;
}

export function useCyoaNarratorPrompts() {
  return useMutation({
    mutationFn: ({ documentId, buildId, difficulty }: {
      documentId: string;
      buildId: string;
      difficulty?: Partial<CyoaDifficulty>;
    }) =>
      api.post<CyoaNarratorPrompts>("/cyoa/prompts", {
        documentId,
        buildId,
        difficulty,
      }),
  });
}

export type { CyoaBuild };
