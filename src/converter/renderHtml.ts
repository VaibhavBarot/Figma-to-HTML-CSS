import fs from 'fs/promises';
import path from 'path';
import { CSSProps, styleObjectToCssClass } from './utils';
import type { RenderableNode } from './traverse';
import { googleFontsHrefFromFamilies } from './text';

export async function renderToFiles(
  roots: RenderableNode[],
  opts: { outDir: string; includeGoogleFonts: boolean }
) {
  const cssParts: string[] = [];
  cssParts.push(baseCss());

  // Collect fonts if requested
  const fontFamilies = new Set<string>();

  // Generate CSS classes and HTML
  const htmlFrames = roots
    .map((r) => `<div class="frame">${renderNode(r, cssParts, fontFamilies)}</div>`) 
    .join('\n');

  const css = cssParts.join('\n\n');
  await fs.writeFile(path.join(opts.outDir, 'styles.css'), css, 'utf8');

  const fontsHref = opts.includeGoogleFonts ? googleFontsHrefFromFamilies(fontFamilies) : undefined;
  const html = htmlDoc(htmlFrames, fontsHref);
  await fs.writeFile(path.join(opts.outDir, 'index.html'), html, 'utf8');
}

function baseCss(): string {
  return `/* Reset */
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; background: #fff; color: #000; }

/* Frame container */
.frame { margin: 24px; display: inline-block; position: relative; }
`;
}

function renderNode(node: RenderableNode, cssParts: string[], fontFamilies: Set<string>): string {
  const selector = `.${node.className}`;
  const cssForNode: CSSProps = { ...node.css };

  if (node.imageAssetPath && node.type !== 'TEXT') {
    cssForNode.backgroundImage = `url('${node.imageAssetPath}')`;
    cssForNode.backgroundRepeat = 'no-repeat';
    const vectorTypes = new Set(['VECTOR', 'ELLIPSE', 'POLYGON', 'REGULAR_POLYGON', 'STAR', 'LINE', 'BOOLEAN_OPERATION']);
    const componentTypes = new Set(['COMPONENT', 'GROUP', 'INSTANCE', 'FRAME']);
    if (vectorTypes.has(node.type) || componentTypes.has(node.type)) {
      cssForNode.backgroundSize = 'contain';
      cssForNode.backgroundPosition = 'center';
    } else {
      cssForNode.backgroundSize = cssForNode.backgroundSize || 'cover';
    }
    if ('backgroundColor' in cssForNode) delete (cssForNode as any).backgroundColor;
    if ('fill' in cssForNode) delete (cssForNode as any).fill;
    if ('boxShadow' in cssForNode) delete (cssForNode as any).boxShadow;
    if ('border' in cssForNode) delete (cssForNode as any).border;
    if ('borderTop' in cssForNode) delete (cssForNode as any).borderTop;
    if ('borderRight' in cssForNode) delete (cssForNode as any).borderRight;
    if ('borderBottom' in cssForNode) delete (cssForNode as any).borderBottom;
    if ('borderLeft' in cssForNode) delete (cssForNode as any).borderLeft;
    
    if (componentTypes.has(node.type)) {
      cssForNode.overflow = 'visible';
    }
  }

  const needsWidth = !cssForNode.width || String(cssForNode.width) === '0px';
  const needsHeight = !cssForNode.height || String(cssForNode.height) === '0px';
  if (node.intrinsicSize) {
    if (needsWidth) cssForNode.width = `${Math.round(node.intrinsicSize.width)}px`;
    if (needsHeight) cssForNode.height = `${Math.round(node.intrinsicSize.height)}px`;
  }

  cssParts.push(styleObjectToCssClass(selector, cssForNode));

  if (node.fontFamily) fontFamilies.add(node.fontFamily);

  // If this node has an image asset (exported as component/group/frame), skip rendering individual children
  // that are part of the parent export (they won't have their own imageAssetPath)
  const childrenToRender = node.imageAssetPath
    ? node.children.filter(c => {
        const isComponentOrGroup = node.type === 'COMPONENT' || node.type === 'GROUP' || node.type === 'INSTANCE';
        const isPngExport = node.imageAssetPath?.endsWith('.png');
        
        if (isComponentOrGroup && isPngExport) {
          return false;
        }
        
        if (c.type === 'VECTOR' && c.imageAssetPath === undefined) return false;
        if (c.type === 'BOOLEAN_OPERATION' && c.imageAssetPath === undefined) return false;
        return true;
      })
    : node.children;
  const childrenHtml = childrenToRender.map((c) => renderNode(c, cssParts, fontFamilies)).join('');
  const tag = node.type === 'TEXT' ? 'div' : 'div';

  const content = node.textContent ? escapeHtml(node.textContent) : '';
  const strokeOverlay = node.strokeOverlay ? inlineStrokeSvg(node) : '';
  return `<${tag} class="${node.className}">${content}${childrenHtml}${strokeOverlay}</${tag}>`;
}

function htmlDoc(bodyInner: string, fontsHref?: string): string {
  const fontsLink = fontsHref ? `\n<link rel="stylesheet" href="${fontsHref}">` : '';
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Figma to HTML Export</title>
    <link rel="stylesheet" href="styles.css">${fontsLink}
  </head>
  <body>
    ${bodyInner}
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function inlineStrokeSvg(node: RenderableNode): string {
  const s = node.strokeOverlay!;
  const dash = s.dashArray?.length ? ` stroke-dasharray="${s.dashArray.join(',')}"` : '';
  const radius = s.radius ? ` rx="${s.radius}" ry="${s.radius}"` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false" style="position:absolute;inset:0;pointer-events:none;width:100%;height:100%">
  <rect x="0" y="0" width="100%" height="100%" fill="none" stroke="${s.color}" stroke-width="${s.width}" vector-effect="non-scaling-stroke"${dash}${radius} />
</svg>`;
}
