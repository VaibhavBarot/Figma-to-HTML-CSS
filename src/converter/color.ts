import type { RGBA } from '../figma/types';
import { clamp01 } from './utils';

export function rgbaToCss(color: RGBA, overrideOpacity?: number): string {
  const r = Math.round(clamp01(color.r) * 255);
  const g = Math.round(clamp01(color.g) * 255);
  const b = Math.round(clamp01(color.b) * 255);
  const a = overrideOpacity !== undefined ? clamp01(overrideOpacity) : clamp01(color.a);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
