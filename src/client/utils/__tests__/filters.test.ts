import { describe, it, expect, vi } from 'vitest';
import { applyFilterToImageData, CSS_FILTERS } from '../filters';

describe('filters utility', () => {
  it('should have valid CSS filters defined', () => {
    expect(CSS_FILTERS.none).toBeDefined();
    expect(CSS_FILTERS.grayscale).toBeDefined();
    expect(CSS_FILTERS.sepia).toBeDefined();
  });

  it('should return original image data if filter is none', () => {
    const mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000),
    } as unknown as ImageData;

    const result = applyFilterToImageData(mockImageData, 'none');
    expect(result).toBe(mockImageData);
  });

  it('should apply CSS filter to image data using OffscreenCanvas', () => {
    const mockDrawImage = vi.fn();
    const mockGetImageData = vi.fn().mockReturnValue('filtered-image-data');
    const mockPutImageData = vi.fn();

    const mockCtx = {
      filter: '',
      drawImage: mockDrawImage,
      getImageData: mockGetImageData,
      putImageData: mockPutImageData,
    };

    class MockOffscreenCanvas {
      constructor(public width: number, public height: number) {}
      getContext() {
        return mockCtx;
      }
    }

    vi.stubGlobal('OffscreenCanvas', MockOffscreenCanvas);

    const mockImageData = {
      width: 100,
      height: 100,
      data: new Uint8ClampedArray(40000),
    } as unknown as ImageData;

    const result = applyFilterToImageData(mockImageData, 'grayscale');

    expect(result).toBe('filtered-image-data');
    expect(mockCtx.filter).toBe(CSS_FILTERS.grayscale);
    expect(mockPutImageData).toHaveBeenCalledWith(mockImageData, 0, 0);
    expect(mockDrawImage).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
