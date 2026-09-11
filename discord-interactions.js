const nacl = require('tweetnacl');

function verifySignature(event) {
  const signature = event.headers['x-signature-ed25519'];
  const timestamp = event.headers['x-signature-timestamp'];
  const body = event.body || '';

  if (!signature || !timestamp) return false;

  try {
    return nacl.sign.detached.verify(
      Buffer.from(timestamp + body),
      Buffer.from(signature, 'hex'),
      Buffer.from(process.env.DISCORD_PUBLIC_KEY, 'hex')
    );
  } catch {
    return false;
  }
}

exports.handler = async (event) => {
  if (!verifySignature(event)) {
    return { statusCode: 401, body: 'invalid request signature' };
  }

  const interaction = JSON.parse(event.body);

  // Discord verification ping
  if (interaction.type === 1) {
    return { statusCode: 200, body: JSON.stringify({ type: 1 }) };
  }

  // Button click - ack immediately, do the real work in the background.
  // Discord requires a response within 3 seconds; Firestore + a cold
  // function start can easily take longer than that.
  if (interaction.type === 3 && interaction.data?.custom_id?.startsWith('respond_')) {
    const siteUrl = `https://${event.headers.host}`;

    try {
      await fetch(`${siteUrl}/.netlify/functions/process-response-background`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callId: interaction.data.custom_id.slice('respond_'.length),
          member: interaction.member,
          user: interaction.user,
          message: interaction.message,
          applicationId: interaction.application_id,
          token: interaction.token,
        }),
      });
    } catch (err) {
      // If we can't even kick off the background job, still ack so the
      // user doesn't see a hard failure - the list just won't update.
      console.error('Failed to trigger background processing', err);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ type: 5 }), // DEFERRED_UPDATE_MESSAGE
    };
  }

  return { statusCode: 400, body: 'unhandled interaction' };
};
