import { money, nextBill, payoutToCover, pocketsTotal, billsSaved } from '../lib/cashflow.js';
import { LockNote } from './Sheet.jsx';
import { TxList } from './TxList.jsx';

// The CashFlow feature screen inside the GXS app.
export default function CashFlowScreen({ state, onBack, onMove, onRule }) {
  const nb = nextBill(state);
  const pockets = pocketsTotal(state);

  let warn;
  if (!nb) warn = { ok: true, icon: '✓', title: "You're ready for your bills", text: 'Everything due in the next two weeks is set aside.' };
  else {
    const short = nb.amount - nb.saved;
    const p = payoutToCover(state, nb);
    warn =
      nb.due <= 5
        ? { ok: false, icon: '⚠️', title: `${nb.name} is ${money(short)} short, due in ${nb.due} days`, text: `A payout of ${money(p)} or more covers it. Or set it aside now.` }
        : { ok: true, icon: 'ℹ️', title: `Next: ${nb.name} in ${nb.due} days`, text: `${money(short)} still to set aside. A payout of ${money(p)} or more covers it.` };
  }

  return (
    <div className="screen">
      <div className="head">
        <button className="ib" onClick={onBack} aria-label="Back">‹</button>
        <div className="t">CashFlow</div>
        <span className="ib bell" style={{ fontSize: 18 }}>🔔︎</span>
      </div>
      <div className="wrap">
        <div className="card">
          <div className="cap">Safe to spend · Main Account</div>
          <div className="big num" style={{ fontSize: 30, fontWeight: 700, marginTop: 3 }}>{money(state.spendable)}</div>
          <div className="sub">
            {state.spendable < state.minimum
              ? `Below your ${money(state.minimum)} minimum, so nothing is set aside until you earn more.`
              : `${money(pockets)} is set aside in your pockets below. Same account, same bank.`}
          </div>
        </div>
        <div className="gap" />
        <div className={'warn' + (warn.ok ? ' ok' : '')}>
          <span>{warn.icon}</span>
          <div><b>{warn.title}</b>{warn.text}</div>
        </div>
        <div className="gap" />
        <div className="two">
          <button className="btnc" onClick={() => onMove()}><div className="c">⇄</div>Move money</button>
          <button className="btnc" onClick={onRule}><div className="c">⚙</div>My rule</button>
        </div>
        <div className="gap" />
        <div className="card">
          <div className="sum"><b>Bill Pockets</b><span className="muted num">{money(billsSaved(state))}</span></div>
          {state.bills.length === 0 && <div className="sub">No bills coming up.</div>}
          {[...state.bills].sort((a, b) => a.due - b.due).map((b) => {
            const pct = Math.min(100, (b.saved / b.amount) * 100);
            const late = b.saved < b.amount && b.due <= 5;
            return (
              <div className="pk" key={b.id} style={{ cursor: 'pointer' }}
                onClick={() => onMove(b.id, b.saved > 0 ? 'back' : 'into')}>
                <div className="r"><span>{b.name}</span><span className="num">{money(b.saved)} / {money(b.amount)}</span></div>
                <div className={'bar' + (late ? ' w' : '')}><i style={{ width: pct + '%' }} /></div>
                <div className="m"><span>{Math.round(pct)}%</span><span>{b.saved >= b.amount ? 'Covered ✓' : `Due in ${b.due} days`}</span></div>
              </div>
            );
          })}
        </div>
        <div className="gap" />
        <div className="card" style={{ cursor: 'pointer' }} onClick={() => onMove('emergency', 'back')}>
          <div className="sum"><b>Emergency Pocket</b><span className="num" style={{ fontWeight: 700 }}>{money(state.emergency)}</span></div>
          <LockNote />
          <div className="link" style={{ marginTop: 8 }}>Move money ›</div>
        </div>
        <div className="gap" />
        <div className="card">
          <div className="sum"><b>Your rule</b><button className="link" onClick={onRule}>Edit</button></div>
          <div className="rule" style={{ marginTop: 7, color: 'var(--muted)' }}>
            Keep <b>{money(state.minimum)}</b> in your Main Account to spend. When you earn more, set aside{' '}
            <b>{Math.round(state.share * 100)}%</b> of the extra money: bills first, then your Emergency Pocket.
          </div>
        </div>
        <div className="cap" style={{ margin: '18px 4px 8px' }}>Latest activity</div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <TxList items={state.activity.slice(0, 5)} />
        </div>
      </div>
    </div>
  );
}
