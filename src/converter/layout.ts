import type { FigmaNode } from '../figma/types';
import { CSSProps, px } from './utils';

export interface LayoutInfo {
  isAutoLayout: boolean;
}

export function nodeLayoutToCss(node: FigmaNode): { props: CSSProps; info: LayoutInfo } {
  const props: CSSProps = {};
  let isAutoLayout = false;

  if ((node as any).layoutMode && (node as any).layoutMode !== 'NONE') {
    isAutoLayout = true;
    const layoutMode = (node as any).layoutMode as 'HORIZONTAL' | 'VERTICAL';
    props.display = 'flex';
    props.flexDirection = layoutMode === 'HORIZONTAL' ? 'row' : 'column';
    props.position = 'relative';
    const gap = (node as any).itemSpacing as number | undefined;
    if (gap !== undefined) props.gap = px(gap);
    props.paddingLeft = px((node as any).paddingLeft ?? 0);
    props.paddingRight = px((node as any).paddingRight ?? 0);
    props.paddingTop = px((node as any).paddingTop ?? 0);
    props.paddingBottom = px((node as any).paddingBottom ?? 0);

    // Alignment mapping
    const primary = (node as any).primaryAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN' | undefined;
    const counter = (node as any).counterAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | undefined;
    if (primary) {
      props.justifyContent = mapPrimary(primary);
    }
    if (counter) {
      props.alignItems = mapCounter(counter);
    }
  } else {
    props.position = 'relative';
  }

  const bbox = node.absoluteBoundingBox;
  if (bbox) {
    props.width = px(bbox.width);
    props.height = px(bbox.height);
  }

  return { props, info: { isAutoLayout } };
}

export function childPositionCss(
  parentIsAutoLayout: boolean,
  node: FigmaNode,
  parentBBox?: { x: number; y: number }
): CSSProps {
  const props: CSSProps = {};
  const isAbsoluteChild = (node as any).layoutPositioning === 'ABSOLUTE';
  if ((!parentIsAutoLayout || isAbsoluteChild) && node.absoluteBoundingBox) {
    props.position = 'absolute';
    const left = parentBBox ? node.absoluteBoundingBox.x - parentBBox.x : node.absoluteBoundingBox.x;
    const top = parentBBox ? node.absoluteBoundingBox.y - parentBBox.y : node.absoluteBoundingBox.y;
    props.left = px(left);
    props.top = px(top);
    props.width = px(node.absoluteBoundingBox.width);
    props.height = px(node.absoluteBoundingBox.height);
  } else if (parentIsAutoLayout) {
    // Respect child auto-layout hints
    const align = (node as any).layoutAlign as 'INHERIT' | 'STRETCH' | undefined;
    if (align === 'STRETCH') props.alignSelf = 'stretch';

    const grow = (node as any).layoutGrow as number | undefined;
    if (typeof grow === 'number' && grow > 0) props.flexGrow = String(grow);

    const sizeH = (node as any).layoutSizingHorizontal as 'FILL' | 'HUG' | 'FIXED' | undefined;
    if (sizeH === 'FILL') props.width = '100%';
    const sizeV = (node as any).layoutSizingVertical as 'FILL' | 'HUG' | 'FIXED' | undefined;
    if (sizeV === 'FILL') props.height = '100%';
  }
  return props;
}

function mapPrimary(v: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'): string {
  switch (v) {
    case 'MIN':
      return 'flex-start';
    case 'CENTER':
      return 'center';
    case 'MAX':
      return 'flex-end';
    case 'SPACE_BETWEEN':
      return 'space-between';
    default:
      return 'flex-start';
  }
}

function mapCounter(v: 'MIN' | 'CENTER' | 'MAX'): string {
  switch (v) {
    case 'MIN':
      return 'flex-start';
    case 'CENTER':
      return 'center';
    case 'MAX':
      return 'flex-end';
    default:
      return 'stretch';
  }
}
