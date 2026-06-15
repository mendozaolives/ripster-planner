# Ripster Cloud Planner v2

A single-file browser tool for planning SPY 0DTE options trades using the **Ripster EMA Clouds** indicator on TradingView.

## What It Does

The planner reads live EMA cloud values from your TradingView chart via a bookmarklet, then instantly generates a complete trade plan — direction, entries, stop, and targets — based on Ripster cloud positioning.

## Workflow

1. **Install the bookmarklet** (one-time) — drag the button from the setup card to your browser's bookmark bar.
2. **Go to your TradingView chart** with the Ripster EMA Clouds indicator active.
3. **Click the bookmarklet** — it reads the cloud values from TradingView's internal API and copies them to your clipboard.
4. **Click "Paste from TradingView"** on the planner — fields auto-fill and the trade plan calculates immediately.

## How the Setup Is Determined

The planner uses two EMA clouds:

| Cloud | EMAs | Color (bullish) | Color (bearish) |
|-------|------|-----------------|-----------------|
| Slow  | 34 / 50 | Green | Red |
| Fast  | 5 / 12  | Blue  | Yellow |

- **Bullish** — fast cloud center sits below slow cloud center → buy calls
- **Bearish** — fast cloud center sits above slow cloud center → buy puts
- **Wait** — price is inside or between clouds (chop zone)

## What Gets Calculated

- **Direction banner** — BUY CALLS, BUY PUTS, or WAIT with reasoning
- **Entry ladder** — visual price ladder showing cloud levels, best entry zones, targets, and hard stop
- **Trade quality** — A+ (valid setup + prime window 10:30am–3pm ET), B (valid but outside prime window), or — (no trade)
- **Entry table** — three setups per direction:
  - Aggressive (ATM)
  - Balanced (1 OTM)
  - Pullback / Bounce (best price, at fast cloud edge)
- **Stop & exit rules** — hard stop level, trail trigger, take-profit condition
- **Position sizing** — configurable max risk ($) and contract count

## Files

```
ripster-cloud-planner-v2.html   — the entire app, self-contained
```

No dependencies, no build step, no server required. Open the HTML file directly in any modern browser.

## Usage Notes

- The bookmarklet works on `tradingview.com` chart pages only; it accesses `window.TradingViewApi` which is injected by TradingView's own scripts.
- The prime trading window is **10:30 AM – 3:00 PM ET**. Setups outside this window are flagged but still shown.
- All cloud values can be edited manually if you prefer to type them in instead of using the bookmarklet.
