import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Import only from the exact verified source tree. All output remains private.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.env.SITES_SOURCE && path.resolve(process.env.SITES_SOURCE);
if(!source) throw Error('SITES_SOURCE is required');
if(execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim()!=='329a00aec044a5bf10d96386f953efe1369f9bb1' || execFileSync('git',['-C',source,'status','--porcelain'],{encoding:'utf8'}).trim()) throw Error('Unverified or dirty source');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const inventory=(await fs.readFile(path.join(root,'data/source-inventory.csv'),'utf8')).trim().split('\n').slice(1);
if(inventory.length!==57) throw Error('Invalid inventory count');
for(const line of inventory){const [name,size,hash]=line.split(',');const bytes=await fs.readFile(path.join(source,name));if(bytes.length!==+size||sha(bytes)!==hash)throw Error(`Source mismatch: ${name}`)}
const schedulePath='dist/show-schedule.js';
const schedule=await fs.readFile(path.join(source,schedulePath),'utf8');
const marker='  const now = Date.now();';
if(schedule.split(marker).length!==2)throw Error('Schedule extraction marker changed');
const context={};
vm.runInNewContext(schedule.replace(marker,'  globalThis.result = performances; return;\n'+marker),context,{timeout:1000});
const values=JSON.parse(JSON.stringify(context.result));
if(values.length!==266||values.filter(x=>x.isTour).length!==168)throw Error('Schedule counts changed');
const duplicates=new Map();
const events=values.map((value,order)=>{const raw=JSON.stringify(value);const hash=sha(raw);const occurrence=(duplicates.get(hash)||0)+1;duplicates.set(hash,occurrence);return {id:`event-${hash}-${occurrence}`,order,occurrence,source:{path:schedulePath,sha256:sha(schedule),valueSha256:hash},value,ticket:{source_recorded:{value:!!value.ticketsHref,evidence:'source',at:null},syntax_checked:{value:!!value.ticketsHref && URL.canParse(value.ticketsHref) && ['http:','https:'].includes(new URL(value.ticketsHref).protocol),evidence:'URL parser only',at:null},live_checked:{value:false,status:'UNVERIFIED_NETWORK',evidence:null,at:null},owner_approved:{value:false,evidence:null,at:null}}}});
const peoplePath='dist/people-module/theatre-people.js';
const peopleText=await fs.readFile(path.join(source,peoplePath),'utf8');
const match=peopleText.match(/const data=(\[.*?\]);\s*const url=/s);if(!match)throw Error('People extraction failed');
const people=JSON.parse(match[1]).map((value,order)=>({id:`person-${value.id}`,order,source:{path:peoplePath,sha256:sha(peopleText),valueSha256:sha(JSON.stringify(value))},value}));
if(people.length!==15||people.filter(x=>x.value.leader).length!==2||people.filter(x=>x.value.photos.length).length!==14||new Set(people.map(x=>x.id)).size!==15)throw Error('People reconciliation failed');
const target=path.join(root,'.private','data');await fs.mkdir(target,{recursive:true});
for(const [name,data] of [['events.json',events],['people.json',people]])await fs.writeFile(path.join(target,name),JSON.stringify(data,null,2)+'\n');
console.log(`PRIVATE import: ${events.length} events, ${people.length} people; output ignored by Git`);
