<script>
import { useTranslations } from '@/composables/useTranslations.js';
import { fmtMin } from '@/utils/formatters.js';

export default {
    props: {
        minutesSinceLastAlert: { type: Number, default: null },
        avgGapLast10Minutes: { type: Number, default: null },
        salvoCount: { type: Number, default: 0 },
        trend: { type: String, default: 'stable' },
    },
    setup() {
        return useTranslations();
    },
    computed: {
        trendClass() {
            if (this.trend === 'increasing') return 'trend-up';
            if (this.trend === 'decreasing') return 'trend-down';
            return 'trend-stable';
        },
        trendIcon() {
            if (this.trend === 'increasing') return '↑';
            if (this.trend === 'decreasing') return '↓';
            return '→';
        },
        trendText() {
            if (this.trend === 'increasing') return this.t.trendUp;
            if (this.trend === 'decreasing') return this.t.trendDown;
            return this.t.trendStable;
        },
    },
    methods: {
        fmt(m) { return fmtMin(m, this.t); },
    },
};
</script>

<template>
    <section class="cards-grid">
        <div class="glass info-card">
            <div class="info-card-title">{{ t.timeSince }}</div>
            <div class="info-card-value">{{ fmt(minutesSinceLastAlert) }}</div>
        </div>
        <div class="glass info-card">
            <div class="info-card-title">{{ t.avgGapLast10 }}</div>
            <div class="info-card-value">{{ fmt(avgGapLast10Minutes) }}</div>
        </div>
        <div class="glass info-card">
            <div class="info-card-title">{{ t.alertCount }}</div>
            <div class="info-card-value">{{ salvoCount || '–' }}</div>
        </div>
        <div class="glass info-card">
            <div class="info-card-title">{{ t.trend }}</div>
            <div class="info-card-value" :class="trendClass">
                {{ trendIcon }} {{ trendText }}
            </div>
        </div>
    </section>
</template>
