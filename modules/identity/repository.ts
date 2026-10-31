import { getRawDb } from "@/db";
import { randomToken, sha256 } from "./crypto";
import type { IdentityProvider, IdentityUser, VerifiedProviderIdentity } from "./types";

const OAUTH_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export const SESSION_COOKIE = "streamline_session";

export type OAuthTransaction = {
  provider: IdentityProvider;
  codeVerifier: string | null;
  nonce: string;
  returnTo: string;
};

export async function createOAuthTransaction(
  provider: IdentityProvider,
  returnTo: string,
  usePkce: boolean,
): Promise<{ state: string; nonce: string; codeVerifier: string | null }> {
  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = usePkce ? randomToken(48) : null;
  const now = Date.now();
  const db = getRawDb();
  await db.prepare("DELETE FROM oauth_transactions WHERE expires_at <= ?").bind(now).run();
  await db
    .prepare(
      `INSERT INTO oauth_transactions
       (state_hash, provider, code_verifier, nonce, return_to, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(await sha256(state), provider, codeVerifier, nonce, returnTo, now, now + OAUTH_TRANSACTION_TTL_MS)
    .run();
  return { state, nonce, codeVerifier };
}

export async function consumeOAuthTransaction(
  state: string,
  provider: IdentityProvider,
): Promise<OAuthTransaction | null> {
  const stateHash = await sha256(state);
  const db = getRawDb();
  const row = await db
    .prepare(
      `DELETE FROM oauth_transactions
       WHERE state_hash = ? AND provider = ? AND expires_at > ?
       RETURNING provider, code_verifier, nonce, return_to`,
    )
    .bind(stateHash, provider, Date.now())
    .first<{ provider: IdentityProvider; code_verifier: string | null; nonce: string; return_to: string }>();
  return row
    ? { provider: row.provider, codeVerifier: row.code_verifier, nonce: row.nonce, returnTo: row.return_to }
    : null;
}

export async function upsertProviderIdentity(identity: VerifiedProviderIdentity): Promise<IdentityUser> {
  const db = getRawDb();
  const existing = await db
    .prepare(
      `SELECT i.user_id, u.display_name
       FROM external_identities i
       JOIN users u ON u.id = i.user_id
       WHERE i.provider = ? AND i.subject = ?`,
    )
    .bind(identity.provider, identity.subject)
    .first<{ user_id: string; display_name: string }>();
  const userId = existing?.user_id ?? crypto.randomUUID();
  const displayName = identity.displayName ?? existing?.display_name ?? identity.email ?? `${identity.provider} user`;
  const now = Date.now();

  await db.batch([
    db
      .prepare(
        `INSERT INTO users (id, display_name, email, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           display_name = excluded.display_name,
           email = COALESCE(excluded.email, users.email),
           updated_at = excluded.updated_at`,
      )
      .bind(userId, displayName, identity.email, now, now),
    db
      .prepare(
        `INSERT INTO external_identities
         (provider, subject, user_id, email, email_verified, display_name, created_at, last_signed_in_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(provider, subject) DO UPDATE SET
           email = COALESCE(excluded.email, external_identities.email),
           email_verified = excluded.email_verified,
           display_name = COALESCE(excluded.display_name, external_identities.display_name),
           last_signed_in_at = excluded.last_signed_in_at`,
      )
      .bind(
        identity.provider,
        identity.subject,
        userId,
        identity.email,
        identity.emailVerified ? 1 : 0,
        identity.displayName,
        now,
        now,
      ),
  ]);

  return { ...identity, displayName, userId };
}

export async function createSession(userId: string): Promise<string> {
  const token = randomToken();
  const now = Date.now();
  await getRawDb()
    .prepare("INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(token), userId, now, now + SESSION_TTL_MS)
    .run();
  return token;
}

export async function getSessionUser(token: string): Promise<IdentityUser | null> {
  const row = await getRawDb()
    .prepare(
      `SELECT u.id, u.display_name, u.email, i.provider, i.email_verified
       FROM auth_sessions s
       JOIN users u ON u.id = s.user_id
       JOIN external_identities i ON i.user_id = u.id
       WHERE s.token_hash = ? AND s.expires_at > ?
       ORDER BY i.last_signed_in_at DESC
       LIMIT 1`,
    )
    .bind(await sha256(token), Date.now())
    .first<{ id: string; display_name: string; email: string | null; provider: IdentityProvider; email_verified: number }>();
  return row
    ? {
        userId: row.id,
        displayName: row.display_name,
        email: row.email,
        provider: row.provider,
        emailVerified: Boolean(row.email_verified),
      }
    : null;
}

export async function revokeSession(token: string): Promise<void> {
  await getRawDb().prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function sessionCookie(token: string, secure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}${secure ? "; Secure" : ""}`;
}

export function expiredSessionCookie(secure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
}

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return value.join("=") || null;
  }
  return null;
}
