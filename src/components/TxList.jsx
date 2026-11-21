import { money } from '../lib/cashflow.js';

export function TxList({ items }) {
  return items.map((a) => (
    <div className="tx" key={a.id}>
      <div>
        <div>{a.title}</div>
        <div className="d">{a.detail}</div>
      </div>
      <div className={'num ' + (a.sign === '+' ? 'plus' : '')}>
        {a.sign}
        {money(a.amount)}
      </div>
    </div>
  ));
}
