import { getFaceLandmarker } from '../detector/face_landmarker';
import { getSelfieSegmenter } from '../detector/selfie_segmenter';
import { ThemeManager } from './themes';
import { evaluateRules, autoSelectTheme, RuleInput } from './rules';
import { getPlacementPoints, isPointInExclusionZone } from './placement';
import { getRandomizedProps } from './randomizer';
import { preloadSVG, drawDoodleElement } from './renderer';
import { drawBlush, drawWhiteOutline } from './generators';

export interface SmartDoodleOptions {
  themeId: string; // 'auto' or specific theme ID
  outlineThickness?: number;
}

export async function applySmartDoodles(
  imgData: ImageData,
  options: SmartDoodleOptions
): Promise<ImageData> {
  const { width, height } = imgData;

  // Initialize Detectors
  let landmarker;
  let segmenter;
  try {
    landmarker = await getFaceLandmarker();
  } catch (err) {
    console.error('Failed to load Face Landmarker, skipping doodles:', err);
    return imgData;
  }

  // Detect Face Landmarks & Blendshapes
  const landmarkerResult = landmarker.detect(imgData);
  const faces = landmarkerResult.faceLandmarks || [];
  const blendshapesList = landmarkerResult.faceBlendshapes || [];

  // Calculate Smile Score & Couple status
  let totalSmile = 0;
  for (const bs of blendshapesList) {
    const smileLeft = bs.categories.find(c => c.categoryName === 'mouthSmileLeft')?.score || 0;
    const smileRight = bs.categories.find(c => c.categoryName === 'mouthSmileRight')?.score || 0;
    totalSmile += (smileLeft + smileRight) / 2;
  }
  const avgSmileScore = faces.length > 0 ? totalSmile / faces.length : 0;

  const ruleInput: RuleInput = {
    numFaces: faces.length,
    smileScore: avgSmileScore,
    isCouple: faces.length === 2,
  };

  // Determine active theme
  await ThemeManager.loadThemes();
  const themeId = options.themeId === 'auto' ? autoSelectTheme(ruleInput) : options.themeId;
  const baseTheme = ThemeManager.getTheme(themeId) || ThemeManager.getTheme('korean')!;

  // Run Rule Engine to adjust parameters
  const activeTheme = evaluateRules(ruleInput, baseTheme);

  // Setup offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Step 1: Draw the base image
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d')!;
  tempCtx.putImageData(imgData, 0, 0);
  ctx.drawImage(tempCanvas, 0, 0);

  // Run Segmentation (if outline is enabled)
  if (activeTheme.outline) {
    try {
      segmenter = await getSelfieSegmenter();
      const segmenterResult = segmenter.segment(imgData);
      if (segmenterResult && segmenterResult.categoryMask) {
        const maskData = segmenterResult.categoryMask.getAsFloat32Array();
        const maskWidth = segmenterResult.categoryMask.width;
        const maskHeight = segmenterResult.categoryMask.height;

        // Clear canvas and draw background
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#ffffff'; // clean white background or keep background? Let's keep original image as background
        ctx.drawImage(tempCanvas, 0, 0);

        // Draw White Outline (dilated mask)
        await drawWhiteOutline(
          ctx,
          maskData,
          maskWidth,
          maskHeight,
          width,
          height,
          options.outlineThickness || 10
        );

        // Draw cropped person on top of outline
        const personCanvas = document.createElement('canvas');
        personCanvas.width = width;
        personCanvas.height = height;
        const personCtx = personCanvas.getContext('2d')!;

        // Draw original image
        personCtx.drawImage(tempCanvas, 0, 0);

        // Clip with mask
        const maskImageCanvas = document.createElement('canvas');
        maskImageCanvas.width = maskWidth;
        maskImageCanvas.height = maskHeight;
        const maskImgCtx = maskImageCanvas.getContext('2d')!;
        const maskImgData = maskImgCtx.createImageData(maskWidth, maskHeight);
        for (let i = 0; i < maskData.length; i++) {
          const val = maskData[i];
          const isForeground = val > 0.2;
          const idx = i * 4;
          maskImgData.data[idx] = 255;
          maskImgData.data[idx + 1] = 255;
          maskImgData.data[idx + 2] = 255;
          maskImgData.data[idx + 3] = isForeground ? 255 : 0;
        }
        maskImgCtx.putImageData(maskImgData, 0, 0);

        personCtx.globalCompositeOperation = 'destination-in';
        personCtx.drawImage(maskImageCanvas, 0, 0, width, height);

        ctx.drawImage(personCanvas, 0, 0);
      }
    } catch (_segErr) {
      console.warn('Failed to perform outline segmentation:', _segErr);
    }
  }

  // Step 2: Draw Blush
  if (activeTheme.blush && faces.length > 0) {
    drawBlush(ctx, faces, width, height);
  }

  // Step 3: Draw Doodles
  if (activeTheme.elements.length > 0) {
    const placementPoints = getPlacementPoints(faces, width, height);
    
    // Preload SVG assets
    const loadedImages: Record<string, HTMLImageElement> = {};
    await Promise.all(
      activeTheme.elements.map(async (elPath) => {
        const img = await preloadSVG(elPath);
        loadedImages[elPath] = img;
      })
    );

    // Limit elements to max_elements config
    const limit = Math.min(placementPoints.length, activeTheme.max_elements);
    let drawnCount = 0;

    for (const pt of placementPoints) {
      if (drawnCount >= limit) break;

      // Ensure doodles don't overlap with critical areas (eyes, mouth, nose)
      if (isPointInExclusionZone(pt.x, pt.y, faces, width, height)) {
        continue;
      }

      const randomElement = activeTheme.elements[Math.floor(Math.random() * activeTheme.elements.length)];
      const img = loadedImages[randomElement];
      if (!img) continue;

      const rProps = getRandomizedProps(12);
      const px = pt.x + rProps.offsetX;
      const py = pt.y + rProps.offsetY;
      const size = pt.targetSize * rProps.scale;

      drawDoodleElement(
        ctx,
        img,
        px,
        py,
        size,
        rProps.rotation,
        rProps.opacity
      );
      drawnCount++;
    }
  }

  return ctx.getImageData(0, 0, width, height);
}
