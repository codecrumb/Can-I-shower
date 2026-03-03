<script>
import { useTranslations } from '@/composables/useTranslations.js';

export default {
    props: {
        modelValue: { type: Array, default: () => [] },
        allLocations: { type: Array, default: () => [] },
    },
    emits: ['update:modelValue'],
    data() {
        return { query: '', isDropdownVisible: false };
    },
    setup() {
        return useTranslations();
    },
    computed: {
        filteredLocs() {
            const q = (this.query || '').trim().toLowerCase();
            if (!q) return [];
            return this.allLocations
                .filter(l => l.toLowerCase().includes(q) && !this.modelValue.includes(l))
                .slice(0, 8);
        },
    },
    mounted() {
        document.addEventListener('click', this.onDocClick);
    },
    beforeUnmount() {
        document.removeEventListener('click', this.onDocClick);
    },
    methods: {
        onDocClick(e) {
            if (!this.$el.contains(e.target)) this.isDropdownVisible = false;
        },
        onInput() { this.isDropdownVisible = true; },
        onFocus() { if (this.query) this.isDropdownVisible = true; },
        onEnter(e) {
            e.preventDefault();
            const q = (this.query || '').trim();
            if (!q) return;
            if (this.filteredLocs.length) { this.pick(this.filteredLocs[0]); return; }
            const lower = q.toLowerCase();
            const match = this.allLocations.find(l => l.toLowerCase() === lower)
                || this.allLocations.find(l => l.toLowerCase().includes(lower));
            if (match) this.pick(match);
        },
        pick(loc) {
            if (!this.modelValue.includes(loc))
                this.$emit('update:modelValue', [...this.modelValue, loc]);
            this.query = '';
            this.isDropdownVisible = false;
        },
        remove(loc) {
            this.$emit('update:modelValue', this.modelValue.filter(l => l !== loc));
        },
    },
};
</script>

<template>
    <div>
        <div class="control-label">{{ t.locations }}</div>
        <div class="loc-input-wrap">
            <input type="text" class="loc-input" :placeholder="t.locPlaceholder" v-model="query" @input="onInput" @focus="onFocus" @keydown.enter.prevent="onEnter" autocomplete="off">
            <div v-if="isDropdownVisible && filteredLocs.length" class="ac-dropdown">
                <div v-for="loc in filteredLocs" :key="loc" class="ac-item" @click="pick(loc)">{{ loc }}</div>
            </div>
        </div>
        <div v-if="modelValue.length" class="chips">
            <span v-for="loc in modelValue" :key="loc" class="chip">
                {{ loc }}
                <button @click="remove(loc)">×</button>
            </span>
        </div>
    </div>
</template>
