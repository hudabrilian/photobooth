declare module 'gifencoder' {
  import { Readable } from 'stream';

  class GIFEncoder {
    constructor(width: number, height: number);
    createReadStream(): Readable;
    start(): void;
    setRepeat(repeat: number): void;
    setDelay(delay: number): void;
    setQuality(quality: number): void;
    addFrame(data: Buffer | Uint8Array): void;
    finish(): void;
    out: { getData(): Buffer };
  }

  export = GIFEncoder;
}
