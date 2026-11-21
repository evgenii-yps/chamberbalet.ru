#!/usr/bin/env python3
"""Reproduce the accepted owner-only G2 review, never a deployable release."""
import csv,hashlib,json,os,shutil,subprocess,zipfile
from pathlib import Path,PurePosixPath
root=Path(__file__).resolve().parent.parent
source=Path(os.environ['SITES_SOURCE']).resolve()
archive=Path(os.environ['G2_PRIVATE_ZIP']).resolve()
sha=lambda b:hashlib.sha256(b).hexdigest()
if subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip()!='329a00aec044a5bf10d96386f953efe1369f9bb1' or subprocess.check_output(['git','-C',str(source),'status','--porcelain'],text=True).strip():raise SystemExit('Source checkout mismatch')
rows=list(csv.DictReader((root/'data/source-inventory.csv').open(encoding='utf8')))
if len(rows)!=57:raise SystemExit('Invalid source inventory')
for r in rows:
 b=(source/r['source_path']).read_bytes()
 if len(b)!=int(r['bytes']) or sha(b)!=r['sha256']:raise SystemExit('Source hash mismatch: '+r['source_path'])
if sha(archive.read_bytes())!='083cd2bbef16f33135e2b9772752ae1654163f5357c1f17fb967d4d992bb0977':raise SystemExit('G2 archive hash mismatch')
target=root/'.private'/'stage04-preflight'
if target.is_symlink():raise SystemExit('Unsafe output directory')
shutil.rmtree(target,ignore_errors=True);target.mkdir(parents=True)
with zipfile.ZipFile(archive) as z:
 for item in z.infolist():
  p=PurePosixPath(item.filename)
  if p.is_absolute() or '..' in p.parts or item.is_dir():raise SystemExit('Unexpected archive entry')
  dest=target.joinpath(*p.parts);dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(z.read(item))
(target/'STAGE04_README_RU.txt').write_text('ЗАКРЫТЫЙ ТЕХНИЧЕСКИЙ ПРОСМОТР — НЕ ДЛЯ РАЗМЕЩЕНИЯ\n\nПолная принятая версия G2, включая изображения и данные. Для просмотра распакуйте архив, установите Node.js 20+ и запустите node server.mjs из распакованной папки, затем откройте http://127.0.0.1:4181/ на этом компьютере. Действия с билетами, контактами и PDF ограничены для приватного просмотра. REG.RU и фактический бэкап не проверены. G3 и G4 не приняты.\n',encoding='utf8')
files=[]
for p in sorted(target.rglob('*')):
 if p.is_file():
  b=p.read_bytes();files.append({'path':p.relative_to(target).as_posix(),'bytes':len(b),'sha256':sha(b)})
(target/'STAGE04_MANIFEST.json').write_text(json.dumps({'mode':'OWNER-ONLY NON-PRODUCTION REVIEW','g2Commit':'d533bf086eb1d5455fd9c383d22ffda22f148f30','sourceCommit':'329a00aec044a5bf10d96386f953efe1369f9bb1','g2ArchiveSha256':'083cd2bbef16f33135e2b9772752ae1654163f5357c1f17fb967d4d992bb0977','files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Owner-only Stage 04 preflight assembled; NOT FOR DEPLOYMENT')
