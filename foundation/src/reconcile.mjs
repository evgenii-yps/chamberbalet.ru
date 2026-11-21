import crypto from 'node:crypto';
const hash=x=>crypto.createHash('sha256').update(JSON.stringify(x)).digest('hex');
const clone=x=>structuredClone(x);
const validateValues=(values,label)=>{if(!Array.isArray(values)||values.some(x=>!x||typeof x!=='object'||Array.isArray(x)))throw Error(`Invalid ${label}`)};
export function makePlan(records,baseline,incoming,revision){
  validateValues(baseline,'baseline');validateValues(incoming,'incoming');
  if(!Array.isArray(records)||records.length!==baseline.length||new Set(records.map(r=>r.id)).size!==records.length||records.some(r=>!r.id||!r.source||!r.ticket))throw Error('Invalid or incomplete records');
  if(!revision||typeof revision!=='string')throw Error('Revision required');
  const old=records.map((r,i)=>{if(hash(baseline[i])!==r.source.valueSha256)throw Error('Baseline hash mismatch');return {id:r.id,sourceHash:hash(baseline[i]),edited:hash(r.value)!==hash(baseline[i])}});
  const next=incoming.map((v,i)=>({index:i,sourceHash:hash(v)}));
  const oldCounts=new Map(),newCounts=new Map();for(const x of old)oldCounts.set(x.sourceHash,(oldCounts.get(x.sourceHash)||0)+1);for(const x of next)newCounts.set(x.sourceHash,(newCounts.get(x.sourceHash)||0)+1);
  const rows=next.map(n=>{const matches=old.filter(o=>o.sourceHash===n.sourceHash);return {...n,status:matches.length===1&&oldCounts.get(n.sourceHash)===1&&newCounts.get(n.sourceHash)===1?(matches[0].edited?'EDIT_CONFLICT':'UNCHANGED'):(matches.length||newCounts.get(n.sourceHash)>1?'DUPLICATE_AMBIGUOUS':'NEW_OR_CHANGED_REVIEW_REQUIRED'),candidateIds:matches.map(x=>x.id)}});
  const exact=new Set(rows.filter(x=>x.status==='UNCHANGED'||x.status==='EDIT_CONFLICT').flatMap(x=>x.candidateIds));
  return {version:1,revision,recordHash:hash(records),baselineHash:hash(baseline),incomingHash:hash(incoming),rows,missing:old.filter(x=>!exact.has(x.id)).map(x=>({id:x.id,status:oldCounts.get(x.sourceHash)>1?'DUPLICATE_AMBIGUOUS':'CANCELLED_OR_MISSING_REVIEW_REQUIRED'}))};
}
export function applyReviewed(records,baseline,incoming,plan,review){
  const fresh=makePlan(records,baseline,incoming,plan.revision);if(hash(fresh)!==hash(plan))throw Error('Stale plan or incompatible inputs');
  if(!review||review.planHash!==hash(plan)||typeof review.reviewer!=='string'||!review.reviewer.trim()||!review.reviewedAt||Number.isNaN(Date.parse(review.reviewedAt))||!Array.isArray(review.mappings)||!Array.isArray(review.missing))throw Error('Complete reviewed decisions required');
  if(review.mappings.length!==incoming.length)throw Error('Every incoming record requires a decision');
  const byId=new Map(records.map(x=>[x.id,x])), baselineById=new Map(records.map((x,i)=>[x.id,baseline[i]])), used=new Set(), indices=new Set(),out=[],nextBaseline=[];
  for(const d of review.mappings){
    if(!Number.isInteger(d.index)||d.index<0||d.index>=incoming.length||indices.has(d.index))throw Error('Invalid source index');indices.add(d.index);
    if(plan.rows[d.index].status!=='UNCHANGED'&&(typeof d.evidence!=='string'||!d.evidence.trim()))throw Error('Reviewed evidence required for changed or ambiguous mapping');
    if(d.action==='new'){if(typeof d.id!=='string'||!/^event-[A-Za-z0-9-]+$/.test(d.id)||byId.has(d.id)||used.has(d.id))throw Error('Invalid new identity');used.add(d.id);out.push({id:d.id,order:d.index,source:{path:'reviewed-source',sha256:plan.revision,valueSha256:hash(incoming[d.index])},value:clone(incoming[d.index]),ticket:{source_recorded:{value:!!incoming[d.index].ticketsHref,evidence:'reviewed source',at:review.reviewedAt},syntax_checked:{value:false,evidence:null,at:null},live_checked:{value:false,status:'UNVERIFIED_NETWORK',evidence:null,at:null},owner_approved:{value:false,evidence:null,at:null}},history:[]});nextBaseline.push(clone(incoming[d.index]));continue}
    const original=byId.get(d.id);if(!original||used.has(d.id)||!['keep_editorial','use_incoming'].includes(d.action))throw Error('Invalid identity decision');used.add(d.id);
    if(original.reconciliation?.status==='cancelled'&&(!d.reactivate||!d.evidence))throw Error('Explicit evidenced reactivation required');
    const record=clone(original),oldUrl=record.value.ticketsHref,newUrl=incoming[d.index].ticketsHref;
    record.history=[...(record.history||[]),{revision:plan.revision,reviewer:review.reviewer,reviewedAt:review.reviewedAt,action:d.action,previousSource:clone(record.source),previousValue:clone(record.value),previousTicket:clone(record.ticket),previousReconciliation:clone(record.reconciliation)}];
    record.order=d.index;record.source={...record.source,sha256:plan.revision,valueSha256:hash(incoming[d.index])};
    if(record.reconciliation?.status==='cancelled')record.reconciliation={status:'active',evidence:d.evidence,reviewer:review.reviewer,reviewedAt:review.reviewedAt,revision:plan.revision};
    if(d.action==='use_incoming')record.value=clone(incoming[d.index]);
    if(oldUrl!==newUrl||baselineById.get(d.id).ticketsHref!==newUrl)record.ticket={source_recorded:{value:d.action==='use_incoming'&&!!newUrl,evidence:'reviewed source; editorial URL may differ',at:review.reviewedAt},syntax_checked:{value:false,evidence:null,at:null},live_checked:{value:false,status:'UNVERIFIED_NETWORK',evidence:null,at:null},owner_approved:{value:false,evidence:null,at:null}};
    out.push(record);nextBaseline.push(clone(incoming[d.index]));
  }
  const missing=records.filter(x=>!used.has(x.id));if(review.missing.length!==missing.length)throw Error('Missing record decisions required');
  for(const r of missing){const d=review.missing.find(x=>x.id===r.id);if(!d||!['retain','cancelled'].includes(d.action)||!d.evidence)throw Error('Missing record needs explicit evidence');const saved=clone(r);saved.reconciliation={status:d.action,evidence:d.evidence,reviewer:review.reviewer,reviewedAt:review.reviewedAt,revision:plan.revision};out.push(saved);nextBaseline.push(clone(baselineById.get(r.id)))}
  return {records:out,baseline:nextBaseline,audit:{planHash:hash(plan),review:clone(review)}};
}
export const planHash=hash;
