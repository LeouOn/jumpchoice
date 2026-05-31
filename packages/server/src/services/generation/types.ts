export interface CharInfoEntry {
  id: string;
  name: string;
  description: string;
  personality: string;
  scenario: string;
  creatorNotes: string;
  systemPrompt: string;
  backstory: string;
  appearance: string;
  mesExample: string;
  firstMes: string;
  postHistoryInstructions: string;
  tags: string[];
  talkativeness: number;
  avatarPath: string | null;
}

export type ServiceResult<T = void> =
  | { ok: true; value: T }
  | { ok: false; status: number; error: string };
