<script lang="ts">
	import { onMount } from 'svelte';
	import { Pane } from 'tweakpane';
	import { initEarth, type EarthHandle } from '$lib/earth';

	let container: HTMLDivElement;
	let paneHost: HTMLDivElement;
	let status = 'Preparing scene...';

	onMount(() => {
		let earth: EarthHandle | null = null;
		let pane: Pane | null = null;
		let cancelled = false;

		(async () => {
			earth = await initEarth(container, (message) => {
				status = message;
			});

			if (cancelled) {
				earth.dispose();
				return;
			}

			pane = new Pane({
				container: paneHost,
				title: 'Render'
			});

			const params = { exposure: 1.0, rotation: 1000 };
			const exposureBinding = pane.addBinding(params, 'exposure', { min: 0.6, max: 1.4, step: 0.01 });
			const rotationBinding = pane.addBinding(params, 'rotation', {
				min: 100,
				max: 100000,
				step: 100,
				label: 'Rotation (x)'
			});

			exposureBinding.on('change', (event) => {
				earth?.setExposure(event.value);
			});
			rotationBinding.on('change', (event) => {
				earth?.setRotationMultiplier(event.value);
			});
		})();

		return () => {
			cancelled = true;
			pane?.dispose();
			earth?.dispose();
		};
	});
</script>

<main>
	<div class="scene" bind:this={container}>
		{#if status}
			<div class="status">{status}</div>
		{/if}
		<div class="pane" bind:this={paneHost}></div>
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

	.pane {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 2;
	}

	.pane :global(.tp-dfwv) {
		min-width: 220px;
		background: rgba(8, 12, 24, 0.75);
		backdrop-filter: blur(10px);
		border-radius: 12px;
		border: 1px solid rgba(106, 140, 195, 0.4);
	}

	.pane :global(.tp-rotv_c) {
		color: #d8e5ff;
	}

	.pane :global(.tp-lblv_l) {
		color: #aeb8d4;
	}
</style>
