import { cookies } from "next/headers";
import { getChatGPTUser } from "./chatgpt-auth";
import { getSessionUser, SESSION_COOKIE } from "@/modules/identity/repository";
import type { IdentityUser } from "@/modules/identity/types";

export async function getCurrentUser(): Promise<IdentityUser | null> {
  const chatGPTUser = await getChatGPTUser();
  if (chatGPTUser) {
    return {
      userId: `chatgpt:${chatGPTUser.userId}`,
      displayName: chatGPTUser.displayName,
      email: chatGPTUser.email,
      provider: "chatgpt",
      emailVerified: true,
    };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getSessionUser(token).catch(() => null);
}
