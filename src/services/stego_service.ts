import sharp from 'sharp';

// Embeds a 32-bit integer (e.g. shareId) into the LSB of the red channel,
// repeated across the image for redundancy, then majority-voted on decode.
// Works reliably only on PNG (lossless) output.

const HEADER = [1, 0, 1, 1, 0, 0, 1, 0]; // 8-bit marker so decode can confirm a mark is present

function intToBits(n: number, bitLength: number): number[] {
  const bits: number[] = [];
  for (let i = bitLength - 1; i >= 0; i--) bits.push((n >> i) & 1);
  return bits;
}

function bitsToInt(bits: number[]): number {
  return bits.reduce((acc, b) => (acc << 1) | b, 0);
}

export async function embedId(imageBuffer: Buffer, id: number): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels; // 4 (RGBA) after ensureAlpha
  const totalPixels = info.width * info.height;

  const payload = [...HEADER, ...intToBits(id, 32)]; // 40 bits total
  const repeats = Math.floor(totalPixels / payload.length);
  if (repeats < 3) throw new Error('Image too small to embed a reliable watermark');

  let pixelIndex = 0;
  for (let r = 0; r < repeats; r++) {
    for (const bit of payload) {
      const byteOffset = pixelIndex * channels; // red channel of this pixel
      data[byteOffset] = (data[byteOffset] & 0xfe) | bit; // set LSB
      pixelIndex++;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels } })
    .png()
    .toBuffer();
}

export async function extractId(imageBuffer: Buffer): Promise<number | null> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  const totalPixels = info.width * info.height;
  const payloadLength = HEADER.length + 32;
  const repeats = Math.floor(totalPixels / payloadLength);
  if (repeats < 1) return null;

  // majority vote per bit position across all repeats
  const votes: number[] = new Array(payloadLength).fill(0);
  let pixelIndex = 0;
  for (let r = 0; r < repeats; r++) {
    for (let i = 0; i < payloadLength; i++) {
      const byteOffset = pixelIndex * channels;
      votes[i] += data[byteOffset] & 1;
      pixelIndex++;
    }
  }
  const bits = votes.map((v) => (v > repeats / 2 ? 1 : 0));

  const header = bits.slice(0, HEADER.length);
  if (header.join('') !== HEADER.join('')) return null; // no valid mark found

  return bitsToInt(bits.slice(HEADER.length));
}