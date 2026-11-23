// Knowledge documents are stored as plain text where each table row is one line
// with cells separated by tabs (the backend cleans pasted text into this form).

export type KnowledgeBlock =
  | { kind: 'text'; text: string }
  | { kind: 'table'; header: string[] | null; rows: string[][] };

const hasDigit = (cell: string) => /\d/.test(cell);

/** The first row names the columns when it has no numbers but the rows below do, or for 3+ columns. */
function looksLikeHeader(rows: string[][]) {
  if (rows.length < 2) return false;
  const [first, ...rest] = rows;
  if (first.some((c) => !c.trim() || hasDigit(c))) return false;
  return first.length >= 3 || rest.some((r) => r.some(hasDigit));
}

export function parseKnowledge(content: string, { firstRowIsHeader = false } = {}): KnowledgeBlock[] {
  const blocks: KnowledgeBlock[] = [];
  let text: string[] = [];
  let rows: string[][] = [];

  const flushText = () => {
    const joined = text.join('\n').trim();
    if (joined) blocks.push({ kind: 'text', text: joined });
    text = [];
  };
  const flushTable = () => {
    if (rows.length === 0) return;
    const width = Math.max(...rows.map((r) => r.length));
    const padded = rows.map((r) => [...r, ...Array(width - r.length).fill('')]);
    const header = firstRowIsHeader || looksLikeHeader(padded) ? padded[0] : null;
    blocks.push({ kind: 'table', header, rows: header ? padded.slice(1) : padded });
    rows = [];
  };

  for (const line of content.split('\n')) {
    if (line.includes('\t')) {
      flushText();
      rows.push(line.split('\t').map((c) => c.trim()));
    } else {
      flushTable();
      text.push(line);
    }
  }
  flushTable();
  flushText();
  return blocks;
}
