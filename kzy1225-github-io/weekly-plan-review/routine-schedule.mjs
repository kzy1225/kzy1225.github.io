// Timing-only routines recur daily; other frequencies stay on the weekly sheet.
export function isDailyRoutine(item){
  const frequency=item.frequency.normalize('NFKC').replace(/\s/g,'');
  return /^(毎日|毎朝|毎晩|毎夕|毎夜|毎食|1日[1-9]\d*回|24時間に1回|起床後|帰宅後|就寝前)/.test(frequency);
}
export function splitRoutines(data){
  const daily=[],groups=[];
  for(const group of data.groups){
    const items=[];
    for(const item of group.items){
      if(isDailyRoutine(item))daily.push({...item,group:group.title});else items.push(item);
    }
    if(items.length)groups.push({...group,items});
  }
  const names=daily.map(item=>daily.filter(other=>other.name===item.name).length>1?`${item.name}（${item.group.replace(/^\d+\.\s*/, '')}）`:item.name);
  const weeklyChecklist=groups.flatMap(group=>group.items.map(item=>{
    const frequency=item.frequency.normalize('NFKC');
    const weekly=frequency.match(/^週([1-7])回$/),interval=frequency.match(/^(\d+)日に1回$/);
    const count=weekly?Number(weekly[1]):interval?Math.min(7,Math.ceil(7/Number(interval[1]))):frequency==='隔日'?4:1;
    return {name:item.name,count};
  }));
  return {daily,names,weekly:{groups,weeklyChecklist}};
}
export function mergeHabitNames(automatic,custom){
  const names=[...new Set([...automatic,...custom])];
  if(names.length>45)throw Error('自動項目と追加項目は合計45件以内にしてください。');
  return names;
}

// Keys stay identical to the previous tracker so saved checks continue to match.
export function habitDetails(data){
  const {daily,names}=splitRoutines(data);
  return new Map(names.map((name,i)=>[name,{name:daily[i].name,group:daily[i].group,minutes:daily[i].minutes}]));
}
export function habitTotals(names,details){
  const totals=new Map();
  for(const name of new Set(names)){
    const item=details.get(name);
    if(item)totals.set(item.group,(totals.get(item.group)??0)+item.minutes);
  }
  return [...totals].map(([group,minutes])=>({group,minutes}));
}
// Shared grouping for the on-screen table and printable sheet. Item keys are
// unchanged, including the morning/evening suffixes used by saved checks.
export function habitGroups(names,details){
  const groups=new Map();
  for(const key of names){
    const detail=details.get(key),id=detail?`routine:${detail.group}`:'custom';
    if(!groups.has(id))groups.set(id,{group:detail?.group??'追加項目',minutes:detail?0:null,items:[]});
    const group=groups.get(id);
    if(detail)group.minutes+=detail.minutes;
    group.items.push({key,name:detail?.name??key,minutes:detail?.minutes??null});
  }
  return [...groups.values()];
}
