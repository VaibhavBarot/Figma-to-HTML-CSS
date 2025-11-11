// Minimal Figma REST API types used by the converter

export interface FigmaFileResponse {
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  document: FigmaNode;
  components: Record<string, unknown>;
  styles: Record<string, unknown>;
}

export type FigmaFile = FigmaFileResponse;

export interface FigmaFileNodesResponse {
  name: string;
  nodes: Record<string, { document: FigmaNode; components: Record<string, unknown>; styles: Record<string, unknown> }>;
}

export interface FigmaImageResponse {
  err?: string;
  images: Record<string, string | null>;
}

export type FigmaNode = FigmaBaseNode & (ContainerNode | LeafNode);

export interface FigmaBaseNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  rotation?: number;
  absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
  constraints?: { horizontal: string; vertical: string };
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'CENTER' | 'OUTSIDE';
  effects?: Effect[];
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  opacity?: number;
}

export interface ContainerNode {
  children: FigmaNode[];
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE';
  primaryAxisSizingMode?: 'AUTO' | 'FIXED';
  counterAxisSizingMode?: 'AUTO' | 'FIXED';
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  clipsContent?: boolean;
}

export interface LeafNode {
  characters?: string;
  style?: TextStyle;
}

export interface TextStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontWeight?: number;
  fontSize?: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
}

export type Paint = SolidPaint | GradientPaint | ImagePaint;

export interface SolidPaint {
  type: 'SOLID';
  color: RGBA;
  opacity?: number;
  visible?: boolean;
}

export interface GradientPaint {
  type: 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND';
  gradientStops: { position: number; color: RGBA }[];
  gradientTransform: [[number, number, number], [number, number, number]];
  opacity?: number;
  visible?: boolean;
}

export interface ImagePaint {
  type: 'IMAGE';
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageRef?: string; // if available
  opacity?: number;
  visible?: boolean;
}

export interface RGBA { r: number; g: number; b: number; a: number };

export type Effect = ShadowEffect | InnerShadowEffect | BlurEffect;

export interface ShadowEffect {
  type: 'DROP_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  radius: number;
  visible?: boolean;
}

export interface InnerShadowEffect {
  type: 'INNER_SHADOW';
  color: RGBA;
  offset: { x: number; y: number };
  radius: number;
  visible?: boolean;
}

export interface BlurEffect {
  type: 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  radius: number;
  visible?: boolean;
}


