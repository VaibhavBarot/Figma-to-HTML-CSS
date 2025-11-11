import type { FigmaFile, FigmaNode, SolidPaint } from '../figma/types';
import { nodeCommonStyles } from './style';
import { childPositionCss, nodeLayoutToCss } from './layout';
import { CSSProps } from './utils';
import { extractText, textNodeStyles } from './text';
import { rgbaToCss } from './color';

export interface ExportPlan {
  file: FigmaFile;
  page: FigmaNode; // page node contains children which are top-level frames/groups
  targets: FigmaNode[]; // nodes to render at top level
}

export interface RenderableNode {
  id: string;
  name: string;
  type: string;
  className: string;
  css: CSSProps;
  children: RenderableNode[];
  isAutoLayout: boolean;
  textContent?: string;
  fontFamily?: string;
  imageAssetPath?: string; // optional background-image fallback
  hasImageFill?: boolean;
  strokeOverlay?: {
    color: string;
    width: number;
    dashArray?: number[];
    radius?: number;
  };
  intrinsicSize?: { width: number; height: number };
}

export function buildExportPlan(
  file: FigmaFile,
  opts: { preferredPageName?: string; specificNodeId?: string }
): ExportPlan {
  const root = file.document;
  const pages: FigmaNode[] = (root as any).children ?? [];

  let page: FigmaNode | undefined;
  if (opts.preferredPageName) {
    page = pages.find((p: any) => p.name === opts.preferredPageName);
  }
  if (!page) page = pages[0];
  if (!page) throw new Error('No pages found in Figma file');

  let targets: FigmaNode[] = [];
  if (opts.specificNodeId) {
    const found = findNodeById(page, opts.specificNodeId);
    if (!found) throw new Error(`Node not found: ${opts.specificNodeId}`);
    targets = [found];
  } else {
    targets = ((page as any).children ?? []).filter((n: any) => (n.visible ?? true) !== false);
  }

  return { file, page, targets };
}

export function collectRenderableNodes(plan: ExportPlan): RenderableNode[] {
  return plan.targets.map((n) => toRenderable(n, false, undefined));
}

function toRenderable(
  node: FigmaNode,
  parentIsAutoLayout: boolean,
  parentBBox?: { x: number; y: number }
): RenderableNode {
  const className = cssClassForNode(node);
  const layout = nodeLayoutToCss(node);
  const baseCss = nodeCommonStyles(node);
  const childPosCss = childPositionCss(parentIsAutoLayout, node, parentBBox);
  const css: CSSProps = { ...layout.props, ...baseCss, ...childPosCss };

  const rawChildren: FigmaNode[] = (node as any).children ?? [];
  const children: RenderableNode[] = rawChildren
    .filter((c: any) => (c.visible ?? true) !== false)
    .map((c: FigmaNode) => toRenderable(c, layout.info.isAutoLayout, node.absoluteBoundingBox ? { x: node.absoluteBoundingBox.x, y: node.absoluteBoundingBox.y } : parentBBox));

  const r: RenderableNode = {
    id: node.id,
    name: node.name,
    type: node.type,
    className,
    css,
    children,
    isAutoLayout: layout.info.isAutoLayout,
  };

  if (node.type === 'TEXT') {
    r.textContent = extractText(node);
    const tcss = textNodeStyles(node);
    Object.assign(r.css, tcss);
    r.fontFamily = (node as any).style?.fontFamily;
  }

  // Mark nodes that contain image fills so we can rasterize them via images API
  const fills: any[] = (node as any).fills ?? [];
  if (fills.some((f) => f && f.type === 'IMAGE')) {
    (r as any).hasImageFill = true;
  }

  // Stroke overlay (inline SVG) for dashed strokes
  const strokes = ((node as any).strokes ?? []).filter((s: any) => (s?.visible ?? true) !== false) as SolidPaint[];
  const strokeWeight = (node as any).strokeWeight as number | undefined;
  const dashPattern: number[] | undefined = (node as any).dashPattern || (node as any).strokeDashes;
  if (strokes.length && strokeWeight && Array.isArray(dashPattern) && dashPattern.length > 0) {
    const color = rgbaToCss(strokes[0].color, (strokes[0] as any).opacity);
    const radius = (node as any).cornerRadius as number | undefined;
    r.strokeOverlay = { color, width: strokeWeight, dashArray: dashPattern, radius };
    if (!r.css.position) r.css.position = 'relative';
  }

  return r;
}

function cssClassForNode(node: FigmaNode): string {
  const safe = node.id.replace(/[^a-zA-Z0-9_-]/g, '');
  return `node-${safe}`;
}

function findNodeById(root: FigmaNode, id: string): FigmaNode | undefined {
  if (root.id === id) return root;
  const kids: FigmaNode[] = (root as any).children ?? [];
  for (const c of kids) {
    const f = findNodeById(c, id);
    if (f) return f;
  }
  return undefined;
}
