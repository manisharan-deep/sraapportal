const env = require('../config/env');
const logger = require('../utils/logger');

const sendWhatsAppMessage = async ({ phone, message }) => {
  const hasRealEndpoint = Boolean(env.whatsappApiUrl) && !String(env.whatsappApiUrl).includes('example.com');

  if (!hasRealEndpoint) {
    logger.info('WhatsApp placeholder invoked', {
      endpoint: env.whatsappApiUrl,
      hasApiKey: Boolean(env.whatsappApiKey),
      phone,
      message
    });

    return { ok: true, provider: 'placeholder' };
  }

  try {
    const response = await fetch(env.whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.whatsappApiKey}`
      },
      body: JSON.stringify({
        phone,
        message
      })
    });

    if (!response.ok) {
      const text = await response.text();
      logger.error('WhatsApp API call failed', {
        status: response.status,
        response: text,
        phone
      });
      throw new Error(`WhatsApp API failed: ${response.status}`);
    }

    logger.info('WhatsApp message sent', { phone });
    return { ok: true, provider: 'api' };
  } catch (error) {
    logger.error('WhatsApp send error', { error: error.message, phone });
    throw error;
  }
};

module.exports = { sendWhatsAppMessage };
