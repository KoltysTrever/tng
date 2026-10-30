// TNG Lead Scoring — turn a failed Claude API call into a message the page can show.
// Running out of prepaid API credit or hitting the monthly spend limit gets a plain
// explanation (the page shows it as-is); anything else keeps the raw detail for debugging.

const CREDITS_MESSAGE = "The Anthropic API account is out of credits, so the AI steps can't run. Ask Trever to add funds in the Anthropic Console";
const LIMIT_MESSAGE = "The Anthropic API monthly spend limit has been reached, so the AI steps can't run. Ask Trever to raise the limit in the Anthropic Console";

export function claudeErrorMessage(label, status, errText) {
  const text = String(errText || '');
  if (/credit balance is too low/i.test(text)) return CREDITS_MESSAGE;
  if (/usage limits?/i.test(text)) return LIMIT_MESSAGE;
  return `${label} ${status}: ${text.slice(0, 300)}`;
}
