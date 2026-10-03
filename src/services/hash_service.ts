import sharp from 'sharp';

// Simple, dependency-free perceptual hash (dHash): resize to 9x8 grayscale,
// compare each pixel to its right neighbor -> 64-bit fingerprint.
export async function perceptualHash(buffer: Buffer): Promise<string> {
  const { data } = await sharp(buffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let bits = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      bits += left > right ? '1' : '0';
    }
  }
  // pack the 64-bit string into hex for compact storage
  let hex = '';
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex; // 16 hex chars = 64 bits
}

export function hammingDistanceHex(hashA: string, hashB: string): number {
  if (hashA.length !== hashB.length) return 64; // treat as completely different
  let distance = 0;
  for (let i = 0; i < hashA.length; i++) {
    const bitsA = parseInt(hashA[i], 16);
    const bitsB = parseInt(hashB[i], 16);
    let xor = bitsA ^ bitsB;
    while (xor) {
      distance += xor & 1;
      xor >>= 1;
    }
  }
  return distance;
}