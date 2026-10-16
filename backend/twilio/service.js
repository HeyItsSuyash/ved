const twilio = require('twilio');
const { createCallSession } = require('../state/calls');

/**
 * Common logic to initiate an outbound call
 * @param {Object} params 
 * @param {string} params.to - Recipient phone number
 * @param {string} params.entityName - Name of the agent/entity
 * @returns {Promise<Object>} - The Twilio call object
 */
async function performOutboundCall({ to, entityName }) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL;

  console.log(`[TwilioService] Attempting outbound call to ${to} from ${from}`);
  console.log(`[TwilioService] Server URL for TwiML: ${serverUrl}/twilio/voice`);

  if (!accountSid || !authToken || !from || !serverUrl) {
    console.error('[TwilioService] Configuration error: Missing environment variables');
    throw new Error('Twilio configuration incomplete on server');
  }

  try {
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    // Authenticate via API Key & Secret with Account SID if provided, else fallback to Account SID + Auth Token
    const client = (apiKey && apiSecret) 
      ? twilio(apiKey, apiSecret, { accountSid }) 
      : twilio(accountSid, authToken);
    
    const call = await client.calls.create({
      url: `${serverUrl}/twilio/voice`,
      to: to,
      from: from,
    });

    console.log(`[TwilioService] Call created successfully. SID: ${call.sid}`);
    
    // Initialize state
    createCallSession(call.sid, to, entityName || 'Unknown Agent');

    return call;
  } catch (err) {
    console.error('[TwilioService] Twilio API Error:', err.message);
    // Rethrow with more context if it's a known Twilio error
    if (err.code === 21211) throw new Error(`Invalid phone number: ${to}`);
    if (err.code === 21608) throw new Error(`The number ${to} is unverified. Trial accounts can only call verified numbers.`);
    throw err;
  }
}

module.exports = {
  performOutboundCall
};
