const { performExotelOutboundCall } = require('./service');

async function initiateExotelOutboundCall(req, res) {
  const { to, entity } = req.body;

  if (!to) {
    return res.status(400).json({ error: 'Missing phone number (to)' });
  }

  try {
    const call = await performExotelOutboundCall({
      to,
      entityName: entity
    });

    res.json({
      success: true,
      provider: 'exotel',
      callSid: call.sid,
      status: call.status
    });
  } catch (err) {
    console.error('[ExotelOutboundRoute] Error:', err.message);
    res.status(500).json({
      error: 'Failed to initiate Exotel call',
      details: err.message
    });
  }
}

module.exports = {
  initiateExotelOutboundCall
};
