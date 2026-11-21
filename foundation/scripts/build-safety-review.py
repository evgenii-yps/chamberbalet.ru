#!/usr/bin/env python3
"""Build an isolated, deliberately restricted review, never a release."""
import csv, hashlib, json, os, re, shutil, subprocess
from pathlib import Path
from lxml import html, etree

root = Path(__file__).resolve().parent.parent
source = Path(os.environ['SITES_SOURCE']).resolve()
if subprocess.check_output(['git','-C',str(source),'rev-parse','HEAD'],text=True).strip() != '329a00aec044a5bf10d96386f953efe1369f9bb1' or subprocess.check_output(['git','-C',str(source),'status','--porcelain'],text=True).strip():
    raise SystemExit('Unverified source')
rows = list(csv.DictReader((root/'data/source-inventory.csv').open(encoding='utf8')))
if len(rows)!=57: raise SystemExit('Invalid source inventory')
for row in rows:
    data=(source/row['source_path']).read_bytes()
    if len(data)!=int(row['bytes']) or hashlib.sha256(data).hexdigest()!=row['sha256']: raise SystemExit('Source mismatch: '+row['source_path'])
out=root/'.private'/'safety-review'
if out.is_symlink(): raise SystemExit('Unsafe output')
shutil.rmtree(out,ignore_errors=True);out.mkdir(parents=True)
pages=['index.html','afisha.html','repertoire.html','nutcracker.html','swan-lake.html','people.html','venues.html']
css=(source/'dist/styles.css').read_text(encoding='utf8')
css=re.sub(r'@font-face\s*\{[^{}]*\}', '', css, flags=re.I|re.S)
css=re.sub(r'url\s*\([^)]*\)', 'none', css, flags=re.I)
css += '\n:root{--review:1}body{font-family:Arial,sans-serif!important}h1,h2,h3{font-family:Georgia,serif!important}.review-banner{background:#231b19;color:white;padding:12px;text-align:center;font:14px Arial,sans-serif}.review-placeholder{min-height:100px;background:#49413f;border-radius:4px}.brand{font:16px Georgia,serif}.review-empty{padding:1rem 0}.hero__art{background:#49413f}\n'
if re.search(r'url\s*\(|@font-face',css,re.I):raise SystemExit('Unexpected CSS resource')
(out/'styles.css').write_text(css,encoding='utf8')
for page in pages:
    doc=html.fromstring((source/'dist'/page).read_bytes())
    for el in doc.xpath('//script|//link|//iframe|//object|//embed|//form|//video|//audio|//source|//picture'):
        el.drop_tree()
    for el in doc.xpath('//*[@data-schedule-tour-note or @data-intro-skip or @data-intro-replay or @data-intro-mark]'):
        el.drop_tree()
    for el in doc.xpath('//*[@id="contact"]'):
        for child in list(el): child.drop_tree()
        el.text='Контактные действия временно недоступны.'
    if page=='venues.html':
        for el in doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," venues-options ")]//p'):
            if 'билет' in el.text_content().lower() or 'выруч' in el.text_content().lower(): el.drop_tree()
    if page=='index.html':
        for el in doc.xpath('//*[contains(concat(" ",normalize-space(@class)," ")," hero__copy ")]'):
            etree.SubElement(el,'p',{'class':'review-video-notice'}).text='Видеовступление временно недоступно.'
    for el in doc.xpath('//*[@id="pdf-note"]'): el.drop_tree()
    # Unsupported attribution in source performance credits remains private.
    for el in doc.xpath('//p[contains(., "Гапиенко")]|//dd[contains(., "Гапиенко")]|//li[contains(., "Гапиенко")]'):
        el.drop_tree()
    for el in doc.xpath('//*[@data-schedule]'):
        el.clear();el.set('class','review-empty');el.set('role','status');el.text='Подтверждённые показы пока не опубликованы.'
    for el in doc.xpath('//*[@data-schedule-filter]'):
        el.attrib.pop('hidden',None)
        for child in list(el):child.drop_tree()
        el.text=None
        for label,kind in [('Город','select'),('Дата показа','input')]:
            node=etree.SubElement(el,'label');node.text=label+' ';control=etree.SubElement(node,kind);control.set('aria-label',label)
            if kind=='select': etree.SubElement(control,'option',value='').text='Все города'
            else:control.set('type','date')
    for el in doc.xpath('//*[@id="theatre-people-home" or @id="theatre-people-full"]'):
        el.clear();el.set('class','review-empty');etree.SubElement(el,'h2').text='Люди театра';etree.SubElement(el,'p').text='Сведения об артистах готовятся к публикации.'
    for img in doc.xpath('//img'):
        parent=img.getparent()
        if parent is not None and 'brand' in parent.get('class','').split():
            img.drop_tree();parent.text='Театр не камерного балета'
        else:
            placeholder=etree.Element('div',{'class':'review-placeholder','aria-hidden':'true'});img.getparent().replace(img,placeholder)
    for el in doc.xpath('//*[@href]'):
        href=el.get('href','')
        if not (href.startswith('#') or href=='./' or href in pages):
            el.attrib.pop('href',None);el.attrib.pop('download',None);el.set('aria-disabled','true');el.text='Материал временно недоступен'
            for child in list(el):child.drop_tree()
    for el in doc.iter():
        for key in list(el.attrib):
            if key.lower().startswith('on') or key.lower() in ('src','srcset','poster','action','formaction','style'):el.attrib.pop(key,None)
    head=doc.find('head');etree.SubElement(head,'link',rel='stylesheet',href='styles.css');etree.SubElement(head,'script',src='review.js',defer='defer')
    body=doc.find('body');banner=etree.Element('div',{'class':'review-banner','role':'note'});banner.text='PRIVATE PUBLICATION-SAFETY REVIEW — NOT APPROVED — NOT FOR DEPLOYMENT';body.insert(0,banner)
    (out/page).write_bytes(b'<!doctype html>\n'+html.tostring(doc,encoding='utf-8',method='html'))
(out/'review.js').write_text("""(()=>{const b=document.querySelector('.nav-toggle'),n=document.querySelector('.site-nav');if(b&&n){b.hidden=false;const set=x=>{b.setAttribute('aria-expanded',String(x));document.querySelector('.header')?.classList.toggle('is-menu-open',x);n.inert=matchMedia('(max-width:760px)').matches&&!x};set(false);b.addEventListener('click',()=>set(b.getAttribute('aria-expanded')!=='true'));document.addEventListener('keydown',e=>{if(e.key==='Escape'){set(false);b.focus()}});addEventListener('resize',()=>set(false))}})();\n""",encoding='utf8')
(out/'404.html').write_text('<!doctype html><html lang="ru"><meta charset="utf-8"><title>404</title><h1>Страница не найдена</h1><a href="/">На главную</a></html>',encoding='utf8')
(out/'robots.txt').write_text('User-agent: *\nDisallow: /\n',encoding='utf8')
files=[]
for f in sorted(out.iterdir()):
    b=f.read_bytes();files.append({'path':f.name,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
(out/'manifest.json').write_text(json.dumps({'mode':'PRIVATE PUBLICATION-SAFETY REVIEW — NOT FOR DEPLOYMENT','sourceCommit':'329a00aec044a5bf10d96386f953efe1369f9bb1','files':files},ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('Restricted private review: seven routes; all source media, fonts, profiles and events excluded.')
