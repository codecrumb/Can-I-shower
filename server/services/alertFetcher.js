const https = require('https');
const { buildSalvos, parseIsraelTimestamp } = require('../../shared');
const { API_BASE, REALTIME_URL, HTTP_TIMEOUT_MS } = require('../config');

function isoDate(d) { return d.toISOString().slice(0, 10); }

function fetchAlerts(from, to) {
    const url = new URL(`${API_BASE}?from=${from}&to=${to}`);
    return new Promise((resolve, reject) => {
        const req = https.request(
            { hostname: url.hostname, path: url.pathname + url.search, method: 'GET' },
            (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (!json.success) return reject(new Error(json.error || 'API error'));
                        const alerts = [];
                        for (const day of json.payload) {
                            for (const a of day.alerts) {
                                if (a.alertTypeId !== 1 && a.alertTypeId !== 2) continue;
                                alerts.push({
                                    location: a.name,
                                    timestamp: parseIsraelTimestamp(a.timeStamp),
                                    type: a.alertTypeId
                                });
                            }
                        }
                        resolve(alerts);
                    } catch (e) { reject(e); }
                });
            }
        );
        req.on('error', reject);
        const t = setTimeout(() => { req.destroy(); reject(new Error('timeout')); }, HTTP_TIMEOUT_MS);
        req.on('close', () => clearTimeout(t));
        req.end();
    });
}

function fetchRealtimeCached() {
    const url = new URL(REALTIME_URL);
    return new Promise((resolve, reject) => {
        const req = https.request(
            { hostname: url.hostname, path: url.pathname, method: 'GET' },
            (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        if (!json.success) return reject(new Error(json.error || 'API error'));
                        const alerts = [];
                        for (const group of json.payload) {
                            for (const a of group.alerts) {
                                if (a.alertTypeId !== 1 && a.alertTypeId !== 2) continue;
                                alerts.push({
                                    location: a.name,
                                    timestamp: parseIsraelTimestamp(a.timeStamp),
                                    type: a.alertTypeId
                                });
                            }
                        }
                        resolve(alerts);
                    } catch (e) { reject(e); }
                });
            }
        );
        req.on('error', reject);
        const t = setTimeout(() => { req.destroy(); reject(new Error('timeout')); }, HTTP_TIMEOUT_MS);
        req.on('close', () => clearTimeout(t));
        req.end();
    });
}

function mergeAlerts(existing, incoming) {
    const seen = new Set(existing.map(a => `${a.timestamp}:${a.location}`));
    let added = 0;
    for (const a of incoming) {
        const key = `${a.timestamp}:${a.location}`;
        if (!seen.has(key)) {
            existing.push(a);
            seen.add(key);
            added++;
        }
    }
    if (added > 0) existing.sort((a, b) => a.timestamp - b.timestamp);
    return added;
}

// Shared mutable state for the alert cache
const state = {
    allAlerts: [],
    parsedCache: null,
    lastFetch: null,
};

async function fetchHistorical(HISTORY_DAYS) {
    const now = new Date();
    const from = new Date(now.getTime() - HISTORY_DAYS * 86400000);
    const [historical, realtime] = await Promise.all([
        fetchAlerts(isoDate(from), isoDate(now)),
        fetchRealtimeCached().catch(() => [])
    ]);
    mergeAlerts(state.allAlerts, historical);
    mergeAlerts(state.allAlerts, realtime);
    state.parsedCache = buildSalvos(state.allAlerts);
    state.lastFetch = Date.now();
    console.log(`Historical fetch: ${state.allAlerts.length} alerts, ${state.parsedCache.salvos.length} salvos`);
}

async function fetchRecent() {
    const now = new Date();
    const from = new Date(now.getTime() - 2 * 86400000);
    const [historical, realtime] = await Promise.all([
        fetchAlerts(isoDate(from), isoDate(now)).catch(() => []),
        fetchRealtimeCached().catch(() => [])
    ]);
    const added = mergeAlerts(state.allAlerts, historical) + mergeAlerts(state.allAlerts, realtime);
    if (added > 0) state.parsedCache = buildSalvos(state.allAlerts);
    state.lastFetch = Date.now();
}

function getParsedCache() {
    return state.parsedCache || buildSalvos(state.allAlerts);
}

module.exports = { fetchHistorical, fetchRecent, getParsedCache, mergeAlerts, state };
