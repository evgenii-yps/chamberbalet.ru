export const routes = Object.freeze([
  {path:'index.html', key:'home', label:'Главная'},
  {path:'afisha.html', key:'schedule', label:'Афиша'},
  {path:'repertoire.html', key:'repertoire', label:'Постановки'},
  {path:'nutcracker.html', key:'production-a', label:'Спектакль A'},
  {path:'swan-lake.html', key:'production-b', label:'Спектакль B'},
  {path:'people.html', key:'people', label:'Люди'},
  {path:'venues.html', key:'venues', label:'Для площадок'}
]);
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const okDate = value => typeof value === 'string' && /(?:Z|[+-]\d{2}:\d{2})$/.test(value) && Number.isFinite(Date.parse(value));
export function validateSession(s) {
  const errors=[];
  for (const key of ['id','productionId','venueId','city','timezone']) if (!nonempty(s[key])) errors.push(key);
  if (!okDate(s.startsAt)) errors.push('startsAt');
  try { new Intl.DateTimeFormat('en', {timeZone:s.timezone}); } catch { errors.push('timezone'); }
  if (!['unavailable','sold-out','verified'].includes(s.bookingStatus)) errors.push('bookingStatus');
  if (s.bookingStatus === 'verified') { try { if (new URL(s.bookingUrl).protocol !== 'https:') errors.push('bookingUrl'); } catch { errors.push('bookingUrl'); } }
  else if (s.bookingUrl) errors.push('unverified bookingUrl');
  return errors;
}
export function upcomingSessions(sessions, now = Date.now()) {
  if (!Number.isFinite(now)) throw new TypeError('Invalid current time');
  for (const session of sessions) if (validateSession(session).length) throw new TypeError('Invalid session');
  return sessions.filter(s=>Date.parse(s.startsAt)>=now).slice().sort((a,b)=>Date.parse(a.startsAt)-Date.parse(b.startsAt));
}
export function validateRecord(kind, record) {
  const required = {
    production:['id','title','route'], person:['id','name','role','biography','portraitAssetId'],
    venue:['id','name','city','timezone'], media:['id','sourcePath','sha256','rightsStatus'],
    document:['id','title','approvalStatus'], route:['path','title','description','legalState']
  }[kind];
  if (!required) throw new TypeError(`Unknown record type: ${kind}`);
  const errors = required.filter(key=>!nonempty(record[key]));
  if (kind==='media' && !/^[a-f0-9]{64}$/.test(record.sha256 || '')) errors.push('sha256');
  if (kind==='media' && !['pending','approved','rejected'].includes(record.rightsStatus)) errors.push('rightsStatus');
  if (kind==='document' && !['pending','approved','rejected'].includes(record.approvalStatus)) errors.push('approvalStatus');
  return [...new Set(errors)];
}
