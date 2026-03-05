const { ping, getCount } = require('../services/viewerTracker');
const { hasNewSince } = require('../services/donationsStore');

function handleAnalyticsPing(searchParams) {
    const rawId = searchParams.get('id') || '';
    ping(rawId.slice(0, 64));
    const lastDonationId = searchParams.get('lastDonationId') || '0';
    const hasNewDonations = hasNewSince(lastDonationId);
    return { viewers: getCount(), hasNewDonations };
}

module.exports = { handleAnalyticsPing };
