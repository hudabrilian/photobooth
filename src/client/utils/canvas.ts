import { getTemplateConfig } from './templates';

export function imageDataToBase64(imgData: ImageData, quality = 0.92): Promise<string> {
  const c = new OffscreenCanvas(imgData.width, imgData.height);
  const ctx = c.getContext('2d')!;
  ctx.putImageData(imgData, 0, 0);
  return c.convertToBlob({ type: 'image/jpeg', quality }).then((blob) => {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  });
}

export function imageDataToBase64Sync(imgData: ImageData): string {
  const c = document.createElement('canvas');
  c.width = imgData.width;
  c.height = imgData.height;
  const ctx = c.getContext('2d')!;
  ctx.putImageData(imgData, 0, 0);
  return c.toDataURL('image/jpeg', 0.92);
}

export function drawImageDataInRect(
  ctx: CanvasRenderingContext2D,
  imgData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const off = new OffscreenCanvas(imgData.width, imgData.height);
  const offCtx = off.getContext('2d')!;
  offCtx.putImageData(imgData, 0, 0);

  const srcAspect = imgData.width / imgData.height;
  const dstAspect = w / h;
  let sx = 0;
  let sy = 0;
  let sw = imgData.width;
  let sh = imgData.height;

  if (srcAspect > dstAspect) {
    sw = imgData.height * dstAspect;
    sx = (imgData.width - sw) / 2;
  } else {
    sh = imgData.width / dstAspect;
    sy = (imgData.height - sh) / 2;
  }

  ctx.drawImage(off, sx, sy, sw, sh, x, y, w, h);
}

const FRAME_SOURCES: Record<string, string> = {
  frame1: 'assets/1.png',
  frame2: 'assets/2.png',
};

const frameImages: Record<string, HTMLImageElement | null> = {
  frame1: null,
  frame2: null,
};

export function preloadFrames(): Promise<void[]> {
  return Promise.all(
    Object.entries(FRAME_SOURCES).map(([id, src]) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { frameImages[id] = img; resolve(); };
        img.onerror = () => { console.warn(`Failed to load frame: ${src}`); resolve(); };
        img.src = src;
      });
    })
  );
}

export function renderComposedPhoto(
  canvas: HTMLCanvasElement,
  imgArray: ImageData[],
  templateId: string
): void {
  const tpl = getTemplateConfig(templateId);
  const { canvasW: W, canvasH: H, slots } = tpl;

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  if (!slots || slots.length === 0) return;

  for (let i = 0; i < slots.length; i++) {
    const slot = slots[i];
    if (imgArray && imgArray[i]) {
      drawImageDataInRect(ctx, imgArray[i], slot.x, slot.y, slot.w, slot.h);
    } else {
      ctx.fillStyle = '#e0e0e0';
      ctx.fillRect(slot.x, slot.y, slot.w, slot.h);
    }
  }

  const frame = frameImages[templateId];
  if (frame) {
    ctx.drawImage(frame, 0, 0, W, H);
  }
}

export function captureFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): ImageData {
  const vw = video.videoWidth || 640;
  const vh = video.videoHeight || 480;
  canvas.width = vw;
  canvas.height = vh;
  const ctx = canvas.getContext('2d')!;

  ctx.save();
  ctx.translate(vw, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, vw, vh);
  ctx.restore();

  return ctx.getImageData(0, 0, vw, vh);
}
