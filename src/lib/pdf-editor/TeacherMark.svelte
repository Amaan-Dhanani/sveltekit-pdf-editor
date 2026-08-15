<script lang="ts">
    import { LucideAward, LucideCheckCircle2, LucideStar, LucideThumbsUp } from '@lucide/svelte';
    import { getTeacherMarkColorPreset, getTeacherMarkIcon } from './utils/teacherMarkPresets';

    let {
        object,
        x = 0,
        y = 0,
        width = 60,
        height = 40,
        isSelected = false,
        isPreviewed = false
    } = $props();

    let markedBy = $derived(capitalizeFirstLetter(object?.markedBy || 'Teacher'));
    let markedAt = $derived(object?.markedAt || object?.updatedAt || new Date().toISOString());
    let label = $derived(object?.label || 'Marked correct');
    let baseFontSize = $derived(Math.max(4, Math.min(Number(object?.fontSize || 8), 24)));
    let displayMarkedAt = $derived(formatMarkedAt(markedAt));
    let compactScale = $derived(Math.max(0.5, Math.min(width / 60, height / 40, 1.35)));
    let labelFontSize = $derived(baseFontSize);
    let metaFontSize = $derived(baseFontSize * 0.68);
    let colorPreset = $derived(getTeacherMarkColorPreset(object?.stampColor));
    let stampIcon = $derived(getTeacherMarkIcon(object?.stampIcon));
    let iconSize = $derived(Math.max(8, baseFontSize * 1.8));
    let IconComponent = $derived(
        stampIcon === 'check-circle'
            ? LucideCheckCircle2
            : stampIcon === 'thumbs-up'
                ? LucideThumbsUp
                : stampIcon === 'star'
                    ? LucideStar
                    : stampIcon === 'award'
                        ? LucideAward
                        : null
    );

    function capitalizeFirstLetter(value: string) {
        const trimmed = String(value || '').trim();
        if (!trimmed) return 'Teacher';
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
    }

    function formatMarkedAt(value: string) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value || '';

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
</script>

<div
    class="pointer-events-none absolute top-0 left-0 z-12 select-none"
    style="transform: translate({x}px, {y}px); width: {width}px; height: {height}px;"
>
    <div
        class="flex h-full w-full items-stretch overflow-hidden rounded border font-sans normal-case"
        class:outline-2={isSelected || isPreviewed}
        class:outline-offset-[3px]={isSelected || isPreviewed}
        class:outline-blue-600={isSelected || isPreviewed}
        style="border-color: {colorPreset.border}; background: {colorPreset.background}; color: {colorPreset.text}; padding: 0 {2 * compactScale}px;"
    >
        {#if IconComponent}
            <div
                class="flex flex-none items-center self-center justify-center"
                style="margin-right: {2 * compactScale}px; color: {colorPreset.text};"
            >
                <IconComponent size={iconSize} strokeWidth={2.5} />
            </div>
        {/if}

        <div class="min-w-0 flex-1 self-center">
            <div
                class="overflow-hidden font-extrabold uppercase leading-none tracking-normal wrap-anywhere"
                style="font-size: {labelFontSize}px;"
            >
                {label}
            </div>

            <div
                class="overflow-hidden font-bold leading-[1.05] wrap-anywhere"
                style="font-size: {metaFontSize}px; color: {colorPreset.meta};"
            >
                Stamped by {markedBy}
            </div>

            <div
                class="overflow-hidden font-bold leading-[1.05] wrap-anywhere"
                style="font-size: {metaFontSize}px; color: {colorPreset.time};"
            >
                {displayMarkedAt}
            </div>
        </div>
    </div>
</div>