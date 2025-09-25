// Simple, API-ready bet slip interactions
// Focus: responsiveness, clean state, and clear integration points

const state = {
  selections: [], // { id, title, event, price, stake }
  loggedIn: false,
  bookmaker: 'bet365',
};

// Demo data to illustrate UI (replace via API)
const demoSelections = [
  {
    id: 'sel-1',
    title: 'Go Ahead Eagles @ 9/10',
    event: 'Go Ahead Eagles v FCSB • Winner',
    price: { num: 9, den: 10, fractional: '9/10', decimal: 1.9 },
    stake: '',
  },
  {
    id: 'sel-2',
    title: 'FCSB @ 27/10',
    event: 'FCSB • Winner',
    price: { num: 27, den: 10, fractional: '27/10', decimal: 3.7 },
    stake: '',
  },
];

const el = {
  panel: document.querySelector('.betslip'),
  hide: document.getElementById('btnHide'),
  clear: document.getElementById('btnClear'),
  count: document.getElementById('slipCount'),
  selections: document.getElementById('selections'),
  totalStake: document.getElementById('totalStake'),
  totalReturns: document.getElementById('totalReturns'),
  placeBet: document.getElementById('btnPlaceBet'),
};

// Ensure the bet slip panel is visible (not hidden)
function showPanel() {
  if (!el.panel) return;
  el.panel.classList.remove('betslip--hidden');
  if (el.hide) el.hide.textContent = 'Hide';
}

function formatCurrency(amount) {
  return `£${amount.toFixed(2)}`;
}

function fractionalToDecimal(num, den) {
  return num / den + 1; // returns decimal odds
}

// Convert decimal odds (e.g., 1.2) to a fractional string (e.g., 1/5)
function decimalToFractionString(decimal) {
  const base = Number(decimal);
  if (!isFinite(base) || base <= 1) return base.toString();
  const frac = base - 1; // fractional part of the odds
  let bestNum = 0;
  let bestDen = 1;
  let bestErr = Infinity;
  for (let den = 1; den <= 100; den++) {
    const num = Math.round(frac * den);
    const err = Math.abs(frac - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
      if (err < 1e-6) break;
    }
  }
  // Guard against 0/1 (e.g., decimal=1)
  if (bestNum === 0) return base.toString();
  return `${bestNum}/${bestDen}`;
}

