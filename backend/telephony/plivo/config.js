const plivo = require('plivo');

function publicBaseUrl() {
  return (process.env.PUBLIC_BASE_URL || process.env.SERVER_URL || '').replace(/\/$/, '');
}

function plivoConfigured() {
  return Boolean(process.env.PLIVO_AUTH_ID && process.env.PLIVO_AUTH_TOKEN);
}

function helplineNumber() {
  return process.env.PLIVO_NUMBER || null;
}

let client = null;
function plivoClient() {
  if (!plivoConfigured()) throw new Error('Plivo is not configured: set PLIVO_AUTH_ID and PLIVO_AUTH_TOKEN');
  if (!client) client = new plivo.Client(process.env.PLIVO_AUTH_ID, process.env.PLIVO_AUTH_TOKEN);
  return client;
}

function url(path) {
  const base = publicBaseUrl();
  if (!base) throw new Error('PUBLIC_BASE_URL is not set');
  return base + path;
}

function wsUrl(path) {
  return url(path).replace(/^http/, 'ws');
}

module.exports = { publicBaseUrl, plivoConfigured, helplineNumber, plivoClient, url, wsUrl };
