import { describe, it, expect } from 'vitest';

function makeDailyPoints(count = 96) {
    return Array.from({ length: count }, (_, i) => {
        const minuteOfDay = i * 15;
        const h = Math.floor(minuteOfDay / 60);
        const m = minuteOfDay % 60;
        return {
            time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
            minuteOfDay,
            risk: Math.random() * 0.8 + 0.1,
            level: 'YELLOW',
        };
    });
}

function bestTimeWindow(points, currentMinuteOfDay) {
    if (!points || !points.length) return null;
    const futurePoints = points.filter(p => p.minuteOfDay >= currentMinuteOfDay);
    if (!futurePoints.length) return null;
    let minRisk = Infinity;
    let best = null;
    for (const p of futurePoints) {
        if (p.risk < minRisk) { minRisk = p.risk; best = p; }
    }
    return best;
}

describe('DailyGraph bestTimeWindow logic', () => {
    it('returns null when there are no points', () => {
        expect(bestTimeWindow([], 600)).toBeNull();
    });

    it('returns null when all points are in the past', () => {
        const points = makeDailyPoints(4).map((p, i) => ({ ...p, minuteOfDay: i * 15 }));
        // currentMinuteOfDay is after all points
        expect(bestTimeWindow(points, 1440)).toBeNull();
    });

    it('never returns a point in the past', () => {
        const points = makeDailyPoints();
        const currentMin = 720; // 12:00
        const best = bestTimeWindow(points, currentMin);
        expect(best).not.toBeNull();
        expect(best.minuteOfDay).toBeGreaterThanOrEqual(currentMin);
    });

    it('returns the point with the lowest risk among future points', () => {
        const points = [
            { time: '10:00', minuteOfDay: 600, risk: 0.1, level: 'GREEN' },
            { time: '14:00', minuteOfDay: 840, risk: 0.05, level: 'GREEN' },
            { time: '18:00', minuteOfDay: 1080, risk: 0.3, level: 'YELLOW' },
        ];
        // currentMinuteOfDay = 700 → past: 10:00, future: 14:00, 18:00
        const best = bestTimeWindow(points, 700);
        expect(best.time).toBe('14:00');
        expect(best.risk).toBe(0.05);
    });

    it('ignores past points even if they have lower risk', () => {
        const points = [
            { time: '06:00', minuteOfDay: 360, risk: 0.01, level: 'GREEN' }, // past, lowest risk
            { time: '14:00', minuteOfDay: 840, risk: 0.2, level: 'GREEN' },  // future
            { time: '20:00', minuteOfDay: 1200, risk: 0.4, level: 'YELLOW' }, // future
        ];
        const best = bestTimeWindow(points, 720); // current = 12:00
        expect(best.time).toBe('14:00'); // NOT 06:00
        expect(best.minuteOfDay).toBeGreaterThanOrEqual(720);
    });

    it('includes the current minute point as a candidate', () => {
        const points = [
            { time: '12:00', minuteOfDay: 720, risk: 0.05, level: 'GREEN' },
            { time: '14:00', minuteOfDay: 840, risk: 0.3, level: 'YELLOW' },
        ];
        // current = exactly 720 → 12:00 should be included
        const best = bestTimeWindow(points, 720);
        expect(best.time).toBe('12:00');
    });
});
