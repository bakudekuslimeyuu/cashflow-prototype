import { money, days, nextBill, payoutToCover, pocketsTotal, accountTotal } from '../lib/cashflow.js';
import { TxList } from './TxList.jsx';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

// GXS-style home screen with CashFlow as a card inside the Savings Account.
export default function HomeScreen({ state, onOpenCashFlow, onAdd, onSend, onScan, onExtra }) {
  const nb = nextBill(state);
  const noBills = state.bills.length === 0;
  let reminder;
  if (noBills) reminder = { icon: '✓', title: 'No bills coming up', text: 'Nothing needs setting aside right now.' };
  else if (!nb) reminder = { icon: '✓', title: 'Bills are covered', text: 'Every upcoming bill is fully set aside.' };
  else if (nb.due <= 5)
    reminder = {
      icon: '!',
      title: `${nb.name} is ${money(nb.amount - nb.saved)} short`,
      text: `Due in ${days(nb.due)}. A payout of ${money(payoutToCover(state, nb))} or more covers it.`,
    };
  else reminder = { icon: 'i', title: `Next: ${nb.name} in ${days(nb.due)}`, text: `${money(nb.amount - nb.saved)} still to set aside.` };

  return (
    <div className="screen">
      <div className="top">
        <div className="word">GXS<small>CONCEPT</small></div>
        <div className="icons">
          <span onClick={() => onExtra('Info')}>ⓘ</span>
          <span className="bell" onClick={() => onExtra('Notifications')}>🔔︎</span>
        </div>
      </div>
      <div className="hello">{greeting()}, <b>Mei Yu</b></div>
      <div className="wrap">
        <div className="remind" role="button" tabIndex={0} onClick={onOpenCashFlow}>
          <div className="ic">{reminder.icon}</div>
          <div>
            <h4>{reminder.title}</h4>
            <p>{reminder.text}</p>
            <span className="cta">Open CashFlow</span>
          </div>
        </div>
        <div className="gap" />
        <div className="card actions">
          <button onClick={onAdd}><div className="c">＋</div>Add Money</button>
          <button onClick={onScan}><div className="c">⌗</div>Scan QR</button>
          <button onClick={onSend}><div className="c">➤</div>Send Money</button>
        </div>
        <div className="acct">
          <div>
            <div className="cap">GXS Savings Account</div>
            <div className="bal num">{money(accountTotal(state))}</div>
          </div>
          <div className="dots" onClick={() => onExtra('More options')}>···</div>
        </div>
        <div className="tiles">
          <div className="tile">
            <div className="ti">▭</div>
            <div className="n">Main Account</div>
            <div className="v num">{money(state.spendable)}</div>
            <div className="s">Safe to spend</div>
          </div>
          <div className="tile new" role="button" tabIndex={0} onClick={onOpenCashFlow}>
            <div className="ti l" style={{ fontWeight: 800 }}>$</div>
            <div className="n">CashFlow<span className="badge">NEW</span></div>
            <div className="v num">{money(pocketsTotal(state))}</div>
            <div className="s">{noBills ? 'No bills coming up' : nb ? `${nb.name} in ${days(nb.due)}` : 'All bills covered ✓'}</div>
          </div>
        </div>
        <div className="gap" />
        <div className="cap" style={{ margin: '10px 4px 8px' }}>Latest transactions</div>
        <div className="card" style={{ padding: '4px 16px' }}>
          <TxList items={state.activity.slice(0, 3)} />
        </div>
      </div>
    </div>
  );
}
