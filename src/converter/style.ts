import type { Effect, FigmaNode, GradientPaint, SolidPaint } from '../figma/types';
import { CSSProps, px } from './utils';
import { rgbaToCss } from './color';
import { gradientToCss } from './gradient';

function rotateCornerRadii(
  radii: [number, number, number, number],
  rotationRad?: number
): [number, number, number, number] {
  if (!rotationRad) return radii;
  // Normalize to 0-360° range
  const deg = ((rotationRad * 180) / Math.PI) % 360;
  const normalized = deg < 0 ? deg + 360 : deg;
  // Round to nearest 90° for common rotations
  const quadrant = Math.round(normalized / 90) % 4;
  const [tl, tr, br, bl] = radii;
  switch (quadrant) {
    case 1: // 90° clockwise: [tl, tr, br, bl] → [bl, tl, tr, br]
      return [bl, tl, tr, br];
    case 2:
      return [br, bl, tl, tr];
    case 3:
      return [tr, br, bl, tl];
    default:
      return radii;
  }
}

export function nodeCommonStyles(node: FigmaNode): CSSProps {
  const css: CSSProps = {};

  if (node.opacity !== undefined && node.opacity < 1) {
    css.opacity = String(node.opacity);
  }

  if (node.rectangleCornerRadii && node.rectangleCornerRadii.length === 4) {
    const rotation = (node as any).rotation as number | undefined;
    const [tl, tr, br, bl] = rotateCornerRadii(node.rectangleCornerRadii, rotation);
    css.borderTopLeftRadius = px(tl);
    css.borderTopRightRadius = px(tr);
    css.borderBottomRightRadius = px(br);
    css.borderBottomLeftRadius = px(bl);
  } else if (node.cornerRadius) {
    css.borderRadius = px(node.cornerRadius);
  }

  const fillCss = fillsForNode(node);
  Object.assign(css, fillCss);

  const strokeCss = strokeToCss(node);
  Object.assign(css, strokeCss);

  const shadowCss = effectsToCss(node.effects ?? []);
  if (shadowCss.boxShadow) {
    css.boxShadow = css.boxShadow
      ? `${css.boxShadow}, ${shadowCss.boxShadow}`
      : shadowCss.boxShadow;
  }

  if ((node as any).clipsContent) {
    css.overflow = 'hidden';
  }

  return css;
}

function fillsForNode(node: FigmaNode): CSSProps {
  const css: CSSProps = {};
  const fills = node.fills ?? [];
  const visibleFills = fills.filter((f) => (f as any).visible !== false);
  if (visibleFills.length === 0) return css;

  const first = visibleFills[0];
  
  // Check for IMAGE fill first - never set background-color or fill for nodes with images
  if (node.type === 'IMAGE' || node.type === 'BOOLEAN_OPERATION' || node.type === 'VECTOR' || node.type === 'ELLIPSE' || node.type === 'POLYGON' || node.type === 'STAR' || node.type === 'LINE') {
    // Image will be handled via background-image in renderHtml.ts
    // Do not set any backgroundColor or fill here to avoid masking
    return css;
  }
  
  if (node.type === 'TEXT') {
    // Text fill maps to CSS color
    if (first.type === 'SOLID') {
      css.color = rgbaToCss(first.color, first.opacity);
      css.fill = rgbaToCss(first.color, first.opacity);
    } else if ((first as GradientPaint).gradientStops) {
      // Gradient text is complex; skip for now to avoid wrong background blocks
      // Future: use background-clip: text; -webkit-text-fill-color: transparent;
    }
  } else if (node.type === 'VECTOR') {
    // No background color for vectors
  } else {
    if (first.type === 'SOLID') {
      css.backgroundColor = rgbaToCss(first.color, first.opacity);
      css.fill = rgbaToCss(first.color, first.opacity);
    } else if ((first as GradientPaint).gradientStops) {
      const g = gradientToCss(first as GradientPaint);
      if (g) css.backgroundImage = g;
    }
  }
  return css;
}

function strokeToCss(node: FigmaNode): CSSProps {
  // Avoid adding strokes for nodes we rasterize or draw via SVG background
  if (
    node.type === 'VECTOR' ||
    node.type === 'ELLIPSE' ||
    node.type === 'POLYGON' ||
    node.type === 'STAR' ||
    node.type === 'LINE' ||
    node.type === 'BOOLEAN_OPERATION'
  ) {
    return {};
  }
  const css: CSSProps = {};
  const strokes = (node.strokes ?? []).filter((s) => (s as any).visible !== false) as SolidPaint[];
  if (!strokes.length || !node.strokeWeight) return css;
  const stroke = strokes[0];
  const color = rgbaToCss(stroke.color, stroke.opacity);
  const w = node.strokeWeight;
  const dashPattern: number[] | undefined = (node as any).dashPattern || (node as any).strokeDashes;
  const isDashed = Array.isArray(dashPattern) && dashPattern.length > 0;

  // If dashed, we render via inline SVG overlay (see traverse/renderHtml) – skip CSS borders here
  if (isDashed) {
    return css;
  }

  const individual = (node as any).individualStrokeWeights as
    | { top: number; right: number; bottom: number; left: number }
    | undefined;
  if (individual) {
    if (individual.top) css.borderTop = `${individual.top}px solid ${color}`;
    if (individual.right) css.borderRight = `${individual.right}px solid ${color}`;
    if (individual.bottom) css.borderBottom = `${individual.bottom}px solid ${color}`;
    if (individual.left) css.borderLeft = `${individual.left}px solid ${color}`;
    return css;
  }


  switch (node.strokeAlign) {
    case 'INSIDE':
      css.boxShadow = `${css.boxShadow ? css.boxShadow + ', ' : ''}inset 0 0 0 ${px(w)} ${color}`;
      break;
    case 'OUTSIDE':
      css.boxShadow = `${css.boxShadow ? css.boxShadow + ', ' : ''}0 0 0 ${px(w)} ${color}`;
      break;
    default:
      css.boxShadow = `${css.boxShadow ? css.boxShadow + ', ' : ''}0 0 0 ${px(w / 2)} ${color}, inset 0 0 0 ${px(w / 2)} ${color}`;
      break;
  }
  return css;
}

function effectsToCss(effects: Effect[]): CSSProps {
  const css: CSSProps = {};
  const parts: string[] = [];
  for (const eff of effects) {
    if ((eff as any).visible === false) continue;
    if (eff.type === 'DROP_SHADOW') {
      parts.push(`${px(eff.offset.x)} ${px(eff.offset.y)} ${px(eff.radius)} 0 ${rgbaToCss(eff.color)}`);
    } else if (eff.type === 'INNER_SHADOW') {
      parts.push(`inset ${px(eff.offset.x)} ${px(eff.offset.y)} ${px(eff.radius)} 0 ${rgbaToCss(eff.color)}`);
    }
  }
  if (parts.length) css.boxShadow = parts.join(', ');
  return css;
}
