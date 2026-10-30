import { getChatGPTUser, chatGPTSignInPath, chatGPTSignOutPath } from "./chatgpt-auth";
import Workspace from "./workspace";
export const dynamic = "force-dynamic";
export default async function Home() {
  const user = await getChatGPTUser();
  return <Workspace signedIn={!!user} displayName={user?.displayName ?? ""} signIn={chatGPTSignInPath("/")} signOut={chatGPTSignOutPath("/")} />;
}
