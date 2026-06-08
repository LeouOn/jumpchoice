import { useState, useEffect } from "react";
import { X, Globe, Eye, Skull, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";

interface DirectorsCutPanelProps {
  chatId: string;
  onClose: () => void;
}

interface AgentOutput {
  id: string;
  agentType: string;
  text: string;
  createdAt: string;
}

export function DirectorsCutPanel({ chatId, onClose }: DirectorsCutPanelProps) {
  const [outputs, setOutputs] = useState<AgentOutput[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ outputs: AgentOutput[] }>(`/api/cyoa/chats/${chatId}/agent-outputs`);
        if (!cancelled) {
          setOutputs(data.outputs);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [chatId]);

  const grouped = {
    "cyoa-world": outputs.filter((o) => o.agentType === "cyoa-world"),
    "cyoa-director": outputs.filter((o) => o.agentType === "cyoa-director"),
    "cyoa-adversary": outputs.filter((o) => o.agentType === "cyoa-adversary"),
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 border-l border-[var(--border)] bg-[var(--background)] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Director's Cut</h2>
        <button onClick={onClose} className="rounded p-1 text-[var(--muted-foreground)] hover:bg-[var(--accent)]">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 60px)" }}>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--muted-foreground)]" />
          </div>
        ) : outputs.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No agent outputs yet. Start playing to see what's happening behind the scenes.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, items]) => {
              if (items.length === 0) return null;
              const config = {
                "cyoa-world": { icon: Globe, label: "World Simulator", color: "text-blue-400" },
                "cyoa-director": { icon: Eye, label: "Director", color: "text-purple-400" },
                "cyoa-adversary": { icon: Skull, label: "Adversary", color: "text-red-400" },
              }[type]!;

              return (
                <div key={type}>
                  <div className="mb-2 flex items-center gap-2">
                    <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                    <h3 className="text-xs font-medium text-[var(--foreground)]">{config.label}</h3>
                  </div>
                  <div className="space-y-2">
                    {items.map((output) => (
                      <div key={output.id} className="rounded-md border border-[var(--border)] bg-[var(--card)] p-3">
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {new Date(output.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-xs text-[var(--foreground)]">{output.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
