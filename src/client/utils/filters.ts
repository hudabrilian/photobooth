export const CSS_FILTERS: Record<string, string> = {
  none: 'grayscale(100%) contrast(150%)',
  grayscale: 'grayscale(100%)',
  sepia: 'sepia(80%) contrast(120%)',
  contrast: 'grayscale(100%) contrast(200%)',
  vivid: 'saturate(150%) contrast(130%)',
  cool: 'sepia(20%) saturate(80%) hue-rotate(180deg) brightness(1.1)',
};

export function applyFilterToImageData(
  imgData: ImageData,
  filterName: string
): ImageData {
  const filterCSS = CSS_FILTERS[filterName];
  if (!filterCSS || filterName === 'none') return imgData;

  const off = new OffscreenCanvas(imgData.width, imgData.height);
  const offCtx = off.getContext('2d')!;
  offCtx.filter = filterCSS;
  offCtx.putImageData(imgData, 0, 0);
  offCtx.drawImage(off, 0, 0);
  return offCtx.getImageData(0, 0, imgData.width, imgData.height);
}
