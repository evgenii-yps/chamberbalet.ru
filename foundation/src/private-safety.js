// The private review must never trigger external transactions, contact or document downloads.
function disableOutbound(root=document) {
 for(const link of root.querySelectorAll('a[href]')) {
  const raw=link.getAttribute('href');
  let destination; try { destination = new URL(raw, location.href); } catch { destination = null; }
  if (!destination || destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol) || /\.pdf(?:[?#]|$)/i.test(raw)) {
   link.dataset.verificationStatus='source_recorded_unverified'; link.removeAttribute('href'); link.removeAttribute('download'); link.setAttribute('aria-disabled','true'); link.dataset.privateBlocked='true';
  }
 }
}
disableOutbound();
new MutationObserver(()=>disableOutbound()).observe(document.body,{childList:true,subtree:true});
