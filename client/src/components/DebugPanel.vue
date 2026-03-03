<script>
export default {
    props: {
        modelValue: { type: Number, default: null },
    },
    emits: ['update:modelValue'],
    computed: {
        inputValue() {
            if (this.modelValue == null) return '';
            const d = new Date(this.modelValue * 1000);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        },
    },
    methods: {
        onInput(e) {
            const val = e.target.value;
            if (!val) {
                this.$emit('update:modelValue', null);
                return;
            }
            // Convert local datetime-local string to UTC epoch (seconds)
            const epoch = Math.floor(new Date(val).getTime() / 1000);
            this.$emit('update:modelValue', isNaN(epoch) ? null : epoch);
        },
        setNow() {
            this.$emit('update:modelValue', Math.floor(Date.now() / 1000));
        },
    },
};
</script>

<template>
    <div class="debug-float">
        <label for="debug-time">Debug: Simulated time</label>
        <input id="debug-time" type="datetime-local" :value="inputValue" @change="onInput">
        <div class="debug-actions">
            <button type="button" class="primary" @click="setNow">Now</button>
        </div>
    </div>
</template>
