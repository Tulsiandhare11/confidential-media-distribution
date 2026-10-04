import type {
  AccessTier,
  AuditEvent,
  AuthResponse,
  CreateShareInput,
  FaceBox,
  Photo,
  Share,
  SharedWithMe,
  User,
   MediaType,
  VerifyResponse,
  VerifyResultType,
  ViewMeta } from
'./types/api';

/** Change this to point the app at a different backend. */
export const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');

/** Values sent to the backend for each access tier. Edit if your API uses different names. */
export const TIER_API_VALUES: Record<AccessTier, string> = {
  full: 'full',
  blurred: 'blurred',
  redacted: 'redacted',
  public_safe: 'public_safe'
};

// ---------------------------------------------------------------------------
// Session token — kept in memory only (never persisted).
// ---------------------------------------------------------------------------
let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function onUnauthorized(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(message: string, status: number, code = '') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

// ---------------------------------------------------------------------------
// Request core
// ---------------------------------------------------------------------------
type Json = Record<string, unknown>;

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  /** Sign the user out if the server answers 401. Off for flows where 401 means "wrong code". */
  logoutOn401?: boolean;
}

async function send(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = {};
  if (authToken) headers.Authorization = `Bearer ${authToken}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body
    });
  } catch {
    throw new ApiError(
      `Can't reach the server at ${API_BASE_URL}. Make sure the API is running.`,
      0,
      'network'
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    let code = '';
    try {
      const data = obj(await res.json());
      message = str(first(data, 'error', 'message')) || message;
      code = str(first(data, 'code', 'reason'));
    } catch {

      // Non-JSON error body — keep the default message.
    }if (res.status === 401 && options.logoutOn401 !== false && authToken) {
      unauthorizedHandler?.();
    }
    throw new ApiError(message, res.status, code);
  }
  return res;
}

async function request<T = unknown>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError('The server returned an unexpected response.', res.status);
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export async function signup(input: {name: string;email: string;password: string;}) {
  return request('/auth/signup', { method: 'POST', body: input, logoutOn401: false });
}
export async function resendVerification(email: string) {
  return request('/auth/resend-verification', {
    method: 'POST',
    body: { email },
    logoutOn401: false
  });
}

/** Returns a session if the backend issues one on verification, otherwise null. */
export async function verifyEmail(input: {email: string;code: string;}): Promise<AuthResponse | null> {
  const data = obj(await request('/auth/verify', { method: 'POST', body: input, logoutOn401: false }));
  const token = str(first(data, 'token', 'accessToken'));
  return token ? { token, user: data.user ? normalizeUser(data.user) : null } : null;
}

export async function login(input: {email: string;password: string;}): Promise<AuthResponse> {
  const data = obj(await request('/auth/login', { method: 'POST', body: input, logoutOn401: false }));
  return {
    token: str(first(data, 'token', 'accessToken')),
    user: data.user ? normalizeUser(data.user) : null
  };
}

