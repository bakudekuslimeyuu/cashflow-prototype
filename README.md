# CashFlow inside GXS – concept prototype

IS419 Retail Banking and Mobile Technology · Team 7 · Singapore Management University

A clickable prototype of **CashFlow**, a bill-readiness feature embedded in a digital bank's savings account (GXS is the proposed launch partner). Built with React + Vite.

> Concept prototype with **simulated money**. Not affiliated with or endorsed by GXS Bank. No real accounts, logins or payments.

**Live demo:** https://bakudekuslimeyuu.github.io/cashflow-prototype/

## The rule

1. Keep a minimum in the Main Account to spend (default S$150).
2. Anything above it is **extra money**. A share of it is set aside (default 50%).
3. Bills are filled first, earliest due date first, only up to what's still needed.
4. Whatever is left goes to the Emergency Pocket.

Example: S$130 in the Main Account + a S$120 payout → S$200 stays spendable, S$30 to bills, S$20 to the Emergency Pocket.

## What you can try

- **Add Money** (Grab earnings or PayNow) and see the split before and after.
- **Early warning** on the home screen and in CashFlow: which bill, how short, and the payout that covers it.
- **Move money** back to the Main Account, or into a pocket. Tap any pocket to start.
- **Send Money** more than you have, to see the "move some back first" prompt.
- **My rule**: change the minimum and the share.
- **▶ Demo** (for presenters): simulate payouts, spending, the next day, or reset.

Reloading the page resets everything, so every tester starts from the same point.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # allocation rule tests
npm run build    # production build in dist/
```

## Structure

- `src/lib/cashflow.js` – the allocation rule and state changes (pure JavaScript, tested in `cashflow.test.js`)
- `src/components/` – Home screen, CashFlow screen and the bottom sheets
- `.github/workflows/deploy.yml` – builds and deploys to GitHub Pages on every push to `main`
