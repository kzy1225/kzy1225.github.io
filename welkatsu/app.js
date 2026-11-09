import { RULES, dailyLimit, availablePoints, capacity, totals, payment, maxQuantity } from './calc.mjs';

const $ = selector => document.querySelector(selector);
const format = n => n.toLocaleString('ja-JP');
const yen = n => `${format(n)}円`;
const key = 'kzy1225.welkatsu.v1';
const fields = ['balance', 'date', 'store', 'used', 'point-mode', 'rounding', 'extra'];
let nextId = 1;
let initialized = false;

function nextShoppingDay() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = name => Number(parts.find(p => p.type === name).value);
  const date = new Date(Date.UTC(part('year'), part('month') - 1 + (part('day') > 20 ? 1 : 0), 20));
  return date.toISOString().slice(0, 10);
}

function addItem(data = {}) {
  const node = $('#item-template').content.firstElementChild.cloneNode(true);
  const id = nextId++;
  for (const name of ['name', 'price', 'rate', 'qty']) {
    const input = node.querySelector(`.item-${name}`);
    input.id = `item-${id}-${name}`;
    if (data[name] !== undefined) input.value = data[name];
  }
  node.querySelector('.remove').addEventListener('click', () => {
    const next = node.nextElementSibling || node.previousElementSibling;
    node.remove();
    if (!$('#items').children.length) addItem();
    (next?.querySelector('input') || $('#items input')).focus();
    update();
  });
  $('#items').append(node);
  return node;
}

function save() {
  if (!initialized) return;
  const state = { fields: Object.fromEntries(fields.map(id => [id, $(`#${id}`).value])),
    items: [...$('#items').children].map(node => Object.fromEntries(['name', 'price', 'rate', 'qty'].map(name => [name, node.querySelector(`.item-${name}`).value]))) };
  try {
    localStorage.setItem(key, JSON.stringify(state));
    $('#save-status').textContent = 'この端末に自動保存済み · 入力データは送信しません';
  } catch {
    $('#save-status').textContent = 'このブラウザーでは保存できません。計算はそのまま使えます。';
  }
}

function load() {
  $('#date').value = nextShoppingDay();
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null');
    if (stored && stored.fields && Array.isArray(stored.items)) {
      for (const id of fields) {
        if (typeof stored.fields[id] === 'string') $(`#${id}`).value = stored.fields[id];
      }
      // Do not silently reuse a shopping date already in the past.
      const todayJP = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());
      if ($('#date').value < todayJP) { $('#date').value = nextShoppingDay(); $('#used').value = '0'; }
      for (const item of stored.items.slice(0, 100)) {
        if (item && typeof item === 'object') addItem(item);
      }
    }
  } catch { /* A damaged/unavailable saved state must not prevent calculation. */ }
  if (!$('#items').children.length) addItem();
  initialized = true;
}

