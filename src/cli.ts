import 'dotenv/config';
import fs from 'fs/promises';
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { FigmaClient } from './figma/api';
import { buildExportPlan, collectRenderableNodes } from './converter/traverse';
import { renderToFiles } from './converter/renderHtml';
import { exportNodeImages } from './converter/image';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('file', { type: 'string', describe: 'Figma file key (or FIGMA_FILE_KEY env)' })
    .option('token', { type: 'string', describe: 'Figma personal access token (or FIGMA_TOKEN env)' })
    .option('page', { type: 'string', describe: 'Page name to export (default: first page)' })
    .option('node', { type: 'string', describe: 'Specific node id to export (default: top-level frames)' })
    .option('scale', { type: 'number', default: 2, describe: 'Image export scale (1..4)' })
    .option('out', { type: 'string', default: 'output', describe: 'Output directory' })
    .option('google-fonts', { type: 'boolean', default: false, describe: 'Attempt to include Google Fonts' })
    .strict()
    .help()
    .parse();

  const token = (argv.token as string | undefined) ?? process.env.FIGMA_TOKEN;
  if (!token) {
    console.error('Missing Figma token. Provide --token or set FIGMA_TOKEN in .env file.');
    process.exit(1);
  }

  const fileKey = (argv.file as string | undefined) ?? process.env.FIGMA_FILE_KEY;
  if (!fileKey) {
    console.error('Missing Figma file key. Provide --file or set FIGMA_FILE_KEY in .env file.');
    process.exit(1);
  }

  const outDir = path.resolve(process.cwd(), String(argv.out));
  await fs.mkdir(outDir, { recursive: true });
  await fs.mkdir(path.join(outDir, 'assets'), { recursive: true });

  const client = new FigmaClient(token);

  console.log('Fetching Figma file...');
  const file = await client.getFile(fileKey);

  const plan = buildExportPlan(file, {
    preferredPageName: argv.page as string | undefined,
    specificNodeId: argv.node as string | undefined,
  });

  const renderables = collectRenderableNodes(plan);

  console.log(`Exporting ${renderables.length} node(s) to images (for complex vectors)...`);
  await exportNodeImages(client, fileKey, renderables, {
    outDir,
    scale: Number(argv.scale ?? 2),
  });

  console.log('Rendering HTML/CSS...');
  await renderToFiles(renderables, {
    outDir,
    includeGoogleFonts: Boolean(argv['google-fonts']),
  });

  console.log(`Done. Open ${path.join(outDir, 'index.html')} in your browser.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
