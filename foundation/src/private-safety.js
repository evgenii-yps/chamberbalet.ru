// The private review must never trigger external transactions, contact or document downloads.
function disableOutbound(root=document) {
 for(const link of root.querySelectorAll('a[href]')) {
  const raw=link.getAttribute('href');
  let destination; try { destination = new URL(raw, location.href); } catch { destination = null; }
  if (!destination || destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol) || /\.pdf(?:[?#]|$)/i.test(raw)) {
   // Preserve the link's visible decoration before removing href; browser
   // default link styles otherwise disappear from the private preview.
   if (getComputedStyle(link).textDecorationLine.includes('underline')) link.style.textDecorationLine='underline';
   link.dataset.verificationStatus='source_recorded_unverified'; link.removeAttribute('href'); link.removeAttribute('download'); link.setAttribute('aria-disabled','true'); link.dataset.privateBlocked='true';
  }
 }
}
disableOutbound();
new MutationObserver(()=>disableOutbound()).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['href','download']});
// Catch a newly assigned destination even before the mutation observer runs.
document.addEventListener('click', event => {
 const link=event.target instanceof Element ? event.target.closest('a[href]') : null;
 if (!link) return;
 let url; try { url=new URL(link.getAttribute('href'),location.href); } catch {}
 if (!url || url.origin!==location.origin || !['http:','https:'].includes(url.protocol) || /\.pdf$/i.test(url.pathname)) {
  event.preventDefault(); event.stopImmediatePropagation(); disableOutbound(document);
 }
}, true);
// Keep missing decorative images from showing a broken-image glyph. Portraits
// need an explicit equivalent because the photo button remains interactive.
document.addEventListener('error', event => {
 const image=event.target;
 if (!(image instanceof HTMLImageElement)) return;
 if (image.classList.contains('tp-large-photo')) {
  image.style.display='none';
  const note=image.parentElement?.querySelector('.tp-photo-count');
  if (note) note.textContent='Фотография недоступна';
 } else if (image.parentElement?.classList.contains('tp-photo')) {
  image.hidden=true;
  if (!image.parentElement.querySelector('.tp-missing')) {
   const fallback=document.createElement('span');fallback.className='tp-missing';fallback.textContent='Фотография недоступна';image.before(fallback);
  }
 } else if (image.alt==='') image.hidden=true;
}, true);
