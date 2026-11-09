import {splitRoutines} from './routine-schedule.mjs';
import {dateLabel} from './week.mjs';
export const PAGE={width:297*72/25.4,height:210*72/25.4,margin:8*72/25.4};
const C={ink:'#27352f',green:'#145d49',rule:'#bac7c0',light:'#e6ece8',muted:'#64776d'};
export function validateRoutines(data){
  if(!data||!Array.isArray(data.groups)||!Array.isArray(data.weeklyChecklist))throw Error('routines.json の groups と weeklyChecklist を確認してください。');
  const validText=t=>typeof t==='string'&&t.trim().length>0&&!/[\r\n\u0000-\u001f]/.test(t);
  if(data.groups.length>30||data.weeklyChecklist.length>30)throw Error('項目が多すぎます。ルーティーンとToDoを短く整理してください。');
  for(const g of data.groups){
    if(!validText(g.title)||!Array.isArray(g.items)||g.items.length>100)throw Error('ルーティーンの分類名と items を確認してください。');
    for(const i of g.items)if(!validText(i.name)||!validText(i.frequency)||!Number.isInteger(i.minutes)||i.minutes<0||i.minutes>1440)throw Error('各業務に name・frequency・0〜1440の整数 minutes を指定してください。');
  }
  for(const i of data.weeklyChecklist)if(!validText(i.name)||!Number.isInteger(i.count)||i.count<1||i.count>7)throw Error('ToDoには name と1〜7の整数 count を指定してください。');
  return data;
}
export function wrapText(text,maxWidth,size,measure){
  const lines=[];let line='';
  for(const ch of text){if(line&&measure(line+ch,size)>maxWidth){lines.push(line);line=ch;}else line+=ch;}
  if(line)lines.push(line);return lines;
}
// Keep all weekly tasks together in a wide, genre-grouped right column.
export function buildSheet(model,data,measure){
  validateRoutines(data);
  data=splitRoutines(data).weekly;
  const {width:W,height:H,margin:M}=PAGE,commands=[];
  const text=(value,x,y,size=10,color=C.ink)=>commands.push({type:'text',text:value,x,y,size,color});
  const line=(x,y,x2,y2,color=C.rule,thickness=.5)=>commands.push({type:'line',x,y,x2,y2,color,thickness});
  const rect=(x,y,w,h)=>commands.push({type:'rect',x,y,w,h,color:C.muted,thickness:.6});
  const fit=(value,x,y,maxWidth,size=10,color=C.ink)=>{
    if(measure(value,size)>maxWidth)throw Error(`「${value}」が欄に収まりません。routines.json の表記を短くしてください。`);
    text(value,x,y,size,color);
  };
  const top=76,bottom=H-M,sideWidth=168,sideX=W-M-sideWidth;
  const mainWidth=sideX-M-18,colWidth=mainWidth/4,rowHeight=(bottom-top-18)/2;
  text('WEEKLY PLAN & REVIEW',M,33,14,C.green);
  const range=`${dateLabel(model.monday)} — ${dateLabel(model.sunday)}`;
  text(model.code,W-M-measure(model.code,14),33,14,C.green);
  text(range,W-M-measure(range,11),53,11,C.muted);line(M,64,W-M,64);
  line(sideX-10,top,sideX-10,bottom);
  function header(label,x,y){fit(label,x+2,y+12,colWidth-10,11,C.green);line(x,y+19,x+colWidth-10,y+19);}
  function daily(date,x,y){
    header(dateLabel(date).slice(5),x,y);
    text('睡眠',x+2,y+38,9);
    text('目標',x+2,y+61,10,C.green);
    text('ToDo',x+2,y+108,10,C.green);
    if([10,20,30].includes(date.getUTCDate())){rect(x+2,y+121,8,8);text('買い物',x+16,y+129,10);}

  }
  header('週間の目標・振り返り',M,top);
  text('今週の目標',M+2,top+38,10,C.green);
  for(let i=0;i<3;i++)text(['①','②','③'][i],M+2,top+57+i*20,10);
  text('目標に対する振り返り',M+2,top+122,10,C.green);
  for(let i=0;i<3;i++)text(`(${i+1})`,M+2,top+141+i*20,9);
  const metrics=[['勉強時間','労働時間'],['睡眠時間','支出'],['チェック数','達成度 /10']];
  metrics.forEach((pair,i)=>pair.forEach((label,j)=>text(label,M+2+j*colWidth/2,top+rowHeight-35+i*16,8.5,C.ink)));
  for(let i=0;i<3;i++)daily(model.days[i],M+(i+1)*colWidth,top);
  for(let i=3;i<7;i++)daily(model.days[i],M+(i-3)*colWidth,top+rowHeight+18);
  text('今週のToDo',sideX,top+12,11,C.green);line(sideX,top+19,W-M,top+19);
  let y=top+41,taskIndex=0;
  for(const group of data.groups){
    fit(group.title,sideX,y,sideWidth,9,C.green);
    const total=`計${group.items.reduce((sum,item)=>sum+item.minutes,0)}分（各1回）`;
    if(measure(group.title,9)+measure(total,7)+8>sideWidth)throw Error('ジャンル名と合計時間が欄に収まりません。ジャンル名を短くしてください。');
    text(total,W-M-measure(total,7),y,7);line(sideX,y+6,W-M,y+6);y+=20;
    for(const item of group.items){
      const task=data.weeklyChecklist[taskIndex++];
      const boxesWidth=task.count*8+4,contentX=sideX+boxesWidth,contentWidth=sideWidth-boxesWidth;
      const metadata=`[${item.frequency}・${item.minutes}分]`;
      const nameWidth=measure(item.name,8),metadataWidth=measure(metadata,7);
      const inline=nameWidth+4+metadataWidth<=contentWidth;
      const nameLines=wrapText(item.name,contentWidth,8,measure);
      const metadataLines=inline?[]:wrapText(metadata,contentWidth,7,measure);
      const height=inline?20:nameLines.length*11+metadataLines.length*10+6;
      if(y+height>bottom)throw Error('週間ToDoがA4の1枚に収まりません。項目名・頻度を短くするか、項目を減らしてください。');
      for(let j=0;j<task.count;j++)rect(sideX+j*8,y-6,6,6);
      if(inline){text(item.name,contentX,y,8);text(metadata,contentX+nameWidth+4,y,7);}
      else{
        nameLines.forEach((name,i)=>text(name,contentX,y+i*11,8));
        metadataLines.forEach((value,i)=>text(value,contentX,y+nameLines.length*11+i*10,7));
      }
      y+=height;
    }
    y+=7;
  }
  for(const c of commands)if(c.type==='text'&&(c.y>bottom+1||c.x+measure(c.text,c.size)>W-M+1))throw Error('用紙の余白に収まりません。項目の表記を確認してください。');
  return {commands,width:W,height:H};
}
