<script lang="ts">
	let {
		originWidth,
		originHeight,
		width,
		x = 0,
		y = 0,
		path,
		strokeWidth,
		strokeColor,
		opacity = 1,
		stroke
	}: {
		originWidth: number;
		originHeight: number;
		width: number;
		x?: number;
		y?: number;
		path: string;
		strokeWidth?: number;
		strokeColor?: string;
		opacity?: number;
		stroke: { id: string | number };
	} = $props();

	let dx = $state(0);
	let dy = $state(0);

	// Use $derived so these values re-calculate whenever props change
	const ratio = $derived(originWidth / originHeight);
	const gradientId = $derived(`rainbow-gradient-${stroke.id}`);
	const viewBox = $derived(`0 0 ${originWidth} ${originHeight}`);
</script>

<div
	class="absolute top-0 left-0 select-none"
	style="width: {width}px; height: {width / ratio}px; transform: translate({x + dx}px, {y + dy}px);"
>
	<svg {viewBox} width="100%" height="100%">
		<defs>
			<linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
				<stop offset="0%" stop-color="#ff0000" />
				<stop offset="16.66%" stop-color="#ff8000" />
				<stop offset="33.33%" stop-color="#ffff00" />
				<stop offset="50%" stop-color="#00ff00" />
				<stop offset="66.66%" stop-color="#0080ff" />
				<stop offset="83.33%" stop-color="#8000ff" />
				<stop offset="100%" stop-color="#ff0080" />
			</linearGradient>
		</defs>
		<path
			stroke-width={strokeWidth}
			stroke-linejoin="round"
			stroke-linecap="round"
			stroke={`url(#${gradientId})`}
			fill="none"
			d={path}
			{opacity}
		/>
	</svg>
</div>
