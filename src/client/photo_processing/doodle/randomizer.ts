export interface RandomizedProps {
  rotation: number;
  scale: number;
  opacity: number;
  offsetX: number;
  offsetY: number;
}

export function getRandomizedProps(radius = 20): RandomizedProps {
  return {
    rotation: (Math.random() - 0.5) * 0.8, // -0.4 to 0.4 rad (~23 deg)
    scale: 0.75 + Math.random() * 0.4,       // 0.75 to 1.15
    opacity: 0.75 + Math.random() * 0.25,    // 0.75 to 1.0
    offsetX: (Math.random() - 0.5) * radius * 2,
    offsetY: (Math.random() - 0.5) * radius * 2,
  };
}
