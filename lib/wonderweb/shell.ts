/**
 * File: lib/wonderweb/shell.ts
 * Purpose: Shared HTML shell for WonderWeb pages: a pretend ".wonder" address bar and base styles.
 *          All pages are fictional; no real brand is imitated and forms never submit anywhere.
 * Author: manasa
 * Date: 2026-11-21
 */
const BASE_STYLES = `
  body{margin:0;font-family:Georgia,serif;background:#fdf6e3;color:#2a1a4a}
  .bar{background:#2a1a4a;color:#fdf6e3;padding:10px 16px;font:14px monospace}
  .bar b{background:#fdf6e3;color:#2a1a4a;padding:2px 8px;border-radius:4px}
  main{max-width:720px;margin:24px auto;padding:0 16px}
  .card{border:2px solid #8b5a2b;border-radius:8px;padding:16px;margin:16px 0;background:#fff}
  button{background:#c0392b;color:#fff;border:0;padding:10px 18px;font-size:16px;border-radius:6px}
  input{padding:8px;font-size:16px;margin:6px 0}
  .urgent{color:#c0392b;font-weight:bold}
`;

export interface ShellOptions {
  readonly title: string;
  readonly address: string;
  readonly body: string;
}

/** Wraps a page body in the shell. The address bar is plain text so the Rabbit can read it. */
export function renderShell({ title, address, body }: ShellOptions): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${title}</title>
<style>${BASE_STYLES}</style></head>
<body>
<div class="bar">Address: <b>${address}</b></div>
<main>${body}</main>
</body></html>`;
}
