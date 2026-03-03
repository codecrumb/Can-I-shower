const { VIEWER_TTL_MS } = require('../config');

const viewers = new Map();

function ping(id, now = Date.now()) {
    if (id) viewers.set(id, now);
}

function getCount(now = Date.now()) {
    const cutoff = now - VIEWER_TTL_MS;
    for (const [id, ts] of viewers) {
        if (ts < cutoff) viewers.delete(id);
    }
    return viewers.size;
}

module.exports = { ping, getCount };
