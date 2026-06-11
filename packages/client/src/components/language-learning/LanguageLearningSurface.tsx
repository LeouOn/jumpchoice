// ──────────────────────────────────────────────
// Surface: Language Learning mode — chat + learning panel
// ──────────────────────────────────────────────
import type { ComponentProps } from "react";
import { ChatConversationSurface } from "../chat/ChatConversationSurface";
import { LanguageLearningPanel } from "./LanguageLearningPanel";

export function LanguageLearningSurface(props: ComponentProps<typeof ChatConversationSurface>) {
  return (
    <div className="flex h-full flex-1 overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <ChatConversationSurface {...props} />
      </div>
      <div className="w-72 shrink-0 border-l border-[var(--border)] bg-[var(--card)]">
        <LanguageLearningPanel />
      </div>
    </div>
  );
}
