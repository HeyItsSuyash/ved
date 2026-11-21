const Groq = require("groq-sdk");

let groqInstance = null;
function getGroqClient() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!groqInstance) {
    groqInstance = new Groq({
      apiKey,
      timeout: 4000,
      maxRetries: 1
    });
  }
  return groqInstance;
}

const SYSTEM_PROMPT = `
You are CALLER AI, a warm, intelligent, and highly natural-sounding AI phone agent. You work for Company Name and your job is to help callers with their queries.

LANGUAGE BEHAVIOR:
- The caller may speak in Hindi, English, or a mix of both (Hinglish).
- Always use a natural Hinglish mix (a blend of English and Hindi) so it sounds like a real Indian person speaking. For example: "Main Hindi and English dono mein baat kar sakti hoon."
- Use natural, spoken Indian English or Hindi. Use contractions, soften your tone, be conversational.
- In Hindi, write in Devanagari script.
- IMPORTANT: If the user transcript is empty, undefined, or says very little nonsense (like just background noise), respond naturally with: "Hello? I can't hear you." or "Mujhe aapki aawaz nahi aa rahi hai, kya aap wahan hain?"
- Add punctuation like commas (,), ellipses (...), and question marks (?) to create natural pauses and intonation in the speech.

PERSONALITY:
- You are patient, empathetic, and professional.
- You never say "I am an AI" unless directly asked. Even then, acknowledge briefly and redirect.
- STRICT BREVITY RULE: Speak in 1 to 2 short sentences ONLY (maximum 25-30 words). Never recite long paragraphs, encyclopedic overviews, or long lists. Speak concisely and conversationally like a person on a telephone.
- Use natural fillers like "Bilkul", "Sure", "Haan", "Umm...", "Accha", "Samajh gayi" to sound human.
- Add brief acknowledgment before answering: "Haan, bilkul..." or "Haa, batati hoon..."

CONTEXT AWARENESS:
- You have access to the full conversation history. Reference it naturally.
- If the caller repeats something, acknowledge you already have that info: "Haan, aapne bataya tha..."
- Track and use the caller's name once you learn it.

RESPONSE FORMAT:
Respond with a JSON object in this exact structure:
{
  "spoken": "The exact text to speak aloud to the caller",
  "intent": "primary intent label",
  "entities": ["list", "of", "key", "entities"],
  "sentiment": "positive | neutral | negative | frustrated | satisfied",
  "action_item": "optional string if a follow-up action is needed, else null",
  "language": "hi | en | hinglish"
}
`;

