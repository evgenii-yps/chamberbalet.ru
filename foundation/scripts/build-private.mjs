import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=process.env.SITES_SOURCE;
if(!source) throw Error('Set SITES_SOURCE to the private authorized Sites v16 git checkout.');
const sourceDir=path.resolve(source);
const head=execFileSync('git',['-C',sourceDir,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(head!=='329a00aec044a5bf10d96386f953efe1369f9bb1') throw Error('Unexpected Sites source commit.');
if(execFileSync('git',['-C',sourceDir,'status','--porcelain'],{encoding:'utf8'}).trim()) throw Error('Sites source checkout is not clean.');
const lines=(await fs.readFile(path.join(root,'data/source-inventory.csv'),'utf8')).trim().split('\n').slice(1);if(lines.length!==57)throw Error('Expected 57 source inventory entries.');
for(const line of lines){const [name,size,hash]=line.split(',');const buf=await fs.readFile(path.join(sourceDir,name));if(buf.length!==Number(size)||crypto.createHash('sha256').update(buf).digest('hex')!==hash)throw Error(`Source mismatch: ${name}`)}
// The private data files are the editable input. Initialize only when neither
// exists; never overwrite the editor's work during a rebuild.
const dataDir=process.env.PRIVATE_DATA_DIR ? path.resolve(process.env.PRIVATE_DATA_DIR) : path.join(root,'.private','data');
const dataFiles=['events.json','people.json'].map(x=>path.join(dataDir,x));
const present=await Promise.all(dataFiles.map(x=>fs.access(x).then(()=>true,()=>false)));
if(!present.some(Boolean)&&!process.env.PRIVATE_DATA_DIR)execFileSync(process.execPath,[path.join(root,'scripts/import-private.mjs')],{env:process.env,stdio:'inherit'});
else if(!present.some(Boolean))throw Error('Private data directory is empty');
else if(!present.every(Boolean))throw Error('Incomplete private data; restore both files from backup');
const [events,people]=await Promise.all(dataFiles.map(async x=>JSON.parse(await fs.readFile(x,'utf8'))));
if(!Array.isArray(events)||!events.length||new Set(events.map(x=>x.id)).size!==events.length||events.some(x=>!/^event-[a-zA-Z0-9-]+$/.test(x.id)||!x.value||typeof x.value.startsAt!=='string'||Number.isNaN(Date.parse(x.value.startsAt))))throw Error('Invalid private events');
if(!Array.isArray(people)||!people.length||new Set(people.map(x=>x.id)).size!==people.length||people.some(x=>!x.value||x.id!==`person-${x.value.id}`||!Array.isArray(x.value.photos)))throw Error('Invalid private people');
const target=path.join(root,'.private','dist');await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});await fs.cp(path.join(sourceDir,'dist'),target,{recursive:true});
// Replace only the exact, checksum-verified data declarations. Rendering code
// stays the original v16 implementation; no private content enters Git.
const scheduleFile=path.join(target,'show-schedule.js');
let schedule=await fs.readFile(scheduleFile,'utf8');
const start='  const performances = [';const end='\n  const now = Date.now();';
if(schedule.split(start).length!==2||schedule.split(end).length!==2)throw Error('Schedule adapter contract changed');
const left=schedule.indexOf(start),right=schedule.indexOf(end,left);
if(right<0)throw Error('Schedule adapter bounds invalid');
schedule=schedule.slice(0,left)+'  const performances = '+JSON.stringify(events.map(x=>x.value))+';\n'+schedule.slice(right);
await fs.writeFile(scheduleFile,schedule);
const peopleFile=path.join(target,'people-module','theatre-people.js');
let peopleSource=await fs.readFile(peopleFile,'utf8');
const peoplePattern=/const data=\[.*?\];\s*(?=const url=)/s;
if((peopleSource.match(new RegExp(peoplePattern,'gs'))||[]).length!==1)throw Error('People adapter contract changed');
peopleSource=peopleSource.replace(peoplePattern,()=>`const data=${JSON.stringify(people.map(x=>x.value))};\n  `);
await fs.writeFile(peopleFile,peopleSource);
const pages=['index.html','afisha.html','repertoire.html','nutcracker.html','swan-lake.html','people.html','venues.html'];
for(const name of pages){let html=await fs.readFile(path.join(target,name),'utf8');html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><script src="private-safety.js" defer></script></head>');if(name==='afisha.html')html=html.replace('</head>','<script src="private-date-filter.js" defer></script></head>');await fs.writeFile(path.join(target,name),html)}
await fs.copyFile(path.join(root,'src/private-safety.js'),path.join(target,'private-safety.js'));await fs.copyFile(path.join(root,'src/private-date-filter.js'),path.join(target,'private-date-filter.js'));
await fs.writeFile(path.join(target,'404.html'),'<!doctype html><html lang="ru"><meta charset="utf-8"><title>404</title><h1>Страница не найдена</h1><a href="/">На главную</a></html>');
await fs.writeFile(path.join(target,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('PRIVATE PREVIEW ONLY: source commit and 57 file hashes verified; seven routes.');
