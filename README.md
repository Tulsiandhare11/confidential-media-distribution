# Confidential Media Distribution

Control how sensitive media is distributed, viewed, and traced.

## The problem

Once you share a photo, you lose control of it. If it leaks, there's no way to
know who leaked it, or to prove the original wasn't altered. Teams who handle
sensitive visual material — pre-launch product photos, press screeners, legal
evidence — currently rely on email attachments or Drive links, with zero
accountability if something gets out.

## What this does

Share a confidential image with someone, and if it leaks, know exactly who
leaked it, and prove whether it was altered.

- **Access tiers** — Full, Blurred, Heavily redacted, or Public-safe, each a
  live Cloudinary transformation generated on demand, not a pre-rendered file.
- **Step-up verification** — viewing a Full-access copy requires a one-time
  code, even on an already-logged-in device.
- **Invisible leak tracing** — every delivered copy carries a hidden,
  per-recipient signature embedded in the pixel data. A leaked screenshot can
  be traced back to the exact recipient and share.
- **Tamper-proof originals** — every upload is hashed and signed with a
  post-quantum signature (ML-DSA) at the moment of capture, so authenticity
  can be verified later.
- **Revocation** — access can be cut off at any time, instantly.
- **Audit trail** — a signed, timestamped history of every upload, share,
  view, and revoke on an asset.

## Who it's for

PR and marketing teams protecting pre-launch assets, legal teams sharing
evidence with opposing counsel, studios distributing press screeners — anyone
sharing a photo they can't afford to have leak without consequence.

**Division of responsibility:** Cloudinary is the perception and rendering
engine — it detects what's sensitive in an image and renders every
access-level version live. The backend is the policy and proof layer — who's
allowed to see what, cryptographic signing, revocation, and the audit trail.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Supabase) |
| Media | Cloudinary (face detection, transformations, authenticated delivery) |
| Cryptography | ML-KEM (key wrapping), ML-DSA (signing), AES-256-GCM (encryption) |
| Email | Resend |
| Deployment | Vercel (frontend), Render (backend) |

## Core flow

1. **Upload** — image is encrypted, signed, and sent to Cloudinary as a
   private, authenticated asset. Faces are detected automatically.
2. **Review** — owner marks which faces to protect and sets an access level.
3. **Share** — pick a recipient, access tier, and expiry. The share record is
   signed.
4. **Controlled delivery** — the recipient logs in, and for Full access,
   confirms a step-up code. The backend issues a short-lived signed URL with
   that tier's transformation and an invisible per-recipient watermark.
5. **Leak trace** — upload any leaked copy. The hidden watermark identifies
   exactly who it was issued to.
6. **Verify** — check whether an image is an untouched original, a modified
   copy, or doesn't match anything in the system.

## Known limitations

- The invisible watermark is pixel-based and survives direct saves and crops,
  but can be weakened by heavy re-compression or a photo of a screen.
- OCR-based text redaction (license plates, documents) is designed but not
  enabled on the current Cloudinary plan.
- View-limit enforcement is defined in the data model but not yet enforced.

## Running locally


# Backend
cd vault_backend
npm install
npm run dev

# Frontend
cd vault_frontend
npm install
npm run dev


Set `DATABASE_URL`, `JWT_SECRET`, `MASTER_KEY`, `CLOUDINARY_URL`,
`RESEND_API_KEY`, and `CLIENT_ORIGIN` in `vault_backend/.env`.
