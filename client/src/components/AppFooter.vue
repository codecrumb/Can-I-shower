<script>
import { useTranslations } from '@/composables/useTranslations.js';

export default {
    props: {
        lastUpdateTime: String,
    },
    setup() {
        return useTranslations();
    },
};
</script>

<template>
    <footer>
        <p>{{ t.disclaimer }}</p>
        <p>
            <span>{{ t.source }}</span>
            <a href="https://rocketalert.live" target="_blank" rel="noopener">Rocket Alert</a>
        </p>
        <p>{{ t.lastUpdate }}: {{ lastUpdateTime }}</p>
        <p><a href="https://linkedin.com/in/matan1905" target="_blank" rel="noopener">LinkedIn</a></p>
    </footer>
</template>
