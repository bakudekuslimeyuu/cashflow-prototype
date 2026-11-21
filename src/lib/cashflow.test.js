import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, allocate, applyPayout, payoutToCover, moveMoney, sendMoney, nextDay, accountTotal,
  money, days, nextBill, setRule, extraMoney, moveAvailable, roomInPot, r2, potName, potBalance,
} from './cashflow.js';

test('S$120 payout matches the report worked example', () => {
  const r = allocate(initialState(), 120);
  assert.equal(r.extra, 100);
  assert.equal(r.keep, 70);
  assert.equal(r.billsSum, 30);
  assert.equal(r.toEmergency, 20);
  assert.equal(r.before + r.keep, 200);
});

test('slow day below the minimum sets nothing aside', () => {
  const s = { ...initialState(), spendable: 100 };
  const r = allocate(s, 40);
  assert.equal(r.billsSum + r.toEmergency, 0);
  assert.equal(r.keep, 40);
});

test('bills are filled earliest due first', () => {
  const r = allocate(initialState(), 61);
  assert.deepEqual(r.toBills.map((b) => b.id), ['phone', 'insure']);
  assert.equal(r.toBills[0].amount, 10);
});

test('early warning amount covers the next bill', () => {
  const s = initialState();
  const p = payoutToCover(s, s.bills[0]);
  assert.equal(p, 40);
  const after = applyPayout(s, p);
  assert.equal(after.bills[0].saved, 10);
});

test('moving money never changes the account total', () => {
  let s = applyPayout(initialState(), 120);
  const total = accountTotal(s);
  s = moveMoney(s, 'emergency', 5, 'back');
  assert.equal(accountTotal(s), total);
  s = moveMoney(s, 'phone', 10, 'back');
  assert.equal(accountTotal(s), total);
});

test('cannot move or send more than is available', () => {
  const s = initialState();
  assert.equal(moveMoney(s, 'emergency', 999, 'back'), s);
  assert.equal(sendMoney(s, 999, 'x'), s);
});

test('a second payout never pulls existing money into pockets', () => {
  const s = applyPayout(initialState(), 120); // Main Account now S$200
  const r = allocate(s, 40);
  assert.equal(r.extra, 40);
  assert.ok(r.keep >= 0);
  assert.equal(r.keep + r.billsSum + r.toEmergency, 40);
});

test('payout needed to cover a bill when already above the minimum', () => {
  const s = { ...initialState(), spendable: 200 };
  const p = payoutToCover(s, s.bills[0]);
  assert.equal(p, 20);
  assert.equal(applyPayout(s, p).bills[0].saved, 10);
});

test('Main Account never goes below zero when a bill is due', () => {
  let s = { ...initialState(), spendable: 4 };
  let paid;
  for (let i = 0; i < 4; i++) ({ next: s, paid } = nextDay(s));
  assert.equal(s.spendable, 0);
  assert.equal(paid[0].short, 6);
});

test('a bill pocket cannot be filled past its bill', () => {
  const s = initialState(); // Phone bill S$10, nothing saved
  assert.equal(moveMoney(s, 'phone', 15, 'into'), s);
  const ok = moveMoney(s, 'phone', 10, 'into');
  assert.equal(ok.bills.find((b) => b.id === 'phone').saved, 10);
  assert.equal(moveMoney(ok, 'phone', 1, 'into'), ok);
});

test('no money vanishes when an overfilled pocket pays its bill', () => {
  let s = initialState();
  s = { ...s, bills: s.bills.map((b) => (b.id === 'phone' ? { ...b, saved: 15 } : b)) };
  const total = accountTotal(s);
  for (let i = 0; i < 4; i++) s = nextDay(s).next;
  assert.equal(accountTotal(s), total - 10);
});

test('a bill is paid from its pocket when due', () => {
  let s = applyPayout(initialState(), 120);
  for (let i = 0; i < 4; i++) s = nextDay(s).next;
  assert.equal(s.bills.find((b) => b.id === 'phone'), undefined);
  assert.equal(s.spendable, 200);
});

