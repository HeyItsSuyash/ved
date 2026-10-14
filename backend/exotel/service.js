const { getNumbersPool, recordCallOnNumber } = require('../state/ved');

/**
 * Initiates an outbound call using Exotel Call Connect API with automatic fallback.
 * If a line is busy or encounters capacity limits, it attempts the next line in priority order.
 *
 * @param {Object} params
 * @param {string} params.to - Recipient phone number (e.g. +919876543210 or 09876543210)
 * @param {string} [params.entityName='VED'] - Name of the agent/entity
 * @returns {Promise<Object>} - Exotel Call object with SID and routing details
 */
async function performExotelOutboundCall({ to, entityName = 'VED' }) {
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com';
  const serverUrl = process.env.PUBLIC_BASE_URL || process.env.SERVER_URL;

  // Validate credentials or log diagnostic
  if (!accountSid || !apiKey || !apiToken) {
    console.warn('[ExotelService] Warning: Exotel credentials not configured in environment. Using sandbox simulation mode.');
    return {
      sid: `exo_sim_${Date.now()}`,
      status: 'queued',
      provider: 'exotel-simulator',
      to,
      from: process.env.EXOTEL_CALLER_ID || '+916306987592'
    };
  }

  const pool = getNumbersPool();
  // Build candidate caller IDs in priority order
  const candidateNumbers = pool.length > 0
    ? pool.map(p => p.number)
    : [process.env.EXOTEL_CALLER_ID, '+916306987592'].filter(Boolean);

  let lastError = null;
  let callResult = null;
  const fallbackAttempts = [];

  const authHeader = 'Basic ' + Buffer.from(`${apiKey}:${apiToken}`).toString('base64');

  for (let i = 0; i < candidateNumbers.length; i++) {
    const callerId = candidateNumbers[i];
    console.log(`[ExotelService] Attempting outbound call to ${to} via line [${i + 1}/${candidateNumbers.length}]: ${callerId}`);

    try {
      const endpoint = `https://${subdomain}/v1/Accounts/${accountSid}/Calls/connect.json`;

      const bodyData = new URLSearchParams({
        From: to,
        CallerId: callerId,
        Url: `${serverUrl}/exotel/voice`,
        StatusCallback: `${serverUrl}/exotel/status`,
        CustomField: entityName
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyData.toString()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.RestException?.Message || `Exotel API error HTTP ${response.status}`);
      }

      const call = data.Call || data;
      recordCallOnNumber(callerId);
      console.log(`[ExotelService] Call created successfully. SID: ${call.Sid} via ${callerId}`);

      callResult = {
        sid: call.Sid,
        status: call.Status,
        from: callerId,
        to: to,
        provider: 'exotel'
      };
      break;
    } catch (err) {
      console.warn(`[ExotelService] Line ${callerId} failed: ${err.message}`);
      fallbackAttempts.push({ number: callerId, error: err.message });
      lastError = err;
    }
  }

  if (!callResult) {
    throw lastError || new Error('All Exotel caller lines failed');
  }

  return callResult;
}

module.exports = {
  performExotelOutboundCall
};
