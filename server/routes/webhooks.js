const crypto = require('crypto');
const { BMC_WEBHOOK_SECRET } = require('../config');
const { addDonation } = require('../services/donationsStore');

function verifySignature(rawBody, signatureHex) {
    if (!BMC_WEBHOOK_SECRET || !signatureHex) return false;
    const expected = crypto.createHmac('sha256', BMC_WEBHOOK_SECRET).update(rawBody).digest('hex');
    if (expected.length !== signatureHex.length) return false;
    try {
        return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signatureHex, 'hex'));
    } catch {
        return false;
    }
}

function handleBmcWebhookPost(rawBody, signatureHex) {
    if (!BMC_WEBHOOK_SECRET) {
        return { status: 501, data: { error: 'webhook_not_configured' } };
    }
    if (!verifySignature(rawBody, signatureHex)) {
        return { status: 401, data: { error: 'invalid_signature' } };
    }
    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch {
        return { status: 400, data: { error: 'invalid_json' } };
    }
    const type = payload.type;
    const data = payload.data || {};
    if (type !== 'donation.created') {
        return { status: 200, data: { ok: true } };
    }
    const note = data.support_note;
    if (!note || String(note).trim() === '') {
        return { status: 200, data: { ok: true } };
    }
    const name = data.supporter_name || 'Someone';
    const amount = data.amount != null ? data.amount : data.total_amount_charged;
    const currency = data.currency || 'USD';
    addDonation({ name, note: String(note).trim(), amount, currency });
    return { status: 200, data: { ok: true } };
}

module.exports = { handleBmcWebhookPost };
