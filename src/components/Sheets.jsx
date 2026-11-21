import { useState } from 'react';
import Sheet, { Seg, LockNote } from './Sheet.jsx';
import {
  money, r2, allocate, extraMoney, moveAvailable, roomInPot, potName, MAIN_ACCOUNT_MASKED,
} from '../lib/cashflow.js';

const num = (v) => r2(Number(v || 0));
const disabledStyle = (d) => ({ opacity: d ? 0.45 : 1 });

// ---------- Payout breakdown: shown right after money arrives ----------
export function BreakdownSheet({ result: res, source, minimum, share, onClose, onEditRule }) {
  const aside = r2(res.billsSum + res.toEmergency);
  const tot = res.payout || 1;
  return (
    <Sheet onClose={onClose}>
      <h3>{money(res.payout)} arrived</h3>
      <div className="cap" style={{ marginTop: -2 }}>{source}</div>
      <div className="lead">Here's where it went</div>
      <div className="stack">
        <i style={{ width: (res.keep / tot) * 100 + '%', background: '#fff' }} />
        <i style={{ width: (res.billsSum / tot) * 100 + '%', background: 'var(--green)' }} />
        <i style={{ width: (res.toEmergency / tot) * 100 + '%', background: 'var(--purple-soft)' }} />
      </div>
      <div className="split">
        <div className="r"><span><i className="sw" style={{ background: '#fff' }} />Stays in Main Account</span><span className="num">{money(res.keep)}</span></div>
        {res.toBills.map((b) => (
          <div className="r" key={b.id}><span><i className="sw" style={{ background: 'var(--green)' }} />{b.name} Pocket</span><span className="num">{money(b.amount)}</span></div>
        ))}
        {res.toEmergency > 0 && (
          <div className="r"><span><i className="sw" style={{ background: 'var(--purple-soft)' }} />Emergency Pocket</span><span className="num">{money(res.toEmergency)}</span></div>
        )}
      </div>
      <div className="why">
        {res.extra > 0 ? (
          <>Your Main Account had {money(res.before)}. With this payout that's {money(res.total)}. {res.extra === res.payout ? <>All of this payout is</> : <>{money(res.extra)} of this payout is</>} above your {money(minimum)} minimum. That's your <b>extra money</b>. {Math.round(share * 100)}% of it ({money(aside)}) went into your pockets, bills first.</>
        ) : (
          <>Your Main Account now has {money(res.total)}, which isn't above your {money(minimum)} minimum, so it all stays spendable.</>
        )}
      </div>
      <LockNote />
      <div className="btns">
        <button className="btn o" onClick={onEditRule}>Change my rule</button>
        <button className="btn" onClick={onClose}>Got it</button>
      </div>
    </Sheet>
  );
}

// ---------- Add Money ----------
export function AddMoneySheet({ state, onClose, onConfirm }) {
  const [source, setSource] = useState('Grab earnings cash-out');
  const [amt, setAmt] = useState('');
  const a = num(amt);
  let hint = '';
  if (a > 0) {
    const r = allocate(state, a);
    const aside = r2(r.billsSum + r.toEmergency);
    hint = r.extra > 0
      ? `With your rule: ${money(r.keep)} stays spendable, ${money(aside)} goes to your pockets.`
      : `With your rule: all ${money(a)} stays spendable (you're below your ${money(state.minimum)} minimum).`;
  }
  return (
    <Sheet onClose={onClose}>
      <h3>Add Money</h3>
      <div className="lead">Money added to your Main Account. CashFlow sets aside part of it automatically.</div>
      <label className="f">From</label>
      <Seg cols={2} value={source} onChange={setSource}
        options={[{ value: 'Grab earnings cash-out', label: 'Grab earnings' }, { value: 'PayNow top-up', label: 'PayNow / bank' }]} />
      <label className="f">Amount (S$)</label>
      <div style={{ marginBottom: 8 }}>
        <Seg value={String(a)} onChange={setAmt}
          options={['40', '61', '120', '200'].map((v) => ({ value: v, label: 'S$' + v }))} />
      </div>
      <input type="number" min="0" step="1" inputMode="decimal" placeholder="Or type an amount"
        value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div className="hint">{hint}</div>
      <button className="btn" style={{ marginTop: 16, ...disabledStyle(!(a > 0)) }} disabled={!(a > 0)}
        onClick={() => onConfirm(a, source)}>Add money</button>
    </Sheet>
  );
}

