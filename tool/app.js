// TNG Opportunity Score — the tool itself, served from Vercel at /tool/app.js.
// The tng_lead_scoring.html file people open from SharePoint is a small launcher: it sets
// window.TNG_CONFIG.accessCode and loads this script, so a push here reaches everyone the
// next time they open the file. Nothing secret belongs in this file: it is public.

// Small line icons for the export buttons (16px, drawn in the button's text color).
const TNG_ICON_PATHS = {
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
  doc: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
  print: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 16 0v1"/>',
  bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  userPlus: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
};
// The Zoho mark (a square drawn in Zoho's four colors), inline so it shows where outside images are blocked.
const ZOHO_MARK = '<svg class="tng-zoho-mark" viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" aria-hidden="true">'
  + '<path d="M4 15V7a3 3 0 0 1 3-3h4" stroke="#E42527"/><path d="M11 4h6a3 3 0 0 1 3 3v2" stroke="#089949"/>'
  + '<path d="M20 9v8a3 3 0 0 1-3 3h-4" stroke="#F9B21D"/><path d="M13 20H7a3 3 0 0 1-3-3v-2" stroke="#226DB4"/></svg>';
const ZOHO_TILE = `<span class="tng-zoho-tile">${ZOHO_MARK}</span>`;
const LINKEDIN_LOGO = '<svg class="tng-linkedin-logo" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="4" fill="#0A66C2"/>'
  + '<path fill="#FFFFFF" d="M7.1 9.5H4.6V19h2.5V9.5zM5.85 5a1.45 1.45 0 1 0 0 2.9 1.45 1.45 0 0 0 0-2.9zM19.4 13.6c0-2.6-1.4-4.3-3.7-4.3-1.3 0-2.2.7-2.6 1.4V9.5h-2.4V19h2.5v-5c0-1.3.6-2.1 1.7-2.1 1 0 1.5.8 1.5 2.1v5h2.5v-5.4z"/></svg>';
const REVEAL_LABEL = 'Reveal Full Name &amp; Email (1 Apollo credit)';
const tngIcon = name => `<svg class="tng-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${TNG_ICON_PATHS[name]}</svg>`;

