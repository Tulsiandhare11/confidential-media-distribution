
# Photo Vault — Confidential Media Distribution

A vault for sharing sensitive photos safely. Owners decide exactly what each recipient sees, every shared copy is watermarked and traceable, and originals are protected with post-quantum cryptography.

## Track

Track 3 — Your Media-Savvy Startup (HackIndia x Cloudinary)

## The problem

Photos shared over WhatsApp, email, or Drive links offer no real control once sent — no way to limit who sees the real version, no way to trace a leak back to a specific recipient, and no way to prove an image is authentic if it's later altered or misused.

## What we built

- **Tiered sharing**: owners share a photo at full quality, blurred, or redacted — chosen per recipient, not as a global setting.
- **Per-viewer watermarking**: every delivered copy carries the viewer's identity, so a leaked copy can be traced back to who it was shared with.
- **Revocation**: access can be pulled at any time; revoked shares stop resolving immediately.
- **Step-up confirmation**: viewing a full-quality share requires a recent confirmed code, not just being logged in.
- **Verify & Trace**: anyone can check whether an image matches a registered original, using Cloudinary's perceptual hashing and content analysis.
- **Post-quantum protection**: originals are signed (ML-DSA / Dilithium) and keys are sealed using ML-KEM (Kyber) — the encryption and signing layer is quantum-resistant, not just today's standard.

## How Cloudinary is used

- Upload, storage, and authenticated (non-public) delivery of every asset
- AI-driven face/content detection, used to drive per-share blur regions
- Perceptual hashing (phash) and content analysis for the Verify & Trace feature
- Dynamic, per-viewer watermark overlays generated at delivery time, not baked into a static file

## Tech stack

- Backend: Node.js, Express, TypeScript, SQLite
- Frontend: React
- Auth: email + password, email verification via Resend
- Crypto: ML-KEM (Kyber) for key encapsulation, ML-DSA (Dilithium) for signing
- Media: Cloudinary (upload, transformations, AI analysis, authenticated delivery)

## Running locally

### Backend

cd vault_backend
npm install
cp .env.example .env   # fill in Cloudinary, Resend, JWT secret
npm run dev


### Frontend

cd vault_frontend
npm install
npm run dev

## Environment variables (backend)


CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
RESEND_API_KEY=
MAIL_FROM=
JWT_SECRET=


## Known limitations

- Face/content-based detection depends on Cloudinary's analysis accuracy and may miss heavily AI-altered images.
- Verify & Trace proves similarity to a registered original; it does not claim to detect every possible manipulation.


## Team

AxiNova
## Team Members
Tulsi Andhare
GauravKumar Ramina 