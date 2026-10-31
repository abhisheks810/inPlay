export const IDENTITY_PROVIDERS = ["apple", "google", "zoho"] as const;

export type IdentityProvider = (typeof IDENTITY_PROVIDERS)[number];

export type IdentityUser = {
  userId: string;
  displayName: string | null;
  email: string | null;
  provider: IdentityProvider | "chatgpt";
  emailVerified: boolean;
};

export type VerifiedProviderIdentity = {
  provider: IdentityProvider;
  subject: string;
  displayName: string;
  email: string | null;
  emailVerified: boolean;
};

export function isIdentityProvider(value: string): value is IdentityProvider {
  return IDENTITY_PROVIDERS.includes(value as IdentityProvider);
}

export function safeReturnPath(value: string | null | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const parsed = new URL(value, "https://app.local");
    if (parsed.origin !== "https://app.local" || parsed.pathname.startsWith("/api/auth/")) return "/";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/";
  }
}
