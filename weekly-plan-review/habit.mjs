import {habitGroups} from './routine-schedule.mjs';
import {PAGE} from './sheet.mjs';
export function monthModel(value){
  if(!/^\d{4}-\d{2}$/.test(value))throw Error('対象月を選択してください。');
  const [year,month]=value.split('-').map(Number);
  if(year<1900||year>2100||month<1||month>12)throw Error('1900年〜2100年の月を選択してください。');
  return {year,month,code:value,dayCount:new Date(Date.UTC(year,month,0)).getUTCDate(),filename:`habit-tracker_${value}.pdf`};
}
export function habitNames(value){
  const names=value.split('\n').map(s=>s.trim()).filter(Boolean);
  if(names.length>15||names.some(n=>[...n].length>24))throw Error('やることは15項目まで、各24文字以内で入力してください。');
  if(new Set(names).size!==names.length)throw Error('やることの名前は重複しないようにしてください。');
  return names;
}
export const weekdayLabel=(model,day)=>day>=1&&day<=model.dayCount?'日月火水木金土'[new Date(Date.UTC(model.year,model.month-1,day)).getUTCDay()]:'';
export const isSunday=(model,day)=>weekdayLabel(model,day)==='日';
export const checkKey=(name,day)=>JSON.stringify([name,day]);
export function buildHabitSheet(model,names,checks,measure,details=new Map()){
  const {width,height,margin:M}=PAGE,commands=[];
  const text=(text,x,y,size=10,color='#27352f',bold=false)=>commands.push({type:'text',text,x,y,size,color,bold});
  const line=(x,y,x2,y2,thickness=.5,color='#bac7c0')=>commands.push({type:'line',x,y,x2,y2,color,thickness});
  const fill=(x,y,w,h,color)=>commands.push({type:'rect',x,y,w,h,color,fill:color,thickness:0});
  text('MONTHLY HABIT TRACKER',M,32,12);text(`${model.year}年 ${model.month}月`,width-M-100,32,12);
  if(names.length>45)throw Error('ハビットトラッカーは合計45項目までです。');
  const rows=names.length?habitGroups(names,details).flatMap(g=>[
    {type:'group',name:g.group,minutes:g.minutes},...g.items.map(item=>({...item,type:'item'}))
  ]):Array.from({length:12},()=>({type:'item',key:'',name:'',minutes:null}));
  const top=60,nameWidth=195,timeWidth=52,labelWidth=nameWidth+timeWidth;
  const headerHeight=26,cell=(width-2*M-labelWidth)/31,row=Math.min(29,(height-M-23-top-headerHeight)/rows.length);
  const bottom=top+headerHeight+rows.length*row;
  for(let day=1;day<=model.dayCount;day++)if(isSunday(model,day))fill(M+labelWidth+(day-1)*cell,top,cell,bottom-top,'#f2f2f2');
  const baseline=row/2+Math.min(3,(row-2)/3);
  text('やること',M+5,top+16,10);
  text('所要時間',M+nameWidth+5,top+16,9);
  for(let day=1;day<=model.dayCount;day++){
    const center=M+labelWidth+(day-.5)*cell,number=String(day),weekday=weekdayLabel(model,day);
    text(number,center-measure(number,9)/2,top+11,9,'#27352f',isSunday(model,day));
    text(weekday,center-measure(weekday,8)/2,top+22,8,'#27352f',isSunday(model,day));
  }
  rows.forEach((item,i)=>{
    const y=top+headerHeight+i*row,isGroup=item.type==='group';
    if(isGroup)fill(M,y,width-2*M,row,'#e6e6e6');
    const color=isGroup?'#000000':'#27352f';
    let size=Math.min(10,row-2);
    while(measure(item.name,size)>nameWidth-12&&size>6)size-=.25;
    if(measure(item.name,size)>nameWidth-12)throw Error('ハビットトラッカーの項目名が長すぎます。表記を短くしてください。');
    text(item.name,M+(isGroup?5:9),y+baseline,size,color,isGroup);
    const minutes=item.minutes===null?(item.name?'—':''):`${item.minutes}分`;
    const timeSize=Math.min(9,row-2);
    if(measure(minutes,timeSize)>timeWidth-8)throw Error('所要時間が欄に収まりません。');
    text(minutes,M+labelWidth-5-measure(minutes,timeSize),y+baseline,timeSize,color,isGroup);
    if(!isGroup)for(let day=1;day<=model.dayCount;day++)if(checks[checkKey(item.key,day)]===true){
      const x=M+labelWidth+(day-1)*cell;
      fill(x+1,y+1,cell-2,row-2,'#d5e9dd');
      line(x+4,y+row*.5,x+7,y+row*.7);line(x+7,y+row*.7,x+cell-3,y+row*.3);
    }
  });
  line(M,top,width-M,top);
  for(let i=0;i<=rows.length;i++)line(M,top+headerHeight+i*row,width-M,top+headerHeight+i*row);
  for(const offset of [0,nameWidth])line(M+offset,top,M+offset,bottom);
  for(let i=0;i<=31;i++)line(M+labelWidth+i*cell,top,M+labelWidth+i*cell,bottom,i>0&&isSunday(model,i)?1.2:.5,i>0&&isSunday(model,i)?'#808080':'#bac7c0');
  text('見出しの時間は各項目1回分の合計です。追加項目は時間未設定のため集計に含みません。',M,height-M,8);
  return {commands,width,height};
}
