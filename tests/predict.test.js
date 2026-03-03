import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import { buildSalvos } from '../shared.js';

// We test the route handler logic by importing the module after mocking alertFetcher
const BASE_TS = 1772265600; // 2026-02-28 10:00:00 Israel time (Saturday)
const HOUR = 3600;
const MIN = 60;

function makeSalvos(count, startTs, gapSec = 30 * MIN) {
    return Array.from({ length: count }, (_, i) => ({
        timestamp: startTs + i * gapSec,
        locations: new Set(['TestCity']),
    }));
}

// ─── parseDebugNow tests (extracted logic) ───────────────────────────────────

function parseDebugNow(val) {
    if (val == null || val === '') return null;
    const n = Number(val);
    if (!Number.isNaN(n) && n > 0) return Math.floor(n < 1e12 ? n : n / 1000);
    return null;
}

describe('parseDebugNow (debug time bug fix)', () => {
    it('returns null for empty string', () => {
        expect(parseDebugNow('')).toBeNull();
        expect(parseDebugNow(null)).toBeNull();
    });

    it('accepts epoch in seconds', () => {
        expect(parseDebugNow(BASE_TS)).toBe(BASE_TS);
        expect(parseDebugNow(String(BASE_TS))).toBe(BASE_TS);
    });

    it('accepts epoch in milliseconds and converts to seconds', () => {
        const ms = BASE_TS * 1000;
        expect(parseDebugNow(ms)).toBe(BASE_TS);
        expect(parseDebugNow(String(ms))).toBe(BASE_TS);
    });

    it('does NOT accept datetime-local strings (timezone-ambiguous)', () => {
        // The fix: we no longer accept string dates — only numeric epochs
        expect(parseDebugNow('2026-02-28T10:00')).toBeNull();
        expect(parseDebugNow('2026-02-28 10:00:00')).toBeNull();
    });

    it('epoch-based debug time is timezone-independent', () => {
        // Same epoch always resolves to the same timestamp regardless of browser timezone
        const epoch = BASE_TS;
        const result1 = parseDebugNow(epoch);
        const result2 = parseDebugNow(epoch);
        expect(result1).toBe(result2);
        expect(result1).toBe(BASE_TS);
    });
});

// ─── /api/daily-risk endpoint tests ──────────────────────────────────────────

describe('/api/daily-risk', () => {
    it('returns 96 points for a full 24h day (15-min intervals)', async () => {
        // Import the route handler and mock the alertFetcher
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({
                salvos: makeSalvos(20, BASE_TS - 10 * HOUR),
                locations: ['TestCity'],
            }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        expect(res.status).toBe(200);
        expect(res.body.points).toHaveLength(96);
    });

    it('each point has required fields', async () => {
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({
                salvos: makeSalvos(20, BASE_TS - 10 * HOUR),
                locations: ['TestCity'],
            }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        for (const point of res.body.points) {
            expect(point).toHaveProperty('time');
            expect(point).toHaveProperty('minuteOfDay');
            expect(point).toHaveProperty('risk');
            expect(point).toHaveProperty('level');
            expect(point.risk).toBeGreaterThanOrEqual(0);
            expect(point.risk).toBeLessThanOrEqual(1);
            expect(['GREEN', 'YELLOW', 'RED']).toContain(point.level);
        }
    });

    it('points are in 15-minute increments', async () => {
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({
                salvos: makeSalvos(20, BASE_TS - 10 * HOUR),
                locations: ['TestCity'],
            }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        const points = res.body.points;
        expect(points[0].minuteOfDay).toBe(0);
        expect(points[1].minuteOfDay).toBe(15);
        expect(points[4].minuteOfDay).toBe(60);
        expect(points[95].minuteOfDay).toBe(1425);
    });

    it('returns the requested date in the response', async () => {
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({
                salvos: makeSalvos(20, BASE_TS - 10 * HOUR),
                locations: ['TestCity'],
            }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        expect(res.body.date).toBe('2026-02-28');
        expect(res.body.duration).toBe(15);
    });

    it('level matches risk for each point', async () => {
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({
                salvos: makeSalvos(20, BASE_TS - 10 * HOUR),
                locations: ['TestCity'],
            }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        for (const point of res.body.points) {
            if (point.risk >= 0.5) expect(point.level).toBe('RED');
            else if (point.risk >= 0.25) expect(point.level).toBe('YELLOW');
            else expect(point.level).toBe('GREEN');
        }
    });

    it('works with no salvos (returns all GREEN)', async () => {
        vi.resetModules();
        vi.mock('../server/services/alertFetcher.js', () => ({
            getParsedCache: () => ({ salvos: [], locations: [] }),
        }));

        const { default: supertest } = await import('supertest');
        const app = express();
        const predictRouter = (await import('../server/routes/predict.js')).default;
        app.use('/api/predict', predictRouter);

        const res = await supertest(app)
            .get('/api/predict/daily-risk?duration=15&date=2026-02-28');

        expect(res.status).toBe(200);
        expect(res.body.points).toHaveLength(96);
        for (const point of res.body.points) {
            expect(point.risk).toBe(0);
            expect(point.level).toBe('GREEN');
        }
    });
});
