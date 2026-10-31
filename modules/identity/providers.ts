import { env } from "cloudflare:workers";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT, type JWTPayload } from "jose";
import { sha256 } from "./crypto";
import type { IdentityProvider, VerifiedProviderIdentity } from "./types";

type ProviderDefinition = {
  clientId: string;
  clientSecret: string;
  authorizationEndpoint: string;
  tokenEndpoint: string;
  issuer: string | string[];
  jwksUri: string;
  usePkce: boolean;
};

export type ProviderAvailability = Record<IdentityProvider, boolean>;

export function providerAvailability(): ProviderAvailability {
  return {
    apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY),
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    zoho: Boolean(env.ZOHO_CLIENT_ID && env.ZOHO_CLIENT_SECRET),
  };
}

export function canonicalOrigin(request: Request): string {
  const configured = env.AUTH_BASE_URL?.trim().replace(/\/$/u, "");
  if (configured) return new URL(configured).origin;
  return new URL(request.url).origin;
}

export function callbackUrl(provider: IdentityProvider, request: Request): string {
  return `${canonicalOrigin(request)}/api/auth/${provider}/callback`;
}

export async function buildAuthorizationUrl(
  provider: IdentityProvider,
  request: Request,
  transaction: { state: string; nonce: string; codeVerifier: string | null },
): Promise<string> {
  const definition = await getProviderDefinition(provider);
  const url = new URL(definition.authorizationEndpoint);
  url.searchParams.set("client_id", definition.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(provider, request));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", transaction.state);
  url.searchParams.set("nonce", transaction.nonce);

  if (provider === "apple") {
    url.searchParams.set("scope", "name email");
    url.searchParams.set("response_mode", "form_post");
  } else if (provider === "google") {
    url.searchParams.set("prompt", "select_account");
  }

  if (transaction.codeVerifier) {
    url.searchParams.set("code_challenge", await sha256(transaction.codeVerifier));
    url.searchParams.set("code_challenge_method", "S256");
  }
  return url.toString();
}

export async function exchangeAndVerifyIdentity(input: {
  provider: IdentityProvider;
  code: string;
  request: Request;
  nonce: string;
  codeVerifier: string | null;
  appleUser?: string | null;
}): Promise<VerifiedProviderIdentity> {
  const definition = await getProviderDefinition(input.provider);
  const clientSecret =
    input.provider === "apple" ? await createAppleClientSecret() : definition.clientSecret;
  const body = new URLSearchParams({
    code: input.code,
    client_id: definition.clientId,
    client_secret: clientSecret,
    redirect_uri: callbackUrl(input.provider, input.request),
    grant_type: "authorization_code",
  });
  if (input.codeVerifier) body.set("code_verifier", input.codeVerifier);

  const tokenResponse = await fetch(definition.tokenEndpoint, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const token = (await tokenResponse.json().catch(() => null)) as
    | { id_token?: string; error?: string; error_description?: string }
    | null;
  if (!tokenResponse.ok || !token?.id_token) {
    throw new Error(token?.error_description || token?.error || "The identity provider rejected the token exchange.");
  }

  const verified = await jwtVerify(token.id_token, createRemoteJWKSet(new URL(definition.jwksUri)), {
    issuer: definition.issuer,
    audience: definition.clientId,
  });
  if (verified.payload.nonce !== input.nonce) throw new Error("The identity response nonce did not match.");
  const identity = claimsToIdentity(input.provider, verified.payload, input.appleUser);
  if (!identity.email || !identity.emailVerified) {
    throw new Error("The provider did not return a verified email address.");
  }
  return identity;
}

async function getProviderDefinition(provider: IdentityProvider): Promise<ProviderDefinition> {
  if (provider === "google") {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google sign-in is not configured.");
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      jwksUri: "https://www.googleapis.com/oauth2/v3/certs",
      usePkce: true,
    };
  }

  if (provider === "apple") {
    if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
      throw new Error("Apple sign-in is not configured.");
    }
    return {
      clientId: env.APPLE_CLIENT_ID,
      clientSecret: "generated-per-request",
      authorizationEndpoint: "https://appleid.apple.com/auth/authorize",
      tokenEndpoint: "https://appleid.apple.com/auth/token",
      issuer: "https://appleid.apple.com",
      jwksUri: "https://appleid.apple.com/auth/keys",
      usePkce: false,
    };
  }

  if (!env.ZOHO_CLIENT_ID || !env.ZOHO_CLIENT_SECRET) throw new Error("Zoho sign-in is not configured.");
  const accountsOrigin = new URL(env.ZOHO_ACCOUNTS_ORIGIN || "https://accounts.zoho.com").origin;
  const discoveryResponse = await fetch(`${accountsOrigin}/.well-known/openid-configuration`);
  if (!discoveryResponse.ok) throw new Error("Zoho OpenID configuration is unavailable.");
  const discovery = (await discoveryResponse.json()) as {
    authorization_endpoint: string;
    token_endpoint: string;
    issuer: string;
    jwks_uri: string;
    code_challenge_methods_supported?: string[];
  };
  return {
    clientId: env.ZOHO_CLIENT_ID,
    clientSecret: env.ZOHO_CLIENT_SECRET,
    authorizationEndpoint: discovery.authorization_endpoint,
    tokenEndpoint: discovery.token_endpoint,
    issuer: discovery.issuer,
    jwksUri: discovery.jwks_uri,
    usePkce: discovery.code_challenge_methods_supported?.includes("S256") ?? false,
  };
}

export async function providerUsesPkce(provider: IdentityProvider): Promise<boolean> {
  return (await getProviderDefinition(provider)).usePkce;
}

async function createAppleClientSecret(): Promise<string> {
  if (!env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY) {
    throw new Error("Apple sign-in is not configured.");
  }
  const privateKey = await importPKCS8(env.APPLE_PRIVATE_KEY.replaceAll("\\n", "\n"), "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: env.APPLE_KEY_ID })
    .setIssuer(env.APPLE_TEAM_ID)
    .setSubject(env.APPLE_CLIENT_ID)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);
}

function claimsToIdentity(
  provider: IdentityProvider,
  claims: JWTPayload,
  appleUser?: string | null,
): VerifiedProviderIdentity {
  if (!claims.sub) throw new Error("The identity token did not include a subject.");
  const appleProfile = parseAppleProfile(appleUser);
  const email = typeof claims.email === "string" ? claims.email : null;
  const claimedName = typeof claims.name === "string" ? claims.name.trim() : "";
  const displayName = claimedName || appleProfile?.name || null;
  return {
    provider,
    subject: claims.sub,
    displayName,
    email,
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
  };
}

function parseAppleProfile(value?: string | null): { name: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as { name?: { firstName?: string; lastName?: string } };
    const name = [parsed.name?.firstName, parsed.name?.lastName].filter(Boolean).join(" ").trim();
    return name ? { name } : null;
  } catch {
    return null;
  }
}
