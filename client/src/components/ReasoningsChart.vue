<script>
import { useTranslations } from '@/composables/useTranslations.js';

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#c084fc', '#60a5fa'];

export default {
    props: {
        reasonings: { type: Array, default: () => [] },
        weights: { type: Object, default: () => ({}) },
    },
    emits: ['update:weights'],
    setup() {
        return useTranslations();
    },
    data() {
        return { expandedIndex: null };
    },
    computed: {
        normalizedWeights() {
            const raw = {};
            for (const r of this.reasonings) raw[r.id] = this.weights[r.id] ?? r.weight;
            const total = Object.values(raw).reduce((s, v) => s + v, 0) || 1;
            const norm = {};
            for (const [id, v] of Object.entries(raw)) norm[id] = v / total;
            return norm;
        },
        items() {
            if (!this.reasonings?.length) return [];
            const nw = this.normalizedWeights;
            const l = this.lang;
            const localize = v => (v && typeof v === 'object') ? (v[l] || v.en || v.he) : v;
            return this.reasonings.map((r, i) => ({
                id: r.id,
                label: localize(r.label),
                explanation: localize(r.explanation),
                weight: nw[r.id],
                rawWeight: this.weights[r.id] ?? r.weight,
                risk: r.risk,
                contrib: nw[r.id] * r.risk,
                color: COLORS[i % COLORS.length],
            }));
        },
    },
    methods: {
        pct(v) { return Math.round(v * 100); },
        barWidth(item) { return `${Math.max(this.pct(item.contrib), 2)}%`; },
        toggle(i) { this.expandedIndex = this.expandedIndex === i ? null : i; },
        onSlider(id, event) {
            const val = parseFloat(event.target.value) / 100;
            const updated = { ...this.weights };
            for (const r of this.reasonings) {
                if (!(r.id in updated)) updated[r.id] = r.weight;
            }
            updated[id] = val;
            this.$emit('update:weights', updated);
        },
    },
};
</script>

<template>
    <section v-show="reasonings && reasonings.length" class="reasonings-section">
        <div class="reasonings-header">
            <span class="reasonings-title">{{ t.howCalc }}</span>
            <span class="crowd-hint">{{ t.crowdHint }}</span>
        </div>
        <div class="reason-list">
            <button v-for="(item, i) in items" :key="item.id" type="button" class="reason-item glass" :class="{ expanded: expandedIndex === i }" @click="toggle(i)">
                <div class="reason-top">
                    <span class="reason-dot" :style="{ background: item.color }"></span>
                    <span class="reason-label">{{ item.label }}</span>
                    <span class="reason-pct">{{ pct(item.contrib) }}%</span>
                </div>
                <div class="reason-bar-track">
                    <div class="reason-bar-fill" :style="{ width: barWidth(item), background: item.color }"></div>
                </div>
                <div v-if="expandedIndex === i" class="reason-detail">
                    <p class="reason-desc">{{ item.explanation }}</p>
                    <div class="reason-slider-row" @click.stop>
                        <span class="slider-label">{{ t.weightLabel }}</span>
                        <input type="range" min="0" max="100" step="1" :value="Math.round(item.rawWeight * 100)" class="weight-slider" :style="{ '--slider-color': item.color }" @input="onSlider(item.id, $event)">
                        <span class="slider-value">{{ pct(item.weight) }}%</span>
                    </div>
                    <div class="reason-metrics">
                        <div class="reason-metric">
                            <span>{{ t.localRiskLabel }}</span>
                            <strong>{{ pct(item.risk) }}%</strong>
                        </div>
                        <div class="reason-metric contrib">
                            <span>{{ t.resultedLabel }}</span>
                            <strong>{{ pct(item.contrib) }}%</strong>
                        </div>
                    </div>
                </div>
            </button>
        </div>
    </section>
</template>

<style scoped>
.reasonings-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 0.5rem;
}
.crowd-hint {
    font-size: 0.7rem;
    color: #64748b;
    font-style: italic;
}
.reason-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
}
.reason-item {
    width: 100%;
    padding: 0.85rem 1rem;
    cursor: pointer;
    text-align: start;
    transition: background 0.2s, border-color 0.2s;
    -webkit-tap-highlight-color: transparent;
    outline: none;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.06);
    color: inherit;
    font: inherit;
    border-radius: 16px;
}
.reason-item:hover {
    background: rgba(255, 255, 255, 0.09);
}
.reason-item:focus-visible {
    border-color: rgba(99, 102, 241, 0.6);
}
.reason-top {
    display: flex;
    align-items: center;
    gap: 0.6rem;
}
.reason-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
}
.reason-label {
    flex: 1;
    font-size: 0.88rem;
    font-weight: 600;
    color: #e2e8f0;
}
.reason-pct {
    font-size: 0.85rem;
    font-weight: 700;
    color: #a5b4fc;
    font-variant-numeric: tabular-nums;
}
.reason-bar-track {
    height: 4px;
    border-radius: 2px;
    background: rgba(255, 255, 255, 0.08);
    margin-top: 0.55rem;
    overflow: hidden;
}
.reason-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.5s ease;
}
.reason-detail {
    margin-top: 0.75rem;
    padding-top: 0.65rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    animation: fadeIn 0.2s ease;
}
.reason-desc {
    font-size: 0.78rem;
    color: #cbd5e1;
    line-height: 1.5;
    margin-bottom: 0.65rem;
}
.reason-slider-row {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.65rem;
    padding: 0.5rem 0;
}
.slider-label {
    font-size: 0.75rem;
    color: #94a3b8;
    white-space: nowrap;
}
.weight-slider {
    flex: 1;
    height: 4px;
    -webkit-appearance: none;
    appearance: none;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
}
.weight-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--slider-color, #818cf8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
    transition: transform 0.15s ease;
}
.weight-slider::-webkit-slider-thumb:hover {
    transform: scale(1.2);
}
.weight-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--slider-color, #818cf8);
    border: 2px solid rgba(255, 255, 255, 0.3);
    cursor: pointer;
}
.slider-value {
    font-size: 0.78rem;
    font-weight: 600;
    color: #e2e8f0;
    min-width: 2.5rem;
    text-align: end;
    font-variant-numeric: tabular-nums;
}
.reason-metrics {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}
.reason-metric {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 0.75rem;
}
.reason-metric span {
    color: #94a3b8;
}
.reason-metric strong {
    font-weight: 600;
    color: #e2e8f0;
    font-variant-numeric: tabular-nums;
}
.reason-metric.contrib strong {
    color: #a5b4fc;
}
@keyframes fadeIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
