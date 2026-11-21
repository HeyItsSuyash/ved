const { spawn } = require('child_process');

// G.711 mu-law decode table (8-bit mu-law -> 16-bit linear PCM).
const MULAW_TO_PCM = new Int16Array(256);
for (let i = 0; i < 256; i++) {
  const u = ~i & 0xff;
  const sign = u & 0x80;
  const exponent = (u >> 4) & 0x07;
  const mantissa = u & 0x0f;
  let sample = ((mantissa << 3) + 0x84) << exponent;
  sample -= 0x84;
  MULAW_TO_PCM[i] = sign ? -sample : sample;
}

/** Decode mu-law bytes to 16-bit little-endian PCM. */
function mulawToPcm16(mulaw) {
  const out = Buffer.alloc(mulaw.length * 2);
  for (let i = 0; i < mulaw.length; i++) out.writeInt16LE(MULAW_TO_PCM[mulaw[i]], i * 2);
  return out;
}

/** Wrap mono 16-bit PCM in a WAV header. */
function pcm16ToWav(pcm, sampleRate = 8000) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function mulawToWav(mulaw) {
  return pcm16ToWav(mulawToPcm16(mulaw), 8000);
}

/** Root-mean-square level of a mu-law frame, 0..32768. */
function mulawRms(mulaw) {
  if (mulaw.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < mulaw.length; i++) {
    const s = MULAW_TO_PCM[mulaw[i]];
    sum += s * s;
  }
  return Math.sqrt(sum / mulaw.length);
}

/** Convert any audio ffmpeg understands (e.g. MP3) to raw mu-law 8 kHz mono. */
function toMulaw8k(input) {
  return new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', 'pipe:0', '-ar', '8000', '-ac', '1', '-f', 'mulaw', 'pipe:1']);
    const chunks = [];
    ff.stdout.on('data', (d) => chunks.push(d));
    ff.on('error', reject);
    ff.on('close', (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(`ffmpeg exited with ${code}`))));
    ff.stdin.on('error', () => {});
    ff.stdin.end(input);
  });
}

module.exports = { mulawToPcm16, pcm16ToWav, mulawToWav, mulawRms, toMulaw8k };
