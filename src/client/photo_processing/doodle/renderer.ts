const svgCache: Record<string, HTMLImageElement> = {};

export function preloadSVG(path: string): Promise<HTMLImageElement> {
  const url = `/photo_processing/doodles/${path}.svg`;
  if (svgCache[url]) return Promise.resolve(svgCache[url]);

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      svgCache[url] = img;
      resolve(img);
    };
    img.onerror = () => {
      console.warn(`Failed to load SVG at: ${url}`);
      const fallbackImg = new Image();
      fallbackImg.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
      resolve(fallbackImg);
    };
    img.src = url;
  });
}

export function drawDoodleElement(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  size: number,
  rotation: number,
  opacity: number
): void {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x, y);
  ctx.rotate(rotation);
  // Center drawing
  ctx.drawImage(img, -size / 2, -size / 2, size, size);
  ctx.restore();
}
