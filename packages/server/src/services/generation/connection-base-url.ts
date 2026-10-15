import { PROVIDERS, localAuthProviderBaseUrl } from "@jumpchoice/shared";

/**
 * Trim whitespace and trailing slashes, and drop a pasted endpoint path
 * (`/chat/completions` or `/responses`) so providers never request it twice.
 */
export function normalizeOpenAIBaseUrl(baseUrl: string): string {
  return baseUrl
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/+(?:chat\/completions|responses)\/?$/i, "")
    .replace(/\/+$/, "");
}

/** Resolve the base URL for a connection, falling back to the provider default. */
export function resolveBaseUrl(connection: { baseUrl: string | null; provider: string }): string {
  if (connection.baseUrl) return normalizeOpenAIBaseUrl(connection.baseUrl);
  // Subscription/login-backed providers own their endpoint internally, but
  // downstream callers gate on a non-empty baseUrl. Return a sentinel so the
  // gate passes; the provider ignores the value.
  const localAuthBaseUrl = localAuthProviderBaseUrl(connection.provider);
  if (localAuthBaseUrl) return localAuthBaseUrl;
  const providerDef = PROVIDERS[connection.provider as keyof typeof PROVIDERS];
  return providerDef?.defaultBaseUrl ?? "";
}
