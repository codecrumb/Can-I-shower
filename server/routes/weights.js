const express = require('express');
const { DEFAULT_WEIGHTS } = require('../services/riskEngine');

const router = express.Router();

const userVotes = {};

function getCrowdWeights() {
    const sums = {};
    const counts = {};
    for (const id of Object.keys(DEFAULT_WEIGHTS)) {
        sums[id] = 0;
        counts[id] = 0;
    }
    for (const weights of Object.values(userVotes)) {
        for (const [id, val] of Object.entries(weights)) {
            if (!(id in DEFAULT_WEIGHTS)) continue;
            sums[id] += val;
            counts[id] += 1;
        }
    }
    const result = {};
    for (const [id, defaultVal] of Object.entries(DEFAULT_WEIGHTS)) {
        result[id] = counts[id] > 0 ? sums[id] / counts[id] : defaultVal;
    }
    return result;
}

router.get('/', (_req, res) => {
    res.json(getCrowdWeights());
});

router.post('/', express.json(), (req, res) => {
    const { weights, viewerId } = req.body || {};
    if (!weights || typeof weights !== 'object' || !viewerId) return res.status(400).json({ error: 'invalid body' });

    const cleaned = {};
    for (const [id, val] of Object.entries(weights)) {
        if (!(id in DEFAULT_WEIGHTS)) continue;
        const v = Number(val);
        if (Number.isNaN(v) || v < 0 || v > 1) continue;
        cleaned[id] = v;
    }
    if (Object.keys(cleaned).length) userVotes[viewerId] = cleaned;

    res.json(getCrowdWeights());
});

module.exports = router;
