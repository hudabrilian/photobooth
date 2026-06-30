import { describe, it, expect } from 'vitest';
import { getTemplateConfig } from '../templates';

describe('templates utility', () => {
  it('should return correct config for frame1', () => {
    const config = getTemplateConfig('frame1');
    expect(config).toBeDefined();
    expect(config.photoCount).toBe(3);
    expect(config.canvasW).toBe(600);
    expect(config.canvasH).toBe(1800);
    expect(config.slots).toHaveLength(3);
  });

  it('should return correct config for frame2', () => {
    const config = getTemplateConfig('frame2');
    expect(config).toBeDefined();
    expect(config.photoCount).toBe(3);
    expect(config.slots).toHaveLength(3);
    expect(config.slots[0].y).toBe(270);
  });

  it('should fallback to frame1 for unknown template id', () => {
    const config = getTemplateConfig('nonexistent-frame');
    const frame1Config = getTemplateConfig('frame1');
    expect(config).toEqual(frame1Config);
  });
});
