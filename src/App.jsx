import { useEffect, useRef, useState } from 'react';
import HomeScreen from './components/HomeScreen.jsx';
import Icon from './components/Icon.jsx';
import CashFlowScreen from './components/CashFlowScreen.jsx';
import {
  AddMoneySheet, BreakdownSheet, DemoSheet, MoveSheet, RuleSheet,
} from './components/Sheets.jsx';
import {
  initialState, allocate, applyPayout, moveMoney, sendMoney, setRule, nextDay, money, potName,
} from './lib/cashflow.js';

export default function App() {
  const [state, setState] = useState(initialState);
  const [screen, setScreen] = useState('home'); // 'home' | 'cashflow'
  const [sheet, setSheet] = useState(null); // { type, ...props }
  const [toastMsg, setToastMsg] = useState('');
  const timer = useRef();

  const toast = (m) => {
    setToastMsg(m);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToastMsg(''), 2200);
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  const close = () => setSheet(null);
  const notInPrototype = (what) => toast(`${what} isn't part of this prototype`);

  const payout = (amount, source = 'Grab earnings cash-out') => {
    const result = allocate(state, amount);
    const { minimum, share } = state;
    setState((s) => applyPayout(s, amount, source));
    setScreen('cashflow');
    setSheet({ type: 'breakdown', result, source, minimum, share });
  };

  const openMove = (preset, presetDir) => setSheet({ type: 'move', preset, presetDir });

  let sheetEl = null;
  if (sheet?.type === 'add')
    sheetEl = <AddMoneySheet state={state} onClose={close} onConfirm={(a, src) => payout(a, src)} />;
  if (sheet?.type === 'move')
    sheetEl = (
      <MoveSheet key={sheet.preset + sheet.presetDir} state={state} preset={sheet.preset} presetDir={sheet.presetDir} onClose={close}
        onConfirm={(pot, a, dir) => {
          const name = potName(state, pot);
          setState((s) => moveMoney(s, pot, a, dir));
          close();
          toast(dir === 'back' ? `${money(a)} is back in your Main Account` : `${money(a)} moved into ${name}`);
        }} />
    );
  if (sheet?.type === 'rule')
    sheetEl = (
      <RuleSheet state={state} onClose={close}
        onSave={(min, share) => { setState((s) => setRule(s, min, share)); close(); toast('Rule saved'); }} />
    );
  if (sheet?.type === 'breakdown')
    sheetEl = <BreakdownSheet {...sheet} onClose={close} onEditRule={() => setSheet({ type: 'rule' })} />;
  if (sheet?.type === 'demo')
    sheetEl = (
      <DemoSheet onClose={close}
        onPayout={(a) => payout(a)}
        onSpend={() => {
          close();
          if (state.spendable < 30) return toast(`Not enough in Main Account (${money(state.spendable)})`);
          setState((s) => sendMoney(s, 30, 'Petrol & food'));
          toast('Spent S$30.00');
        }}
        onNextDay={() => {
          const { next, paid } = nextDay(state);
          setState(next);
          close();
          toast(
            paid.length
              ? paid.map((b) => (b.short > 0 ? `${b.name}: ${money(b.short)} short` : `${b.name} paid`)).join(', ')
              : 'A day has passed'
          );
        }}
        onReset={() => { setState(initialState()); setScreen('home'); close(); toast('Back to the start'); }} />
    );

  return (
    <div className="phone">
      <div className="concept">
        Concept prototype by IS419 Team 7. Simulated money. Not affiliated with or endorsed by GXS Bank.
      </div>

      {screen === 'home' ? (
        <HomeScreen state={state}
          onOpenCashFlow={() => setScreen('cashflow')}
          onAdd={() => setSheet({ type: 'add' })}
          onSend={() => notInPrototype('Send Money')}
          onScan={() => notInPrototype('Scan QR')}
          onExtra={notInPrototype} />
      ) : (
        <CashFlowScreen state={state}
          onExtra={notInPrototype}
          onBack={() => setScreen('home')}
          onMove={openMove}
          onRule={() => setSheet({ type: 'rule' })} />
      )}

      <nav className="nav">
        <div className="on" onClick={() => setScreen('home')}><Icon name="home" size={22} />Home</div>
        <div onClick={() => notInPrototype('Odyssey')}><Icon name="compass" size={22} />Odyssey</div>
        <div onClick={() => notInPrototype('Me')}><Icon name="user" size={22} />Me</div>
      </nav>

      <button className="demo-toggle" onClick={() => setSheet({ type: 'demo' })}>Demo controls</button>
      <div className={'toast' + (toastMsg ? ' show' : '')}>{toastMsg}</div>
      {sheetEl}
    </div>
  );
}
