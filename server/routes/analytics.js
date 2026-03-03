const express = require('express');
const { ping, getCount } = require('../services/viewerTracker');

const router = express.Router();

router.get('/ping', (req, res) => {
    const rawId = typeof req.query.id === 'string' ? req.query.id : '';
    ping(rawId.slice(0, 64));
    res.json({ viewers: getCount() });
});

module.exports = router;
