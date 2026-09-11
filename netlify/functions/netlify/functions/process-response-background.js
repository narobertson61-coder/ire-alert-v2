const admin = require('firebase-admin');

function getDb() {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),
    });
  }
  return admin.firestore();
}

exports.handler = async (event) => {
  const { callId, member, user, message, applicationId, token } = JSON.parse(event.body);

  const actualUser = member?.user || user;
  const displayName = member?.nick || actualUser?.global_name || actualUser?.username || 'Unknown';

  const db = getDb();
  const callRef = db.collection('calls').doc(callId);

  await db.runTransaction(async (tx) => {
    const doc = await tx.get(callRef);
    if (!doc.exists) return;
    const responders = doc.data().responders || [];
    if (!responders.includes(displayName)) {
      responders.push(displayName);
      tx.update(callRef, { responders });
    }
  });

  const updatedDoc = await callRef.get();
  const responders = (updatedDoc.exists && updatedDoc.data().responders) || [];

  const originalEmbed = message.embeds[0] || { fields: [] };
  const updatedFields = (originalEmbed.fields || []).map((f) =>
    f.name === 'Responding'
      ? { name: 'Responding', value: responders.length ? responders.join('\n') : '_No one yet_' }
      : f
  );

  await fetch(`https://discord.com/api/v10/webhooks/${applicationId}/${token}/messages/@original`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      embeds: [{ ...originalEmbed, fields: updatedFields }],
      components: message.components,
    }),
  });

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
