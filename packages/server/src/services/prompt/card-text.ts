import { stripMacroComments } from "@jumpchoice/shared";

export function cardPromptText(value: unknown): string {
  return typeof value === "string" ? stripMacroComments(value).trim() : "";
}
