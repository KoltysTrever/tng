// TNG Opportunity Score — the tool itself, served from Vercel at /tool/app.js.
// The tng_lead_scoring.html file people open from SharePoint is a small launcher: it sets
// window.TNG_CONFIG.accessCode and loads this script, so a push here reaches everyone the
// next time they open the file. Nothing secret belongs in this file: it is public.

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
    align-items: flex-end;
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

  .tng-company-linkedin, .tng-contact-link { display: inline-block; margin-top: 16px; font-size: 14px; font-weight: 600; }

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
  .tng-reveal-btn {
    background: rgba(21,101,192,0.16);
    color: var(--tng-intel-text);
    border: none;
    padding: 10px 18px;
    font-size: 14px;
    font-weight: 600;
    border-radius: var(--tng-radius-sm);
    cursor: pointer;
    font-family: inherit;
    transition: background 0.2s;
  }
  .tng-reveal-btn:hover { background: rgba(21,101,192,0.26); }
  .tng-reveal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
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
  #tng-vertical-signals, #tng-event-signals, #tng-crm-signals, #tng-news-signals, #tng-site-signals, #tng-page-signals {
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
  .tng-export-btn { flex: 1; }
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
  .tng-export-confirm { font-size: 14px; color: var(--tng-clear-text); opacity: 0; transition: opacity 0.3s; }
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

  .tng-burst-layer { position: fixed; inset: 0; pointer-events: none; z-index: 50; overflow: hidden; }
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
  .tng-mode-tabs {
    display: inline-flex;
    gap: 4px;
    padding: 4px;
    margin-bottom: 28px;
    background: var(--tng-surface);
    border: 1px solid var(--tng-hairline);
    border-radius: 999px;
  }
  .tng-mode-tab {
    background: transparent;
    border: none;
    color: var(--tng-text-secondary);
    font-family: inherit;
    font-size: 14px;
    font-weight: 600;
    padding: 8px 20px;
    border-radius: 999px;
    cursor: pointer;
    transition: background 0.2s, color 0.2s;
  }
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

  .tng-brief-summary { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 18px; }
  .tng-brief-summary-text { font-size: 15px; color: var(--tng-text-secondary); line-height: 1.5; }
  .tng-brief-summary-text strong { color: var(--tng-white); font-weight: 600; }
  .tng-brief-summary .tng-export-row { margin-top: 0; }
  .tng-brief-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
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
    .tng-header { flex-direction: column; align-items: flex-start; gap: 10px; }
    .tng-header-note { text-align: left; max-width: none; }
    .tng-input-row { flex-wrap: wrap; }
    .tng-input-row input { flex: 1 1 100%; }
    .tng-analyze-btn { flex: 1; }
  }

  /* ---------- Small screens ---------- */
  @media (max-width: 640px) {
    .tng-lead-scorer { padding: 24px 16px 0; }
    .tng-header h1 { font-size: 28px; }
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
      <div class="tng-version-line">TNG OP TOOL V.3.1 · Created by Trever Koltys</div>
    </div>
    <span class="tng-header-note">This tool is to be used in conjunction with <a href="https://app.apollo.io/" target="_blank" rel="noopener">app.apollo.io</a></span>
  </div>

  <div class="tng-mode-tabs" role="tablist" aria-label="Mode">
    <button class="tng-mode-tab" role="tab" id="tng-tab-single" aria-selected="true" onclick="tngSetMode('single')">Single Lead</button>
    <button class="tng-mode-tab" role="tab" id="tng-tab-brief" aria-selected="false" onclick="tngSetMode('brief')">Hunter Brief</button>
  </div>

  <div id="tng-mode-single">
  <div class="tng-layout">
  <div class="tng-main">

  <div class="tng-input-row">
    <input type="text" id="tng-domain" placeholder="Company domain (e.g. acmehealth.com)" />
    <input type="text" id="tng-email" placeholder="Contact email (optional)" />
    <button class="tng-analyze-btn" id="tng-analyze-btn" onclick="tngAnalyze()">Analyze</button>
    <button class="tng-reset-btn" id="tng-reset-btn" onclick="tngReset()">Reset</button>
  </div>
  <div class="tng-hint">Pulls Apollo firmographics and tngdefense.com visits, checks Zoho CRM, and searches the news for security incidents, automatically. Tick any extra pages you know they viewed.</div>

  <div class="tng-status" id="tng-status"><span class="tng-radar"></span><span id="tng-status-text">Querying Apollo...</span></div>
  <div class="tng-error" id="tng-error"></div>

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
    <a href="#" target="_blank" rel="noopener" class="tng-company-linkedin" id="tng-company-linkedin" style="display:none;">View Company on LinkedIn →</a>
  </div>

  <div class="tng-contact-card" id="tng-contact-card">
    <div class="tng-contact-label-row">
      <div class="tng-contact-label">Recommended First Contact</div>
      <button class="tng-contact-cycle-btn" id="tng-contact-cycle-btn" onclick="tngCycleContact()" style="display:none;">Next contact →</button>
    </div>
    <div class="tng-contact-name" id="tng-contact-name">—</div>
    <div class="tng-contact-title" id="tng-contact-title"></div>
    <div class="tng-contact-reasoning" id="tng-contact-reasoning"></div>
    <div class="tng-contact-actions">
      <a href="#" target="_blank" rel="noopener" class="tng-contact-link" id="tng-contact-link" style="display:none;">View LinkedIn →</a>
      <button class="tng-reveal-btn" id="tng-reveal-btn" onclick="tngRevealContact()" style="display:none;">Reveal Full Name &amp; Email (1 Apollo credit)</button>
    </div>
    <div class="tng-reveal-result" id="tng-reveal-result"></div>
  </div>

  <div class="tng-section">
    <div class="tng-section-label">CRM Check <span class="tng-source-tag auto"><b>Automatic</b> · via Zoho CRM</span></div>
    <div id="tng-crm-signals"></div>
    <div class="tng-crm-records" id="tng-crm-records"></div>
  </div>

  <div class="tng-section">
    <div class="tng-section-label">Security Incidents <span class="tng-source-tag auto"><b>Automatic</b> · via news search</span></div>
    <div id="tng-news-signals"></div>
    <div class="tng-incidents" id="tng-incidents"></div>
  </div>

  <div class="tng-section">
    <div class="tng-auto-populated-section">
      <div class="tng-section-label">Firmographic <span class="tng-source-tag auto"><b>Automatic</b> · via Apollo</span></div>
      <div id="tng-vertical-signals"></div>

      <div class="tng-event-group">
        <div class="tng-event-group-label">Recent Company Activity</div>
        <div id="tng-event-signals"></div>
      </div>
    </div>
  </div>

  <div class="tng-section">
    <div class="tng-section-label">Site Behavior <span class="tng-source-tag auto"><b>Automatic</b> · from the pages visited below</span></div>
    <div id="tng-site-signals"></div>

    <div class="tng-event-group">
      <div class="tng-event-group-label">Pages Visited <span class="tng-source-tag auto"><b>Automatic</b> · from Apollo, tick any extras</span></div>
      <div class="tng-visit-summary" id="tng-visit-summary"></div>
      <div class="tng-hint" style="margin-top:0;">Ticked from Apollo's Website Visitors (it reports each company's top 5 pages over the last 90 days). Service and contact pages tick the Site Behavior signals above; Home, About and Blog add a few points of their own. All of them tell you which services to pitch.</div>
      <div id="tng-page-signals"></div>
    </div>
  </div>

  </div><!-- /.tng-main -->

  <aside class="tng-rail">
    <div class="tng-result">
      <div class="tng-total-label">Opportunity Score</div>
      <div class="tng-score-row">
        <div class="tng-total-score" id="tng-total">0</div>
        <div class="tng-tier ice_cold" id="tng-tier">ICE COLD</div>
      </div>
      <div class="tng-breakdown" id="tng-breakdown"></div>
    </div>

    <div class="tng-export-row">
      <button class="tng-export-btn" onclick="tngCopySummary()">Copy Summary</button>
      <button class="tng-export-btn" onclick="tngExportCsv()">Download CSV</button>
      <span class="tng-export-confirm" id="tng-export-confirm"></span>
    </div>
  </aside>
  </div><!-- /.tng-layout -->

  <div class="tng-footnote">
    Firmographic (auto): Revenue Under $10M (+5), $10-100M (+10), $100-500M (+20), or $500M+ (+30) · Healthcare (+25) · Education (+20) · Government (+20) · Entertainment/Events (+15) · High-Net-Worth (+20) · IT/Network Security (+15) · Telecom (+15) · Financial Services (+20) · Manufacturing/Industrial (+20) · Retail/Hospitality (+20) · Energy/Utilities (+20) · Real Estate (+20) · Hiring security leadership (+15) · Recently funded (+15) · Rapid headcount growth (+15) · Uses physical security tech (+10) · Multi-site physical footprint (+20). CRM (auto): Already in Zoho CRM as an account, contact, or lead (+30). Security incidents (auto): a news search finds a reported assault, weapon, lockdown or threat at their sites in the last 12 months (+20); incidents 12-24 months old are listed for context with no points, and finding nothing never costs points. Site behavior: Visited a high-intent page — Request Security Services or Contact Us (+30) · Showed interest in TNG services — any service or Licensing page (+20). Pages visited: service and contact pages set those two signals; Home Page (+10), About TNG (+10) and Blog/Insights (+5) score on their own (so site behavior adds at most +75). All pages show which services to pitch. Page visits come from Apollo's Website Visitors data (top 5 pages per company, last 90 days) and are ticked automatically; tick any others yourself.
  </div>
  </div><!-- /#tng-mode-single -->

  <div id="tng-mode-brief" hidden>
    <div class="tng-hint">Drop in a Client Hunter Brief from Steve. The tool reads every lead, finds each organization's website, vets them against Apollo, Zoho CRM and tngdefense.com visits, and ranks them best first with who to contact.</div>
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
      Priority starts from Steve's score in the brief and moves with what the lookups find: already in Zoho CRM (+1) · a security incident at their sites in the news in the last 12 months (+1) · visited the Contact or Request Services page (+1.5), otherwise viewed service pages (+1), otherwise any site visit (+0.5) · strong firmographic fit, 50+ firmographic points (+0.5) · Apollo found a security, safety or facilities contact (+0.5) · work is outside TNG's licensed states (−0.5) · deadline already passed (−2). The TNG score is the same Opportunity Score as the Single Lead view, from its automatic signals only. Each vetted lead uses 2 Apollo credits, the same as one Analyze; reading the brief uses none.
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
  const INCIDENT_URL = "https://tng-lead.vercel.app/api/incident-scan";
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
    const pagesEl = document.getElementById('tng-page-signals');
    const siteEl = document.getElementById('tng-site-signals');
    verticalEl.innerHTML = '';
    eventEl.innerHTML = '';
    crmEl.innerHTML = '';
    newsEl.innerHTML = '';
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
    scoreEl.textContent = total;
    renderBreakdown();
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
    } else if (tier === 'heating_up' && climbed) {
      heatBurst(false);
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

  const BREAKDOWN_GROUPS = [
    { label: 'Firmographic', match: s => s.group === 'auto' && s.subgroup !== 'event' },
    { label: 'Company activity', match: s => s.group === 'auto' && s.subgroup === 'event' },
    { label: 'Zoho CRM', match: s => s.group === 'crm' },
    { label: 'Security incidents', match: s => s.group === 'news' },
    { label: 'Site behavior', match: s => s.group === 'site' || s.group === 'pages' },
  ];

  function renderBreakdown() {
    document.getElementById('tng-breakdown').innerHTML = BREAKDOWN_GROUPS.map(g => {
      const pts = SIGNALS.filter(s => g.match(s) && state[s.id].checked).reduce((sum, s) => sum + s.pts, 0);
      return `<div class="tng-breakdown-row${pts ? ' on' : ''}"><span>${g.label}</span><span>${pts ? '+' + pts : '—'}</span></div>`;
    }).join('');
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
  function heatBurst(spicy) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const origin = document.querySelector('.tng-result').getBoundingClientRect();
    const x0 = origin.left + origin.width / 2;
    const y0 = origin.top + Math.min(origin.height, 140) / 2;
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

  async function runIncidentScan(domain) {
    const requestId = ++incidentRequestId;
    lastIncidents = null;
    setIncidentResult(false, 'Checking the news...', '<span class="tng-radar"></span> Searching the news for incidents at their sites (20-40s)...');
    try {
      const data = await postJson(INCIDENT_URL, { domain }, 240000);
      if (requestId !== incidentRequestId) return; // a newer lookup (or Reset) superseded this one
      lastIncidents = data;
      if (!data.available) {
        setIncidentResult(false, 'News check unavailable (' + (data.reason || 'unknown error') + '). Tick this if you know of a recent incident.', '');
        return;
      }
      if (!data.incidents.length) {
        setIncidentResult(false, 'No reported incidents at their sites in the last 24 months', '');
        return;
      }
      const recent = data.recent_count;
      const detail = recent
        ? `${recent} reported in the last 12 months`
        : `${data.incidents.length} reported 12-24 months ago (context only)`;
      setIncidentResult(recent > 0, detail, incidentsListHtml(data.incidents)
        + '<div class="tng-incident-note">Use for background, not as an opener.</div>');
    } catch (err) {
      console.error(err);
      if (requestId !== incidentRequestId) return;
      setIncidentResult(false, 'News check failed (' + err.message + '). Tick this if you know of a recent incident.', '');
    }
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

  window.tngAnalyze = async function() {
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
    runCrmCheck(domain, email); // not awaited — fills in the CRM Check section on its own
    runIncidentScan(domain); // not awaited either — fills in Security Incidents when the search finishes
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
          body: JSON.stringify({ domain, email: email || undefined })
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
          companyLinkedinEl.style.display = 'inline-block';
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
        typed_contact_email: email || '',
        data_source: result.data_source || 'apollo',
      };
      currentContactIndex = 0;
      revealedByIndex = {};

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
        contactLink.style.display = 'inline-block';
      } else {
        contactLink.style.display = 'none';
      }
      revealBtn.style.display = 'inline-block';
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
      revealBtn.textContent = 'Reveal Full Name & Email (1 Apollo credit)';
    }

    // Web-research companies aren't in Apollo, so there's no contact record to reveal —
    // hide the button (it would only burn a click, maybe a credit) and say why.
    if (lastCompanyInfo && lastCompanyInfo.data_source === 'web_research') {
      revealBtn.style.display = 'none';
      revealResultEl.className = 'tng-reveal-result muted';
      revealResultEl.textContent = 'Found via web search. This company isn\'t in Apollo\'s database, so there\'s no contact record to reveal.';
    }

    document.getElementById('tng-contact-card').classList.add('active');
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
    lastSiteVisits = null;
    lastIncidents = null;
    crmRequestId++; // ignore any CRM check still in flight
    incidentRequestId++; // and any news search
    prevTotal = 0;
    prevTier = 'ice_cold';
    lastCompanyInfo = null;
    currentContactIndex = 0;
    revealedByIndex = {};
    setError('');
    setStatus(null);
    renderSignals();
    recompute();
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
      'Headquarters', 'Founded', 'Score', 'Tier', 'Zoho CRM', 'Signals Matched', 'Pages Visited', 'Security Incidents',
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

    const confirmed = window.confirm(
      'This will use 1 Apollo credit to reveal this contact\'s full name and email address.\n\nContinue?'
    );
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
        revealedByIndex[currentContactIndex] = {
          full_name: data.full_name || '',
          email: data.email || '',
        };
      } else {
        resultEl.className = 'tng-reveal-result error';
        resultEl.textContent = data.message || 'Could not confidently match this contact for reveal.';
        btn.disabled = false;
        btn.textContent = 'Reveal Full Name & Email (1 Apollo credit)';
      }
    } catch (err) {
      console.error(err);
      resultEl.className = 'tng-reveal-result error';
      resultEl.textContent = 'Reveal failed: ' + err.message;
      btn.disabled = false;
      btn.textContent = 'Reveal Full Name & Email (1 Apollo credit)';
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

    let seconds = 0;
    const statusText = () => `Reading the brief and finding each organization's website... (${seconds}s)`;
    setBriefStatus(statusText());
    const tick = setInterval(() => { seconds++; setBriefStatus(statusText()); }, 1000);
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
      brief = { title: data.brief_title || file.name.replace(/\.html?$/i, ''), date: data.brief_date || '', leads };
      renderBriefReview();
    } catch (err) {
      console.error(err);
      setBriefError("Couldn't read the brief: " + err.message);
      document.getElementById('tng-brief-drop').hidden = false;
    } finally {
      clearInterval(tick);
      setBriefStatus(null);
    }
  }

  // ----- Review: confirm websites and pick which leads to vet -----
  function renderBriefReview() {
    const el = document.getElementById('tng-brief-review');
    if (!brief || brief.started) { el.innerHTML = ''; return; }
    const ranked = brief.leads.filter(l => l.section === 'ranked');
    const watch = brief.leads.filter(l => l.section === 'watchlist');
    el.innerHTML = `
      <div class="tng-brief-summary"><div class="tng-brief-summary-text"><strong>${escapeHtml(briefHeading())}</strong> · ${ranked.length} ranked lead${ranked.length === 1 ? '' : 's'}${watch.length ? `, ${watch.length} on the watchlist` : ''}</div></div>
      <div class="tng-hint" style="margin-bottom:0;">Check each website, then vet. Ticked leads get the full lookup; the rest still appear in the results with Steve's notes.</div>
      ${reviewGroupHtml('Ranked leads', ranked)}
      ${watch.length ? reviewGroupHtml('Watchlist', watch) : ''}
      <div class="tng-brief-actions">
        <button class="tng-analyze-btn" data-brief-action="run" id="tng-brief-run"></button>
        <button class="tng-reset-btn" data-brief-action="new">Choose a different brief</button>
        <span class="tng-brief-credits" id="tng-brief-credits"></span>
      </div>`;
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
    const btn = document.getElementById('tng-brief-run');
    if (!btn || !brief) return;
    const n = brief.leads.filter(l => l.include && l.domain).length;
    btn.textContent = `Vet ${n} lead${n === 1 ? '' : 's'}`;
    btn.disabled = !n;
    document.getElementById('tng-brief-credits').textContent = n ? `About ${n * 2} Apollo credits (2 per lead)` : '';
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
    const showProgress = () => {
      setBriefStatus(`Vetting ${total} lead${total === 1 ? '' : 's'}: ${done} done. Keep this page open.`);
      document.getElementById('tng-brief-progress-bar').style.width = (done / total * 100) + '%';
      document.title = `🔍 ${done}/${total} vetted`;
    };
    showProgress();
    renderBriefResults();

    const worker = async () => {
      while (queue.length) {
        const lead = queue.shift();
        lead.vetted = await vetLead(lead);
        lead.pending = false;
        done++;
        showProgress();
        renderBriefResults();
      }
    };
    await Promise.all(Array.from({ length: BRIEF_CONCURRENCY }, worker));

    briefRunning = false;
    progressEl.hidden = true;
    setBriefStatus(null);
    document.title = '✅ Brief vetted';
    setTimeout(() => { document.title = originalTitle; }, 4000);
    renderBriefResults();
  }

  async function vetLead(lead) {
    const [analysis, crm, news] = await Promise.allSettled([
      postJson(BACKEND_URL, { domain: lead.domain }, 150000),
      postJson(CRM_URL, { domain: lead.domain }, 60000),
      postJson(INCIDENT_URL, { domain: lead.domain, company_name: lead.organization }, 240000),
    ]);
    if (analysis.status === 'rejected') return { ok: false, error: analysis.reason.message };
    const result = analysis.value;
    const crmData = crm.status === 'fulfilled' ? crm.value : { error: crm.reason.message };
    const incidents = news.status === 'fulfilled' ? news.value : { available: false, reason: news.reason.message };
    const auto = autoSignalsFromResult(result);
    const visits = pagesFromVisits(result.site_visits);
    const crmFound = !!(crmData.configured && crmData.found);
    const recentIncident = !!(incidents.available && incidents.recent_count);
    const autoIds = Object.keys(auto).filter(id => auto[id].checked);
    const scored = scoreSignals(autoIds.concat(Object.keys(visits.pages), crmFound ? ['crm'] : [], recentIncident ? ['recent_incident'] : []));
    return {
      ok: true,
      result,
      crm: crmData,
      crmFound,
      incidents,
      recentIncident,
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
      <div class="tng-brief-summary">
        <div class="tng-brief-summary-text"><strong>${escapeHtml(briefHeading())}</strong><br>${escapeHtml(briefCountsText(main))}</div>
        <div class="tng-export-row">
          <button class="tng-export-btn" data-brief-action="copy">Copy Summary</button>
          <button class="tng-export-btn" data-brief-action="csv">Download CSV</button>
          <button class="tng-export-btn" data-brief-action="report" ${briefRunning ? 'disabled title="Available when vetting finishes"' : ''}>Download Report</button>
          <button class="tng-export-btn" data-brief-action="pdf" ${briefRunning ? 'disabled title="Available when vetting finishes"' : ''}>Save as PDF</button>
          <button class="tng-export-btn" data-brief-action="new">New Brief</button>
          <span class="tng-export-confirm" id="tng-brief-confirm"></span>
        </div>
      </div>
      ${main.map((x, i) => leadCardHtml(x.lead, x.pr, i + 1)).join('')}
      ${rest.length ? `<details class="tng-brief-watch" ${brief.watchOpen ? 'open' : ''}><summary>Watchlist, not vetted (${rest.length})</summary>${rest.map(x => leadCardHtml(x.lead, x.pr, '–')).join('')}</details>` : ''}`;
  }

  // report = true builds the same card for the exported report: no buttons, details shown in full.
  function leadCardHtml(lead, pr, pos, report) {
    const v = lead.vetted && lead.vetted.ok ? lead.vetted : null;
    const chips = [];
    if (lead.pending) {
      chips.push('<span class="tng-chip info"><span class="tng-radar"></span>Vetting...</span>');
    } else if (v) {
      chips.push(`<span class="tng-tier sm ${v.tier.tier}">TNG ${v.total} · ${v.tier.label}</span>`);
      if (v.crmFound) chips.push('<span class="tng-chip good">In Zoho CRM</span>');
      else if (v.crm.error) chips.push('<span class="tng-chip">Zoho check failed</span>');
      else if (v.crm.configured === false) chips.push('<span class="tng-chip">Zoho not connected</span>');
      else chips.push('<span class="tng-chip">Not in Zoho</span>');
      const sv = v.result.site_visits;
      if (!sv || !sv.available) chips.push('<span class="tng-chip">Site visits unavailable</span>');
      else if (sv.total_visits) chips.push(`<span class="tng-chip info">${sv.total_visits} site visit${sv.total_visits === 1 ? '' : 's'}</span>`);
      else chips.push('<span class="tng-chip">No site visits</span>');
      const inc = v.incidents;
      if (inc && inc.available && inc.recent_count) {
        chips.push(`<span class="tng-chip warn">⚠ ${inc.recent_count} recent incident${inc.recent_count === 1 ? '' : 's'}</span>`);
      }
      if (v.result.data_source === 'web_research') chips.push('<span class="tng-chip warn">Not in Apollo · web profile</span>');
    } else if (lead.vetted) {
      chips.push('<span class="tng-chip bad">Vetting failed</span>');
    } else {
      chips.push('<span class="tng-chip">Not vetted</span>');
    }
    const days = daysUntil(lead.deadline_date);
    if (days !== null) {
      chips.push(days < 0
        ? '<span class="tng-chip bad">Deadline passed</span>'
        : `<span class="tng-chip ${days <= 7 ? 'warn' : ''}">Due ${escapeHtml(fmtDay(lead.deadline_date))} · ${days === 0 ? 'today' : days + ' day' + (days === 1 ? '' : 's')}</span>`);
    }
    if (lead.site_state) {
      chips.push(lead.site_licensed
        ? `<span class="tng-chip good">Licensed: ${escapeHtml(lead.site_state)}</span>`
        : `<span class="tng-chip warn">Not licensed: ${escapeHtml(lead.site_state)}</span>`);
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
          ?` <button class="tng-reveal-btn tng-brief-reveal" data-brief-action="reveal" data-key="${lead.key}" data-contact="${ci}">Reveal email (1 credit)</button>` : '';
        parts.push(`<div class="tng-brief-person">
          <span class="name">${escapeHtml(name)}</span>${c.title ? ' — ' + escapeHtml(c.title) : ''}
          ${isWebLink(c.linkedin_url) ? ` · <a href="${escapeHtml(c.linkedin_url)}" target="_blank" rel="noopener">LinkedIn</a>` : ''}${revealed}${revealBtn}
          ${c.revealError ? `<div class="error">${escapeHtml(c.revealError)}</div>` : ''}
        </div>`);
      });
    }
    if (!parts.length) return '';
    return `<div class="tng-brief-people"><div class="tng-brief-people-label" style="color:var(--tng-text-secondary);">Who to contact</div>${parts.join('')}</div>`;
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
      ? `<div class="tng-brief-actions"><button class="tng-export-btn" data-brief-action="open" data-key="${lead.key}">Open in Single Lead (new lookup, 2 credits)</button></div>` : '';
    if (!rows.length && !draft && !open) return '';
    return `<details class="tng-brief-more" data-key="${lead.key}" ${lead.moreOpen ? 'open' : ''}>
      <summary>More detail</summary>
      <dl class="tng-brief-facts">${rows.join('')}</dl>
      ${draft}${open}
    </details>`;
  }

  async function revealBriefContact(lead, ci, btn) {
    const c = lead.vetted.contacts[ci];
    if (!window.confirm('This will use 1 Apollo credit to reveal this contact\'s full name and email address.\n\nContinue?')) return;
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
      } else {
        facts.push('Not vetted');
      }
      if (lead.deadline) facts.push('Deadline: ' + lead.deadline);
      text += `   ${facts.join(' · ')}\n`;
      if (v && v.incidents && v.incidents.available && v.incidents.incidents.length) {
        text += `   Incidents (news, background only):\n${incidentsText(v.incidents.incidents, '     - ')}`;
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
      'Pages Visited', 'Security Incidents', 'Brief Contacts', 'Apollo Contact 1', 'Apollo Contact 2', 'Apollo Contact 3',
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
  }`;

  function briefCountsText(main) {
    const vetted = brief.leads.filter(l => l.vetted && l.vetted.ok);
    const inCrm = vetted.filter(l => l.vetted.crmFound).length;
    const visited = vetted.filter(l => {
      const sv = l.vetted.result.site_visits;
      return sv && sv.available && sv.total_visits;
    }).length;
    const withIncidents = vetted.filter(l => l.vetted.recentIncident).length;
    return `${main.length} leads ranked · ${vetted.length} vetted · ${inCrm} in Zoho CRM · ${visited} visited tngdefense.com`
      + (withIncidents ? ` · ${withIncidents} with recent security incidents` : '');
  }

  // "Daily Brief, Thursday, Oct 29, 2026 · Thu, Oct 29, 2026" says the date twice; show it once.
  function briefHeading() {
    if (!brief.date || brief.title.includes(fmtDay(brief.date))) return brief.title;
    return `${brief.title} · ${fmtDay(brief.date, true)}`;
  }

  const briefFileStem = () => (brief.date || brief.title).replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  const reportTitle = () => `TNG Hunter Brief Report ${brief.date || brief.title}`;

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
      <h1>Hunter Brief Report</h1>
      <div class="tng-version-line">${escapeHtml(briefHeading())}</div>
    </div>
    <span class="tng-header-note">Vetted ${escapeHtml(new Date().toLocaleString())}<br>Internal: contains contact details</span>
  </div>
  <div class="tng-report-meta"><strong>${escapeHtml(briefCountsText(main))}</strong><br>Ranked best first. Priority starts from Steve's score and moves with what the lookups found (see the note at the end).</div>
  ${main.map((x, i) => leadCardHtml(x.lead, x.pr, i + 1, true)).join('')}
  ${rest.length ? `<div class="tng-section-label" style="margin-top:32px;">Watchlist, not vetted</div>${rest.map(x => leadCardHtml(x.lead, x.pr, '–', true)).join('')}` : ''}
  <div class="tng-footnote">${footnote}<br><br>${escapeHtml(version)} · Generated by the TNG Opportunity Score tool.</div>
</div>
</body>
</html>`;
  }

  function downloadBriefReport() {
    downloadFile(`tng-hunter-brief-${briefFileStem()}.html`, briefReportHtml(), 'text/html;charset=utf-8');
    showExportConfirm('Report downloaded', 'tng-brief-confirm');
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

  function resetBrief() {
    if (briefRunning) return;
    brief = null;
    setBriefError('');
    renderBriefReview();
    renderBriefResults();
    document.getElementById('tng-brief-drop').hidden = false;
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
      case 'report': downloadBriefReport(); break;
      case 'pdf': printBriefReport(); break;
      case 'reveal': revealBriefContact(lead, Number(btn.dataset.contact), btn); break;
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
  }, true);

  window.addEventListener('beforeunload', e => {
    if (briefRunning) { e.preventDefault(); e.returnValue = ''; }
  });

  renderSignals();
  recompute();
})();
