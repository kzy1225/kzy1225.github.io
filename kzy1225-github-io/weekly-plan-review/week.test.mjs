import {splitRoutines} from './routine-schedule.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isoWeek,mondayOf,dateISO,parseDate,weeksInYear,weekModel} from './week.mjs';
import {validateRoutines,buildSheet,PAGE} from './sheet.mjs';

test('見本の週は2026-W43、月曜から日曜まで7日',()=>{
  const model=weekModel(2026,43);
  assert.equal(dateISO(model.monday),'2026-10-19');
  assert.equal(dateISO(model.sunday),'2026-10-25');
  assert.equal(model.days.length,7);
  assert.equal(model.filename,'weekly-plan-review_2026-W43.pdf');
});
test('ISO週年と暦年が異なる年末年始',()=>{
  assert.deepEqual(isoWeek(parseDate('2025-12-29')),{year:2026,week:1});
  assert.deepEqual(isoWeek(parseDate('2027-01-03')),{year:2026,week:53});
  assert.deepEqual(isoWeek(parseDate('2027-01-04')),{year:2027,week:1});
  assert.deepEqual(isoWeek(parseDate('2021-01-01')),{year:2020,week:53});
  assert.equal(dateISO(mondayOf(2026,1)),'2025-12-29');
  assert.equal(dateISO(mondayOf(2026,53)),'2026-12-28');
});
test('第53週の有無と無効な週・日付',()=>{
  assert.equal(weeksInYear(2026),53);
  assert.equal(weeksInYear(2027),52);
  for(const pair of [[2027,53],[2026,0],[2026,54],[2026,1.5],[NaN,1],[1899,1],[2101,1]])assert.throws(()=>mondayOf(...pair));
  for(const value of ['2026-02-29','2026-13-01','2026-01-32','','2026-1-1'])assert.throws(()=>parseDate(value));
});
test('うるう日を含む週',()=>{
  assert.equal(dateISO(weekModel(2024,9).monday),'2024-02-26');
  assert.equal(dateISO(weekModel(2024,9).sunday),'2024-03-03');
});
test('1900〜2100年の全週を逆変換し、週番号と月曜が一致',()=>{
  for(let year=1900;year<=2100;year++)for(let week=1;week<=weeksInYear(year);week++){
    const monday=mondayOf(year,week);
    assert.equal(monday.getUTCDay(),1);
    assert.deepEqual(isoWeek(monday),{year,week});
  }
});
test('ルーティーン原本の9分類・41業務を取り込む',async()=>{
  const data=validateRoutines(JSON.parse(await readFile(new URL('./routines.json',import.meta.url),'utf8')));
  assert.equal(data.groups.length,9);
  assert.equal(data.groups.reduce((n,g)=>n+g.items.length,0),41);
  assert.equal(data.weeklyChecklist.length,14);
  assert.equal(data.groups[1].items[4].minutes,240);
});
test('編集データの不正な形式を検出する',()=>{
  assert.throws(()=>validateRoutines({}));
  assert.throws(()=>validateRoutines({groups:[{title:'業務',items:[{name:'確認',frequency:'毎日',minutes:-1}]}],weeklyChecklist:[]}));
  assert.throws(()=>validateRoutines({groups:[],weeklyChecklist:[{name:'確認',count:0}]}));
});
test('A4横の寸法とレイアウト・過剰な項目を拒否',()=>{
  const measure=(text,size)=>[...text].reduce((s,c)=>s+(c.charCodeAt(0)<128?.5:1)*size,0);
  const sheet=buildSheet(weekModel(2026,53),{groups:[],weeklyChecklist:[]},measure);
  assert.ok(Math.abs(sheet.width-841.89)<.01);
  assert.ok(Math.abs(sheet.height-595.28)<.01);
  assert.ok(sheet.commands.every(c=>c.y<PAGE.height));
  assert.ok(sheet.commands.some(c=>c.type==='text'&&c.text.includes('2027/01/03')));
  const long={groups:Array.from({length:30},(_,i)=>({title:`分類${i}`,items:[{name:'確認'.repeat(100),frequency:'週1回',minutes:1}]})),weeklyChecklist:[]};
  assert.throws(()=>buildSheet(weekModel(2026,43),long,measure),/収まりません/);
});
test('週間ToDoを右端にジャンル別でまとめ、文字サイズを確保する',async()=>{
  const data=JSON.parse(await readFile(new URL('./routines.json',import.meta.url),'utf8'));
  const measure=(text,size)=>[...text].reduce((s,c)=>s+(c.charCodeAt(0)<128?.5:1)*size,0);
  const sheet=buildSheet(weekModel(2026,43),data,measure);
  const weekly=splitRoutines(data).weekly;
  for(const group of weekly.groups){
    assert.equal(sheet.commands.filter(c=>c.type==='text'&&c.text===group.title).length,1);
  }
  assert.equal(sheet.commands.filter(c=>c.type==='rect').length,weekly.weeklyChecklist.reduce((n,t)=>n+t.count,0)+1);
  assert.equal(sheet.commands.filter(c=>c.type==='text'&&c.text==='Routine').length,0);
  assert.ok(sheet.commands.filter(c=>c.type==='text').every(c=>c.size>=7));
  const title=sheet.commands.find(c=>c.text==='今週のToDo');
  for(const task of weekly.weeklyChecklist)assert.ok(sheet.commands.some(c=>c.text===task.name&&c.x>=title.x&&c.size>=8));
});

 test('買い物は毎月10・20・30日のみ、日別Reviewなし、睡眠欄は7日分',()=>{
  const measure=(s,n)=>s.length*n;
  for(const [year,week] of [[2026,43],[2026,49],[2027,9],[2024,9]]){
    const model=weekModel(year,week),sheet=buildSheet(model,{groups:[],weeklyChecklist:[]},measure);
    assert.equal(sheet.commands.filter(c=>c.text==='買い物').length,model.days.filter(d=>[10,20,30].includes(d.getUTCDate())).length);
    assert.equal(sheet.commands.filter(c=>c.text==='Review').length,0);
    assert.equal(sheet.commands.filter(c=>c.text?.startsWith('睡眠：')).length,7);
    assert.ok(sheet.commands.some(c=>c.text==='今週の目標'));
  }
 });

 test('週番号と対象期間は控えめに表示し、左側の各列へ同じ幅を割り当てる',()=>{
  const measure=(s,n)=>[...s].reduce((sum,c)=>sum+(c.charCodeAt(0)<128?.5:1)*n,0);
  const sheet=buildSheet(weekModel(2026,46),{groups:[],weeklyChecklist:[]},measure);
  const code=sheet.commands.find(c=>c.text==='2026-W46');
  const range=sheet.commands.find(c=>c.text?.includes('2026/11/09')&&c.text?.includes('2026/11/15'));
  assert.equal(code.size,14);
  assert.equal(range.size,11);
  assert.ok(code.x>=PAGE.margin&&range.x>=PAGE.margin);
  const headers=['週間の目標・振り返り','11/09（月）','11/10（火）','11/11（水）'].map(label=>sheet.commands.find(c=>c.text===label));
  const width=headers[1].x-headers[0].x;
  assert.ok(width>150);
  for(let i=2;i<headers.length;i++)assert.ok(Math.abs(headers[i].x-headers[i-1].x-width)<.001);
  assert.equal(sheet.commands.filter(c=>c.text==='週間目標の実行度').length,0);
  assert.equal(sheet.commands.filter(c=>c.text==='0 未実行　△ 一部　○ 実行').length,0);
  assert.equal(sheet.commands.filter(c=>c.type==='rect'&&c.w===19&&c.h===16).length,0);
  for(const label of ['①','②','③'])assert.equal(sheet.commands.filter(c=>c.text===label).length,1);
 });
