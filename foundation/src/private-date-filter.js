// Add a local calendar filter without changing or shortening the source data.
const panel=document.querySelector('[data-schedule-months]');
const filter=document.querySelector('[data-schedule-filter]');
if(panel && filter){
 const label=document.createElement('label');label.textContent='Дата показа ';const field=document.createElement('input');field.type='date';field.setAttribute('aria-label','Дата показа');label.append(field);filter.append(label);
 const status=document.createElement('p');status.setAttribute('role','status');status.hidden=true;panel.after(status);
 const cityStatus=filter.querySelector('[role="status"]');
 function apply(){
  let visible=0;for(const row of panel.querySelectorAll('.show-schedule__row')){const t=row.querySelector('time');row.hidden=Boolean(field.value && t && !t.dateTime.startsWith(field.value));if(!row.hidden)visible++}
  for(const heading of panel.querySelectorAll('.show-schedule__month')) {const list=heading.nextElementSibling;heading.hidden=Boolean(list && ![...list.querySelectorAll('.show-schedule__row')].some(row=>!row.hidden));}
  status.hidden=visible!==0;status.textContent=visible===0?'Показы на выбранную дату не найдены.':'';
  if(cityStatus) cityStatus.textContent=`${filter.querySelector("select")?.value || "Все города"}. Количество показов: ${visible}.`;
 }
 field.addEventListener('input',apply);filter.querySelector('select')?.addEventListener('change',()=>queueMicrotask(apply));
}