// ---------------------------------------------------------------------------
// Extra coverage: formatting, rule settings, bill order, moves, sends, days.
// ---------------------------------------------------------------------------

const withBill = (s, id, patch) => ({ ...s, bills: s.bills.map((b) => (b.id === id ? { ...b, ...patch } : b)) });

test('1. money shows two decimals and thousands separators', () => {
  assert.equal(money(10), 'S$10.00');
  assert.equal(money(1234.5), 'S$1,234.50');
  assert.equal(money(0), 'S$0.00');
});

test('2. days uses singular for one day', () => {
  assert.equal(days(1), '1 day');
  assert.equal(days(4), '4 days');
});

test('3. payout landing exactly on the minimum sets nothing aside', () => {
  const r = allocate(initialState(), 20); // 130 + 20 = 150
  assert.equal(r.extra, 0);
  assert.equal(r.keep, 20);
  assert.equal(r.billsSum + r.toEmergency, 0);
});

test('4. one cent above the minimum is extra money', () => {
  const s = setRule(initialState(), 150, 1);
  const r = allocate(s, 20.01);
  assert.equal(r.extra, 0.01);
  assert.deepEqual(r.toBills, [{ id: 'phone', name: 'Phone bill', amount: 0.01 }]);
  assert.equal(r.keep, 20);
});

test('5. 100% share sets all extra aside, bills then emergency', () => {
  const r = allocate(setRule(initialState(), 150, 1), 120);
  assert.equal(r.billsSum, 30);
  assert.equal(r.toEmergency, 70);
  assert.equal(r.keep, 20);
});

test('6. 25% share fills the phone bill then part of insurance', () => {
  const r = allocate(setRule(initialState(), 150, 0.25), 120);
  assert.deepEqual(r.toBills.map((b) => [b.id, b.amount]), [['phone', 10], ['insure', 15]]);
  assert.equal(r.toEmergency, 0);
  assert.equal(r.keep, 95);
});

test('7. a S$0 minimum treats the whole payout as extra', () => {
  const s = setRule(initialState(), 0, 0.5);
  assert.equal(extraMoney(s, 40), 40);
  const r = allocate(s, 40);
  assert.equal(r.billsSum, 20);
  assert.equal(r.keep, 20);
});

test('8. bills are filled by due date even if listed out of order', () => {
  const s = { ...initialState(), bills: [...initialState().bills].reverse() };
  assert.equal(allocate(s, 61).toBills[0].id, 'phone');
});

test('9. a full bill pocket is skipped and the rest goes on', () => {
  const s = withBill(initialState(), 'phone', { saved: 10 });
  const r = allocate(s, 120);
  assert.deepEqual(r.toBills.map((b) => b.id), ['insure']);
  assert.equal(r.toEmergency, 30);
  assert.equal(r.keep, 70);
});

test('10. a payout adds exactly its amount and is logged first', () => {
  const s = initialState();
  const after = applyPayout(s, 120, 'PayNow top-up');
  assert.equal(accountTotal(after), accountTotal(s) + 120);
  assert.equal(after.activity[0].title, 'PayNow top-up');
  assert.equal(after.activity[0].sign, '+');
  assert.equal(after.activity[0].amount, 120);
});

test('11. warning for the second bill counts the first bill too', () => {
  const s = initialState();
  const insure = s.bills.find((b) => b.id === 'insure');
  const p = payoutToCover(s, insure);
  assert.equal(p, 80);
  assert.equal(applyPayout(s, p).bills.find((b) => b.id === 'insure').saved, 20);
});

test('12. warning amount at a 25% share when above the minimum', () => {
  const s = setRule({ ...initialState(), spendable: 200 }, 150, 0.25);
  const p = payoutToCover(s, s.bills[0]);
  assert.equal(p, 40);
  assert.equal(applyPayout(s, p).bills[0].saved, 10);
});

