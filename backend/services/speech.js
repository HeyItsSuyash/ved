// Use native fetch and FormData

// Send 16kHz PCM WAV buffer to Groq's Whisper model
async function getGroqSTT(pcm16WavBuffer) {
  const url = 'https://api.groq.com/openai/v1/audio/transcriptions';
  
  const form = new FormData();
  const blob = new Blob([pcm16WavBuffer], { type: 'audio/wav' });
  form.append('file', blob, 'audio.wav');
  form.append('model', 'whisper-large-v3-turbo');
  form.append('response_format', 'json');
  form.append('temperature', '0.0');
  form.append('prompt', 'University admission enquiry, admission form, programme change, transfer, eligibility, fees, semester, counseling, cut-off.');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: form
    });
    
    const data = await response.json();
    if (!response.ok) {
      console.error(`[Groq STT] HTTP Error ${response.status}:`, data);
      throw new Error(`Groq STT Failed: ${response.status}`);
    }
    
    console.log(`[Groq STT] Response received successfully. Transcript: "${data.text}"`);
    return { transcript: data.text || '', language_code: 'en' };
  } catch (err) {
    console.error("Groq STT Error:", err);
    return null;
  }
}

const googleTTS = require('google-tts-api');

// Generate MP3 audio buffer from Free Google TTS
async function getGoogleTTS(text, language = 'en') {
  try {
    const langLower = (language || 'en').toLowerCase().trim();
    let targetLang = 'en-IN';

    if (langLower.startsWith('hi') || langLower === 'hinglish') {
      targetLang = 'hi-IN';
    } else if (langLower.startsWith('en')) {
      targetLang = 'en-IN';
    } else if (langLower.startsWith('es')) {
      targetLang = 'es';
    } else if (langLower.startsWith('fr')) {
      targetLang = 'fr';
    } else if (langLower.startsWith('de')) {
      targetLang = 'de';
    } else if (langLower.startsWith('ta')) {
      targetLang = 'ta';
    } else if (langLower.startsWith('te')) {
      targetLang = 'te';
    } else if (langLower.startsWith('bn')) {
      targetLang = 'bn';
    } else if (langLower.startsWith('mr')) {
      targetLang = 'mr';
    } else if (langLower.startsWith('gu')) {
      targetLang = 'gu';
    } else if (langLower.startsWith('ar')) {
      targetLang = 'ar';
    } else if (langLower.startsWith('pt')) {
      targetLang = 'pt';
    } else if (langLower.startsWith('it')) {
      targetLang = 'it';
    } else if (langLower.startsWith('ja')) {
      targetLang = 'ja';
    } else if (langLower.startsWith('zh')) {
      targetLang = 'zh';
    } else {
      targetLang = langLower.length === 2 ? langLower : 'en-IN';
    }

    // Generate multiple audio URLs if text is long (> 200 chars)
    const parts = googleTTS.getAllAudioUrls(text, {
      lang: targetLang,
      slow: false,
      host: 'https://translate.google.com',
      splitPunct: ',.?'
    });

    const buffers = [];
    for (const part of parts) {
      const response = await fetch(part.url);
      if (!response.ok) {
        throw new Error(`Google TTS Failed: ${response.status}`);
      }
      buffers.push(Buffer.from(await response.arrayBuffer()));
    }
    
    const finalBuffer = Buffer.concat(buffers);
    console.log(`[Google TTS] Audio received successfully for lang '${targetLang}'. Total Bytes Length: ${finalBuffer.length}`);
    return finalBuffer; // Returns concatenated MP3 buffer
  } catch (err) {
    console.error("Google TTS Error:", err);
    return null;
  }
}

module.exports = {
  getGroqSTT,
  getGoogleTTS
};
