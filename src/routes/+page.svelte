<script lang="ts">
	import { onMount } from 'svelte';
	import { initEarth } from '$lib/earth';

	let container: HTMLDivElement;
	let status = 'Preparing scene...';

	onMount(() => {
		let cleanup: (() => void) | undefined;
		let cancelled = false;

		(async () => {
			cleanup = await initEarth(container, (message) => {
				status = message;
			});

			if (cancelled && cleanup) {
				cleanup();
			}
		})();

		return () => {
			cancelled = true;
			cleanup?.();
		};
	});
</script>

<main>
	<div class="scene" bind:this={container}>
		{#if status}
			<div class="status">{status}</div>
		{/if}
	</div>
</main>

<style>
	main {
		min-height: 100vh;
		background: radial-gradient(circle at 20% 20%, #0b132b, #05070d 55%, #020306);
		display: grid;
		place-items: center;
	}

	.scene {
		position: relative;
		width: min(96vw, 1400px);
		height: min(80vh, 900px);
		border-radius: 24px;
		overflow: hidden;
		box-shadow: 0 30px 80px rgba(5, 8, 20, 0.6);
		background: radial-gradient(circle at 50% 30%, rgba(34, 72, 124, 0.35), transparent 60%);
	}

	.status {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		color: #c9d4ff;
		font: 500 0.95rem/1.4 'Fraunces', 'Times New Roman', serif;
		letter-spacing: 0.04em;
		text-align: center;
		padding: 1rem;
		background: radial-gradient(circle at 50% 50%, rgba(5, 10, 22, 0.72), rgba(5, 10, 22, 0.9));
	}
	</style>
