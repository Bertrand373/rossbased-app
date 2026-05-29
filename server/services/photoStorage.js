// server/services/photoStorage.js
//
// Photo storage abstraction. One interface, one implementation today
// (Cloudflare R2 via the S3-compatible API). Swapping providers means
// adding a sibling implementation and switching the export — no caller
// changes.
//
// Why abstract: photos are user content. Storage choice may evolve
// (R2 → S3 → self-hosted). The route handlers and React app only care
// about three verbs: upload bytes → get URL → delete.
//
// Env vars required for the R2 implementation:
//   R2_ACCOUNT_ID        Cloudflare account ID
//   R2_ACCESS_KEY_ID     R2 API token access key
//   R2_SECRET_ACCESS_KEY R2 API token secret
//   R2_BUCKET            bucket name (default: titantrack-photos)
//
// Keys are random UUIDv4 so they reveal nothing about the owner or
// content. The owner-of mapping lives in MongoDB on the User document.

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require('crypto');

const BUCKET = process.env.R2_BUCKET || 'titantrack-photos';
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

// Presigned URL TTL. Short on purpose so leaked links die fast. The
// client re-requests when it needs to render an image; that re-request
// re-validates ownership server-side every time.
const PRESIGNED_TTL_SECONDS = 15 * 60; // 15 minutes

let _client = null;

function getClient() {
  if (_client) return _client;
  if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
    throw new Error(
      'R2 storage not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY env vars.'
    );
  }
  _client = new S3Client({
    region: 'auto', // R2 ignores region but the SDK requires the field
    endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY
    }
  });
  return _client;
}

// Lightweight check we can call from /healthz or admin endpoints to
// confirm the env is wired without uploading anything.
function isConfigured() {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

/**
 * Upload bytes to a fresh object. Returns the storage key. Caller is
 * responsible for persisting the key against whatever owns it (e.g. a
 * Note entry).
 *
 * @param {Buffer} buffer
 * @param {Object} opts
 * @param {string} opts.contentType  - mime type, e.g. 'image/jpeg'
 * @param {string} [opts.keyPrefix]  - optional namespace prefix
 * @returns {Promise<string>} the object key
 */
async function upload(buffer, { contentType = 'image/jpeg', keyPrefix = 'photos' } = {}) {
  const id = randomUUID();
  const ext = contentType === 'image/png' ? 'png' : 'jpg';
  const key = `${keyPrefix}/${id}.${ext}`;

  await getClient().send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Server-side immutability marker: we never overwrite a key. If we
    // ever need to "edit" a photo, we upload a new key and update the
    // owner's reference. Makes accidental deletes safer.
    CacheControl: 'private, max-age=31536000, immutable'
  }));

  return key;
}

/**
 * Generate a short-lived presigned URL for reading. The signature
 * embeds the bucket + key + expiry; no auth is needed to fetch it
 * within the TTL, so the caller MUST have already verified the viewer
 * is allowed to see this key before calling this.
 *
 * @param {string} key
 * @returns {Promise<string>} presigned URL
 */
async function getPresignedUrl(key) {
  if (!key) throw new Error('Key is required');
  return getSignedUrl(
    getClient(),
    new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    { expiresIn: PRESIGNED_TTL_SECONDS }
  );
}

/**
 * Fetch the actual bytes for server-side processing (e.g., compositing
 * milestone side-by-sides). NOT for serving to users — for that we use
 * presigned URLs so the bytes never traverse our server.
 *
 * @param {string} key
 * @returns {Promise<Buffer>}
 */
async function getBytes(key) {
  if (!key) throw new Error('Key is required');
  const res = await getClient().send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  // Body is a Readable stream in Node — collect it.
  const chunks = [];
  for await (const chunk of res.Body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/**
 * Hard delete. No soft-delete trail by design — when the user deletes
 * their photo, it's gone. Important for trust.
 *
 * @param {string} key
 */
async function remove(key) {
  if (!key) throw new Error('Key is required');
  await getClient().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

module.exports = {
  upload,
  getPresignedUrl,
  getBytes,
  remove,
  isConfigured,
  PRESIGNED_TTL_SECONDS
};
