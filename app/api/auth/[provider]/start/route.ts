import { createOAuthTransaction } from "@/modules/identity/repository";
import { buildAuthorizationUrl, providerUsesPkce } from "@/modules/identity/providers";
import { isIdentityProvider, safeReturnPath } from "@/modules/identity/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  const { provider } = await context.params;
  if (!isIdentityProvider(provider)) return Response.json({ error: "Unknown identity provider." }, { status: 404 });

  try {
    const returnTo = safeReturnPath(new URL(request.url).searchParams.get("return_to"));
    const transaction = await createOAuthTransaction(provider, returnTo, await providerUsesPkce(provider));
    return Response.redirect(await buildAuthorizationUrl(provider, request, transaction), 302);
  } catch (error) {
    console.error(`Unable to start ${provider} sign-in`, error);
    return Response.json(
      { error: error instanceof Error ? error.message : `${provider} sign-in is unavailable.` },
      { status: 503 },
    );
  }
}
