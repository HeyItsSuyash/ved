const { performOutboundCall } = require('./service');
const { performExotelOutboundCall } = require('../exotel/service');

async function initiateOutboundCall(req, res) {
  const { to, entity } = req.body;
  
  if (!to) {
    return res.status(400).json({ error: 'Missing phone number (to)' });
  }

  const provider = (process.env.TELEPHONY_PROVIDER || 'twilio').toLowerCase();

  try {
    let call;
    if (provider === 'exotel') {
      console.log(`[OutboundRoute] Routing call via Exotel to ${to}`);
      call = await performExotelOutboundCall({
        to,
        entityName: entity || 'VED'
      });
    } else {
      console.log(`[OutboundRoute] Routing call via Twilio to ${to}`);
      call = await performOutboundCall({ 
        to, 
        entityName: entity || 'VED'
      });
    }

    res.json({ success: true, callSid: call.sid, provider: call.provider || provider });
  } catch (err) {
    console.error('[OutboundRoute] Error:', err.message);
    res.status(500).json({ 
      error: 'Failed to initiate call', 
      details: err.message 
    });
  }
}

module.exports = {
  initiateOutboundCall
};
