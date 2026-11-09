const DAY=86400000;
export function parseDate(value){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw Error('日付を選択してください。');
  const [y,m,d]=value.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
  if(date.getUTCFullYear()!==y||date.getUTCMonth()!==m-1||date.getUTCDate()!==d)throw Error('日付が正しくありません。');
  return date;
}
export const dateISO=date=>date.toISOString().slice(0,10);
export const addDays=(date,days)=>new Date(date.getTime()+days*DAY);
export function isoWeek(date){
  const thursday=addDays(date,4-(date.getUTCDay()||7));
  const year=thursday.getUTCFullYear();
  const week=Math.ceil(((thursday-new Date(Date.UTC(year,0,1)))/DAY+1)/7);
  return {year,week};
}
export const weeksInYear=year=>isoWeek(new Date(Date.UTC(year,11,28))).week;
export function mondayOf(year,week){
  if(!Number.isInteger(year)||year<1900||year>2100)throw Error('ISO週年は1900〜2100年で入力してください。');
  if(!Number.isInteger(week)||week<1||week>weeksInYear(year))throw Error('この年に存在するISO週番号を選択してください。');
  const jan4=new Date(Date.UTC(year,0,4));
  return addDays(jan4,1-(jan4.getUTCDay()||7)+(week-1)*7);
}
export function weekModel(year,week){
  const monday=mondayOf(year,week),days=Array.from({length:7},(_,i)=>addDays(monday,i));
  const code=`${year}-W${String(week).padStart(2,'0')}`;
  return {year,week,code,monday,sunday:days[6],days,filename:`weekly-plan-review_${code}.pdf`};
}
export function todayInJapan(){return parseDate(new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));}
export function dateLabel(date){return `${dateISO(date).replaceAll('-','/')}（${['日','月','火','水','木','金','土'][date.getUTCDay()]}）`;}
