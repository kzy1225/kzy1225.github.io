import {splitRoutines,mergeHabitNames,habitDetails,habitGroups} from './routine-schedule.mjs';
import {monthModel,habitNames,checkKey,buildHabitSheet,isSunday,weekdayLabel} from './habit.mjs';
import {isoWeek,weeksInYear,weekModel,parseDate,dateISO,dateLabel,addDays,todayInJapan} from './week.mjs';
import {PAGE,validateRoutines,buildSheet} from './sheet.mjs';
const $=s=>document.querySelector(s),NS='http://www.w3.org/2000/svg';
let data,fontBytes,model,sheet,ready=false,busy=false;
let checks={};
const trackerNames=()=>mergeHabitNames(splitRoutines(data).names,habitNames($('#habitNames').value));
const monthly=()=>$('#sheetType').value==='monthly';
const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
function measure(text,size){context.font=`${size}px WeeklySheetFont`;return context.measureText(text).width;}
function error(message){$('#error').textContent=message;$('#error').hidden=!message;}
function status(message){$('#status').textContent=message;}
function exportEnabled(enabled){$('#exportPdf').disabled=!enabled||busy;$('#printSheet').disabled=!enabled||busy;}
function options(year,week){
  const select=$('#isoWeek');select.replaceChildren();
  for(let w=1;w<=weeksInYear(year);w++){const option=document.createElement('option');option.value=w;option.textContent=`W${String(w).padStart(2,'0')} / 第${w}週`;select.append(option);}
  select.value=String(Math.min(week,weeksInYear(year)));
}
function applyWeek(year,week){$('#isoYear').value=year;options(year,week);render();}
function drawPreview(){
  const svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox',`0 0 ${PAGE.width} ${PAGE.height}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',`${model.code} ${monthly()?'月間ハビットトラッカー':'週間計画シート'}`);
  const title=document.createElementNS(NS,'title');title.textContent=`${model.code} / A4横 ${monthly()?"月間ハビットトラッカー":"週間PLAN & REVIEW"}`;svg.append(title);
  for(const c of sheet.commands){
    const el=document.createElementNS(NS,c.type==='text'?'text':c.type==='rect'?'rect':'line');
    if(c.type==='text'){el.textContent=c.text;el.setAttribute('x',c.x);el.setAttribute('y',c.y);el.setAttribute('font-family','WeeklySheetFont');el.setAttribute('font-size',c.size);el.setAttribute('fill',c.color);if(c.bold){el.setAttribute('stroke',c.color);el.setAttribute('stroke-width','.25');el.setAttribute('stroke-linejoin','round');}}
    else{el.setAttribute('stroke',c.color);el.setAttribute('stroke-width',c.thickness);el.setAttribute('fill',c.fill||'none');if(c.type==='line'){el.setAttribute('x1',c.x);el.setAttribute('y1',c.y);el.setAttribute('x2',c.x2);el.setAttribute('y2',c.y2);}else{el.setAttribute('x',c.x);el.setAttribute('y',c.y);el.setAttribute('width',c.w);el.setAttribute('height',c.h);}}
    svg.append(el);
  }
  $('#preview').replaceChildren(svg);
}
function render(){
  if(!ready)return;
  try{
    if(monthly()){
      model=monthModel($('#habitMonth').value);$('#habitMonth').removeAttribute('aria-invalid');
      const names=trackerNames();
      sheet=buildHabitSheet(model,names,checks,measure,habitDetails(data));
      $('#weekCode').textContent=model.code;$('#dateRange').textContent=`${model.year}年${model.month}月 ハビットトラッカー`;
      error('');drawPreview();renderHabitTable(names);exportEnabled(true);status(`出力ファイル：${model.filename} ／ A4横1ページ`);return;
    }
    const yearInput=$('#isoYear');
    if(!yearInput.validity.valid||yearInput.value==='')throw Error('ISO週年は1900〜2100年の整数で入力してください。');
    model=weekModel(Number(yearInput.value),Number($('#isoWeek').value));
    sheet=buildSheet(model,data,measure);
    yearInput.removeAttribute('aria-invalid');error('');
    $('#weekCode').textContent=model.code;$('#dateRange').textContent=`${dateLabel(model.monday)} — ${dateLabel(model.sunday)}`;$('#datePicker').value=dateISO(model.monday);
    $('#previousWeek').disabled=model.year===1900&&model.week===1;$('#nextWeek').disabled=model.year===2100&&model.week===weeksInYear(2100);
    drawPreview();exportEnabled(true);status(`出力ファイル：${model.filename} ／ 日本語フォント埋め込み・A4横1ページ`);
  }catch(e){error(e.message);(monthly()?$('#habitMonth'):$('#isoYear')).setAttribute('aria-invalid','true');$('#preview').replaceChildren();$('#habitTable').replaceChildren();$('#habitTotals').replaceChildren();$('#weekCode').textContent='入力を確認';$('#dateRange').textContent=monthly()?'対象月と項目を確認してください':'有効な週を選んでください';exportEnabled(false);sheet=null;}
}
function renderRoutines(){
  $('#routineCount').textContent=`${data.groups.length}分類・${data.groups.reduce((n,g)=>n+g.items.length,0)}項目。毎日の${splitRoutines(data).daily.length}項目は月間表へ、それ以外は週間シート右端のジャンル別ToDoへ自動追加します。`;
  $('#routineGroups').replaceChildren(...data.groups.map(g=>{
    const article=document.createElement('article');article.className='routine-group';const heading=document.createElement('h3');heading.textContent=g.title;const list=document.createElement('ul');
    for(const item of g.items){const li=document.createElement('li'),info=document.createElement('div'),name=document.createElement('span'),frequency=document.createElement('span'),minutes=document.createElement('span');name.className='task-name';name.textContent=item.name;frequency.className='frequency';frequency.textContent=item.frequency;minutes.className='minutes';minutes.textContent=`${item.minutes}分`;info.append(name,frequency);li.append(info,minutes);list.append(li);}
    article.append(heading,list);return article;
  }));
}
$('#isoYear').addEventListener('input',()=>{const y=Number($('#isoYear').value);if($('#isoYear').validity.valid&&$('#isoYear').value!=='')options(y,Number($('#isoWeek').value)||1);render();});
$('#isoWeek').addEventListener('change',render);
$('#datePicker').addEventListener('change',()=>{try{if(!$('#datePicker').value||!$('#datePicker').validity.valid)throw Error('1900年〜2100年の日付を選択してください。');const w=isoWeek(parseDate($('#datePicker').value));applyWeek(w.year,w.week);}catch(e){error(e.message);exportEnabled(false);}});
for(const [id,delta] of [['previousWeek',-7],['nextWeek',7]])$(`#${id}`).addEventListener('click',()=>{if(!model)return;const w=isoWeek(addDays(model.monday,delta));applyWeek(w.year,w.week);});
$('#thisWeek').addEventListener('click',()=>{const w=isoWeek(todayInJapan());applyWeek(w.year,w.week);});
$('#printSheet').addEventListener('click',()=>{if(!sheet)return;const original=document.title;document.title=model.filename.replace('.pdf','');window.print();document.title=original;});
$('#exportPdf').addEventListener('click',async()=>{
  if(!sheet||busy)return;
  const snapshot={...model},commands=sheet.commands;
  busy=true;exportEnabled(false);$('#weekControls').disabled=true;$('#monthControls').disabled=true;$('#sheetType').disabled=true;$('#thisWeek').disabled=true;$('#exportPdf').textContent='PDFを作成中…';status('日本語フォントを埋め込んでいます。');error('');
  try{
    const [{PDFDocument,rgb,pushGraphicsState,popGraphicsState,setTextRenderingMode,TextRenderingMode,setLineWidth}]=await Promise.all([import('./vendor/pdf-lib.esm.min.js'),import('./vendor/fontkit.umd.min.js')]);
    const fontkit=window.fontkit;
    const document=await PDFDocument.create();document.registerFontkit(fontkit);const font=await document.embedFont(fontBytes,{subset:true});
    // Fail clearly if a later manual edit adds a character outside the font.
    const supported=new Set(font.getCharacterSet());
    for(const cmd of commands)if(cmd.type==='text')for(const ch of cmd.text)if(!supported.has(ch.codePointAt(0)))throw Error(`「${ch}」はPDF用フォントに含まれません。別の表記に変更してください。`);
    document.setTitle(`${monthly()?"HABIT TRACKER":"PLAN & REVIEW"} ${snapshot.code}`);document.setCreator('kzy1225 / Weekly Plan & Review');document.setLanguage('ja-JP');
    const page=document.addPage([PAGE.width,PAGE.height]);
    const color=hex=>rgb(parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255);
    for(const c of commands){
      if(c.type==='text'){
        // Synthesize bold with a thin outline for the embedded regular Japanese font.
        if(c.bold)page.pushOperators(pushGraphicsState(),setTextRenderingMode(TextRenderingMode.FillAndOutline),setLineWidth(.25));
        page.drawText(c.text,{x:c.x,y:PAGE.height-c.y,font,size:c.size,color:color(c.color)});
        if(c.bold)page.pushOperators(popGraphicsState());
      }
      else if(c.type==='line')page.drawLine({start:{x:c.x,y:PAGE.height-c.y},end:{x:c.x2,y:PAGE.height-c.y2},thickness:c.thickness,color:color(c.color)});
      else page.drawRectangle({x:c.x,y:PAGE.height-c.y-c.h,width:c.w,height:c.h,borderColor:color(c.color),borderWidth:c.thickness,...(c.fill?{color:color(c.fill)}:{})});
    }
    const bytes=await document.save(),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));
    const link=window.document.createElement('a');link.href=url;link.download=snapshot.filename;window.document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
    status(`${snapshot.filename} を出力しました。ブラウザーのダウンロード先をご確認ください。`);
  }catch(e){error(`PDFを作成できませんでした。${e.message}`);status('エラー内容を確認してから、再度お試しください。');}
  finally{busy=false;$('#weekControls').disabled=false;$('#monthControls').disabled=false;$('#sheetType').disabled=false;$('#thisWeek').disabled=false;$('#exportPdf').textContent='↓ PDFで出力';exportEnabled(Boolean(sheet));}
});
async function init(){
  try{
    const [routineResponse,fontResponse]=await Promise.all([fetch('./routines.json',{cache:'no-store'}),fetch('./vendor/ipag.ttf')]);
    if(!routineResponse.ok||!fontResponse.ok)throw Error('ルーティーンまたはフォントを取得できませんでした。');
    data=validateRoutines(await routineResponse.json());fontBytes=new Uint8Array(await fontResponse.arrayBuffer());
    const font=new FontFace('WeeklySheetFont',fontBytes.buffer);await font.load();document.fonts.add(font);
    renderRoutines();ready=true;$('#monthControls').disabled=false;$('#habitMonth').value=dateISO(todayInJapan()).slice(0,7);loadHabits();$('#weekControls').disabled=false;const week=isoWeek(todayInJapan());applyWeek(week.year,week.week);
  }catch(e){error(`${e.message} ページを再読み込みしてください。`);status('準備できませんでした。');exportEnabled(false);$('#thisWeek').disabled=true;}
}

