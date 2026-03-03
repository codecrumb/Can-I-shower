const express = require('express');
const { findNearestLocation } = require('../services/locationService');
const { getParsedCache } = require('../services/alertFetcher');

const router = express.Router();

router.get('/', (req, res) => {
    res.json(getParsedCache().locations);
});

router.get('/nearest', (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
        return res.status(400).json({ error: 'invalid_coordinates' });
    const nearest = findNearestLocation(lat, lng);
    if (!nearest)
        return res.status(500).json({ error: 'location_index_unavailable' });
    res.json({ name: nearest.name, lat: nearest.lat, lng: nearest.lng });
});

module.exports = router;
