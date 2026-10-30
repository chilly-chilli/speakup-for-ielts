import { getChatGPTUser } from "../../chatgpt-auth";
import { callTool } from "../../lib/service";
export const dynamic="force-dynamic";
export async function GET() {
  const user=await getChatGPTUser();
  if (!user) return Response.json({error:"Sign in with ChatGPT to view your workspace."},{status:401});
  try { return Response.json(await callTool("get_speaking_setup",{},user.userId),{headers:{"Cache-Control":"no-store"}}); }
  catch(error) { return Response.json({error:error instanceof Error?error.message:"Could not load your workspace"},{status:503}); }
}
export async function POST(request:Request) {
  const user=await getChatGPTUser();
  if (!user) return Response.json({error:"Sign in with ChatGPT to access private records."},{status:401});
  if (request.headers.get("origin")!==new URL(request.url).origin) return Response.json({error:"Cross-origin writes are not allowed."},{status:403});
  if (!request.headers.get("content-type")?.startsWith("application/json")) return Response.json({error:"JSON is required."},{status:415});
  const text=await request.text();
  if(text.length>1_000_000)return Response.json({error:"This test edition accepts up to 1 MB of text per request."},{status:413});
  try {
    const {name,args}=JSON.parse(text);
    return Response.json(await callTool(name,args,user.userId),{headers:{"Cache-Control":"no-store"}});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"The action failed."},{status:400}); }
}