test('13. nextBill skips covered bills and is null when all are covered', () => {
  let s = withBill(initialState(), 'phone', { saved: 10 });
  assert.equal(nextBill(s).id, 'insure');
  s = withBill(s, 'insure', { saved: 20 });
  assert.equal(nextBill(s), null);
});

test('14. moving back from the Emergency Pocket is logged', () => {
  const s = moveMoney(initialState(), 'emergency', 5, 'back');
  assert.equal(s.spendable, 135);
  assert.equal(s.emergency, 15);
  assert.equal(s.activity[0].title, 'Moved back to Main Account');
});

test('15. zero or negative amounts are rejected', () => {
  const s = initialState();
  assert.equal(moveMoney(s, 'emergency', 0, 'back'), s);
  assert.equal(moveMoney(s, 'emergency', -5, 'into'), s);
  assert.equal(sendMoney(s, 0, 'x'), s);
  assert.equal(sendMoney(s, -1, 'x'), s);
});

test('16. the Emergency Pocket has no limit, bills do', () => {
  const s = initialState();
  assert.equal(roomInPot(s, 'emergency'), Infinity);
  assert.equal(moveAvailable(s, 'emergency', 'into'), 130);
  assert.equal(moveAvailable(s, 'insure', 'into'), 20);
  assert.equal(moveMoney(s, 'emergency', 130, 'into').spendable, 0);
});

test('17. sending the whole balance and cents works exactly', () => {
  assert.equal(sendMoney(initialState(), 130, 'x').spendable, 0);
  assert.equal(sendMoney(initialState(), 30.33, 'x').spendable, 99.67);
});

test('18. a quiet day only moves due dates closer', () => {
  const { next, paid } = nextDay(initialState());
  assert.equal(paid.length, 0);
  assert.deepEqual(next.bills.map((b) => b.due), [3, 8]);
  assert.equal(accountTotal(next), accountTotal(initialState()));
});

test('19. a half-filled bill is topped up from the Main Account', () => {
  let s = withBill(initialState(), 'phone', { saved: 4 });
  for (let i = 0; i < 4; i++) s = nextDay(s).next;
  assert.equal(s.spendable, 124);
  assert.match(s.activity[0].detail, /S\$4\.00 from pocket, S\$6\.00 from Main Account/);
});

test('20. two bills due the same day are both paid, nothing touched', () => {
  const s = {
    ...initialState(),
    bills: [
      { id: 'phone', name: 'Phone bill', due: 1, amount: 10, saved: 10 },
      { id: 'insure', name: 'Vehicle insurance', due: 1, amount: 20, saved: 20 },
    ],
  };
  const { next, paid } = nextDay(s);
  assert.equal(paid.length, 2);
  assert.ok(paid.every((b) => b.short === 0));
  assert.equal(next.spendable, 130);
  assert.equal(next.bills.length, 0);
});

// ---------------------------------------------------------------------------
// Round 3: rounding, immutability, activity log, sequences, pockets, bill days.
// ---------------------------------------------------------------------------

test('21. r2 rounds to the nearest cent', () => {
  assert.equal(r2(1.239), 1.24);
  assert.equal(r2(1.231), 1.23);
  assert.equal(r2(10), 10);
});

test('22. money handles millions and rounds up into the next thousand', () => {
  assert.equal(money(1234567.891), 'S$1,234,567.89');
  assert.equal(money(999.999), 'S$1,000.00');
});

test('23. every reset starts from a fresh, separate state', () => {
  const a = initialState();
  a.bills[0].saved = 99;
  a.activity.push({ id: 9 });
  const b = initialState();
  assert.equal(b.bills[0].saved, 0);
  assert.equal(b.activity.length, 1);
});

test('24. previewing a split does not change the wallet', () => {
  const s = initialState();
  const copy = JSON.parse(JSON.stringify(s));
  allocate(s, 120);
  assert.deepEqual(s, copy);
});

