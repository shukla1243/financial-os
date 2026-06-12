export function buildClarifiedInput(pendingText, replyText) {
  const pending = String(pendingText || '').trim();
  const reply = String(replyText || '').trim();
  if (!pending) return reply;
  if (!reply) return pending;
  return `Original request: ${pending}\nUser clarification: ${reply}`;
}
