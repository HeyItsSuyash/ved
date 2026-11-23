// Cleans text pasted or uploaded into the knowledge base.
//
// Copied text from Word, Excel, PDFs and WhatsApp is full of separator lines
// (-----, =====, |---|---|), decorations (*** FEES ***, ## Hostel) and leaders used
// as column gaps (B.Tech ........ 1,24,000). This removes the decoration and
// stores tables in one plain form: one row per line, cells separated by a tab.
// The dashboard renders those lines as a table, and the agent reads them as rows.
//
// The result is stable: cleaning already-clean text returns it unchanged.

const TAB = '\t';

// A line made only of punctuation: a separator, not content.
const SEPARATOR_LINE = /^[\s\-–—_=*~#•·.:;|+/\\<>`'"^]+$/;
// Runs used as a gap between a label and its value.
const LEADER = /\s*(?:\.{4,}|…{2,}|[-–—]{3,}|_{3,}|={3,}|~{3,}|\*{3,}|·{3,})\s*/;
// ":-", "=>", "->" used where a colon is meant.
const ARROW = /\s*(?::-|:–|:—|=>|->|–>|—>|:=)\s*/g;

function normalizeSpaces(s) {
  return s
    .replace(/[​-‍﻿]/g, '')
    .replace(/[   ]/g, ' ');
}

/** Strip decoration from a piece of text without touching what it says. */
function tidy(s) {
  return s
    .replace(/^\s*[*=#~_\-–—]{2,}\s*/, '') // leading decoration: *** TITLE ***
    .replace(/(?:\s+[*=#~_\-–—]+|[*=#~_\-–—]{2,})\s*$/, '') // trailing decoration
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/`([^`]*)`/g, '$1')
    .replace(ARROW, ': ')
    .replace(/^\s*#{1,6}\s+/, '') // markdown heading marks
    .replace(/^\s*(?:[•●▪■◦►▶➤✓✔→]|[-*>](?=\s))\s*/, '') // bullet
    .replace(/([!?,;])\1+/g, '$1') // !!! -> !
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+:/g, ':')
    .trim();
}

function tidyCell(s) {
  return tidy(String(s ?? ''))
    .replace(/^[|*_`]+|[|*_`]+$/g, '')
    .replace(/:$/, '')
    .trim();
}

/**
 * Split a line into cells if it is a table row.
 * `explicit` rows use a real delimiter (tab or pipe) and are always a table;
 * implicit ones (leaders, wide gaps) only when several lines line up.
 */
function splitRow(line) {
  if (line.includes(TAB)) {
    const cells = line.split(/\t+/).map(tidyCell);
    return cells.filter(Boolean).length >= 2 ? { cells: trimEnds(cells), explicit: true } : null;
  }
  if (line.includes('|')) {
    let cells = line.split(/\s*\|+\s*/);
    cells = trimEnds(cells.map(tidyCell));
    if (cells.filter(Boolean).length >= 2) return { cells, explicit: true };
  }
  if (LEADER.test(line)) {
    const cells = line.split(new RegExp(LEADER.source, 'g')).map(tidyCell).filter(Boolean);
    if (cells.length >= 2) return { cells, explicit: false, leader: true };
  }
  // Columns copied from a PDF: short cells separated by wide gaps.
  if (/\S {3,}\S/.test(line)) {
    const cells = line.split(/ {3,}/).map(tidyCell).filter(Boolean);
    if (cells.length >= 2 && cells.every((c) => c.length <= 40)) return { cells, explicit: false };
  }
  return null;
}

function trimEnds(cells) {
  let a = 0;
  let b = cells.length;
  while (a < b && !cells[a]) a++;
  while (b > a && !cells[b - 1]) b--;
  return cells.slice(a, b);
}

/** Old CSV uploads: "Record 1: Course: B.Tech | Fee: 1,24,000" lines. */
function legacyCsvToRows(lines) {
  const records = lines.filter((l) => /^Record \d+: /.test(l));
  if (records.length === 0) return null;
  const columns = [];
  const parsed = records.map((line) => {
    const cells = {};
    line
      .replace(/^Record \d+: /, '')
      .split(' | ')
      .forEach((pair) => {
        const i = pair.indexOf(': ');
        const key = i === -1 ? pair : pair.slice(0, i);
        if (!columns.includes(key)) columns.push(key);
        cells[key] = i === -1 ? '' : pair.slice(i + 2);
      });
    return cells;
  });
  return [columns, ...parsed.map((r) => columns.map((c) => r[c] ?? ''))];
}

const rowLine = (cells) => cells.map((c) => String(c ?? '').replace(/[\t\r\n]+/g, ' ').trim()).join(TAB);

/** Table rows (first row = column names) in the stored form. */
function rowsToText(rows) {
  return rows.map(rowLine).join('\n');
}

function cleanKnowledgeText(input) {
  const raw = normalizeSpaces(String(input ?? '')).replace(/\r\n?/g, '\n');
  const allLines = raw.split('\n').map((l) => l.replace(/\s+$/, ''));

  const legacy = legacyCsvToRows(allLines);
  if (legacy) return rowsToText(legacy);

  // Drop separator-only lines; blank lines stay as paragraph breaks.
  const lines = allLines.filter((l) => !l.trim() || !SEPARATOR_LINE.test(l.trim()));

  const out = [];
  let group = []; // consecutive table-row candidates

  const flush = () => {
    if (group.length === 0) return;
    const explicit = group.some((r) => r.explicit);
    if (group.length >= 2) {
      const width = Math.max(...group.map((r) => r.cells.length));
      group.forEach((r) => out.push(rowLine([...r.cells, ...Array(width - r.cells.length).fill('')])));
    } else {
      const { cells, leader } = group[0];
      if (cells.length === 2 && (explicit || leader)) out.push(`${cells[0]}: ${cells[1]}`);
      else if (explicit) out.push(rowLine(cells));
      else out.push(tidy(cells.join(' ')));
    }
    group = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      if (out.length && out[out.length - 1] !== '') out.push('');
      continue;
    }
    const row = splitRow(line);
    if (row) {
      const prev = group[group.length - 1];
      // Implicit rows join a group only when they line up with it.
      const fits =
        !prev || row.explicit || prev.explicit
          ? !prev || row.explicit === prev.explicit || row.cells.length === prev.cells.length
          : row.cells.length === prev.cells.length;
      if (!fits) flush();
      group.push(row);
      continue;
    }
    flush();
    const text = tidy(line);
    if (text) out.push(text);
  }
  flush();

  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

module.exports = { cleanKnowledgeText, rowsToText };