export async function getMe(): Promise<User> {
  const data = obj(await request('/auth/me'));
  return normalizeUser(data.user ?? data);
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------
export async function uploadPhoto(file: File, title: string): Promise<Photo> {
  const form = new FormData();
  form.append('photo', file);
  form.append('title', title);
  const data = obj(await request('/photos', { method: 'POST', form }));
  return normalizePhoto(data.photo ?? data);
}

export async function getMyPhotos(): Promise<Photo[]> {
  const data = await request('/photos/mine');
  return list(data, 'photos', 'items', 'data').map(normalizePhoto);
}
export async function deletePhoto(photoId: string): Promise<void> {
  await request(`/photos/${encodeURIComponent(photoId)}`, { method: 'DELETE' });
}

// ---------------------------------------------------------------------------
// Shares
// ---------------------------------------------------------------------------
export async function createShare(input: CreateShareInput): Promise<Share> {
  const body: Json = {
     photoId: input.photoId,
    viewerEmail: input.viewerEmail,
    tier: TIER_API_VALUES[input.tier],
    blurFaceIndexes: input.blurFaceIndexes,
    expiresInHours: input.expiresInHours,
    removeObjects: input.removeObjects
  };
  if (input.viewLimit !== null) body.viewLimit = input.viewLimit;
  const data = obj(await request('/shares', { method: 'POST', body }));
  return normalizeShare(data.share ?? data);
}

export async function getPhotoShares(photoId: string): Promise<Share[]> {
  const data = await request(`/shares/photo/${encodeURIComponent(photoId)}`);
  return list(data, 'shares', 'items', 'data').map(normalizeShare);
}

export async function revokeShare(shareId: string): Promise<void> {
  await request(`/shares/${encodeURIComponent(shareId)}`, { method: 'DELETE' });
}


export async function getSharedWithMe(): Promise<SharedWithMe[]> {
  const data = await request('/shares/shared-with-me');
  return list(data, 'shared', 'shares', 'items', 'data').map(normalizeSharedWithMe);
}

// ---------------------------------------------------------------------------
// Secure viewing
// ---------------------------------------------------------------------------
export async function getViewMeta(photoId: string): Promise<ViewMeta> {
  const data = obj(
    await request(`/view/${encodeURIComponent(photoId)}`, { logoutOn401: false })
  );
  const share = obj(data.share);
    return {
    url: str(data.url),
    tier: normalizeTier(first(data, 'tier') ?? share.tier),
    title: str(first(data, 'title', 'photoTitle')),
    shareId: str(first(data, 'shareId') ?? first(share, 'id', '_id')),
    expiresAt: isoTime(first(data, 'expiresAt') ?? share.expiresAt),
    mediaType: normalizeMediaType(data.mediaType)
  };
}
function normalizeMediaType(value: unknown): MediaType {
  return str(value).toLowerCase() === 'video' ? 'video' : 'image';
}
function isoTime(value: unknown): string {
  if (value === null || value === undefined || value === '') return '';
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isFinite(n) && n > 1e11) return new Date(n).toISOString();
  return str(value);
}
/** Fetches image bytes with the Authorization header. Use URL.createObjectURL on the result. */
export async function getViewImage(photoId: string): Promise<Blob> {
  const res = await send(`/view/${encodeURIComponent(photoId)}/image`, { logoutOn401: false });
  return res.blob();
}
/** Owner-only: renders one clearance tier of an image as a live Cloudinary preview. */


export async function requestStepUp(photoId: string): Promise<void> {
  await request(`/step-up/${encodeURIComponent(photoId)}/request`, {
    method: 'POST',
    logoutOn401: false
  });
}

export async function confirmStepUp(photoId: string, code: string): Promise<void> {
  await request(`/step-up/${encodeURIComponent(photoId)}/confirm`, {
    method: 'POST',
    body: { code },
    logoutOn401: false
  });
}

// ---------------------------------------------------------------------------
// Audit & verification
// ---------------------------------------------------------------------------
export async function getAudit(photoId: string): Promise<AuditEvent[]> {
  const data = await request(`/audit/${encodeURIComponent(photoId)}`, { logoutOn401: false });
  return list(data, 'events', 'timeline', 'items', 'data').map(normalizeAuditEvent);
}

export async function verifyMedia(file: File): Promise<VerifyResponse> {
  if (file.type.startsWith('video/')) {
    throw new ApiError(
      'Verify & Trace works on images. For a leaked video, read the name and share ID shown on screen.',
      400
    );
  }

  // 1. Look for the hidden recipient ID first
  const traceForm = new FormData();
  traceForm.append('photo', file);
  const traced = obj(await request('/trace', { method: 'POST', form: traceForm }));
  if (str(traced.result) === 'traced') return normalizeVerify(traced);

  // 2. No recipient ID found: compare against the vault
  const form = new FormData();
  form.append('photo', file);
  const data = await request('/verify', { method: 'POST', form });
  return normalizeVerify(data);
}

