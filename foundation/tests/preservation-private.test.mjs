import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {spawnSync} from 'node:child_process';
test('import initializes once and preserves edited records',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'chamber-preserve-'));
  const run=()=>spawnSync(process.execPath,['scripts/import-private.mjs'],{env:{...process.env,PRIVATE_DATA_DIR:dir},encoding:'utf8'});
  try{let r=run();assert.equal(r.status,0,r.stderr);const filename=path.join(dir,'events.json');const events=JSON.parse(await fs.readFile(filename));const id=events[0].id;events[0].value.title='EDITORIAL TEST';events.reverse();await fs.writeFile(filename,JSON.stringify(events));r=run();assert.equal(r.status,0,r.stderr);const result=JSON.parse(await fs.readFile(filename));assert.equal(result.find(x=>x.id===id).value.title,'EDITORIAL TEST');await fs.rm(path.join(dir,'people.json'));r=run();assert.notEqual(r.status,0)}finally{await fs.rm(dir,{recursive:true,force:true})}
});
