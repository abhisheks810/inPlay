import {
  consumeOAuthTransaction,
  createSession,
  sessionCookie,
  upsertProviderIdentity,
} from "@/modules/identity/repository";
import { canonicalOrigin, exchangeAndVerifyIdentity } from "@/modules/identity/providers";
import { isIdentityProvider } from "@/modules/identity/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ provider: string }> }) {
  return handleCallback(request, context);
}

export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  return handleCallback(request, context);
}

async function handleCallback(request: Request, context: { params: Promise<{ provider: string }> }) {
  const { provider } = await context.params;
  if (!isIdentityProvider(provider)) return Response.json({ error: "Unknown identity provider." }, { status: 404 });

  const params = await callbackParams(request);
  const state = params.get("state");
  const code = params.get("code");
  if (!state || !code || params.get("error")) return redirectWithError(request, "provider_rejected");

  try {
    const transaction = await consumeOAuthTransaction(state, provider);
    if (!transaction) return redirectWithError(request, "invalid_state");
    const identity = await exchangeAndVerifyIdentity({
      provider,
      code,
      request,
      nonce: transaction.nonce,
      codeVerifier: transaction.codeVerifier,
      appleUser: params.get("user"),
    });
    const user = await upsertProviderIdentity(identity);
    const session = await createSession(user.userId);
    const destination = new URL(transaction.returnTo, canonicalOrigin(request));
    const response = Response.redirect(destination, 303);
    response.headers.append("set-cookie", sessionCookie(session, destination.protocol === "https:"));
    return response;
  } catch (error) {
    console.error(`Unable to complete ${provider} sign-in`, error);
    return redirectWithError(request, "verification_failed");
  }
}

async function callbackParams(request: Request): Promise<URLSearchParams> {
  if (request.method === "POST") return new URLSearchParams(await request.text());
  return new URL(request.url).searchParams;
}

function redirectWithError(request: Request, code: string): Response {
  const destination = new URL("/", canonicalOrigin(request));
  destination.searchParams.set("auth_error", code);
  return Response.redirect(destination, 303);
}