// ---------------------------------------------------------------------------
// Response normalisation — tolerant of camelCase / snake_case / nested shapes.
// ---------------------------------------------------------------------------
function str(value: unknown, fallback = ''): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return fallback;
}

function obj(value: unknown): Json {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Json : {};
}

function first(source: Json, ...keys: string[]): unknown {
  for (const key of keys) {
    if (source[key] !== undefined && source[key] !== null) return source[key];
  }
  return undefined;
}

function list(data: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(data)) return data;
  const o = obj(data);
  for (const key of keys) {
    if (Array.isArray(o[key])) return o[key] as unknown[];
  }
  return [];
}

function normalizeTier(value: unknown): AccessTier {
  const s = str(value).toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'full') return 'full';
  if (s.includes('public')) return 'public_safe';
  if (s.includes('redact') || s.includes('heavy')) return 'redacted';
  return 'blurred';
}

function normalizeUser(raw: unknown): User {
  const o = obj(raw);
  return {
    id: str(first(o, 'id', '_id')),
    name: str(first(o, 'name', 'fullName', 'displayName')),
    email: str(o.email)
  };
}

function normalizeFaces(source: unknown, imageWidth: number, imageHeight: number): FaceBox[] {
  const faces = Array.isArray(source) ? source : [];
  return faces.map((raw) => {
    const f = obj(raw);
    const box = obj(f.box ?? f.boundingBox ?? f);
    let x = num(first(box, 'x', 'left'));
    let y = num(first(box, 'y', 'top'));
    let width = num(first(box, 'width', 'w'));
    let height = num(first(box, 'height', 'h'));
    if ((x > 1 || width > 1) && imageWidth > 0) {
      x /= imageWidth;
      width /= imageWidth;
    }
    if ((y > 1 || height > 1) && imageHeight > 0) {
      y /= imageHeight;
      height /= imageHeight;
    }
    return { x, y, width, height };
  });
}

function normalizePhoto(raw: unknown): Photo {
  const o = obj(raw);
  const a = obj(first(o, 'analysis', 'ai', 'cloudinary'));
  const imageWidth = num(first(o, 'width', 'imageWidth'));
  const imageHeight = num(first(o, 'height', 'imageHeight'));
  const tagSource = first(a, 'tags') ?? first(o, 'tags');
  return {
    id: str(first(o, 'id', '_id', 'photoId')),
    title: str(first(o, 'title', 'name'), 'Untitled asset'),
    filename: str(first(o, 'filename', 'fileName', 'originalName', 'original_filename')),
    sha256: str(first(o, 'sha256', 'hash', 'sha')),
    status: str(o.status, 'released'),
    createdAt: str(first(o, 'createdAt', 'created_at', 'uploadedAt')),
    recipientCount: num(first(o, 'recipientCount', 'recipients', 'shareCount', 'share_count')),
    viewCount: num(first(o, 'viewCount', 'views', 'view_count')),
     mediaType: normalizeMediaType(first(o, 'mediaType', 'media_type')),
    previewUrl: str(first(o, 'previewUrl', 'preview_url')),
    analysis: {
      faces: normalizeFaces(first(a, 'faces') ?? first(o, 'faces', 'faceBoxes'), imageWidth, imageHeight),
      textRegions: num(first(a, 'textRegions', 'text_regions', 'ocr') ?? first(o, 'textRegions')),
      tags: (Array.isArray(tagSource) ? tagSource : []).
      map((t) => typeof t === 'string' ? t : str(obj(t).name)).
      filter(Boolean),
      moderation: str(first(a, 'moderation', 'moderationStatus') ?? first(o, 'moderation')) || undefined
    }
  };
}

