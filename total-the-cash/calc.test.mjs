import test from 'node:test';
import assert from 'node:assert/strict';
import {DENOMS,parseCount,summarize,combine,pairTotals} from './calc.mjs';

test('空欄・通常入力・四則演算・優先順位・かっこ',()=>{
  for(const [expression,value] of [['',0],['  ',0],['0',0],['0010',10],['10+5',15],['2+3*4',14],['(2+3)*4',20],['50/2',25],['10-3-2',5],['-2+3',1],['10/-2+5',0]]) assert.deepEqual(parseCount(expression),{value,error:null});
});
test('小数の中間計算は有理数で正確に評価',()=>{
  for(const expression of ['0.1*10','1/3*3','(.1+.2)*10/3','1.000']) assert.equal(parseCount(expression).value,1);
});
test('負の枚数・小数枚・0除算・未完成式・不正トークンを拒否',()=>{
  for(const expression of ['-1','1/2','1/0','0/0','1+','()','(2+3','1..2','1 . + 2','1 2','1e3','Infinity','2**3','2//3','alert(1)','1000001','9'.repeat(81)]) assert.ok(parseCount(expression).error,expression);
});
test('上限と大きい中間値',()=>{
  assert.equal(parseCount('1000000').value,1000000);
  assert.equal(parseCount('999999999999999999999999/999999999999999999999999').value,1);
});
test('10券種と全列の集計',()=>{
  const columns=[DENOMS.map(()=>1),DENOMS.map(()=>2)];
  const total=summarize(columns);
  assert.equal(total.count,30);
  assert.equal(total.amount,55998);
  assert.deepEqual(total.byColumn,[{count:10,amount:18666},{count:20,amount:37332}]);
  assert.equal(total.rows[0].count,3);
  assert.equal(total.rows[0].amount,30000);
});
test('選択列は重複せず合計、選択なしは0',()=>{
  const columns=[DENOMS.map(()=>1),DENOMS.map(()=>2),DENOMS.map(()=>3)];
  assert.equal(combine(columns,[0,2]).amount,74664);
  assert.equal(combine(columns,[0,0,2,99,-1]).amount,74664);
  assert.equal(combine(columns,[]).amount,0);
  assert.equal(combine(columns,[]).rows.length,10);
});
test('全2列の組み合わせを漏れなく重複なく計算',()=>{
  const columns=Array.from({length:8},(_,i)=>DENOMS.map(()=>i));
  const pairs=pairTotals(columns);
  assert.equal(pairs.length,28);
  assert.equal(new Set(pairs.map(p=>`${p.a},${p.b}`)).size,28);
  for(const p of pairs){assert.ok(p.a<p.b);assert.equal(p.amount,(p.a+p.b)*18666);assert.equal(p.count,(p.a+p.b)*10);}
  assert.equal(pairTotals([DENOMS.map(()=>0)]).length,0);
});
test('上限入力でも整数精度を保ち、列・行の合計が一致',()=>{
  const columns=Array.from({length:8},()=>DENOMS.map(()=>1000000));
  const total=summarize(columns);
  assert.equal(total.amount,149328000000);
  assert.ok(Number.isSafeInteger(total.amount));
  assert.equal(total.byColumn.reduce((s,c)=>s+c.amount,0),total.amount);
  assert.equal(total.rows.reduce((s,r)=>s+r.amount,0),total.amount);
});
