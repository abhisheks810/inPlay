import {
  expiredSessionCookie,
  readSessionToken,
  revokeSession,
} from "@/modules/identity/repository";
import { canonicalOrigin } from "@/modules/identity/providers";
import { safeReturnPath } from "@/modules/identity/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = readSessionToken(request.headers.get("cookie"));
  if (token) await revokeSession(token).catch(() => undefined);
  const origin = canonicalOrigin(request);
  const destination = new URL(safeReturnPath(new URL(request.url).searchParams.get("return_to")), origin);
  const response = Response.redirect(destination, 303);
  response.headers.append("set-cookie", expiredSessionCookie(destination.protocol === "https:"));
  return response;
}
