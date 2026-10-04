import multer from 'multer';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB (Cloudinary free plan image limit)
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024; // 40 MB (Render free instance has 512 MB RAM)

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES }, // hard ceiling for any upload
  fileFilter: (_req, file, cb) => {
    const ok = IMAGE_TYPES.includes(file.mimetype) || VIDEO_TYPES.includes(file.mimetype);
    if (ok) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP images or MP4, MOV, WebM videos'));
    }
  },
});