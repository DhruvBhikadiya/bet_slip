# Bet Slip UI (HTML/CSS/JS only)

A responsive bet slip UI modeled after the provided screenshot. Pure frontend (no frameworks). Built to be API-ready.

## Files
- `index.html` — Structure and semantics
- `styles.css` — Styling and responsive behavior
- `script.js` — Interactions and public hooks for future API integration

## Run
Just open `index.html` in a browser. On mobile widths, the slip becomes a full-height page; on desktop it appears as a right-side card.

## Notes on future API binding
The script exposes a small global API via `window.BetSlip`:

- `BetSlip.addSelection(sel)`
  - `sel` shape: `{ id, title, event, price: { num, den, fractional, decimal } }`
- `BetSlip.removeSelection(id)`
- `BetSlip.clear()`
- `BetSlip.setLoggedIn(boolean)`
- `BetSlip.setBookmaker(name)`
- `BetSlip.getState()` -> deep copy of current state

Selections also track `stake` per item (string number). Returns are computed per selection and in totals.

### Example integration
```html
<script>
  // Example: add a new selection from your API result
  BetSlip.addSelection({
    id: 'sel-123',
    title: 'Team A @ 5/2',
    event: 'Team A v Team B • Winner',
    price: { num: 5, den: 2, fractional: '5/2', decimal: 3.5 },
  });

  // Mark user as logged in to enable "Place Bet"
  BetSlip.setLoggedIn(true);
</script>
```

## Accessibility
- Landmark via `role="complementary"` and labels.
- Buttons use clear text labels and `aria-label`s where helpful.
- Inputs are keyboard friendly and use visible focus styling.

## Customization
Tweak colors, spacing, and sizes in `styles.css`. Class names are namespaced starting with `betslip`/`selection` to avoid collisions.
