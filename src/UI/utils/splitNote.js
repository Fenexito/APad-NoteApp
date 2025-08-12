export function splitNote(text, maxLen = 999) {
  if (text.length <= maxLen) return [text];
  const parts = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + maxLen, text.length);
    parts.push(text.slice(start, end));
    start = end;
  }
  return parts;
}