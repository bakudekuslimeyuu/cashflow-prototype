import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  initialState, allocate, applyPayout, payoutToCover, moveMoney, sendMoney, nextDay, accountTotal,
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
