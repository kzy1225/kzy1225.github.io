import test from 'node:test';
import assert from 'node:assert/strict';
import {monthModel,habitNames,checkKey,buildHabitSheet} from './habit.mjs';
import {PAGE} from './sheet.mjs';
test('月の日数・うるう年と入力制約',()=>{
  for(const [month,days] of [['2026-02',28],['2024-02',29],['2026-04',30],['2026-01',31],['1900-02',28],['2000-02',29]])assert.equal(monthModel(month).dayCount,days);
  for(const month of ['','2026-13','1899-12','2101-01'])assert.throws(()=>monthModel(month));
  assert.deepEqual(habitNames(' 読書\n\n運動 '),['読書','運動']);
  assert.throws(()=>habitNames('読書\n読書'));
  assert.throws(()=>habitNames('あ'.repeat(25)));
  assert.throws(()=>habitNames(Array.from({length:16},(_,i)=>String(i)).join('\n')));
});
test('チェック状態を描画し、31日・15項目もA4内に収まる',()=>{
  const names=Array.from({length:15},(_,i)=>`習慣${i}`),checks={[checkKey(names[0],31)]:true};
  const sheet=buildHabitSheet(monthModel('2026-01'),names,checks,(s,n)=>s.length*n);
  assert.equal(sheet.commands.filter(c=>c.fill==='#d5e9dd').length,1);
  assert.ok(sheet.commands.every(c=>c.y<=PAGE.height-PAGE.margin&&(!c.y2||c.y2<=PAGE.height-PAGE.margin)));
  assert.equal(buildHabitSheet(monthModel('2026-02'),names,checks,(s,n)=>s.length*n).commands.filter(c=>c.fill==='#d5e9dd').length,0);
  assert.ok(buildHabitSheet(monthModel('2026-01'),[],{},()=>0).commands.length>0);
});
