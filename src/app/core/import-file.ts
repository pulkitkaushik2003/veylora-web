import { readSheet } from 'read-excel-file/browser';

export interface ImportResult { lines: string[]; skipped: number; }

/** Splits one CSV line, handling "quoted, values". */
function splitCsvLine(line: string, sep: string): string[] {
  const out: string[] = [];
  let cur = '', quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

async function readRows(file: File): Promise<string[][]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx')) {
    const rows = await readSheet(file);
    return rows.map((r: any[]) => r.map(c => (c === null || c === undefined ? '' : String(c).trim())));
  }
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = (await file.text()).replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] ?? '';
    const sep = first.includes(';') && !first.includes(',') ? ';' : first.includes('\t') && !first.includes(',') ? '\t' : ',';
    return text.split(/\r?\n/).filter(l => l.trim()).map(l => splitCsvLine(l, sep).map(c => c.trim()));
  }
  throw new Error('Use an .xlsx or .csv file. (An old .xls file: open it in Excel and Save As .xlsx or .csv.)');
}

export interface DocPair { email: string; file: string; }

/**
 * Reads a "document list": one column with the email and one with the file name to send that person
 * (headers like email / file, document, attachment, pdf). Without headers: first column email, second file name.
 */
export async function importDocList(file: File): Promise<{ pairs: DocPair[]; skipped: number }> {
  const rows = await readRows(file);
  if (!rows.length) return { pairs: [], skipped: 0 };
  const header = rows[0].map(h => h.toLowerCase());
  const find = (...names: string[]) => header.findIndex(h => names.some(n => h === n || h.includes(n)));
  const emailCol = find('email', 'e-mail', 'mail');
  const fileCol = find('file', 'document', 'doc', 'attachment', 'pdf', 'certificate', 'photo');
  const hasHeader = emailCol >= 0 && fileCol >= 0 && emailCol !== fileCol;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const pairs: DocPair[] = [];
  let skipped = 0;
  for (const row of hasHeader ? rows.slice(1) : rows) {
    const email = (hasHeader ? row[emailCol] : row[0]) ?? '';
    const name = (hasHeader ? row[fileCol] : row[1]) ?? '';
    if (!email && !name) continue;
    if (!isEmail.test(email) || !name) { skipped++; continue; }
    pairs.push({ email, file: name });
  }
  return { pairs, skipped };
}

/**
 * Turns a sheet into lines like "Name,address", the same text the form box takes, so the user can check and edit them.
 * It looks for header columns called name, email or phone/mobile. Without a header, the first column is the
 * address and the second (if any) is the name.
 */
export async function importRecipients(file: File, kind: 'EMAIL' | 'PHONE'): Promise<ImportResult> {
  const rows = await readRows(file);
  if (!rows.length) return { lines: [], skipped: 0 };

  const header = rows[0].map(h => h.toLowerCase());
  const find = (...names: string[]) => header.findIndex(h => names.some(n => h === n || h.includes(n)));
  const addrCol = kind === 'EMAIL' ? find('email', 'e-mail', 'mail') : find('phone', 'mobile', 'number', 'contact', 'cell');
  const nameCol = find('name');
  const hasHeader = addrCol >= 0;

  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isPhone = /^\+?[0-9][0-9 ()\-.]{5,}$/;
  const valid = (v: string) => (kind === 'EMAIL' ? isEmail.test(v) : isPhone.test(v));

  const lines: string[] = [];
  let skipped = 0;
  for (const row of hasHeader ? rows.slice(1) : rows) {
    const address = (hasHeader ? row[addrCol] : row[0]) ?? '';
    const name = (hasHeader ? (nameCol >= 0 ? row[nameCol] : '') : row[1]) ?? '';
    if (!address) continue;
    if (!valid(address)) { skipped++; continue; }
    lines.push(name && !valid(name) ? `${name.replace(/[,;]/g, ' ')},${address}` : address);
  }
  return { lines, skipped };
}
