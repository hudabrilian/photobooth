import { loadOpenCV } from '../detector/loader';

export function drawBlush(
  ctx: CanvasRenderingContext2D,
  landmarksList: any[][],
  width: number,
  height: number
): void {
  ctx.save();
  for (const landmarks of landmarksList) {
    if (!landmarks || landmarks.length < 350) continue;

    const getPixelPt = (idx: number) => ({
      x: landmarks[idx].x * width,
      y: landmarks[idx].y * height,
    });

    const leftCheek = getPixelPt(117);
    const rightCheek = getPixelPt(346);
    const leftCheekOuter = getPixelPt(234);
    const rightCheekOuter = getPixelPt(454);

    const faceWidth = Math.abs(rightCheekOuter.x - leftCheekOuter.x);
    const blushRadius = Math.max(faceWidth * 0.14, 12);

    const gradLeft = ctx.createRadialGradient(
      leftCheek.x, leftCheek.y, 0,
      leftCheek.x, leftCheek.y, blushRadius
    );
    gradLeft.addColorStop(0, 'rgba(255, 179, 186, 0.7)');
    gradLeft.addColorStop(1, 'rgba(255, 179, 186, 0)');
    ctx.fillStyle = gradLeft;
    ctx.beginPath();
    ctx.arc(leftCheek.x, leftCheek.y, blushRadius, 0, Math.PI * 2);
    ctx.fill();

    const gradRight = ctx.createRadialGradient(
      rightCheek.x, rightCheek.y, 0,
      rightCheek.x, rightCheek.y, blushRadius
    );
    gradRight.addColorStop(0, 'rgba(255, 179, 186, 0.7)');
    gradRight.addColorStop(1, 'rgba(255, 179, 186, 0)');
    ctx.fillStyle = gradRight;
    ctx.beginPath();
    ctx.arc(rightCheek.x, rightCheek.y, blushRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export async function drawWhiteOutline(
  ctx: CanvasRenderingContext2D,
  segmentationMask: Float32Array | Uint8Array,
  maskWidth: number,
  maskHeight: number,
  destWidth: number,
  destHeight: number,
  thickness = 8
): Promise<void> {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = maskWidth;
  maskCanvas.height = maskHeight;
  const maskCtx = maskCanvas.getContext('2d')!;
  const maskImgData = maskCtx.createImageData(maskWidth, maskHeight);

  for (let i = 0; i < segmentationMask.length; i++) {
    const val = segmentationMask[i];
    const isForeground = val > 0.2;
    const idx = i * 4;
    maskImgData.data[idx] = 255;
    maskImgData.data[idx + 1] = 255;
    maskImgData.data[idx + 2] = 255;
    maskImgData.data[idx + 3] = isForeground ? 255 : 0;
  }
  maskCtx.putImageData(maskImgData, 0, 0);

  ctx.save();
  try {
    const cv = await loadOpenCV();
    const srcMat = cv.imread(maskCanvas);
    const dilatedMat = new cv.Mat();
    const kernelSize = Math.max(3, Math.round(thickness));
    const M = cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(kernelSize, kernelSize));

    cv.dilate(srcMat, dilatedMat, M);

    const dilatedCanvas = document.createElement('canvas');
    dilatedCanvas.width = maskWidth;
    dilatedCanvas.height = maskHeight;
    cv.imshow(dilatedCanvas, dilatedMat);

    ctx.drawImage(dilatedCanvas, 0, 0, destWidth, destHeight);

    srcMat.delete();
    dilatedMat.delete();
    M.delete();
  } catch {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = destWidth;
    tempCanvas.height = destHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(maskCanvas, 0, 0, destWidth, destHeight);

    ctx.fillStyle = '#ffffff';
    for (let angle = 0; angle < 360; angle += 45) {
      const rad = (angle * Math.PI) / 180;
      const ox = Math.cos(rad) * thickness;
      const oy = Math.sin(rad) * thickness;
      ctx.drawImage(tempCanvas, ox, oy);
    }
  }
  ctx.restore();
}
