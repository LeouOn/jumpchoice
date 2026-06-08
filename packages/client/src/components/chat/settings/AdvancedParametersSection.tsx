// ── Advanced Parameters (per-chat generation overrides) ──
import { useState } from "react";
import { Save, Settings2, ChevronDown } from "lucide-react";
import { cn } from "../../../lib/utils";
import { HelpTooltip } from "../../ui/HelpTooltip";
import {
  CHAT_PARAMETER_DEFAULTS,
  GenerationParametersFields,
  getEditableGenerationParameters,
  type EditableGenerationParameters,
  ROLEPLAY_PARAMETER_DEFAULTS,
} from "../../ui/GenerationParametersEditor";
import { useSaveConnectionDefaults } from "../../../hooks/use-connections";
import { useUpdateChatMetadata } from "../../../hooks/use-chats";
import type { Chat } from "@jumpchoice/shared";

export function AdvancedParametersSection({
  chat,
  metadata,
  updateMeta,
  isConversation,
  connectionId,
  connections,
}: {
  chat: Chat;
  metadata: Record<string, unknown>;
  updateMeta: ReturnType<typeof useUpdateChatMetadata>;
  isConversation: boolean;
  connectionId: string | null;
  connections: unknown[];
}) {
  const modeDefaults = isConversation ? CHAT_PARAMETER_DEFAULTS : ROLEPLAY_PARAMETER_DEFAULTS;
  const conn = connectionId ? (connections as Record<string, unknown>[]).find((c) => c.id === connectionId) : null;
  const defaults = getEditableGenerationParameters(modeDefaults, conn?.defaultParameters);
  const saveDefaults = useSaveConnectionDefaults();
  const [expanded, setExpanded] = useState(false);
  const params = (metadata.chatParameters as Record<string, unknown>) ?? {};
  const effectiveParams = getEditableGenerationParameters(defaults, params);

  const setParameters = (next: EditableGenerationParameters) => {
    updateMeta.mutate({ id: chat.id, chatParameters: { ...params, ...next } });
  };

  return (
    <div className="border-b border-[var(--border)]">
      <div className="flex items-center px-4 py-3 transition-colors hover:bg-[var(--accent)]/50">
        <button onClick={() => setExpanded((o) => !o)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <span className="text-[var(--muted-foreground)]">
            <Settings2 size="0.875rem" />
          </span>
          <span className="flex-1 text-xs font-semibold">Advanced Parameters</span>
          <ChevronDown
            size="0.75rem"
            className={cn("text-[var(--muted-foreground)] transition-transform", expanded && "rotate-180")}
          />
        </button>
        <HelpTooltip
          text="Override generation parameters for this chat. Only change these if you know what you're doing."
          side="left"
        />
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <GenerationParametersFields value={effectiveParams} onChange={setParameters} />
          {connectionId && connectionId !== "random" && (
            <button
              onClick={() => {
                saveDefaults.mutate({
                  id: connectionId,
                  params: effectiveParams as unknown as Record<string, unknown>,
                });
              }}
              className="w-full rounded-lg bg-[var(--primary)]/10 px-3 py-1.5 text-[0.625rem] font-medium text-[var(--primary)] ring-1 ring-[var(--primary)]/20 transition-colors hover:bg-[var(--primary)]/20"
            >
              <Save size="0.625rem" className="inline mr-1 -mt-px" />
              {saveDefaults.isPending ? "Saving…" : "Save as Connection Default"}
            </button>
          )}
          <button
            onClick={() => {
              updateMeta.mutate({ id: chat.id, chatParameters: defaults });
            }}
            className="w-full rounded-lg bg-[var(--secondary)] px-3 py-1.5 text-[0.625rem] text-[var(--muted-foreground)] transition-colors hover:bg-[var(--accent)]"
          >
            Reset to Defaults
          </button>
        </div>
      )}
    </div>
  );
}
