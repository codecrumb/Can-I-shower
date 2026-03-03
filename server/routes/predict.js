const express = require('express');
const fs = require('fs');
const path = require('path');
const { computeRisk, DEFAULT_PARAMS, parseIsraelTimestamp } = require('../../shared');
const { formatResult, emptyResponse, getLevel } = require('../services/riskEngine');
const { getParsedCache } = require('../services/alertFetcher');

const router = express.Router();

function loadModelParams() {
    try {
        const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../../model.json'), 'utf8'));
        return model.params || DEFAULT_PARAMS;
    } catch (_) {
        return DEFAULT_PARAMS;
    }
}

const trainedParams = loadModelParams();

function parseDebugNow(val) {
    if (val == null || val === '') return null;
    const n = Number(val);
    // Accept epoch in seconds or milliseconds
    if (!Number.isNaN(n) && n > 0) return Math.floor(n < 1e12 ? n : n / 1000);
    return null;
}

function resolveLocations(allSalvos, locations, duration, now, params) {
    let worstRisk = -1;
    let worstResult = null;
    for (const loc of locations) {
        const filtered = allSalvos.filter(s => s.locations && s.locations.has(loc));
        const pred = computeRisk(filtered, duration, now, params);
        if (pred.risk > worstRisk) {
            worstRisk = pred.risk;
            worstResult = formatResult(pred, filtered, duration, now);
        }
    }
    return worstResult;
}

router.get('/', (req, res) => {
    const parsed = getParsedCache();
    const allSalvos = parsed.salvos;
    if (allSalvos.length === 0) return res.json(emptyResponse());

    const locationParam = req.query.location;
    const locations = locationParam ? locationParam.split('|').map(l => l.trim()).filter(Boolean) : [];
    const duration = Math.max(1, parseInt(req.query.duration, 10) || 15);
    const now = parseDebugNow(req.query.debugNow) ?? Math.floor(Date.now() / 1000);

    const pastSalvos = allSalvos.filter(s => s.timestamp <= now);
    if (pastSalvos.length === 0) return res.json(emptyResponse());

    if (locations.length > 0) {
        const result = resolveLocations(pastSalvos, locations, duration, now, trainedParams);
        if (result) return res.json(result);
    }

    const pred = computeRisk(pastSalvos, duration, now, trainedParams);
    res.json(formatResult(pred, pastSalvos, duration, now));
});

router.get('/daily-risk', (req, res) => {
    const parsed = getParsedCache();
    const allSalvos = parsed.salvos;

    const locationParam = req.query.location;
    const locations = locationParam ? locationParam.split('|').map(l => l.trim()).filter(Boolean) : [];
    const duration = Math.max(1, parseInt(req.query.duration, 10) || 15);

    // Determine the day to compute: default to today in Israel time
    const nowSec = Math.floor(Date.now() / 1000);
    const dateParam = req.query.date;
    let dayStartSec;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        dayStartSec = parseIsraelTimestamp(`${dateParam} 00:00:00`);
    } else {
        // Start of today in Israel time
        const clock = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date(nowSec * 1000));
        dayStartSec = parseIsraelTimestamp(`${clock} 00:00:00`);
    }
    const dayEndSec = dayStartSec + 86400;

    const INTERVAL_MIN = 15;
    const points = [];

    for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay += INTERVAL_MIN) {
        const pointSec = dayStartSec + minuteOfDay * 60;
        const pastSalvos = allSalvos.filter(s => s.timestamp <= pointSec);

        if (pastSalvos.length === 0) {
            points.push({
                time: `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`,
                minuteOfDay,
                risk: 0,
                level: 'GREEN',
            });
            continue;
        }

        let result;
        if (locations.length > 0) {
            result = resolveLocations(pastSalvos, locations, duration, pointSec, trainedParams);
        }
        if (!result) {
            const pred = computeRisk(pastSalvos, duration, pointSec, trainedParams);
            result = formatResult(pred, pastSalvos, duration, pointSec);
        }

        points.push({
            time: `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`,
            minuteOfDay,
            risk: result.risk,
            level: result.level,
            reasonings: (result.reasonings || []).map(r => ({ id: r.id, risk: r.risk })),
        });
    }

    const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(dayStartSec * 1000));

    // Salvo timestamps within this day for alert markers on the graph
    const salvosInDay = allSalvos
        .filter(s => s.timestamp >= dayStartSec && s.timestamp < dayEndSec)
        .filter(s => locations.length === 0 || locations.some(loc => s.locations && s.locations.has(loc)))
        .map(s => {
            const minuteOfDay = Math.floor((s.timestamp - dayStartSec) / 60);
            const h = Math.floor(minuteOfDay / 60);
            const m = minuteOfDay % 60;
            return {
                time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
                minuteOfDay,
            };
        });

    res.json({ date, duration, points, salvos: salvosInDay });
});

module.exports = router;
