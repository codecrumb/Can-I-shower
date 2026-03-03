const express = require('express');
const { getParsedCache, state } = require('../services/alertFetcher');

const router = express.Router();

router.get('/', (req, res) => {
    const parsed = getParsedCache();
    const latestAlert = parsed.salvos.length > 0
        ? parsed.salvos[parsed.salvos.length - 1].timestamp
        : null;
    res.json({
        lastFetch: state.lastFetch,
        alertCount: state.allAlerts.length,
        salvoCount: parsed.salvos.length,
        latestAlert,
        modelType: 'hunger+heuristics',
    });
});

module.exports = router;
