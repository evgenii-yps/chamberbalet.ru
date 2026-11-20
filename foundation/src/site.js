const button = document.querySelector('[data-menu]');
const nav = document.querySelector('#navigation');
const mobile = matchMedia('(max-width: 760px)');
function setMenu(open) { nav.hidden = mobile.matches && !open; button.setAttribute('aria-expanded', String(mobile.matches && open)); }
button.addEventListener('click', () => setMenu(button.getAttribute('aria-expanded') !== 'true'));
button.addEventListener('keydown', event => { if (event.key === 'Escape') { setMenu(false); button.focus(); } });
nav.addEventListener('keydown', event => { if (event.key === 'Escape' && mobile.matches) { setMenu(false); button.focus(); } });
mobile.addEventListener('change', () => setMenu(false));
setMenu(false);
