import { chatGPTSignInPath, getChatGPTUser } from "./chatgpt-auth";
import VideoApp from "./video-app";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();
  return <VideoApp user={user ? { name: user.displayName, email: user.email } : null} signInPath={chatGPTSignInPath("/")} />;
}
