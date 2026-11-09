// All monetary calculations use integer yen. Rules verified on 2026-10-20.
export const RULES = Object.freeze({
  checked: '2026-10-20', minDate: '2026-04-20', maxDate: '2027-03-31',
  changeDate: '2026-11-20', minimum: 200,
});

export function dailyLimit(date, store = 'standard') {
  if (store === 'plus') return 30000;
  if (store === 'beauty') return 10000;
  if (store === 'kokumin' && date >= RULES.changeDate) return 10000;
  return date >= RULES.changeDate ? 5000 : 30000;
}

export function taxFor(base, rate, rounding = 'floor') {
  const n = base * rate;
  if (rounding === 'ceil') return Math.floor((n + 99) / 100);
  if (rounding === 'round') return Math.floor((n + 50) / 100);
  return Math.floor(n / 100);
}

export function totals(items, rounding = 'floor') {
  const groups = [8, 10].map(rate => {
    const base = items.filter(item => item.rate === rate)
      .reduce((sum, item) => sum + item.price * item.qty, 0);
    return { rate, base, tax: taxFor(base, rate, rounding) };
  });
  const base = groups.reduce((sum, g) => sum + g.base, 0);
  const tax = groups.reduce((sum, g) => sum + g.tax, 0);
  return { groups, base, tax, gross: base + tax, count: items.reduce((s, i) => s + i.qty, 0) };
}

export function availablePoints(balance, used, date, store) {
  return Math.min(balance, Math.max(0, dailyLimit(date, store) - used));
}

export function capacity(points) {
  return points >= RULES.minimum ? Math.floor(points * 3 / 2) : points;
}

// Simulation assumption: value of integer points is rounded down to whole yen.
// Cash-minimizing mode rounds required points up; excess value is not refunded.
export function payment(gross, available, mode = 'ceil') {
  const bonus = available >= RULES.minimum && gross >= 300;
  let points;
  if (bonus) {
    const requested = mode === 'floor' ? Math.floor(gross * 2 / 3) : Math.ceil(gross * 2 / 3);
    points = Math.min(available, requested);
  } else {
    points = Math.min(available, gross);
  }
  const value = bonus ? Math.floor(points * 3 / 2) : points;
  const covered = Math.min(gross, value);
  return { points, covered, cash: gross - covered, bonus, gain: covered - points };
}

// Maximum standalone quantity, assuming cash-minimizing point use.
// Check the 300-yen threshold after searching, since the bonus is discontinuous.
export function maxQuantity(price, rate, points, rounding = 'floor') {
  if (price <= 0 || points <= 0) return 0;
  const gross = qty => price * qty + taxFor(price * qty, rate, rounding);
  const search = budget => {
    let lo = 0, hi = Math.floor(budget / price) + 1;
    while (lo + 1 < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (gross(mid) <= budget) lo = mid;
      else hi = mid;
    }
    return lo;
  };
  const qty = search(capacity(points));
  return gross(qty) < 300 ? search(points) : qty;
}
