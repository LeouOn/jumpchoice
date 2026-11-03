// ──────────────────────────────────────────────
// Hook: "Render this moment" (JumpChoice fork feature)
// ──────────────────────────────────────────────
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  MomentAspect,
  MomentPreviewResponse,
  MomentRenderResponse,
  MomentRenderSettings,
  MomentSpendStatus,
  MomentStyleId,
} from "@jumpchoice/shared";
import { api } from "../lib/api-client";

export const momentKeys = {
  settings: ["moments", "settings"] as const,
};

export type MomentSettingsResponse = { settings: MomentRenderSettings; spend: MomentSpendStatus };

export type MomentDraftInput = {
  characterId?: string;
  styleId?: MomentStyleId;
  customStyle?: string;
  aspect?: MomentAspect;
  scene: string;
  debugMode?: boolean;
};

export function useMomentSettings(enabled = true) {
  return useQuery({
    queryKey: momentKeys.settings,
    queryFn: () => api.get<MomentSettingsResponse>("/moments/settings"),
    staleTime: 30_000,
    enabled,
  });
}

export function useUpdateMomentSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (settings: MomentRenderSettings) => api.put<MomentSettingsResponse>("/moments/settings", settings),
    onSuccess: (data) => qc.setQueryData(momentKeys.settings, data),
  });
}

/** Draft a scene paragraph from the last messages using the chat's text connection. */
export function useMomentScene(chatId: string) {
  return useMutation({
    mutationFn: (input: { characterId?: string; debugMode?: boolean }) =>
      api.post<{ scene: string }>(`/moments/${encodeURIComponent(chatId)}/scene`, input),
  });
}

/** Assemble the exact prompt. Never contacts an image provider and never spends money. */
export function useMomentPreview(chatId: string) {
  return useMutation({
    mutationFn: (input: MomentDraftInput) =>
      api.post<MomentPreviewResponse>(`/moments/${encodeURIComponent(chatId)}/preview`, input),
  });
}

/** Send exactly the confirmed prompt. Only call after the user pressed Confirm. */
export function useMomentRender(chatId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: MomentDraftInput & { prompt: string }) =>
      api.post<MomentRenderResponse>(`/moments/${encodeURIComponent(chatId)}/render`, {
        ...input,
        confirmed: true,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gallery", chatId] });
      void qc.invalidateQueries({ queryKey: momentKeys.settings });
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: momentKeys.settings });
    },
  });
}
