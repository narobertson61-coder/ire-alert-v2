const admin = require('firebase-admin');

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }
  return admin.firestore();
}

const COLOR_BY_PRIORITY = {
  P1: 0xd7263d,
  P2: 0xf2a93b,
  P3: 0x3b6ef2,
};
const DEFAULT_COLOR = 0x9aa0a6;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { type, priority, address, notes, units } = payload;
  if (!type || !address) {
    return { statusCode: 400, body: JSON.stringify({ error: 'type and address are required' }) };
  }

  // Log the call to Firestore for a record, but Discord posting no longer
  // depends on this succeeding first.
  try {
    const db = getDb();
    await db.collection('calls').add({
      type,
      priority: priority || '',
      address,
      notes: notes || '',
      units: Array.isArray(units) ? units : [],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to log call to Firestore', err);
  }

  const embed = {
    title: priority ? `${type.toUpperCase()} — ${priority}` : type.toUpperCase(),
    color: COLOR_BY_PRIORITY[priority] || DEFAULT_COLOR,
    fields: [
      { name: 'Address', value: address },
      ...(Array.isArray(units) && units.length ? [{ name: 'Units', value: units.join(', ') }] : []),
      ...(notes ? [{ name: 'Notes', value: notes }] : []),
    ],
    timestamp: new Date().toISOString(),
  };

  const discordRes = await fetch(
    `https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: process.env.DISCORD_ROLE_ID ? `<@&${process.env.DISCORD_ROLE_ID}>` : undefined,
        embeds: [embed],
        allowed_mentions: { parse: ['roles'] },
      }),
    }
  );

  if (!discordRes.ok) {
    const errText = await discordRes.text();
    return { statusCode: 502, body: JSON.stringify({ error: `Discord error: ${errText}` }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
