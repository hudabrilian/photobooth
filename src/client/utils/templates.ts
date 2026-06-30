export interface PhotoSlot {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TemplateConfig {
  canvasW: number;
  canvasH: number;
  photoCount: number;
  slots: PhotoSlot[];
}

const TEMPLATE_CONFIGS: Record<string, TemplateConfig> = {
  frame1: {
    canvasW: 600,
    canvasH: 1800,
    photoCount: 3,
    slots: [
      { x: 45, y: 100, w: 510, h: 396 },
      { x: 45, y: 500, w: 510, h: 396 },
      { x: 45, y: 940, w: 510, h: 396 },
    ],
  },
  frame2: {
    canvasW: 600,
    canvasH: 1800,
    photoCount: 3,
    slots: [
      { x: 45, y: 270, w: 510, h: 396 },
      { x: 45, y: 738, w: 510, h: 396 },
      { x: 45, y: 1206, w: 510, h: 396 },
    ],
  },
};

export function getTemplateConfig(templateId: string): TemplateConfig {
  return TEMPLATE_CONFIGS[templateId] || TEMPLATE_CONFIGS.frame1;
}
