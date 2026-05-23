import { generateRequestSchema, type GenerateRequestInput } from "@jumpchoice/shared";

export type GenerateRequest = GenerateRequestInput;

export function validateGenerateRequest(body: unknown): GenerateRequest {
  return generateRequestSchema.parse(body);
}
