import type { GradientPaint } from '../figma/types';
import { rgbaToCss } from './color';

// Approximate conversion from Figma gradient transform to CSS linear-gradient angle
function gradientAngleDegrees(paint: GradientPaint): number {
  // Figma uses a 2x3 matrix [ [a, b, c], [d, e, f] ], where [a,d] is x axis, [b,e] is y axis
  const t = (paint as any).gradientTransform as
    | [[number, number, number], [number, number, number]]
    | undefined;
  if (!t || !Array.isArray(t) || !t[0] || !t[1]) {
    return 180; // sensible default: to bottom
  }
  const a = typeof t[0][0] === 'number' ? t[0][0] : 1;
  const d = typeof t[1][0] === 'number' ? t[1][0] : 0;
  const angleRad = Math.atan2(d, a);
  let angleDeg = (angleRad * 180) / Math.PI;
  if (!isFinite(angleDeg)) angleDeg = 180;
  return angleDeg;
}

export function gradientToCss(paint: GradientPaint): string | undefined {
  if (!paint.gradientStops || paint.gradientStops.length === 0) return undefined;
  const stops = paint.gradientStops
    .sort((s1, s2) => s1.position - s2.position)
    .map((s) => `${rgbaToCss(s.color)} ${Math.round(s.position * 100)}%`)
    .join(', ');

  switch (paint.type) {
    case 'GRADIENT_LINEAR': {
      const angle = Math.round(gradientAngleDegrees(paint));
      return `linear-gradient(${angle}deg, ${stops})`;
    }
    case 'GRADIENT_RADIAL':
    case 'GRADIENT_ANGULAR':
    case 'GRADIENT_DIAMOND': {
      // Approximate with radial; angular/diamond not directly supported in CSS
      return `radial-gradient(circle, ${stops})`;
    }
    default:
      return undefined;
  }
}
