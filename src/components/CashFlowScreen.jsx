import { money, days, nextBill, payoutToCover, pocketsTotal, billsSaved } from '../lib/cashflow.js';
import { LockNote } from './Sheet.jsx';
import { TxList } from './TxList.jsx';
import Icon from './Icon.jsx';
import Money from './Money.jsx';

// Calendar chip for a bill due in n days.
function DateChip({ inDays }) {
  const d = new Date();
  d.setDate(d.getDate() + inDays);
  return (
    <div className="date" aria-hidden="true">
      <b>{d.getDate()}</b>
      <small>{d.toLocaleString('en-SG', { month: 'short' })}</small>
    </div>
  );
}

// The CashFlow feature screen inside the GXS app.
export default function CashFlowScreen({ state, onBack, onMove, onRule, onExtra }) {
  const nb = nextBill(state);
  const pockets = pocketsTotal(state);

  let warn;
  if (state.bills.length === 0) warn = { ok: true, icon: 'check', title: 'No bills coming up', text: 'Nothing needs setting aside right now.' };
  else if (!nb) warn = { ok: true, icon: 'check', title: "You're ready for your bills", text: 'Every upcoming bill is fully set aside.' };
  else {
    const short = nb.amount - nb.saved;
    const p = payoutToCover(state, nb);
    warn =
      nb.due <= 5
        ? { ok: false, icon: 'alert', title: `${nb.name} is ${money(short)} short, due in ${days(nb.due)}`, text: `A payout of ${money(p)} or more covers it. Or set it aside now with Move money.` }
        : { ok: true, icon: 'info', title: `Next: ${nb.name} in ${days(nb.due)}`, text: `${money(short)} still to set aside. A payout of ${money(p)} or more covers it.` };
  }

  return (
    <div className="screen enter-right">
      <div className="head">
        <button className="ib" onClick={onBack} aria-label="Back"><Icon name="back" size={22} /></button>
        <div className="t">CashFlow</div>
        <button className="ib bell" aria-label="Notifications" onClick={() => onExtra('Notifications')}><Icon name="bell" /></button>
      </div>
      <div className="wrap">
        <div className="card">
          <div className="cap">Safe to spend in your Main Account</div>
          <div className="big num" style={{ fontSize: 30, fontWeight: 700, marginTop: 3 }}><Money id="spend" value={state.spendable} /></div>
          <div className="sub">
            {state.spendable < state.minimum
              ? `Below your ${money(state.minimum)} minimum, so new money stays spendable until you're back above it.`
              : `${money(pockets)} is set aside in your pockets below. Same account, same bank.`}
          </div>
        </div>
        <div className="gap" />
        <div className={'warn' + (warn.ok ? ' ok' : '')} role="status">
          <Icon name={warn.icon} />
          <div><b>{warn.title}</b>{warn.text}</div>
        </div>
        <div className="gap" />
        <div className="two">
          <button className="btnc" onClick={() => onMove()}><div className="c"><Icon name="move" /></div>Move money</button>
          <button className="btnc" onClick={onRule}><div className="c"><Icon name="rule" /></div>My rule</button>
        </div>
        <div className="gap" />
        <div className="card">
          <div className="sum"><b>Bill Pockets</b><span className="muted num"><Money id="bills" value={billsSaved(state)} /> set aside</span></div>
          {state.bills.length === 0 && <div className="sub">No bills coming up.</div>}
          {[...state.bills].sort((a, b) => a.due - b.due).map((b) => {
            const pct = Math.min(100, (b.saved / b.amount) * 100);
            const full = b.saved >= b.amount;
            const late = !full && b.due <= 5;
            return (
              <button className="pk" key={b.id}
                aria-label={`${b.name}, ${money(b.saved)} of ${money(b.amount)} set aside, due in ${days(b.due)}`}
                onClick={() => onMove(b.id, b.saved > 0 ? 'back' : 'into')}>
                <DateChip inDays={b.due} />
                <div className="pkb">
                  <div className="r"><span>{b.name}</span><span className="num">{money(b.saved)} / {money(b.amount)}</span></div>
                  <div className={'bar' + (late ? ' w' : '')}><i style={{ width: pct + '%' }} /></div>
                  <div className="m">
                    <span>{Math.floor(pct)}%</span>
                    <span className={full ? 'okt' : late ? 'wt' : ''}>{full ? `Covered, due in ${days(b.due)}` : `Due in ${days(b.due)}`}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div className="gap" />
        <div className="card" style={{ cursor: 'pointer' }} role="button" tabIndex={0} onClick={() => onMove('emergency', 'back')}>
          <div className="sum"><b>Emergency Pocket</b><span className="num" style={{ fontWeight: 700 }}><Money id="emergency" value={state.emergency} /></span></div>
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
