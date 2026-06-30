export type PlacementArea =
  | 'top_head'
  | 'left_head'
  | 'right_head'
  | 'left_cheek'
  | 'right_cheek'
  | 'photo_corner'
  | 'background';

export interface PlacementPoint {
  x: number;
  y: number;
  area: PlacementArea;
  targetSize: number;
}

export interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
}

export function getPlacementPoints(
  landmarksList: any[][], // normalized landmarks from MediaPipe Task-Vision
  width: number,
  height: number
): PlacementPoint[] {
  const points: PlacementPoint[] = [];

  // 1. Photo Corners
  const cornerOffset = 40;
  const cornerSize = 50;
  points.push({ x: cornerOffset, y: cornerOffset, area: 'photo_corner', targetSize: cornerSize });
  points.push({ x: width - cornerOffset, y: cornerOffset, area: 'photo_corner', targetSize: cornerSize });
  points.push({ x: cornerOffset, y: height - cornerOffset, area: 'photo_corner', targetSize: cornerSize });
  points.push({ x: width - cornerOffset, y: height - cornerOffset, area: 'photo_corner', targetSize: cornerSize });

  // 2. Face-based placements
  for (const landmarks of landmarksList) {
    if (!landmarks || landmarks.length < 150) continue;

    // Convert key landmark coordinates to pixels
    const getPixelPt = (idx: number) => ({
      x: landmarks[idx].x * width,
      y: landmarks[idx].y * height,
    });

    const forehead = getPixelPt(10);
    const chin = getPixelPt(152);
    const leftCheekOuter = getPixelPt(234);
    const rightCheekOuter = getPixelPt(454);
    const leftCheek = getPixelPt(117);
    const rightCheek = getPixelPt(346);

    const faceHeight = Math.abs(chin.y - forehead.y);
    const faceWidth = Math.abs(rightCheekOuter.x - leftCheekOuter.x);
    const targetSize = Math.max(faceWidth * 0.25, 24);

    // Area: Top Head (extrapolate upwards from forehead)
    points.push({
      x: forehead.x,
      y: Math.max(forehead.y - faceHeight * 0.35, 10),
      area: 'top_head',
      targetSize: targetSize * 1.3,
    });

    // Area: Left Head
    points.push({
      x: Math.max(leftCheekOuter.x - faceWidth * 0.25, 10),
      y: forehead.y,
      area: 'left_head',
      targetSize: targetSize,
    });

    // Area: Right Head
    points.push({
      x: Math.min(rightCheekOuter.x + faceWidth * 0.25, width - 10),
      y: forehead.y,
      area: 'right_head',
      targetSize: targetSize,
    });

    // Area: Left Cheek (e.g. for blush or small sticker)
    points.push({
      x: leftCheek.x,
      y: leftCheek.y,
      area: 'left_cheek',
      targetSize: targetSize * 0.8,
    });

    // Area: Right Cheek (e.g. for blush or small sticker)
    points.push({
      x: rightCheek.x,
      y: rightCheek.y,
      area: 'right_cheek',
      targetSize: targetSize * 0.8,
    });
  }

  // 3. Background / Empty space placements (if no faces or around them)
  if (landmarksList.length === 0) {
    points.push({ x: width * 0.25, y: height * 0.3, area: 'background', targetSize: 45 });
    points.push({ x: width * 0.75, y: height * 0.3, area: 'background', targetSize: 45 });
    points.push({ x: width * 0.5, y: height * 0.2, area: 'background', targetSize: 55 });
  } else {
    // Add background point away from faces
    points.push({ x: width * 0.5, y: 35, area: 'background', targetSize: 40 });
  }

  return points;
}

// Check if a doodle center coordinates overlap with facial features
export function isPointInExclusionZone(
  x: number,
  y: number,
  landmarksList: any[][],
  width: number,
  height: number
): boolean {
  for (const landmarks of landmarksList) {
    if (!landmarks || landmarks.length < 150) continue;

    // Key regions to avoid: Eyes, Nose, Mouth
    const criticalIndices = [
      // Left eye area
      33, 133, 159, 145,
      // Right eye area
      362, 263, 386, 374,
      // Nose bridge and tip
      1, 2, 4, 168,
      // Mouth / lips
      0, 13, 14, 78, 308,
    ];

    for (const idx of criticalIndices) {
      const px = landmarks[idx].x * width;
      const py = landmarks[idx].y * height;
      const distance = Math.hypot(x - px, y - py);
      // If it is within 25px of any critical landmark, exclude it
      if (distance < 30) {
        return true;
      }
    }
  }
  return false;
}
