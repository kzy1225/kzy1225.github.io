import {DENOMS, parseCount, summarize, combine, pairTotals} from './calc.mjs';
const $=s=>document.querySelector(s);
const fmt=n=>n.toLocaleString('ja-JP');
const yen=n=>`${fmt(n)}円`;
const STORAGE='kzy1225.cash.v2';
const defaults=()=>({count:4,keyboard:true,columns:Array.from({length:8},(_,i)=>({name:`列${i+1}`,values:DENOMS.map(()=> '')})),selected:[0,1]});
let state=defaults(),active=null;
let storageAvailable=true;
try{
  const stored=JSON.parse(localStorage.getItem(STORAGE)||'null');
  if(stored && Array.isArray(stored.columns)){
    if(Number.isInteger(stored.count)&&stored.count>=1&&stored.count<=8)state.count=stored.count;
    if(typeof stored.keyboard==='boolean')state.keyboard=stored.keyboard;
    stored.columns.slice(0,8).forEach((col,i)=>{
      if(!col||typeof col!=='object')return;
      if(typeof col.name==='string')state.columns[i].name=col.name.slice(0,24);
      if(Array.isArray(col.values))col.values.slice(0,10).forEach((v,r)=>{if(typeof v==='string')state.columns[i].values[r]=v.slice(0,80);});
    });
    if(Array.isArray(stored.selected))state.selected=[...new Set(stored.selected)].filter(i=>Number.isInteger(i)&&i>=0&&i<state.count);
  }
}catch{storageAvailable=false;}
const name=i=>state.columns[i].name.trim()||`列${i+1}`;
function save(){
  try{localStorage.setItem(STORAGE,JSON.stringify(state));storageAvailable=true;}catch{storageAvailable=false;}
  $('#saveStatus').textContent=storageAvailable?'このブラウザーに自動保存済み · 入力データは送信しません':'保存できません。ページを閉じると入力が失われます。';
}
function cell(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function renderTable(){
  closeKeypad();
  const head=cell('tr');head.append(cell('th','券種'));
  for(let c=0;c<state.count;c++){
    const th=cell('th');th.scope='col';
    const input=document.createElement('input');input.className='column-name';input.value=state.columns[c].name;input.maxLength=24;input.dataset.col=c;input.setAttribute('aria-label',`列${c+1}の名前`);th.append(input);head.append(th);
  }
  head.append(cell('th','合計枚数'),cell('th','合計金額'));$('#sumTable thead').replaceChildren(head);
  const rows=DENOMS.map((d,r)=>{
    const tr=cell('tr');const th=cell('th',yen(d));th.scope='row';tr.append(th);
    for(let c=0;c<state.count;c++){
      const td=cell('td');const input=document.createElement('input');input.className='cash-input';input.id=`sc${c+1}_${d}`;input.type='text';input.maxLength=80;input.autocomplete='off';input.spellcheck=false;input.value=state.columns[c].values[r];input.placeholder='0';input.dataset.col=c;input.dataset.row=r;input.setAttribute('aria-label',`${name(c)}の${yen(d)}の枚数`);
      const amount=cell('span','0円','amt-label');amount.id=`lbl_${input.id}`;td.append(input,amount);tr.append(td);
    }
    const count=cell('td','0枚');count.id=`sum_total_${d}`;const amount=cell('td','0円','row-amount');amount.id=`sum_amt_${d}`;tr.append(count,amount);return tr;
  });$('#sumTable tbody').replaceChildren(...rows);
  const foot=cell('tr');foot.append(cell('th','列合計'));
  for(let c=0;c<state.count;c++){const total=cell('th','0円');total.id=`col_total_${c+1}`;foot.append(total);}
  const count=cell('th','0枚');count.id='sum_grand_count';const amount=cell('th','0円');amount.id='sum_grand_amt';foot.append(count,amount);$('#sumTable tfoot').replaceChildren(foot);
  $('#addColumn').disabled=state.count===8;$('#removeColumn').disabled=state.count===1;
  $('#colCountLabel').textContent=`${state.count}列`;
  $('#columnCount').textContent=`${state.count}列`;
  setKeyboard();renderChoices();updateAll();
}
function setKeyboard(){
  $('#keyboardToggle').checked=state.keyboard;
  $('#keyboardState').textContent=state.keyboard?'ON':'OFF';
  $('#keyboardHint').textContent=state.keyboard?'ON：画面のテンキーで入力。式もそのまま入力できます。':'OFF：端末のキーボードで入力。物理キーボードでは 10+5 や 50*2 などの式も使えます。';
  document.querySelectorAll('.cash-input').forEach(input=>{input.readOnly=state.keyboard;input.inputMode=state.keyboard?'none':'decimal';});
}
function renderChoices(){
  $('#columnChoices').replaceChildren(...Array.from({length:state.count},(_,i)=>{
    const label=cell('label',undefined,'column-choice');const input=document.createElement('input');input.type='checkbox';input.value=i;input.checked=state.selected.includes(i);input.setAttribute('aria-label',`${name(i)}を分析に含める`);label.append(input,cell('span',name(i)));return label;
  }));
}
function updateAll(){
  const errors=[];
  const columns=state.columns.slice(0,state.count).map((col,c)=>col.values.map((raw,r)=>{
    const parsed=parseCount(raw),input=$(`#sc${c+1}_${DENOMS[r]}`);
    input.setAttribute('aria-label',`${name(c)}の${yen(DENOMS[r])}の枚数`);
    input.setAttribute('aria-invalid',String(Boolean(parsed.error)));
    $(`#lbl_${input.id}`).textContent=parsed.error?'入力を確認':yen(parsed.value*DENOMS[r]);
    if(parsed.error)errors.push(`${name(c)}・${yen(DENOMS[r])}：${parsed.error}`);
    return parsed.value;
  }));
  const invalid=errors.length>0;
  $('#inputError').hidden=!invalid;
  $('#inputError').textContent=errors.slice(0,5).join('\n')+(errors.length>5?`\nほか${errors.length-5}件の入力も確認してください。`:'');
  const total=invalid?null:summarize(columns);
  $('#grandAmount').textContent=total?fmt(total.amount):'—';$('#grandCount').textContent=total?`${fmt(total.count)}枚`:'—';
  $('#sum_grand_count').textContent=total?`${fmt(total.count)}枚`:'—';$('#sum_grand_amt').textContent=total?yen(total.amount):'—';
  DENOMS.forEach((d,r)=>{$(`#sum_total_${d}`).textContent=total?`${fmt(total.rows[r].count)}枚`:'—';$(`#sum_amt_${d}`).textContent=total?yen(total.rows[r].amount):'—';});
  for(let c=0;c<state.count;c++)$(`#col_total_${c+1}`).textContent=total?yen(total.byColumn[c].amount):'—';
  updateAnalysis(invalid?null:columns);
  if(active){$('#keypadDisplay').textContent=active.value||'0';$('#keypadError').textContent=parseCount(active.value).error||'';}
  save();
}
function updateAnalysis(columns){
  const selected=state.selected.filter(i=>i<state.count);
  const total=columns?combine(columns,selected):null;
  $('#selectionNames').textContent=selected.length?selected.map(name).join(' ＋ '):'合計したい列を選んでください';
  $('#selectedAmount').textContent=total?fmt(total.amount):'—';$('#selectedCount').textContent=total?`${fmt(total.count)}枚`:'—';
  $('#selectedTable tbody').replaceChildren(...DENOMS.map((d,r)=>{const tr=cell('tr');tr.append(cell('th',yen(d)),cell('td',total?`${fmt(total.rows[r].count)}枚`:'—'),cell('td',total?yen(total.rows[r].amount):'—'));return tr;}));
  const pairs=columns?pairTotals(columns):[];
  if(!columns || state.count<2){const tr=cell('tr');const td=cell('td',columns?'2列以上にすると組み合わせを表示します。':'枚数の入力エラーを修正すると、分析を表示します。');td.colSpan=3;tr.append(td);$('#pairTable tbody').replaceChildren(tr);return;}
  $('#pairTable tbody').replaceChildren(...pairs.map(pair=>{const tr=cell('tr');tr.append(cell('td',`${name(pair.a)} ＋ ${name(pair.b)}`),cell('td',`${fmt(pair.count)}枚`),cell('td',yen(pair.amount)));return tr;}));
}
function closeKeypad(){if(active)active.classList.remove('active-input');active=null;$('#keypad').hidden=true;}
function positionKeypad(){
  if(!active)return;const box=$('#keypad'),rect=active.getBoundingClientRect(),bounds=box.getBoundingClientRect();
  let top=rect.bottom+8;if(top+bounds.height>innerHeight-8)top=rect.top-bounds.height-8;
  box.style.top=`${Math.max(8,Math.min(top,innerHeight-bounds.height-8))}px`;
  box.style.left=`${Math.max(8,Math.min(rect.left+rect.width/2-bounds.width/2,innerWidth-bounds.width-8))}px`;
}
function openKeypad(input){
  if(!state.keyboard)return;
  if(active && active!==input)active.classList.remove('active-input');active=input;input.classList.add('active-input');
  $('#keypadLabel').textContent=`${name(Number(input.dataset.col))} / ${yen(DENOMS[Number(input.dataset.row)])}`;
  $('#keypadDisplay').textContent=input.value||'0';$('#keypadError').textContent=parseCount(input.value).error||'';
  $('#keypad').hidden=false;positionKeypad();
}
function setActive(raw){
  if(!active)return;
  if(raw.length>80){$('#keypadError').textContent='入力できる式は80文字までです。';return;}
  active.value=raw;state.columns[Number(active.dataset.col)].values[Number(active.dataset.row)]=raw;updateAll();positionKeypad();
}
function keyInput(key){
  if(!active)return;let raw=active.value;
  if('+-*/'.includes(key)){
    if(!raw)return;
    raw=/[+\-*/]$/.test(raw)?raw.slice(0,-1)+key:raw+key;
  }else{raw+=key;}
  setActive(raw);
}
function commit(){
  if(!active)return;const parsed=parseCount(active.value);
  if(parsed.error){$('#keypadError').textContent=parsed.error;return;}
  const input=active;setActive(String(parsed.value));closeKeypad();input.focus();
  // Focus can reopen the dialog when the close button had focus.
  closeKeypad();
}
$('#sumTable').addEventListener('input',event=>{
  const el=event.target;
  if(el.classList.contains('cash-input')){state.columns[Number(el.dataset.col)].values[Number(el.dataset.row)]=el.value;updateAll();}
  if(el.classList.contains('column-name')){state.columns[Number(el.dataset.col)].name=el.value;renderChoices();updateAll();}
});
$('#sumTable').addEventListener('focusin',event=>{if(event.target.classList.contains('cash-input'))openKeypad(event.target);});
$('#sumTable').addEventListener('click',event=>{if(event.target.classList.contains('cash-input'))openKeypad(event.target);});
$('#sumTable').addEventListener('keydown',event=>{
  const input=event.target;if(!input.classList.contains('cash-input'))return;
  if(event.key==='Escape'){event.preventDefault();closeKeypad();return;}
  if(event.key==='Enter'){event.preventDefault();if(state.keyboard){openKeypad(input);commit();}else{const p=parseCount(input.value);if(!p.error){input.value=String(p.value);state.columns[Number(input.dataset.col)].values[Number(input.dataset.row)]=input.value;updateAll();}}return;}
  if(!state.keyboard||event.ctrlKey||event.metaKey||event.altKey)return;
  if(/^[0-9+\-*/().]$/.test(event.key)){event.preventDefault();openKeypad(input);keyInput(event.key);}
  else if(event.key==='Backspace'||event.key==='Delete'){event.preventDefault();openKeypad(input);setActive(event.key==='Delete'?'':active.value.slice(0,-1));}
});
$('#keypad').addEventListener('click',event=>{
  const button=event.target.closest('button');if(!button||!active)return;
  if(button.dataset.key!==undefined)keyInput(button.dataset.key);
  else if(button.dataset.adjust!==undefined){const p=parseCount(active.value);if(p.error){$('#keypadError').textContent='先に計算式を完成させてください。';return;}const value=Math.max(0,p.value+Number(button.dataset.adjust));if(value>1000000){$('#keypadError').textContent='上限は1,000,000枚です。';return;}setActive(String(value));}
  else if(button.dataset.action==='clear')setActive('');
  else if(button.dataset.action==='backspace')setActive(active.value.slice(0,-1));
  else if(button.dataset.action==='enter')commit();
});
$('#keypad').addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();const input=active;closeKeypad();input?.focus();closeKeypad();}});
$('#closeKeypad').addEventListener('click',()=>{const input=active;closeKeypad();input?.focus();closeKeypad();});
document.addEventListener('pointerdown',event=>{if(!event.target.closest('#keypad')&&!event.target.classList.contains('cash-input'))closeKeypad();});
window.addEventListener('resize',positionKeypad);
window.addEventListener('scroll',positionKeypad,{capture:true,passive:true});
$('#keyboardToggle').addEventListener('change',()=>{closeKeypad();state.keyboard=$('#keyboardToggle').checked;setKeyboard();save();});
$('#addColumn').addEventListener('click',()=>{if(state.count<8){state.count++;renderTable();}});
$('#removeColumn').addEventListener('click',()=>{if(state.count>1){state.count--;state.selected=state.selected.filter(i=>i<state.count);renderTable();}});
$('#columnChoices').addEventListener('change',event=>{const index=Number(event.target.value);state.selected=event.target.checked?[...new Set([...state.selected,index])]:state.selected.filter(i=>i!==index);state.selected.sort((a,b)=>a-b);updateAll();});
$('#selectAll').addEventListener('click',()=>{state.selected=Array.from({length:state.count},(_,i)=>i);renderChoices();updateAll();});
$('#selectNone').addEventListener('click',()=>{state.selected=[];renderChoices();updateAll();});
$('#reset').addEventListener('click',()=>{if(!confirm('非表示の列も含め、すべての枚数・列名・分析設定をリセットしますか？'))return;const keyboard=state.keyboard;state=defaults();state.keyboard=keyboard;renderTable();});
renderTable();
