import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';import {makePlan,applyReviewed,planHash} from '../src/reconcile.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../.private');
const [mode,currentPath,baselinePath,incomingPath,revision,reviewPath,outputPath]=process.argv.slice(2);
if(!['plan','apply'].includes(mode)||!currentPath||!baselinePath||!incomingPath||!revision||!outputPath)throw Error('Usage: plan|apply current baseline incoming revision review-or-dash output');
const output=path.resolve(outputPath);if(!output.startsWith(root+path.sep))throw Error('Output must be in private directory');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));const [current,baseline,incoming]=await Promise.all([read(currentPath),read(baselinePath),read(incomingPath)]);const plan=makePlan(current,baseline,incoming,revision);
const result=mode==='plan'?{...plan,planHash:planHash(plan)}:applyReviewed(current,baseline,incoming,plan,await read(reviewPath));
await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});console.log(`PRIVATE ${mode} written; current files unchanged`);
