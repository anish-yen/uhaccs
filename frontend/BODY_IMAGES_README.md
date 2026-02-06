# Body Heatmap Images

The body heatmap component uses PNG images as backgrounds for displaying muscle activation data.

## Required Images

Place the following PNG images in the `/public` directory:

- `body-male-front.png` - Male body front view
- `body-male-back.png` - Male body back view
- `body-female-front.png` - Female body front view
- `body-female-back.png` - Female body back view

## Image Specifications

- **Format**: PNG with transparency support
- **Recommended Size**: 300x420 pixels (or maintain similar aspect ratio)
- **Background**: Transparent or solid color that works with the dark theme
- **Content**: Human body silhouette/outline showing front or back view

## Fallback Behavior

If the PNG images are not found, the component will display a simple SVG fallback body outline. The heatmap circles will still function correctly over the fallback.

## Usage

The component automatically switches between images based on:
- **Gender toggle**: Male/Female
- **View toggle**: Front/Back

The heatmap circles are positioned as overlays on top of the PNG images using percentage-based coordinates for responsive scaling.

