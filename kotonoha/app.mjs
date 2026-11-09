import {analyze} from './count.mjs';
const $ = id => document.getElementById(id);
let visible = 200, selected = -1, result;
try {
 const saved = JSON.parse(localStorage.getItem('kotonoha-v1'));
 if(saved){$('text').value=typeof saved.text==='string'?saved.text:'';$('mode').value=saved.mode==='weighted'?'weighted':'normal';$('target').value=[0,100,200].includes(saved.target)?saved.target:0;}
} catch {}
function render(){
 result=analyze($('text').value,$('mode').value);
 const {cells,total}=result,target=Number($('target').value),remaining=target-total;
 $('count').textContent=total;
 $('remaining').hidden=!target;
 $('remaining').textContent=remaining<0?`${-remaining}文字超過`:remaining===0?'目標達成':`あと${remaining}文字`;
 $('remaining').classList.toggle('over',remaining<0);
 $('weighted').hidden=$('mode').value!=='weighted';
 const fragment=document.createDocumentFragment();
 const length=Math.min(Math.max(100,Math.ceil(cells.length/20)*20,target),visible);
 for(let i=0;i<length;i++){
  const cell=cells[i],el=document.createElement(cell?'button':'div');
  el.className='cell'+(cell?'':' empty');
  const number=document.createElement('small');number.textContent=(i===selected||(i+1)%10===0)?i+1:'';number.setAttribute('aria-hidden','true');el.append(number);
  if(cell){el.append(/\s/u.test(cell.char)?'␣':cell.char);el.dataset.index=i;el.classList.toggle('selected',selected===i);el.classList.toggle('over',!!target&&cell.total>target);el.title=`${i+1}文字目「${cell.char}」・累計${cell.total}文字`;el.setAttribute('aria-label',el.title);}
  fragment.append(el);
 }
 $('grid').replaceChildren(fragment);$('more').hidden=cells.length<=visible;
}
function save(){try{localStorage.setItem('kotonoha-v1',JSON.stringify({text:$('text').value,mode:$('mode').value,target:Number($('target').value)}));$('saved').textContent='このブラウザに保存済み';}catch{$('saved').textContent='自動保存できません。コピーして保存してください。';}}
function update(){selected=-1;$('position').textContent='マスを選んで文字位置を確認';render();save();}
$('text').addEventListener('input',update);
$('mode').addEventListener('change',update);
$('target').addEventListener('change',update);
$('settings-toggle').onclick=()=>{const open=$('settings').hidden;$('settings').hidden=!open;$('settings-toggle').setAttribute('aria-expanded',String(open));};
$('grid').onclick=e=>{const button=e.target.closest('button[data-index]');if(!button)return;selected=Number(button.dataset.index);const cell=result.cells[selected];$('position').textContent=`${selected+1}文字目「${/\s/u.test(cell.char)?'空白':cell.char}」${$('mode').value==='weighted'?` · 累計 ${cell.total}文字`:''}`;$('text').focus({preventScroll:true});$('text').setSelectionRange(cell.start,cell.end);render();};
$('more').onclick=()=>{visible+=200;render();};
$('copy').onclick=async()=>{try{await navigator.clipboard.writeText($('text').value);$('copy').textContent='コピー済み';clearTimeout(window.copyTimer);window.copyTimer=setTimeout(()=>$('copy').textContent='コピー',1800);}catch{$('text').focus();$('text').select();$('position').textContent='本文を選択しました。端末のコピー操作を使ってください。';}};
render();
