import { useEffect, useRef, useState } from 'react';
import { money } from '../lib/cashflow.js';

const reduceMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Last amount each figure showed, so a figure counts from its old value even
// when the screen changed in between (e.g. Add Money jumps to CashFlow).
const lastShown = new Map();

// Shows an amount; when it changes, it counts smoothly to the new value.
export default function Money({ value, id, duration = 700 }) {
  const startAt = id && lastShown.has(id) ? lastShown.get(id) : value;
  const [shown, setShown] = useState(startAt);
  const from = useRef(startAt);
  const frame = useRef();

  useEffect(() => {
    const start = from.current;
    const settle = () => {
      from.current = value;
      if (id) lastShown.set(id, value);
      setShown(value);
    };
    if (start === value || reduceMotion()) {
      settle();
      return undefined;
    }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      if (p >= 1) return settle();
      const v = start + (value - start) * (1 - (1 - p) ** 3); // ease-out
      from.current = v;
      if (id) lastShown.set(id, v);
      setShown(v);
      frame.current = requestAnimationFrame(tick);
      return undefined;
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [value, id, duration]);

  return <>{money(shown)}</>;
}
