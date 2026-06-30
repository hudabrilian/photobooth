const JPEG_MAGIC = [0xFF, 0xD8, 0xFF];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export function validateJpeg(base64Str: string): { valid: boolean; error?: string } {
  const base64Data = base64Str.replace(/^data:image\/\w+;base64,/, '');

  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Data, 'base64');
  } catch {
    return { valid: false, error: 'Invalid base64 encoding' };
  }

  if (buffer.length > MAX_IMAGE_SIZE) {
    return { valid: false, error: `Image exceeds max size of 5MB` };
  }

  if (
    buffer.length < 3 ||
    buffer[0] !== JPEG_MAGIC[0] ||
    buffer[1] !== JPEG_MAGIC[1] ||
    buffer[2] !== JPEG_MAGIC[2]
  ) {
    return { valid: false, error: 'File is not a valid JPEG image' };
  }

  return { valid: true };
}
