/* Small line diff based on the longest common subsequence. Enough for prompts and JSON output. */

export type DiffOp = { type: "same" | "add" | "del"; text: string };
export type DiffRow = DiffOp | { type: "skip"; count: number };

const toLines = (s: string): string[] => (s === "" ? [] : s.split("\n"));

/** Lines of `a` that are gone are "del", lines only in `b` are "add". */
export function lineDiff(a: string, b: string): DiffOp[] {
  const A = toLines(a);
  const B = toLines(b);
  const n = A.length;
  const m = B.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const out: DiffOp[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      out.push({ type: "same", text: A[i] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ type: "del", text: A[i++] });
    } else {
      out.push({ type: "add", text: B[j++] });
    }
  }
  while (i < n) out.push({ type: "del", text: A[i++] });
  while (j < m) out.push({ type: "add", text: B[j++] });
  return out;
}

export function hasChanges(ops: DiffOp[]): boolean {
  return ops.some((o) => o.type !== "same");
}

/** Hide long unchanged runs, keeping `ctx` lines around every change. */
export function collapse(ops: DiffOp[], ctx = 2): DiffRow[] {
  const keep = new Array<boolean>(ops.length).fill(false);
  ops.forEach((o, idx) => {
    if (o.type === "same") return;
    for (let k = Math.max(0, idx - ctx); k <= Math.min(ops.length - 1, idx + ctx); k++) keep[k] = true;
  });
  const rows: DiffRow[] = [];
  let skipped = 0;
  ops.forEach((o, idx) => {
    if (keep[idx]) {
      if (skipped > 0) rows.push({ type: "skip", count: skipped });
      skipped = 0;
      rows.push(o);
    } else {
      skipped++;
    }
  });
  if (skipped > 0) rows.push({ type: "skip", count: skipped });
  return rows;
}

export interface SideLine {
  text: string;
  changed: boolean;
}

/** Two columns for a side by side view. Left shows removed lines, right shows added lines. */
export function sideBySide(a: string, b: string): { left: SideLine[]; right: SideLine[] } {
  const left: SideLine[] = [];
  const right: SideLine[] = [];
  for (const op of lineDiff(a, b)) {
    if (op.type === "same") {
      left.push({ text: op.text, changed: false });
      right.push({ text: op.text, changed: false });
    } else if (op.type === "del") {
      left.push({ text: op.text, changed: true });
    } else {
      right.push({ text: op.text, changed: true });
    }
  }
  return { left, right };
}
