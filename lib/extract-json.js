// TNG Lead Scoring — pull the JSON object out of a Claude text answer.
// Shared by analyze-lead (scoring), web research and the incident scan.

export function extractJson(text) {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) {
    console.error('extractJson: no braces found. Raw text:', text.slice(0, 2000));
    throw new Error('No JSON object found in Claude response');
  }
  const candidate = cleaned.slice(start, end + 1);

  try {
    return JSON.parse(candidate);
  } catch (firstErr) {
    // Attempt a repair pass for the most common ways an LLM produces near-valid JSON:
    // trailing commas before a closing bracket, and stray literal control characters
    // (unescaped newlines/tabs) inside string values. Turning every newline/tab into a
    // space is safe everywhere: between tokens it's still whitespace, inside a string
    // it's what the prompt asked for anyway. Curly quotes are deliberately left alone \u2014
    // they're valid inside JSON strings, and straightening them broke otherwise-good output.
    let repaired = candidate
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/,\s*([\]}])/g, '$1');

    try {
      return JSON.parse(repaired);
    } catch (secondErr) {
      // Still broken — log enough context to actually diagnose this in Vercel's logs,
      // including exactly where the parser choked, rather than failing silently.
      console.error('extractJson: JSON.parse failed after repair attempt.');
      console.error('First error:', firstErr.message);
      console.error('Second error:', secondErr.message);
      console.error('Full raw response text:', text);
      throw firstErr;
    }
  }
}
