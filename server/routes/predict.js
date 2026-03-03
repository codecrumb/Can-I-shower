const fs = require('fs');
const path = require('path');
const { computeRisk, computeRiskFromState, DEFAULT_PARAMS, parseIsraelTimestamp, simulateHungerStateFrom } = require('../../shared');
const { formatResult, emptyResponse, getLevel } = require('../services/riskEngine');
const { getParsedCache } = require('../services/alertFetcher');
const { FETCH_INTERVAL_MS } = require('../config');

function loadModelParams() {
    try {
        const model = JSON.parse(fs.readFileSync(path.join(__dirname, '../../model.json'), 'utf8'));
        return model.params || DEFAULT_PARAMS;
    } catch (_) {
        return DEFAULT_PARAMS;
    }
}

const trainedParams = loadModelParams();

const predictCache = new Map();
const dailyRiskCache = new Map();

function getCached(cache, key) {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.ts < FETCH_INTERVAL_MS) return entry.value;
    cache.delete(key);
    return null;
}

function setCache(cache, key, value) {
    cache.set(key, { value, ts: Date.now() });
}

function parseDebugNow(val) {
    if (val == null || val === '') return null;
    const n = Number(val);
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

function handlePredict(searchParams) {
    const parsed = getParsedCache();
    const allSalvos = parsed.salvos;
    if (allSalvos.length === 0) return emptyResponse();

    const locationParam = searchParams.get('location');
    const locations = locationParam ? locationParam.split('|').map(l => l.trim()).filter(Boolean) : [];
    const duration = Math.max(1, parseInt(searchParams.get('duration'), 10) || 15);
    const debugNow = parseDebugNow(searchParams.get('debugNow'));
    const now = debugNow ?? Math.floor(Date.now() / 1000);

    const nowBucket = debugNow != null ? now : Math.floor(now / 30) * 30;
    const cacheKey = `${nowBucket}|${locationParam || ''}|${duration}`;
    const cached = getCached(predictCache, cacheKey);
    if (cached) return cached;

    let pastEnd = allSalvos.length;
    while (pastEnd > 0 && allSalvos[pastEnd - 1].timestamp > now) pastEnd--;
    if (pastEnd === 0) return emptyResponse();
    const pastSalvos = pastEnd === allSalvos.length ? allSalvos : allSalvos.slice(0, pastEnd);

    let result;
    if (locations.length > 0) result = resolveLocations(pastSalvos, locations, duration, now, trainedParams);
    if (!result) {
        const pred = computeRisk(pastSalvos, duration, now, trainedParams);
        result = formatResult(pred, pastSalvos, duration, now);
    }

    setCache(predictCache, cacheKey, result);
    return result;
}

function handleDailyRisk(searchParams) {
    const parsed = getParsedCache();
    const allSalvos = parsed.salvos;

    const locationParam = searchParams.get('location');
    const locations = locationParam ? locationParam.split('|').map(l => l.trim()).filter(Boolean) : [];
    const duration = Math.max(1, parseInt(searchParams.get('duration'), 10) || 15);

    const debugNow = parseDebugNow(searchParams.get('debugNow'));
    const nowSec = debugNow ?? Math.floor(Date.now() / 1000);
    const dateParam = searchParams.get('date');
    let dayStartSec;
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
        dayStartSec = parseIsraelTimestamp(`${dateParam} 00:00:00`);
    } else {
        const clock = new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date(nowSec * 1000));
        dayStartSec = parseIsraelTimestamp(`${clock} 00:00:00`);
    }
    const dayEndSec = dayStartSec + 86400;

    const nowBucket = debugNow != null ? nowSec : Math.floor(nowSec / 30) * 30;
    const cacheKey = `${dayStartSec}|${locationParam || ''}|${duration}|${nowBucket}`;
    const cached = getCached(dailyRiskCache, cacheKey);
    if (cached) return cached;

    const INTERVAL_MIN = 15;
    const points = [];
    let salvoIdx = 0;
    let hungerState = null;

    for (let minuteOfDay = 0; minuteOfDay < 1440; minuteOfDay += INTERVAL_MIN) {
        const pointSec = dayStartSec + minuteOfDay * 60;
        const prevSalvoIdx = salvoIdx;
        while (salvoIdx < allSalvos.length && allSalvos[salvoIdx].timestamp <= pointSec) salvoIdx++;
        const h = Math.floor(minuteOfDay / 60);
        const m = minuteOfDay % 60;
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        if (salvoIdx === 0) {
            points.push({ time, minuteOfDay, risk: 0, level: 'GREEN' });
            continue;
        }

        const newSalvos = salvoIdx > prevSalvoIdx ? allSalvos.slice(prevSalvoIdx, salvoIdx) : [];
        if (hungerState === null) {
            const firstSalvo = allSalvos[0];
            hungerState = { hunger: 0, satiation: 0, prevSec: firstSalvo.timestamp };
        }
        hungerState = simulateHungerStateFrom(hungerState, newSalvos, pointSec, trainedParams);

        const pastSalvos = allSalvos.slice(0, salvoIdx);
        let result;
        if (locations.length > 0) {
            result = resolveLocations(pastSalvos, locations, duration, pointSec, trainedParams);
        }
        if (!result) {
            const pred = computeRiskFromState(hungerState, pastSalvos, duration, pointSec, trainedParams);
            result = formatResult(pred, pastSalvos, duration, pointSec);
        }

        points.push({
            time,
            minuteOfDay,
            risk: result.risk,
            level: result.level,
            reasonings: (result.reasonings || []).map(r => ({ id: r.id, risk: r.risk })),
        });
    }

    const date = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date(dayStartSec * 1000));

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

    const result = { date, duration, points, salvos: salvosInDay };
    setCache(dailyRiskCache, cacheKey, result);
    return result;
}

module.exports = { handlePredict, handleDailyRisk };
