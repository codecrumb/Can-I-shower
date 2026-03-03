<script>
import { useTranslations } from '@/composables/useTranslations.js';

export default {
    props: {
        points: { type: Array, default: () => [] },
        salvos: { type: Array, default: () => [] },
        weights: { type: Object, default: () => ({}) },
        isLoading: Boolean,
    },
    setup() {
        return useTranslations();
    },
    data() {
        return { chart: null };
    },
    watch: {
        points: { handler: 'updateChart', deep: true },
        salvos: { handler: 'updateChart', deep: true },
        weights: { handler: 'updateChart', deep: true },
        lang: 'updateChart',
    },
    mounted() {
        this.updateChart();
    },
    beforeUnmount() {
        if (this.chart) { this.chart.destroy(); this.chart = null; }
    },
    computed: {
        weightedPoints() {
            if (!this.points?.length) return [];
            const w = this.weights;
            const hasWeights = w && Object.keys(w).length > 0;
            return this.points.map(p => {
                if (!hasWeights || !p.reasonings?.length) return p;
                const totalW = p.reasonings.reduce((s, r) => s + (w[r.id] ?? 0), 0) || 1;
                const risk = Math.max(0, Math.min(0.99, p.reasonings.reduce((s, r) => s + ((w[r.id] ?? 0) / totalW) * r.risk, 0)));
                return { ...p, risk };
            });
        },
        bestTimeWindow() {
            if (!this.weightedPoints.length) return null;
            const futurePoints = this.weightedPoints.filter(p => p.minuteOfDay >= this.currentMinuteOfDay);
            if (!futurePoints.length) return null;
            let minRisk = Infinity;
            let best = null;
            for (const p of futurePoints) {
                if (p.risk < minRisk) { minRisk = p.risk; best = p; }
            }
            return best;
        },
        currentMinuteOfDay() {
            const now = new Date();
            return now.getHours() * 60 + now.getMinutes();
        },
    },
    methods: {
        updateChart() {
            if (!this.weightedPoints.length) {
                if (this.chart) { this.chart.destroy(); this.chart = null; }
                return;
            }
            setTimeout(() => {
                const el = this.$refs.chartEl;
                if (!el) return;

                const minuteToTime = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
                const seriesData = this.weightedPoints.map(p => ({ x: p.minuteOfDay, y: Math.round(p.risk * 100) }));
                const bestTime = this.bestTimeWindow;
                const currentMin = this.currentMinuteOfDay;
                const t = this.t;

                const annotations = { xaxis: [] };

                for (const salvo of this.salvos) {
                    annotations.xaxis.push({
                        x: salvo.minuteOfDay,
                        borderColor: '#ef4444',
                        strokeDashArray: 0,
                        borderWidth: 1,
                        opacity: 0.5,
                        label: { text: '', style: { background: 'transparent' } },
                    });
                }

                annotations.xaxis.push({
                    x: currentMin,
                    borderColor: '#a5b4fc',
                    strokeDashArray: 4,
                    label: {
                        text: t.currentTimeLabel,
                        style: { color: '#fff', background: '#4f46e5', fontSize: '11px' },
                    },
                });

                if (bestTime) {
                    annotations.xaxis.push({
                        x: bestTime.minuteOfDay,
                        borderColor: '#4ade80',
                        strokeDashArray: 0,
                        borderWidth: 2,
                        label: {
                            text: `${t.bestTimeLabel}: ${bestTime.time}`,
                            style: { color: '#fff', background: '#16a34a', fontSize: '11px' },
                            position: 'bottom',
                            offsetY: -10,
                        },
                    });
                }

                const options = {
                    chart: {
                        type: 'area',
                        background: 'transparent',
                        height: 260,
                        toolbar: { show: false },
                        animations: { enabled: true, speed: 400 },
                        sparkline: { enabled: false },
                    },
                    theme: { mode: 'dark' },
                    series: [{ name: '%', data: seriesData }],
                    xaxis: {
                        type: 'numeric',
                        min: 0,
                        max: 1440,
                        tickAmount: 8,
                        labels: {
                            formatter: val => minuteToTime(Math.round(val)),
                            style: { colors: '#64748b', fontSize: '11px' },
                            rotate: 0,
                        },
                        axisBorder: { show: false },
                        axisTicks: { show: false },
                    },
                    yaxis: {
                        min: 0,
                        max: 100,
                        tickAmount: 4,
                        labels: {
                            formatter: val => `${val}%`,
                            style: { colors: '#64748b', fontSize: '11px' },
                        },
                    },
                    fill: {
                        type: 'gradient',
                        gradient: {
                            shadeIntensity: 1,
                            opacityFrom: 0.5,
                            opacityTo: 0.05,
                            stops: [0, 90, 100],
                            colorStops: [
                                { offset: 0, color: '#f87171', opacity: 0.5 },
                                { offset: 50, color: '#fbbf24', opacity: 0.3 },
                                { offset: 100, color: '#4ade80', opacity: 0.05 },
                            ],
                        },
                    },
                    stroke: {
                        curve: 'smooth',
                        width: 2,
                        colors: ['#818cf8'],
                    },
                    // Color zones: green 0-25%, yellow 25-50%, red 50-100%
                    annotations: {
                        ...annotations,
                        yaxis: [
                            {
                                y: 0, y2: 25,
                                fillColor: '#4ade80',
                                opacity: 0.05,
                                label: { text: '', style: { background: 'transparent' } },
                            },
                            {
                                y: 25, y2: 50,
                                fillColor: '#fbbf24',
                                opacity: 0.05,
                                label: { text: '', style: { background: 'transparent' } },
                            },
                            {
                                y: 50, y2: 100,
                                fillColor: '#f87171',
                                opacity: 0.05,
                                label: { text: '', style: { background: 'transparent' } },
                            },
                        ],
                    },
                    tooltip: {
                        theme: 'dark',
                        intersect: false,
                        followCursor: true,
                        x: { formatter: val => minuteToTime(Math.round(val)) },
                        y: { formatter: val => `${val}%` },
                    },
                    grid: {
                        borderColor: 'rgba(255,255,255,0.06)',
                        strokeDashArray: 4,
                    },
                    dataLabels: { enabled: false },
                    markers: { size: 0 },
                };

                if (this.chart) {
                    this.chart.updateOptions(options, true, true);
                } else {
                    this.chart = new window.ApexCharts(el, options);
                    this.chart.render();
                }
            }, 50);
        },
    },
};
</script>

<template>
    <section class="daily-graph-section glass">
        <div class="daily-graph-header">
            <span class="daily-graph-title">{{ t.dailyGraphTitle }}</span>
            <span v-if="bestTimeWindow" class="best-time-badge">
                🚿 {{ t.bestTimeLabel }}: {{ bestTimeWindow.time }}
            </span>
        </div>
        <div v-if="isLoading" class="daily-graph-loading">{{ t.loading }}</div>
        <div v-show="!isLoading" ref="chartEl" dir="ltr"></div>
    </section>
</template>
