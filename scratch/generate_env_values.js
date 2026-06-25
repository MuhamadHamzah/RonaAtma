import crypto from 'crypto';

// Generate a random 32-byte seed
const seed = crypto.randomBytes(32);

// Ed25519 private key in DER/PKCS8 format has some prefix, but since the decodePem code does:
// const seed = pemBytes.length > 32 ? pemBytes.slice(pemBytes.length - 32) : pemBytes;
// If we just supply 32 bytes of raw seed as the PEM content, it will work perfectly!
// Let's create a base64 of the 32 bytes seed:
const seedBase64 = seed.toString('base64');

// Wrap in PEM headers
const pemText = `-----BEGIN PRIVATE KEY-----
${seedBase64}
-----END PRIVATE KEY-----`;

// Base64 encode the PEM text
const pemBase64 = Buffer.from(pemText).toString('base64');

// Generate pseudonymous salt
const salt = crypto.randomBytes(16).toString('hex');

console.log('ICP_IDENTITY_PEM:', pemBase64);
console.log('PSEUDONYMOUS_SALT:', salt);
