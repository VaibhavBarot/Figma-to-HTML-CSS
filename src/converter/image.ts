import fs from 'fs/promises';
import path from 'path';
import type { FigmaClient } from '../figma/api';
import type { RenderableNode } from './traverse';

function collectImageTargets(
  nodes: RenderableNode[],
  out: { vectorIds: Set<string>; bitmapIds: Set<string> },
  skipChildren: Set<string> = new Set()
) {
  for (const n of nodes) {
    // If this node's children are being exported as a group, skip individual children
    if (skipChildren.has(n.id)) continue;
    
    const hasMultipleVectors = n.children.filter(c => c.type === 'VECTOR').length > 1;
    const isComponentOrGroup = n.type === 'COMPONENT' || n.type === 'GROUP' || n.type === 'INSTANCE';
    
    const hasBooleanOps = n.children.some(c => c.type === 'BOOLEAN_OPERATION');
    const isFrameWithBooleans = n.type === 'FRAME' && hasBooleanOps;
    
    const hasFramesWithBooleans = isComponentOrGroup && n.children.some(c => {
      if (c.type === 'FRAME') {
        return c.children.some(gc => gc.type === 'BOOLEAN_OPERATION');
      }
      return false;
    });
    
    if (hasFramesWithBooleans) {
      // Export the parent GROUP/COMPONENT/INSTANCE as PNG to preserve boolean operations and layering
      out.bitmapIds.add(n.id);
      // Mark all children to skip individual export
      n.children.forEach(c => skipChildren.add(c.id));
    } else if (isFrameWithBooleans) {
      // Export the parent FRAME as PNG to preserve boolean operations
      out.bitmapIds.add(n.id);
      n.children.forEach(c => {
        if (c.type === 'BOOLEAN_OPERATION') skipChildren.add(c.id);
      });
    } else if (isComponentOrGroup && hasMultipleVectors) {
      // Export the parent component/group as a single SVG to preserve alignment
      out.vectorIds.add(n.id);
      // Mark all vector children to skip individual export
      n.children.forEach(c => {
        if (c.type === 'VECTOR') skipChildren.add(c.id);
      });
    } else if (n.type === 'VECTOR') {
      out.vectorIds.add(n.id);
    } else if (shouldRasterize(n) || (n as any).hasImageFill === true) {
      out.bitmapIds.add(n.id);
    }
    
    collectImageTargets(n.children, out, skipChildren);
  }
}

function shouldRasterize(n: RenderableNode): boolean {
  // Rasterize common vector-like or complex nodes; keep TEXT as DOM text
  const vectorish = new Set([
    'VECTOR',
    'ELLIPSE',
    'POLYGON',
    'STAR',
    'LINE',
    'BOOLEAN_OPERATION',
  ]);
  if (vectorish.has(n.type)) return true;
  // If node has an image fill in Figma, we need an image asset
  // Heuristic: when the converter attached an image fill, renderer will expect imageAssetPath
  if ((n as any).hasImageFill === true) return true;
  if (!n.children.length && !n.textContent && n.type !== 'RECTANGLE' && n.type !== 'FRAME' && n.type !== 'GROUP') {
    return true;
  }
  return false;
}

export async function exportNodeImages(
  client: FigmaClient,
  fileKey: string,
  nodes: RenderableNode[],
  opts: { outDir: string; scale: number }
): Promise<Map<string, string>> {
  const targets = { vectorIds: new Set<string>(), bitmapIds: new Set<string>() };
  collectImageTargets(nodes, targets);
  if (targets.vectorIds.size === 0 && targets.bitmapIds.size === 0) return new Map();

  const outMap = new Map<string, string>();
  const sizeMap = new Map<string, { width: number; height: number }>();

  // Fetch bitmaps (PNG)
  if (targets.bitmapIds.size > 0) {
    const bitmapList = Array.from(targets.bitmapIds);
    const imagesResp = await client.getImages(fileKey, bitmapList, { format: 'png', scale: opts.scale });
    await Promise.all(
      bitmapList.map(async (id) => {
        const url = imagesResp.images[id];
        if (!url) return;
        const res = await fetch(url);
        if (!res.ok) return;
        const buf = Buffer.from(await res.arrayBuffer());
        const fileName = `${id}.png`;
        const filePath = path.join(opts.outDir, 'assets', fileName);
        await fs.writeFile(filePath, buf);
        outMap.set(id, `assets/${fileName}`);
      })
    );
  }

  // Fetch vectors (SVG)
  if (targets.vectorIds.size > 0) {
    const vectorList = Array.from(targets.vectorIds);
    const svgsResp = await client.getImages(fileKey, vectorList, { format: 'svg' });
    await Promise.all(
      vectorList.map(async (id) => {
        const url = svgsResp.images[id];
        if (!url) return;
        const res = await fetch(url);
        if (!res.ok) return;
        const svg = await res.text();
        const fileName = `${id}.svg`;
        const filePath = path.join(opts.outDir, 'assets', fileName);
        await fs.writeFile(filePath, svg, 'utf8');
        outMap.set(id, `assets/${fileName}`);
        const size = parseSvgSize(svg);
        if (size) sizeMap.set(id, size);
      })
    );
  }

  attachImages(nodes, outMap, sizeMap);
  return outMap;
}

function attachImages(
  nodes: RenderableNode[],
  map: Map<string, string>,
  sizeMap: Map<string, { width: number; height: number }>
) {
  for (const n of nodes) {
    const asset = map.get(n.id);
    if (asset) {
      n.imageAssetPath = asset;
      const size = sizeMap.get(n.id);
      if (size) n.intrinsicSize = size;
      
      // If parent component/group was exported, don't attach assets to individual children
      const isComponentOrGroup = n.type === 'COMPONENT' || n.type === 'GROUP' || n.type === 'INSTANCE';
      if (isComponentOrGroup) {
        const isPngExport = map.get(n.id)?.endsWith('.png');
        if (isPngExport) {
          n.children.forEach(c => {
            c.imageAssetPath = undefined;
            c.intrinsicSize = undefined;
          });
        } else {
          n.children.forEach(c => {
            if (c.type === 'VECTOR') {
              c.imageAssetPath = undefined;
              c.intrinsicSize = undefined;
            }
          });
        }
      }
      
      if (n.type === 'FRAME') {
        n.children.forEach(c => {
          if (c.type === 'BOOLEAN_OPERATION') {
            c.imageAssetPath = undefined;
            c.intrinsicSize = undefined;
          }
        });
      }
    }
    attachImages(n.children, map, sizeMap);
  }
}

function parseSvgSize(svg: string): { width: number; height: number } | undefined {
  const widthMatch = svg.match(/\bwidth\s*=\s*"([^"]+)"/i);
  const heightMatch = svg.match(/\bheight\s*=\s*"([^"]+)"/i);
  const viewBoxMatch = svg.match(/\bviewBox\s*=\s*"([\d\.\s-]+)"/i);
  const parseDim = (v: string) => {
    const m = v.trim().match(/([\d\.]+)/);
    return m ? Number(m[1]) : NaN;
  };
  let width = widthMatch ? parseDim(widthMatch[1]) : NaN;
  let height = heightMatch ? parseDim(heightMatch[1]) : NaN;
  if (!isFinite(width) || !isFinite(height)) {
    if (viewBoxMatch) {
      const parts = viewBoxMatch[1].trim().split(/\s+/);
      if (parts.length === 4) {
        width = Number(parts[2]);
        height = Number(parts[3]);
      }
    }
  }
  if (isFinite(width) && isFinite(height) && width > 0 && height > 0) {
    return { width, height };
  }
  return undefined;
}