// ---------- Page: styles and markup, mounted into the launcher's page ----------
(function mountTngTool() {
  const TNG_CSS = `
  /* TNG Opportunity Score — refined dark UI (TNG palette, Apple-style restraint).
     Grouped list cards, larger type, generous spacing, one accent per meaning:
     green = counted signal, blue = information/links, red/orange = lead heat. */
  :root { color-scheme: dark; }
  body {
    background: #000000;
    margin: 0;
    padding: 0;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .tng-lead-scorer {
    --tng-black: #000000;
    --tng-surface: #141414;
    --tng-surface-2: #1C1C1C;
    --tng-surface-3: #262626;
    --tng-hairline: rgba(255,255,255,0.08);
    --tng-hairline-strong: rgba(255,255,255,0.14);
    --tng-text: #F5F5F7;
    --tng-text-secondary: #A1A1A6;
    --tng-text-tertiary: #8A8A8E;
    --tng-white: #FFFFFF;
    --tng-alert-critical: #C62828;
    --tng-alert-warning: #E65100;
    --tng-alert-clear: #2E7D32;
    --tng-clear-text: #6FCF7F;
    --tng-intel-accent: #1565C0;
    --tng-intel-text: #5B9EF0;
    --tng-radius-lg: 14px;
    --tng-radius-md: 10px;
    --tng-radius-sm: 8px;

    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    font-size: 15px;
    line-height: 1.5;
    letter-spacing: -0.006em;
    background: var(--tng-black);
    color: var(--tng-text);
    max-width: 760px;
    margin: 0 auto;
    padding: 40px 24px 0;
  }

  .tng-lead-scorer * { box-sizing: border-box; }
  .tng-lead-scorer a { color: var(--tng-intel-text); text-decoration: none; }
  .tng-lead-scorer a:hover { text-decoration: underline; }
  .tng-lead-scorer :focus-visible { outline: 2px solid var(--tng-intel-text); outline-offset: 2px; }

  /* ---------- Header ---------- */
  .tng-logo-banner { display: flex; align-items: center; padding: 0 0 36px; }
  .tng-logo-img { display: block; height: 44px; width: auto; max-width: 100%; }

  .tng-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 24px;
    padding-bottom: 28px;
    margin-bottom: 28px;
    border-bottom: 1px solid var(--tng-hairline);
  }
  .tng-header-title-block { display: flex; flex-direction: column; gap: 6px; }
  .tng-header h1 {
    font-size: 34px;
    font-weight: 700;
    letter-spacing: -0.025em;
    line-height: 1.1;
    margin: 0;
    color: var(--tng-white);
  }
  .tng-version-line { font-size: 13px; color: var(--tng-text-tertiary); }
  .tng-header-tools { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; }
  .tng-header-tools .tng-zoho-help-btn { margin-top: 0; }
  .tng-header-link { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: var(--tng-text-secondary); text-decoration: none; }
  .tng-header-link:hover { color: var(--tng-white); }
  .tng-header-link .tng-ico { width: 14px; height: 14px; }
  .tng-header-note {
    font-size: 13px;
    color: var(--tng-text-tertiary);
    text-align: right;
    max-width: 240px;
    line-height: 1.45;
  }

  /* ---------- Search ---------- */
  .tng-input-row { display: flex; gap: 10px; margin-bottom: 12px; }
  .tng-input-row input {
    flex: 1;
    min-width: 0;
    height: 48px;
    background: var(--tng-surface-2);
    border: 1px solid var(--tng-hairline);
    color: var(--tng-text);
    padding: 0 16px;
    font-size: 16px;
    border-radius: var(--tng-radius-md);
    font-family: inherit;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .tng-input-row input:focus {
    outline: none;
    background: var(--tng-surface-3);
    border-color: rgba(91,158,240,0.6);
    box-shadow: 0 0 0 4px rgba(91,158,240,0.15);
  }
  .tng-input-row input::placeholder { color: var(--tng-text-tertiary); }

  .tng-analyze-btn, .tng-reset-btn {
    height: 48px;
    padding: 0 24px;
    font-size: 15px;
    font-weight: 600;
    border-radius: var(--tng-radius-md);
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.1s;
  }
  .tng-analyze-btn { background: var(--tng-white); color: var(--tng-black); border: none; }
  .tng-analyze-btn:hover { background: #E5E5E7; }
  .tng-analyze-btn:active, .tng-reset-btn:active { transform: scale(0.98); }
  .tng-analyze-btn:disabled { background: var(--tng-surface-3); color: var(--tng-text-tertiary); cursor: not-allowed; }
  .tng-reset-btn { background: transparent; color: var(--tng-text-secondary); border: 1px solid var(--tng-hairline-strong); }
  .tng-reset-btn:hover { color: var(--tng-white); border-color: rgba(255,255,255,0.3); }

  .tng-hint { font-size: 13px; color: var(--tng-text-tertiary); margin-bottom: 32px; line-height: 1.5; }

  .tng-status, .tng-error {
    display: none;
    align-items: center;
    gap: 10px;
    font-size: 14px;
    padding: 12px 16px;
    border-radius: var(--tng-radius-md);
    margin-bottom: 20px;
  }
  .tng-status { color: var(--tng-intel-text); background: rgba(21,101,192,0.12); }
  .tng-error { color: #FF8A80; background: rgba(198,40,40,0.12); }
  .tng-status.active, .tng-error.active { display: flex; }

  /* ---------- Cards ---------- */
  .tng-company-card, .tng-contact-card {
    display: none;
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: var(--tng-radius-lg);
    padding: 24px 26px;
    margin-bottom: 16px;
    transition: border-color 0.4s, box-shadow 0.4s;
  }
  .tng-company-card.active, .tng-contact-card.active { display: block; }
  .tng-company-card.hot-lead, .tng-brief-lead.hot-lead {
    border-color: rgba(198,40,40,0.7);
    background: linear-gradient(160deg, rgba(198,40,40,0.12), var(--tng-surface) 45%);
    animation: tng-card-embers 3.2s ease-in-out infinite;
  }
  @keyframes tng-card-embers {
    0%, 100% { box-shadow: 0 0 0 1px rgba(198,40,40,0.35), 0 12px 40px rgba(198,40,40,0.18); }
    50%      { box-shadow: 0 0 0 1px rgba(255,112,67,0.5), 0 12px 56px rgba(230,74,25,0.32); }
  }

  .tng-company-header { margin-bottom: 14px; }
  .tng-company-name-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 6px; }
  .tng-company-name { font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2; color: var(--tng-white); }
  .tng-company-meta { font-size: 14px; color: var(--tng-text-secondary); line-height: 1.5; }
  .tng-company-description { font-size: 15px; color: #C7C7CC; line-height: 1.6; }

  .tng-hot-badge {
    display: none;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #FF8A65;
    background: rgba(198,40,40,0.16);
    border: 1px solid rgba(198,40,40,0.5);
    border-radius: 999px;
    padding: 4px 12px;
  }
  .tng-hot-badge.active { display: inline-block; animation: tng-pill-sheen 2.2s linear infinite; }
  .tng-hot-badge {
    background: linear-gradient(110deg, rgba(198,40,40,0.18) 0%, rgba(255,112,67,0.38) 50%, rgba(198,40,40,0.18) 100%);
    background-size: 250% 100%;
  }

  .tng-license-badge { display: none; align-items: center; gap: 10px; margin-top: 16px; font-size: 13px; }
  .tng-license-badge.active { display: flex; flex-wrap: wrap; }
  .tng-license-pill { font-weight: 600; padding: 4px 12px; border-radius: 999px; white-space: nowrap; }
  .tng-license-pill.licensed { color: var(--tng-clear-text); background: rgba(46,125,50,0.16); }
  .tng-license-pill.not-licensed { color: var(--tng-text-secondary); background: rgba(255,255,255,0.06); }
  .tng-license-caveat { color: var(--tng-text-tertiary); }

  /* Shown when Apollo had no record and the profile comes from web research. */
  .tng-source-note {
    display: none;
    margin-top: 14px;
    padding: 12px 16px;
    font-size: 14px;
    line-height: 1.6;
    color: #FFD8A8;
    background: rgba(230,81,0,0.12);
    border-radius: var(--tng-radius-sm);
    box-shadow: inset 0 0 0 1px rgba(255,167,38,0.35);
  }
  .tng-source-note.active { display: block; }
  .tng-source-note strong { color: #FFC977; }
  .tng-source-note .muted { color: var(--tng-text-tertiary); }
  .tng-source-note a { color: var(--tng-intel-text); }

  .tng-corp-structure, .tng-crm-records, .tng-visit-summary {
    font-size: 14px;
    color: var(--tng-text-secondary);
    line-height: 1.7;
    margin-top: 14px;
    padding: 12px 16px;
    background: var(--tng-surface-2);
    border-radius: var(--tng-radius-sm);
  }
  /* "Saved lookup" line: shown when Analyze reused this week's result instead of spending credits. */
  .tng-cache-note { display: none; margin-top: 14px; font-size: 13px; color: var(--tng-text-tertiary); }
  .tng-cache-note.active { display: block; }
  .tng-cache-note button {
    background: none; border: 0; padding: 0; margin-left: 4px; font: inherit; font-weight: 600;
    color: var(--tng-intel-text); cursor: pointer;
  }
  .tng-cache-note button:hover { text-decoration: underline; }
  .tng-corp-structure { display: none; }
  .tng-corp-structure.active { display: block; }
  .tng-corp-structure strong, .tng-crm-records strong { color: var(--tng-text); font-weight: 600; }
  .tng-crm-records:empty, .tng-visit-summary:empty { display: none; }
  .tng-crm-records { margin-top: 10px; }
  .tng-visit-summary { margin: 0 0 12px; }
  .tng-visit-summary .muted { color: var(--tng-text-tertiary); }
  .tng-crm-records .muted { color: var(--tng-text-tertiary); }

  /* Recent security incidents from the news: one line per incident, newest first. */
  .tng-incidents {
    font-size: 14px;
    color: var(--tng-text-secondary);
    line-height: 1.6;
    margin-top: 10px;
    padding: 12px 16px;
    background: var(--tng-surface-2);
    border-radius: var(--tng-radius-sm);
  }
  .tng-incidents:empty { display: none; }
  .tng-incident + .tng-incident { margin-top: 8px; }
  .tng-incident-head { color: var(--tng-text); font-weight: 600; }
  .tng-incident-head .tng-incident-type { color: #FFC977; font-weight: 600; }
  .tng-incident.older .tng-incident-head { color: var(--tng-text-secondary); }
  .tng-incident.older .tng-incident-type { color: var(--tng-text-secondary); }
  .tng-incident a { color: var(--tng-intel-text); }
  .tng-incidents .muted, .tng-incident-note { color: var(--tng-text-tertiary); }
  .tng-incident-note { margin-top: 10px; font-size: 13px; }

  .tng-company-linkedin, .tng-contact-link { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; font-size: 14px; font-weight: 600; }
  .tng-linkedin-logo { width: 18px; height: 18px; flex: none; }
  .tng-li-inline { display: inline-flex; align-items: center; gap: 5px; vertical-align: -3px; }
  .tng-li-inline .tng-linkedin-logo { width: 15px; height: 15px; }

  /* Contact card */
  .tng-contact-label-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 10px; }
  .tng-contact-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--tng-intel-text);
  }
  .tng-contact-cycle-btn {
    background: var(--tng-surface-2);
    color: var(--tng-text);
    border: 1px solid var(--tng-hairline);
    border-radius: 999px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
  }
  .tng-contact-cycle-btn:hover { background: var(--tng-surface-3); }
  .tng-contact-name { font-size: 24px; font-weight: 700; letter-spacing: -0.02em; color: var(--tng-white); line-height: 1.25; }
  .tng-contact-title { font-size: 15px; color: var(--tng-text-secondary); margin-top: 4px; }
  .tng-contact-reasoning { font-size: 14px; color: var(--tng-text-tertiary); margin-top: 10px; line-height: 1.5; }
  .tng-contact-actions { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 18px; }
  .tng-contact-actions .tng-contact-link { margin-top: 0; }
  /* Action buttons (Reveal, Push to Zoho) are solid fills, so they stand apart from the tinted
     chips and quiet secondary buttons: these are the things we want people to press. */
  .tng-reveal-btn {
    background: var(--tng-intel-accent);
    color: var(--tng-white);
    border: 1px solid rgba(255,255,255,0.14);
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    border-radius: var(--tng-radius-sm);
    cursor: pointer;
    font-family: inherit;
    box-shadow: 0 4px 14px rgba(21,101,192,0.35);
    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
  }
  .tng-reveal-btn { display: inline-flex; align-items: center; gap: 8px; }
  .tng-reveal-btn .tng-ico { width: 16px; height: 16px; }
  .tng-brief-reveal .tng-ico { width: 14px; height: 14px; }
  .tng-reveal-btn:hover:not(:disabled) { background: #1976D2; box-shadow: 0 6px 20px rgba(21,101,192,0.5); }
  .tng-reveal-btn:active:not(:disabled), .tng-zoho-btn:active { transform: scale(0.98); }
  .tng-reveal-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
  .tng-reveal-result { font-size: 15px; color: var(--tng-text-secondary); margin-top: 12px; line-height: 1.5; }
  .tng-reveal-result .name { color: var(--tng-white); font-weight: 600; }
  .tng-reveal-result .email { color: var(--tng-clear-text); }
  .tng-reveal-result.error { color: #FF8A80; }
  .tng-reveal-result.muted { color: var(--tng-text-tertiary); font-size: 14px; }

  /* ---------- Sections & grouped lists ---------- */
  .tng-section { margin: 36px 0 0; }
  .tng-section-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tng-text-secondary);
    margin: 0 4px 10px;
  }
  /* Automatic vs Manual pills above each section, so it's obvious what to tick yourself. */
  .tng-source-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0;
    text-transform: none;
    padding: 4px 12px;
    border-radius: 999px;
    white-space: nowrap;
  }
  .tng-source-tag b { font-weight: 700; letter-spacing: 0.02em; }
  .tng-source-tag.auto { color: #8DBDF7; background: rgba(21,101,192,0.18); box-shadow: inset 0 0 0 1px rgba(91,158,240,0.35); }
  .tng-source-tag.manual { color: #FFC977; background: rgba(230,81,0,0.16); box-shadow: inset 0 0 0 1px rgba(255,167,38,0.4); }

  .tng-auto-populated-section { background: none; border: none; padding: 0; }
  .tng-event-group { margin-top: 24px; }
  .tng-event-group-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--tng-text-tertiary);
    margin: 0 4px 8px;
  }
  .tng-event-group .tng-hint { margin: 0 4px 10px; }

  /* Each signal container renders as one rounded card with hairline-separated rows. */
  #tng-vertical-signals, #tng-event-signals, #tng-crm-signals, #tng-news-signals, #tng-trigger-signals, #tng-site-signals, #tng-page-signals {
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: var(--tng-radius-lg);
    overflow: hidden;
  }

  .tng-signal {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 18px;
    min-height: 56px;
    cursor: pointer;
    position: relative;
    transition: background 0.2s;
  }
  .tng-signal + .tng-signal::before {
    content: '';
    position: absolute;
    top: 0;
    left: 54px;
    right: 0;
    height: 1px;
    background: var(--tng-hairline);
  }
  .tng-signal:hover { background: rgba(255,255,255,0.03); }
  .tng-signal.on { background: rgba(46,125,50,0.10); }
  .tng-signal.on:hover { background: rgba(46,125,50,0.14); }
  .tng-signal:has(input:disabled) { cursor: default; }
  .tng-signal:has(input:disabled):not(.on):hover { background: transparent; }

  .tng-signal.just-checked { animation: tng-signal-pop 0.35s ease-out; }
  @keyframes tng-signal-pop {
    0% { background: rgba(46,125,50,0.22); }
    100% { background: rgba(46,125,50,0.10); }
  }
  .tng-signal.reveal-in { animation: tng-signal-reveal 0.45s ease-out both; }
  @keyframes tng-signal-reveal {
    0% { opacity: 0; transform: translateY(4px); }
    100% { opacity: 1; transform: translateY(0); }
  }

  .tng-signal-left { display: flex; align-items: center; gap: 16px; min-width: 0; }

  .tng-signal input[type=checkbox], .tng-check {
    appearance: none;
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    min-width: 22px;
    margin: 0;
    border: 1.5px solid #5A5A5E;
    border-radius: 7px;
    background: transparent;
    cursor: pointer;
    position: relative;
    transition: border-color 0.2s, background 0.2s;
  }
  .tng-signal input[type=checkbox]:checked, .tng-check:checked { border-color: var(--tng-alert-clear); background: var(--tng-alert-clear); }
  .tng-signal input[type=checkbox]:checked::after, .tng-check:checked::after {
    content: '';
    position: absolute;
    left: 6.5px;
    top: 2.5px;
    width: 5px;
    height: 10px;
    border: solid var(--tng-white);
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) scale(0);
    animation: tng-check-pop 0.2s ease-out forwards;
  }
  @keyframes tng-check-pop {
    0% { transform: rotate(45deg) scale(0); }
    100% { transform: rotate(45deg) scale(1); }
  }
  .tng-signal input[type=checkbox]:disabled, .tng-check:disabled { cursor: default; border-style: dashed; }
  .tng-signal input[type=checkbox]:disabled:checked, .tng-check:disabled:checked { border-style: solid; }

  .tng-signal-name { font-size: 15px; font-weight: 500; color: var(--tng-text-secondary); line-height: 1.35; transition: color 0.2s; }
  .tng-signal.on .tng-signal-name { color: var(--tng-white); }
  .tng-signal-detail { font-size: 13px; color: var(--tng-text-tertiary); margin-top: 3px; line-height: 1.4; }
  .tng-signal-detail:empty { display: none; }
  .tng-signal-pts {
    font-size: 15px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--tng-text-tertiary);
    white-space: nowrap;
  }
  .tng-signal.on .tng-signal-pts { color: var(--tng-clear-text); font-weight: 600; }

  /* ---------- Layout: content + score rail ----------
     Wide windows: the score card sits in a right-hand column that follows you as you scroll.
     Narrower windows: it drops below the content in normal page flow (nothing floats). */
  .tng-rail { margin-top: 40px; }
  @media (min-width: 1100px) {
    .tng-lead-scorer { max-width: 1140px; }
    .tng-layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 40px; align-items: start; }
    .tng-rail { position: sticky; top: 24px; margin-top: 0; }
  }

  /* ---------- Score card ---------- */
  .tng-result {
    position: relative;
    padding: 22px 22px 18px;
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: 18px;
    transition: border-color 0.4s, background 0.4s;
  }
  .tng-score-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 4px 0 18px; }
  .tng-breakdown { border-top: 1px solid var(--tng-hairline); padding-top: 12px; }
  .tng-breakdown-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    padding: 5px 0;
    color: var(--tng-text-tertiary);
    font-variant-numeric: tabular-nums;
  }
  .tng-breakdown-row.on { color: var(--tng-text); }
  .tng-breakdown-row.on span:last-child { color: var(--tng-clear-text); font-weight: 600; }

  .tng-total-label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tng-text-secondary); margin-bottom: 2px; }
  .tng-total-score {
    font-size: 44px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    display: inline-block;
    transition: color 0.3s;
  }
  .tng-total-score.bump { animation: tng-score-bump 0.3s ease-out; }
  @keyframes tng-score-bump {
    0% { transform: scale(1); }
    40% { transform: scale(1.08); }
    100% { transform: scale(1); }
  }
  .tng-total-score.spicy, .tng-result.heat-warm .tng-total-score {
    background: linear-gradient(180deg, #FFE082 0%, #FFB74D 30%, #FF7043 60%, #E53935 100%);
    background-size: 100% 220%;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  .tng-result.heat-warm .tng-total-score { background-position: 0 45%; }
  .tng-total-score.spicy { animation: tng-fire 1.6s ease-in-out infinite alternate; }
  .tng-total-score.spicy.bump { animation: tng-score-bump 0.3s ease-out, tng-fire 1.6s ease-in-out 0.3s infinite alternate; }
  @keyframes tng-fire {
    0%   { background-position: 0 0%;   filter: drop-shadow(0 0 10px rgba(255,112,67,0.45)); }
    50%  { background-position: 0 60%;  filter: drop-shadow(0 0 18px rgba(229,57,53,0.6)); }
    100% { background-position: 0 100%; filter: drop-shadow(0 0 12px rgba(255,183,77,0.5)); }
  }

  @property --tng-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }

  .tng-result.heat-warm {
    border-color: rgba(255,152,0,0.45);
    background: linear-gradient(160deg, rgba(230,81,0,0.18), var(--tng-surface) 60%);
    box-shadow: 0 0 36px rgba(230,81,0,0.22);
  }
  .tng-result.heat-spicy {
    border-color: transparent;
    background: linear-gradient(160deg, rgba(198,40,40,0.26), var(--tng-surface) 65%);
    animation: tng-heat-breathe 2.4s ease-in-out infinite;
  }
  .tng-result.heat-spicy::before {
    content: '';
    position: absolute;
    inset: -1px;
    border-radius: inherit;
    padding: 2px;
    background: conic-gradient(from var(--tng-angle), #C62828, #FF7043, #FFD54F, #FF7043, #E65100, #C62828);
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    animation: tng-border-spin 3s linear infinite;
    pointer-events: none;
  }
  @keyframes tng-border-spin { to { --tng-angle: 360deg; } }
  @keyframes tng-heat-breathe {
    0%, 100% { box-shadow: 0 0 28px rgba(198,40,40,0.30); }
    50%      { box-shadow: 0 0 52px rgba(255,112,67,0.45); }
  }

  .tng-result.celebrate { animation: tng-celebrate 0.8s ease-out; }
  .tng-result.heat-spicy.celebrate { animation: tng-celebrate 0.8s ease-out, tng-heat-breathe 2.4s ease-in-out 0.8s infinite; }
  @keyframes tng-celebrate {
    0% { box-shadow: 0 0 0 rgba(0,0,0,0); }
    25% { box-shadow: 0 0 0 3px rgba(255,112,67,0.7), 0 0 90px rgba(198,40,40,0.65); transform: scale(1.025); }
    100% { box-shadow: 0 0 0 rgba(0,0,0,0); }
  }

  .tng-tier {
    padding: 8px 18px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    letter-spacing: 0.04em;
    white-space: nowrap;
  }
  .tng-tier.spicy {
    color: #FFFFFF;
    background: linear-gradient(110deg, #B71C1C 0%, #E64A19 40%, #FF8F00 50%, #E64A19 60%, #B71C1C 100%);
    background-size: 250% 100%;
    box-shadow: 0 0 18px rgba(230,74,25,0.55);
    animation: tng-pill-sheen 2.2s linear infinite;
  }
  @keyframes tng-pill-sheen { from { background-position: 100% 0; } to { background-position: -150% 0; } }
  .tng-tier.heating_up { background: rgba(230,81,0,0.22); color: #FFB870; box-shadow: inset 0 0 0 1px rgba(255,152,0,0.4); }
  .tng-tier.luke_warm { background: rgba(255,193,7,0.14); color: #FFD966; }
  .tng-tier.room_temp { background: rgba(21,101,192,0.2); color: var(--tng-intel-text); }
  .tng-tier.ice_cold { background: rgba(255,255,255,0.07); color: var(--tng-text-secondary); }

  /* ---------- Export & footnote ---------- */
  .tng-export-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
  .tng-export-btn { flex: 1; white-space: nowrap; }
  .tng-export-confirm { flex-basis: 100%; text-align: center; }
  .tng-export-btn {
    background: var(--tng-surface-2);
    color: var(--tng-text);
    border: 1px solid var(--tng-hairline);
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 500;
    border-radius: var(--tng-radius-sm);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
  }
  .tng-export-btn:hover { background: var(--tng-surface-3); }
  .tng-export-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .tng-export-btn:disabled { opacity: 0.45; cursor: not-allowed; }
  .tng-ico { width: 16px; height: 16px; flex: none; }
  /* One main export (filled white), the rest secondary, and "start over" set apart as a quiet outline. */
  .tng-export-btn.primary { background: var(--tng-white); color: var(--tng-black); border-color: var(--tng-white); font-weight: 600; }
  .tng-export-btn.primary:hover:not(:disabled) { background: #E5E5E7; }
  .tng-export-btn.ghost { flex: 0 0 auto; margin-left: auto; background: transparent; color: var(--tng-text-secondary); border-color: var(--tng-hairline-strong); }
  .tng-export-btn.ghost:hover { color: var(--tng-white); background: transparent; border-color: rgba(255,255,255,0.3); }
  .tng-export-note { display: flex; align-items: flex-start; gap: 8px; flex-basis: 100%; font-size: 13px; line-height: 1.5; color: var(--tng-text-tertiary); margin-top: 2px; }
  .tng-export-note .tng-ico { width: 14px; height: 14px; margin-top: 2px; color: var(--tng-intel-text); }
  .tng-export-note b { color: var(--tng-text-secondary); font-weight: 600; }
  .tng-export-confirm { font-size: 14px; color: var(--tng-clear-text); opacity: 0; transition: opacity 0.3s; }

  /* ---------- Single Lead: a calm start, results first, the full checklist on request ---------- */
  .tng-empty { display: none; margin-top: 20px; padding: 28px 28px 22px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: 18px; }
  #tng-mode-single.is-empty .tng-empty { display: block; }
  #tng-mode-single.is-empty .tng-section, #tng-mode-single.is-empty .tng-adjust,
  #tng-mode-single.is-empty .tng-export-row, #tng-mode-single.is-empty .tng-score-row,
  #tng-mode-single.is-empty .tng-breakdown, #tng-mode-single.is-empty .tng-score-help { display: none; }
  .tng-score-empty { display: none; font-size: 15px; line-height: 1.5; color: var(--tng-text-tertiary); margin: 10px 0 4px; }
  #tng-mode-single.is-empty .tng-score-empty { display: block; }
  .tng-empty-title { font-size: 22px; font-weight: 700; letter-spacing: -0.015em; color: var(--tng-white); }
  .tng-empty-sub { font-size: 15px; color: var(--tng-text-secondary); margin: 6px 0 24px; line-height: 1.5; }
  .tng-empty-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px 28px; }
  .tng-empty-item { display: flex; gap: 14px; align-items: flex-start; }
  .tng-empty-item .tng-ico { width: 20px; height: 20px; flex: none; padding: 9px; box-sizing: content-box; color: var(--tng-intel-text); background: rgba(21,101,192,0.14); border-radius: 12px; }
  .tng-empty-item b { display: block; font-size: 15px; color: var(--tng-white); margin-bottom: 3px; }
  .tng-empty-item span { font-size: 14px; color: var(--tng-text-tertiary); line-height: 1.45; }
  .tng-empty .tng-help-link { margin-top: 24px; }

  .tng-adjust { margin-top: 36px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: 18px; }
  .tng-adjust > summary { list-style: none; cursor: pointer; display: flex; flex-wrap: wrap; align-items: center; gap: 6px 14px; padding: 18px 22px; border-radius: 18px; }
  .tng-adjust > summary::-webkit-details-marker { display: none; }
  .tng-adjust > summary:hover { background: var(--tng-surface-2); }
  .tng-adjust-title { display: inline-flex; align-items: center; gap: 10px; font-size: 16px; font-weight: 600; color: var(--tng-white); }
  .tng-adjust-title .tng-ico { color: var(--tng-text-secondary); }
  .tng-adjust-count { font-size: 13px; color: var(--tng-text-tertiary); font-variant-numeric: tabular-nums; }
  .tng-adjust-chev { margin-left: auto; display: inline-flex; color: var(--tng-text-tertiary); transition: transform 0.2s; }
  .tng-adjust[open] .tng-adjust-chev { transform: rotate(180deg); }
  .tng-adjust-matched { flex-basis: 100%; font-size: 13px; color: var(--tng-clear-text); line-height: 1.5; }
  .tng-adjust-matched:empty { display: none; }
  .tng-adjust-body { padding: 4px 22px 24px; border-top: 1px solid var(--tng-hairline); }
  .tng-adjust-body .tng-section { margin-top: 26px; }
  .tng-section, .tng-adjust-body [id] { scroll-margin-top: 24px; }
  .tng-flash { animation: tng-flash 1.4s ease-out; border-radius: 14px; }
  @keyframes tng-flash { 0%, 35% { box-shadow: 0 0 0 2px rgba(91,158,240,0.75); } 100% { box-shadow: 0 0 0 2px rgba(91,158,240,0); } }
  button.tng-breakdown-row { width: calc(100% + 12px); margin: 0 -6px; padding: 5px 6px; background: none; border: 0; border-radius: 6px; font-family: inherit; cursor: pointer; text-align: left; }
  button.tng-breakdown-row:hover { background: var(--tng-surface-2); }
  button.tng-breakdown-row:hover span:first-child { color: var(--tng-white); }
  .tng-score-help { margin-top: 14px; }
  .tng-help-tiers { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 6px; }
  .tng-help-row { display: flex; justify-content: space-between; gap: 16px; padding: 7px 0; border-top: 1px solid var(--tng-hairline); font-size: 14px; line-height: 1.45; color: var(--tng-text-secondary); }
  .tng-help-row b { color: var(--tng-clear-text); white-space: nowrap; font-variant-numeric: tabular-nums; }
  @media (max-width: 640px) {
    .tng-empty-grid { grid-template-columns: minmax(0, 1fr); }
    .tng-empty { padding: 22px 18px; }
    .tng-adjust > summary { padding: 16px 18px; }
    .tng-adjust-body { padding: 4px 18px 20px; }
  }

  /* ---------- Moments worth noticing: toasts and the heat wave ---------- */
  .tng-toast-wrap { position: fixed; left: 50%; bottom: 28px; transform: translateX(-50%); z-index: 120; display: flex; flex-direction: column; align-items: center; gap: 8px; pointer-events: none; width: max-content; max-width: calc(100vw - 32px); }
  .tng-toast { padding: 12px 22px; border-radius: 999px; background: rgba(28,28,30,0.97); border: 1px solid var(--tng-hairline-strong); color: var(--tng-white); font-size: 15px; font-weight: 600; text-align: center; box-shadow: 0 12px 40px rgba(0,0,0,0.5); animation: tng-toast-in 0.4s cubic-bezier(0.2, 0.9, 0.3, 1.25), tng-toast-out 0.4s ease-in 2.9s forwards; }
  .tng-toast.spicy { background: linear-gradient(110deg, #B71C1C, #F4511E 55%, #FF8F00); border-color: rgba(255,183,77,0.6); box-shadow: 0 12px 44px rgba(244,81,30,0.55); font-size: 16px; }
  .tng-toast.warm { border-color: rgba(255,152,0,0.55); color: #FFD08A; }
  .tng-toast.good { border-color: rgba(111,207,127,0.5); color: var(--tng-clear-text); }
  @keyframes tng-toast-in { from { opacity: 0; transform: translateY(18px) scale(0.94); } }
  @keyframes tng-toast-out { to { opacity: 0; transform: translateY(10px); } }
  .tng-heatwave { position: fixed; inset: 0; pointer-events: none; z-index: 49; background: radial-gradient(ellipse at 50% 115%, rgba(244,81,30,0.38), rgba(244,81,30,0) 60%), radial-gradient(ellipse at 85% -10%, rgba(255,143,0,0.2), rgba(255,143,0,0) 45%); animation: tng-heatwave 1.8s ease-out forwards; }
  @keyframes tng-heatwave { 0% { opacity: 0; } 18% { opacity: 1; } 100% { opacity: 0; } }
  .tng-burst-confetti { position: fixed; width: 9px; height: 13px; border-radius: 2px; will-change: transform, opacity; }

  /* ---------- Push to Zoho ---------- */
  .tng-zoho-btn { display: inline-flex; align-items: center; gap: 8px; background: var(--tng-alert-clear); color: var(--tng-white); border: 1px solid rgba(255,255,255,0.14); padding: 10px 16px; font-size: 14px; font-weight: 600; border-radius: var(--tng-radius-sm); cursor: pointer; font-family: inherit; box-shadow: 0 4px 14px rgba(46,125,50,0.35); transition: background 0.2s, box-shadow 0.2s, transform 0.1s; }
  .tng-zoho-btn:hover { background: #388E3C; box-shadow: 0 6px 20px rgba(46,125,50,0.5); }
  .tng-zoho-row { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 14px; font-size: 14px; }
  .tng-zoho-row a, .tng-zoho-result a { color: var(--tng-intel-text); }
  .tng-zoho-result { margin-top: 10px; font-size: 14px; color: var(--tng-clear-text); }
  .tng-reach { display: inline-flex; flex-wrap: wrap; gap: 6px; vertical-align: middle; margin-left: 6px; }
  .tng-reach .tng-chip { padding: 2px 9px; font-size: 12px; }
  .tng-reach-row .tng-reach { margin: 10px 0 0; }
  .tng-more-people { margin-top: 14px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-lg); padding: 14px 18px; }
  .tng-brief-people .tng-more-people { background: transparent; border: none; border-top: 1px solid var(--tng-hairline); border-radius: 0; padding: 12px 0 0; margin-top: 12px; }
  .tng-more-people > summary { cursor: pointer; font-size: 14px; font-weight: 600; color: var(--tng-text-secondary); }
  .tng-more-people > summary:hover { color: var(--tng-white); }
  .tng-more-hint { font-size: 13px; color: var(--tng-text-tertiary); margin: 8px 0 4px; line-height: 1.5; }
  .tng-more-row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 12px; padding: 8px 0; border-top: 1px solid var(--tng-hairline); font-size: 14px; color: var(--tng-text-secondary); }
  .tng-more-row .name { color: var(--tng-white); font-weight: 600; }
  .tng-more-side { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px; }
  .tng-more-side .tng-reach { margin: 0; }
  .tng-more-row .error { flex-basis: 100%; color: #FF8A80; font-size: 13px; }
  .tng-help-link { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; padding: 0; background: none; border: none; color: var(--tng-intel-text); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
  .tng-help-link:hover { text-decoration: underline; }
  .tng-help-link .tng-ico { width: 14px; height: 14px; }
  .tng-modal-sub .tng-help-link { margin: 0; display: inline; }
  /* The header's instructions button: an outlined pill with the Zoho mark, so it reads as a button. */
  .tng-zoho-help-btn { display: inline-flex; align-items: center; gap: 8px; margin-top: 10px; padding: 8px 14px; background: var(--tng-surface-2); border: 1px solid var(--tng-hairline-strong); border-radius: 999px; color: var(--tng-white); font-family: inherit; font-size: 13px; font-weight: 600; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
  .tng-zoho-help-btn:hover { background: var(--tng-surface-3); border-color: rgba(255,255,255,0.35); }
  .tng-zoho-mark { width: 18px; height: 18px; flex: none; }
  .tng-zoho-tile { display: inline-flex; align-items: center; justify-content: center; width: 20px; height: 20px; flex: none; background: #FFFFFF; border-radius: 5px; }
  .tng-zoho-tile .tng-zoho-mark { width: 16px; height: 16px; }
  .tng-help-steps { margin: 0; padding-left: 20px; font-size: 14px; line-height: 1.55; color: var(--tng-text); }
  .tng-help-steps li + li { margin-top: 6px; }
  .tng-help-h { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tng-text-tertiary); margin: 18px 0 6px; }
  .tng-help-p { font-size: 14px; line-height: 1.55; color: var(--tng-text-secondary); margin: 0; }
  .tng-help-p b, .tng-help-steps b { color: var(--tng-white); font-weight: 600; }
  .tng-modal-backdrop { position: fixed; inset: 0; z-index: 100; display: flex; align-items: flex-start; justify-content: center; padding: 6vh 16px; background: rgba(0,0,0,0.72); overflow-y: auto; }
  .tng-modal { width: 100%; max-width: 640px; background: var(--tng-surface); border: 1px solid var(--tng-hairline-strong); border-radius: var(--tng-radius-lg); padding: 24px; box-shadow: 0 24px 80px rgba(0,0,0,0.6); }
  .tng-modal-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .tng-modal-head h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--tng-white); }
  .tng-modal-x { background: none; border: none; color: var(--tng-text-secondary); font-size: 26px; line-height: 1; cursor: pointer; padding: 0 4px; }
  .tng-modal-x:hover { color: var(--tng-white); }
  .tng-modal-sub { font-size: 13px; line-height: 1.5; color: var(--tng-text-tertiary); margin: 6px 0 16px; }
  .tng-modal-off { padding: 10px 14px; margin-bottom: 14px; border-radius: var(--tng-radius-sm); background: rgba(230,81,0,0.14); color: #FFC977; font-size: 13px; line-height: 1.5; }
  .tng-push-label { display: block; font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tng-text-tertiary); margin: 12px 0 5px; }
  .tng-push-input, .tng-push-select, .tng-push-note { width: 100%; box-sizing: border-box; background: var(--tng-surface-2); border: 1px solid var(--tng-hairline-strong); color: var(--tng-text); border-radius: var(--tng-radius-sm); padding: 9px 11px; font-family: inherit; font-size: 14px; }
  .tng-push-input:focus, .tng-push-select:focus, .tng-push-note:focus { outline: none; border-color: rgba(91,158,240,0.6); }
  .tng-push-note { min-height: 140px; resize: vertical; line-height: 1.5; font-size: 13px; }
  .tng-push-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
  .tng-push-pick-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
  .tng-push-pick-row .tng-push-select { flex: 1; min-width: 220px; }
  .tng-push-more { margin-top: 14px; }
  .tng-push-more > summary { cursor: pointer; font-size: 14px; color: var(--tng-text-secondary); }
  .tng-push-note-title { font-size: 13px; font-weight: 600; color: var(--tng-text-secondary); margin: 10px 0 6px; }
  .tng-push-status { margin-top: 16px; padding: 12px 14px; border-radius: var(--tng-radius-sm); background: var(--tng-surface-2); font-size: 14px; line-height: 1.55; color: var(--tng-text-secondary); }
  .tng-push-status:empty { display: none; }
  .tng-push-status ul { margin: 4px 0 0; padding-left: 18px; }
  .tng-push-status .bad { color: #FF8A80; }
  .tng-push-status .warn { color: #FFC977; }
  .tng-push-status .good { color: var(--tng-clear-text); }
  .tng-push-status a { color: var(--tng-intel-text); }
  .tng-push-status label { display: flex; gap: 8px; align-items: flex-start; margin-top: 8px; color: var(--tng-text); cursor: pointer; }
  .tng-push-status .tng-radar { display: inline-block; vertical-align: -3px; margin-right: 8px; }
  .tng-push-foot { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 10px; margin-top: 18px; }
  .tng-push-foot .stale { margin-right: auto; font-size: 13px; color: #FFC977; }
  .tng-push-foot .tng-export-btn { flex: 0 0 auto; }
  @media (max-width: 640px) {
    .tng-push-grid { grid-template-columns: minmax(0, 1fr); }
    .tng-modal { padding: 18px; }
  }
  .tng-export-confirm.active { opacity: 1; }

  .tng-footnote {
    font-size: 12px;
    color: var(--tng-text-tertiary);
    margin-top: 28px;
    padding: 24px 0 48px;
    border-top: 1px solid var(--tng-hairline);
    line-height: 1.65;
  }

  /* ---------- Loading indicator ---------- */
  .tng-radar {
    width: 16px;
    height: 16px;
    min-width: 16px;
    border-radius: 50%;
    border: 2px solid rgba(91,158,240,0.25);
    border-top-color: var(--tng-intel-text);
    animation: tng-spin 0.8s linear infinite;
  }
  @keyframes tng-spin { to { transform: rotate(360deg); } }

  .tng-burst-layer { position: fixed; inset: 0; pointer-events: none; z-index: 110; overflow: hidden; } /* above pop-ups, below toasts */
  .tng-burst-ember, .tng-burst-chili { position: fixed; will-change: transform, opacity; }
  .tng-burst-ember {
    border-radius: 50%;
    background: radial-gradient(circle, #FFF3C4 0%, #FFB74D 40%, #FF5722 75%, rgba(255,87,34,0) 100%);
    box-shadow: 0 0 8px 2px rgba(255,112,67,0.7);
  }
  .tng-burst-chili { font-size: 26px; line-height: 1; filter: drop-shadow(0 0 6px rgba(255,87,34,0.6)); }

  @media (prefers-reduced-motion: reduce) {
    .tng-lead-scorer *, .tng-lead-scorer *::before, .tng-lead-scorer *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  /* ---------- Mode switch: Single Lead / Hunter Brief ---------- */
  .tng-mode-bar { display: flex; justify-content: center; margin-bottom: 32px; }
  .tng-mode-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: 999px;
  }
  .tng-mode-tab {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: none;
    color: var(--tng-text-secondary);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    padding: 9px 22px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
  .tng-mode-tab .tng-ico { width: 16px; height: 16px; }
  .tng-mode-tab:hover { color: var(--tng-white); }
  .tng-mode-tab[aria-selected="true"] { background: var(--tng-white); color: var(--tng-black); }

  /* ---------- Hunter Brief: upload, review, ranked results ---------- */
  .tng-brief-drop {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    text-align: center;
    padding: 44px 24px;
    background: var(--tng-surface);
    border: 1.5px dashed var(--tng-hairline-strong);
    border-radius: var(--tng-radius-lg);
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s;
  }
  .tng-brief-drop[hidden] { display: none; }
  .tng-brief-drop:hover, .tng-brief-drop.dragover { border-color: rgba(91,158,240,0.6); background: rgba(21,101,192,0.08); }
  .tng-brief-drop input { display: none; }
  .tng-brief-drop-title { font-size: 18px; font-weight: 600; color: var(--tng-white); }
  .tng-brief-drop-sub { font-size: 14px; color: var(--tng-text-tertiary); }

  .tng-progress { height: 4px; margin: -8px 0 20px; background: var(--tng-surface-3); border-radius: 999px; overflow: hidden; }
  .tng-progress-bar { height: 100%; width: 0; background: var(--tng-intel-text); transition: width 0.4s; }

  /* How it works: 1 choose, 2 check, 3 vet. The current step is lit. */
  .tng-brief-steps { list-style: none; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 0 0 24px; padding: 0; }
  .tng-brief-steps li { display: flex; gap: 12px; padding: 14px 16px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-md); font-size: 13px; line-height: 1.45; color: var(--tng-text-tertiary); transition: border-color 0.3s, background 0.3s; }
  .tng-brief-steps b { display: block; font-size: 14px; font-weight: 600; color: var(--tng-text-secondary); margin-bottom: 2px; }
  .tng-brief-steps .num { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 50%; font-size: 12px; font-weight: 700; background: var(--tng-surface-3); color: var(--tng-text-secondary); }
  .tng-brief-steps li.current { border-color: rgba(91,158,240,0.55); background: rgba(21,101,192,0.10); }
  .tng-brief-steps li.current b { color: var(--tng-white); }
  .tng-brief-steps li.current .num { background: var(--tng-intel-text); color: var(--tng-black); }
  .tng-brief-steps li.done .num { background: rgba(46,125,50,0.25); color: var(--tng-clear-text); font-size: 0; }
  .tng-brief-steps li.done .num::after { content: '✓'; font-size: 13px; }

  /* Reading the brief: what's happening, with a countdown. */
  .tng-work { padding: 22px 24px; margin-bottom: 24px; background: var(--tng-surface); border: 1px solid rgba(91,158,240,0.35); border-radius: var(--tng-radius-lg); }
  .tng-work[hidden] { display: none; }
  .tng-work-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; }
  .tng-work-title { font-size: 18px; font-weight: 600; color: var(--tng-white); }
  .tng-work-time { font-size: 15px; color: var(--tng-intel-text); font-variant-numeric: tabular-nums; }
  .tng-work .tng-progress { margin: 14px 0 18px; height: 6px; }
  .tng-work-steps { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
  .tng-work-steps li { display: flex; align-items: center; gap: 12px; font-size: 14px; line-height: 1.4; color: var(--tng-text-tertiary); }
  .tng-work-steps .mark { flex: none; display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--tng-hairline-strong); }
  .tng-work-steps li.current { color: var(--tng-white); }
  .tng-work-steps li.current .mark { border: 2px solid rgba(91,158,240,0.25); border-top-color: var(--tng-intel-text); animation: tng-spin 0.8s linear infinite; }
  .tng-work-steps li.done { color: var(--tng-text-secondary); }
  .tng-work-steps li.done .mark { border: none; background: rgba(46,125,50,0.25); color: var(--tng-clear-text); font-size: 11px; font-weight: 700; }
  .tng-work-steps li.done .mark::after { content: '✓'; }
  .tng-work-steps .detail { color: var(--tng-text-tertiary); }
  .tng-work-note { margin-top: 16px; font-size: 13px; color: var(--tng-text-tertiary); line-height: 1.5; }
  .tng-chip .lookup { opacity: 0.55; }
  .tng-chip .lookup.done { opacity: 1; }

  .tng-brief-summary { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
  .tng-brief-summary-text { font-size: 15px; color: var(--tng-text-secondary); line-height: 1.5; }
  .tng-brief-summary-text strong { color: var(--tng-white); font-weight: 600; }
  .tng-brief-summary .tng-export-row { margin-top: 0; }
  /* The results header (title, counts, exports) stays in view while a long brief scrolls under it. */
  .tng-results-bar { position: sticky; top: 0; z-index: 6; margin: 0 0 6px; padding: 14px 0; background: var(--tng-black); border-bottom: 1px solid var(--tng-hairline); }
  .tng-results-bar .tng-help-link { margin-top: 6px; }
  .tng-brief-export-note { margin: 0 0 20px; }
  /* Kept for the exported report, which reuses its text; on screen it's the How priority works pop-up. */
  #tng-mode-brief > .tng-footnote { display: none; }
  .tng-brief-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
  /* The top Vet bar stays in view while the lead list scrolls under it. */
  .tng-brief-actions.top { position: sticky; top: 0; z-index: 5; margin: 16px 0 0; padding: 12px 0; background: var(--tng-black); border-bottom: 1px solid var(--tng-hairline); }
  .tng-brief-credits { font-size: 13px; color: var(--tng-text-tertiary); }

  /* Review list: one row per lead, with its website to confirm before vetting */
  .tng-brief-list { background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-lg); overflow: hidden; }
  .tng-brief-row { display: flex; align-items: flex-start; gap: 16px; padding: 14px 18px; }
  .tng-brief-row + .tng-brief-row { border-top: 1px solid var(--tng-hairline); }
  .tng-brief-row.on { background: rgba(46,125,50,0.06); }
  .tng-brief-row .tng-check { margin-top: 1px; }
  .tng-brief-row-main { flex: 1; min-width: 0; }
  .tng-brief-row-name { font-size: 15px; font-weight: 600; color: var(--tng-text-secondary); line-height: 1.35; }
  .tng-brief-row.on .tng-brief-row-name { color: var(--tng-white); }
  .tng-brief-row-sub { font-size: 13px; color: var(--tng-text-tertiary); margin-top: 3px; line-height: 1.4; }
  .tng-brief-domain { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
  .tng-brief-domain input {
    width: 240px;
    max-width: 100%;
    height: 34px;
    padding: 0 10px;
    background: var(--tng-surface-2);
    border: 1px solid var(--tng-hairline);
    border-radius: var(--tng-radius-sm);
    color: var(--tng-text);
    font-family: inherit;
    font-size: 14px;
  }
  .tng-brief-domain input:focus { outline: none; border-color: rgba(91,158,240,0.6); }
  .tng-brief-domain input.invalid { border-color: rgba(198,40,40,0.7); }
  .tng-brief-score { font-size: 15px; font-weight: 600; font-variant-numeric: tabular-nums; color: var(--tng-text-secondary); white-space: nowrap; }

  /* Result cards */
  .tng-brief-lead {
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: var(--tng-radius-lg);
    padding: 22px 24px;
    margin-bottom: 14px;
  }
  .tng-brief-lead-head { display: flex; align-items: flex-start; gap: 14px; }
  .tng-brief-pos {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    margin-top: 1px;
    font-size: 14px;
    font-weight: 700;
    color: var(--tng-text-secondary);
    background: var(--tng-surface-2);
    border-radius: 999px;
  }
  .tng-brief-lead-title { flex: 1; min-width: 0; }
  .tng-brief-org { font-size: 21px; font-weight: 700; letter-spacing: -0.015em; line-height: 1.25; color: var(--tng-white); }
  .tng-brief-opp { font-size: 14px; color: var(--tng-text-secondary); margin-top: 3px; line-height: 1.45; }
  .tng-brief-priority { text-align: right; }
  .tng-brief-priority-num { font-size: 30px; font-weight: 700; letter-spacing: -0.02em; line-height: 1; font-variant-numeric: tabular-nums; color: var(--tng-white); }
  .tng-brief-priority-label { font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tng-text-tertiary); margin-top: 5px; }
  .tng-brief-chips { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 14px; }
  .tng-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    padding: 4px 12px;
    border-radius: 999px;
    white-space: nowrap;
    color: var(--tng-text-secondary);
    background: rgba(255,255,255,0.06);
  }
  .tng-chip.good { color: var(--tng-clear-text); background: rgba(46,125,50,0.16); }
  .tng-chip.info { color: #8DBDF7; background: rgba(21,101,192,0.18); }
  .tng-chip.warn { color: #FFC977; background: rgba(230,81,0,0.16); }
  .tng-chip.bad { color: #FF8A80; background: rgba(198,40,40,0.16); }
  .tng-chip .tng-radar { width: 12px; height: 12px; min-width: 12px; }
  .tng-tier.sm { padding: 4px 12px; font-size: 13px; }
  .tng-brief-quiet { font-size: 13px; color: var(--tng-text-tertiary); margin-top: 10px; line-height: 1.5; }
  .tng-brief-why { font-size: 13px; color: var(--tng-text-tertiary); margin-top: 10px; font-variant-numeric: tabular-nums; }
  .tng-brief-facts { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 8px 16px; margin: 16px 0 0; font-size: 15px; line-height: 1.55; }
  .tng-brief-facts dt { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tng-text-tertiary); padding-top: 3px; }
  .tng-brief-facts dd { margin: 0; color: #D1D1D6; overflow-wrap: anywhere; }
  .tng-brief-facts dd.caveat { color: #FFC977; }
  .tng-brief-facts .muted { color: var(--tng-text-tertiary); }
  .tng-brief-people { margin-top: 16px; padding: 14px 16px; background: var(--tng-surface-2); border-radius: var(--tng-radius-sm); font-size: 14px; line-height: 1.6; }
  .tng-brief-people-label { font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tng-intel-text); margin-bottom: 4px; }
  .tng-brief-people-label + .tng-brief-person { margin-top: 0; }
  .tng-brief-person { margin-top: 6px; color: var(--tng-text-secondary); }
  .tng-brief-person + .tng-brief-people-label { margin-top: 12px; }
  .tng-brief-person .name { color: var(--tng-white); font-weight: 600; }
  .tng-brief-person .email { color: var(--tng-clear-text); }
  .tng-brief-person .muted { color: var(--tng-text-tertiary); }
  .tng-brief-person .error { color: #FF8A80; }
  .tng-brief-reveal { padding: 4px 12px; font-size: 13px; margin-left: 6px; }
  .tng-brief-error-row { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 12px; font-size: 14px; color: #FF8A80; }
  .tng-brief-more { margin-top: 14px; }
  .tng-brief-more > summary, .tng-brief-watch > summary {
    cursor: pointer;
    list-style: none;
    font-size: 14px;
    font-weight: 600;
    color: var(--tng-intel-text);
  }
  .tng-brief-more > summary::-webkit-details-marker, .tng-brief-watch > summary::-webkit-details-marker { display: none; }
  .tng-brief-more > summary::before, .tng-brief-watch > summary::before { content: '▸ '; }
  .tng-brief-more[open] > summary::before, .tng-brief-watch[open] > summary::before { content: '▾ '; }
  .tng-brief-draft { margin: 0; padding: 14px 16px; white-space: pre-wrap; font-family: inherit; font-size: 14px; line-height: 1.6; color: #C7C7CC; background: var(--tng-surface-2); border-radius: var(--tng-radius-sm); }
  .tng-brief-watch { margin: 24px 0 0; }
  .tng-brief-watch > summary { color: var(--tng-text-secondary); margin-bottom: 14px; }

  /* ---------- Narrower windows: stack the header and search row ---------- */
  @media (max-width: 760px) {
    .tng-header { flex-direction: column; align-items: flex-start; gap: 14px; }
    .tng-header-note { text-align: left; max-width: none; }
    .tng-mode-bar { justify-content: stretch; }
    .tng-mode-tabs { display: flex; width: 100%; }
    .tng-mode-tab { flex: 1; justify-content: center; padding: 9px 12px; }
    .tng-input-row { flex-wrap: wrap; }
    .tng-input-row input { flex: 1 1 100%; }
    .tng-analyze-btn { flex: 1; }
  }

  /* ---------- Small screens ---------- */
  @media (max-width: 640px) {
    .tng-lead-scorer { padding: 24px 16px 0; }
    .tng-header h1 { font-size: 28px; }
    .tng-brief-steps { grid-template-columns: minmax(0, 1fr); gap: 8px; }
    .tng-work { padding: 18px; }
    .tng-company-card, .tng-contact-card { padding: 20px; }
    .tng-company-name { font-size: 22px; }
    .tng-signal { padding: 12px 14px; }
    .tng-signal + .tng-signal::before { left: 50px; }
    .tng-total-score { font-size: 36px; }
    .tng-brief-lead { padding: 18px; }
    .tng-brief-org { font-size: 19px; }
    .tng-brief-priority-num { font-size: 26px; }
    .tng-brief-facts { grid-template-columns: minmax(0, 1fr); gap: 2px; }
    .tng-brief-facts dd { margin-bottom: 10px; }
  }
`;

  const TNG_MARKUP = `

<div class="tng-lead-scorer">
  <div class="tng-logo-banner">
    <!-- TNG logo, inlined from tngdefense.com so it renders where outside images are blocked -->
    <svg xmlns="http://www.w3.org/2000/svg" class="tng-logo-img" role="img" aria-label="The North Group" viewBox="0 0 864.48 155.15"><defs><style>.tng-logo-fill{fill:#fff;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="Layer_1-2" data-name="Layer 1"><polygon class="tng-logo-fill" points="117.7 24.71 122.73 8.16 127.71 24.71 124.73 24.71 124.73 69.75 121.12 69.75 121.12 24.71 117.7 24.71"/><path class="tng-logo-fill" d="M124.86,130c0,1.62-.64,2.43-1.94,2.43a2.59,2.59,0,0,1-1.78-1.14L39.53,29.73v99.75c0,1.3-.59,2-1.78,2a1.72,1.72,0,0,1-2-1.45,2,2,0,0,1,0-.55V25c0-1.62.65-2.42,1.94-2.43a2.61,2.61,0,0,1,1.78,1.13l81.62,101.7V25.35c0-1.29.59-1.94,1.78-1.94a1.72,1.72,0,0,1,1.94,1.45,2,2,0,0,1,0,.49Z"/><path class="tng-logo-fill" d="M149.74,105q0,2.49-4.75,10.62a81.12,81.12,0,0,1-6.54,10.14,76.15,76.15,0,0,1-26.77,21.57,75.2,75.2,0,0,1-33.54,7.8q-32.29,0-55.22-22.93T0,77Q0,44.72,22.58,22.35T77.47,0a78.2,78.2,0,0,1,27.8,4.86c1,.36,1.9.74,2.84,1.15,6.54,2.81,3.91,7.41-2.17,4.76q-1.36-.6-2.76-1.14A71,71,0,0,0,77.47,5q-30,0-50.94,21T5.66,77q0,30.27,21.23,51.72t51.5,21.51a70.3,70.3,0,0,0,65-42.69H57.61a2.5,2.5,0,0,1,0-5H146.8C148.75,102.52,149.74,103.35,149.74,105Z"/><path class="tng-logo-fill" d="M181.74,58.64H164.22V53.31h42.65v5.33h-17.6v43.2h-7.53Z"/><path class="tng-logo-fill" d="M221.15,53.31v20.3H249V53.31h7.52v48.53H249V79.09H221.15v22.75h-7.44V53.31Z"/><path class="tng-logo-fill" d="M299.7,79.09H277.3V96.58h25v5.26H269.87V53.31H301v5.25H277.3V73.9h22.4Z"/><path class="tng-logo-fill" d="M330.9,101.84V53.31H339l18.51,24.55a134.56,134.56,0,0,1,10.34,15.77l.17-.07a182,182,0,0,1-.85-20V53.31h7v48.53h-7.52L348.33,77.18A151.13,151.13,0,0,1,337.53,61l-.25.07c.42,6.12.59,12,.59,20v20.74Z"/><path class="tng-logo-fill" d="M436.8,77.07c0,16.7-12,25.56-26.76,25.56-15.21,0-25.89-9.94-25.89-24.62,0-15.41,11.36-25.49,26.75-25.49C426.63,52.52,436.8,62.67,436.8,77.07Zm-44.7.79c0,10.37,6.66,19.66,18.37,19.66s18.46-9.15,18.46-20.16c0-9.65-6-19.73-18.37-19.73S392.1,67.18,392.1,77.86Z"/><path class="tng-logo-fill" d="M446.88,54a92.23,92.23,0,0,1,14.28-1c8,0,13.08,1.22,16.67,4a11.27,11.27,0,0,1,4.53,9.21c0,6.41-4.79,10.66-10.86,12.39v.22c4.45,1.29,7.09,4.75,8.46,9.79,1.88,6.77,3.25,11.45,4.45,13.32h-7.7c-.94-1.37-2.22-5.54-3.84-11.59-1.71-6.7-4.79-9.22-11.54-9.44h-7v21h-7.44Zm7.44,22.1h7.61c8,0,13-3.67,13-9.22,0-6.26-5.39-9-13.25-9.07a36.22,36.22,0,0,0-7.35.58Z"/><path class="tng-logo-fill" d="M505,58.64H487.53V53.31h42.6v5.33h-17.6v43.2H505Z"/><path class="tng-logo-fill" d="M544.41,53.31v20.3h27.86V53.31h7.52v48.53h-7.52V79.09H544.41v22.75H537V53.31Z"/><path class="tng-logo-fill" d="M655.53,99.68a62.4,62.4,0,0,1-17.69,2.66c-8.72,0-15.9-1.87-21.54-6.4-5-4-8-10.52-8-18.08.08-14.47,11.88-25.06,31.2-25.06A41.74,41.74,0,0,1,653.86,55l-1.8,5.11a35,35,0,0,0-12.74-2.09c-14,0-23.16,7.34-23.16,19.51,0,12.32,8.81,19.59,22.22,19.59,4.88,0,8.21-.58,9.92-1.3V81.39H636.53v-5h19Z"/><path class="tng-logo-fill" d="M667.32,54a92.23,92.23,0,0,1,14.28-1c7.94,0,13.07,1.22,16.66,4a11.23,11.23,0,0,1,4.53,9.21c0,6.41-4.78,10.66-10.85,12.39v.22c4.44,1.29,7.09,4.75,8.46,9.79,1.88,6.77,3.25,11.45,4.44,13.32h-7.69c-.94-1.37-2.22-5.54-3.85-11.59-1.7-6.7-4.78-9.22-11.53-9.44h-7v21h-7.44Zm7.44,22.1h7.6c7.95,0,13-3.67,13-9.22,0-6.26-5.39-9-13.25-9.07a36.22,36.22,0,0,0-7.35.58Z"/><path class="tng-logo-fill" d="M763.22,77.07c0,16.7-12.05,25.56-26.75,25.56-15.22,0-25.9-9.94-25.9-24.62,0-15.41,11.37-25.49,26.75-25.49C753.05,52.52,763.22,62.67,763.22,77.07Zm-44.7.79c0,10.37,6.67,19.66,18.38,19.66s18.46-9.15,18.46-20.16c0-9.65-6-19.73-18.38-19.73s-18.45,9.55-18.45,20.23Z"/><path class="tng-logo-fill" d="M780.74,53.31V82c0,10.87,5.73,15.48,13.42,15.48,8.55,0,14-4.75,14-15.48V53.31h7.52v28.3c0,14.9-9.31,21-21.79,21-11.8,0-20.69-5.69-20.69-20.74V53.31Z"/><path class="tng-logo-fill" d="M829,53.88A103.22,103.22,0,0,1,843.31,53c7.35,0,12.74,1.44,16.16,4a12.19,12.19,0,0,1,5,10.15A13,13,0,0,1,860,77.47c-3.93,3.53-10.34,5.33-17.6,5.33a29.42,29.42,0,0,1-6-.43v19.44H829Zm7.43,23.41a29.56,29.56,0,0,0,6.16.5c9,0,14.44-3.67,14.44-10.37,0-6.41-5.38-9.5-13.59-9.5a37.31,37.31,0,0,0-7,.5Z"/></g></g></svg>
  </div>

  <div class="tng-header">
    <div class="tng-header-title-block">
      <h1>TNG Opportunity Score</h1>
      <div class="tng-version-line">TNG OP TOOL V.4.1 · Created by Trever Koltys</div>
    </div>
    <div class="tng-header-tools">
      <a class="tng-header-link" href="https://app.apollo.io/" target="_blank" rel="noopener" title="This tool works alongside Apollo">Open Apollo${tngIcon('external')}</a>
      <button class="tng-zoho-help-btn" onclick="tngZohoHelp()">${ZOHO_MARK}Zoho push instructions</button>
    </div>
  </div>

  <div class="tng-mode-bar">
    <div class="tng-mode-tabs" role="tablist" aria-label="Mode">
      <button class="tng-mode-tab" role="tab" id="tng-tab-single" aria-selected="true" onclick="tngSetMode('single')">${tngIcon('search')}Single Lead</button>
      <button class="tng-mode-tab" role="tab" id="tng-tab-brief" aria-selected="false" onclick="tngSetMode('brief')">${tngIcon('doc')}Hunter Brief</button>
    </div>
  </div>

  <div id="tng-mode-single" class="is-empty">
  <div class="tng-layout">
  <div class="tng-main">

  <div class="tng-input-row">
    <input type="text" id="tng-domain" placeholder="Company website, e.g. acme.com" />
    <input type="text" id="tng-email" placeholder="Contact email (optional)" />
    <button class="tng-analyze-btn" id="tng-analyze-btn" onclick="tngAnalyze()">Analyze</button>
    <button class="tng-reset-btn" id="tng-reset-btn" onclick="tngReset()">Reset</button>
  </div>
  <div class="tng-status" id="tng-status"><span class="tng-radar"></span><span id="tng-status-text">Querying Apollo...</span></div>
  <div class="tng-error" id="tng-error"></div>

  <div class="tng-empty" id="tng-empty">
    <div class="tng-empty-title">Size up a company in about 30 seconds</div>
    <div class="tng-empty-sub">Enter its website and press Analyze. Add a contact's email too if you have one.</div>
    <div class="tng-empty-grid">
      <div class="tng-empty-item">${tngIcon('building')}<div><b>Who they are</b><span>Industry, size and revenue, from Apollo</span></div></div>
      <div class="tng-empty-item">${tngIcon('user')}<div><b>Who to call</b><span>The best contact, and whether Apollo has their email</span></div></div>
      <div class="tng-empty-item">${tngIcon('bolt')}<div><b>Why now</b><span>Security incidents and trigger events in the news</span></div></div>
      <div class="tng-empty-item">${tngIcon('check')}<div><b>Already know us?</b><span>Zoho CRM, and their visits to tngdefense.com</span></div></div>
    </div>
    <button class="tng-help-link" onclick="tngScoreByHand()">Or score a company by hand →</button>
  </div>

  <div class="tng-company-card" id="tng-company-card">
    <div class="tng-company-header">
      <div class="tng-company-name-row">
        <div class="tng-company-name" id="tng-company-name">—</div>
        <span class="tng-hot-badge" id="tng-hot-badge">🌶️ SPICY LEAD</span>
      </div>
      <div class="tng-company-meta" id="tng-company-meta"></div>
    </div>
    <div class="tng-company-description" id="tng-company-description"></div>
    <div class="tng-source-note" id="tng-source-note"></div>
    <div class="tng-license-badge" id="tng-license-badge"></div>
    <div class="tng-corp-structure" id="tng-corp-structure"></div>
    <div class="tng-cache-note" id="tng-cache-note"></div>
    <a href="#" target="_blank" rel="noopener" class="tng-company-linkedin" id="tng-company-linkedin" style="display:none;">${LINKEDIN_LOGO}View Company on LinkedIn →</a>
  </div>

  <div class="tng-contact-card" id="tng-contact-card">
    <div class="tng-contact-label-row">
      <div class="tng-contact-label">Recommended First Contact</div>
      <button class="tng-contact-cycle-btn" id="tng-contact-cycle-btn" onclick="tngCycleContact()" style="display:none;">Next contact →</button>
    </div>
    <div class="tng-contact-name" id="tng-contact-name">—</div>
    <div class="tng-contact-title" id="tng-contact-title"></div>
    <div class="tng-reach-row" id="tng-contact-reach"></div>
    <div class="tng-contact-reasoning" id="tng-contact-reasoning"></div>
    <div class="tng-contact-actions">
      <a href="#" target="_blank" rel="noopener" class="tng-contact-link" id="tng-contact-link" style="display:none;">${LINKEDIN_LOGO}View LinkedIn →</a>
      <button class="tng-reveal-btn" id="tng-reveal-btn" onclick="tngRevealContact()" style="display:none;">${tngIcon('mail')}${REVEAL_LABEL}</button>
      <button class="tng-zoho-btn" id="tng-zoho-btn" onclick="tngPushToZoho()" style="display:none;">${ZOHO_TILE}Push to Zoho</button>
    </div>
    <div class="tng-reveal-result" id="tng-reveal-result"></div>
    <div class="tng-zoho-result" id="tng-zoho-result"></div>
  </div>
  <div id="tng-more-people"></div>

  <div class="tng-section" id="tng-sec-incidents">
    <div class="tng-section-label">Security Incidents <span class="tng-source-tag auto"><b>Automatic</b> · via news search</span></div>
    <div id="tng-news-signals"></div>
    <div class="tng-incidents" id="tng-incidents"></div>
  </div>

  <div class="tng-section" id="tng-sec-triggers">
    <div class="tng-section-label">Trigger Events <span class="tng-source-tag auto"><b>Automatic</b> · via news search</span></div>
    <div id="tng-trigger-signals"></div>
    <div class="tng-incidents" id="tng-triggers"></div>
  </div>

  <div class="tng-section" id="tng-sec-crm">
    <div class="tng-section-label">Zoho CRM <span class="tng-source-tag auto"><b>Automatic</b> · via Zoho CRM</span></div>
    <div id="tng-crm-signals"></div>
    <div class="tng-crm-records" id="tng-crm-records"></div>
  </div>

  <div class="tng-section" id="tng-sec-visits">
    <div class="tng-section-label">Visits to tngdefense.com <span class="tng-source-tag auto"><b>Automatic</b> · via Apollo</span></div>
    <div class="tng-visit-summary" id="tng-visit-summary"></div>
  </div>

  <details class="tng-adjust" id="tng-adjust">
    <summary>
      <span class="tng-adjust-title">${tngIcon('sliders')}Adjust signals</span>
      <span class="tng-adjust-count" id="tng-adjust-count"></span>
      <span class="tng-adjust-chev">${tngIcon('chevron')}</span>
      <span class="tng-adjust-matched" id="tng-adjust-matched"></span>
    </summary>
    <div class="tng-adjust-body">
      <div class="tng-section">
        <div class="tng-section-label">Firmographic <span class="tng-source-tag auto"><b>Automatic</b> · via Apollo</span></div>
        <div id="tng-vertical-signals"></div>
        <div class="tng-event-group">
          <div class="tng-event-group-label">Recent Company Activity</div>
          <div id="tng-event-signals"></div>
        </div>
      </div>

      <div class="tng-section">
        <div class="tng-section-label">Site Behavior <span class="tng-source-tag auto"><b>Automatic</b> · from the pages visited below</span></div>
        <div id="tng-site-signals"></div>
        <div class="tng-event-group">
          <div class="tng-event-group-label">Pages Visited <span class="tng-source-tag auto"><b>Automatic</b> · from Apollo, tick any extras</span></div>
          <div class="tng-hint" style="margin-top:0;">Ticked from Apollo's Website Visitors (each company's top 5 pages over the last 90 days). Service and contact pages tick the Site Behavior signals above; Home, About and Blog add a few points of their own.</div>
          <div id="tng-page-signals"></div>
        </div>
      </div>
    </div>
  </details>

  </div><!-- /.tng-main -->

  <aside class="tng-rail">
    <div class="tng-result">
      <div class="tng-total-label">Opportunity Score</div>
      <div class="tng-score-empty">Your score appears here after you analyze a company.</div>
      <div class="tng-score-row">
        <div class="tng-total-score" id="tng-total">0</div>
        <div class="tng-tier ice_cold" id="tng-tier">ICE COLD</div>
      </div>
      <div class="tng-breakdown" id="tng-breakdown"></div>
      <button class="tng-help-link tng-score-help" onclick="tngScoringHelp()">${tngIcon('info')}How scoring works</button>
    </div>

    <div class="tng-export-row">
      <button class="tng-export-btn" onclick="tngCopySummary()">${tngIcon('copy')}Copy Summary</button>
      <button class="tng-export-btn" onclick="tngExportCsv()">${tngIcon('sheet')}Download CSV</button>
      <div class="tng-export-note">${tngIcon('info')}<span>Contacts are exported with their full name and email only after you pull them from Apollo with <b>Reveal Full Name &amp; Email</b> (1 Apollo credit each).</span></div>
      <span class="tng-export-confirm" id="tng-export-confirm"></span>
    </div>
  </aside>
  </div><!-- /.tng-layout -->
  </div><!-- /#tng-mode-single -->

  <div id="tng-mode-brief" hidden>
    <ol class="tng-brief-steps" id="tng-brief-steps">
      <li data-step="1"><span class="num">1</span><span><b>Choose the brief</b>Steve's Client Hunter Brief (.html). Reading it takes about a minute.</span></li>
      <li data-step="2"><span class="num">2</span><span><b>Check the websites</b>Confirm each lead's website and untick any you want to skip.</span></li>
      <li data-step="3"><span class="num">3</span><span><b>Vet and work the list</b>Leads come back ranked best first, with who to contact.</span></li>
    </ol>
    <div class="tng-work" id="tng-brief-work" hidden></div>
    <div class="tng-status" id="tng-brief-status"><span class="tng-radar"></span><span id="tng-brief-status-text"></span></div>
    <div class="tng-progress" id="tng-brief-progress" hidden><div class="tng-progress-bar" id="tng-brief-progress-bar"></div></div>
    <div class="tng-error" id="tng-brief-error"></div>

    <label class="tng-brief-drop" id="tng-brief-drop">
      <input type="file" id="tng-brief-file" accept=".html,.htm,text/html" />
      <span class="tng-brief-drop-title">Choose a Hunter Brief</span>
      <span class="tng-brief-drop-sub">or drag the brief's .html file here</span>
    </label>

    <div id="tng-brief-review"></div>
    <div id="tng-brief-results"></div>

    <div class="tng-footnote">
      Priority starts from Steve's score in the brief and moves with what the lookups find: already in Zoho CRM (+1) · a security incident at their sites in the news in the last 12 months (+1) · a trigger event in the news in the last 6 months (+0.5) · visited the Contact or Request Services page (+1.5), otherwise viewed service pages (+1), otherwise any site visit (+0.5) · strong firmographic fit, 50+ firmographic points (+0.5) · Apollo found a security, safety or facilities contact (+0.5) · work is outside TNG's licensed states (−0.5) · deadline already passed (−2). The TNG score is the same Opportunity Score as the Single Lead view, from its automatic signals only. Each vetted lead uses 2 Apollo credits, the same as one Analyze; reading the brief uses none.
    </div>
  </div>
</div>

`;

  const fonts = document.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(fonts);
  const style = document.createElement('style');
  style.id = 'tng-styles';
  style.textContent = TNG_CSS;
  document.head.appendChild(style);
  document.title = 'TNG Opportunity Score';
  document.body.innerHTML = TNG_MARKUP;
})();

