import { useState } from "react";
import type { CyoaBuild } from "@/hooks/use-cyoa-builds";
import type { CyoaDocument } from "@/hooks/use-cyoa";
import { useCyoaNarratorPrompts } from "@/hooks/use-cyoa-builds";
import { useConnections } from "@/hooks/use-connections";
import { useCreateAgent } from "@/hooks/use-agents";
import { useCreateChat, useUpdateChatMetadata } from "@/hooks/use-chats";
import { useChatStore } from "@/stores/chat.store";
import { X, Loader2, Eye, Globe, Skull } from "lucide-react";
import { CyoaSetupWizard } from "./CyoaSetupWizard";
import { DEFAULT_CYOA_DIFFICULTY } from "./CyoaChatSettings";
import { useTranslation as useUiTranslation } from "react-i18next";

interface StartCampaignModalProps {
  build: CyoaBuild;
  document: CyoaDocument;
  onClose: () => void;
}

interface CreatedAgents {
  world: string;
  director: string;
  adversary: string | null;
  chatId: string;
}

const AGENT_CONFIGS = [
  { type: "cyoa-world", name: "World Simulator", desc: "Tracks off-screen events and escalates opposition", phase: "pre_generation" as const, icon: Globe, key: "world" as const },
  { type: "cyoa-director", name: "Director", desc: "Controls what information reaches the Narrator", phase: "pre_generation" as const, icon: Eye, key: "director" as const },
  { type: "cyoa-adversary", name: "Adversary", desc: "The devil on the shoulder (can be disabled in setup)", phase: "pre_generation" as const, icon: Skull, key: "adversary" as const },
];

export function StartCampaignModal({ build, document, onClose }: StartCampaignModalProps) {
  const { t: localizeUi } = useUiTranslation();
  const [connectionId, setConnectionId] = useState("");
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdAgents, setCreatedAgents] = useState<CreatedAgents | null>(null);

  const { data: connections } = useConnections();
  const typedConnections = (connections ?? []) as { id: string; name: string; provider: string }[];
  const createAgent = useCreateAgent();
  const createChat = useCreateChat();
  const updateChatMetadata = useUpdateChatMetadata();
  const fetchPrompts = useCyoaNarratorPrompts();
  const setActiveChatId = useChatStore((s) => s.setActiveChatId);

  const handleLaunch = async () => {
    if (!connectionId) return;
    setLaunching(true);
    setError(null);

    try {
      const prompts = await fetchPrompts.mutateAsync({ documentId: document.id, buildId: build.id, difficulty: DEFAULT_CYOA_DIFFICULTY });

      const agentIds: Record<string, string | null> = {};
      for (const config of AGENT_CONFIGS) {
        const promptKey = config.key === "world" ? "world" : config.key === "director" ? "director" : "adversary";
        const prompt = prompts[promptKey as keyof typeof prompts] as string | null;
        const agent = await createAgent.mutateAsync({
          type: config.type,
          name: `${config.name} — ${build.name}`,
          description: `CYOA ${config.name} for ${document.name}`,
          phase: config.phase,
          enabled: true,
          connectionId,
          promptTemplate: prompt ?? `CYOA ${config.name}. Build: ${build.name}.`,
          settings: {},
        }) as { id: string };
        agentIds[config.key] = agent.id;
      }

      const chat = await createChat.mutateAsync({
        name: `${document.name} — ${build.name}`,
        mode: "game",
        connectionId,
      });

      const initialAgentIds = [agentIds.world, agentIds.director, agentIds.adversary].filter((id): id is string => !!id);
      await updateChatMetadata.mutateAsync({
        id: chat.id,
        enableAgents: true,
        activeAgentIds: initialAgentIds,
      });

      setCreatedAgents({ world: agentIds.world!, director: agentIds.director!, adversary: agentIds.adversary, chatId: chat.id });
    } catch (err) {
      setError(`Failed to launch campaign: ${(err as Error)?.message ?? "Unknown error"}`);
    } finally {
      setLaunching(false);
    }
  };

  const handleWizardComplete = () => {
    if (createdAgents) {
      setActiveChatId(createdAgents.chatId);
    }
    onClose();
  };

  if (createdAgents) {
    return (
      <CyoaSetupWizard
        build={build}
        document={document}
        chatId={createdAgents.chatId}
        agentIds={createdAgents}
        onComplete={handleWizardComplete}
        onCancel={onClose}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--background)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{localizeUi("ui.cyoa.buildplannermodal.startCampaign")}</h2>
          <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3">
          <p className="text-xs font-medium text-[var(--foreground)]">{build.name}</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {build.selectedChoiceIds.length} {localizeUi("ui.cyoa.startcampaignmodal.choicesFrom")} {document.name}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.startcampaignmodal.llmConnection")}</label>
          <select
            value={connectionId}
            onChange={(e) => setConnectionId(e.target.value)}
            className="rounded-md border border-[var(--border)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--foreground)]"
            disabled={launching}
          >
            <option value="">{localizeUi("ui.cyoa.startcampaignmodal.chooseAConnection")}</option>
            {typedConnections.map((conn) => (
              <option key={conn.id} value={conn.id}>
                {conn.name} ({conn.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-xs font-medium text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.cyoasetupwizard.campaignAgents")}</label>
          <div className="space-y-1.5">
            {AGENT_CONFIGS.map((config) => (
              <div key={config.type} className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2">
                <config.icon className="h-3.5 w-3.5 text-[var(--primary)]" />
                <div>
                  <p className="text-xs font-medium text-[var(--foreground)]">{config.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{config.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--muted-foreground)]">{localizeUi("ui.cyoa.startcampaignmodal.characterVoicesAndNarratorAreBuiltIntoTheMain")}</p>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--foreground)]"
            disabled={launching}
          >{localizeUi("chat.delete.dialog.cancel")}</button>
          <button
            onClick={handleLaunch}
            disabled={!connectionId || launching}
            className="flex items-center gap-2 rounded-md bg-[var(--primary)] px-4 py-1.5 text-xs font-medium text-white disabled:opacity-50"
          >
            {launching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{localizeUi("ui.cyoa.startcampaignmodal.launchCampaign")}</button>
        </div>
      </div>
    </div>
  );
}
