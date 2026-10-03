export type AccessTier = 'full' | 'blurred' | 'redacted' | 'public_safe';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface AuthResponse {
  token: string;
  user: User | null;
}

/** Face box as fractions (0–1) of the image width/height. */
export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PhotoAnalysis {
  faces: FaceBox[];
  textRegions: number;
  tags: string[];
  moderation?: string;
}

export interface Photo {
  id: string;
  title: string;
  filename: string;
  sha256: string;
  status: string;
  createdAt: string;
  recipientCount: number;
  viewCount: number;
  analysis: PhotoAnalysis;
}

export interface Share {
  id: string;
  photoId: string;
  viewerEmail: string;
  viewerName: string;
  tier: AccessTier;
  createdAt: string;
  expiresAt: string;
  revoked: boolean;
  viewCount: number;
  viewLimit: number | null;
}

export interface SharedWithMe {
  id: string;
  photoId: string;
  photoTitle: string;
  senderName: string;
  senderEmail: string;
  tier: AccessTier;
  expiresAt: string;
}

export interface CreateShareInput {
  photoId: string;
  viewerEmail: string;
  tier: AccessTier;
  blurFaceIndexes: number[];
  expiresInHours: number;
  viewLimit: number | null;
}

export interface ViewMeta {
  url: string;
  tier: AccessTier;
  title: string;
  shareId: string;
  expiresAt: string;
}

export interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  actorEmail: string;
  at: string;
  detail: string;
  signature: string;
}

export type VerifyResultType = 'exact_match' | 'modified_copy' | 'no_match' | 'traced';

export interface VerifyResponse {
  result: VerifyResultType;
  photoId: string;
  photoTitle: string;
  sha256: string;
  similarity: number | null;
  recipientName: string;
  recipientEmail: string;
  shareId: string;
  sharedAt: string;
  accessedAt: string;
  tier: AccessTier | null;
  message: string;
}