// ---------- Move money between Main Account and pockets ----------
export function MoveSheet({ state, preset, presetDir, onClose, onConfirm }) {
  const pots = ['emergency', ...state.bills.map((b) => b.id)];
  const [dir, setDir] = useState(presetDir || 'back');
  const [pot, setPot] = useState(preset && pots.includes(preset) ? preset : 'emergency');
  const [amt, setAmt] = useState('');
  const a = num(amt);
  const avail = moveAvailable(state, pot, dir);
  const billFull = dir === 'into' && pot !== 'emergency' && roomInPot(state, pot) === 0;
  const ok = a > 0 && a <= avail;
  const main = <span style={{ whiteSpace: 'nowrap' }}>GXS Main Account <span className="muted">{MAIN_ACCOUNT_MASKED}</span></span>;
  const name = potName(state, pot);
  return (
    <Sheet onClose={onClose}>
      <h3>Move money</h3>
      <div className="lead">Your pockets and Main Account are all inside your GXS Savings Account. Moving is instant.</div>
      <Seg cols={2} value={dir} onChange={setDir}
        options={[{ value: 'back', label: 'Back to Main Account' }, { value: 'into', label: 'Into a pocket' }]} />
      <div className="split" style={{ marginTop: 14 }}>
        <div className="r"><span className="muted">From</span><span>{dir === 'back' ? name : main}</span></div>
        <div className="r"><span className="muted">To</span><span>{dir === 'back' ? main : name}</span></div>
      </div>
      <label className="f">Pocket</label>
      <select value={pot} onChange={(e) => setPot(e.target.value)}>
        {pots.map((p) => <option key={p} value={p}>{potName(state, p)}</option>)}
      </select>
      <label className="f">Amount (S$)</label>
      <input type="number" min="0" step="1" inputMode="decimal" placeholder="0" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div className="hint">
        {billFull ? `${name} is already full.`
          : a > avail ? `You can move up to ${money(avail)} here.`
          : dir === 'back' ? `Available in ${name}: ${money(avail)}`
          : pot === 'emergency' || avail === state.spendable ? `Available in Main Account: ${money(avail)}`
          : `${name} needs ${money(avail)} more to be full.`}
      </div>
      <button className="btn" style={{ marginTop: 16, ...disabledStyle(!ok) }} disabled={!ok}
        onClick={() => onConfirm(pot, a, dir)}>Move</button>
      <div className="hint" style={{ textAlign: 'center', marginTop: 12 }}>
        Moving is instant and stays inside your GXS Savings Account.
      </div>
    </Sheet>
  );
}

// ---------- Edit the rule ----------
export function RuleSheet({ state, onClose, onSave }) {
  const [min, setMin] = useState(state.minimum);
  const [share, setShare] = useState(state.share);
  const ex = 120;
  const sa = r2(extraMoney({ ...state, minimum: min }, ex) * share);
  return (
    <Sheet onClose={onClose}>
      <h3>My rule</h3>
      <div className="lead">You can change this any time.</div>
      <label className="f">Always keep this much to spend</label>
      <div className="stepper">
        <button onClick={() => setMin((m) => Math.max(0, m - 10))} aria-label="Less">−</button>
        <div className="v num">{money(min)}</div>
        <button onClick={() => setMin((m) => m + 10)} aria-label="More">＋</button>
      </div>
      <label className="f">Set aside this share of extra money</label>
      <Seg value={share} onChange={setShare}
        options={[0.25, 0.5, 0.75, 1].map((v) => ({ value: v, label: v * 100 + '%' }))} />
      <div className="hint">"Extra money" is the part of each new payout that takes your Main Account above the amount you keep to spend. Money already there is never moved. Bills are filled first, earliest due date first. Anything left goes to your Emergency Pocket.</div>
      <div className="why" style={{ marginTop: 12 }}>
        Example: a <b>{money(ex)}</b> payout today keeps {money(ex - sa)} in your Main Account and sets aside {money(sa)}.
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={() => onSave(min, share)}>Save rule</button>
    </Sheet>
  );
}

// ---------- Demo controls (for presenters, not part of the banking app) ----------
export function DemoSheet({ onClose, onPayout, onSpend, onNextDay, onReset }) {
  const custom = () => {
    const v = window.prompt('Payout amount (S$)', '75');
    if (v !== null && num(v) > 0) onPayout(num(v));
  };
  return (
    <Sheet onClose={onClose}>
      <div className="demo">
        <h3>Demo controls</h3>
        <div className="lead">For presenting. Not part of the banking app.</div>
        <h4>Grab earnings arrive</h4>
        <div className="grid">
          <button onClick={() => onPayout(120)}>S$120<small>A better day</small></button>
          <button onClick={() => onPayout(61)}>S$61<small>Typical day</small></button>
          <button onClick={() => onPayout(40)}>S$40<small>A slower day</small></button>
          <button onClick={custom}>Custom<small>Enter an amount</small></button>
        </div>
        <h4>Other</h4>
        <div className="grid">
          <button onClick={onSpend}>Spend S$30<small>Petrol &amp; food</small></button>
          <button onClick={onNextDay}>Next day<small>Bills get 1 day closer</small></button>
          <button style={{ gridColumn: 'span 2' }} onClick={onReset}>Reset to start<small>S$130 in Main Account, phone bill S$10 due in 4 days</small></button>
        </div>
      </div>
    </Sheet>
  );
}
