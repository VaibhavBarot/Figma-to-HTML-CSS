export type CSSProps = Record<string, string | number | undefined>;

export function cssPropsToString(props: CSSProps): string {
  return Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${k}: ${String(v)};`)
    .join(' ');
}

export function px(n?: number): string | undefined {
  if (n === undefined) return undefined;
  return `${Math.round(n)}px`;
}

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function toKebabCase(s: string): string {
  return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

export function styleObjectToCssClass(selector: string, props: CSSProps): string {
  const body = Object.entries(props)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `  ${toKebabCase(k)}: ${String(v)};`)
    .join('\n');
  return `${selector} {\n${body}\n}`;
}

export function shortenId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '').slice(-10);
}
