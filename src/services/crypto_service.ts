import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'node:crypto';
import { ml_kem768 } from '@noble/post-quantum/ml-kem.js';
import { ml_dsa65 } from '@noble/post-quantum/ml-dsa.js';
import { config } from '../config';

// ---------- AES-256-GCM (for the photo bytes, and for wrapping stored private keys) ----------

export function aesEncrypt(plaintext: Buffer, key: Buffer) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext, iv, tag };
}

export function aesDecrypt(ciphertext: Buffer, key: Buffer, iv: Buffer, tag: Buffer) {
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

const masterKey = Buffer.from(config.masterKey, 'hex'); // 32 bytes, from .env

// ---------- ML-KEM (protects the per-photo AES key) ----------

export function generateKemKeypair() {
  const { publicKey, secretKey } = ml_kem768.keygen();
  return { publicKey: Buffer.from(publicKey), secretKey: Buffer.from(secretKey) };
}

// Encrypt the user's ML-KEM secret key with MASTER_KEY before storing it in the DB
export function sealSecretKey(secretKey: Buffer): string {
  const { ciphertext, iv, tag } = aesEncrypt(secretKey, masterKey);
  return Buffer.concat([iv, tag, ciphertext]).toString('base64');
}

export function unsealSecretKey(sealed: string): Buffer {
  const buf = Buffer.from(sealed, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ciphertext = buf.subarray(28);
  return aesDecrypt(ciphertext, masterKey, iv, tag);
}

// Wrap a fresh AES photo-key to a recipient's ML-KEM public key
export function wrapPhotoKey(recipientPublicKey: Buffer) {
  const { cipherText, sharedSecret } = ml_kem768.encapsulate(recipientPublicKey);
  return { wrapped: Buffer.from(cipherText), aesKey: Buffer.from(sharedSecret) };
}

// Unwrap: recover the AES photo-key using the owner's ML-KEM secret key
export function unwrapPhotoKey(wrapped: Buffer, secretKey: Buffer): Buffer {
  const sharedSecret = ml_kem768.decapsulate(wrapped, secretKey);
  return Buffer.from(sharedSecret);
}

// ---------- ML-DSA (signs the photo's hash record, proving authenticity) ----------

export function generateDsaKeypair() {
  const { publicKey, secretKey } = ml_dsa65.keygen();
  return { publicKey: Buffer.from(publicKey), secretKey: Buffer.from(secretKey) };
}

export function signRecord(secretKey: Buffer, record: string): Buffer {
  const msg = Buffer.from(record, 'utf8');
  return Buffer.from(ml_dsa65.sign(msg, secretKey));
}

export function verifyRecord(publicKey: Buffer, record: string, signature: Buffer): boolean {
  const msg = Buffer.from(record, 'utf8');
  return ml_dsa65.verify(signature, msg, publicKey);
}

export function sha256Hex(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}