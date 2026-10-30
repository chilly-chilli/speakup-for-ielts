"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { parseTextBank, type Config, type Plan, type Question } from "./lib/speaking";

type Bank = { id:string; name:string; version:string; status:string; builtin:boolean; counts:number[]; topics:string[]; flagged:number };
type RecordItem = { id:string; config:Config; bank:{name:string;version:string}; status:string; created_at:string };
type Report = { overview:string; strengths:string[]; priorities:string[]; overall_band:number|null; criteria:{name:string;band:number|null;evidence?:string}[]; evidence_limit:string; details:{event_key:string;feedback:string;improved_expression:string;practice:string}[] };
type Session = { id:string; config:Config; bank:{name:string;version:string}; status:string; plan:Plan; turns:{event_key:string;question_id:string;answer:string;hint?:string;retry_of?:string;feedback?:string}[]; report:Report|null };
type Review = { id?:string; name?:string; status?:string; questions:Question[]; warnings?:string[] };
type Setup = { banks:Bank[]; sessions:RecordItem[] };
const Arrow = () => <span aria-hidden="true">↗</span>;
const modeName = (s:string) => s === "strict" ? "Mock exam" : "Guided practice";
const scopeName = (s:string) => s === "full" ? "Full test" : `Part ${s}`;

export default function Workspace({signedIn,displayName,signIn,signOut}:{signedIn:boolean;displayName:string;signIn:string;signOut:string}) {
  const [tab,setTab] = useState("practice"), [data,setData] = useState<Setup|null>(null);
  const [error,setError] = useState(""), [notice,setNotice] = useState(""), [busy,setBusy] = useState(false);
  const [mode,setMode] = useState<Config["mode"]>("strict"), [scope,setScope] = useState<Config["scope"]>("full");
  const [policy,setPolicy] = useState<Config["policy"]>("bank_only"), [language,setLanguage] = useState("English");
  const [bankId,setBankId] = useState("builtin-2026-09-12-1009"), [topic,setTopic] = useState("");
  const [session,setSession] = useState<Session|null>(null), [review,setReview] = useState<Review|null>(null);
  const [importName,setImportName] = useState("My speaking bank"), [importVersion,setImportVersion] = useState("1"), [source,setSource] = useState("");
  const [seconds,setSeconds] = useState(60), [running,setRunning] = useState(false), [prompt,setPrompt] = useState("");
  const requestKey = useRef<string|null>(null);
  useEffect(() => { requestKey.current = null; }, [mode,scope,policy,language,bankId,topic]);
  useEffect(() => { if (signedIn) void refresh().catch(e=>setError(String(e))); }, [signedIn]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setSeconds(s => { if(s<=1){setRunning(false);return 0;}return s-1; }), 1000);
    return () => clearInterval(timer);
  }, [running]);
  async function refresh() {
    const r=await fetch("/api/practice",{cache:"no-store"}), x=await r.json() as Setup & {error?:string};
    if(!r.ok)throw new Error(x.error||"Could not load your workspace."); setData(x);
  }
  async function api<T = unknown>(name:string,args:unknown) {
    const r=await fetch("/api/practice",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,args})}), x=await r.json() as T & {error?:string};
    if(!r.ok)throw new Error(x.error||"This action could not be completed.");return x;
  }
  async function act(fn:()=>Promise<void>) {
    setBusy(true);setError("");setNotice("");
    try { await fn(); } catch(e) {setError(e instanceof Error?e.message:"Something went wrong.");} finally {setBusy(false);}
  }
  async function prepare() {
    await act(async()=>{
      requestKey.current ??= crypto.randomUUID();
      const s=await api<Session>("start_practice",{bank_id:bankId,request_key:requestKey.current,mode,scope,policy,language,...(topic?{topic}:{})});
      setSession(s);
      setPrompt(`Use the SpeakUp for IELTS Speaking Practice plugin. Resume my prepared session (${s.id}). Read its saved configuration and examiner rules. Explain this edition's timing and scoring limitations, then begin in ChatGPT Live. My feedback language is ${language}.`);
      await refresh();
    });
  }
  async function openSession(id:string) { await act(async()=>{setSession(await api<Session>("get_practice",{session_id:id}));setTab("records");}); }
  async function deleteItem(kind:"bank"|"session",id:string) {
    if(!window.confirm(kind==="bank"?"Delete this personal bank? Question snapshots in existing reports will remain.":"Delete this session, its answers and its report?"))return;
    await act(async()=>{
      await api("delete_practice_data",{kind,id});
      if(session?.id===id)setSession(null);if(review?.id===id)setReview(null);
      if(bankId===id)setBankId("builtin-2026-09-12-1009");
      await refresh();setNotice("Deleted from your workspace.");
    });
  }
  async function upload(file?:File) {
    if(!file)return;
    if(!/\.(md|txt)$/i.test(file.name)){setError("Upload Markdown or TXT in this test edition. For PDF or Word, ask ChatGPT to extract the questions and import them through this plugin.");return;}
    if(file.size>500_000){setError("This test edition accepts text files up to 500 KB.");return;}
    setSource(await file.text());setImportName(file.name.replace(/\.[^.]+$/,""));setReview(null);
  }
  const selected=data?.banks.find(b=>b.id===bankId);
  return <div className="shell">
    <header className="topbar">
      <Link className="brand" href="/" aria-label="SpeakUp for IELTS Speaking Practice home"><span className="brandmark" aria-hidden="true">ııı</span><span>SpeakUp<span className="branddot">.</span><small>IELTS SPEAKING PRACTICE</small></span></Link>
      <span className="edition"><i/> Private test edition</span>
      <a className="account" href={signedIn?signOut:signIn} target="_top" title={signedIn?"Sign out":"Sign in"}>{signedIn?`${displayName.split("@")[0]} ↗`:"Sign in with ChatGPT ↗"}</a>
    </header>
    <nav className="nav" aria-label="Workspace"><div>{[["practice","Practice"],["banks","Question banks"],["records","My records"]].map(([key,label])=><button key={key} className={tab===key?"active":""} onClick={()=>{setTab(key);setError("");setNotice("");}}>{label}</button>)}</div><span>YOUR SPACE TO SPEAK</span></nav>
    <main>
      {error&&<div className="message error" role="alert">{error}</div>}{notice&&<div className="message" role="status">{notice}</div>}
      {!signedIn&&<div className="signin"><p>Your question banks and records stay in your account.</p><a className="button dark" href={signIn} target="_top">Sign in with ChatGPT <Arrow/></a></div>}
      {tab==="practice"&&<>
        <section className="hero"><div><p className="eyebrow">PREPARE. SPEAK. REFLECT.</p><h1>SpeakUp with<br/>your <em>IELTS Tutor</em></h1><p className="lead">Choose a practice mode and topic, then speak with your tutor in ChatGPT Live and receive feedback.</p></div><div className="hero-art" aria-hidden="true"><div className="orbit o1"/><div className="orbit o2"/><div className="orbit o3"/><span className="art-num">01<span>02</span>03</span><p>THREE PARTS.<br/>ONE CONVERSATION.</p><span className="art-plus">+</span></div></section>
        <section className="setup"><div className="section-intro"><p className="eyebrow">MAKE IT YOUR SESSION</p><h2>Start with<br/>a good conversation.</h2><p>Choose how you want to practise.<br/>Your conversation takes place<br/>in ChatGPT Live.</p><div className="validation-note"><span className="tiny-dot"/> AI practice scoring<p>This edition uses a timer you control. Scores are estimates and have not been validated against official results.</p></div></div>
          <form className="setup-form" onSubmit={e=>{e.preventDefault();void prepare();}}>
            <fieldset><legend><span>01</span> Choose your mode</legend><div className="choice-grid">{(["strict","assisted"] as const).map(m=><button type="button" key={m} aria-pressed={mode===m} className={mode===m?"choice chosen":"choice"} onClick={()=>setMode(m)}><strong>{modeName(m)} <span>{mode===m?"●":"○"}</span></strong><small>{m==="strict"?"English throughout. Feedback after the test.":"Feedback after each answer. Try again."}</small></button>)}</div></fieldset>
            <fieldset><legend><span>02</span> Pick your focus</legend><div className="segments">{["full","1","2","3"].map(v=><button type="button" key={v} aria-pressed={scope===v} className={scope===v?"selected":""} onClick={()=>{setScope(v as Config["scope"]);setTopic("");}}>{scopeName(v)}</button>)}</div></fieldset>
            <fieldset><legend><span>03</span> Set the questions</legend>
              <label className="field">Question bank<select value={bankId} onChange={e=>{setBankId(e.target.value);setTopic("");}}>{!data&&<option value={bankId}>Sep–Dec 2026 · built-in</option>}{data?.banks.filter(b=>b.status==="active").map(b=><option key={b.id} value={b.id}>{b.name} · {b.version}</option>)}</select></label>
              {scope!=="full"&&<label className="field">Topic <span className="optional">optional</span><select value={topic} onChange={e=>setTopic(e.target.value)}><option value="">Choose for me</option>{selected?.topics.map(t=><option key={t} value={t}>{t}</option>)}</select></label>}
              <div className="two-fields"><label className="field">Follow-up questions<select value={policy} onChange={e=>setPolicy(e.target.value as Config["policy"])}><option value="bank_only">Question bank only</option><option value="generated_followups">Allow generated Part 3 follow-ups</option></select></label><label className="field">Feedback language<input value={language} onChange={e=>setLanguage(e.target.value)} required maxLength={80} placeholder="English"/></label></div>
            </fieldset>
            <button className="button dark prepare" disabled={!signedIn||!data||busy} type="submit">{busy?"Preparing…":"Prepare voice session"}<Arrow/></button><p className="fineprint">Your settings and question selection are saved before you begin.</p>
          </form>
        </section>
        {prompt&&<section className="next-step"><p className="eyebrow">READY WHEN YOU ARE</p><h2>Take it to ChatGPT Live.</h2><p>Copy this prompt into a chat with this plugin selected, then start Live voice. Keep your own timer ready.</p><textarea aria-label="Starting prompt" value={prompt} readOnly/><div className="actions"><button className="button dark" disabled={busy} onClick={()=>void act(async()=>{await navigator.clipboard.writeText(prompt);setNotice("Starting prompt copied.");})}>Copy starting prompt <Arrow/></button><a className="button light" href="https://chatgpt.com" target="_blank" rel="noreferrer">Open ChatGPT <Arrow/></a></div></section>}
        <section className="principles">{[["01 / SET UP","Choose your practice.","Select a mock exam or guided practice, a test part and a question bank."],["02 / SPEAK","Start in ChatGPT Live.","Prepare your session, copy the prompt, then open ChatGPT and start a Live voice conversation with SpeakUp."],["03 / REVIEW","Get your feedback.","Review your feedback after a mock exam, or receive it after each answer in guided practice. Find saved reports in My records."]].map(([n,t,d])=><article key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></article>)}</section>
      </>}
      {tab==="banks"&&<section className="page-section"><p className="eyebrow">YOUR MATERIAL, ORGANIZED</p><h1>Question <em>banks.</em></h1><p className="lead">Keep the topics you want to come back to.</p>
        <div className="bank-list">{data?.banks.map(b=><article className="bank-row" key={b.id}><div><span className="label">{b.builtin?"BUILT-IN":"PERSONAL"} · {b.status.toUpperCase()}</span><h3>{b.name}</h3><p>Version {b.version} · Part 1: {b.counts[0]} · Part 2: {b.counts[1]} · Part 3: {b.counts[2]}{b.flagged?` · ${b.flagged} flagged items excluded`:""}</p></div><div className="actions"><button className="text-button" disabled={busy} onClick={()=>void act(async()=>{setReview(await api<Review>("get_question_bank",{bank_id:b.id}));})}>Review ↗</button>{!b.builtin&&<button className="text-button danger" disabled={busy} onClick={()=>void deleteItem("bank",b.id)}>Delete</button>}</div></article>)}</div>
        <div className="import-panel"><h2>Bring your own topics.</h2><p>Paste a bank or upload Markdown / TXT, up to 500 KB. Include Part headings. Link each Part 3 group to its preceding Part 2 card. For PDF or Word, ask ChatGPT to extract the questions and import them through this plugin.</p><div className="two-fields"><label className="field">Bank name<input value={importName} maxLength={160} onChange={e=>setImportName(e.target.value)}/></label><label className="field">Version<input value={importVersion} maxLength={80} onChange={e=>setImportVersion(e.target.value)}/></label></div><textarea aria-label="Question bank text" placeholder={'Part 1\nHometown\n1) Where is your hometown?\n\nPart 2\nDescribe a place you enjoy visiting\nYou should say:\nWhere it is\nWhat you do there\nAnd explain why you like it\n\nPart 3\n1) Why do people enjoy visiting new places?'} value={source} onChange={e=>{setSource(e.target.value);setReview(null);}}/><div className="actions"><label className="button light upload">Choose text file<input type="file" accept=".md,.txt" onChange={e=>void upload(e.target.files?.[0])}/></label><button className="button dark" disabled={!signedIn||!source.trim()||busy} onClick={()=>setReview({...parseTextBank(source),name:importName})}>Preview import <Arrow/></button></div></div>
        {review&&<section className="review-panel"><div className="section-heading"><div><p className="eyebrow">CHECK BEFORE USE</p><h2>{review.name??"Import preview"}</h2></div><span>{review.questions.length} questions</span></div>{review.warnings?.map((w,i)=><p className="message" key={i}>{w}</p>)}{[1,2,3].map(p=><details key={p}><summary>Part {p} · {review.questions.filter(q=>q.part===p).length} questions</summary><ol className="question-list">{review.questions.filter(q=>q.part===p).map(q=><li key={q.id}><span>{q.topic}</span><p>{q.text}</p>{q.prompts.length>0&&<ul>{q.prompts.map((t,i)=><li key={i}>{t}</li>)}</ul>}{q.warning&&<p className="flag">Excluded: {q.warning}</p>}</li>)}</ol></details>)}
          {review.status==="draft"?<button className="button dark" disabled={busy} onClick={()=>void act(async()=>{await api("activate_question_bank",{bank_id:review.id,reviewed:true});setReview({...review,status:"active"});await refresh();setNotice("Bank activated. Flagged items remain excluded.");})}>I have reviewed this bank · Activate <Arrow/></button>:!review.id&&<button className="button dark" disabled={busy||!review.questions.length} onClick={()=>void act(async()=>{const r=await api<Review>("import_question_bank",{name:importName,version:importVersion,questions:review.questions});setReview({...r,name:importName});await refresh();setNotice("Draft saved. Review its questions, then activate it.");})}>Save as private draft <Arrow/></button>}
        </section>}
      </section>}
      {tab==="records"&&<section className="page-section"><p className="eyebrow">A RECORD OF SHOWING UP</p><h1>Your <em>practice.</em></h1><p className="lead">Every conversation has something to teach you.</p>{data&&!data.sessions.length&&<div className="empty"><h2>A fresh page.</h2><p>Your prepared sessions and saved reports will appear here.</p><button className="button dark" onClick={()=>setTab("practice")}>Prepare a session <Arrow/></button></div>}<div className="record-list">{data?.sessions.map(s=><article className="record-row" key={s.id}><div><span className="label">{new Date(s.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})} · {s.status.replaceAll("_"," ").toUpperCase()}</span><h3>{modeName(s.config.mode)} <span>/ {scopeName(s.config.scope)}</span></h3><p>{s.bank.name} · {s.bank.version}</p></div><div className="actions"><button className="text-button" disabled={busy} onClick={()=>void openSession(s.id)}>Open ↗</button><button className="text-button danger" disabled={busy} onClick={()=>void deleteItem("session",s.id)}>Delete</button></div></article>)}</div>
        {session&&<section className="report-panel"><p className="eyebrow">{modeName(session.config.mode).toUpperCase()} / {scopeName(session.config.scope).toUpperCase()}</p><h2>{session.report?"Your reflection.":"Your session is saved."}</h2>{session.report?<><p className="report-overview">{session.report.overview}</p>{session.report.overall_band!==null&&session.report.overall_band!==undefined&&<p>Estimated speaking band: <strong>{session.report.overall_band.toFixed(1)}</strong></p>}<div className="score-grid">{session.report.criteria.map(c=><div key={c.name}><span>{c.band===null?"—":c.band.toFixed(1)}</span><p>{c.name}</p><small>{c.band===null?"Not assessed":c.evidence||"Estimated band"}</small></div>)}</div><p className="evidence">{session.report.evidence_limit}</p><div className="two-fields"><div><h3>What worked</h3><ul>{session.report.strengths.map((s,i)=><li key={i}>{s}</li>)}</ul></div><div><h3>Your next steps</h3><ol>{session.report.priorities.map((s,i)=><li key={i}>{s}</li>)}</ol></div></div></>:<p>Start or resume it in ChatGPT Live with the plugin selected. Use a manual timer. AI scores are unvalidated estimates.</p>}<details><summary>Answers and detailed review · {session.turns.length} saved attempts</summary>{session.turns.map((t,i)=><article className="attempt" key={t.event_key}><span className="label">ATTEMPT {i+1}{t.retry_of?" · RETRY":""}</span><blockquote>{t.answer||"No answer recorded."}</blockquote>{t.hint&&<p>Hint: {t.hint}</p>}{t.feedback&&<p>{t.feedback}</p>}{session.report?.details.filter(d=>d.event_key===t.event_key).map(d=><div key={d.event_key}><p>{d.feedback}</p>{d.improved_expression&&<p className="improved">{d.improved_expression}</p>}{d.practice&&<p>Try this: {d.practice}</p>}</div>)}</article>)}</details></section>}
      </section>}
      <aside className="timer"><div><p className="eyebrow">YOUR COMPANION TIMER</p><p>Runs on this page. It does not control ChatGPT Voice.</p></div><output aria-label="Time remaining">{Math.floor(seconds/60).toString().padStart(2,"0")}:{(seconds%60).toString().padStart(2,"0")}</output><div className="timer-controls"><button onClick={()=>{setSeconds(60);setRunning(false);}}>1 min</button><button onClick={()=>{setSeconds(120);setRunning(false);}}>2 min</button><button disabled={seconds===0} onClick={()=>setRunning(!running)}>{running?"Pause":"Start"}</button></div>{seconds===0&&<span role="status">Time elapsed</span>}</aside>
    </main>
    <footer><span>SpeakUp. <small>AN INDEPENDENT IELTS PRACTICE TOOL</small></span><p>Practice feedback is not an official IELTS result. Your personal banks and records are private.</p></footer>
  </div>;
}
