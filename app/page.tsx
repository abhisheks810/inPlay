import { getCurrentUser } from "./auth";
import { chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import VideoApp from "./video-app";
import { providerAvailability } from "@/modules/identity/providers";

export const dynamic = "force-dynamic";

export default async function Home({ searchParams }: { searchParams: Promise<{ auth_error?: string }> }) {
  const user = await getCurrentUser();
  const { auth_error: authError } = await searchParams;
  return (
    <VideoApp
      user={user ? { name: user.displayName, email: user.email, provider: user.provider } : null}
      chatGPTSignInPath={chatGPTSignInPath("/")}
      signOutPath={user?.provider === "chatgpt" ? chatGPTSignOutPath("/") : "/api/auth/signout?return_to=%2F"}
      providers={providerAvailability()}
      initialAuthError={authError ?? null}
    />
  );
}
