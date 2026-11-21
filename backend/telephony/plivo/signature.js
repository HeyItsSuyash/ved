const { validateV3Signature } = require('plivo');
const { publicBaseUrl } = require('./config');

let warned = false;

function verificationDisabled() {
  if (process.env.PLIVO_VERIFY_SIGNATURE === 'false') return true;
  if (!process.env.PLIVO_AUTH_TOKEN) {
    if (!warned) {
      console.warn('[Plivo] PLIVO_AUTH_TOKEN is not set: webhook signatures are NOT checked.');
      warned = true;
    }
    return true;
  }
  return false;
}

function check(method, urls, headers, params) {
  const sig = headers['x-plivo-signature-v3'];
  const nonce = headers['x-plivo-signature-v3-nonce'];
  if (!sig || !nonce) return false;
  return urls.some((u) => {
    try {
      return validateV3Signature(method, u, nonce, process.env.PLIVO_AUTH_TOKEN, sig, params);
    } catch {
      return false;
    }
  });
}

/** Express middleware: reject webhook requests that Plivo did not sign. */
function requirePlivoSignature(req, res, next) {
  if (verificationDisabled()) return next();
  // Validate against the public URL Plivo called, not the one this server sees behind the proxy.
  const url = publicBaseUrl() + req.originalUrl;
  const params = req.method === 'POST' ? req.body || {} : {};
  if (check(req.method, [url], req.headers, params)) return next();
  console.warn(`[Plivo] Rejected unsigned or mis-signed ${req.method} ${req.originalUrl} (checked against ${url})`);
  res.status(403).type('text/plain').send('Invalid signature');
}

/** Check a WebSocket upgrade. Plivo signs the <Stream> URL as written (wss://...), older signatures used http://. */
function verifyStreamUpgrade(req) {
  if (verificationDisabled()) return true;
  const base = publicBaseUrl();
  const wss = base.replace(/^http/, 'ws') + req.url;
  const legacy = base.replace(/^https/, 'http') + req.url.split('?')[0];
  return check('GET', [wss, legacy], req.headers, {});
}

module.exports = { requirePlivoSignature, verifyStreamUpgrade };
