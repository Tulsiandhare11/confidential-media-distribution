
import '../config';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ secure: true });

const MOCK = process.env.CLOUDINARY_MOCK === 'true';

export interface UploadResult {
  publicId: string;
  faces: number[][];
  width: number;
  height: number;
  hasText: boolean;
}

export function uploadPhoto(
  buffer: Buffer,
  opts: { ownerId: number; title: string }
): Promise<UploadResult> {
  if (MOCK) {
    return Promise.resolve({
      publicId: `vault/user-${opts.ownerId}/mock-${Date.now()}`,
      faces: [[50, 60, 120, 120], [220, 70, 110, 110]],
      width: 800,
      height: 600,
      hasText: false,
    });
  }
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'image',
        type: 'authenticated',
        asset_folder: `vault/user-${opts.ownerId}`,
        tags: ['vault', `owner-${opts.ownerId}`],
        context: { owner_id: String(opts.ownerId), title: opts.title },
        faces: true,
        ocr: 'adv_ocr',
        unique_filename: true,
        use_filename: false,
      },
      (err, result) => {
        if (err || !result) return reject(err ?? new Error('Upload failed'));
        const r = result as any;
        resolve({
          publicId: r.public_id,
          faces: r.faces ?? [],
          width: r.width,
          height: r.height,
          hasText: Boolean(r.info?.ocr?.adv_ocr?.data?.length),
        });
      }
    );
    stream.end(buffer);
  });
}

export function ownerPreviewUrl(publicId: string, width = 500): string {
  if (MOCK) return `https://placehold.co/${width}x400?text=${encodeURIComponent(publicId)}`;
  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    transformation: [{ width, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
  });
}
export async function fetchTransformedImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Cloudinary fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}
export function viewerUrl(
  publicId: string,
  opts: {
    blurAll?: boolean;
    blurRegions?: number[][];
    lowQuality?: boolean;
    watermarkName?: string;
    forcePng?: boolean;
    redactText?: boolean;
  }
): string {
  if (MOCK) {
    const tag = [opts.blurAll && 'blur', opts.lowQuality && 'low', opts.redactText && 'textredact', opts.watermarkName]
      .filter(Boolean)
      .join('-');
    return `https://placehold.co/500x400?text=${encodeURIComponent(publicId + ':' + tag)}`;
  }

  const transformation: any[] = [];
  if (opts.blurAll) {
    transformation.push({ effect: 'blur_faces' });
  } else if (opts.blurRegions?.length) {
    for (const [x, y, w, h] of opts.blurRegions) {
      transformation.push({ effect: 'blur:800', x, y, width: w, height: h, crop: 'crop' });
    }
  }
  if (opts.lowQuality) transformation.push({ quality: 30 });
  else transformation.push({ quality: 'auto', fetch_format: 'auto' });
  if (opts.watermarkName) {
    transformation.push({
      overlay: { font_family: 'Arial', font_size: 24, text: opts.watermarkName },
      color: '#ffffff', opacity: 40, gravity: 'south_east', x: 10, y: 10,
    });
  }
  if (opts.redactText) {
    transformation.push({ effect: 'blur:800', gravity: 'ocr_text' });
  }
  if (opts.forcePng) transformation.push({ fetch_format: 'png' });

  return cloudinary.url(publicId, {
    resource_type: 'image', type: 'authenticated', sign_url: true, secure: true, transformation,
  });
}