import { FilesetResolver, ImageSegmenter } from '@mediapipe/tasks-vision';

let segmenterInstance: ImageSegmenter | null = null;

export async function getSelfieSegmenter(): Promise<ImageSegmenter> {
  if (segmenterInstance) return segmenterInstance;

  const filesetResolver = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.8/wasm'
  );

  segmenterInstance = await ImageSegmenter.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/1/selfie_segmenter.task',
      delegate: 'GPU',
    },
    runningMode: 'IMAGE',
    outputCategoryMask: true,
    outputConfidenceMasks: false,
  });

  return segmenterInstance;
}
