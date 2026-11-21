import Icon from './Icon.jsx';

// Bottom sheet used for every pop-up in the prototype.
export default function Sheet({ onClose, children }) {
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="grab" />
        {children}
      </div>
    </div>
  );
}

export function Seg({ options, value, onChange, cols }) {
  return (
    <div className="seg" style={cols ? { gridTemplateColumns: `repeat(${cols},1fr)` } : undefined}>
      {options.map((o) => (
        <button key={o.value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const LockNote = () => (
  <div className="lock"><Icon name="unlock" size={15} /><span>It's still your money. You can move it back any time.</span></div>
);
