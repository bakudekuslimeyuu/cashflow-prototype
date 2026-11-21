// CashFlow allocation rules. Pure functions: no React, no side effects.
//
// The rule (same as the IS419 report):
//   1. Keep a minimum in the Main Account to spend.
//   2. Anything above that is "extra money". A share of it is set aside.
//   3. Bills are filled first, earliest due date first, only up to what is still needed.
//   4. Whatever is left goes to the Emergency Pocket.

export const r2 = (n) => Math.round(n * 100) / 100;

export const money = (n) =>
  'S$' + r2(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

export const MAIN_ACCOUNT_MASKED = '•••• 123-4'; // made-up number for the prototype

export function initialState() {
  return {
    spendable: 130,
    emergency: 20,
    minimum: 150,
    share: 0.5,
    bills: [
      { id: 'phone', name: 'Phone bill', due: 4, amount: 10, saved: 0 },
      { id: 'insure', name: 'Vehicle insurance', due: 9, amount: 20, saved: 0 },
    ],
    activity: [
      {
        id: 0,
        title: 'Grab earnings cash-out',
        detail: 'Yesterday · all kept spendable (below your S$150 minimum)',
        amount: 38,
        sign: '+',
      },
    ],
    nextId: 1,
  };
}

const byDue = (bills) => [...bills].sort((a, b) => a.due - b.due);

export const billsSaved = (s) => r2(s.bills.reduce((t, b) => t + b.saved, 0));
export const pocketsTotal = (s) => r2(billsSaved(s) + s.emergency);
export const accountTotal = (s) => r2(s.spendable + pocketsTotal(s));

export function nextBill(s) {
  return byDue(s.bills.filter((b) => b.saved < b.amount))[0] || null;
}

// Part of a payout above the minimum (never more than the payout itself).
export const extraMoney = (s, payout) =>
  r2(Math.min(payout, Math.max(0, s.spendable + payout - s.minimum)));

// How a payout would be split, without changing state.
export function allocate(s, payout) {
  const before = s.spendable;
  const total = r2(before + payout);
  // Only the part of this payout that lands above the minimum is extra money.
  // Money already in the Main Account is never pulled into pockets.
  const extra = extraMoney(s, payout);
  let left = r2(extra * s.share);
  const toBills = [];
  for (const b of byDue(s.bills)) {
    const need = r2(b.amount - b.saved);
    if (need <= 0 || left <= 0) continue;
    const put = r2(Math.min(need, left));
    toBills.push({ id: b.id, name: b.name, amount: put });
    left = r2(left - put);
  }
  const billsSum = r2(toBills.reduce((t, x) => t + x.amount, 0));
  const toEmergency = left;
  const keep = r2(payout - billsSum - toEmergency);
  return { payout, before, total, extra, toBills, billsSum, toEmergency, keep };
}

// Smallest payout that would fully cover this bill (bills due earlier are filled first).
export function payoutToCover(s, bill) {
  let needed = 0;
  for (const b of byDue(s.bills)) {
    needed += Math.max(0, b.amount - b.saved);
    if (b.id === bill.id) break;
  }
  if (needed <= 0) return 0;
  return r2(needed / s.share + Math.max(0, s.minimum - s.spendable));
}

function log(s, entry) {
  return { ...s, activity: [{ id: s.nextId, ...entry }, ...s.activity], nextId: s.nextId + 1 };
}

// ---- State transitions (used by the reducer) ----

export function applyPayout(s, amount, source = 'Grab earnings cash-out') {
  const res = allocate(s, amount);
  const bills = s.bills.map((b) => {
    const hit = res.toBills.find((x) => x.id === b.id);
    return hit ? { ...b, saved: r2(b.saved + hit.amount) } : b;
  });
  const aside = r2(res.billsSum + res.toEmergency);
  const next = {
    ...s,
    spendable: r2(s.spendable + res.keep),
    emergency: r2(s.emergency + res.toEmergency),
    bills,
  };
  return log(next, {
    title: source,
    sign: '+',
    amount,
    detail:
      aside > 0
        ? `${money(res.keep)} spendable · ${money(res.billsSum)} to bills · ${money(res.toEmergency)} to emergency`
        : `All kept spendable (below your ${money(s.minimum)} minimum)`,
  });
}

export const potBalance = (s, potId) =>
  potId === 'emergency' ? s.emergency : s.bills.find((b) => b.id === potId)?.saved ?? 0;

export const potName = (s, potId) =>
  potId === 'emergency' ? 'Emergency Pocket' : `${s.bills.find((b) => b.id === potId)?.name} Pocket`;

// direction 'back' = pocket -> Main Account, 'into' = Main Account -> pocket
export function moveMoney(s, potId, amount, direction) {
  const avail = direction === 'back' ? potBalance(s, potId) : s.spendable;
  if (!(amount > 0) || amount > avail) return s;
  const sign = direction === 'back' ? 1 : -1;
  const next = {
    ...s,
    spendable: r2(s.spendable + sign * amount),
    emergency: potId === 'emergency' ? r2(s.emergency - sign * amount) : s.emergency,
    bills: s.bills.map((b) => (b.id === potId ? { ...b, saved: r2(b.saved - sign * amount) } : b)),
  };
  const name = potName(s, potId);
  return log(next, {
    title: direction === 'back' ? 'Moved back to Main Account' : 'Moved into pocket',
    detail: direction === 'back' ? `From ${name}` : `To ${name}`,
    amount,
    sign: '',
  });
}

export function sendMoney(s, amount, to) {
  if (!(amount > 0) || amount > s.spendable) return s;
  return log(
    { ...s, spendable: r2(s.spendable - amount) },
    { title: `Sent to ${to}`, detail: 'From Main Account', amount, sign: '−' }
  );
}

export function setRule(s, minimum, share) {
  return { ...s, minimum, share };
}

// Moves the demo one day forward. Bills that reach day 0 are paid from their pocket first,
// then from the Main Account. The Main Account never goes below S$0: if both together
// can't cover the bill, it is paid as far as possible and the shortfall is shown.
export function nextDay(s) {
  let next = { ...s, bills: s.bills.map((b) => ({ ...b, due: Math.max(0, b.due - 1) })) };
  const paid = [];
  for (const b of next.bills.filter((x) => x.due === 0)) {
    const fromPot = Math.min(b.saved, b.amount);
    const fromMain = r2(Math.min(b.amount - fromPot, next.spendable));
    const short = r2(b.amount - fromPot - fromMain);
    const amountPaid = r2(fromPot + fromMain);
    next = { ...next, spendable: r2(next.spendable - fromMain) };
    next = log(next, {
      title: amountPaid === 0 ? `${b.name} not paid` : short > 0 ? `${b.name} only partly paid` : `${b.name} paid`,
      detail:
        amountPaid === 0
          ? `${money(short)} short · nothing set aside and Main Account is empty`
          : short > 0
          ? `${money(short)} short · ${money(fromPot)} from pocket, ${money(fromMain)} from Main Account`
          : fromMain > 0
            ? `${money(fromPot)} from pocket, ${money(fromMain)} from Main Account`
            : 'Paid in full from its pocket',
      amount: amountPaid,
      sign: '−',
    });
    paid.push({ ...b, short });
  }
  return { next: { ...next, bills: next.bills.filter((b) => b.due > 0) }, paid };
}
