import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyLimit, availablePoints, capacity, totals, payment, maxQuantity } from './calc.mjs';

test('通常店舗の上限を2026年11月20日に切り替える', () => {
  assert.equal(dailyLimit('2026-10-20'), 30000);
  assert.equal(dailyLimit('2026-11-20'), 5000);
  assert.equal(dailyLimit('2027-03-20'), 5000);
});
test('例外店舗の上限と変更前のコクミン', () => {
  assert.equal(dailyLimit('2026-11-20', 'plus'), 30000);
  assert.equal(dailyLimit('2026-10-20', 'kokumin'), 30000);
  assert.equal(dailyLimit('2026-11-20', 'kokumin'), 10000);
  assert.equal(dailyLimit('2026-04-20', 'beauty'), 10000);
});
test('現在残高と当日使用済みを別々に扱い、負数を返さない', () => {
  assert.equal(availablePoints(10000, 4500, '2026-11-20', 'standard'), 500);
  assert.equal(availablePoints(100, 4500, '2026-11-20', 'standard'), 100);
  assert.equal(availablePoints(5000, 6000, '2026-11-20', 'standard'), 0);
});
test('200ptの境界と奇数ptの予算', () => {
  assert.equal(capacity(0), 0);
  assert.equal(capacity(199), 199);
  assert.equal(capacity(200), 300);
  assert.equal(capacity(201), 301);
});
test('税率ごとに合計し、個別商品を丸めない', () => {
  const bill = totals([{ price: 99, qty: 3, rate: 8 }, { price: 99, qty: 3, rate: 10 }]);
  assert.equal(bill.base, 594);
  assert.equal(bill.tax, 52); // floor(297*.08) + floor(297*.10)
  assert.equal(bill.gross, 646);
  assert.equal(bill.count, 6);
  assert.equal(totals([{ price: 99, qty: 1, rate: 8 }, { price: 99, qty: 2, rate: 8 }]).tax, 23);
});
test('税の端数処理を切り替える', () => {
  const items = [{ price: 99, qty: 1, rate: 8 }];
  assert.equal(totals(items, 'floor').gross, 106);
  assert.equal(totals(items, 'round').gross, 107);
  assert.equal(totals(items, 'ceil').gross, 107);
  assert.equal(totals([{ price: 101, qty: 1, rate: 8 }], 'round').gross, 109);
});
test('入力例：1,000pt、食品198円×3、日用品398円×2', () => {
  const bill = totals([{ price: 198, qty: 3, rate: 8 }, { price: 398, qty: 2, rate: 10 }]);
  assert.equal(bill.base, 1390);
  assert.equal(bill.tax, 126);
  assert.equal(bill.gross, 1516);
  const pay = payment(bill.gross, 1000);
  assert.equal(pay.points, 1000);
  assert.equal(pay.cash, 16);
  assert.equal(pay.gain, 500);
});
test('最低利用ptと税込300円の境界', () => {
  assert.deepEqual(payment(300, 200), { points: 200, covered: 300, cash: 0, bonus: true, gain: 100 });
  assert.equal(payment(300, 199).cash, 101);
  assert.equal(payment(299, 200).cash, 99);
  assert.equal(payment(299, 300).bonus, false);
  assert.equal(payment(299, 300).points, 299);
});
test('端数のポイント切上げと切捨て', () => {
  assert.equal(payment(301, 1000, 'ceil').points, 201);
  assert.equal(payment(301, 1000, 'ceil').cash, 0);
  assert.equal(payment(301, 1000, 'floor').points, 200);
  assert.equal(payment(301, 1000, 'floor').cash, 1);
  assert.equal(payment(302, 1000, 'ceil').points, 202);
  assert.equal(payment(302, 1000, 'ceil').covered, 302);
  assert.equal(payment(302, 1000, 'floor').cash, 1);
});
test('残高不足・上限到達・空の会計', () => {
  assert.equal(payment(10000, 5000).cash, 2500);
  assert.equal(payment(1000, 0).cash, 1000);
  assert.equal(payment(0, 1000).points, 0);
  assert.equal(totals([]).gross, 0);
});
test('買える最大個数と最低金額の落とし穴', () => {
  assert.equal(maxQuantity(198, 8, 1000), 7);
  assert.equal(maxQuantity(398, 10, 1000), 3);
  assert.equal(maxQuantity(250, 8, 200), 0); // 270円は1.5倍条件を満たさない
  assert.equal(maxQuantity(139, 8, 200), 2); // 2個なら税込300円
  assert.equal(maxQuantity(1, 10, 200), 273); // 税率別切捨て
  assert.equal(maxQuantity(0, 8, 1000), 0);
});
test('最大個数は現金0円、その次の個数には現金が必要', () => {
  for (const points of [0, 1, 199, 200, 201, 299, 300, 1000, 5000, 30000]) {
    for (const price of [1, 5, 99, 139, 198, 250, 278, 299, 398, 1500, 50000]) {
      for (const rate of [8, 10]) {
        for (const rounding of ['floor', 'round', 'ceil']) {
          const qty = maxQuantity(price, rate, points, rounding);
          const bill = q => totals([{ price, qty: q, rate }], rounding).gross;
          assert.equal(payment(bill(qty), points).cash, 0, `points=${points} price=${price} qty=${qty}`);
          assert.ok(payment(bill(qty + 1), points).cash > 0);
        }
      }
    }
  }
});
test('支払額の保存則とポイント超過がないこと', () => {
  for (const available of [0, 1, 199, 200, 201, 1000, 5000]) {
    for (let gross = 0; gross < 2000; gross++) {
      for (const mode of ['floor', 'ceil']) {
        const p = payment(gross, available, mode);
        assert.equal(p.covered + p.cash, gross);
        assert.ok(p.points <= available);
        assert.ok(p.cash >= 0 && p.gain >= 0);
        assert.ok(Number.isInteger(p.points) && Number.isInteger(p.cash));
        if (p.bonus) assert.ok(p.points >= 200);
      }
    }
  }
});
