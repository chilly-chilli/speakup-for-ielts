import { callTool, toolDefinitions } from "../lib/service";

export async function POST(request: Request) {
  const text=await request.text();
  if (text.length>1_000_000) return Response.json({error:"Request too large"},{status:413});
  let body;
  try { body=JSON.parse(text); } catch { return Response.json({jsonrpc:"2.0",id:null,error:{code:-32700,message:"Invalid JSON"}}); }
  const id=typeof body?.id==="string" || typeof body?.id==="number" ? body.id:null;
  const ok=(result:unknown)=>Response.json({jsonrpc:"2.0",id,result});
  if (!body || body.jsonrpc!=="2.0" || typeof body.method!=="string") return Response.json({jsonrpc:"2.0",id,error:{code:-32600,message:"Invalid request"}});
  if (body.method==="server/discover") return ok({supportedVersions:["2026-07-28"],capabilities:{tools:{}}});
  if (body.method==="initialize") return ok({protocolVersion:"2026-07-28",capabilities:{tools:{}},serverInfo:{name:"ielts-speaking-simulator",version:"0.1.0"}});
  if (body.method==="notifications/initialized") return new Response(null,{status:204});
  if (body.method==="tools/list") return ok({tools:toolDefinitions()});
  if (body.method==="tools/call") {
    try {
      const uid=request.headers.get("oai-authenticated-user-id");
      if (!uid) throw new Error("Authenticated ChatGPT identity is required.");
      const result=await callTool(body.params?.name,body.params?.arguments,uid);
      return ok({content:[{type:"text",text:JSON.stringify(result)}]});
    } catch(error) { return ok({isError:true,content:[{type:"text",text:error instanceof Error?error.message:"Tool failed"}]}); }
  }
  return Response.json({jsonrpc:"2.0",id,error:{code:-32601,message:"Method not found"}});
}
export async function GET() { return Response.json({name:"SpeakUp for IELTS Speaking Practice",protocol:"2026-07-28"}); }
