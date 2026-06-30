const COLORS = ['#e74c3c', '#3498db', '#2ecc71'];
const LABELS = ['PHOTO 1', 'PHOTO 2', 'PHOTO 3'];

export function generateTestImages(count: number = 3): ImageData[] {
  return Array.from({ length: count }, (_, i) => {
    const W = 640;
    const H = 480;
    const off = new OffscreenCanvas(W, H);
    const ctx = off.getContext('2d')!;

    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(LABELS[i % LABELS.length], W / 2, H / 2 - 20);

    ctx.font = '24px Arial';
    ctx.fillText(`Test Image ${i + 1}`, W / 2, H / 2 + 50);

    return ctx.getImageData(0, 0, W, H);
  });
}
