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
const target=path.join(root,'.private','dist');await fs.rm(target,{recursive:true,force:true});await fs.mkdir(target,{recursive:true});await fs.cp(path.join(sourceDir,'dist'),target,{recursive:true});
const pages=['index.html','afisha.html','repertoire.html','nutcracker.html','swan-lake.html','people.html','venues.html'];
for(const name of pages){let html=await fs.readFile(path.join(target,name),'utf8');html=html.replace('</head>','<meta name="robots" content="noindex,nofollow"><script src="private-safety.js" defer></script></head>');if(name==='afisha.html')html=html.replace('</head>','<script src="private-date-filter.js" defer></script></head>');await fs.writeFile(path.join(target,name),html)}
await fs.copyFile(path.join(root,'src/private-safety.js'),path.join(target,'private-safety.js'));await fs.copyFile(path.join(root,'src/private-date-filter.js'),path.join(target,'private-date-filter.js'));
await fs.writeFile(path.join(target,'404.html'),'<!doctype html><html lang="ru"><meta charset="utf-8"><title>404</title><h1>Страница не найдена</h1><a href="/">На главную</a></html>');
await fs.writeFile(path.join(target,'robots.txt'),'User-agent: *\nDisallow: /\n');
console.log('PRIVATE PREVIEW ONLY: source commit and 57 file hashes verified; seven routes.');