test('25. applying a payout leaves the old state untouched', () => {
  const s = initialState();
  const copy = JSON.parse(JSON.stringify(s));
  applyPayout(s, 120);
  assert.deepEqual(s, copy);
});

test('26. activity ids keep counting up', () => {
  const s = applyPayout(applyPayout(initialState(), 120), 40);
  assert.deepEqual(s.activity.slice(0, 2).map((a) => a.id), [2, 1]);
  assert.equal(s.nextId, 3);
});

test('27. payout activity spells out the split', () => {
  const s = applyPayout(initialState(), 120);
  assert.equal(s.activity[0].detail, 'S$70.00 spendable · S$30.00 to bills · S$20.00 to emergency');
});

test('28. payout below the minimum says it was all kept', () => {
  const s = applyPayout(initialState(), 10);
  assert.equal(s.activity[0].detail, 'All kept spendable (below your S$150.00 minimum)');
  assert.equal(s.spendable, 140);
});

test('29. two payouts in a row: S$120 then S$40', () => {
  const s = applyPayout(applyPayout(initialState(), 120), 40);
  assert.equal(s.spendable, 220);
  assert.equal(s.emergency, 60);
  assert.ok(s.bills.every((b) => b.saved === b.amount));
  assert.equal(accountTotal(s), 310);
});

test('30. payout into an empty Main Account keeps up to the minimum first', () => {
  const r = allocate({ ...initialState(), spendable: 0 }, 200);
  assert.equal(r.extra, 50);
  assert.deepEqual(r.toBills.map((b) => [b.id, b.amount]), [['phone', 10], ['insure', 15]]);
  assert.equal(r.toEmergency, 0);
  assert.equal(r.keep, 175);
});

test('31. every split adds up to the payout and nothing is negative', () => {
  for (const amt of [0.01, 7.5, 19.99, 20, 61, 120, 999.99]) {
    const r = allocate(initialState(), amt);
    assert.equal(r2(r.keep + r.billsSum + r.toEmergency), amt, `payout ${amt}`);
    assert.ok(r.keep >= 0 && r.billsSum >= 0 && r.toEmergency >= 0, `payout ${amt}`);
  }
});

test('32. no payout is needed for a bill that is already covered', () => {
  const s = withBill(initialState(), 'phone', { saved: 10 });
  assert.equal(payoutToCover(s, s.bills[0]), 0);
});

test('33. warning amount at a 100% share below the minimum', () => {
  const s = setRule(initialState(), 150, 1);
  const p = payoutToCover(s, s.bills[0]);
  assert.equal(p, 30);
  assert.equal(applyPayout(s, p).bills[0].saved, 10);
});

test('34. a payout just under the warning amount does not fully cover the bill', () => {
  const s = initialState(); // warning says S$40
  assert.ok(applyPayout(s, 39.98).bills[0].saved < 10);
});

test('35. extra money is never negative and never more than the payout', () => {
  for (const spendable of [0, 100, 150, 200]) {
    for (const payout of [1, 50, 300]) {
      const e = extraMoney({ ...initialState(), spendable }, payout);
      assert.ok(e >= 0 && e <= payout, `spendable ${spendable}, payout ${payout}`);
    }
  }
});

test('36. pocket names', () => {
  const s = initialState();
  assert.equal(potName(s, 'emergency'), 'Emergency Pocket');
  assert.equal(potName(s, 'phone'), 'Phone bill Pocket');
});

test('37. pocket balances', () => {
  const s = withBill(initialState(), 'insure', { saved: 7 });
  assert.equal(potBalance(s, 'emergency'), 20);
  assert.equal(potBalance(s, 'insure'), 7);
});

test('38. an unknown pocket has no room and nothing to move', () => {
  const s = initialState();
  assert.equal(roomInPot(s, 'nope'), 0);
  assert.equal(moveAvailable(s, 'nope', 'into'), 0);
  assert.equal(moveMoney(s, 'nope', 5, 'into'), s);
});

