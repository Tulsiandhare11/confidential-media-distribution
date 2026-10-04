import '../config.js';
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({ secure: true });

const MOCK = process.env.CLOUDINARY_MOCK === 'true';
// Set CLOUDINARY_OCR=true on Render only if the Text Detection add-on is installed and working
const OCR_ENABLED = process.env.CLOUDINARY_OCR === 'true';

export type MediaType = 'image' | 'video';

export interface UploadResult {
  publicId: string;
  faces: number[][];
  width: number;
  height: number;
  hasText: boolean;
}

export function uploadPhoto(
  buffer: Buffer,
  opts: { ownerId: number; title: string; mediaType?: MediaType }
): Promise<UploadResult> {
  const mediaType: MediaType = opts.mediaType ?? 'image';

  if (MOCK) {
    return Promise.resolve({
      publicId: `vault/user-${opts.ownerId}/mock-${Date.now()}`,
      faces: mediaType === 'image' ? [[50, 60, 120, 120], [220, 70, 110, 110]] : [],
      width: 800,
      height: 600,
      hasText: false,
    });
  }

  return new Promise((resolve, reject) => {
    const uploadOptions: Record<string, unknown> = {
      resource_type: mediaType,
      type: 'authenticated',
      asset_folder: `vault/user-${opts.ownerId}`,
      tags: ['vault', `owner-${opts.ownerId}`, mediaType],
      context: { owner_id: String(opts.ownerId), title: opts.title },
      unique_filename: true,
      use_filename: false,
    };
    // Face detection and OCR only apply to images
    if (mediaType === 'image') {
      uploadOptions.faces = true;
      if (OCR_ENABLED) uploadOptions.ocr = 'adv_ocr';
    }

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err || !result) return reject(err ?? new Error('Upload failed'));
      const r = result as any;
      resolve({
        publicId: r.public_id,
        faces: r.faces ?? [],
        width: r.width,
        height: r.height,
        hasText: Boolean(r.info?.ocr?.adv_ocr?.data?.length),
      });
    });
    stream.end(buffer);
  });
}

// Owner's dashboard preview. For videos it returns a poster frame.
export function ownerPreviewUrl(
  publicId: string,
  width = 500,
  mediaType: MediaType = 'image'
): string {
  if (MOCK) return `https://placehold.co/${width}x400?text=${encodeURIComponent(publicId)}`;
  if (mediaType === 'video') return videoPosterUrl(publicId, width);
  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'authenticate',
    sign_url: true,
    secure: true,
    transformation: [{ width, crop: 'limit' }, { quality: 'auto', fetch_format: 'auto' }],
  });
}

// ---- REPLACED: fetchTransformedImage (starts here) ----
export async function fetchTransformedImage(url: string, tries = 8): Promise<Buffer> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    // 423 = Cloudinary is still generating this version (can happen with AI transformations)
    if (res.status !== 423) {
      const detail = res.headers.get('x-cld-error') ?? '';
      throw new Error(`Cloudinary fetch failed: ${res.status} ${detail}`.trim());
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Cloudinary is still processing this image, try again shortly');
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
    removeObjects?: string[];
    maxWidth?: number;
  }
): string {
  if (MOCK) {
    const tag = [
      opts.blurAll && 'blur',
      opts.lowQuality && 'low',
      opts.removeObjects?.length && `remove-${opts.removeObjects.join('-')}`,
      opts.watermarkName,
    ]
      .filter(Boolean)
      .join('-');
    return `https://placehold.co/500x400?text=${encodeURIComponent(publicId + ':' + tag)}`;
  }

  const transformation: any[] = [];

  // AI object removal runs first, on the full-size original, so face coordinates stay valid
  if (opts.removeObjects?.length) {
    const prompts = opts.removeObjects.join(';');
    const list = opts.removeObjects.length > 1 ? `(${prompts})` : prompts;
    transformation.push({ effect: `gen_remove:prompt_${list};multiple_true` });
  }

  if (opts.blurAll) {
    transformation.push({ effect: 'blur_faces' });
  } else if (opts.blurRegions?.length) {
    for (const [x, y, w, h] of opts.blurRegions) {
      transformation.push({ effect: 'blur_region:800', x, y, width: w, height: h });
    }
  }

  // Text redaction needs the Text Detection add-on, so it only runs when enabled
  if (opts.redactText && OCR_ENABLED) {
    transformation.push({ effect: 'blur_region:800', gravity: 'ocr_text' });
  }

  if (opts.lowQuality) transformation.push({ quality: 30 });
  else transformation.push({ quality: 'auto', fetch_format: 'auto' });

  if (opts.watermarkName) {
    transformation.push({
      overlay: { font_family: 'Arial', font_size: 24, text: opts.watermarkName },
      color: '#ffffff',
      opacity: 40,
      gravity: 'south_east',
      x: 10,
      y: 10,
    });
  }

  // Downscale last (used for previews), so earlier steps see the real pixel coordinates
  if (opts.maxWidth) transformation.push({ width: opts.maxWidth, crop: 'limit' });

  if (opts.forcePng) transformation.push({ fetch_format: 'png' });

  return cloudinary.url(publicId, {
    resource_type: 'image',
    type: 'authenticate',
    sign_url: true,
    secure: true,
    transformation,
  });
}
// ---- REPLACED: ends here (viewerUrl's closing brace) ----

// ---------------------------------------------------------------------------
// Video (unchanged)
// ---------------------------------------------------------------------------
export function viewerVideoUrl(
  publicId: string,
  opts: { tier: string; watermarkText: string }
): string {
  if (MOCK) return `https://placehold.co/640x360?text=${encodeURIComponent(publicId)}`;

  const t: any[] = [];
  if (opts.tier === 'blurred') t.push({ effect: 'blur:300' }, { width: 720, crop: 'limit' });
  if (opts.tier === 'redacted') t.push({ effect: 'pixelate:25' }, { width: 480, crop: 'limit' });
  if (opts.tier === 'public_safe') t.push({ width: 480, crop: 'limit', quality: 'auto:low' });

  // Faint recipient overlays at three positions, harder to crop out.
  // No manual layer_apply: the SDK adds it for each overlay.
  for (const gravity of ['center', 'north_west', 'south_east']) {
    t.push({
      overlay: { font_family: 'Arial', font_size: 40, font_weight: 'bold', text: opts.watermarkText },
      color: 'white',
      opacity: 35,
      gravity,
    });
  }

  return cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format: 'mp4',
    transformation: t,
  });
}

// Poster frame for dashboards
export function videoPosterUrl(publicId: string, width = 400): string {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    type: 'authenticated',
    sign_url: true,
    secure: true,
    format: 'jpg',
    transformation: [{ start_offset: 0, width, crop: 'limit' }],
  });
}

// Videos are transformed on first request; Cloudinary may answer 423 until ready
export async function fetchTransformedMedia(url: string, tries = 10): Promise<Buffer> {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(url);
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 423) throw new Error(`Cloudinary fetch failed (${res.status})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Video is still processing, try again shortly');
}