import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {isDailyRoutine,splitRoutines,mergeHabitNames} from './routine-schedule.mjs';
import {buildSheet,PAGE} from './sheet.mjs';
import {buildHabitSheet,monthModel,checkKey} from './habit.mjs';
import {weekModel} from './week.mjs';
const data=JSON.parse(await readFile(new URL('./routines.json',import.meta.url),'utf8'));
const measure=(s,n)=>[...s].reduce((sum,c)=>sum+(c.charCodeAt(0)<128?.5:1)*n,0);
test('日次の表記を判定し、隔日や週次は除外する',()=>{
  for(const frequency of ['毎日','毎朝','毎晩','1日1回','２４時間に１回','起床後30分以内','帰宅後30分以内','就寝前30分以内'])assert.ok(isDailyRoutine({frequency}));
  for(const frequency of ['週2回','2日に1回','隔日','毎月10・20・30日','毎週日曜日','必要時'])assert.equal(isDailyRoutine({frequency}),false);
});
test('全41項目を30件の日次と11件の週次に分け、同名の朝夜を区別する',()=>{
  const {daily,names,weekly}=splitRoutines(data);
  assert.equal(daily.length,30);assert.equal(weekly.groups.flatMap(g=>g.items).length,11);
  assert.equal(new Set(names).size,30);assert.ok(names.includes('歯磨き（起床後）'));assert.ok(names.includes('歯磨き（就寝前）'));
  assert.ok(weekly.weeklyChecklist.some(i=>i.name==='肩・背中'&&i.count===2));
  assert.ok(weekly.weeklyChecklist.every(i=>!daily.some(d=>d.name===i.name)));
  const sheet=buildSheet(weekModel(2026,43),data,measure),texts=sheet.commands.filter(c=>c.type==='text').map(c=>c.text);
  for(const item of daily)assert.ok(!texts.some(t=>t.includes(item.name)),item.name);
  for(const group of weekly.groups)for(const item of group.items)assert.ok(texts.includes(item.name),item.name);
});
test('追加項目と自動項目の重複を避け、既存のチェックキーを維持する',()=>{
  const names=mergeHabitNames(splitRoutines(data).names,['読書','運動']);assert.equal(names.length,31);
  const sheet=buildHabitSheet(monthModel('2026-11'),names,{[checkKey('読書',3)]:true},measure);
  assert.equal(sheet.commands.filter(c=>c.fill==='#d5e9dd').length,1);
  assert.throws(()=>mergeHabitNames(Array.from({length:46},(_,i)=>String(i)),[]));
});
test('自動30件と追加15件を31日分A4に収める',()=>{
  const names=mergeHabitNames(splitRoutines(data).names,Array.from({length:15},(_,i)=>`追加${i}`));
  const sheet=buildHabitSheet(monthModel('2026-12'),names,{},measure);
  for(const c of sheet.commands){assert.ok(c.y<=PAGE.height-PAGE.margin);if(c.y2)assert.ok(c.y2<=PAGE.height-PAGE.margin);if(c.text)assert.ok(c.x+measure(c.text,c.size)<=PAGE.width-PAGE.margin);}
});

test('ジャンル・所要時間とジャンル合計を出力し、追加項目は集計しない',async()=>{
  const {habitDetails,habitTotals}=await import('./routine-schedule.mjs');
  const details=habitDetails(data),names=mergeHabitNames(splitRoutines(data).names,['追加']);
  const totals=habitTotals(names,details);
  assert.deepEqual(totals.find(t=>t.group==='1. 起床後'),{group:'1. 起床後',minutes:18});
  assert.deepEqual(totals.find(t=>t.group==='2. 自己啓発'),{group:'2. 自己啓発',minutes:300});
  assert.equal(totals.length,8);
  assert.equal(habitTotals(['水を飲む','水を飲む','追加'],details)[0].minutes,2);
  const sheet=buildHabitSheet(monthModel('2026-12'),names,{[checkKey('歯磨き（就寝前）',31)]:true},measure,details);
  const texts=sheet.commands.filter(c=>c.type==='text');
  for(const expected of ['所要時間','240分','1. 起床後','18分','2. 自己啓発','300分','追加項目','—'])assert.ok(texts.some(c=>c.text===expected),expected);
  assert.equal(sheet.commands.filter(c=>c.fill==='#d5e9dd').length,1);
  for(const c of texts)assert.ok(c.x+measure(c.text,c.size)<=PAGE.width-PAGE.margin&&c.y<=PAGE.height-PAGE.margin);
  const weekly=buildSheet(weekModel(2026,43),data,measure);
  assert.ok(weekly.commands.some(c=>c.text==='計90分（各1回）'));
});

test('speck: ジャンル列をなくし、灰色背景・黒太字の見出し行に合計を配置する',async()=>{
  const {habitDetails,habitGroups}=await import('./routine-schedule.mjs');
  const details=habitDetails(data),names=splitRoutines(data).names,groups=habitGroups(names,details);
  const sheet=buildHabitSheet(monthModel('2026-12'),names,{},measure,details);
  assert.equal(sheet.commands.filter(c=>c.text==='ジャンル').length,0);
  const bands=sheet.commands.filter(c=>c.fill==='#e6e6e6');
  assert.equal(bands.length,8);
  assert.ok(bands.every(c=>Math.abs(c.x+c.w-(sheet.width-c.x))<.001));
  for(const group of groups){
    const title=sheet.commands.find(c=>c.text===group.group&&c.color==='#000000'&&c.bold);
    assert.ok(title);
    assert.ok(sheet.commands.some(c=>c.text===`${group.minutes}分`&&c.y===title.y&&c.color==='#000000'&&c.bold));
  }
  const morning=groups.find(g=>g.group==='1. 起床後').items.find(i=>i.name==='歯磨き');
  const evening=groups.find(g=>g.group==='9. 就寝前').items.find(i=>i.name==='歯磨き');
  assert.notEqual(morning.key,evening.key);
  assert.equal(sheet.commands.filter(c=>c.fill==='#d5e9dd').length,0);
});
test('speck: 週間ToDoはチェック枠、名前、頻度・時間の順で横並び',()=>{
  const sheet=buildSheet(weekModel(2026,43),data,measure);
  const name=sheet.commands.find(c=>c.text==='スクワット');
  const meta=sheet.commands.find(c=>c.text==='[2日に1回・10分]');
  assert.equal(name.y,meta.y);assert.ok(name.x<meta.x);
  const boxes=sheet.commands.filter(c=>c.type==='rect'&&c.y===name.y-6&&c.x<name.x);
  assert.equal(boxes.length,4);
  assert.ok(boxes.every(c=>c.x+c.w<name.x));
});
