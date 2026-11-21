import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, allocate, applyPayout, payoutToCover, moveMoney, sendMoney, nextDay, accountTotal,
  money, days, nextBill, setRule, extraMoney, moveAvailable, roomInPot,
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
