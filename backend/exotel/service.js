const axios = require('axios');
const { createCallSession } = require('../state/calls');

/**
 * Initiates an outbound call using Exotel Connect App API
 * Documentation: https://support.exotel.com/support/solutions/articles/3000023070-connecting-two-numbers-or-a-number-to-a-flow-via-api
 * 
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. 09876543210 or +919876543210)
 * @param {string} params.entityName - Name of the agent/entity
 * @returns {Promise<Object>} - Exotel Call response object
 */
async function performExotelOutboundCall({ to, entityName }) {
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const callerId = process.env.EXOTEL_PHONE_NUMBER;
  const appId = process.env.EXOTEL_APP_ID;

  console.log(`[ExotelService] Attempting outbound call to ${to} using ExoPhone ${callerId} and App ID ${appId}`);

  if (!accountSid || !apiKey || !apiToken || !callerId || !appId) {
    console.error('[ExotelService] Configuration error: Missing Exotel environment variables in .env');
    throw new Error('Exotel configuration incomplete on server');
  }

  // Format recipient number (strip non-digits, ensure standard format)
  let formattedTo = to.replace(/[^\d+]/g, '');
  if (formattedTo.startsWith('+91')) {
    formattedTo = formattedTo.substring(3);
  } else if (formattedTo.startsWith('91') && formattedTo.length === 12) {
    formattedTo = formattedTo.substring(2);
  }
  // Exotel generally expects 10 digits or 10 digits with leading 0 for domestic numbers
  if (formattedTo.length === 10) {
    formattedTo = '0' + formattedTo;
  }

  // Construct standard Basic Auth header
  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

  // Exotel endpoint to connect a phone number to an App/Flow:
  // POST https://<api_key>:<api_token>@api.exotel.com/v1/Accounts/<account_sid>/Calls/connect.json
  const url = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect.json`;

  const params = new URLSearchParams();
  params.append('From', formattedTo);
  params.append('CallerId', callerId);
  params.append('Url', `http://my.exotel.com/${accountSid}/exoml/start_voice/${appId}`);
  params.append('CallType', 'trans');

  // Status callback if available
  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL;
  if (serverUrl) {
    params.append('StatusCallback', `${serverUrl.replace(/\/$/, '')}/exotel/status`);
    params.append('StatusCallbackEvents[0]', 'terminal');
  }

  try {
    const response = await axios.post(url, params.toString(), {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const callData = response.data?.Call || response.data;
    const callSid = callData.Sid || callData.sid || `exotel_${Date.now()}`;

    console.log(`[ExotelService] Call successfully dispatched. SID: ${callSid}`);

    // Track in call session state
    createCallSession(callSid, to, entityName || 'Unknown Agent');

    return {
      sid: callSid,
      provider: 'exotel',
      status: callData.Status || 'queued',
      raw: callData
    };
  } catch (err) {
    const errorDetails = err.response?.data || err.message;
    console.error('[ExotelService] Exotel API Error:', JSON.stringify(errorDetails));
    throw new Error(`Exotel Call Failed: ${err.response?.data?.RestException?.Message || err.message}`);
  }
}

module.exports = {
  performExotelOutboundCall
};
