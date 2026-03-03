<script>
import { useTranslations } from '@/composables/useTranslations.js';

export default {
    props: {
        connected: Boolean,
    },
    setup() {
        return useTranslations();
    },
};
</script>

<template>
    <header>
        <div class="lang-toggle">
            <button :class="{ active: lang === 'he' }" @click="setLang('he')">עב</button>
            <button :class="{ active: lang === 'en' }" @click="setLang('en')">EN</button>
        </div>
        <h1>{{ t.title }}</h1>
        <p class="subtitle">{{ t.subtitle }}</p>
        <div class="status">
            <span class="status-dot" :class="{ ok: connected }"></span>
            <span>{{ connected ? t.connected : t.disconnected }}</span>
        </div>
    </header>
</template>
