const { handleStreamConnection } = require('../twilio/stream');

/**
 * Exotel Audio Streaming WebSocket Handler
 * Adapts Exotel's streaming protocol into the VED AI audio processing pipeline.
 */
function handleExotelStreamConnection(ws) {
  console.log('[ExotelStream] New audio WebSocket connection established for Exotel');

  // Intercept incoming messages to normalize Exotel stream headers if needed
  const originalOn = ws.on.bind(ws);

  ws.on('message', (data) => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.event === 'connected') {
        console.log('[ExotelStream] Exotel connected event received:', parsed);
      }
    } catch {
      // Binary or non-JSON payload handled by underlying stream processor
    }
  });

  // Delegate to core conversational audio processor
  handleStreamConnection(ws);
}

module.exports = {
  handleExotelStreamConnection
};