function normalizeShare(raw: unknown): Share {
  const o = obj(raw);
  const viewer = obj(o.viewer);
  const limit = first(o, 'viewLimit', 'maxViews', 'view_limit');
  return {
    id: str(first(o, 'id', '_id', 'shareId')),
    photoId: str(first(o, 'photoId', 'photo_id')),
    viewerEmail: str(first(o, 'viewerEmail', 'viewer_email') ?? viewer.email),
    viewerName: str(first(o, 'viewerName') ?? viewer.name),
    tier: normalizeTier(o.tier),
    createdAt: str(first(o, 'createdAt', 'created_at')),
    expiresAt: str(first(o, 'expiresAt', 'expires_at')),
    revoked: Boolean(first(o, 'revoked', 'revokedAt')) || str(o.status) === 'revoked',
    viewCount: num(first(o, 'viewCount', 'views', 'view_count')),
    viewLimit: limit === undefined ? null : num(limit)
  };
}

function normalizeSharedWithMe(raw: unknown): SharedWithMe {
  const o = obj(raw);
  const photo = obj(o.photo);
  const sender = obj(first(o, 'sender', 'owner'));
  return {
   id: str(first(o, 'id', '_id', 'shareId', 'shareid')),
    photoId: str(first(o, 'photoId', 'photo_id', 'photoid') ?? first(photo, 'id', '_id')),
    photoTitle: str(first(o, 'photoTitle', 'title') ?? photo.title, 'Untitled asset'),
    senderName: str(first(o, 'senderName', 'ownerName') ?? sender.name),
    senderEmail: str(first(o, 'senderEmail', 'ownerEmail') ?? sender.email),
    tier: normalizeTier(o.tier),
    expiresAt: str(first(o, 'expiresAt', 'expires_at'))
  };
}

function normalizeAuditEvent(raw: unknown, index: number): AuditEvent {
  const o = obj(raw);
  const actor = obj(first(o, 'actor', 'user'));
  return {
    id: str(first(o, 'id', '_id'), String(index)),
    type: str(first(o, 'type', 'event', 'action'), 'event'),
    actor: str(first(o, 'actorName') ?? actor.name ?? (typeof o.actor === 'string' ? o.actor : undefined)),
    actorEmail: str(first(o, 'actorEmail') ?? actor.email),
    at: str(first(o, 'at', 'timestamp', 'createdAt', 'time')),
    detail: str(first(o, 'detail', 'details', 'message', 'description')),
    signature: str(first(o, 'signature', 'hash', 'sig'))
  };
}

function normalizeVerify(raw: unknown): VerifyResponse {
  const o = obj(raw);
  const share = obj(o.share);
  const recipient = obj(first(o, 'recipient', 'viewer'));
  const photo = obj(first(o, 'photo', 'asset', 'original'));
  const resultRaw = str(o.result).toLowerCase();
  const result: VerifyResultType = (
  ['exact_match', 'modified_copy', 'no_match', 'traced'] as VerifyResultType[]).
  includes(resultRaw as VerifyResultType) ?
  resultRaw as VerifyResultType :
  'no_match';
  const similarityRaw = first(o, 'similarity', 'confidence', 'score');
  const similarity = similarityRaw === undefined ? null : num(similarityRaw);
  const tierRaw = first(o, 'tier') ?? share.tier;
  return {
    result,
    photoId: str(first(o, 'photoId') ?? first(photo, 'id', '_id')),
    photoTitle: str(first(o, 'photoTitle', 'title') ?? photo.title),
    sha256: str(first(o, 'sha256', 'hash') ?? first(photo, 'sha256', 'hash')),
    similarity: similarity === null ? null : similarity <= 1 ? similarity * 100 : similarity,
    recipientName: str(first(o, 'recipientName', 'viewerName') ?? recipient.name),
    recipientEmail: str(first(o, 'recipientEmail', 'viewerEmail') ?? recipient.email ?? share.viewerEmail),
    shareId: str(first(o, 'shareId') ?? first(share, 'id', '_id')),
    sharedAt: str(first(o, 'sharedAt') ?? share.createdAt),
    accessedAt: str(first(o, 'accessedAt', 'viewedAt', 'lastViewedAt', 'timestamp', 'time')),
    tier: tierRaw === undefined ? null : normalizeTier(tierRaw),
    message: str(first(o, 'message', 'detail'))
  };
}