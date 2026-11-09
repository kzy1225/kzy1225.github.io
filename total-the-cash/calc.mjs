export const DENOMS = Object.freeze([10000,5000,2000,1000,500,100,50,10,5,1]);
export const MAX_COUNT = 1000000;

// Restricted arithmetic parser. Rational arithmetic avoids fractional rounding errors.
export function parseCount(raw) {
  const text = String(raw).trim();
  if (!text) return {value:0,error:null};
  if(text.length>80 || !/^[0-9+\-*/().\s]+$/.test(text)) return {value:null,error:'数字と + − * / ( ) の式を80文字以内で入力してください。'};
  const tokens=text.match(/(?:\d+(?:\.\d*)?|\.\d+)|[+\-*/()]/g) || [];
  if(tokens.join('')!==text.replace(/\s/g,'')) return {value:null,error:'計算式を確認してください。'};
  let cursor=0;
  const number=()=>{
    const token=tokens[cursor++];
    if(token==='+' || token==='-') { const r=number(); return [token==='-'?-r[0]:r[0],r[1]]; }
    if(token==='(') { const r=expression(); if(tokens[cursor++]!==')') throw Error('式のかっこを確認してください。'); return r; }
    if(!token || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) throw Error('計算式を完成させてください。');
    const [whole,decimal='']=token.split('.'); return [BigInt((whole||'0')+decimal),10n**BigInt(decimal.length)];
  };
  const term=()=>{let a=number();while(['*','/'].includes(tokens[cursor])){const op=tokens[cursor++],b=number();if(op==='/'&&b[0]===0n)throw Error('0で割ることはできません。');a=op==='*'?[a[0]*b[0],a[1]*b[1]]:[a[0]*b[1],a[1]*b[0]];}return a;};
  const expression=()=>{let a=term();while(['+','-'].includes(tokens[cursor])){const op=tokens[cursor++],b=term();a=[a[0]*b[1]+(op==='+'?1n:-1n)*b[0]*a[1],a[1]*b[1]];}return a;};
  try {
    const [n,d]=expression();
    if(cursor!==tokens.length) throw Error('計算式を確認してください。');
    if(n%d!==0n || n/d<0n || n/d>BigInt(MAX_COUNT)) throw Error('枚数は0〜1,000,000の整数にしてください。');
    return {value:Number(n/d),error:null};
  } catch(e) {return {value:null,error:e.message};}
}

export function summarize(columns) {
  const rows=DENOMS.map((denom,index)=>{const count=columns.reduce((sum,column)=>sum+column[index],0);return {denom,count,amount:count*denom};});
  const byColumn=columns.map(column=>({count:column.reduce((s,n)=>s+n,0),amount:column.reduce((s,n,i)=>s+n*DENOMS[i],0)}));
  return {rows,byColumn,count:rows.reduce((s,r)=>s+r.count,0),amount:rows.reduce((s,r)=>s+r.amount,0)};
}
export function combine(columns, indices) {
  const unique=[...new Set(indices)].filter(i=>Number.isInteger(i)&&i>=0&&i<columns.length);
  return summarize(unique.map(i=>columns[i]));
}
export function pairTotals(columns) {
  const result=[];
  for(let a=0;a<columns.length;a++)for(let b=a+1;b<columns.length;b++)result.push({a,b,...combine(columns,[a,b])});
  return result;
}