// Parse deep links of the form:
// .../index.html/bet/slip/{eventId}/{eventName}/{marketName}/{oddName}/{oddDecimal}
// Works with file:// and http(s) URLs. Returns true if a selection was added.
function parseDeeplink(hrefOverride) {
  try {
    const href = hrefOverride || window.location.href;
    const marker = '/bet/slip/';
    let idx = href.indexOf(marker);

    // If not found in path, try hash routing (for file:// usage): #/bet/slip/...
    let rest;
    if (idx === -1) {
      const h = window.location.hash || '';
      const hashIdx = h.indexOf(marker);
      if (hashIdx === -1) return false;
      rest = h.substring(hashIdx + marker.length);
    } else {
      rest = href.substring(idx + marker.length);
    }
    // decode segments robustly (handle double-encoded like %2520 => %20 => ' ')
    const deepDecode = (s) => {
      let cur = s;
      for (let i = 0; i < 3; i++) {
        try {
          const dec = decodeURIComponent(cur);
          if (dec === cur) break;
          cur = dec;
        } catch (_) {
          break;
        }
      }
      return cur.replace(/\+/g, ' ');
    };
    const parts = rest.split('/').map((p) => deepDecode(p));
    if (parts.length < 5) return false;

    const selections = [];
    for (let i = 0; i + 4 < parts.length; i += 5) {
      const eventId = parts[i];
      const eventName = parts[i + 1];
      const marketName = parts[i + 2];
      const oddName = parts[i + 3];
      const oddDecimalRaw = parts[i + 4];

      const decimal = Number(oddDecimalRaw);
      if (!isFinite(decimal) || decimal <= 1) continue;

      const fractional = decimalToFractionString(decimal);
      let num = 0;
      let den = 1;
      if (fractional.includes('/')) {
        const [n, d] = fractional.split('/');
        num = Number(n);
        den = Number(d) || 1;
      }

      selections.push({
        id: `${eventId}-${marketName}-${oddName}`,
        title: `${oddName} @ ${fractional}`,
        event: `${eventName} • ${marketName}`,
        price: { num, den, fractional, decimal },
        stake: '',
      });
    }

    if (selections.length === 0) return false;

    // Decide behavior: replace by default; append only when mode=append is present
    const hrefAll = (hrefOverride || window.location.href) + (window.location.hash || '');
    const append = /[?#&]mode=append\b/i.test(hrefAll);
    if (append) {
      const existingIds = new Set(state.selections.map((s) => s.id));
      for (const sel of selections) {
        if (!existingIds.has(sel.id)) {
          state.selections.push(sel);
          existingIds.add(sel.id);
        }
      }
    } else {
      state.selections = selections;
    }
    render();
    showPanel();
    return true;
  } catch (e) {
    // Silently ignore malformed links
    return false;
  }
}

function getReturns(stake, price) {
  if (!stake) return 0;
  const decimal = price?.decimal ?? fractionalToDecimal(price.num, price.den);
  return stake * decimal;
}

function render() {
  // Count
  el.count.textContent = String(state.selections.length);

  // List
  el.selections.innerHTML = '';
  state.selections.forEach((s) => {
    const li = document.createElement('li');
    li.className = 'selection';
    li.dataset.id = s.id;

    li.innerHTML = `
      <div>
        <div class="selection__title">${s.title}</div>
        <div class="selection__desc">${s.event}</div>
      </div>
      <div class="selection__right">
        <div class="odds"><span class="tag">${s.price.fractional}</span></div>
        <div class="input-group">
          <input class="input" type="number" min="0" step="0.01" placeholder="Set Stake" value="${s.stake}" aria-label="Stake for ${s.title}" />
          <button class="btn btn--sm btn--ghost" data-action="remove">Remove</button>
        </div>
        <div class="selection__desc">Returns: <strong>${formatCurrency(getReturns(Number(s.stake||0), s.price))}</strong></div>
      </div>
    `;

    el.selections.appendChild(li);
  });

  // Totals
  const totalStake = state.selections.reduce((acc, s) => acc + Number(s.stake || 0), 0);
  const totalReturns = state.selections.reduce((acc, s) => acc + getReturns(Number(s.stake || 0), s.price), 0);
  el.totalStake.textContent = formatCurrency(totalStake);
  el.totalReturns.textContent = formatCurrency(totalReturns);

  // Place bet button state (disabled until logged in and has stake)
  el.placeBet.disabled = !(state.loggedIn && totalStake > 0);
}

function attachEvents() {
  // Toggle hide
  el.hide.addEventListener('click', () => {
    el.panel.classList.toggle('betslip--hidden');
    el.hide.textContent = el.panel.classList.contains('betslip--hidden') ? 'Show' : 'Hide';
  });

  // Clear
  el.clear.addEventListener('click', () => {
    state.selections = [];
    render();
  });

  // Delegate selection interactions
  el.selections.addEventListener('input', (e) => {
    const input = e.target;
    if (!(input instanceof HTMLInputElement)) return;
    const li = input.closest('.selection');
    if (!li) return;
    const sel = state.selections.find((x) => x.id === li.dataset.id);
    if (!sel) return;
    const v = Number(input.value || 0);
    sel.stake = isNaN(v) ? '' : String(v);
    render();
  });

  el.selections.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const li = btn.closest('.selection');
    if (!li) return;
    if (btn.dataset.action === 'remove') {
      state.selections = state.selections.filter((x) => x.id !== li.dataset.id);
      render();
    }
  });

  // Intercept clicks on links pointing to /bet/slip/... and handle inline
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (!href) return;
    // Support absolute and relative URLs
    let abs;
    try {
      abs = new URL(href, window.location.href).href;
    } catch (_) {
      return;
    }
    if (abs.includes('/bet/slip/')) {
      e.preventDefault();
      const ok = parseDeeplink(abs);
      if (ok) {
        // Reflect state in URL without breaking file:// navigation
        try {
          if (window.location.protocol === 'file:') {
            const marker = '/bet/slip/';
            const idx = abs.indexOf(marker);
            if (idx !== -1) {
              const hash = '#'+abs.substring(idx);
              window.history.pushState({}, '', hash);
            }
          } else {
            window.history.pushState({}, '', abs);
          }
        } catch (_) {}
      }
    }
  });
}

// Public API-like functions for future integration
window.BetSlip = {
  addSelection(sel) {
    // sel: { id, title, event, price: {num, den, fractional, decimal} }
    if (!sel || !sel.id) return;
    if (state.selections.some((s) => s.id === sel.id)) return; // avoid duplicates
    state.selections.push({ ...sel, stake: '' });
    render();
  },
  removeSelection(id) {
    state.selections = state.selections.filter((s) => s.id !== id);
    render();
  },
  clear() {
    state.selections = [];
    render();
  },
  setLoggedIn(v) {
    state.loggedIn = !!v;
    render();
  },
  setBookmaker(name) {
    state.bookmaker = name;
  },
  getState() {
    return JSON.parse(JSON.stringify(state));
  },
};

// Init
function init() {
  attachEvents();
  // If a valid deeplink is present, use it; otherwise load demo data
  const handledDeeplink = parseDeeplink();
  if (!handledDeeplink) {
    // Load demo selections so the UI resembles the screenshot
    state.selections = [...demoSelections];
    render();
  }

  // Handle browser navigation (back/forward) for deeplinks
  window.addEventListener('popstate', () => {
    // Try to parse current URL; if valid, it will replace selections and show panel
    const ok = parseDeeplink();
    if (!ok) {
      // If not a deeplink, you could decide to restore demo or leave as-is.
      // Here we leave current state untouched.
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
