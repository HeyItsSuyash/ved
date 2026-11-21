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

/**
 * One agent reply. The persona, tone and rules come only from the dashboard
 * (Agent > Instructions, stored in Postgres); this file adds the knowledge base,
 * caller history and the technical output format. Extra arguments from the legacy
 * Exotel/Twilio pipelines (per-entity instructions) are ignored on purpose.
 */
async function getLLMResponse(historyTurns, newTranscript, memory = [], knowledge = []) {
  let contextSection = "";

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

    contextSection += `### KNOWLEDGE BASE ###
These documents are the only source of facts for answering callers:

${knowledgeString}

Answer only from these documents. If the answer is not in them, do what the AGENT INSTRUCTIONS say for that case. Never guess or add outside facts.
#######################################\n\n`;
  } else {
    contextSection += `### KNOWLEDGE BASE ###\n(No documents uploaded yet. You have no facts to answer from; follow the AGENT INSTRUCTIONS for questions you cannot answer.)\n#######################################\n\n`;
  }

  if (memory && memory.length > 0) {
    const memoryString = memory.slice(-3).map(m => `- [${m.timestamp}] ${m.text} (Intent: ${m.intent})`).join('\n');
    contextSection += `### PREVIOUS INTERACTION MEMORY ###\nHistory of past calls with this user:\n${memoryString}\n\nIf the knowledge base contradicts this history, use the knowledge base.\n#######################################\n\n`;
  }

  const { getSettings } = require('./settings');
  const { persona, systemPrompt: agentInstructions } = getSettings();

  const jsonFormatRequirement = `
SPEECH RULES (your reply is read aloud by a text-to-speech voice on a phone call):
- Which language to use is set by the AGENT INSTRUCTIONS. Whenever you speak Hindi or Hinglish, write it in Devanagari script, never in Roman letters, with English words written the way an Indian caller says them: बी.टेक, एम.टेक, हॉस्टल, फीस, एडमिशन, काउंसलिंग, कटऑफ।
- Write amounts and numbers as digits (1,24,000 or 30 जून 2026); they are converted to spoken words for you. Do not add "Rs" or "₹".
- Keep it short enough to say aloud: two sentences at most. No lists, no markdown, no emojis.

You MUST respond with a valid JSON object matching this exact structure:
{
  "spoken": "What to say to the caller",
  "intent": "primary intent label",
  "entities": ["list", "of", "key", "entities"],
  "sentiment": "positive | neutral | negative | frustrated | satisfied",
  "action_item": null,
  "language": "hi or en: the language of 'spoken' (hi for Hindi and Hinglish)",
  "transfer_to_human": false
}
Set "transfer_to_human" to true when the AGENT INSTRUCTIONS say to hand the caller to a person.
Do not include markdown code block ticks (\`\`\`json). Output raw JSON only.
`;

  // Staff instructions go last and win over everything above, so whatever is set in
  // the dashboard (language, tone, persona, when to hand over) is what the agent does.
  const personaSection = persona && persona.trim() ? `### PERSONA (who you are; set in the dashboard) ###\n${persona.trim()}\n\n` : '';
  const dynamicSystemPrompt = `${contextSection}${jsonFormatRequirement}\n${personaSection}### AGENT INSTRUCTIONS (set by staff in the dashboard; these override anything above) ###\n${agentInstructions}\n#######################################`;

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
        max_completion_tokens: isGptOss ? 400 : 220
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
      console.warn(`[LLM] Model ${model} failed:`, error.message);
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
You analyse calls to the VED admissions helpline. Given the following call transcript between an AI agent and a human caller, produce a structured summary.
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
      console.warn("[LLM] GROQ_API_KEY is not configured. Skipping summary.");
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
    console.error("[LLM] Summary Error:", e);
    return null;
  }
}

module.exports = {
  getLLMResponse,
  summarizeCall
};
