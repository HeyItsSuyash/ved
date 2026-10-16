const fs = require('fs');
const path = require('path');

// Default initial VED numbers from environment
function getInitialNumbers() {
  const exotelNum = process.env.EXOTEL_PHONE_NUMBER || process.env.EXOTEL_CALLER_ID || '08047281152';
  return [
    { number: exotelNum, label: 'Exotel Primary Helpline (Inbound)', status: 'Active', priority: 1, callsHandled: 0 }
  ];
}

let numbersPool = getInitialNumbers();

let vedSystemPrompt = `You are VED, a helpful, natural-sounding AI telephone assistant.

CRITICAL KNOWLEDGE BOUNDARY RULE:
- You must answer questions ONLY using the verified information provided in the DATA ROOM documents (uploaded CSV, PDF, or text files).
- If the requested information is not found in the uploaded documents, state clearly and politely: "I'm sorry, that information is not available in my current records." Do not make up answers, do not speculate, and do not provide generic outside knowledge.

MULTILINGUAL CAPABILITY:
- The caller may ask questions in any language (Hindi, English, Hinglish, Spanish, French, German, Tamil, Telugu, Bengali, Marathi, Gujarati, etc.).
- Even if the documents are in English, comprehend the query in the caller's language, extract the factual answer from the documents, and respond in the caller's language.
- For Hindi/Hinglish, use Roman script transliteration so text-to-speech sounds completely natural.

CONVERSATION & ENDING RULES:
- Never randomly say "Thank you" or end the conversation prematurely.
- Only say "Thank you" or say goodbye IF the caller explicitly says goodbye, expresses thanks, or asks to end the call (e.g., "bye", "thank you", "that's all").
- Keep answers concise (1 to 2 short conversational sentences, max 25-30 words).`;

function getNumbersPool() {
  return [...numbersPool].sort((a, b) => a.priority - b.priority);
}

function addNumber({ number, label }) {
  if (!number) throw new Error('Phone number is required');
  const cleanNumber = number.trim();
  const existing = numbersPool.find(n => n.number === cleanNumber);
  if (existing) throw new Error('Number already exists in pool');

  const newEntry = {
    number: cleanNumber,
    label: label || `Line ${numbersPool.length + 1}`,
    status: numbersPool.length === 0 ? 'Active' : 'Standby',
    priority: numbersPool.length + 1,
    callsHandled: 0
  };
  numbersPool.push(newEntry);
  return newEntry;
}

function removeNumber(number) {
  const cleanNumber = number.trim();
  numbersPool = numbersPool.filter(n => n.number !== cleanNumber);
  // Re-index priorities
  numbersPool.forEach((n, idx) => {
    n.priority = idx + 1;
  });
  return true;
}

function updateFallbackOrder(orderedNumbers) {
  if (!Array.isArray(orderedNumbers)) throw new Error('orderedNumbers must be an array');
  
  orderedNumbers.forEach((numStr, idx) => {
    const item = numbersPool.find(n => n.number === numStr);
    if (item) {
      item.priority = idx + 1;
      item.status = idx === 0 ? 'Active' : 'Standby';
    }
  });

  return getNumbersPool();
}

function recordCallOnNumber(number) {
  const item = numbersPool.find(n => n.number === number);
  if (item) {
    item.callsHandled = (item.callsHandled || 0) + 1;
  }
}

function getVedPrompt() {
  return vedSystemPrompt;
}

function setVedPrompt(newPrompt) {
  if (typeof newPrompt === 'string' && newPrompt.trim()) {
    vedSystemPrompt = newPrompt.trim();
  }
  return vedSystemPrompt;
}

module.exports = {
  getNumbersPool,
  addNumber,
  removeNumber,
  updateFallbackOrder,
  recordCallOnNumber,
  getVedPrompt,
  setVedPrompt
};