// ---------- Tool ----------
(function() {
  // Point this at your deployed backend's /api/analyze-lead endpoint
  const BACKEND_URL = "https://tng-lead.vercel.app/api/analyze-lead";
  const REVEAL_URL = "https://tng-lead.vercel.app/api/reveal-contact";
  const CRM_URL = "https://tng-lead.vercel.app/api/check-crm";
  // One news search answers both Security Incidents and Trigger Events (shared searches cost less).
  const NEWS_URL = "https://tng-lead.vercel.app/api/news-scan";
  const newsHalf = (pending, key) => pending.then(d => d.available ? d[key] : { available: false, reason: d.reason });
  // The access code lives only in the SharePoint launcher (window.TNG_CONFIG), never in
  // this file: it must match TNG_ACCESS_CODE in Vercel. If it leaks, change both and
  // hand out a new launcher.
  const ACCESS_CODE = (window.TNG_CONFIG && window.TNG_CONFIG.accessCode) || "";
  const API_HEADERS = { "Content-Type": "application/json", "x-tng-access-code": ACCESS_CODE };

  const SIGNALS = [
    // Firmographic — auto via Apollo
    { id: 'revenue_tier_0', exclusive: 'revenue', label: 'Revenue Under $10M (Startup / Founder-led)', pts: 5, group: 'auto', subgroup: 'vertical' },
    { id: 'revenue_tier_1', exclusive: 'revenue', label: 'Revenue $10M–$100M (Growth stage)', pts: 10, group: 'auto', subgroup: 'vertical' },
    { id: 'revenue_tier_2', exclusive: 'revenue', label: 'Revenue $100M–$500M (Mid-Market)', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'revenue_tier_3', exclusive: 'revenue', label: 'Revenue $500M+ (Enterprise)', pts: 30, group: 'auto', subgroup: 'vertical' },
    { id: 'healthcare', label: 'Healthcare system', pts: 25, group: 'auto', subgroup: 'vertical' },
    { id: 'education', label: 'Education institution (K-12 / university)', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'government', label: 'Government / public sector entity', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'entertainment', label: 'Entertainment, sports, or events organization', pts: 15, group: 'auto', subgroup: 'vertical' },
    { id: 'high_net_worth', label: 'High-net-worth / family office', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'it_network_security', label: 'IT / network security / MSP / data center', pts: 15, group: 'auto', subgroup: 'vertical' },
    { id: 'telecom', label: 'Telecommunications / connectivity provider', pts: 15, group: 'auto', subgroup: 'vertical' },
    { id: 'financial_services', label: 'Financial Services (banking, investment, insurance)', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'manufacturing', label: 'Manufacturing / Industrial', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'retail_hospitality', label: 'Retail / Hospitality (hotels, casinos, retail chains)', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'energy_utilities', label: 'Energy / Utilities / Critical Infrastructure', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'real_estate', label: 'Real Estate / Property Management', pts: 20, group: 'auto', subgroup: 'vertical' },
    { id: 'hiring_security', label: 'Hiring for security leadership role (CSO / Dir. of Security / GSOC)', pts: 15, group: 'auto', subgroup: 'event' },
    { id: 'recently_funded', label: 'Recently funded (funding event in last ~18 months)', pts: 15, group: 'auto', subgroup: 'event' },
    { id: 'headcount_growth', label: 'Rapid headcount growth', pts: 15, group: 'auto', subgroup: 'event' },
    { id: 'security_tech', label: 'Uses physical security / access control tech', pts: 10, group: 'auto', subgroup: 'event' },
    { id: 'multi_site', label: 'Multi-site physical footprint (retail/branch locations)', pts: 20, group: 'auto', subgroup: 'event' },
    // CRM — auto via Zoho (its own check, separate from Apollo)
    { id: 'crm', label: 'Already in Zoho CRM (account, contact, or lead)', pts: 30, group: 'crm' },
    { id: 'recent_incident', label: 'Recent security incident at their sites (last 12 months, in the news)', pts: 20, group: 'news' },
    { id: 'trigger_event', label: 'Trigger event in the news (last 6 months): layoffs, new executive, new facility, strike, big event', pts: 15, group: 'triggers' },
    // Site behavior — two capped signals, ticked automatically from the pages checklist below.
    // Scoring every page separately let a visitor who skimmed the site out-score real fit.
    { id: 'site_high_intent', label: 'Visited a high-intent page (Request Security Services or Contact Us)', pts: 30, group: 'site', derivedFrom: 'high_intent' },
    { id: 'site_services', label: 'Showed interest in TNG services (any service or Licensing page)', pts: 20, group: 'site', derivedFrom: 'service' },
    // Pages visited — service/contact pages set the two signals above; general pages (Home, About, Blog)
    // add a few points of their own. All of them double as pitch notes.
    { id: 'request_page', label: 'Request Security Services (quote form)', pts: 0, group: 'pages', pageType: 'high_intent', url: 'tngdefense.com/request-security-services' },
    { id: 'contact_page', label: 'Contact Us', pts: 0, group: 'pages', pageType: 'high_intent', url: 'tngdefense.com/contact-us' },
    { id: 'ep_page', label: 'Executive Protection', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/executive-protection' },
    { id: 'security_guard_page', label: 'Security Guard Services', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/security-guard-services' },
    { id: 'wts_page', label: 'Workplace Termination Support', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/workplace-termination-support' },
    { id: 'gsoc_page', label: 'GSOC', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/global-security-operations-center' },
    { id: 'pi_page', label: 'Protective Intelligence', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/protective-intelligence' },
    { id: 'private_client_page', label: 'Private Client Security Program', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/private-client-program' },
    { id: 'embedded_page', label: 'Embedded Services', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/embedded-services' },
    { id: 'event_sec_page', label: 'Event Security', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/event-security' },
    { id: 'cybersecurity_page', label: 'Cybersecurity', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/cybersecurity' },
    { id: 'risk_page', label: 'Risk Mitigation Strategies', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/risk-mitigation-strategies-4' },
    { id: 'emergency_prep_page', label: 'Emergency Preparedness Exercises', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/emergency-preparedness-exercises' },
    { id: 'secure_asset_page', label: 'Secure Asset Transport', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/secure-asset-transport' },
    { id: 'licensing_page', label: 'Licensing', pts: 0, group: 'pages', pageType: 'service', url: 'tngdefense.com/licensing' },
    { id: 'home_page', label: 'Home Page', pts: 10, group: 'pages', pageType: 'general', url: 'tngdefense.com' },
    { id: 'about_page', label: 'About TNG', pts: 10, group: 'pages', pageType: 'general', url: 'tngdefense.com/about-tng' },
    { id: 'blog_page', label: 'Blog / Insights', pts: 5, group: 'pages', pageType: 'general', url: 'tngdefense.com/insights' },
  ];

  const state = {};
  let lastCompanyInfo = null;
  let currentContactIndex = 0;
  let revealedByIndex = {};
  SIGNALS.forEach(s => state[s.id] = { checked: false, detail: '' });

  // Apollo/Claude text goes into innerHTML in a few places — escape it so a stray
  // "<" or quote in a company name can't break (or inject into) the page.
  function escapeHtml(val) {
    return String(val == null ? '' : val)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function renderSignals(staggerReveal) {
    const verticalEl = document.getElementById('tng-vertical-signals');
    const eventEl = document.getElementById('tng-event-signals');
    const crmEl = document.getElementById('tng-crm-signals');
    const newsEl = document.getElementById('tng-news-signals');
    const triggerEl = document.getElementById('tng-trigger-signals');
    const pagesEl = document.getElementById('tng-page-signals');
    const siteEl = document.getElementById('tng-site-signals');
    verticalEl.innerHTML = '';
    eventEl.innerHTML = '';
    crmEl.innerHTML = '';
    newsEl.innerHTML = '';
    triggerEl.innerHTML = '';
    pagesEl.innerHTML = '';
    siteEl.innerHTML = '';
    let revealIndex = 0;
    SIGNALS.forEach(s => {
      const row = document.createElement('label'); // whole row toggles the checkbox
      const isChecked = state[s.id].checked;
      row.className = 'tng-signal' + (isChecked ? ' on' : '');
      row.id = 'row-' + s.id;
      if (staggerReveal && isChecked) {
        row.classList.add('reveal-in');
        row.style.animationDelay = (revealIndex * 0.08) + 's';
        revealIndex++;
      }
      row.innerHTML = `
        <div class="tng-signal-left">
          <input type="checkbox" id="chk-${s.id}" ${isChecked ? 'checked' : ''} ${s.derivedFrom ? 'disabled title="Ticks automatically from the pages checklist below"' : ''} />
          <div>
            <div class="tng-signal-name">${s.label}</div>
            <div class="tng-signal-detail" id="detail-${s.id}">${s.derivedFrom ? derivedDetailHtml(s) : escapeHtml(state[s.id].detail || s.url || '')}</div>
          </div>
        </div>
        <div class="tng-signal-pts">${s.pts ? '+' + s.pts : ''}</div>
      `;
      let targetEl = pagesEl;
      if (s.group === 'auto') {
        targetEl = s.subgroup === 'event' ? eventEl : verticalEl;
      } else if (s.group === 'crm') {
        targetEl = crmEl;
      } else if (s.group === 'news') {
        targetEl = newsEl;
      } else if (s.group === 'triggers') {
        targetEl = triggerEl;
      } else if (s.group === 'pages') {
        targetEl = pagesEl;
      } else if (s.group === 'site') {
        targetEl = siteEl;
      }
      targetEl.appendChild(row);
      document.getElementById('chk-' + s.id).addEventListener('change', (e) => {
        const turningOn = e.target.checked;
        state[s.id].checked = turningOn;
        // Pick-one groups (revenue tier): checking one clears the rest.
        if (turningOn && s.exclusive) {
          SIGNALS.forEach(other => {
            if (other.exclusive === s.exclusive && other.id !== s.id) {
              state[other.id].checked = false;
              document.getElementById('chk-' + other.id).checked = false;
            }
          });
        }
        recompute();
        if (turningOn) {
          const r = document.getElementById('row-' + s.id);
          r.classList.remove('just-checked');
          void r.offsetWidth; // restart animation
          r.classList.add('just-checked');
        }
      });
    });
  }

  let prevTotal = 0;
  let prevTier = 'ice_cold';

  // The two site signals follow the pages checklist: ticked if any page of their type
  // is ticked, with the triggering pages listed as the detail line.
  function derivedDetailHtml(s) {
    return escapeHtml(state[s.id].detail || 'Ticks from the pages you check below');
  }

  function updateDerivedSignals() {
    SIGNALS.filter(s => s.derivedFrom).forEach(s => {
      const pages = SIGNALS.filter(p => p.pageType === s.derivedFrom && state[p.id].checked);
      state[s.id].checked = pages.length > 0;
      state[s.id].detail = pages.length ? 'From: ' + pages.map(p => p.label).join(', ') : '';
      const chk = document.getElementById('chk-' + s.id);
      if (chk) chk.checked = state[s.id].checked;
      const detailEl = document.getElementById('detail-' + s.id);
      if (detailEl) detailEl.innerHTML = derivedDetailHtml(s);
    });
  }

  function recompute() {
    updateDerivedSignals();
    let total = 0;
    SIGNALS.forEach(s => {
      const row = document.getElementById('row-' + s.id);
      if (state[s.id].checked) {
        total += s.pts;
        row.classList.add('on');
      } else {
        row.classList.remove('on');
      }
    });
    const scoreEl = document.getElementById('tng-total');
    animateScore(scoreEl, prevTotal, total);
    renderBreakdown();
    updateAdjustSummary();
    const tierEl = document.getElementById('tng-tier');
    const { tier, label } = tierFor(total);
    tierEl.className = 'tng-tier ' + tier;
    tierEl.textContent = label;
    scoreEl.className = 'tng-total-score' + (tier === 'spicy' ? ' spicy' : '');

    if (total !== prevTotal) {
      scoreEl.classList.remove('bump');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('bump');
    }
    // Heat effects: the score bar warms up at HEATING UP and catches fire at SPICY.
    // Bursts only fire when a lead climbs into a hotter tier, never when it cools down.
    const resultEl = document.querySelector('.tng-result');
    resultEl.classList.toggle('heat-warm', tier === 'heating_up');
    resultEl.classList.toggle('heat-spicy', tier === 'spicy');
    const climbed = TIER_RANK[tier] > TIER_RANK[prevTier];
    if (tier === 'spicy' && prevTier !== 'spicy') {
      resultEl.classList.remove('celebrate');
      void resultEl.offsetWidth;
      resultEl.classList.add('celebrate');
      heatBurst(true);
      heatWave();
      tngToast(pick(SPICY_LINES), 'spicy');
    } else if (tier === 'heating_up' && climbed) {
      heatBurst(false);
      tngToast(pick(WARM_LINES), 'warm');
    }

    // Keep the company card + SPICY badge in sync with the current tier,
    // so the indicator stays visible up top even while scrolled down to the checkboxes.
    const companyCardEl = document.getElementById('tng-company-card');
    const hotBadgeEl = document.getElementById('tng-hot-badge');
    if (tier === 'spicy') {
      companyCardEl.classList.add('hot-lead');
      hotBadgeEl.classList.add('active');
    } else {
      companyCardEl.classList.remove('hot-lead');
      hotBadgeEl.classList.remove('active');
    }

    prevTotal = total;
    prevTier = tier;
  }

  // Each row of the score card jumps to where its points come from.
  const BREAKDOWN_GROUPS = [
    { label: 'Firmographic', match: s => s.group === 'auto' && s.subgroup !== 'event', target: 'tng-vertical-signals' },
    { label: 'Company activity', match: s => s.group === 'auto' && s.subgroup === 'event', target: 'tng-event-signals' },
    { label: 'Zoho CRM', match: s => s.group === 'crm', target: 'tng-sec-crm' },
    { label: 'Security incidents', match: s => s.group === 'news', target: 'tng-sec-incidents' },
    { label: 'Trigger events', match: s => s.group === 'triggers', target: 'tng-sec-triggers' },
    { label: 'Site behavior', match: s => s.group === 'site' || s.group === 'pages', target: 'tng-sec-visits' },
  ];

  function renderBreakdown() {
    document.getElementById('tng-breakdown').innerHTML = BREAKDOWN_GROUPS.map(g => {
      const pts = SIGNALS.filter(s => g.match(s) && state[s.id].checked).reduce((sum, s) => sum + s.pts, 0);
      return `<button class="tng-breakdown-row${pts ? ' on' : ''}" data-jump="${g.target}" title="Show where these points come from"><span>${g.label}</span><span>${pts ? '+' + pts : '—'}</span></button>`;
    }).join('');
  }

  // Scrolls to a section (opening Adjust signals when it's in there) and outlines it for a moment.
  function jumpTo(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const details = el.closest('details');
    if (details) details.open = true;
    const box = el.closest('.tng-section') || el;
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.classList.remove('tng-flash');
    void box.offsetWidth;
    box.classList.add('tng-flash');
  }
  document.getElementById('tng-breakdown').addEventListener('click', e => {
    const row = e.target.closest('[data-jump]');
    if (row) jumpTo(row.dataset.jump);
  });

  // The Adjust signals header: how many of its checkboxes are ticked, and what matched.
  const IN_ADJUST = s => s.group === 'auto' || s.group === 'site' || s.group === 'pages';
  function updateAdjustSummary() {
    const list = SIGNALS.filter(IN_ADJUST);
    const on = list.filter(s => state[s.id].checked);
    document.getElementById('tng-adjust-count').textContent = `${on.length} of ${list.length} ticked`;
    const names = on.filter(s => s.group === 'auto' || (s.group === 'pages' && s.pts > 0)).map(s => s.label.replace(/\s*\(.*\)$/, ''));
    document.getElementById('tng-adjust-matched').textContent = names.length ? '✓ ' + names.join(' · ') : '';
  }

  // The number counts up (or down) to the new score instead of jumping.
  let scoreAnim = 0;
  function animateScore(el, from, to) {
    const id = ++scoreAnim;
    if (from === to || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = to; return; }
    const started = performance.now();
    const step = now => {
      if (id !== scoreAnim) return;
      const t = Math.min(1, (now - started) / 700);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  const TIER_RANK = { ice_cold: 0, room_temp: 1, luke_warm: 2, heating_up: 3, spicy: 4 };

  function tierFor(total) {
    if (total >= 100) return { tier: 'spicy', label: 'SPICY 🌶️' };
    if (total >= 75) return { tier: 'heating_up', label: 'HEATING UP' };
    if (total >= 50) return { tier: 'luke_warm', label: 'LUKE WARM' };
    if (total >= 25) return { tier: 'room_temp', label: 'ROOM TEMP' };
    return { tier: 'ice_cold', label: 'ICE COLD' };
  }

  // The score recompute() adds up, for a set of ticked signal ids without touching the page:
  // the two site signals tick from their pages exactly as updateDerivedSignals does.
  function scoreSignals(checkedIds) {
    const ids = new Set(checkedIds);
    SIGNALS.filter(s => s.derivedFrom).forEach(s => {
      if (SIGNALS.some(p => p.pageType === s.derivedFrom && ids.has(p.id))) ids.add(s.id);
    });
    const total = SIGNALS.filter(s => ids.has(s.id)).reduce((sum, s) => sum + s.pts, 0);
    return { total, ids: [...ids] };
  }

  // Embers (and chilis, for SPICY) fly up out of the score bar. Particles are
  // fixed-position spans animated with the Web Animations API, then removed.
  function heatBurst(spicy, originEl) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const origin = (originEl || document.querySelector('.tng-result')).getBoundingClientRect();
    const x0 = Math.min(Math.max(origin.left + origin.width / 2, 60), window.innerWidth - 60);
    const y0 = Math.min(Math.max(origin.top + Math.min(origin.height, 140) / 2, 80), window.innerHeight - 80);
    const allAround = y0 < window.innerHeight * 0.4;
    const layer = document.createElement('div');
    layer.className = 'tng-burst-layer';
    document.body.appendChild(layer);

    const count = spicy ? 46 : 18;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('span');
      const isChili = spicy && i % 4 === 0;
      p.className = isChili ? 'tng-burst-chili' : 'tng-burst-ember';
      if (isChili) p.textContent = '🌶️';
      else {
        const size = 4 + Math.random() * (spicy ? 7 : 5);
        p.style.width = p.style.height = size + 'px';
      }
      p.style.left = x0 + 'px';
      p.style.top = y0 + 'px';
      layer.appendChild(p);

      // Mostly upward fan, a little sideways spread, then a gentle fall at the end.
      const angle = allAround
        ? Math.random() * 2 * Math.PI
        : (-90 + (Math.random() - 0.5) * (spicy ? 150 : 110)) * Math.PI / 180;
      const dist = (spicy ? 180 : 110) + Math.random() * (spicy ? 260 : 140);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const spin = (Math.random() - 0.5) * 720;
      p.animate([
        { transform: 'translate(-50%, -50%) scale(0.4) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx * 0.85}px), calc(-50% + ${dy * 0.85}px)) scale(1.1) rotate(${spin * 0.7}deg)`, opacity: 1, offset: 0.65 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 60}px)) scale(0.6) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: 1100 + Math.random() * 900, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)', delay: Math.random() * 120, fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), 2400);
  }

  // ----- Moments worth noticing -----
  const SPICY_LINES = [
    '🌶️ Spicy lead! This one is worth a call today.',
    '🌶️ Spicy! Put this one in front of Steve.',
    '🌶️ Hot one. Strike while it\'s spicy.',
    '🌶️ Spicy lead. Clear some time for this one.',
  ];
  const WARM_LINES = ['🔥 Heating up. Worth a closer look.', '🔥 Heating up. Something here.'];
  const pick = list => list[Math.floor(Math.random() * list.length)];

  // A short line at the bottom of the screen that fades on its own.
  function tngToast(text, tone) {
    let wrap = document.getElementById('tng-toasts');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'tng-toasts';
      wrap.className = 'tng-toast-wrap';
      wrap.setAttribute('aria-live', 'polite');
      document.querySelector('.tng-lead-scorer').appendChild(wrap);
    }
    const t = document.createElement('div');
    t.className = 'tng-toast' + (tone ? ' ' + tone : '');
    t.textContent = text;
    wrap.appendChild(t);
    setTimeout(() => t.remove(), 3400);
  }

  // A warm glow washes over the screen when a lead turns spicy.
  function heatWave() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = document.createElement('div');
    el.className = 'tng-heatwave';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1900);
  }

  // Confetti in the given colors (Zoho's four, for a push), flung up from an element.
  function confettiBurst(originEl, colors) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !originEl) return;
    const r = originEl.getBoundingClientRect();
    const layer = document.createElement('div');
    layer.className = 'tng-burst-layer';
    document.body.appendChild(layer);
    for (let i = 0; i < 40; i++) {
      const p = document.createElement('span');
      p.className = 'tng-burst-confetti';
      p.style.background = colors[i % colors.length];
      p.style.left = (r.left + r.width * (0.25 + Math.random() * 0.5)) + 'px';
      p.style.top = (r.top + Math.min(r.height, 200) * 0.4) + 'px';
      layer.appendChild(p);
      const angle = (-90 + (Math.random() - 0.5) * 140) * Math.PI / 180;
      const dist = 140 + Math.random() * 220;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const spin = (Math.random() - 0.5) * 900;
      p.animate([
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) rotate(${spin * 0.6}deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(calc(-50% + ${dx * 1.15}px), calc(-50% + ${dy + 260}px)) rotate(${spin}deg)`, opacity: 0 },
      ], { duration: 1500 + Math.random() * 700, easing: 'cubic-bezier(0.2, 0.7, 0.4, 1)', delay: Math.random() * 100, fill: 'forwards' });
    }
    setTimeout(() => layer.remove(), 2600);
  }

  function setSingleEmpty(empty) {
    document.getElementById('tng-mode-single').classList.toggle('is-empty', empty);
  }

  // Scoring without a lookup: show the checklist and open it.
  window.tngScoreByHand = function() {
    setSingleEmpty(false);
    jumpTo('tng-vertical-signals');
  };

  function setStatus(text) {
    const el = document.getElementById('tng-status');
    const txt = document.getElementById('tng-status-text');
    if (text) {
      txt.textContent = text;
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  function setError(text) {
    const el = document.getElementById('tng-error');
    if (text) {
      el.textContent = text;
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  function extractJson(text) {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in response');
    return JSON.parse(cleaned.slice(start, end + 1));
  }

  // Recent security incidents — its own request too (a news search takes 20-40s), run
  // alongside Analyze. Finding nothing never costs points. No Apollo credits.
  const INCIDENT_TYPE_LABELS = {
    staff_assault: 'Staff assault', weapon: 'Weapon / shooting', lockdown: 'Lockdown',
    threat: 'Threat', executive_threat: 'Threat to executives', other: 'Incident',
  };
  let incidentRequestId = 0;
  let lastIncidents = null;

  function fmtIncidentDate(date) {
    const [y, m, d] = String(date).split('-').map(Number);
    if (!y || !m) return String(date);
    return new Date(Date.UTC(y, m - 1, d || 1)).toLocaleDateString('en-US',
      d ? { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' } : { month: 'short', year: 'numeric', timeZone: 'UTC' });
  }

  // One line per incident: date · site · type, then the summary and its source link.
  function incidentsListHtml(incidents) {
    return incidents.map(i => `<div class="tng-incident${i.recent ? '' : ' older'}">
      <div class="tng-incident-head">${escapeHtml([fmtIncidentDate(i.date), i.site].filter(Boolean).join(' · '))} · <span class="tng-incident-type">${escapeHtml(INCIDENT_TYPE_LABELS[i.type] || 'Incident')}</span>${i.recent ? '' : ' <span class="muted">(over 12 months ago, no points)</span>'}</div>
      <div>${escapeHtml(i.summary)}${isWebLink(i.source_url) ? ` <a href="${escapeHtml(i.source_url)}" target="_blank" rel="noopener">${escapeHtml(i.source_name || 'Source')}</a>` : ''}</div>
    </div>`).join('');
  }

  // Plain-text lines for the copy summary.
  function incidentsText(incidents, indent) {
    return incidents.map(i => `${indent}${fmtIncidentDate(i.date)}${i.site ? ' · ' + i.site : ''} · ${INCIDENT_TYPE_LABELS[i.type] || 'Incident'}: ${i.summary} ${i.source_url}\n`).join('');
  }

  function incidentsCsv(data) {
    if (!data) return '';
    if (!data.available) return 'Check unavailable';
    return data.incidents.map(i => `${i.date}${i.site ? ' ' + i.site : ''}: ${i.summary} (${i.source_url})`).join(' | ') || 'None found';
  }

  function setIncidentResult(checked, detail, html) {
    state.recent_incident.checked = checked;
    state.recent_incident.detail = detail;
    const chk = document.getElementById('chk-recent_incident');
    if (chk) chk.checked = checked;
    const detailEl = document.getElementById('detail-recent_incident');
    if (detailEl) detailEl.textContent = detail;
    document.getElementById('tng-incidents').innerHTML = html || '';
    recompute();
  }

  // pending: the incidents half of the shared news search (newsHalf).
  async function runIncidentScan(pending) {
    const requestId = ++incidentRequestId;
    lastIncidents = null;
    setIncidentResult(false, 'Checking the news...', '<span class="tng-radar"></span> Searching the news for incidents at their sites (20-40s)...');
    try {
      const data = await pending;
      if (requestId !== incidentRequestId) return; // a newer lookup (or Reset) superseded this one
      lastIncidents = data;
      if (!data.available) {
        setIncidentResult(false, 'News check unavailable (' + (data.reason || 'unknown error') + '). Tick this if you know of a recent incident.', '');
        return;
      }
      if (!data.incidents.length) {
        setIncidentResult(false, 'None found in a quick news search (last 24 months)' + savedSuffix(data.cached_at), '');
        return;
      }
      const recent = data.recent_count;
      const detail = (recent
        ? `${recent} reported in the last 12 months`
        : `${data.incidents.length} reported 12-24 months ago (context only)`) + savedSuffix(data.cached_at);
      setIncidentResult(recent > 0, detail, incidentsListHtml(data.incidents)
        + '<div class="tng-incident-note">Use for background, not as an opener.</div>');
    } catch (err) {
      console.error(err);
      if (requestId !== incidentRequestId) return;
      setIncidentResult(false, 'News check failed (' + err.message + '). Tick this if you know of a recent incident.', '');
    }
  }

  // Trigger events — business news that points to a TNG service. Same pattern as the
  // incident check: its own request alongside Analyze, finding nothing costs no points.
  const EVENT_TYPE_LABELS = {
    layoffs: 'Layoffs', leadership_change: 'Leadership change', executive_exposure: 'Executive in the spotlight',
    facility_expansion: 'New or expanded facility', labor_unrest: 'Strike or protest', major_event: 'Hosting a large event',
  };
  const EVENT_SERVICES = {
    layoffs: 'Workplace Termination Support', leadership_change: 'Executive Protection',
    executive_exposure: 'Executive Protection, Protective Intelligence', facility_expansion: 'Security Guard Services, Embedded Services',
    labor_unrest: 'Security Guard Services, Event Security', major_event: 'Event Security',
  };
  let eventRequestId = 0;
  let lastEvents = null;

  // The services the recent events point to, without repeats ("Workplace Termination Support, Event Security").
  function eventServices(events) {
    const names = [];
    events.filter(e => e.recent).forEach(e => (EVENT_SERVICES[e.type] || '').split(', ').forEach(n => { if (n && !names.includes(n)) names.push(n); }));
    return names.join(', ');
  }

  // "Layoffs · New or expanded facility": the kinds of recent event, without repeats.
  function recentEventLabels(data) {
    const labels = [];
    (data.events || []).filter(e => e.recent).forEach(e => { const l = EVENT_TYPE_LABELS[e.type]; if (l && !labels.includes(l)) labels.push(l); });
    return labels.join(' · ');
  }

  function eventsListHtml(events) {
    return events.map(e => `<div class="tng-incident${e.recent ? '' : ' older'}">
      <div class="tng-incident-head">${escapeHtml([fmtIncidentDate(e.date), e.site].filter(Boolean).join(' · '))} · <span class="tng-incident-type">${escapeHtml(EVENT_TYPE_LABELS[e.type] || 'Event')}</span>${e.recent ? '' : ' <span class="muted">(over 6 months ago, no points)</span>'}</div>
      <div>${escapeHtml(e.summary)}${isWebLink(e.source_url) ? ` <a href="${escapeHtml(e.source_url)}" target="_blank" rel="noopener">${escapeHtml(e.source_name || 'Source')}</a>` : ''}</div>
      <div class="muted">Pitch: ${escapeHtml(EVENT_SERVICES[e.type] || '')}</div>
    </div>`).join('');
  }

  function eventsText(events, indent) {
    return events.map(e => `${indent}${fmtIncidentDate(e.date)}${e.site ? ' · ' + e.site : ''} · ${EVENT_TYPE_LABELS[e.type] || 'Event'}: ${e.summary} (pitch: ${EVENT_SERVICES[e.type] || ''}) ${e.source_url}\n`).join('');
  }

  function eventsCsv(data) {
    if (!data) return '';
    if (!data.available) return 'Check unavailable';
    return data.events.map(e => `${e.date} ${EVENT_TYPE_LABELS[e.type] || e.type}: ${e.summary} (${e.source_url})`).join(' | ') || 'None found';
  }

  function setTriggerResult(checked, detail, html) {
    state.trigger_event.checked = checked;
    state.trigger_event.detail = detail;
    const chk = document.getElementById('chk-trigger_event');
    if (chk) chk.checked = checked;
    const detailEl = document.getElementById('detail-trigger_event');
    if (detailEl) detailEl.textContent = detail;
    document.getElementById('tng-triggers').innerHTML = html || '';
    recompute();
  }

  // pending: the trigger-events half of the shared news search (newsHalf).
  async function runEventScan(pending) {
    const requestId = ++eventRequestId;
    lastEvents = null;
    setTriggerResult(false, 'Checking the news...', '<span class="tng-radar"></span> Searching the news for layoffs, new executives, new facilities and more (20-40s)...');
    try {
      const data = await pending;
      if (requestId !== eventRequestId) return; // a newer lookup (or Reset) superseded this one
      lastEvents = data;
      if (!data.available) {
        setTriggerResult(false, 'News check unavailable (' + (data.reason || 'unknown error') + '). Tick this if you know of a recent trigger event.', '');
        return;
      }
      if (!data.events.length) {
        setTriggerResult(false, 'None found in a quick news search (last 12 months)' + savedSuffix(data.cached_at), '');
        return;
      }
      const recent = data.recent_count;
      const detail = (recent
        ? `${recent} in the last 6 months · pitch: ${eventServices(data.events)}`
        : `${data.events.length} reported 6-12 months ago (context only)`) + savedSuffix(data.cached_at);
      setTriggerResult(recent > 0, detail, eventsListHtml(data.events));
    } catch (err) {
      console.error(err);
      if (requestId !== eventRequestId) return;
      setTriggerResult(false, 'News check failed (' + err.message + '). Tick this if you know of a recent trigger event.', '');
    }
  }

  // " · news checked Oct 30" when the backend reused this week's search.
  function savedSuffix(cachedAt) {
    return cachedAt ? ' · news checked ' + fmtSavedDate(cachedAt) : '';
  }

  function fmtSavedDate(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  // Zoho CRM check — its own request, run alongside Analyze so a slow or failing
  // Zoho lookup never blocks the Apollo results (and vice versa). No Apollo credits.
  let crmRequestId = 0;
  let lastSiteVisits = null;

  function setCrmResult(checked, detail, recordsHtml) {
    state.crm.checked = checked;
    state.crm.detail = detail;
    const chk = document.getElementById('chk-crm');
    if (chk) chk.checked = checked;
    const detailEl = document.getElementById('detail-crm');
    if (detailEl) detailEl.textContent = detail;
    document.getElementById('tng-crm-records').innerHTML = recordsHtml || '';
    recompute();
  }

  function crmLink(rec, text) {
    return `<a href="${escapeHtml(rec.url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;
  }

  // Linked Zoho accounts, contacts and leads from a check-crm answer, one line per module.
  function crmRecordsHtml(data) {
    const lines = [];
    if (data.accounts.length) {
      lines.push('<strong>Accounts:</strong> ' + data.accounts.map(a => crmLink(a, a.name)).join(', '));
    }
    if (data.contacts.sample.length) {
      lines.push('<strong>Contacts:</strong> ' + data.contacts.sample.map(c =>
        crmLink(c, c.name || c.email) + (c.title ? ` <span class="muted">(${escapeHtml(c.title)})</span>` : '')
      ).join(', ') + (data.contacts.count > data.contacts.sample.length ? ' <span class="muted">…</span>' : ''));
    }
    if (data.leads.sample.length) {
      lines.push('<strong>Leads:</strong> ' + data.leads.sample.map(l =>
        crmLink(l, l.name || l.email) + (l.status ? ` <span class="muted">(${escapeHtml(l.status)})</span>` : '')
      ).join(', ') + (data.leads.count > data.leads.sample.length ? ' <span class="muted">…</span>' : ''));
    }
    return lines.join('<br>');
  }

  async function runCrmCheck(domain, email) {
    const requestId = ++crmRequestId;
    setCrmResult(false, 'Checking Zoho CRM...', '');
    try {
      const response = await fetch(CRM_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify({ domain, email: email || undefined }),
      });
      const data = await response.json();
      if (requestId !== crmRequestId) return; // a newer lookup (or Reset) superseded this one
      if (!response.ok) throw new Error(data.error || ('CRM check failed: ' + response.status));

      if (!data.configured) {
        setCrmResult(false, 'Zoho not connected yet — check Zoho manually and tick this if they exist', '');
        return;
      }
      if (!data.found) {
        setCrmResult(false, 'Not found in Zoho CRM (no matching account website or contact/lead emails)', '');
        return;
      }

      const parts = [];
      if (data.accounts.length) parts.push(`${data.accounts.length} account${data.accounts.length > 1 ? 's' : ''}`);
      if (data.contacts.count) parts.push(`${data.contacts.count}${data.contacts.more ? '+' : ''} contact${data.contacts.count > 1 ? 's' : ''}`);
      if (data.leads.count) parts.push(`${data.leads.count}${data.leads.more ? '+' : ''} lead${data.leads.count > 1 ? 's' : ''}`);
      let detail = 'In Zoho CRM: ' + parts.join(' · ');
      if (data.email_match) detail += ` — ${data.email_match.name || 'the typed email'} is already a ${data.email_match.module}`;
      setCrmResult(true, detail, crmRecordsHtml(data));
    } catch (err) {
      console.error(err);
      if (requestId !== crmRequestId) return;
      setCrmResult(false, 'Zoho check failed (' + err.message + ') — check Zoho manually', '');
    }
  }

  // Apollo Website Visitors → Pages Visited checklist. Apollo reports full URLs like
  // "tngdefense.com/contact-us"; each checklist page matches its own path or anything under it.
  // Ignored, not buyer signals: careers ("join-our-team") are job seekers, and
  // "emergency-evacuation-request" is for people in an active emergency.
  const IGNORED_PATHS = ['join-our-team', 'emergency-evacuation-request'];
  const visitPath = url => String(url).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '')
    .replace(/^tngdefense\.com/, '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');
  // Risk Mitigation's real URL ends in "-4"; match pages on their slug without a trailing number.
  const pagePath = s => visitPath(s.url).replace(/-\d+$/, '');

  function matchPage(path) {
    return SIGNALS.find(s => {
      if (s.group !== 'pages') return false;
      const p = pagePath(s);
      if (p === '') return path === '';
      return path === p || path.startsWith(p + '/') || path.startsWith(p + '-');
    });
  }

  function applySiteVisits(visits) {
    // Each lookup starts the checklist fresh, so ticks from the previous company never carry over.
    SIGNALS.filter(s => s.group === 'pages').forEach(s => { state[s.id].checked = false; state[s.id].detail = ''; });
    const el = document.getElementById('tng-visit-summary');
    if (!visits || !visits.available) {
      el.innerHTML = `<span class="muted">Couldn't load visits from Apollo${visits && visits.reason ? ' (' + escapeHtml(visits.reason) + ')' : ''}. Tick pages manually.</span>`;
      return;
    }
    if (!visits.total_visits) {
      el.innerHTML = '<span class="muted">No visits to tngdefense.com in the last 90 days.</span>';
      return;
    }
    const { pages, other } = pagesFromVisits(visits);
    Object.entries(pages).forEach(([id, detail]) => {
      state[id].checked = true;
      state[id].detail = detail;
    });
    el.innerHTML = visitsSummaryHtml(visits, other);
  }

  // Apollo's top pages → { pages: { checklistSignalId: detail }, other: [pages not on the checklist] }.
  function pagesFromVisits(visits) {
    const pages = {};
    const other = [];
    if (!visits || !visits.available) return { pages, other };
    (visits.top_paths || []).forEach(v => {
      const path = visitPath(v.url);
      if (IGNORED_PATHS.some(ig => path === ig || path.startsWith(ig + '/'))) return;
      const sig = matchPage(path);
      const n = `${v.visits} visit${v.visits === 1 ? '' : 's'}`;
      if (sig) pages[sig.id] = `${n} · from Apollo`;
      else other.push({ path, n });
    });
    return { pages, other };
  }

  function visitsSummaryHtml(visits, other) {
    const last = visits.last_visited_at ? ` · last visit ${escapeHtml(visits.last_visited_at)}` : '';
    return `<strong>${visits.total_visits} visits</strong> · ${visits.unique_visitors} unique visitor${visits.unique_visitors === 1 ? '' : 's'}${last}`
      + (other.length ? `<br><strong>Other pages viewed:</strong> ${other.map(o => `${escapeHtml(o.path)} <span class="muted">(${o.n})</span>`).join(', ')}` : '');
  }

  const FREE_EMAIL_DOMAINS = new Set([
    'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com', 'icloud.com',
    'live.com', 'msn.com', 'protonmail.com', 'proton.me', 'me.com', 'mail.com',
  ]);

  // analyze-lead's answer → { signalId: { checked, detail } } for every Firmographic and
  // Company activity signal. Shared by Analyze and the Hunter Brief batch.
  function autoSignalsFromResult(result) {
    const out = {};
    const set = (id, checked, detail) => { out[id] = { checked: !!checked, detail: detail || '' }; };
    const revTier = result.revenue_tier || 'unknown';
    ['under_10m', '10m_100m', '100m_500m', '500m_plus'].forEach((t, i) =>
      set('revenue_tier_' + i, revTier === t, revTier === t ? result.revenue_tier_reasoning : ''));
    SIGNALS.filter(s => s.group === 'auto' && s.subgroup === 'vertical' && !s.exclusive)
      .forEach(s => set(s.id, result['vertical_' + s.id]));
    set('hiring_security', result.hiring_security_leadership, result.hiring_detail);
    set('recently_funded', result.recently_funded, result.funding_detail);
    set('headcount_growth', result.headcount_growth_signal, result.headcount_growth_detail);
    set('security_tech', result.uses_security_tech, result.security_tech_detail);
    set('multi_site', result.multi_site_signal, result.multi_site_detail);
    return out;
  }

  // refresh: true (from the "Refresh" link) skips this week's saved lookup and spends credits.
  window.tngAnalyze = async function(refresh) {
    refresh = refresh === true;
    let domain = document.getElementById('tng-domain').value.trim();
    const email = document.getElementById('tng-email').value.trim();

    if (!domain && email.includes('@')) {
      const emailDomain = email.split('@')[1].trim().toLowerCase();
      if (emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain)) {
        domain = emailDomain;
        document.getElementById('tng-domain').value = domain;
      }
    }

    if (!domain) {
      setError('Enter a company domain to analyze.');
      return;
    }
    const domainPattern = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
    const strippedDomain = domain.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '');
    if (!domainPattern.test(strippedDomain)) {
      setError(`"${domain}" doesn't look like a domain. Enter the actual website address (e.g. "freewill.com", not "FreeWill").`);
      return;
    }
    setError('');
    setSingleEmpty(false);
    runCrmCheck(domain, email); // not awaited — fills in the CRM Check section on its own
    // Not awaited either: one news search fills in Security Incidents and Trigger Events when it finishes.
    const news = postJson(NEWS_URL, refresh ? { domain, refresh: true } : { domain }, 240000);
    runIncidentScan(newsHalf(news, 'incidents'));
    runEventScan(newsHalf(news, 'events'));
    const btn = document.getElementById('tng-analyze-btn');
    btn.disabled = true;
    let seconds = 0;

    const originalTitle = document.title;
    const STATUS_PHASES = [
      'Pulling firmographics...',
      'Checking job postings...',
      'Searching for contacts...',
      'Analyzing fit...',
      'Still working (companies not in Apollo get a web search)...',
    ];
    let phaseIndex = 0;
    document.title = '🔍 Analyzing...';

    setStatus(STATUS_PHASES[0] + ' (0s)');
    const tickInterval = setInterval(() => {
      seconds += 1;
      // Advance the phase roughly every 4 seconds (the last one at 25s), without racing past it
      const targetPhase = seconds >= 25 ? STATUS_PHASES.length - 1 : Math.min(Math.floor(seconds / 4), STATUS_PHASES.length - 2);
      if (targetPhase !== phaseIndex) phaseIndex = targetPhase;
      const suffix = seconds >= 140 ? ` (${seconds}s, will time out at 150s)` : ` (${seconds}s)`;
      setStatus(STATUS_PHASES[phaseIndex] + suffix);
    }, 1000);

    const timeoutPromise = new Promise((_, reject) => {
      // Web research for companies Apollo doesn't know can add up to a minute.
      setTimeout(() => reject(new Error('TIMEOUT')), 150000);
    });

    try {
      const response = await Promise.race([
        fetch(BACKEND_URL, {
          method: "POST",
          headers: API_HEADERS,
          body: JSON.stringify({ domain, email: email || undefined, refresh: refresh || undefined })
        }),
        timeoutPromise
      ]);

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || ('Backend request failed: ' + response.status));

      // Apply auto signals
      const autoSignals = autoSignalsFromResult(result);
      Object.entries(autoSignals).forEach(([id, sig]) => {
        state[id].checked = sig.checked;
        state[id].detail = sig.detail;
      });

      applySiteVisits(result.site_visits);
      lastSiteVisits = result.site_visits || null;

      // Populate company overview card
      const companyCard = document.getElementById('tng-company-card');
      const companyLinkedinEl = document.getElementById('tng-company-linkedin');
      const licenseBadgeEl = document.getElementById('tng-license-badge');
      if (result.company_name) {
        document.getElementById('tng-company-name').textContent = result.company_name;
        const metaParts = [];
        if (result.industry) metaParts.push(result.industry);
        if (result.employee_count) metaParts.push(result.employee_count.toLocaleString() + ' employees');
        if (result.estimated_revenue) metaParts.push(result.estimated_revenue);
        if (result.headquarters) metaParts.push(result.headquarters);
        if (result.founded_year) metaParts.push('Founded ' + result.founded_year);
        document.getElementById('tng-company-meta').textContent = metaParts.join(' · ');
        document.getElementById('tng-company-description').textContent = result.company_description || '';
        if (result.company_linkedin_url) {
          companyLinkedinEl.href = result.company_linkedin_url;
          companyLinkedinEl.style.display = 'inline-flex';
        } else {
          companyLinkedinEl.style.display = 'none';
        }
        if (result.headquarters) {
          if (result.licensed_state_match) {
            licenseBadgeEl.innerHTML =
              `<span class="tng-license-pill licensed">✓ Licensed in ${escapeHtml(result.licensed_state_name)}</span>` +
              `<span class="tng-license-caveat">Reflects HQ location — actual job site may be elsewhere</span>`;
          } else {
            licenseBadgeEl.innerHTML =
              `<span class="tng-license-pill not-licensed">Not a directly licensed state</span>` +
              `<span class="tng-license-caveat">Reflects HQ location — served via partner network; check tngdefense.com/licensing for current states</span>`;
          }
          licenseBadgeEl.classList.add('active');
        } else {
          licenseBadgeEl.classList.remove('active');
        }

        const corpStructureEl = document.getElementById('tng-corp-structure');
        const corpLines = [];
        if (result.is_subsidiary) {
          corpLines.push(
            result.parent_company_hint
              ? `<strong>Subsidiary</strong> of ${escapeHtml(result.parent_company_hint)}`
              : `<strong>Subsidiary</strong> of another organization (parent name not available in Apollo's data)`
          );
        }
        if (result.num_suborganizations > 0) {
          const names = Array.isArray(result.suborganization_names) ? result.suborganization_names : [];
          const sample = names.length ? ` (e.g. ${names.slice(0, 3).map(escapeHtml).join(', ')})` : '';
          corpLines.push(`<strong>Owns ${escapeHtml(result.num_suborganizations)} subsidiaries</strong>${sample}`);
        }
        if (corpLines.length) {
          corpStructureEl.innerHTML = corpLines.join('<br>');
          corpStructureEl.classList.add('active');
        } else {
          corpStructureEl.classList.remove('active');
        }

        companyCard.classList.add('active');
      } else {
        document.getElementById('tng-company-name').textContent = 'No organization match found';
        document.getElementById('tng-company-meta').textContent = '';
        document.getElementById('tng-company-description').textContent = result.research
          ? 'Not in Apollo, and a quick web search found no reliable information about this domain.'
          : 'Apollo could not match this domain to a company record.';
        companyLinkedinEl.style.display = 'none';
        licenseBadgeEl.classList.remove('active');
        document.getElementById('tng-corp-structure').classList.remove('active');
        companyCard.classList.add('active');
      }

      // Web-research fallback: say plainly that this profile isn't Apollo data, and show the sources.
      const sourceNoteEl = document.getElementById('tng-source-note');
      if (result.data_source === 'web_research') {
        // Only real web links become sources; anything else is dropped.
        const sources = ((result.research && result.research.sources) || []).filter(url => /^https?:\/\//i.test(url));
        const links = sources.map(url => {
          let host = url;
          try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (e) { /* show the raw URL */ }
          return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(host)}</a>`;
        });
        sourceNoteEl.innerHTML = '<strong>Not in Apollo: profile from a quick web search.</strong> Details may be incomplete or out of date; verify before relying on them.'
          + (links.length ? `<br><span class="muted">Sources:</span> ${links.join(' · ')}` : '');
        sourceNoteEl.classList.add('active');
      } else {
        sourceNoteEl.innerHTML = '';
        sourceNoteEl.classList.remove('active');
      }

      // Reused this week's lookup: say so, and offer a paid refresh.
      const cacheNoteEl = document.getElementById('tng-cache-note');
      if (result.cached_at) {
        cacheNoteEl.innerHTML = `Saved lookup from ${escapeHtml(fmtSavedDate(result.cached_at))}, no credits used. Site visits and Zoho are always live.`
          + '<button type="button" onclick="tngAnalyze(true)">Refresh (2 Apollo credits)</button>';
        cacheNoteEl.classList.add('active');
      } else {
        cacheNoteEl.innerHTML = '';
        cacheNoteEl.classList.remove('active');
      }

      lastCompanyInfo = {
        domain,
        company_name: result.company_name || domain,
        industry: result.industry || '',
        employee_count: result.employee_count || '',
        estimated_revenue: result.estimated_revenue || '',
        headquarters: result.headquarters || '',
        founded_year: result.founded_year || '',
        company_description: result.company_description || '',
        key_contacts: Array.isArray(result.key_contacts) ? result.key_contacts : [],
        more_people: Array.isArray(result.more_people) ? result.more_people : [],
        typed_contact_email: email || '',
        data_source: result.data_source || 'apollo',
      };
      currentContactIndex = 0;
      revealedByIndex = {};
      document.getElementById('tng-zoho-result').innerHTML = '';

      renderContactCard(email);

      renderSignals(true);
      prevTier = 'ice_cold'; // a fresh lead gets its own heat burst
      recompute();
      clearInterval(tickInterval);
      setStatus(null);
      document.title = '✅ Done — ' + (result.company_name || domain);
      setTimeout(() => { document.title = originalTitle; }, 4000);
    } catch (err) {
      console.error(err);
      clearInterval(tickInterval);
      document.title = originalTitle;
      if (err.message === 'TIMEOUT') {
        setError('Lookup timed out after 150s. Try again, or score manually below.');
      } else {
        setError('Lookup failed: ' + err.message + '. You can still score manually below.');
      }
      setStatus(null);
    } finally {
      btn.disabled = false;
    }
  };

  function renderContactCard(typedEmail) {
    const contactCard = document.getElementById('tng-contact-card');
    const contactLink = document.getElementById('tng-contact-link');
    const revealBtn = document.getElementById('tng-reveal-btn');
    const revealResultEl = document.getElementById('tng-reveal-result');
    const cycleBtn = document.getElementById('tng-contact-cycle-btn');

    const contacts = (lastCompanyInfo && lastCompanyInfo.key_contacts) || [];
    const contact = contacts[currentContactIndex];

    // Cycle button only shows when there's more than one contact to cycle through
    if (contacts.length > 1) {
      cycleBtn.style.display = 'inline-block';
      cycleBtn.textContent = `Next contact (${currentContactIndex + 1} of ${contacts.length}) →`;
    } else {
      cycleBtn.style.display = 'none';
    }

    if (contact) {
      document.getElementById('tng-contact-name').textContent = contact.name;
      document.getElementById('tng-contact-title').textContent = contact.title || '';
      document.getElementById('tng-contact-reasoning').textContent = contact.reasoning || '';
      if (contact.linkedin_url) {
        contactLink.href = contact.linkedin_url;
        contactLink.style.display = 'inline-flex';
      } else {
        contactLink.style.display = 'none';
      }
      revealBtn.style.display = 'inline-flex';
    } else {
      document.getElementById('tng-contact-name').textContent = 'No clear match found';
      document.getElementById('tng-contact-title').textContent = '';
      document.getElementById('tng-contact-reasoning').textContent = 'Try checking LinkedIn directly for this account.';
      contactLink.style.display = 'none';
      revealBtn.style.display = typedEmail ? 'inline-block' : 'none';
    }

    // Restore this contact's reveal state if we've already revealed them before
    const revealed = revealedByIndex[currentContactIndex];
    if (revealed) {
      revealResultEl.className = 'tng-reveal-result';
      revealResultEl.innerHTML =
        `<span class="name">${escapeHtml(revealed.full_name || '(name unavailable)')}</span>` +
        (revealed.email ? ` &nbsp;·&nbsp; <span class="email">${escapeHtml(revealed.email)}</span>` : ' — no email on file');
      revealBtn.style.display = 'none';
    } else {
      revealResultEl.textContent = '';
      revealResultEl.className = 'tng-reveal-result';
      revealBtn.disabled = false;
      revealBtn.innerHTML = tngIcon('mail') + REVEAL_LABEL;
    }

    // Web-research companies aren't in Apollo, so there's no contact record to reveal —
    // hide the button (it would only burn a click, maybe a credit) and say why.
    if (lastCompanyInfo && lastCompanyInfo.data_source === 'web_research') {
      revealBtn.style.display = 'none';
      revealResultEl.className = 'tng-reveal-result muted';
      revealResultEl.textContent = 'Found via web search. This company isn\'t in Apollo\'s database, so there\'s no contact record to reveal.';
    }

    document.getElementById('tng-contact-reach').innerHTML = contact && !revealed ? reachChips(contact) : '';
    renderMorePeople();
    document.getElementById('tng-zoho-btn').style.display = 'inline-flex';
    document.getElementById('tng-contact-card').classList.add('active');
  }

  // ----- Who can be reached: Apollo's email/phone flags, and more people at the company -----
  // The free people search says whether Apollo holds an email (and maybe a direct phone) for
  // each person, so a credit is never spent blind. Revealing one of the "more people" adds
  // them to the contacts, where the card, exports and Push to Zoho all pick them up.
  function reachChips(c) {
    if (!c || c.has_email === undefined) return '';
    const chips = [c.has_email ? '<span class="tng-chip good">✉ Email on file</span>' : '<span class="tng-chip">No email in Apollo</span>'];
    if (c.has_direct_phone === 'yes') chips.push('<span class="tng-chip good">Phone on file</span>');
    else if (c.has_direct_phone === 'maybe') chips.push('<span class="tng-chip">Phone: maybe</span>');
    return `<span class="tng-reach">${chips.join('')}</span>`;
  }

  function revealPrompt(c) {
    return c && c.has_email === false
      ? 'Apollo has no email on file for this person. Revealing will likely give only the full name, and may still use 1 Apollo credit.\n\nReveal anyway?'
      : 'This will use 1 Apollo credit to reveal this contact\'s full name and email address.\n\nContinue?';
  }

  // Reveals one of the more people (1 credit); throws with Apollo's reason when it can't match.
  async function revealPerson(p) {
    const data = await postJson(REVEAL_URL, { apollo_id: p.apollo_id }, 60000);
    if (!data.revealed) throw new Error(data.message || 'Apollo couldn\'t confidently match this person.');
    return {
      name: String(data.full_name || p.name).split(' ')[0], title: p.title, linkedin_url: p.linkedin_url, apollo_id: p.apollo_id,
      has_email: p.has_email, has_direct_phone: p.has_direct_phone, reasoning: 'Added from more people at this company',
      revealed: { full_name: data.full_name || '', email: data.email || '' },
    };
  }

  // The list under the contacts. buttonAttrs(i) marks each Reveal button for its click handler.
  function morePeopleHtml(list, company, buttonAttrs, detailsAttrs, open) {
    if (!list || !list.length) return '';
    const withEmail = list.filter(p => p.has_email).length;
    const rows = list.map((p, i) => `<div class="tng-more-row">
        <div class="tng-more-who"><span class="name">${escapeHtml(p.name)}</span>${p.title ? ' — ' + escapeHtml(p.title) : ''}</div>
        <div class="tng-more-side">${reachChips(p)}<button class="tng-reveal-btn tng-brief-reveal" ${buttonAttrs(i)} ${p.busy ? 'disabled' : ''}>${p.busy ? 'Revealing...' : tngIcon('mail') + 'Reveal (1 credit)'}</button></div>
        ${p.error ? `<div class="error">${escapeHtml(p.error)}</div>` : ''}
      </div>`).join('');
    return `<details class="tng-more-people" ${detailsAttrs} ${open ? 'open' : ''}>
      <summary>More people at ${escapeHtml(company || 'this company')} (${list.length}) · ${withEmail} with email on file</summary>
      <div class="tng-more-hint">From Apollo's free people search. Revealing someone adds them to the contacts, so they can be exported and pushed to Zoho.</div>
      ${rows}
    </details>`;
  }

  // Single Lead: reveal one of the more people and make them the contact shown on the card.
  // confirmed: the caller already asked (the push window). Returns '' or the reason it failed.
  async function revealSingleMore(i, confirmed) {
    const p = lastCompanyInfo && lastCompanyInfo.more_people[i];
    if (!p || p.busy) return 'busy';
    if (!confirmed && !window.confirm(revealPrompt(p))) return 'cancelled';
    p.busy = true;
    p.error = '';
    renderMorePeople();
    try {
      const { revealed, ...contact } = await revealPerson(p);
      lastCompanyInfo.key_contacts.push(contact);
      currentContactIndex = lastCompanyInfo.key_contacts.length - 1;
      revealedByIndex[currentContactIndex] = revealed;
      lastCompanyInfo.more_people.splice(i, 1);
      renderContactCard(document.getElementById('tng-email').value.trim());
      return '';
    } catch (err) {
      p.busy = false;
      p.error = err.message;
      renderMorePeople();
      return err.message;
    }
  }

  let morePeopleOpen = false;
  function renderMorePeople() {
    const el = document.getElementById('tng-more-people');
    const info = lastCompanyInfo;
    el.innerHTML = info ? morePeopleHtml(info.more_people, info.company_name, i => `data-more="${i}"`, 'id="tng-more-details"', morePeopleOpen) : '';
  }
  document.getElementById('tng-more-people').addEventListener('click', e => {
    const btn = e.target.closest('[data-more]');
    if (btn && !btn.disabled) revealSingleMore(Number(btn.dataset.more));
  });
  document.getElementById('tng-more-people').addEventListener('toggle', e => {
    if (e.target.id === 'tng-more-details') morePeopleOpen = e.target.open;
  }, true);

  // Hunter Brief: the same, into the lead's contacts.
  async function revealBriefMore(lead, i, confirmed) {
    const v = vettedOf(lead);
    const list = v && v.result.more_people;
    const p = list && list[i];
    if (!p || p.busy) return 'busy';
    if (!confirmed && !window.confirm(revealPrompt(p))) return 'cancelled';
    p.busy = true;
    p.error = '';
    renderBriefResults();
    try {
      v.contacts.push(await revealPerson(p));
      list.splice(i, 1);
      renderBriefResults();
      return '';
    } catch (err) {
      p.busy = false;
      p.error = err.message;
      renderBriefResults();
      return err.message;
    }
  }

  window.tngCycleContact = function() {
    const contacts = (lastCompanyInfo && lastCompanyInfo.key_contacts) || [];
    if (contacts.length < 2) return;
    currentContactIndex = (currentContactIndex + 1) % contacts.length;
    const typedEmail = document.getElementById('tng-email').value.trim();
    renderContactCard(typedEmail);
  };

  window.tngReset = function() {
    SIGNALS.forEach(s => {
      state[s.id].checked = false;
      state[s.id].detail = '';
    });
    document.getElementById('tng-domain').value = '';
    document.getElementById('tng-email').value = '';
    document.getElementById('tng-contact-card').classList.remove('active');
    document.getElementById('tng-company-card').classList.remove('active');
    document.getElementById('tng-company-card').classList.remove('hot-lead');
    document.getElementById('tng-hot-badge').classList.remove('active');
    document.getElementById('tng-reveal-btn').style.display = 'none';
    document.getElementById('tng-reveal-result').textContent = '';
    document.getElementById('tng-reveal-result').className = 'tng-reveal-result';
    document.getElementById('tng-contact-cycle-btn').style.display = 'none';
    document.getElementById('tng-license-badge').classList.remove('active');
    document.getElementById('tng-corp-structure').classList.remove('active');
    document.getElementById('tng-crm-records').innerHTML = '';
    document.getElementById('tng-visit-summary').innerHTML = '';
    document.getElementById('tng-incidents').innerHTML = '';
    document.getElementById('tng-cache-note').classList.remove('active');
    lastSiteVisits = null;
    lastIncidents = null;
    crmRequestId++; // ignore any CRM check still in flight
    incidentRequestId++; // and any news search
    eventRequestId++;
    lastEvents = null;
    document.getElementById('tng-triggers').innerHTML = '';
    prevTotal = 0;
    prevTier = 'ice_cold';
    lastCompanyInfo = null;
    currentContactIndex = 0;
    revealedByIndex = {};
    document.getElementById('tng-zoho-result').innerHTML = '';
    document.getElementById('tng-more-people').innerHTML = '';
    document.getElementById('tng-contact-reach').innerHTML = '';
    setError('');
    setStatus(null);
    renderSignals();
    recompute();
    document.getElementById('tng-adjust').open = false;
    setSingleEmpty(true);
  };

  function buildScoreSummary() {
    const domainVal = document.getElementById('tng-domain').value.trim();
    const info = lastCompanyInfo || { domain: domainVal, company_name: domainVal || '(no domain entered)' };
    // Pages without points of their own are reported only as pitch notes, not as matched signals.
    const checkedSignals = SIGNALS.filter(s => state[s.id].checked && (s.group !== 'pages' || s.pts > 0));
    const pagesVisited = SIGNALS.filter(s => state[s.id].checked && s.group === 'pages').map(s => s.label);
    const total = checkedSignals.reduce((sum, s) => sum + s.pts, 0);
    const tierEl = document.getElementById('tng-tier');
    const tier = tierEl ? tierEl.textContent.trim() : '';
    const timestamp = new Date().toLocaleString();

    return { info, checkedSignals, pagesVisited, total, tier, timestamp };
  }

  function showExportConfirm(message, elId) {
    const el = document.getElementById(elId || 'tng-export-confirm');
    el.textContent = message;
    el.classList.add('active');
    setTimeout(() => el.classList.remove('active'), 2500);
  }

  window.tngCopySummary = async function() {
    const { info, checkedSignals, pagesVisited, total, tier, timestamp } = buildScoreSummary();

    let text = `TNG OPPORTUNITY SCORE — ${info.company_name}\n`;
    text += `Generated: ${timestamp}\n`;
    text += `Domain: ${info.domain || 'n/a'}\n\n`;

    if (info.industry || info.employee_count || info.estimated_revenue || info.headquarters) {
      text += `Industry: ${info.industry || 'n/a'}\n`;
      if (info.employee_count) text += `Employees: ${info.employee_count}\n`;
      if (info.estimated_revenue) text += `Estimated Revenue: ${info.estimated_revenue}\n`;
      if (info.headquarters) text += `Headquarters: ${info.headquarters}\n`;
      if (info.founded_year) text += `Founded: ${info.founded_year}\n`;
      if (info.company_description) text += `\n${info.company_description}\n`;
      text += `\n`;
    }

    text += `SCORE: ${total} (${tier})\n`;
    if (state.crm.detail) text += `Zoho CRM: ${state.crm.detail}\n`;
    if (lastSiteVisits && lastSiteVisits.available) text += `Site visits (Apollo, 90 days): ${lastSiteVisits.total_visits} visits, ${lastSiteVisits.unique_visitors} unique visitors\n`;
    if (lastIncidents && lastIncidents.available) {
      text += lastIncidents.incidents.length
        ? `Security incidents in the news (last 24 months, background only):\n${incidentsText(lastIncidents.incidents, '  • ')}`
        : `Security incidents in the news: none reported in the last 24 months\n`;
    }
    if (lastEvents && lastEvents.available) {
      text += lastEvents.events.length
        ? `Trigger events in the news (last 12 months):\n${eventsText(lastEvents.events, '  • ')}`
        : `Trigger events in the news: none found in the last 12 months\n`;
    }
    text += `\n`;
    text += `Signals matched:\n`;
    if (checkedSignals.length) {
      checkedSignals.forEach(s => { text += `  • ${s.label} (+${s.pts})\n`; });
    } else {
      text += `  (none checked)\n`;
    }
    if (pagesVisited.length) text += `\nPages visited (pitch notes): ${pagesVisited.join(', ')}\n`;

    const contacts = info.key_contacts || [];
    if (contacts.length) {
      text += `\nRecommended Contacts:\n`;
      contacts.forEach((c, i) => {
        text += `  ${i + 1}. ${c.name}`;
        if (c.title) text += ` — ${c.title}`;
        text += `\n`;
        if (c.linkedin_url) text += `     LinkedIn: ${c.linkedin_url}\n`;
        const revealed = revealedByIndex[i];
        if (revealed && revealed.full_name) text += `     Full Name: ${revealed.full_name}\n`;
        if (revealed && revealed.email) text += `     Email: ${revealed.email}\n`;
      });
    }

    await copyText(text);
  };

  async function copyText(text, confirmId) {
    try {
      await navigator.clipboard.writeText(text);
      showExportConfirm('Copied to clipboard', confirmId);
    } catch (e) {
      // Fallback for browsers/contexts where clipboard API is blocked
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showExportConfirm('Copied to clipboard', confirmId);
      } catch (e2) {
        showExportConfirm('Copy failed — select and copy manually', confirmId);
      }
      document.body.removeChild(textarea);
    }
  }

  window.tngExportCsv = function() {
    const { info, checkedSignals, pagesVisited, total, tier, timestamp } = buildScoreSummary();

    const headers = [
      'Timestamp', 'Company', 'Domain', 'Industry', 'Employees', 'Estimated Revenue',
      'Headquarters', 'Founded', 'Score', 'Tier', 'Zoho CRM', 'Signals Matched', 'Pages Visited', 'Security Incidents', 'Trigger Events',
      'Contact 1 Name', 'Contact 1 Title', 'Contact 1 LinkedIn', 'Contact 1 Revealed Name', 'Contact 1 Revealed Email',
      'Contact 2 Name', 'Contact 2 Title', 'Contact 2 LinkedIn', 'Contact 2 Revealed Name', 'Contact 2 Revealed Email',
      'Contact 3 Name', 'Contact 3 Title', 'Contact 3 LinkedIn', 'Contact 3 Revealed Name', 'Contact 3 Revealed Email',
    ];

    const contacts = info.key_contacts || [];
    const contactColumns = [];
    for (let i = 0; i < 3; i++) {
      const c = contacts[i];
      const revealed = revealedByIndex[i];
      contactColumns.push(
        c ? c.name || '' : '',
        c ? c.title || '' : '',
        c ? c.linkedin_url || '' : '',
        revealed ? revealed.full_name || '' : '',
        revealed ? revealed.email || '' : ''
      );
    }

    const row = [
      timestamp,
      info.company_name,
      info.domain || '',
      info.industry || '',
      info.employee_count || '',
      info.estimated_revenue || '',
      info.headquarters || '',
      info.founded_year || '',
      total,
      tier,
      state.crm.detail || '',
      checkedSignals.map(s => s.label).join('; '),
      pagesVisited.join('; '),
      incidentsCsv(lastIncidents),
      eventsCsv(lastEvents),
      ...contactColumns,
    ];

    const safeCompanyName = (info.company_name || 'lead').replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    downloadCsv(`tng-opportunity-score-${safeCompanyName}.csv`, headers, [row]);
    showExportConfirm('CSV downloaded');
  };

  function csvEscape(val) {
    const str = String(val == null ? '' : val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  function downloadCsv(filename, headers, rows) {
    const csvContent = [headers, ...rows].map(r => r.map(csvEscape).join(',')).join('\n');
    downloadFile(filename, csvContent, 'text/csv;charset=utf-8;');
  }

  function downloadFile(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  window.tngRevealContact = async function() {
    if (!lastCompanyInfo) return;
    const contacts = lastCompanyInfo.key_contacts || [];
    const contact = contacts[currentContactIndex];
    if (!contact && !lastCompanyInfo.typed_contact_email) return;
    if (lastCompanyInfo.data_source === 'web_research') return; // not in Apollo — nothing to reveal

    const confirmed = window.confirm(revealPrompt(contact));
    if (!confirmed) return;

    const btn = document.getElementById('tng-reveal-btn');
    const resultEl = document.getElementById('tng-reveal-result');
    btn.disabled = true;
    btn.textContent = 'Revealing...';
    resultEl.className = 'tng-reveal-result';
    resultEl.textContent = '';

    try {
      let payload;
      if (contact && contact.apollo_id) {
        payload = { apollo_id: contact.apollo_id };
      } else if (contact) {
        payload = {
          first_name: (contact.name || '').split(' ')[0],
          domain: lastCompanyInfo.domain,
          title: contact.title,
        };
      } else {
        // No auto-suggested contact at all — fall back to whatever email the user typed in.
        payload = { email: lastCompanyInfo.typed_contact_email };
      }

      const response = await fetch(REVEAL_URL, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Reveal request failed');

      if (data.revealed) {
        resultEl.innerHTML =
          `<span class="name">${escapeHtml(data.full_name || '(name unavailable)')}</span>` +
          (data.email ? ` &nbsp;·&nbsp; <span class="email">${escapeHtml(data.email)}</span>` : ' — no email on file');
        btn.style.display = 'none';
        document.getElementById('tng-contact-reach').innerHTML = '';
        revealedByIndex[currentContactIndex] = {
          full_name: data.full_name || '',
          email: data.email || '',
        };
      } else {
        resultEl.className = 'tng-reveal-result error';
        resultEl.textContent = data.message || 'Could not confidently match this contact for reveal.';
        btn.disabled = false;
        btn.innerHTML = tngIcon('mail') + REVEAL_LABEL;
      }
    } catch (err) {
      console.error(err);
      resultEl.className = 'tng-reveal-result error';
      resultEl.textContent = 'Reveal failed: ' + err.message;
      btn.disabled = false;
      btn.innerHTML = tngIcon('mail') + REVEAL_LABEL;
    }
  };

  // ---------- Hunter Brief: vet every lead in one of Steve's Client Hunter Briefs ----------
  // The brief's HTML becomes plain text here (links kept), parse-brief has Claude pull out
  // each lead and its organization's website, and every ticked lead then runs through the
  // same analyze-lead + check-crm lookups as Analyze, two at a time. Steve's score stays
  // the base of the ranking; what the lookups find moves each lead up or down (priorityFor).
  const PARSE_URL = "https://tng-lead.vercel.app/api/parse-brief";
  const BRIEF_CONCURRENCY = 2;
  const SECURITY_TITLE = /secur|safety|facilit|risk|protect|emergency|loss prevention/i;
  let brief = null; // { title, date, started, watchOpen, leads: [...] }
  let briefRunning = false;

  window.tngSetMode = function(mode) {
    const isBrief = mode === 'brief';
    document.getElementById('tng-mode-single').hidden = isBrief;
    document.getElementById('tng-mode-brief').hidden = !isBrief;
    document.getElementById('tng-tab-single').setAttribute('aria-selected', String(!isBrief));
    document.getElementById('tng-tab-brief').setAttribute('aria-selected', String(isBrief));
  };

  function setBriefStatus(text) {
    document.getElementById('tng-brief-status-text').textContent = text || '';
    document.getElementById('tng-brief-status').classList.toggle('active', !!text);
  }

  // Lights up step 1, 2 or 3 of the "how it works" strip; earlier steps get a check.
  function setBriefStep(step) {
    document.querySelectorAll('#tng-brief-steps li').forEach(li => {
      const n = Number(li.dataset.step);
      li.classList.toggle('done', n < step);
      li.classList.toggle('current', n === step);
    });
  }

  const fmtWait = secs => secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;

  // Reading the brief is one Claude call, so its middle steps are paced by the expected
  // time (learned from earlier briefs on this computer), not reported by the server. The
  // last step stays open until the answer actually arrives.
  const PARSE_SECONDS_KEY = 'tngBriefParseSeconds';
  const PARSE_STEPS = [
    { label: "Opened the brief" },
    { label: 'Sent it to Claude' },
    { label: 'Pulling out each ranked and watchlist lead', until: 0.45 },
    { label: "Finding each organization's website", until: 0.85 },
    { label: 'Checking licensed states and deadlines', until: Infinity },
    { label: 'Ready for your review' },
  ];

  function expectedParseSeconds() {
    try {
      const saved = Number(localStorage.getItem(PARSE_SECONDS_KEY));
      if (saved >= 15 && saved <= 240) return Math.round(saved);
    } catch (e) { /* storage blocked: use the default */ }
    return 55;
  }
  function rememberParseSeconds(secs) {
    try { localStorage.setItem(PARSE_SECONDS_KEY, String(Math.round((expectedParseSeconds() + secs) / 2))); } catch (e) { /* not needed */ }
  }

  // stage: 'working' (paced by time) or 'done' (all checked, with a closing line).
  function renderParseWork({ fileName, draftCount, chars, elapsed, expected, stage, leadCount }) {
    const el = document.getElementById('tng-brief-work');
    const frac = elapsed / expected;
    const current = stage === 'done' ? PARSE_STEPS.length : 2 + PARSE_STEPS.slice(2).findIndex(s => frac < s.until);
    const details = [
      `${escapeHtml(fileName)}${draftCount ? ` · ${draftCount} outreach draft${draftCount === 1 ? '' : 's'} kept` : ''}`,
      `about ${Math.max(1, Math.round(chars / 3000))} page${chars < 4500 ? '' : 's'} of text`,
      stage === 'done' ? `${leadCount} lead${leadCount === 1 ? '' : 's'} found` : '',
      '', '', '',
    ];
    const steps = PARSE_STEPS.map((s, i) => {
      const cls = i < current ? 'done' : i === current ? 'current' : '';
      return `<li class="${cls}"><span class="mark"></span><span>${s.label}${details[i] ? ` <span class="detail">· ${details[i]}</span>` : ''}</span></li>`;
    }).join('');
    // The bar runs to 90% at the expected time, then creeps toward 98% until the answer arrives.
    const pct = stage === 'done' ? 100
      : frac < 1 ? frac * 90 : 90 + 8 * (1 - Math.exp(-(elapsed - expected) / 30));
    const left = expected - elapsed;
    const time = stage === 'done' ? 'Done'
      : left > 0 ? `About ${fmtWait(left)} left` : `Taking a bit longer than usual · ${fmtWait(elapsed)}`;
    el.innerHTML = `
      <div class="tng-work-head"><div class="tng-work-title">${stage === 'done' ? 'Brief read' : 'Reading the brief'}</div><div class="tng-work-time">${time}</div></div>
      <div class="tng-progress"><div class="tng-progress-bar" style="width:${pct}%"></div></div>
      <ol class="tng-work-steps">${steps}</ol>
      <div class="tng-work-note">${stage === 'done' ? 'Your leads are below.' : "This uses no Apollo credits. You can switch to another tab; this tab's title shows when it's ready."}</div>`;
    el.hidden = false;
  }

  function setBriefError(text) {
    const el = document.getElementById('tng-brief-error');
    el.textContent = text || '';
    el.classList.toggle('active', !!text);
  }

  const cleanDomain = raw => {
    const d = String(raw || '').trim().toLowerCase()
      .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[\/?#\s]/)[0];
    return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(d) ? d : '';
  };
  const isWebLink = url => /^https?:\/\//i.test(String(url || ''));

  // "2026-11-04" → a local date; anything else → null.
  function parseDay(ymd) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd || '');
    return m ? new Date(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function daysUntil(ymd) {
    const day = parseDay(ymd);
    if (!day) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((day - today) / 86400000);
  }
  function fmtDay(ymd, withYear) {
    const day = parseDay(ymd);
    if (!day) return ymd || '';
    return day.toLocaleDateString(undefined, withYear
      ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'short', day: 'numeric' });
  }

  // POST with the access code; waits and retries when the backend's rate limit says so.
  async function postJson(url, body, timeoutMs) {
    for (let attempt = 0; ; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const resp = await fetch(url, { method: 'POST', headers: API_HEADERS, body: JSON.stringify(body), signal: ctrl.signal });
        const data = await resp.json().catch(() => ({}));
        if (resp.status === 429 && attempt < 3) {
          await new Promise(r => setTimeout(r, 20000));
          continue;
        }
        if (!resp.ok) throw new Error(data.error || ('Request failed: ' + resp.status));
        return data;
      } catch (err) {
        if (err.name === 'AbortError') throw new Error(`timed out after ${Math.round(timeoutMs / 1000)}s`);
        // The browser's bare "Failed to fetch": offline, or the endpoint isn't deployed (no CORS on a 404).
        if (err instanceof TypeError) throw new Error("couldn't reach the TNG backend. Check your internet connection; if it keeps happening, the backend needs a redeploy");
        throw err;
      } finally {
        clearTimeout(timer);
      }
    }
  }

  // ----- Reading the brief -----
  const BLOCK_TAGS = new Set(['P', 'DIV', 'LI', 'TR', 'UL', 'OL', 'TABLE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'ARTICLE', 'SECTION', 'HEADER', 'FOOTER', 'MAIN', 'BR', 'HR', 'TITLE']);

  function nodeText(node) {
    if (node.nodeType === 3) return node.nodeValue.replace(/\s+/g, ' ');
    if (node.nodeType !== 1) return '';
    const inner = [...node.childNodes].map(nodeText).join('');
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      return isWebLink(href) ? `${inner} <${href}>` : inner;
    }
    if (node.tagName === 'TD' || node.tagName === 'TH') return inner.trim() + ' | ';
    if (BLOCK_TAGS.has(node.tagName)) return '\n' + inner.trim() + '\n';
    return inner;
  }

  // The brief as plain text for parse-brief, plus its outreach drafts (kept here, keyed
  // by the "#N" in their subject line, so Claude doesn't have to copy them back out).
  function briefToText(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const drafts = {};
    doc.querySelectorAll('.draft').forEach(el => {
      const subject = (el.querySelector('.subj') || el).textContent;
      const m = /#(\d+)/.exec(subject);
      if (m) drafts[m[1]] = [...el.children].map(c => c.textContent.trim()).filter(Boolean).join('\n\n');
    });
    doc.querySelectorAll('script, style, noscript, .draft').forEach(el => el.remove());
    const text = nodeText(doc.body).replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    return { text, drafts };
  }

  async function loadBriefFile(file) {
    if (!file || briefRunning) return;
    setBriefError('');
    if (!/\.html?$/i.test(file.name)) {
      setBriefError(`"${file.name}" isn't an HTML file. Choose the brief's .html file.`);
      return;
    }
    const { text, drafts } = briefToText(await file.text());
    if (text.length < 200) {
      setBriefError("That file doesn't look like a Hunter Brief (there's almost no text in it).");
      return;
    }
    brief = null;
    renderBriefReview();
    renderBriefResults();
    document.getElementById('tng-brief-drop').hidden = true;

    const work = { fileName: file.name, draftCount: Object.keys(drafts).length, chars: text.length, expected: expectedParseSeconds(), elapsed: 0, stage: 'working' };
    const started = Date.now();
    const originalTitle = document.title;
    const tickWork = () => {
      work.elapsed = Math.floor((Date.now() - started) / 1000);
      renderParseWork(work);
      document.title = `📄 Reading brief · ${fmtWait(work.elapsed)}`;
    };
    tickWork();
    const tick = setInterval(tickWork, 1000);
    let ok = false;
    try {
      const data = await postJson(PARSE_URL, { text }, 300000);
      const leads = (data.leads || []).map((l, i) => ({
        ...l,
        key: i,
        include: l.vet && l.section === 'ranked',
        draft: l.section === 'ranked' && l.rank ? drafts[l.rank] || '' : '',
        vetted: null,
        pending: false,
      }));
      if (!leads.length) throw new Error('no leads found in it');
      clearInterval(tick);
      rememberParseSeconds((Date.now() - started) / 1000);
      renderParseWork({ ...work, stage: 'done', leadCount: leads.length });
      brief = { title: data.brief_title || file.name.replace(/\.html?$/i, ''), date: data.brief_date || '', leads };
      renderBriefReview();
      ok = true;
    } catch (err) {
      console.error(err);
      setBriefError("Couldn't read the brief: " + err.message);
      document.getElementById('tng-brief-drop').hidden = false;
      document.getElementById('tng-brief-work').hidden = true;
      setBriefStep(1);
    } finally {
      clearInterval(tick);
    }
    if (!ok) { document.title = originalTitle; return; }
    // Someone who switched tabs sees it's ready; the title goes back once they return.
    if (document.hidden) {
      document.title = '✅ Brief ready to review';
      document.addEventListener('visibilitychange', () => { document.title = originalTitle; }, { once: true });
    } else {
      document.title = originalTitle;
    }
    setTimeout(() => {
      document.getElementById('tng-brief-work').hidden = true;
      const review = document.getElementById('tng-brief-review');
      if (review.getBoundingClientRect().top < 0) review.scrollIntoView({ behavior: 'smooth' });
    }, 1500);
  }

  // ----- Review: confirm websites and pick which leads to vet -----
  function renderBriefReview() {
    const el = document.getElementById('tng-brief-review');
    setBriefStep(!brief ? 1 : brief.started ? 3 : 2);
    if (!brief || brief.started) { el.innerHTML = ''; return; }
    const ranked = brief.leads.filter(l => l.section === 'ranked');
    const watch = brief.leads.filter(l => l.section === 'watchlist');
    // The Vet button sits both above the list (and stays in view while scrolling) and below it.
    const runBar = extra => `<div class="tng-brief-actions${extra ? '' : ' top'}">
        <button class="tng-analyze-btn tng-brief-run" data-brief-action="run"></button>
        ${extra}
        <span class="tng-brief-credits"></span>
      </div>`;
    el.innerHTML = `
      <div class="tng-brief-summary"><div class="tng-brief-summary-text"><strong>${escapeHtml(briefHeading())}</strong> · ${ranked.length} ranked lead${ranked.length === 1 ? '' : 's'}${watch.length ? `, ${watch.length} on the watchlist` : ''}</div></div>
      <div class="tng-hint" style="margin-bottom:0;">Check each website (fix any marked "Check this website"), untick leads to skip, then vet. Ticked leads get the full lookup; the rest still appear in the results with Steve's notes.</div>
      ${runBar('')}
      ${reviewGroupHtml('Ranked leads', ranked)}
      ${watch.length ? reviewGroupHtml('Watchlist', watch) : ''}
      ${runBar('<button class="tng-reset-btn" data-brief-action="new">Choose a different brief</button>')}`;
    updateRunButton();
  }

  function reviewGroupHtml(label, leads) {
    const rows = leads.map(l => {
      const unsure = l.domain && (l.domain_confidence === 'medium' || l.domain_confidence === 'low')
        ? '<span class="tng-chip warn">Check this website</span>' : '';
      const note = !l.vet && l.vet_note ? `<div class="tng-brief-row-sub">${escapeHtml(l.vet_note)}</div>` : '';
      return `<div class="tng-brief-row${l.include ? ' on' : ''}" data-key="${l.key}">
          <input type="checkbox" class="tng-check" data-role="include" aria-label="Vet ${escapeHtml(l.organization)}" ${l.include ? 'checked' : ''} ${l.domain ? '' : 'disabled'} />
          <div class="tng-brief-row-main">
            <div class="tng-brief-row-name">${l.rank ? '#' + escapeHtml(l.rank) + ' ' : ''}${escapeHtml(l.organization)}</div>
            <div class="tng-brief-row-sub">${escapeHtml([l.opportunity, l.lane].filter(Boolean).join(' · '))}</div>
            <div class="tng-brief-domain"><input type="text" data-role="domain" value="${escapeHtml(l.domain)}" placeholder="Website, e.g. acmehealth.com" spellcheck="false" aria-label="Website for ${escapeHtml(l.organization)}" />${unsure}</div>
            ${note}
          </div>
          <div class="tng-brief-score">${l.steve_score ? escapeHtml(l.steve_score) : '—'}</div>
        </div>`;
    }).join('');
    return `<div class="tng-section-label" style="margin-top:24px;">${label}<span>Steve's score</span></div>
      <div class="tng-brief-list">${rows}</div>`;
  }

  function updateRunButton() {
    if (!brief) return;
    const n = brief.leads.filter(l => l.include && l.domain).length;
    document.querySelectorAll('#tng-brief-review .tng-brief-run').forEach(btn => {
      btn.textContent = `Vet ${n} lead${n === 1 ? '' : 's'}`;
      btn.disabled = !n;
    });
    const credits = n ? `Up to ${n * 2} Apollo credits (2 per lead; companies looked up this week are free) · about ${vetMinutes(n)}` : '';
    document.querySelectorAll('#tng-brief-review .tng-brief-credits').forEach(el => { el.textContent = credits; });
  }

  // Rough vetting time: leads run two at a time, about 40 seconds each when nothing is saved.
  const VET_SECONDS_PER_LEAD = 40;
  function vetMinutes(n) {
    const mins = Math.ceil(Math.ceil(n / BRIEF_CONCURRENCY) * VET_SECONDS_PER_LEAD / 60);
    return mins <= 1 ? 'a minute' : `${mins} minutes`;
  }

  // ----- Vetting -----
  async function runBrief() {
    if (!brief || briefRunning) return;
    const queue = brief.leads.filter(l => l.include && l.domain);
    if (!queue.length) return;
    briefRunning = true;
    brief.started = true;
    queue.forEach(l => { l.pending = true; });
    renderBriefReview();

    const total = queue.length;
    let done = 0;
    const originalTitle = document.title;
    const progressEl = document.getElementById('tng-brief-progress');
    progressEl.hidden = false;
    // Time left: rounds of two still to go, at the average time per lead so far (saved
    // lookups come back in seconds, so the estimate drops quickly when they're common).
    const durations = [];
    let planned = Date.now() + Math.ceil(total / BRIEF_CONCURRENCY) * VET_SECONDS_PER_LEAD * 1000;
    const showProgress = () => {
      const left = Math.max(0, Math.round((planned - Date.now()) / 1000));
      const eta = done === total ? '' : left > 0 ? ` · about ${fmtWait(left)} left` : ' · finishing up';
      setBriefStatus(`Vetting ${total} lead${total === 1 ? '' : 's'}: ${done} done${eta}. Keep this page open; results fill in below as they finish.`);
      document.getElementById('tng-brief-progress-bar').style.width = (done / total * 100) + '%';
      document.title = `🔍 ${done}/${total} vetted`;
    };
    showProgress();
    const tick = setInterval(showProgress, 1000);
    renderBriefResults();

    const worker = async () => {
      while (queue.length) {
        const lead = queue.shift();
        const t0 = Date.now();
        lead.vetted = await vetLead(lead);
        lead.pending = false;
        durations.push(Date.now() - t0);
        done++;
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        planned = Date.now() + Math.ceil((total - done) / BRIEF_CONCURRENCY) * avg;
        showProgress();
        renderBriefResults();
      }
    };
    await Promise.all(Array.from({ length: BRIEF_CONCURRENCY }, worker));
    clearInterval(tick);

    briefRunning = false;
    progressEl.hidden = true;
    setBriefStatus(null);
    document.title = '✅ Brief vetted';
    setTimeout(() => { document.title = originalTitle; }, 4000);
    renderBriefResults();
    const spicyLeads = brief.leads.filter(l => vettedOf(l) && vettedOf(l).tier.tier === 'spicy').length;
    if (spicyLeads) {
      heatBurst(true, document.querySelector('#tng-brief-results .tng-brief-summary'));
      heatWave();
      tngToast(`🌶️ ${spicyLeads} spicy lead${spicyLeads === 1 ? '' : 's'} in this brief!`, 'spicy');
    } else {
      tngToast(`✓ Brief vetted: ${total} lead${total === 1 ? '' : 's'} ranked`, 'good');
    }
  }

  // The three lookups behind each lead, in the order the "Vetting" chip lists them.
  const LOOKUPS = [['apollo', 'Apollo'], ['crm', 'Zoho'], ['news', 'News']];

  // A queued lead waits its turn; a running one shows which lookups have come back.
  function pendingChipHtml(lead) {
    const inner = lead.lookups
      ? 'Vetting: ' + LOOKUPS.map(([k, label]) => `<span class="lookup${lead.lookups[k] ? ' done' : ''}">${label}${lead.lookups[k] ? ' ✓' : ''}</span>`).join(' · ')
      : 'Waiting its turn';
    return `<span class="tng-chip info" data-pending-key="${lead.key}"><span class="tng-radar"></span>${inner}</span>`;
  }

  // Updates just the chip, so a lookup finishing doesn't redraw every card.
  function updatePendingChip(lead) {
    const chip = document.querySelector(`#tng-brief-results [data-pending-key="${lead.key}"]`);
    if (chip && lead.pending) chip.outerHTML = pendingChipHtml(lead);
  }

  async function vetLead(lead) {
    lead.lookups = {};
    updatePendingChip(lead);
    const track = (key, promise) => promise.finally(() => { lead.lookups[key] = true; updatePendingChip(lead); });
    const [analysis, crm, news] = await Promise.allSettled([
      track('apollo', postJson(BACKEND_URL, { domain: lead.domain }, 150000)),
      track('crm', postJson(CRM_URL, { domain: lead.domain }, 60000)),
      track('news', postJson(NEWS_URL, { domain: lead.domain, company_name: lead.organization }, 240000)),
    ]);
    lead.lookups = null;
    if (analysis.status === 'rejected') return { ok: false, error: analysis.reason.message };
    const result = analysis.value;
    const crmData = crm.status === 'fulfilled' ? crm.value : { error: crm.reason.message };
    const newsData = news.status === 'fulfilled' ? news.value : { available: false, reason: news.reason.message };
    const incidents = newsData.available ? newsData.incidents : { available: false, reason: newsData.reason };
    const events = newsData.available ? newsData.events : { available: false, reason: newsData.reason };
    const auto = autoSignalsFromResult(result);
    const visits = pagesFromVisits(result.site_visits);
    const crmFound = !!(crmData.configured && crmData.found);
    const recentIncident = !!(incidents.available && incidents.recent_count);
    const recentEvent = !!(events.available && events.recent_count);
    const autoIds = Object.keys(auto).filter(id => auto[id].checked);
    const scored = scoreSignals(autoIds.concat(Object.keys(visits.pages), crmFound ? ['crm'] : [], recentIncident ? ['recent_incident'] : [], recentEvent ? ['trigger_event'] : []));
    return {
      ok: true,
      result,
      crm: crmData,
      crmFound,
      incidents,
      recentIncident,
      events,
      recentEvent,
      visits,
      total: scored.total,
      signalIds: scored.ids,
      firmPts: SIGNALS.filter(s => autoIds.includes(s.id)).reduce((sum, s) => sum + s.pts, 0),
      tier: tierFor(scored.total),
      contacts: (Array.isArray(result.key_contacts) ? result.key_contacts : []).map(c => ({ ...c })),
    };
  }

  // Steve's score is the base; each finding nudges it. Explained in the footnote.
  function priorityFor(lead) {
    const reasons = [];
    const add = (pts, text) => reasons.push({ pts, text });
    const v = lead.vetted && lead.vetted.ok ? lead.vetted : null;
    if (v) {
      if (v.crmFound) add(1, 'in Zoho CRM');
      if (v.recentIncident) add(1, 'recent security incident');
      if (v.recentEvent) add(0.5, 'trigger event: ' + recentEventLabels(v.events).toLowerCase());
      const pageTypes = new Set(Object.keys(v.visits.pages).map(id => SIGNALS.find(s => s.id === id).pageType));
      const sv = v.result.site_visits;
      if (pageTypes.has('high_intent')) add(1.5, 'visited Contact / Request page');
      else if (pageTypes.has('service')) add(1, 'viewed service pages');
      else if (sv && sv.available && sv.total_visits) add(0.5, 'visited the site');
      if (v.firmPts >= 50) add(0.5, 'strong firmographic fit');
      if (v.contacts.some(c => SECURITY_TITLE.test(c.title || ''))) add(0.5, 'security contact found');
    }
    if (lead.site_licensed === false) add(-0.5, 'outside licensed states');
    const days = daysUntil(lead.deadline_date);
    if (days !== null && days < 0) add(-2, 'deadline passed');
    const base = Number(lead.steve_score) || 0;
    const total = Math.round((base + reasons.reduce((sum, r) => sum + r.pts, 0)) * 10) / 10;
    return { base, reasons, total };
  }

  function priorityText(pr) {
    return `Steve ${pr.base}` + pr.reasons.map(r => ` ${r.pts > 0 ? '+' : '−'} ${Math.abs(r.pts)} ${r.text}`).join('');
  }

  // Ranked leads (and anything vetted) in priority order; unvetted watchlist items apart.
  function orderedBriefLeads() {
    const all = brief.leads.map(lead => ({ lead, pr: priorityFor(lead) }));
    const deadlineKey = l => parseDay(l.deadline_date) || new Date(8640000000000000);
    const byPriority = (a, b) => b.pr.total - a.pr.total || deadlineKey(a.lead) - deadlineKey(b.lead);
    const isMain = x => x.lead.section === 'ranked' || x.lead.vetted || x.lead.pending;
    return { main: all.filter(isMain).sort(byPriority), rest: all.filter(x => !isMain(x)).sort(byPriority) };
  }

  // ----- Results -----
  function renderBriefResults() {
    const el = document.getElementById('tng-brief-results');
    if (!brief || !brief.started) { el.innerHTML = ''; return; }
    const { main, rest } = orderedBriefLeads();
    el.innerHTML = `
      <div class="tng-brief-summary tng-results-bar">
        <div class="tng-brief-summary-text"><strong>${escapeHtml(briefHeading())}</strong><br>${escapeHtml(briefCountsText(main))}
          <br><button class="tng-help-link" onclick="tngPriorityHelp()">${tngIcon('info')}How priority works</button></div>
        <div class="tng-export-row">
          <button class="tng-export-btn primary" data-brief-action="report" ${briefRunning ? 'disabled title="Available when vetting finishes"' : 'title="Download a Word document for leadership"'}>${tngIcon('doc')}Executive Report</button>
          <button class="tng-export-btn" data-brief-action="pdf" ${briefRunning ? 'disabled title="Available when vetting finishes"' : 'title="Print the full report, or save it as a PDF"'}>${tngIcon('print')}Save as PDF</button>
          <button class="tng-export-btn" data-brief-action="csv" title="Every lead as a spreadsheet">${tngIcon('sheet')}Download CSV</button>
          <button class="tng-export-btn" data-brief-action="copy" title="Copy a plain-text summary to paste into email or Teams">${tngIcon('copy')}Copy Summary</button>
          <button class="tng-export-btn ghost" data-brief-action="new" title="Clear these results and choose another brief">${tngIcon('plus')}New Brief</button>
          <span class="tng-export-confirm" id="tng-brief-confirm"></span>
        </div>
      </div>
      <div class="tng-export-note tng-brief-export-note">${tngIcon('info')}<span>Apollo contacts are included in every export with their full name and email only after you pull them from Apollo with <b>Reveal email</b> (1 Apollo credit each). Contacts named in Steve's brief are always included.</span></div>
      ${main.map((x, i) => leadCardHtml(x.lead, x.pr, i + 1)).join('')}
      ${rest.length ? `<details class="tng-brief-watch" ${brief.watchOpen ? 'open' : ''}><summary>Watchlist, not vetted (${rest.length})</summary>${rest.map(x => leadCardHtml(x.lead, x.pr, '–')).join('')}</details>` : ''}`;
  }

  // report = true builds the same card for the exported report: no buttons, details shown in full.
  function leadCardHtml(lead, pr, pos, report) {
    const v = lead.vetted && lead.vetted.ok ? lead.vetted : null;
    // Chips only for what should catch the eye (good news, a reason to act, a problem);
    // routine facts go on one quiet line underneath.
    const chips = [];
    const quiet = [];
    if (lead.pending) {
      chips.push(pendingChipHtml(lead));
    } else if (v) {
      chips.push(`<span class="tng-tier sm ${v.tier.tier}">TNG ${v.total} · ${v.tier.label}</span>`);
      if (v.crmFound) chips.push('<span class="tng-chip good">In Zoho CRM</span>');
      else quiet.push(v.crm.error ? 'Zoho check failed' : v.crm.configured === false ? 'Zoho not connected' : 'Not in Zoho');
      const sv = v.result.site_visits;
      if (sv && sv.available && sv.total_visits) chips.push(`<span class="tng-chip info">${sv.total_visits} site visit${sv.total_visits === 1 ? '' : 's'}</span>`);
      else quiet.push(!sv || !sv.available ? 'Site visits unavailable' : 'No site visits');
      const inc = v.incidents;
      if (inc && inc.available && inc.recent_count) {
        chips.push(`<span class="tng-chip warn">⚠ ${inc.recent_count} recent incident${inc.recent_count === 1 ? '' : 's'}</span>`);
      }
      if (v.recentEvent) chips.push(`<span class="tng-chip info">📌 ${escapeHtml(recentEventLabels(v.events))}</span>`);
      if (v.result.data_source === 'web_research') quiet.push('Not in Apollo (web profile)');
      if (v.result.cached_at) quiet.push(`Saved lookup from ${fmtSavedDate(v.result.cached_at)}, no credits used`);
    } else if (lead.vetted) {
      chips.push('<span class="tng-chip bad">Vetting failed</span>');
    } else {
      chips.push('<span class="tng-chip">Not vetted</span>');
    }
    const days = daysUntil(lead.deadline_date);
    if (days !== null) {
      if (days < 0) chips.push('<span class="tng-chip bad">Deadline passed</span>');
      else if (days <= 14) chips.push(`<span class="tng-chip ${days <= 7 ? 'warn' : ''}">Due ${escapeHtml(fmtDay(lead.deadline_date))} · ${days === 0 ? 'today' : days + ' day' + (days === 1 ? '' : 's')}</span>`);
      else quiet.push(`Due ${fmtDay(lead.deadline_date)}`);
    }
    if (lead.site_state) {
      if (lead.site_licensed) quiet.push(`Licensed in ${lead.site_state}`);
      else chips.push(`<span class="tng-chip warn">Not licensed: ${escapeHtml(lead.site_state)}</span>`);
    }

    const errorRow = lead.vetted && !lead.vetted.ok
      ? `<div class="tng-brief-error-row">Lookup failed: ${escapeHtml(lead.vetted.error)}${report ? '' : ` <button class="tng-export-btn" data-brief-action="retry" data-key="${lead.key}">Retry</button>`}</div>` : '';
    const notVettedNote = !lead.vetted && !lead.pending && lead.vet_note
      ? `<dt>Not vetted</dt><dd class="muted">${escapeHtml(lead.vet_note)}</dd>` : '';

    return `<article class="tng-brief-lead${v && v.tier.tier === 'spicy' ? ' hot-lead' : ''}">
      <div class="tng-brief-lead-head">
        <div class="tng-brief-pos">${pos}</div>
        <div class="tng-brief-lead-title">
          <div class="tng-brief-org">${escapeHtml(lead.organization)}</div>
          <div class="tng-brief-opp">${escapeHtml([lead.opportunity, lead.lane, lead.division, lead.rmr ? 'RMR: ' + lead.rmr : ''].filter(Boolean).join(' · '))}</div>
        </div>
        <div class="tng-brief-priority"><div class="tng-brief-priority-num">${pr.total.toFixed(1)}</div><div class="tng-brief-priority-label">Priority</div></div>
      </div>
      <div class="tng-brief-chips">${chips.join('')}</div>
      ${quiet.length ? `<div class="tng-brief-quiet">${quiet.map(escapeHtml).join(' · ')}</div>` : ''}
      <div class="tng-brief-why">${escapeHtml(priorityText(pr))}</div>
      ${errorRow}
      <dl class="tng-brief-facts">
        ${lead.signal ? `<dt>Signal</dt><dd>${escapeHtml(lead.signal)}</dd>` : ''}
        ${lead.first_move ? `<dt>First move</dt><dd>${escapeHtml(lead.first_move)}</dd>` : ''}
        ${lead.deadline ? `<dt>Deadline</dt><dd>${escapeHtml(lead.deadline)}</dd>` : ''}
        ${lead.caveats ? `<dt>Watch out</dt><dd class="caveat">${escapeHtml(lead.caveats)}</dd>` : ''}
        ${notVettedNote}
      </dl>
      ${peopleHtml(lead, v, report)}
      ${zohoActionHtml(lead, v, report)}
      ${moreHtml(lead, v, report)}
    </article>`;
  }

  function peopleHtml(lead, v, report) {
    const parts = [];
    const buyers = (lead.buyers || []).filter(b => b.name || b.email);
    if (buyers.length) {
      parts.push('<div class="tng-brief-people-label">From Steve\'s brief</div>');
      buyers.forEach(b => parts.push(`<div class="tng-brief-person">
        <span class="name">${escapeHtml(b.name || b.email)}</span>${b.title ? ' — ' + escapeHtml(b.title) : ''}
        ${b.email ? ` · <a href="mailto:${escapeHtml(b.email)}">${escapeHtml(b.email)}</a>` : ''}${b.phone ? ' · ' + escapeHtml(b.phone) : ''}
      </div>`));
    }
    if (v && v.contacts.length) {
      const fromWeb = v.result.data_source === 'web_research';
      parts.push(`<div class="tng-brief-people-label">${fromWeb ? 'From web research' : 'From Apollo'}</div>`);
      v.contacts.forEach((c, ci) => {
        const name = (c.revealed && c.revealed.full_name) || c.name;
        const revealed = c.revealed
          ? (c.revealed.email ? ` · <span class="email">${escapeHtml(c.revealed.email)}</span>` : ' · <span class="muted">no email on file</span>') : '';
        const revealBtn = !c.revealed && !fromWeb && !report
          ?` <button class="tng-reveal-btn tng-brief-reveal" data-brief-action="reveal" data-key="${lead.key}" data-contact="${ci}">${tngIcon('mail')}Reveal email (1 credit)</button>` : '';
        parts.push(`<div class="tng-brief-person">
          <span class="name">${escapeHtml(name)}</span>${c.title ? ' — ' + escapeHtml(c.title) : ''}
          ${isWebLink(c.linkedin_url) ? ` · <a class="tng-li-inline" href="${escapeHtml(c.linkedin_url)}" target="_blank" rel="noopener">${LINKEDIN_LOGO}LinkedIn</a>` : ''}${revealed}${!c.revealed && !report ? reachChips(c) : ''}${revealBtn}
          ${c.revealError ? `<div class="error">${escapeHtml(c.revealError)}</div>` : ''}
        </div>`);
      });
    }
    const more = v && !report ? morePeopleHtml(v.result.more_people, v.result.company_name || lead.organization,
      i => `data-brief-action="reveal-more" data-key="${lead.key}" data-person="${i}"`, `data-people-key="${lead.key}"`, lead.peopleOpen) : '';
    if (!parts.length && !more) return '';
    return `<div class="tng-brief-people"><div class="tng-brief-people-label" style="color:var(--tng-text-secondary);">Who to contact</div>${parts.join('')}${more}</div>`;
  }

  function moreHtml(lead, v, report) {
    const rows = [];
    const row = (label, html) => { if (html) rows.push(`<dt>${label}</dt><dd>${html}</dd>`); };
    row('Why TNG', escapeHtml(lead.why_tng));
    row('Value', escapeHtml(lead.value));
    row('Location', escapeHtml(lead.site_location));
    row("Steve's score", escapeHtml([lead.steve_score ? String(lead.steve_score) : '', lead.score_parts].filter(Boolean).join(' · ')));
    if (v) {
      const r = v.result;
      row('Company', escapeHtml([r.company_name, r.industry, r.employee_count ? Number(r.employee_count).toLocaleString() + ' employees' : '',
        r.estimated_revenue, r.headquarters].filter(Boolean).join(' · ')));
      row('Website', escapeHtml(lead.domain));
      const matched = SIGNALS.filter(s => v.signalIds.includes(s.id) && s.pts > 0).map(s => `${s.label} (+${s.pts})`);
      row('TNG signals', escapeHtml(matched.join(' · ')));
      if (v.crmFound) row('Zoho CRM', crmRecordsHtml(v.crm));
      const inc = v.incidents;
      if (inc && inc.available && inc.incidents.length) {
        row('Incidents', '<div class="tng-incidents">' + incidentsListHtml(inc.incidents)
          + '<div class="tng-incident-note">In the news; use for background, not as an opener.</div></div>');
      } else if (inc && inc.available) {
        row('Incidents', '<span class="muted">None reported in the last 24 months</span>');
      } else if (inc) {
        row('Incidents', '<span class="muted">News check unavailable</span>');
      }
      const ev = v.events;
      if (ev && ev.available && ev.events.length) {
        row('Trigger events', '<div class="tng-incidents">' + eventsListHtml(ev.events) + '</div>');
      } else if (ev && ev.available) {
        row('Trigger events', '<span class="muted">None found in the last 12 months</span>');
      } else if (ev) {
        row('Trigger events', '<span class="muted">News check unavailable</span>');
      }
      const sv = r.site_visits;
      if (sv && sv.available && sv.total_visits) {
        const pageLabels = Object.keys(v.visits.pages).map(id => SIGNALS.find(s => s.id === id).label);
        row('Site visits', visitsSummaryHtml(sv, v.visits.other)
          + (pageLabels.length ? `<br><strong>Pages:</strong> ${escapeHtml(pageLabels.join(', '))}` : ''));
      }
    } else if (lead.domain) {
      row('Website', escapeHtml(lead.domain));
    }
    const sources = (lead.sources || []).filter(s => isWebLink(s.url));
    row('Sources', sources.map(s => `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener">${escapeHtml(s.label || s.url)}</a>`).join(' · '));
    const draft = lead.draft ? `<div class="tng-brief-people-label" style="margin:16px 0 8px;">Steve's draft email</div><pre class="tng-brief-draft">${escapeHtml(lead.draft)}</pre>` : '';
    if (report) {
      if (!rows.length && !draft) return '';
      return `<div class="tng-brief-detail"><div class="tng-brief-people-label">Details</div><dl class="tng-brief-facts">${rows.join('')}</dl>${draft}</div>`;
    }
    const open = lead.domain
      ? `<div class="tng-brief-actions"><button class="tng-export-btn" data-brief-action="open" data-key="${lead.key}">Open in Single Lead</button></div>` : '';
    if (!rows.length && !draft && !open) return '';
    return `<details class="tng-brief-more" data-key="${lead.key}" ${lead.moreOpen ? 'open' : ''}>
      <summary>More detail</summary>
      <dl class="tng-brief-facts">${rows.join('')}</dl>
      ${draft}${open}
    </details>`;
  }

  async function revealBriefContact(lead, ci, btn) {
    const c = lead.vetted.contacts[ci];
    if (!window.confirm(revealPrompt(c))) return;
    btn.disabled = true;
    btn.textContent = 'Revealing...';
    c.revealError = '';
    try {
      const payload = c.apollo_id
        ? { apollo_id: c.apollo_id }
        : { first_name: (c.name || '').split(' ')[0], domain: lead.domain, title: c.title };
      const data = await postJson(REVEAL_URL, payload, 60000);
      if (data.revealed) c.revealed = { full_name: data.full_name || '', email: data.email || '' };
      else c.revealError = data.message || 'Could not confidently match this contact for reveal.';
    } catch (err) {
      c.revealError = 'Reveal failed: ' + err.message;
    }
    renderBriefResults();
  }

  // ----- Exports -----
  function contactLine(c) {
    const name = (c.revealed && c.revealed.full_name) || c.name;
    return [name, c.title, c.revealed && c.revealed.email, c.linkedin_url].filter(Boolean).join(', ');
  }

  function briefSummaryText() {
    const { main } = orderedBriefLeads();
    let text = `TNG HUNTER BRIEF — ${brief.title}${brief.date ? ' (' + fmtDay(brief.date, true) + ')' : ''}\nVetted ${new Date().toLocaleString()}\n`;
    main.forEach(({ lead, pr }, i) => {
      const v = lead.vetted && lead.vetted.ok ? lead.vetted : null;
      text += `\n${i + 1}. ${lead.organization} — Priority ${pr.total.toFixed(1)} (${priorityText(pr)})\n`;
      if (lead.opportunity) text += `   ${lead.opportunity}\n`;
      const facts = [];
      if (v) {
        facts.push(`TNG ${v.total} ${v.tier.label.replace(/\s*🌶️/, '')}`);
        facts.push(v.crmFound ? 'In Zoho CRM' : 'Not in Zoho');
        const sv = v.result.site_visits;
        if (sv && sv.available) facts.push(`${sv.total_visits || 0} site visits`);
        if (v.recentIncident) facts.push(`${v.incidents.recent_count} recent security incident${v.incidents.recent_count === 1 ? '' : 's'}`);
        if (v.recentEvent) facts.push(`Trigger: ${recentEventLabels(v.events)} (pitch: ${eventServices(v.events.events)})`);
      } else {
        facts.push('Not vetted');
      }
      if (lead.deadline) facts.push('Deadline: ' + lead.deadline);
      text += `   ${facts.join(' · ')}\n`;
      if (v && v.incidents && v.incidents.available && v.incidents.incidents.length) {
        text += `   Incidents (news, background only):\n${incidentsText(v.incidents.incidents, '     - ')}`;
      }
      if (v && v.events && v.events.available && v.events.events.length) {
        text += `   Trigger events (news):\n${eventsText(v.events.events, '     - ')}`;
      }
      if (lead.first_move) text += `   First move: ${lead.first_move}\n`;
      (lead.buyers || []).filter(b => b.name || b.email).forEach(b => {
        text += `   Contact (brief): ${[b.name, b.title, b.email, b.phone].filter(Boolean).join(', ')}\n`;
      });
      if (v) v.contacts.slice(0, 2).forEach(c => { text += `   Contact (Apollo): ${contactLine(c)}\n`; });
      if (lead.caveats) text += `   Watch out: ${lead.caveats}\n`;
    });
    return text;
  }

  function briefCsv() {
    const { main, rest } = orderedBriefLeads();
    const headers = [
      'Rank', 'Priority', 'Priority Reasons', 'Organization', 'Website', 'Section', 'Steve Score', 'Score Breakdown',
      'TNG Score', 'TNG Tier', 'Lane', 'Division', 'RMR', 'Opportunity', 'Signal', 'First Move', 'Why TNG',
      'Deadline', 'Deadline Date', 'Value', 'Location', 'Licensed', 'Watch Out', 'Zoho CRM', 'Site Visits',
      'Pages Visited', 'Security Incidents', 'Trigger Events', 'Brief Contacts', 'Apollo Contact 1', 'Apollo Contact 2', 'Apollo Contact 3',
      'Industry', 'Employees', 'Revenue', 'Headquarters', 'Vetting', 'Sources',
    ];
    const rows = main.concat(rest).map(({ lead, pr }, i) => {
      const v = lead.vetted && lead.vetted.ok ? lead.vetted : null;
      const r = v ? v.result : {};
      const sv = v && r.site_visits;
      const contacts = v ? v.contacts : [];
      return [
        i < main.length ? i + 1 : '', pr.total.toFixed(1), priorityText(pr), lead.organization, lead.domain, lead.section,
        lead.steve_score || '', lead.score_parts, v ? v.total : '', v ? v.tier.label.replace(/\s*🌶️/, '') : '',
        lead.lane, lead.division, lead.rmr, lead.opportunity, lead.signal, lead.first_move, lead.why_tng,
        lead.deadline, lead.deadline_date, lead.value, lead.site_location,
        lead.site_state ? (lead.site_licensed ? 'Yes' : 'No') + ' (' + lead.site_state + ')' : '', lead.caveats,
        v ? (v.crmFound ? 'Yes' : v.crm.error ? 'Check failed' : 'No') : '',
        sv && sv.available ? sv.total_visits || 0 : '',
        v ? Object.keys(v.visits.pages).map(id => SIGNALS.find(s => s.id === id).label).join('; ') : '',
        v ? incidentsCsv(v.incidents) : '',
        v ? eventsCsv(v.events) : '',
        (lead.buyers || []).filter(b => b.name || b.email).map(b => [b.name, b.title, b.email, b.phone].filter(Boolean).join(', ')).join(' | '),
        contacts[0] ? contactLine(contacts[0]) : '', contacts[1] ? contactLine(contacts[1]) : '', contacts[2] ? contactLine(contacts[2]) : '',
        r.industry || '', r.employee_count || '', r.estimated_revenue || '', r.headquarters || '',
        v ? 'Vetted' + (r.data_source === 'web_research' ? ' (web profile, not in Apollo)' : '')
          : lead.vetted ? 'Failed: ' + lead.vetted.error : 'Not vetted' + (lead.vet_note ? ': ' + lead.vet_note : ''),
        (lead.sources || []).map(s => s.url).join(' '),
      ];
    });
    const name = (brief.date || brief.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    downloadCsv(`tng-hunter-brief-${name}.csv`, headers, rows);
    showExportConfirm('CSV downloaded', 'tng-brief-confirm');
  }

  // ----- Report: the ranked results as a standalone HTML page (and, printed, a PDF) -----
  // A still copy: the tool's own stylesheet and logo, no scripts, no access code, no
  // buttons. Safe to email or post; it contains contact details, so it stays internal.
  const REPORT_CSS = `
  .tng-lead-scorer.tng-report { max-width: 880px; padding-top: 36px; }
  .tng-report *, .tng-report *::before, .tng-report *::after { animation: none !important; transition: none !important; }
  .tng-report .tng-brief-lead.hot-lead { box-shadow: 0 0 0 1px rgba(198,40,40,0.45), 0 12px 40px rgba(198,40,40,0.18); }
  .tng-report .tng-tier.spicy { background-position: 30% 0; }
  .tng-report .tng-brief-detail { margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--tng-hairline); }
  .tng-report .tng-brief-detail > .tng-brief-people-label { color: var(--tng-text-secondary); }
  .tng-report-meta { font-size: 15px; line-height: 1.6; color: var(--tng-text-secondary); margin: 0 0 28px; }
  .tng-report-meta strong { color: var(--tng-white); font-weight: 600; }

  /* Executive summary: the first page, before the lead-by-lead details. */
  .tng-exec-bottom { padding: 16px 20px; margin-bottom: 20px; background: rgba(21,101,192,0.10); border-left: 3px solid var(--tng-intel-text); border-radius: var(--tng-radius-sm); font-size: 16px; line-height: 1.55; color: var(--tng-text); }
  .tng-exec-bottom b { color: var(--tng-white); }
  .tng-exec-kpis { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-bottom: 28px; }
  .tng-exec-kpi { padding: 14px 16px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-md); }
  .tng-exec-kpi .num { font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1; color: var(--tng-white); font-variant-numeric: tabular-nums; }
  .tng-exec-kpi .label { font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tng-text-tertiary); margin-top: 4px; }
  .tng-exec-h { font-size: 13px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--tng-text-secondary); margin: 0 0 12px; }
  .tng-exec-item { padding: 16px 18px; margin-bottom: 10px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-lg); }
  .tng-exec-item-head { display: flex; align-items: flex-start; gap: 12px; }
  .tng-exec-item-head .tng-brief-pos { margin-top: 1px; }
  .tng-exec-item-title { flex: 1; min-width: 0; }
  .tng-exec-org { font-size: 17px; font-weight: 700; color: var(--tng-white); line-height: 1.3; }
  .tng-exec-opp { font-size: 13px; color: var(--tng-text-secondary); margin-top: 2px; line-height: 1.45; }
  .tng-exec-pr { text-align: right; white-space: nowrap; }
  .tng-exec-pr .num { font-size: 22px; font-weight: 700; color: var(--tng-white); line-height: 1; font-variant-numeric: tabular-nums; }
  .tng-exec-pr .tng-tier.sm { margin-top: 6px; font-size: 11px; padding: 3px 9px; }
  .tng-exec-facts { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 5px 14px; margin: 12px 0 0; font-size: 14px; line-height: 1.5; }
  .tng-exec-facts dt { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--tng-text-tertiary); padding-top: 3px; }
  .tng-exec-facts dd { margin: 0; color: #D1D1D6; overflow-wrap: anywhere; }
  .tng-exec-facts dd.caveat { color: #FFC977; }
  .tng-exec-more { font-size: 13px; color: var(--tng-text-tertiary); margin: 4px 0 0; }
  .tng-exec-cols { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-top: 24px; }
  .tng-exec-box { padding: 16px 18px; background: var(--tng-surface); border: 1px solid var(--tng-hairline); border-radius: var(--tng-radius-lg); }
  .tng-exec-box ul { margin: 0; padding-left: 18px; font-size: 14px; line-height: 1.55; color: #D1D1D6; }
  .tng-exec-box li + li { margin-top: 6px; }
  .tng-exec-box b { color: var(--tng-white); font-weight: 600; }
  .tng-exec-box .none { font-size: 14px; color: var(--tng-text-tertiary); }
  .tng-exec-appendix { margin-top: 40px; padding-top: 28px; border-top: 1px solid var(--tng-hairline-strong); }
  .tng-exec-appendix > h2 { font-size: 22px; font-weight: 700; color: var(--tng-white); margin: 0 0 6px; }
  @media (max-width: 640px) {
    .tng-exec-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .tng-exec-cols { grid-template-columns: minmax(0, 1fr); }
    .tng-exec-facts { grid-template-columns: minmax(0, 1fr); gap: 2px; }
  }
  /* Full-bleed black pages: no page margin (it prints grey); the report's own padding
     repeats on every page instead (box-decoration-break: clone). */
  @page { size: letter; margin: 0; }
  @media print {
    html, body { background: #000000 !important; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    .tng-lead-scorer.tng-report {
      max-width: none;
      padding: 0.45in 0.5in;
      -webkit-box-decoration-break: clone;
      box-decoration-break: clone;
      font-size: 13px;
    }
    /* Long leads may run onto the next page, but never split a heading, contact box or row. */
    .tng-report .tng-brief-lead-head { break-inside: avoid; break-after: avoid; }
    .tng-report .tng-brief-chips, .tng-report .tng-brief-people { break-inside: avoid; }
    .tng-report .tng-logo-banner { padding-bottom: 20px; }
    .tng-report .tng-logo-img { height: 34px; }
    .tng-report .tng-header { padding-bottom: 14px; margin-bottom: 14px; }
    .tng-report .tng-header h1 { font-size: 26px; }
    .tng-report-meta { font-size: 13px; margin-bottom: 18px; }
    .tng-report .tng-brief-lead { padding: 16px 18px; margin-bottom: 10px; }
    .tng-report .tng-brief-org { font-size: 17px; }
    .tng-report .tng-brief-opp, .tng-report .tng-chip, .tng-report .tng-tier.sm { font-size: 12px; }
    .tng-report .tng-brief-priority-num { font-size: 24px; }
    .tng-report .tng-brief-facts { font-size: 13px; grid-template-columns: 100px minmax(0, 1fr); gap: 6px 14px; }
    .tng-report .tng-brief-facts dt { font-size: 11px; }
    .tng-report .tng-brief-people { font-size: 12.5px; padding: 10px 14px; }
    .tng-report .tng-brief-draft { font-size: 12px; }
    .tng-report .tng-footnote { font-size: 10.5px; padding-bottom: 0; }
    .tng-exec-bottom { font-size: 13.5px; padding: 12px 16px; margin-bottom: 14px; }
    .tng-exec-kpis { gap: 8px; margin-bottom: 18px; }
    .tng-exec-kpi { padding: 10px 12px; }
    .tng-exec-kpi .num { font-size: 22px; }
    .tng-exec-kpi .label { font-size: 10px; }
    .tng-exec-item { padding: 12px 14px; margin-bottom: 8px; break-inside: avoid; }
    .tng-exec-org { font-size: 15px; }
    .tng-exec-facts { font-size: 12px; grid-template-columns: 84px minmax(0, 1fr); gap: 3px 12px; }
    .tng-exec-facts dt { font-size: 10px; }
    .tng-exec-cols { margin-top: 14px; break-inside: avoid; }
    .tng-exec-box { padding: 12px 14px; }
    .tng-exec-box ul, .tng-exec-box .none { font-size: 12px; }
    /* The lead-by-lead details start on a fresh page after the summary. */
    .tng-exec-appendix { break-before: page; margin-top: 0; padding-top: 0; border-top: none; }
  }`;

  function briefCountsText(main) {
    const vetted = brief.leads.filter(l => l.vetted && l.vetted.ok);
    const inCrm = vetted.filter(l => l.vetted.crmFound).length;
    const visited = vetted.filter(l => {
      const sv = l.vetted.result.site_visits;
      return sv && sv.available && sv.total_visits;
    }).length;
    const withIncidents = vetted.filter(l => l.vetted.recentIncident).length;
    const withEvents = vetted.filter(l => l.vetted.recentEvent).length;
    return `${main.length} leads ranked · ${vetted.length} vetted · ${inCrm} in Zoho CRM · ${visited} visited tngdefense.com`
      + (withIncidents ? ` · ${withIncidents} with recent security incidents` : '')
      + (withEvents ? ` · ${withEvents} with trigger events` : '');
  }

  // "Daily Brief, Thursday, Oct 29, 2026 · Thu, Oct 29, 2026" says the date twice; show it once.
  function briefHeading() {
    if (!brief.date || brief.title.includes(fmtDay(brief.date))) return brief.title;
    return `${brief.title} · ${fmtDay(brief.date, true)}`;
  }

  const briefFileStem = () => (brief.date || brief.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const reportTitle = () => `TNG Executive Report ${brief.date || brief.title}`;

  // ----- Executive summary: page one of the report, built only from what's on screen -----
  const EXEC_TOP = 5;
  const HOT_TIERS = ['spicy', 'heating_up'];
  const vettedOf = lead => lead.vetted && lead.vetted.ok ? lead.vetted : null;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  // Who to call first: a named buyer from Steve's brief, else Apollo's security contact, else its first contact.
  function primaryContact(lead) {
    const b = (lead.buyers || []).find(x => x.name);
    if (b) return [b.name, b.title, b.email, b.phone].filter(Boolean).join(' · ') + ' (from brief)';
    const v = vettedOf(lead);
    if (!v || !v.contacts.length) return '';
    const c = v.contacts.find(x => SECURITY_TITLE.test(x.title || '')) || v.contacts[0];
    const name = (c.revealed && c.revealed.full_name) || c.name;
    return [name, c.title, c.revealed && c.revealed.email].filter(Boolean).join(' · ') + ' (Apollo)';
  }

  // "in Zoho CRM, recent security incident": the findings that raised this lead's priority.
  const liftReasons = pr => pr.reasons.filter(r => r.pts > 0).map(r => r.text);
  // Brief fields are sometimes fragments ("New ER tower"); end each with a period before joining.
  const asSentence = s => { const t = String(s || '').trim(); return t && !/[.!?]$/.test(t) ? t + '.' : t; };

  // One top opportunity's facts as plain-text [label, text, isCaveat] rows: shared by the PDF page and the Word doc.
  function execRows({ lead, pr }) {
    const v = vettedOf(lead);
    const days = daysUntil(lead.deadline_date);
    const rows = [];
    const why = [asSentence(lead.signal), liftReasons(pr).length ? 'Lookups found: ' + liftReasons(pr).join(', ') + '.' : ''].filter(Boolean).join(' ');
    if (why) rows.push(['Why now', why]);
    const pitch = [asSentence(lead.why_tng), v && v.recentEvent ? `Trigger events point to ${eventServices(v.events.events)}.` : ''].filter(Boolean).join(' ');
    if (pitch) rows.push(['Pitch', pitch]);
    if (lead.first_move) rows.push(['Next step', lead.first_move]);
    const contact = primaryContact(lead);
    if (contact) rows.push(['Contact', contact]);
    const terms = [lead.value, lead.rmr ? 'RMR: ' + lead.rmr : '',
      days !== null ? (days < 0 ? 'Deadline passed' : `Due ${fmtDay(lead.deadline_date)} (${days === 0 ? 'today' : plural(days, 'day')})`) : lead.deadline].filter(Boolean);
    if (terms.length) rows.push(['Value / due', terms.join(' · ')]);
    if (lead.caveats) rows.push(['Watch out', lead.caveats, true]);
    return rows;
  }

  const execSubtitle = lead => [lead.opportunity, lead.lane, lead.site_location].filter(Boolean).join(' · ');

  // Everything the executive summary says, as plain text. Lines that start with an
  // organization are { org, text } so each format can bold the name its own way.
  function execData(main) {
    const vetted = main.filter(x => vettedOf(x.lead));
    const hot = vetted.filter(x => HOT_TIERS.includes(vettedOf(x.lead).tier.tier));
    const inCrm = vetted.filter(x => vettedOf(x.lead).crmFound);
    const visited = vetted.filter(x => { const sv = vettedOf(x.lead).result.site_visits; return sv && sv.available && sv.total_visits; });
    const newsHits = vetted.filter(x => vettedOf(x.lead).recentIncident || vettedOf(x.lead).recentEvent);
    const dueSoon = main.filter(x => { const d = daysUntil(x.lead.deadline_date); return d !== null && d >= 0 && d <= 14; });
    const kpis = [
      [main.length, 'Leads ranked'], [hot.length, 'Hot leads (Heating Up or Spicy)'], [inCrm.length, 'Already in Zoho CRM'],
      [visited.length, 'Visited tngdefense.com'], [newsHits.length, 'In the news (incidents or triggers)'], [dueSoon.length, 'Due in the next 14 days'],
    ];

    // The bottom line, in plain words, from the top of the ranking.
    const top = main.slice(0, EXEC_TOP);
    const first = top[0];
    const firstWhy = first ? liftReasons(first.pr) : [];
    const bottom = first
      ? {
          lead: `Start with ${first.lead.organization}`,
          text: ` (priority ${first.pr.total.toFixed(1)}${firstWhy.length ? ': ' + firstWhy.join(', ') : ''}).`
            + (hot.length ? ` ${plural(hot.length, 'lead')} scored Heating Up or Spicy on TNG's own score.` : '')
            + (inCrm.length ? ` ${inCrm.length} ${inCrm.length === 1 ? 'is' : 'are'} already in Zoho, so check the account owner before reaching out.` : '')
            + (dueSoon.length ? ` ${plural(dueSoon.length, 'deadline')} fall${dueSoon.length === 1 ? 's' : ''} in the next two weeks.` : ''),
        }
      : { lead: '', text: 'No leads were ranked in this brief.' };

    // Act this week: deadlines inside 7 days, and anyone who looked at the Contact or Request Services page.
    const act = [];
    main.forEach(({ lead }) => {
      const d = daysUntil(lead.deadline_date);
      if (d !== null && d >= 0 && d <= 7) act.push({ d, org: lead.organization, text: `due ${fmtDay(lead.deadline_date)} (${d === 0 ? 'today' : plural(d, 'day')})` });
    });
    act.sort((a, b) => a.d - b.d);
    vetted.forEach(({ lead }) => {
      const pages = Object.keys(vettedOf(lead).visits.pages).map(id => SIGNALS.find(s => s.id === id));
      if (pages.some(s => s.pageType === 'high_intent')) act.push({ org: lead.organization, text: 'visited our Contact / Request Services page' });
    });

    // Watch outs: anything that blocks or weakens a lead.
    const watch = [];
    main.forEach(({ lead }) => {
      if (lead.site_state && lead.site_licensed === false) watch.push({ org: lead.organization, text: `work is in ${lead.site_state}, outside our licensed states` });
      const d = daysUntil(lead.deadline_date);
      if (d !== null && d < 0) watch.push({ org: lead.organization, text: 'deadline already passed' });
      if (lead.vetted && !lead.vetted.ok) watch.push({ org: lead.organization, text: 'lookups failed, not vetted' });
    });

    return {
      kpis, bottom, top, act, watch, more: main.length - top.length,
      actNone: 'No deadlines in the next 7 days and no Contact page visits.',
      watchNone: 'Nothing blocking found: no unlicensed states, passed deadlines or failed lookups.',
    };
  }

  function execSummaryHtml(main) {
    const d = execData(main);
    const item = (x, pos) => {
      const v = vettedOf(x.lead);
      const tier = v ? `<div><span class="tng-tier sm ${v.tier.tier}">TNG ${v.total} · ${v.tier.label}</span></div>` : '';
      return `<div class="tng-exec-item">
        <div class="tng-exec-item-head">
          <div class="tng-brief-pos">${pos}</div>
          <div class="tng-exec-item-title">
            <div class="tng-exec-org">${escapeHtml(x.lead.organization)}</div>
            <div class="tng-exec-opp">${escapeHtml(execSubtitle(x.lead))}</div>
          </div>
          <div class="tng-exec-pr"><div class="num">${x.pr.total.toFixed(1)}</div>${tier}</div>
        </div>
        <dl class="tng-exec-facts">${execRows(x).map(([dt, dd, caveat]) => `<dt>${dt}</dt><dd${caveat ? ' class="caveat"' : ''}>${escapeHtml(dd)}</dd>`).join('')}</dl>
      </div>`;
    };
    const list = (items, none) => items.length
      ? `<ul>${items.map(i => `<li><b>${escapeHtml(i.org)}</b>: ${escapeHtml(i.text)}</li>`).join('')}</ul>`
      : `<div class="none">${none}</div>`;
    return `
      <div class="tng-exec-bottom">${d.bottom.lead ? `<b>${escapeHtml(d.bottom.lead)}</b>` : ''}${escapeHtml(d.bottom.text)}</div>
      <div class="tng-exec-kpis">${d.kpis.map(([n, label]) => `<div class="tng-exec-kpi"><div class="num">${n}</div><div class="label">${label}</div></div>`).join('')}</div>
      <div class="tng-exec-h">Top ${d.top.length} opportunities</div>
      ${d.top.map((x, i) => item(x, i + 1)).join('')}
      ${d.more > 0 ? `<div class="tng-exec-more">${plural(d.more, 'more ranked lead')} in the details below.</div>` : ''}
      <div class="tng-exec-cols">
        <div class="tng-exec-box"><div class="tng-exec-h">Act this week</div>${list(d.act, d.actNone)}</div>
        <div class="tng-exec-box"><div class="tng-exec-h">Watch outs</div>${list(d.watch, d.watchNone)}</div>
      </div>`;
  }

  function briefReportHtml() {
    const { main, rest } = orderedBriefLeads();
    const toolCss = document.getElementById('tng-styles').textContent;
    const logo = document.querySelector('.tng-logo-img').outerHTML;
    const footnote = document.querySelector('#tng-mode-brief .tng-footnote').innerHTML;
    const version = document.querySelector('.tng-version-line').textContent.split('·')[0].trim();
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(reportTitle())}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${toolCss}${REPORT_CSS}</style>
</head>
<body>
<div class="tng-lead-scorer tng-report">
  <div class="tng-logo-banner">${logo}</div>
  <div class="tng-header">
    <div class="tng-header-title-block">
      <h1>Executive Report</h1>
      <div class="tng-version-line">Client Hunter Brief · ${escapeHtml(briefHeading())}</div>
    </div>
    <span class="tng-header-note">Prepared ${escapeHtml(new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))}<br>Internal: contains contact details</span>
  </div>
  ${execSummaryHtml(main)}
  <div class="tng-exec-appendix">
    <h2>Lead details</h2>
    <div class="tng-report-meta"><strong>${escapeHtml(briefCountsText(main))}</strong><br>Ranked best first. Priority starts from Steve's score and moves with what the lookups found (see the note at the end).</div>
    ${main.map((x, i) => leadCardHtml(x.lead, x.pr, i + 1, true)).join('')}
    ${rest.length ? `<div class="tng-section-label" style="margin-top:32px;">Watchlist, not vetted</div>${rest.map(x => leadCardHtml(x.lead, x.pr, '–', true)).join('')}` : ''}
  </div>
  <div class="tng-footnote">${footnote}<br><br>${escapeHtml(version)} · Generated by the TNG Opportunity Score tool.</div>
</div>
</body>
</html>`;
  }

  // ----- Executive Report as a Word document -----
  // Built in the browser with the docx library, loaded only when the button is clicked.
  // It's pinned to one version and checked against its hash, so a changed file is refused.
  const DOCX_LIB = {
    src: 'https://cdn.jsdelivr.net/npm/docx@9.8.0/dist/index.iife.js',
    integrity: 'sha384-lCKTCWZeluOZCSCIWVBq+0SitTe1BSFfuOT35fIwxeY1mb4SI1pdD4FtzMngrpe2',
  };
  let docxLoading = null;
  function loadDocx() {
    if (window.docx) return Promise.resolve(window.docx);
    if (!docxLoading) {
      docxLoading = new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = DOCX_LIB.src;
        s.integrity = DOCX_LIB.integrity;
        s.crossOrigin = 'anonymous';
        s.onload = () => window.docx ? resolve(window.docx) : reject(new Error('the Word library loaded empty'));
        s.onerror = () => { docxLoading = null; s.remove(); reject(new Error("couldn't load the Word library. Check your internet connection")); };
        document.head.appendChild(s);
      });
    }
    return docxLoading;
  }

  // The white TNG logo as a PNG for the black title band (Word can't use the page's inline SVG).
  function logoPng() {
    const svg = document.querySelector('.tng-logo-img').cloneNode(true);
    svg.setAttribute('width', '864');
    svg.setAttribute('height', '155');
    const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(svg));
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 864;
        canvas.height = 155;
        canvas.getContext('2d').drawImage(img, 0, 0, 864, 155);
        canvas.toBlob(b => b ? b.arrayBuffer().then(resolve, reject) : reject(new Error('logo')), 'image/png');
      };
      img.onerror = () => reject(new Error('logo'));
      img.src = src;
    });
  }

  // TNG's document palette: white page, black type, #333 rules, light grey panels; color only for status.
  const WORD = { black: '000000', text: '1A1A1A', grey: '666666', mid: '888888', light: 'A0A0A0', rule: '333333', panel: 'F5F5F5', white: 'FFFFFF', spicy: 'C62828', warm: 'E65100' };
  const WORD_FONT = 'Calibri';
  const WORD_WIDTH = 10080; // letter page, 0.75" margins, in twentieths of a point

  async function briefDocxBlob() {
    const D = await loadDocx();
    const logo = await logoPng().catch(() => null);
    const { main } = orderedBriefLeads();
    const d = execData(main);

    const run = (text, o = {}) => new D.TextRun({ text: String(text), font: WORD_FONT, size: 21, color: WORD.text, ...o });
    const para = (children, o = {}) => new D.Paragraph({ children, spacing: { after: 60 }, ...o });
    const none = { style: D.BorderStyle.NONE, size: 0, color: WORD.white };
    const noBorders = { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none };
    const cell = (children, o = {}) => new D.TableCell({ children, margins: { top: 100, bottom: 100, left: 160, right: 160 }, ...o });
    const shade = fill => ({ fill, type: D.ShadingType.CLEAR, color: 'auto' });
    const table = (rows, widths, o = {}) => new D.Table({
      rows, columnWidths: widths, width: { size: WORD_WIDTH, type: D.WidthType.DXA }, layout: D.TableLayoutType.FIXED, borders: noBorders, ...o,
    });
    const heading = text => para([run(text.toUpperCase(), { bold: true, size: 20, color: WORD.black, characterSpacing: 30 })], {
      spacing: { before: 320, after: 140 }, keepNext: true,
      border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: WORD.rule, space: 4 } },
    });
    const tierColor = t => t === 'spicy' ? WORD.spicy : t === 'heating_up' ? WORD.warm : WORD.grey;
    const tierText = v => `TNG ${v.total} · ${v.tier.label.replace(/\s*🌶️/, '')}`;
    const orgLine = (i, opts) => [run(i.org, { bold: true, ...opts }), run(': ' + i.text, opts)];
    const bullets = (items, emptyText) => items.length
      ? items.map(i => para(orgLine(i), { bullet: { level: 0 } }))
      : [para([run(emptyText, { color: WORD.grey })])];

    const children = [];

    // Title band: white logo and title on black, the TNG signature.
    const band = [];
    if (logo) band.push(para([new D.ImageRun({ type: 'png', data: logo, transformation: { width: 230, height: 41 } })], { spacing: { after: 200 } }));
    else band.push(para([run('THE NORTH GROUP', { bold: true, color: WORD.white, characterSpacing: 40 })], { spacing: { after: 200 } }));
    band.push(para([run('EXECUTIVE REPORT', { bold: true, size: 40, color: WORD.white, characterSpacing: 40 })], { spacing: { after: 40 } }));
    band.push(para([run('Client Hunter Brief · ' + briefHeading(), { size: 22, color: WORD.light })], { spacing: { after: 40 } }));
    band.push(para([run(`Prepared ${new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} · Internal: contains contact details`, { size: 17, color: WORD.mid })], { spacing: { after: 0 } }));
    children.push(table([new D.TableRow({ children: [cell(band, { shading: shade(WORD.black), margins: { top: 360, bottom: 360, left: 400, right: 400 } })] })], [WORD_WIDTH]));

    // Bottom line.
    children.push(heading('Bottom line'));
    children.push(table([new D.TableRow({ children: [cell([para([
      ...(d.bottom.lead ? [run(d.bottom.lead, { bold: true, color: WORD.black })] : []), run(d.bottom.text),
    ], { spacing: { after: 0, line: 300 } })], {
      shading: shade(WORD.panel), margins: { top: 180, bottom: 180, left: 240, right: 240 },
      borders: { top: none, bottom: none, right: none, left: { style: D.BorderStyle.SINGLE, size: 24, color: WORD.black } },
    })] })], [WORD_WIDTH]));

    // At a glance: six counts in two rows of three, separated by white gutters.
    children.push(heading('At a glance'));
    const gutter = { style: D.BorderStyle.SINGLE, size: 24, color: WORD.white };
    const kpiRows = [d.kpis.slice(0, 3), d.kpis.slice(3)].map(group => new D.TableRow({ cantSplit: true, children: group.map(([n, label]) => cell([
      para([run(n, { bold: true, size: 40, color: WORD.black })], { spacing: { after: 0 } }),
      para([run(label.toUpperCase(), { size: 15, color: WORD.grey, characterSpacing: 10 })], { spacing: { after: 0 } }),
    ], { shading: shade(WORD.panel), borders: { top: gutter, bottom: gutter, left: gutter, right: gutter }, margins: { top: 140, bottom: 140, left: 200, right: 200 } })) }));
    children.push(table(kpiRows, [3360, 3360, 3360]));

    // Top opportunities: a heading row (rank, name, priority, TNG tier) and a facts table each.
    children.push(heading(`Top ${d.top.length} opportunities`));
    d.top.forEach((x, i) => {
      const v = vettedOf(x.lead);
      // keepNext on every paragraph but the last fact holds each opportunity on one page.
      const rightOpts = { alignment: D.AlignmentType.RIGHT, spacing: { after: 0 }, keepNext: true };
      const right = [para([run(x.pr.total.toFixed(1), { bold: true, size: 30, color: WORD.black })], rightOpts),
        para([run('PRIORITY', { size: 14, color: WORD.grey, characterSpacing: 20 })], rightOpts)];
      if (v) right.push(para([run(tierText(v), { bold: true, size: 16, color: tierColor(v.tier.tier) })], rightOpts));
      children.push(table([new D.TableRow({ cantSplit: true, children: [
        cell([
          para([run(`${i + 1}.  `, { bold: true, size: 26, color: WORD.grey }), run(x.lead.organization, { bold: true, size: 26, color: WORD.black })], { spacing: { after: 20 }, keepNext: true }),
          para([run(execSubtitle(x.lead), { size: 19, color: WORD.grey })], { spacing: { after: 0 }, keepNext: true }),
        ], { margins: { top: 60, bottom: 60, left: 0, right: 120 } }),
        cell(right, { margins: { top: 60, bottom: 60, left: 120, right: 0 } }),
      ] })], [7680, 2400], { borders: { ...noBorders, top: { style: D.BorderStyle.SINGLE, size: 6, color: 'D0D0D0' } } }));
      const facts = execRows(x);
      children.push(table(facts.map(([label, text, caveat], r) => {
        const opts = { spacing: { after: 0 }, keepNext: r < facts.length - 1 };
        return new D.TableRow({ cantSplit: true, children: [
          cell([para([run(label.toUpperCase(), { bold: true, size: 15, color: WORD.grey, characterSpacing: 10 })], opts)], { margins: { top: 50, bottom: 50, left: 0, right: 120 } }),
          cell([para([run(text, { size: 20, color: caveat ? WORD.warm : WORD.text })], opts)], { margins: { top: 50, bottom: 50, left: 120, right: 0 } }),
        ] });
      }), [1700, 8380]));
      children.push(para([], { spacing: { after: 160 } }));
    });
    if (d.more > 0) children.push(para([run(`${plural(d.more, 'more ranked lead')} in the table below.`, { color: WORD.grey, size: 19 })]));

    children.push(heading('Act this week'));
    children.push(...bullets(d.act, d.actNone));
    children.push(heading('Watch outs'));
    children.push(...bullets(d.watch, d.watchNone));

    // Every ranked lead in one table, best first.
    children.push(heading('All ranked leads'));
    const th = text => cell([para([run(text.toUpperCase(), { bold: true, size: 15, color: WORD.white, characterSpacing: 10 })], { spacing: { after: 0 } })], { shading: shade(WORD.black), margins: { top: 80, bottom: 80, left: 100, right: 100 } });
    const td = (text, fill, o = {}) => cell([para([run(text, { size: 18, ...o })], { spacing: { after: 0 } })], { shading: shade(fill), margins: { top: 60, bottom: 60, left: 100, right: 100 } });
    const leadRows = main.map(({ lead, pr }, i) => {
      const v = vettedOf(lead);
      const fill = i % 2 ? WORD.white : WORD.panel;
      const days = daysUntil(lead.deadline_date);
      const due = days === null ? (lead.deadline || '—') : days < 0 ? 'Passed' : `${fmtDay(lead.deadline_date)} (${days === 0 ? 'today' : days + 'd'})`;
      return new D.TableRow({ cantSplit: true, children: [
        td(i + 1, fill, { color: WORD.grey }), td(lead.organization, fill, { bold: true, color: WORD.black }), td(pr.total.toFixed(1), fill, { bold: true }),
        td(v ? tierText(v) : lead.vetted ? 'Lookups failed' : 'Not vetted', fill, { color: v ? tierColor(v.tier.tier) : WORD.grey }),
        td(v ? (v.crmFound ? 'Yes' : v.crm.error ? 'Check failed' : 'No') : '—', fill), td(due, fill, { color: days !== null && days < 0 ? WORD.spicy : WORD.text }),
      ] });
    });
    children.push(table([new D.TableRow({ tableHeader: true, children: ['#', 'Organization', 'Priority', 'TNG score', 'In Zoho', 'Deadline'].map(th) }), ...leadRows],
      [500, 4180, 1000, 2000, 1000, 1400]));

    children.push(para([run("How to read this: priority starts from Steve's score in the brief and moves with what the lookups found (Zoho CRM, security incidents and trigger events in the news, tngdefense.com visits, firmographic fit, a security contact, licensing and deadlines). The TNG score is the tool's Opportunity Score from Apollo, Zoho and news data. Full lead details, contacts and sources are in the tool and its PDF report.", { size: 16, color: WORD.mid })], { spacing: { before: 320 } }));

    const smallCaps = (text, o = {}) => run(text, { size: 15, color: WORD.mid, characterSpacing: 20, ...o });
    const doc = new D.Document({
      creator: 'TNG Opportunity Score',
      title: reportTitle(),
      styles: { default: { document: { run: { font: WORD_FONT, size: 21 } } } },
      sections: [{
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1000, bottom: 1000, left: 1080, right: 1080, header: 500, footer: 500 } } },
        headers: { default: new D.Header({ children: [para([smallCaps('THE NORTH GROUP  |  EXECUTIVE REPORT', { bold: true })], { alignment: D.AlignmentType.RIGHT })] }) },
        footers: { default: new D.Footer({ children: [new D.Paragraph({
          tabStops: [{ type: D.TabStopType.RIGHT, position: WORD_WIDTH }],
          children: [smallCaps('INTERNAL · CONTAINS CONTACT DETAILS · TNGDEFENSE.COM'),
            new D.TextRun({ children: [new D.Tab(), 'Page ', D.PageNumber.CURRENT, ' of ', D.PageNumber.TOTAL_PAGES], font: WORD_FONT, size: 15, color: WORD.mid })],
        })] }) },
        children,
      }],
    });
    return D.Packer.toBlob(doc);
  }

  async function downloadBriefReport(btn) {
    if (btn.disabled) return;
    btn.disabled = true;
    const label = btn.innerHTML; // icon and text
    btn.textContent = 'Building...';
    try {
      const blob = await briefDocxBlob();
      downloadFile(`tng-executive-report-${briefFileStem()}.docx`, blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      showExportConfirm('Executive report downloaded (Word)', 'tng-brief-confirm');
    } catch (err) {
      console.error(err);
      showExportConfirm("Couldn't build the Word report: " + err.message, 'tng-brief-confirm');
    } finally {
      btn.disabled = false;
      btn.innerHTML = label;
    }
  }

  // Prints the report from a hidden frame; the browser's print window offers "Save as PDF".
  function printBriefReport() {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    frame.onload = async () => {
      try { await frame.contentDocument.fonts.ready; } catch (e) { /* print with fallback fonts */ }
      const originalTitle = document.title;
      document.title = reportTitle(); // browsers name the PDF after the page title
      frame.contentWindow.focus();
      frame.contentWindow.print();
      document.title = originalTitle;
      setTimeout(() => frame.remove(), 1000);
    };
    frame.srcdoc = briefReportHtml();
    document.body.appendChild(frame);
    showExportConfirm('Choose "Save as PDF" in the print window', 'tng-brief-confirm');
  }

  // ----- Push to Zoho: one person at a time, as a Contact with Contact Type "Prospect" -----
  // Every safeguard lives on the server (api/zoho-push.js): it re-checks everything on each
  // push. This window only gathers the details, shows the server's preview, and sends one
  // create when the person confirms. The create is never retried automatically.
  const ZOHO_PUSH_URL = "https://tng-lead.vercel.app/api/zoho-push";
  const OWNER_KEY = 'tngPushOwnerEmail';
  const savedOwner = () => { try { return localStorage.getItem(OWNER_KEY) || ''; } catch (e) { return ''; } };
  const saveOwner = email => { try { localStorage.setItem(OWNER_KEY, email); } catch (e) { /* remembered for this visit only */ } };
  const PUSH_FIELDS = [
    ['first_name', 'First name'], ['last_name', 'Last name'], ['title', 'Title'], ['email', 'Email'],
    ['phone', 'Phone'], ['company', 'Company'], ['website', 'Website'],
  ];
  const plainTier = label => String(label || '').replace(/\s*🌶️/, '').trim();

  function splitName(full) {
    const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
    return { first: parts[0] || '', last: parts.slice(1).join(' ') };
  }

  // People who can be pushed for a brief lead: Steve's named buyers, then the lookup's
  // contacts. Apollo shows only a first name until revealed (1 credit), so an unrevealed
  // Apollo contact comes with a reveal option and no last name.
  function briefPushCandidates(lead) {
    const out = [];
    (lead.buyers || []).filter(b => b.name).forEach(b => {
      const n = splitName(b.name);
      out.push({ label: `${b.name}${b.title ? ', ' + b.title : ''} (Steve's brief)`, first: n.first, last: n.last, title: b.title || '', email: b.email || '', phone: b.phone || '' });
    });
    const v = vettedOf(lead);
    if (v) {
      const fromWeb = v.result.data_source === 'web_research';
      v.contacts.forEach((c, ci) => {
        const r = c.revealed;
        const n = splitName((r && r.full_name) || c.name);
        out.push({
          label: `${(r && r.full_name) || c.name}${c.title ? ', ' + c.title : ''} (${fromWeb ? 'web research' : r ? 'Apollo, revealed' : 'Apollo, not revealed' + emailNote(c)})`,
          first: n.first, last: r || fromWeb ? n.last : '', title: c.title || '', email: (r && r.email) || '', phone: '',
          hasEmail: c.has_email, apolloId: c.apollo_id || null,
          reveal: r || fromWeb ? null : { kind: 'brief', lead, ci },
        });
      });
      (v.result.more_people || []).forEach((p, i) => out.push(morePersonCandidate(p, { kind: 'briefMore', lead, i })));
    }
    return out;
  }

  function singlePushCandidates() {
    const info = lastCompanyInfo || {};
    const fromWeb = info.data_source === 'web_research';
    return (info.key_contacts || []).map((c, i) => {
      const r = revealedByIndex[i];
      const n = splitName((r && r.full_name) || c.name);
      return {
        label: `${(r && r.full_name) || c.name}${c.title ? ', ' + c.title : ''} (${fromWeb ? 'web research' : r ? 'Apollo, revealed' : 'Apollo, not revealed' + emailNote(c)})`,
        first: n.first, last: r || fromWeb ? n.last : '', title: c.title || '', email: (r && r.email) || '', phone: '',
        hasEmail: c.has_email, apolloId: c.apollo_id || null,
        reveal: r || fromWeb ? null : { kind: 'single', index: i },
      };
    }).concat((info.more_people || []).map((p, i) => morePersonCandidate(p, { kind: 'singleMore', i })));
  }

  const emailNote = c => c.has_email === true ? ', email on file' : c.has_email === false ? ', no email in Apollo' : '';
  // Someone from the more people list, offered in the picker with a reveal.
  function morePersonCandidate(p, reveal) {
    return {
      label: `${p.name}${p.title ? ', ' + p.title : ''} (more people, not revealed${emailNote(p)})`,
      first: p.name.split(' ')[0], last: '', title: p.title || '', email: '', phone: '',
      hasEmail: p.has_email, apolloId: p.apollo_id, reveal,
    };
  }

  // The note saved on the Contact: the opportunity score and why, in plain text.
  function briefPushNote(lead, pr) {
    const v = vettedOf(lead);
    const lines = [`${lead.organization}${lead.opportunity ? ': ' + lead.opportunity : ''}`,
      `Client Hunter Brief: ${briefHeading()}. Priority ${pr.total.toFixed(1)} (${priorityText(pr)})`];
    if (v) lines.push(`TNG Opportunity Score: ${v.total} (${plainTier(v.tier.label)})`);
    lines.push('');
    execRows({ lead, pr }).filter(([label]) => label !== 'Contact').forEach(([label, text]) => lines.push(`${label}: ${text}`));
    if (v && v.incidents && v.incidents.available && v.incidents.incidents.length) {
      lines.push('', 'Security incidents in the news (background, not an opener):', incidentsText(v.incidents.incidents, '- ').trimEnd());
    }
    if (v && v.events && v.events.available && v.events.events.length) {
      lines.push('', 'Trigger events in the news:', eventsText(v.events.events, '- ').trimEnd());
    }
    const sources = (lead.sources || []).filter(s => isWebLink(s.url));
    if (sources.length) lines.push('', 'Sources: ' + sources.map(s => s.url).join(' '));
    return lines.join('\n');
  }

  function singlePushNote() {
    const { info, checkedSignals, pagesVisited, total, tier } = buildScoreSummary();
    const lines = [`TNG Opportunity Score: ${total} (${tier})`, ''];
    const company = [info.industry, info.employee_count ? Number(info.employee_count).toLocaleString() + ' employees' : '',
      info.estimated_revenue, info.headquarters].filter(Boolean).join(' · ');
    if (company) lines.push(`Company: ${company}`);
    if (checkedSignals.length) lines.push(`Signals: ${checkedSignals.map(s => `${s.label} (+${s.pts})`).join(' · ')}`);
    if (pagesVisited.length) lines.push(`Pages visited on tngdefense.com: ${pagesVisited.join(', ')}`);
    if (lastIncidents && lastIncidents.available && lastIncidents.incidents.length) {
      lines.push('', 'Security incidents in the news (background, not an opener):', incidentsText(lastIncidents.incidents, '- ').trimEnd());
    }
    if (lastEvents && lastEvents.available && lastEvents.events.length) {
      lines.push('', 'Trigger events in the news:', eventsText(lastEvents.events, '- ').trimEnd());
    }
    return lines.join('\n');
  }

  // One POST, no waiting and retrying on a busy answer (postJson does that for lookups;
  // a create must never be sent twice by the page).
  async function postOnce(url, body, timeoutMs) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const resp = await fetch(url, { method: 'POST', headers: API_HEADERS, body: JSON.stringify(body), signal: ctrl.signal });
      return { ok: resp.ok, status: resp.status, data: await resp.json().catch(() => ({})) };
    } catch (err) {
      if (err.name === 'AbortError') return { ok: false, status: 0, data: { error: "No answer from the TNG backend in time. Don't push again yet: check Zoho for this person first." } };
      return { ok: false, status: 0, data: { error: "Couldn't reach the TNG backend. Check your connection, then check Zoho before trying again." } };
    } finally {
      clearTimeout(timer);
    }
  }

  let pushState = null; // the open push window, or null

  function pushPayload() {
    return { ...pushState.fields, note_title: pushState.noteTitle, note: pushState.note };
  }
  const pushKey = () => JSON.stringify(pushPayload());

  function useCandidate(i) {
    const c = pushState.candidates[i] || {};
    pushState.chosen = i;
    pushState.fields = {
      owner_email: pushState.fields ? pushState.fields.owner_email : savedOwner(),
      first_name: c.first || '', last_name: c.last || '', title: c.title || '', email: c.email || '', phone: c.phone || '',
      company: pushState.company || '', website: pushState.website || '',
    };
  }

  // ctx: { company, website, candidates, refreshCandidates(), startIndex, noteTitle, note, onDone(result) }
  function openPush(ctx) {
    pushState = { ...ctx, fields: null, chosen: 0, preview: null, previewFor: '', ack: false, busy: '', result: null, error: '' };
    // Start on someone pushable as they stand, else the first person Apollo has an email for.
    const ready = ctx.candidates.findIndex(c => c.first && c.last && (c.email || c.phone));
    const reachable = ctx.candidates.findIndex(c => c.hasEmail);
    const start = ctx.startIndex != null && ctx.candidates[ctx.startIndex] ? ctx.startIndex
      : ready >= 0 ? ready : reachable >= 0 ? reachable : 0;
    useCandidate(start);
    renderPush();
    runPushPreview();
  }

  function closePush() {
    if (!pushState || pushState.busy === 'pushing') return;
    pushState = null;
    const el = document.getElementById('tng-push-modal');
    if (el) el.remove();
  }

  async function runPushPreview() {
    if (!pushState || pushState.busy) return;
    pushState.busy = 'checking';
    pushState.error = '';
    renderPush();
    const key = pushKey();
    const { ok, data } = await postOnce(ZOHO_PUSH_URL, { action: 'preview', ...pushPayload() }, 60000);
    if (!pushState) return;
    pushState.busy = '';
    if (ok && data.configured === false) pushState.error = 'Push to Zoho isn\'t set up on the server yet.';
    else if (ok) { pushState.preview = data; pushState.previewFor = key; pushState.ack = false; }
    else pushState.error = data.error || 'The check failed.';
    renderPush();
  }

  async function runPush() {
    const s = pushState;
    if (!s || s.busy || !pushReady()) return;
    s.busy = 'pushing';
    s.error = '';
    renderPush();
    const { ok, data } = await postOnce(ZOHO_PUSH_URL, { action: 'create', ...pushPayload(), confirm_warnings: s.ack }, 45000);
    if (pushState !== s) return;
    s.busy = '';
    if (ok && data.created) {
      s.result = data;
      saveOwner(s.fields.owner_email);
      s.onDone(data);
    } else {
      s.error = data.error || 'The push failed.';
      s.preview = null; // a fresh check is needed before trying again
      s.previewFor = '';
    }
    renderPush();
    // A push that lands gets confetti in Zoho's four colors.
    if (s.result) confettiBurst(document.querySelector('#tng-push-modal .tng-modal'), ['#E42527', '#089949', '#226DB4', '#F9B21D']);
  }

  async function revealForPush() {
    const s = pushState;
    const c = s && s.candidates[s.chosen];
    if (!c || !c.reveal || s.busy) return;
    if (!window.confirm(revealPrompt({ has_email: c.hasEmail }))) return;
    s.busy = 'revealing';
    s.error = '';
    renderPush();
    try {
      if (c.reveal.kind === 'briefMore' || c.reveal.kind === 'singleMore') {
        const failed = c.reveal.kind === 'briefMore' ? await revealBriefMore(c.reveal.lead, c.reveal.i, true) : await revealSingleMore(c.reveal.i, true);
        if (failed) s.error = failed;
      } else if (c.reveal.kind === 'brief') {
        const { lead, ci } = c.reveal;
        const ac = lead.vetted.contacts[ci];
        const payload = ac.apollo_id ? { apollo_id: ac.apollo_id } : { first_name: (ac.name || '').split(' ')[0], domain: lead.domain, title: ac.title };
        const data = await postJson(REVEAL_URL, payload, 60000);
        if (data.revealed) ac.revealed = { full_name: data.full_name || '', email: data.email || '' };
        else s.error = data.message || 'Apollo couldn\'t confidently match this contact.';
        renderBriefResults();
      } else {
        const i = c.reveal.index;
        const contact = lastCompanyInfo.key_contacts[i];
        const payload = contact.apollo_id ? { apollo_id: contact.apollo_id } : { first_name: (contact.name || '').split(' ')[0], domain: lastCompanyInfo.domain, title: contact.title };
        const data = await postJson(REVEAL_URL, payload, 60000);
        if (data.revealed) {
          revealedByIndex[i] = { full_name: data.full_name || '', email: data.email || '' };
          if (i === currentContactIndex) renderContactCard(document.getElementById('tng-email').value.trim());
        } else {
          s.error = data.message || 'Apollo couldn\'t confidently match this contact.';
        }
      }
    } catch (err) {
      s.error = 'Reveal failed: ' + err.message;
    }
    if (pushState !== s) return;
    s.busy = '';
    s.candidates = s.refreshCandidates();
    // A revealed person may have moved in the list (more people join the contacts); follow them.
    const moved = c.apolloId ? s.candidates.findIndex(x => x.apolloId === c.apolloId) : -1;
    useCandidate(moved >= 0 ? moved : s.chosen);
    renderPush();
    runPushPreview();
  }

  // Push is allowed only right after a clean check of exactly these details.
  function pushReady() {
    const s = pushState;
    const p = s && s.preview;
    return !!(p && s.previewFor === pushKey() && p.enabled && !p.errors.length && (!p.warnings.length || s.ack));
  }

  function pushStatusHtml() {
    const s = pushState;
    if (s.busy === 'checking') return '<span class="tng-radar"></span>Checking Zoho for this person and the company...';
    if (s.busy === 'revealing') return '<span class="tng-radar"></span>Revealing the contact in Apollo...';
    if (s.busy === 'pushing') return '<span class="tng-radar"></span>Creating the Contact in Zoho...';
    const parts = [];
    if (s.error) parts.push(`<div class="bad">${escapeHtml(s.error)}</div>`);
    const p = s.preview;
    if (p && s.previewFor === pushKey()) {
      const links = list => list.map(f => `<a href="${escapeHtml(f.url)}" target="_blank" rel="noopener">${escapeHtml(f.name || 'record')}</a>`).join(', ');
      if (p.errors.length) parts.push(`<div class="bad">Can't push yet:</div><ul class="bad">${p.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`);
      if (p.existing.length) parts.push(`<div>Already in Zoho: ${links(p.existing)}</div>`);
      if (p.already_pushed && p.already_pushed.url) parts.push(`<div>Pushed before: <a href="${escapeHtml(p.already_pushed.url)}" target="_blank" rel="noopener">view in Zoho</a></div>`);
      if (p.warnings.length) {
        parts.push(`<ul class="warn">${p.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`);
        if (!p.errors.length) parts.push(`<label><input type="checkbox" data-push="ack" ${s.ack ? 'checked' : ''}> I've read the warning above and still want to push this person.</label>`);
      }
      if (!p.errors.length) {
        parts.push(`<div class="good">${p.enabled ? 'Ready: creates' : 'When pushing is switched on, this would create'} 1 Contact (Contact Type: Prospect) owned by ${escapeHtml(p.owner || '')}, ${p.account
          ? `linked to the Account <a href="${escapeHtml(p.account.url)}" target="_blank" rel="noopener">${escapeHtml(p.account.name)}</a>` : 'not linked to an Account (the company isn\'t in Zoho yet)'}, plus the note.</div>`);
      }
      parts.push(`<div>${p.caps.today} of ${p.caps.limit} team pushes used today · you: ${p.caps.yours} of ${p.caps.your_limit}</div>`);
    }
    return parts.join('');
  }

  function renderPush() {
    const s = pushState;
    let el = document.getElementById('tng-push-modal');
    if (!s) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'tng-push-modal';
      el.className = 'tng-modal-backdrop';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-modal', 'true');
      el.setAttribute('aria-labelledby', 'tng-push-title');
      document.querySelector('.tng-lead-scorer').appendChild(el);
      el.addEventListener('click', onPushClick);
      el.addEventListener('input', onPushInput);
      el.addEventListener('change', onPushChange);
    }
    const busy = !!s.busy;
    const off = s.preview && !s.preview.enabled
      ? '<div class="tng-modal-off">Pushing is switched off while it\'s being tested. You can check a contact here, but nothing is sent to Zoho.</div>' : '';
    if (s.result) {
      el.innerHTML = `<div class="tng-modal">
        <div class="tng-modal-head"><h2 id="tng-push-title">Pushed to Zoho</h2><button class="tng-modal-x" data-push="close" aria-label="Close">×</button></div>
        <div class="tng-push-status"><div class="good">Created ${escapeHtml(s.fields.first_name + ' ' + s.fields.last_name)} as a Prospect Contact${s.result.owner ? ', owned by ' + escapeHtml(s.result.owner) : ''}.</div>
          ${s.result.note_added ? '<div>The opportunity-score note was added.</div>' : '<div class="warn">The note wasn\'t added. Paste it into the Contact by hand if you need it.</div>'}
          ${s.result.warning ? `<div class="warn">${escapeHtml(s.result.warning)}</div>` : ''}
          <div><a href="${escapeHtml(s.result.url)}" target="_blank" rel="noopener">Open the Contact in Zoho →</a></div></div>
        <div class="tng-push-foot"><button class="tng-export-btn" data-push="close">Done</button></div>
      </div>`;
      return;
    }
    const cand = s.candidates[s.chosen];
    const picker = s.candidates.length ? `<label class="tng-push-label" for="tng-push-pick">Who to push</label>
      <div class="tng-push-pick-row"><select class="tng-push-select" id="tng-push-pick" data-push="pick" ${busy ? 'disabled' : ''}>
        ${s.candidates.map((c, i) => `<option value="${i}" ${i === s.chosen ? 'selected' : ''}>${escapeHtml(c.label)}</option>`).join('')}
      </select>${cand && cand.reveal ? `<button class="tng-reveal-btn" data-push="reveal" ${busy ? 'disabled' : ''}>${tngIcon('mail')}Reveal full name &amp; email (1 Apollo credit)</button>` : ''}</div>` : '';
    const input = (name, label) => `<div><label class="tng-push-label" for="tng-push-${name}">${label}</label>
      <input class="tng-push-input" id="tng-push-${name}" data-field="${name}" value="${escapeHtml(s.fields[name])}" ${busy ? 'disabled' : ''} autocomplete="off" spellcheck="false"></div>`;
    el.innerHTML = `<div class="tng-modal">
      <div class="tng-modal-head"><h2 id="tng-push-title">Push to Zoho</h2><button class="tng-modal-x" data-push="close" aria-label="Close">×</button></div>
      <p class="tng-modal-sub">Creates one Contact in Zoho CRM with Contact Type "Prospect" and adds the opportunity-score note. It never creates companies and never changes existing records. Check the details, then push. <button class="tng-help-link" data-push="help">How it works</button></p>
      ${off}
      ${input('owner_email', 'Your work email (the Contact is assigned to you)')}
      ${picker}
      <div class="tng-push-grid">${PUSH_FIELDS.map(([name, label]) => input(name, label)).join('')}</div>
      <details class="tng-push-more"><summary>Note that will be added</summary>
        <div class="tng-push-note-title">${escapeHtml(s.noteTitle)}</div>
        <textarea class="tng-push-note" data-field="note" ${busy ? 'disabled' : ''}>${escapeHtml(s.note)}</textarea>
      </details>
      <div class="tng-push-status" id="tng-push-status" aria-live="polite">${pushStatusHtml()}</div>
      <div class="tng-push-foot">
        <span class="stale" id="tng-push-stale" ${s.preview && s.previewFor !== pushKey() && !busy ? '' : 'hidden'}>Details changed: check again before pushing.</span>
        <button class="tng-export-btn" data-push="check" ${busy ? 'disabled' : ''}>Check again</button>
        <button class="tng-export-btn" data-push="close" ${s.busy === 'pushing' ? 'disabled' : ''}>Cancel</button>
        <button class="tng-export-btn primary" data-push="push" id="tng-push-go" ${pushReady() && !busy ? '' : 'disabled'}>${ZOHO_TILE}${s.busy === 'pushing' ? 'Pushing...' : 'Push to Zoho'}</button>
      </div>
    </div>`;
  }

  // Typing doesn't redraw the window (focus stays put); it only marks the check as stale.
  function refreshPushControls() {
    const stale = document.getElementById('tng-push-stale');
    if (stale) stale.hidden = !(pushState.preview && pushState.previewFor !== pushKey() && !pushState.busy);
    const go = document.getElementById('tng-push-go');
    if (go) go.disabled = !(pushReady() && !pushState.busy);
  }

  function onPushInput(e) {
    const name = e.target.dataset.field;
    if (!pushState || !name) return;
    if (name === 'note') pushState.note = e.target.value;
    else pushState.fields[name] = e.target.value;
    refreshPushControls();
  }

  function onPushChange(e) {
    if (!pushState) return;
    if (e.target.dataset.push === 'pick') {
      useCandidate(Number(e.target.value));
      renderPush();
      runPushPreview();
    } else if (e.target.dataset.push === 'ack') {
      pushState.ack = e.target.checked;
      refreshPushControls();
    }
  }

  function onPushClick(e) {
    if (e.target === e.currentTarget) { closePush(); return; } // a click on the dimmed background
    const btn = e.target.closest('[data-push]');
    if (!btn || btn.disabled) return;
    switch (btn.dataset.push) {
      case 'close': closePush(); break;
      case 'check': runPushPreview(); break;
      case 'push': runPush(); break;
      case 'reveal': revealForPush(); break;
      case 'help': tngZohoHelp(); break;
    }
  }

  // The short how-to, from the header button or the push window. Escape closes it first.
  function closeZohoHelp() {
    const el = document.getElementById('tng-help-modal');
    if (el) el.remove();
    return !!el;
  }

  // A small read-only pop-up (the how-tos). One at a time; Escape or a click outside closes it.
  function openInfoModal(title, intro, bodyHtml) {
    closeZohoHelp();
    const el = document.createElement('div');
    el.id = 'tng-help-modal';
    el.className = 'tng-modal-backdrop';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'tng-help-title');
    el.innerHTML = `<div class="tng-modal">
      <div class="tng-modal-head"><h2 id="tng-help-title">${title}</h2><button class="tng-modal-x" data-help="close" aria-label="Close">×</button></div>
      <p class="tng-modal-sub">${intro}</p>
      ${bodyHtml}
      <div class="tng-push-foot"><button class="tng-export-btn primary" data-help="close">Got it</button></div>
    </div>`;
    el.addEventListener('click', e => {
      if (e.target === el || e.target.closest('[data-help="close"]')) closeZohoHelp();
    });
    document.querySelector('.tng-lead-scorer').appendChild(el);
    el.querySelector('[data-help="close"]').focus();
  }

  window.tngZohoHelp = function() {
    openInfoModal('Zoho push instructions',
      'Push to Zoho adds one person to Zoho CRM as a Contact with Contact Type "Prospect", assigned to you, with the TNG score note. It never creates companies and never changes existing records.',
      `<ol class="tng-help-steps">
        <li>Click <b>Push to Zoho</b> on a vetted Hunter Brief lead, or on the Single Lead contact card.</li>
        <li>Enter <b>your work email</b> (first time only). The Contact is assigned to you.</li>
        <li>Pick <b>who to push</b>. Apollo contacts need <b>Reveal</b> first (1 Apollo credit): a full name and an email or phone are required.</li>
        <li>Check the details. If you edit anything, click <b>Check again</b>.</li>
        <li>Click <b>Push to Zoho</b>, then <b>Open the Contact in Zoho</b> to see it.</li>
      </ol>
      <div class="tng-help-h">If it won't push</div>
      <p class="tng-help-p">The message says why. Most often the person is <b>already in Zoho</b> (open the linked record instead), the name or email is missing, or the daily limit is reached (<b>10 for you, 25 for the team</b>).</p>
      <div class="tng-help-h">Finding pushed Contacts later</div>
      <p class="tng-help-p">Search Zoho Contacts for <b>"Added by the TNG lead tool"</b>. To clean up a dead prospect, change its Contact Type or delete it in Zoho.</p>`);
  };

  // What adds points, in the order people ask about it. Finding nothing never costs points.
  window.tngScoringHelp = function() {
    const row = (what, pts) => `<div class="tng-help-row"><span>${what}</span><b>${pts}</b></div>`;
    openInfoModal('How scoring works',
      'The Opportunity Score adds up what the lookups find. Finding nothing never costs points, and you can tick or untick any signal under Adjust signals.',
      `<div class="tng-help-tiers">
        <span class="tng-tier sm ice_cold">Ice cold 0–24</span><span class="tng-tier sm room_temp">Room temp 25–49</span>
        <span class="tng-tier sm luke_warm">Luke warm 50–74</span><span class="tng-tier sm heating_up">Heating up 75–99</span>
        <span class="tng-tier sm spicy">Spicy 🌶️ 100+</span>
      </div>
      <div class="tng-help-h">Who they are (Apollo)</div>
      ${row('Revenue: under $10M / $10–100M / $100–500M / $500M+', '+5 / +10 / +20 / +30')}
      ${row('Healthcare system', '+25')}
      ${row('Education, government, financial services, manufacturing, retail and hospitality, energy, real estate, or high-net-worth', '+20')}
      ${row('Entertainment and events, IT and network security, or telecom', '+15')}
      <div class="tng-help-h">What they're doing (Apollo)</div>
      ${row('Several sites (5+ locations)', '+20')}
      ${row('Hiring security leadership, recently funded, or growing fast', '+15 each')}
      ${row('Uses physical security or access control tech', '+10')}
      <div class="tng-help-h">Why now (news search)</div>
      ${row('Security incident at their sites in the last 12 months (older ones are listed, no points)', '+20')}
      ${row('Trigger event in the last 6 months: layoffs, a new executive, a new facility, a strike, a big event', '+15')}
      <div class="tng-help-h">Already know us</div>
      ${row('Already in Zoho CRM (account, contact or lead)', '+30')}
      ${row('Visited Contact Us or Request Security Services on tngdefense.com', '+30')}
      ${row('Viewed a service or Licensing page', '+20')}
      ${row('Viewed the Home or About page / the Blog', '+10 / +5')}
      <p class="tng-help-p" style="margin-top:14px;">Site visits come from Apollo's Website Visitors data (top 5 pages per company over the last 90 days). Every page also tells you which services to pitch.</p>`);
  };

  // How a Hunter Brief lead's priority is worked out (the same rules as priorityFor).
  window.tngPriorityHelp = function() {
    const row = (what, pts) => `<div class="tng-help-row"><span>${what}</span><b>${pts}</b></div>`;
    openInfoModal('How priority works',
      'Priority starts from Steve\'s score in the brief and moves with what the lookups find. Leads are ranked by it, best first.',
      `<div class="tng-help-h">Moves it up</div>
      ${row('Visited Contact Us or Request Security Services on tngdefense.com', '+1.5')}
      ${row('Viewed service pages (otherwise any site visit: +0.5)', '+1')}
      ${row('Already in Zoho CRM', '+1')}
      ${row('Security incident at their sites in the news, last 12 months', '+1')}
      ${row('Trigger event in the news, last 6 months', '+0.5')}
      ${row('Strong firmographic fit (50+ firmographic points)', '+0.5')}
      ${row('Apollo found a security, safety or facilities contact', '+0.5')}
      <div class="tng-help-h">Moves it down</div>
      ${row('The work is outside TNG\'s licensed states', '−0.5')}
      ${row('The deadline has already passed', '−2')}
      <p class="tng-help-p" style="margin-top:14px;">The TNG score on each card is the same Opportunity Score as Single Lead, from its automatic signals. Each vetted lead uses 2 Apollo credits, unless the company was looked up in the last 7 days; reading the brief uses none.</p>`);
  };

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (closeZohoHelp()) return;
    if (pushState) closePush();
  });

  function openBriefPush(lead) {
    const v = vettedOf(lead);
    if (!v) return;
    const pr = priorityFor(lead);
    openPush({
      company: v.result.company_name || lead.organization,
      website: lead.domain,
      candidates: briefPushCandidates(lead),
      refreshCandidates: () => briefPushCandidates(lead),
      noteTitle: `TNG Opportunity Score: ${v.total} (${plainTier(v.tier.label)}) · Hunter Brief ${brief.date || brief.title}`,
      note: briefPushNote(lead, pr),
      onDone: result => { lead.zohoPushed = { url: result.url }; renderBriefResults(); },
    });
  }

  window.tngPushToZoho = function() {
    if (!lastCompanyInfo) return;
    const { total, tier } = buildScoreSummary();
    openPush({
      company: lastCompanyInfo.company_name,
      website: lastCompanyInfo.domain,
      candidates: singlePushCandidates(),
      refreshCandidates: singlePushCandidates,
      startIndex: currentContactIndex,
      noteTitle: `TNG Opportunity Score: ${total} (${tier})`,
      note: singlePushNote(),
      onDone: result => {
        document.getElementById('tng-zoho-result').innerHTML =
          `✓ Pushed to Zoho as a Prospect. <a href="${escapeHtml(result.url)}" target="_blank" rel="noopener">View the Contact →</a>`;
      },
    });
  };

  // The card's push button, or the link once this lead's contact has been pushed.
  function zohoActionHtml(lead, v, report) {
    if (report || !v) return '';
    if (lead.zohoPushed) {
      return `<div class="tng-zoho-row"><span class="tng-chip good">✓ Pushed to Zoho</span><a href="${escapeHtml(lead.zohoPushed.url)}" target="_blank" rel="noopener">View the Contact →</a></div>`;
    }
    return `<div class="tng-zoho-row"><button class="tng-zoho-btn" data-brief-action="zoho" data-key="${lead.key}">${ZOHO_TILE}Push to Zoho</button></div>`;
  }

  function resetBrief() {
    if (briefRunning) return;
    brief = null;
    setBriefError('');
    renderBriefReview();
    renderBriefResults();
    document.getElementById('tng-brief-drop').hidden = false;
    document.getElementById('tng-brief-work').hidden = true;
  }

  // ----- Wiring -----
  const briefPanel = document.getElementById('tng-mode-brief');
  const briefDrop = document.getElementById('tng-brief-drop');
  const briefFileInput = document.getElementById('tng-brief-file');

  briefFileInput.addEventListener('change', () => {
    loadBriefFile(briefFileInput.files[0]);
    briefFileInput.value = ''; // lets the same file be chosen again
  });
  briefDrop.addEventListener('dragover', e => { e.preventDefault(); briefDrop.classList.add('dragover'); });
  briefDrop.addEventListener('dragleave', () => briefDrop.classList.remove('dragover'));
  briefDrop.addEventListener('drop', e => {
    e.preventDefault();
    briefDrop.classList.remove('dragover');
    loadBriefFile(e.dataTransfer.files[0]);
  });

  document.getElementById('tng-brief-review').addEventListener('change', e => {
    const rowEl = e.target.closest('.tng-brief-row');
    if (!rowEl || !brief) return;
    const lead = brief.leads[Number(rowEl.dataset.key)];
    const box = rowEl.querySelector('[data-role="include"]');
    if (e.target.dataset.role === 'include') {
      lead.include = box.checked;
    } else if (e.target.dataset.role === 'domain') {
      const typed = e.target.value.trim();
      lead.domain = cleanDomain(typed);
      if (lead.domain) e.target.value = lead.domain;
      e.target.classList.toggle('invalid', !!typed && !lead.domain);
      box.disabled = !lead.domain;
      box.checked = lead.include = !!lead.domain;
    }
    rowEl.classList.toggle('on', lead.include);
    updateRunButton();
  });

  briefPanel.addEventListener('click', e => {
    const btn = e.target.closest('[data-brief-action]');
    if (!btn || !brief && btn.dataset.briefAction !== 'new') return;
    const lead = btn.dataset.key != null ? brief.leads[Number(btn.dataset.key)] : null;
    switch (btn.dataset.briefAction) {
      case 'run': runBrief(); break;
      case 'new': resetBrief(); break;
      case 'copy': copyText(briefSummaryText(), 'tng-brief-confirm'); break;
      case 'csv': briefCsv(); break;
      case 'report': downloadBriefReport(btn); break;
      case 'pdf': printBriefReport(); break;
      case 'reveal': revealBriefContact(lead, Number(btn.dataset.contact), btn); break;
      case 'zoho': openBriefPush(lead); break;
      case 'reveal-more': revealBriefMore(lead, Number(btn.dataset.person)); break;
      case 'retry':
        if (lead.pending) break;
        lead.pending = true;
        renderBriefResults();
        vetLead(lead).then(result => { lead.vetted = result; lead.pending = false; renderBriefResults(); });
        break;
      case 'open':
        tngReset();
        document.getElementById('tng-domain').value = lead.domain;
        tngSetMode('single');
        window.scrollTo({ top: 0 });
        tngAnalyze();
        break;
    }
  });

  // <details> open/closed state survives the re-renders as results come in.
  document.getElementById('tng-brief-results').addEventListener('toggle', e => {
    if (!brief || e.target.tagName !== 'DETAILS') return;
    if (e.target.dataset.key != null) brief.leads[Number(e.target.dataset.key)].moreOpen = e.target.open;
    else if (e.target.classList.contains('tng-brief-watch')) brief.watchOpen = e.target.open;
    else if (e.target.dataset.peopleKey != null) brief.leads[Number(e.target.dataset.peopleKey)].peopleOpen = e.target.open;
  }, true);

  window.addEventListener('beforeunload', e => {
    if (briefRunning) { e.preventDefault(); e.returnValue = ''; }
  });

  renderSignals();
  recompute();
})();