test('39. moving into a bill pocket is logged', () => {
  const s = moveMoney(initialState(), 'phone', 6, 'into');
  assert.equal(s.bills[0].saved, 6);
  assert.equal(s.spendable, 124);
  assert.equal(s.activity[0].title, 'Moved into pocket');
  assert.equal(s.activity[0].detail, 'To Phone bill Pocket');
});

test('40. cannot take more out of a bill pocket than it holds', () => {
  const s = withBill(initialState(), 'phone', { saved: 4 });
  assert.equal(moveMoney(s, 'phone', 5, 'back'), s);
  assert.equal(moveMoney(s, 'phone', 4, 'back').spendable, 134);
});

test('41. filling a bill in two moves, then it is full', () => {
  let s = moveMoney(initialState(), 'phone', 4, 'into');
  s = moveMoney(s, 'phone', 6, 'into');
  assert.equal(s.bills[0].saved, 10);
  assert.equal(moveMoney(s, 'phone', 0.01, 'into'), s);
});

test('42. filling a bill by hand moves the warning to the next bill', () => {
  const s = moveMoney(initialState(), 'phone', 10, 'into');
  assert.equal(nextBill(s).id, 'insure');
});

test('43. sending money is logged', () => {
  const s = sendMoney(initialState(), 12.5, 'Hawker centre');
  const a = s.activity[0];
  assert.deepEqual(
    { title: a.title, detail: a.detail, amount: a.amount, sign: a.sign },
    { title: 'Sent to Hawker centre', detail: 'From Main Account', amount: 12.5, sign: '−' }
  );
});

test('44. sending money never touches the pockets', () => {
  const s0 = withBill(initialState(), 'phone', { saved: 10 });
  const s = sendMoney(s0, 100, 'x');
  assert.equal(s.emergency, s0.emergency);
  assert.deepEqual(s.bills, s0.bills);
});

test('45. changing the rule never moves money', () => {
  const s0 = applyPayout(initialState(), 120);
  const s = setRule(s0, 50, 0.75);
  assert.equal(s.spendable, s0.spendable);
  assert.equal(s.emergency, s0.emergency);
  assert.deepEqual(s.bills, s0.bills);
  assert.equal(s.minimum, 50);
  assert.equal(s.share, 0.75);
});

test('46. a lower minimum changes the next split', () => {
  const r = allocate(setRule(initialState(), 100, 0.5), 40);
  assert.equal(r.extra, 40);
  assert.deepEqual(r.toBills.map((b) => [b.id, b.amount]), [['phone', 10], ['insure', 10]]);
  assert.equal(r.keep, 20);
});

test('47. a fully saved bill is paid from its pocket only', () => {
  let s = withBill(initialState(), 'phone', { saved: 10 });
  for (let i = 0; i < 4; i++) s = nextDay(s).next;
  assert.equal(s.activity[0].title, 'Phone bill paid');
  assert.equal(s.activity[0].detail, 'Paid in full from its pocket');
  assert.equal(s.spendable, 130);
});

test('48. a bill with nothing saved and an empty Main Account is not paid', () => {
  let s = { ...initialState(), spendable: 0 };
  let paid;
  for (let i = 0; i < 4; i++) ({ next: s, paid } = nextDay(s));
  assert.equal(s.activity[0].title, 'Phone bill not paid');
  assert.equal(s.activity[0].sign, '');
  assert.equal(s.activity[0].amount, 0);
  assert.equal(paid[0].short, 10);
});

test('49. extra in an overfilled pocket goes back to the Main Account', () => {
  let s = withBill(initialState(), 'phone', { saved: 15 });
  for (let i = 0; i < 4; i++) s = nextDay(s).next;
  assert.equal(s.spendable, 135);
  assert.equal(accountTotal(s), 155);
});

test('50. nine days with no payouts: both bills come out of the Main Account', () => {
  let s = initialState();
  for (let i = 0; i < 9; i++) s = nextDay(s).next;
  assert.equal(s.spendable, 100);
  assert.equal(s.emergency, 20);
  assert.equal(s.bills.length, 0);
});
