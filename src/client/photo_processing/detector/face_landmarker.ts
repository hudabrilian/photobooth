import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';

let landmarkerInstance: FaceLandmarker | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
  );

  landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    numFaces: 4,
    outputFaceBlendshapes: true,
  });

  return landmarkerInstance;
}
