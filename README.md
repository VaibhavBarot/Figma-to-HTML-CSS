## Figma-to-HTML/CSS Converter

A CLI that converts Figma files into HTML/CSS using the Figma REST API. It aims to generalize to arbitrary mocks by mapping Figma nodes (frames, groups, vectors, text) into HTML elements with CSS for Auto Layout, fills, gradients, strokes, shadows, images, and text.

### Requirements
- Node.js >= 18 (uses global `fetch`)

### Setup
```bash
npm install
```

### Configuration

Create a `.env` file in the project root:

```bash
# Figma Personal Access Token
# Get yours from: https://www.figma.com/developers/api#access-tokens
FIGMA_TOKEN=your_figma_token_here

# Figma File Key
# Extract from the Figma file URL: https://www.figma.com/file/{FILE_KEY}/...
FIGMA_FILE_KEY=your_figma_file_key_here
```

### Usage
```bash
# Run with npm (uses values from .env file by default)
npm run dev [--page <page-name>] [--node <node-id>]
```

Flags:
- `--file`: Figma file key (from the share URL, or set `FIGMA_FILE_KEY` in `.env`)
- `--token`: Figma token (or set `FIGMA_TOKEN` in `.env`)
- `--page`: Page name to export (default: first page)
- `--node`: Specific node id to export (default: all top-level frames in page)
- `--scale`: Image export scale (default: 2)
- `--out`: Output directory (default: `output`)
- `--google-fonts`: Try to include Google Fonts for detected families (default: false)

### Output
- `output/index.html` – Generated HTML with structure
- `output/styles.css` – Consolidated stylesheet
- `output/assets/` – Exported images

### Notes
- **Gradients and strokes**: These may look slightly different from Figma. CSS doesn't support all stroke positions (inside/outside/center), so we use shadows to approximate them.
- **Complex shapes**: Shapes that can't be made with simple CSS are exported as images instead.
- **Fonts**: The converter tries to match fonts by name and weight. Use `--google-fonts` to load fonts from Google Fonts when available. Otherwise, your system fonts will be used.

### Known Limitations
- **Boolean operations**: Complex shapes made with boolean operations (like cutting out shapes) are exported as images, not CSS.
- **Gradients**: Very complex gradients might not look exactly the same as in Figma.
- **Mixed text styles**: If a text box has some words in bold and others in regular, it may not render perfectly.


