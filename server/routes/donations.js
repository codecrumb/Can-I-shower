const { getSince } = require('../services/donationsStore');

function handleDonationsGet(searchParams) {
    const after = searchParams.get('after') || '0';
    const donations = getSince(after);
    return { donations };
}

module.exports = { handleDonationsGet };