function update() {
  const errors = [];
  const readInteger = (input, label, allowBlank = false) => {
    input.removeAttribute('aria-invalid');
    if (allowBlank && input.value === '' && !input.validity.badInput) return null;
    const value = Number(input.value);
    if (input.value === '' || !input.validity.valid || !Number.isSafeInteger(value)) {
      input.setAttribute('aria-invalid', 'true');
      errors.push(`${label}は${format(Number(input.min))}〜${format(Number(input.max))}の整数で入力してください。`);
      return 0;
    }
    return value;
  };
  const balance = readInteger($('#balance'), '保有ポイント');
  const used = readInteger($('#used'), '当日使用済みポイント');
  const extra = readInteger($('#extra'), '対象外支払額');
  const date = $('#date').value;
  $('#date').removeAttribute('aria-invalid');
  if (!$('#date').validity.valid || !date.endsWith('-20')) {
    errors.push('買い物日は2026年4月〜2027年3月の20日を選択してください。');
    $('#date').setAttribute('aria-invalid', 'true');
  }
  const store = $('#store').value;
  if (!['standard', 'plus', 'kokumin', 'beauty'].includes(store)) errors.push('店舗を選択してください。');
  const rounding = $('#rounding').value;
  const mode = $('#point-mode').value;
  if (!['floor', 'round', 'ceil'].includes(rounding) || !['floor', 'ceil'].includes(mode)) errors.push('支払いの設定を選択してください。');
  const items = [];
  const nodes = [...$('#items').children];
  nodes.forEach((node, index) => {
    node.querySelector('.item-number').textContent = String(index + 1).padStart(2, '0');
    node.querySelector('.remove').setAttribute('aria-label', `商品${index + 1}を削除`);
    const price = readInteger(node.querySelector('.item-price'), `商品${index + 1}の税抜価格`, true);
    const qty = readInteger(node.querySelector('.item-qty'), `商品${index + 1}の個数`);
    const rate = Number(node.querySelector('.item-rate').value);
    if (![8, 10].includes(rate)) errors.push(`商品${index + 1}の税率を選択してください。`);
    items.push({ price: price ?? 0, qty: price === null ? 0 : qty, rate });
    node.querySelector('.item-subtotal').textContent = price === null ? '税抜小計 —' : `税抜小計 ${yen(price * qty)}`;
  });
  $('#errors').hidden = errors.length === 0;
  $('#errors').textContent = [...new Set(errors)].join('\n');
  $('#add').disabled = nodes.length >= 100;
  if (errors.length) {
    for (const id of ['capacity', 'gross', 'base', 'tax8', 'tax10', 'points', 'covered', 'remaining', 'extra-total', 'cash', 'mobile-cash', 'count']) $(`#${id}`).textContent = '—';
    $('#budget-detail').textContent = '入力内容をご確認ください';
    $('#limit-info').textContent = '';
    $('#result-message').textContent = '入力エラーを直すと計算結果が表示されます。';
    nodes.forEach(node => { node.querySelector('.item-max').textContent = 'この商品だけなら —'; });
    save();
    return;
  }
  const limit = dailyLimit(date, store);
  const available = availablePoints(balance, used, date, store);
  const bill = totals(items, rounding);
  const pay = payment(bill.gross, available, mode);
  $('#capacity').textContent = format(capacity(available));
  $('#budget-detail').textContent = available >= 200 ? `${format(available)}pt × 1.5倍（対象商品300円以上）` : `${format(available)}pt × 1円（200pt未満のため）`;
  $('#limit-info').textContent = `この日の上限 ${format(limit)}pt ／ 残り枠 ${format(Math.max(0, limit - used))}pt`;
  $('#gross').textContent = format(bill.gross);
  $('#count').textContent = `${format(bill.count)}点`;
  $('#base').textContent = yen(bill.base);
  $('#tax8').textContent = yen(bill.groups[0].tax);
  $('#tax10').textContent = yen(bill.groups[1].tax);
  $('#points').textContent = `${format(pay.points)}pt`;
  $('#covered').textContent = yen(pay.covered);
  $('#remaining').textContent = `${format(balance - pay.points)}pt`;
  $('#extra-total').textContent = yen(extra);
  $('#cash').textContent = format(pay.cash + extra);
  $('#mobile-cash').textContent = format(pay.cash + extra);
  let message;
  if (!bill.count) message = '税抜価格と個数を入力してください。';
  else if (pay.bonus) message = `1.5倍を適用した試算です。通常のポイント利用に比べて${yen(pay.gain)}分お得。`;
  else if (used >= limit) message = '当日の利用上限に達しています。今回は全額を現金などで支払う試算です。';
  else if (available < 200) message = '今回使えるポイントが200pt未満のため、1pt＝1円で試算しています。';
  else message = '対象商品の税込合計が300円未満のため、1pt＝1円で試算しています。';
  const blank = nodes.filter(node => node.querySelector('.item-price').value === '').length;
  if (blank) message += ` 価格未入力の${blank}行は合計に含めていません。`;
  if (used > limit) message += ' 使用済みptが選択した店舗の上限を超えています。店舗と日付をご確認ください。';
  $('#result-message').textContent = message;
  nodes.forEach((node, i) => {
    const item = items[i];
    node.querySelector('.item-max').textContent = item.price > 0
      ? `この商品だけなら 最大 ${format(maxQuantity(item.price, item.rate, available, rounding))}個`
      : 'この商品だけなら —';
  });
  save();
}

$('#calculator').addEventListener('submit', event => event.preventDefault());
$('#calculator').addEventListener('input', update);
$('#calculator').addEventListener('change', update);
$('#add').addEventListener('click', () => {
  if ($('#items').children.length >= 100) return;
  const item = addItem();
  update();
  item.querySelector('.item-name').focus();
});
$('#example').addEventListener('click', () => {
  if (!window.confirm('現在の入力を、1,000pt・食品198円×3個・日用品398円×2個の入力例に置き換えますか？')) return;
  $('#balance').value = '1000';
  $('#used').value = '0';
  $('#extra').value = '0';
  $('#date').value = nextShoppingDay();
  $('#store').value = 'standard';
  $('#rounding').value = 'floor';
  $('#point-mode').value = 'ceil';
  $('#items').replaceChildren();
  addItem({ name: '食品の例', price: 198, rate: 8, qty: 3 });
  addItem({ name: '日用品の例', price: 398, rate: 10, qty: 2 });
  update();
});
$('#reset').addEventListener('click', () => {
  if (!window.confirm('保存されたポイントと商品リストをリセットしますか？')) return;
  HTMLFormElement.prototype.reset.call($('#calculator'));
  $('#date').value = nextShoppingDay();
  $('#items').replaceChildren();
  addItem();
  update();
  $('#balance').focus();
});
load();
update();
