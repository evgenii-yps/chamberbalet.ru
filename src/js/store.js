/* localStorage и sessionStorage — всегда в try/catch: в приватном окне они бросают. */
export const store = {
  get(key, area = 'local') {
    try { return (area === 'local' ? localStorage : sessionStorage).getItem(key); } catch { return null; }
  },
  set(key, value, area = 'local') {
    try { (area === 'local' ? localStorage : sessionStorage).setItem(key, value); } catch { /* нет хранилища — живём без него */ }
  },
};