function loadHabits(){
  checks={};$('#habitNames').value='';$('#habitStorage').textContent='';
  try{
    const saved=JSON.parse(localStorage.getItem(`habit-tracker:${$('#habitMonth').value}`)||'null');
    if(saved){
      if(typeof saved.names!=='string'||!saved.checks||typeof saved.checks!=='object'||Array.isArray(saved.checks))throw Error();
      habitNames(saved.names);$('#habitNames').value=saved.names;checks=saved.checks;
    }
  }catch{ $('#habitStorage').textContent='保存データを読み込めませんでした。画面での編集・PDF出力は利用できます。'; }
}
function saveHabits(){
  try{
    trackerNames();monthModel($('#habitMonth').value);
    localStorage.setItem(`habit-tracker:${$('#habitMonth').value}`,JSON.stringify({names:$('#habitNames').value,checks}));
    $('#habitStorage').textContent='このブラウザーに保存しました。';
  }catch{ $('#habitStorage').textContent='保存できませんでした。入力内容とブラウザーの保存設定を確認してください。'; }
}
function renderHabitTable(names){
  const table=document.createElement('table'),caption=document.createElement('caption');caption.textContent=`${model.year}年${model.month}月 達成チェック`;table.append(caption);
  const head=document.createElement('thead'),tr=document.createElement('tr');
  for(const [index,label] of ['やること','所要時間',...Array.from({length:31},(_,i)=>i<model.dayCount?`${i+1}\n${weekdayLabel(model,i+1)}`:'')].entries()){const th=document.createElement('th');th.scope='col';th.textContent=label;if(index>=2&&isSunday(model,index-1)){th.className='habit-sunday';th.title='日曜日（週の終わり）';}tr.append(th);}head.append(tr);table.append(head);
  const details=habitDetails(data);
  for(const group of habitGroups(names,details)){
    const body=document.createElement('tbody'),groupRow=document.createElement('tr'),heading=document.createElement('th'),total=document.createElement('td');
    groupRow.className='habit-genre';heading.scope='rowgroup';heading.textContent=group.group;total.textContent=group.minutes===null?'—':`${group.minutes}分`;groupRow.append(heading,total);for(let day=1;day<=31;day++){const dates=document.createElement('td');if(isSunday(model,day))dates.className='habit-sunday';groupRow.append(dates);}body.append(groupRow);
    for(const item of group.items){
      const row=document.createElement('tr'),th=document.createElement('th'),time=document.createElement('td');th.scope='row';th.textContent=item.name;time.textContent=item.minutes===null?'—':`${item.minutes}分`;row.append(th,time);
      for(let day=1;day<=31;day++){
        const td=document.createElement('td');if(day>model.dayCount){row.append(td);continue;}const input=document.createElement('input'),key=checkKey(item.key,day);if(isSunday(model,day))td.className='habit-sunday';input.type='checkbox';input.checked=checks[key]===true;input.setAttribute('aria-label',`${item.key} ${model.month}月${day}日`);
        input.addEventListener('change',()=>{checks[key]=input.checked;saveHabits();sheet=buildHabitSheet(model,names,checks,measure,details);drawPreview();});td.append(input);row.append(td);
      }body.append(row);
    }table.append(body);
  }
  const note=document.createElement('p');note.className='hint';note.textContent='ジャンル見出しの時間は、各項目1回分の合計です。追加項目は時間未設定のため集計に含みません。';
  $('#habitTable').replaceChildren(table);$('#habitTotals').replaceChildren(note);
}
$('#sheetType').addEventListener('change',()=>{
  $('#week-heading').nextElementSibling.hidden=monthly();$('#weekControls').hidden=monthly();$('#thisWeek').hidden=monthly();$('#monthControls').hidden=!monthly();
  $('#week-heading').textContent=monthly()?'月間ハビットトラッカーを作る':'印刷する週を選ぶ';
  $('#preview-heading').textContent=monthly()?'この一か月を、一枚に。':'この一週間を、プリント。';render();
});
$('#habitMonth').addEventListener('change',()=>{loadHabits();render();});
$('#habitNames').addEventListener('input',()=>{saveHabits();render();});
init();

