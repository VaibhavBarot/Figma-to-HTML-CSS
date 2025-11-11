import type { FigmaNode, TextStyle } from '../figma/types';
import { CSSProps, px } from './utils';

export function textNodeStyles(node: FigmaNode): CSSProps {
  const css: CSSProps = {};
  const s: TextStyle | undefined = (node as any).style;
  if (!s) return css;

  if (s.fontFamily) css.fontFamily = `'${s.fontFamily}', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif`;
  if (s.fontSize) css.fontSize = px(s.fontSize);
  if (s.fontWeight) css.fontWeight = String(s.fontWeight);
  if ((s as any).italic || String((s as any).fontStyle || '').toLowerCase().includes('italic')) css.fontStyle = 'italic';
  if (s.lineHeightPx) css.lineHeight = px(s.lineHeightPx);
  if (s.letterSpacing) css.letterSpacing = px(s.letterSpacing);

  if (s.textAlignHorizontal) {
    css.textAlign = s.textAlignHorizontal.toLowerCase();
  }

  const autoResize = (s as any).textAutoResize as string | undefined;
  if (autoResize && autoResize.includes('WIDTH')) {
    css.whiteSpace = 'nowrap';
  } else {
    css.whiteSpace = 'pre-wrap';
    (css as any).overflowWrap = 'anywhere';
    (css as any).wordBreak = 'break-word';
  }

  return css;
}

export function extractText(node: FigmaNode): string | undefined {
  const chars = (node as any).characters as string | undefined;
  return chars ?? undefined;
}

export function googleFontsHrefFromFamilies(families: Set<string>): string | undefined {
  if (families.size === 0) return undefined;
  const familyParam = Array.from(families)
    .map((f) => `family=${encodeURIComponent(f.replace(/\s+/g, '+'))}:wght@100;200;300;400;500;600;700;800;900`)
    .join('&');
  return `https://fonts.googleapis.com/css2?${familyParam}&display=swap`;
}
