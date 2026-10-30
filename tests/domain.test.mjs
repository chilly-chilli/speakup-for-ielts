import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {makePlan,planQuestions,parseTextBank,diagnosticReport} from "../app/lib/speaking.ts";
const bank=JSON.parse(readFileSync(new URL("../app/data/builtin-bank.json",import.meta.url)));
const config={mode:"strict",scope:"full",policy:"bank_only",language:"English"};

test("full plans retain Part 2/3 links and exclude source defects",()=>{
  for(let i=0;i<100;i++){
    const p=makePlan(bank.questions,config);
    assert.ok(p.part1.length>=3);assert.ok(p.part2);assert.ok(p.part3.length);
    assert.ok(p.part3.every(q=>q.group===p.part2.group));
    const all=planQuestions(p);assert.equal(new Set(all.map(q=>q.id)).size,all.length);
    assert.ok(all.every(q=>!q.warning&&bank.questions.some(b=>b.id===q.id)));
  }
});
test("a partial bank remains useful without silently filling missing parts",()=>{
  const p1=bank.questions.filter(q=>q.part===1);
  assert.ok(makePlan(p1,{...config,scope:"1"}).part1.length);
  assert.throws(()=>makePlan(p1,config),/Part 2/);
  const p3=bank.questions.filter(q=>q.part===3);
  const plan=makePlan(p3,{...config,scope:"3"});
  assert.equal(plan.part2,null);assert.ok(plan.part3.length);
  assert.equal(new Set(plan.part3.map(q=>q.topic)).size,1);
});
test("a user-selected topic cannot silently select another topic",()=>{
  assert.throws(()=>makePlan(bank.questions,{...config,scope:"2"},"nonexistent topic"),/Part 2/);
  const p=makePlan(bank.questions,{...config,scope:"1"},"Hometown");
  assert.ok(p.part1.every(q=>q.topic==="Hometown"));
});
test("the documented text format preserves card prompts and linked follow-ups",()=>{
  const x=parseTextBank("Part 1\nHometown\n1) Where is your hometown?\n\nPart 2\nDescribe a place you enjoy visiting\nYou should say:\nWhere it is\nWhat you do there\nAnd explain why you like it\nPart 3\n1) Why do people travel?");
  assert.equal(x.questions.length,3);assert.equal(x.warnings.length,0);
  assert.equal(x.questions[1].prompts.length,3);
  assert.equal(x.questions[1].group,x.questions[2].group);
  assert.ok(parseTextBank("No part specified").warnings.length);
});
test("a report cannot attach feedback to an invented answer",()=>{
  assert.throws(()=>diagnosticReport({details:[{event_key:"invented",feedback:"fake"}]},[{event_key:"real",answer:"My hometown is small."}]),/actual saved answer/);
});
test("unverified audio never produces a numeric grade, even if the caller supplies one",()=>{
  const r=diagnosticReport({overview:"Text diagnosis",overall_band:9,pronunciation:9,criteria:[{name:"Pronunciation",band:9,evidence:"Claimed pronunciation",event_keys:["real"]}],details:[{event_key:"real",feedback:"Add a concrete example."}]},[{event_key:"real",answer:"It is quiet."}]);
  assert.equal(r.overall_band,null);assert.ok(r.criteria.every(c=>c.band===null));
  assert.equal(r.details[0].event_key,"real");assert.match(r.evidence_limit,/unvalidated/);
});