async function getLLMResponse(historyTurns, newTranscript, memory = [], knowledge = [], instructions = '') {
  let contextSection = "";
  let groundingMessages = [];
  
  if (instructions) {
    contextSection += `### CORE AGENT INSTRUCTIONS ###\n${instructions}\n##############################\n\n`;
  }
  
  if (knowledge && knowledge.length > 0) {
    // Intelligent RAG Retrieval: extract candidate sections matching user's query keywords
    const searchTerms = (newTranscript || '').toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
    
    let relevantSnippets = [];
    let allLines = [];

    for (const doc of knowledge) {
      const docLines = (doc.content || '').split('\n').filter(l => l.trim().length > 0);
      for (const line of docLines) {
        let score = 0;
        const lowerLine = line.toLowerCase();
        for (const term of searchTerms) {
          if (lowerLine.includes(term)) score += 2;
        }
        allLines.push({ line, score, title: doc.title });
      }
    }

    // Sort by relevance to current question
    allLines.sort((a, b) => b.score - a.score);

    // Pick top matching snippets (up to 4000 characters)
    let charCount = 0;
    const selectedLines = [];
    for (const item of allLines) {
      if (charCount + item.line.length > 4000) break;
      selectedLines.push(item.line);
      charCount += item.line.length;
    }

    // Fallback: If no strong keyword matches (e.g. general greeting), use top lines from documents
    if (selectedLines.length === 0 || allLines[0].score === 0) {
      const rawKnowledgeString = knowledge.map(k => `[DOCUMENT: ${k.title}]\n${k.content}`).join('\n\n');
      selectedLines.push(rawKnowledgeString.substring(0, 3500));
    }

    const knowledgeString = selectedLines.join('\n');

    contextSection += `### MANDATORY DATA ROOM KNOWLEDGE ###
The following documents are the ONLY verified source of truth for answering caller queries:

${knowledgeString}

STRICT ANSWERING BOUNDARIES:
1. You MUST answer the user's questions ONLY from the information explicitly contained in the above DATA ROOM documents.
2. If the answer to the caller's question is NOT found in the documents above, you MUST answer: "I'm sorry, that information is not available in my current records."
3. Never guess, assume, speculate, or introduce external facts not present in these documents.
4. Keep the answer concise (1 to 2 sentences maximum, natural conversation).
5. Do NOT say "Thank you" or goodbye unless the caller has explicitly thanked you or asked to end the conversation.
#######################################\n\n`;
  } else {
    contextSection += `### (Notice: No uploaded knowledge documents available. State that information is not available in records.) ###\n\n`;
  }

  if (memory && memory.length > 0) {
    const memoryString = memory.slice(-3).map(m => `- [${m.timestamp}] ${m.text} (Intent: ${m.intent})`).join('\n');
    contextSection += `### PREVIOUS INTERACTION MEMORY ###\nHistory of past calls with this user:\n${memoryString}\n\nNOTE: If the current DATA ROOM knowledge contradicts this history, strictly use the DATA ROOM facts.\n#######################################\n\n`;
  }

  const { getSettings } = require('./settings');
  const activePromptTemplate = instructions || getSettings().systemPrompt || SYSTEM_PROMPT.replace('Company Name', 'the organization');

  const jsonFormatRequirement = `
SPEECH RULES (your reply is read aloud by a text-to-speech voice on a phone call):
- Reply in the caller's language. For Hindi or Hinglish, write in Devanagari script, never in Roman letters. Write English words the way an Indian caller says them, in Devanagari: बी.टेक, एम.टेक, हॉस्टल, फीस, एडमिशन, काउंसलिंग, कटऑफ।
- Say the university's name in full as "मदन मोहन मालवीय यूनिवर्सिटी" (or "Madan Mohan Malaviya University" in English). Never say "MMMUT".
- Write amounts and numbers as digits (1,24,000 or 30 जून 2026); they are converted to spoken words for you. Do not add "Rs" or "₹".
- One short sentence when you can, two at most, under 20 words. No lists, no markdown, no emojis.
- Speak as a man: "मैं बता सकता हूँ", "मैं आपकी सेवा कर सकता हूँ".

You MUST respond with a valid JSON object matching this exact structure:
{
  "spoken": "What to say to the caller",
  "intent": "primary intent label",
  "entities": ["list", "of", "key", "entities"],
  "sentiment": "positive | neutral | negative | frustrated | satisfied",
  "action_item": null,
  "language": "hi or en (hi for Hindi and Hinglish)",
  "transfer_to_human": false
}
Set "transfer_to_human" to true only when the caller asks to speak to a person, or when you could not answer their last two questions.
Do not include markdown code block ticks (\`\`\`json). Output raw JSON only.
`;

  const dynamicSystemPrompt = `${contextSection}### VED SYSTEM BEHAVIOR ###\n${activePromptTemplate}\n\n${jsonFormatRequirement}`;

  // Build the message payload
  const messages = [
    { role: "system", content: dynamicSystemPrompt }
  ];

  // Keep last 6 conversational turns to preserve context without exceeding token-per-minute limits
  const recentTurns = historyTurns.slice(-6);
  for (const turn of recentTurns) {
    if (turn.speaker === 'user') {
      messages.push({ role: 'user', content: turn.text });
    } else if (turn.speaker === 'ai') {
      messages.push({ role: 'assistant', content: turn.text });
    }
  }

  messages.push({ role: 'user', content: newTranscript });

  // ENHANCED LOGGING
  console.log(`\n[LLM] PROMPT READY (Knowledge: ${knowledge.length} fragments, History: ${recentTurns.length} turns)`);

  const groq = getGroqClient();
  if (!groq) {
    console.warn("[LLM] GROQ_API_KEY is not configured. Returning fallback response.");
    return {
      spoken: "माफ़ कीजिए, अभी मैं जवाब नहीं दे पा रहा हूँ। कृपया थोड़ी देर बाद कॉल करें।",
      intent: "unknown",
      entities: [],
      sentiment: "neutral",
      action_item: null,
      language: "hi"
    };
  }

  // Models in fallback priority order:
  // 1. openai/gpt-oss-120b (huge token-per-minute limit, ~650ms)
  // 2. openai/gpt-oss-20b (~600ms)
  // Models in priority order:
  // Candidate models with multiple architectures to prevent daily quota exhaustion:
  const candidateModels = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "groq/compound-mini"
  ];

  for (const model of candidateModels) {
    try {
      const isGptOss = model.startsWith("openai/");
      const requestOptions = {
        messages,
        model,
        temperature: 0.2,
        max_completion_tokens: isGptOss ? 300 : 160
      };

      // Only enforce strict json_object on models that support it reliably without schema failure
      if (!isGptOss) {
        requestOptions.response_format = { type: "json_object" };
      }

      const completion = await groq.chat.completions.create(requestOptions, { timeout: 3500 });

      const responseContent = completion.choices[0]?.message?.content;
      console.log(`[LLM] Raw Response from ${model}: "${responseContent?.substring(0, 60)}..."`);
      
      if (!responseContent) {
        console.warn(`[LLM] Empty response from ${model}`);
        continue;
      }

      try {
        // Attempt direct JSON parse or regex extract if enclosed in code blocks
        let cleanContent = responseContent.trim();
        const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanContent = jsonMatch[0];
        }
        const parsed = JSON.parse(cleanContent);
        if (parsed && parsed.spoken) {
          return parsed;
        }
      } catch (e) {
        console.error(`[LLM] JSON Parse Error on ${model}:`, e.message);
      }
    } catch (error) {
      console.warn(`[CALLER AI] Model ${model} failed:`, error.message);
    }
  }

  // Fallback if all API attempts failed
  return {
    spoken: "माफ़ कीजिए, मैं समझ नहीं पाया। क्या आप दोबारा बोल सकते हैं?",
    intent: "unknown",
    entities: [],
    sentiment: "neutral",
    action_item: null,
    language: "hinglish"
  };
}

async function summarizeCall(fullTranscript) {
  const SYS_PROMPT = `
You are a call analysis AI for CALLER AI. Given the following call transcript between an AI agent and a human caller, produce a structured summary.
Return a JSON object:
{
  "summary": "2-3 sentence paragraph summarizing the call",
  "key_intent": "Single clear label for the primary intent",
  "important_details": { "topic": "detail", ... },
  "key_topics": ["topic1", "topic2"],
  "resolution": "resolved | unresolved | escalated",
  "language_used": "hindi | english | mixed"
}
`;
  try {
    const groq = getGroqClient();
    if (!groq) {
      console.warn("[CALLER AI] GROQ_API_KEY is not configured. Skipping summary.");
      return null;
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: SYS_PROMPT },
        { role: "user", content: "Transcript:\n" + JSON.stringify(fullTranscript, null, 2) }
      ],
      model: "qwen/qwen3.8-27b",
      response_format: { type: "json_object" },
      temperature: 0.2
    });
    return JSON.parse(completion.choices[0]?.message?.content || "{}");
  } catch(e) {
    console.error("[CALLER AI] Summary Error:", e);
    return null;
  }
}

module.exports = {
  getLLMResponse,
  summarizeCall
};
