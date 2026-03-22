<script lang="ts">
	let {
		track,
		mirror = false,
		fit = 'cover'
	}: { track: any; mirror?: boolean; fit?: string } = $props();

	let videoEl: HTMLVideoElement | undefined = $state();

	$effect(() => {
		if (track && videoEl) {
			track.attach(videoEl);
			return () => {
				track.detach(videoEl);
			};
		}
	});
</script>

<video
	bind:this={videoEl}
	autoplay
	muted
	playsinline
	class="video-track"
	style:transform={mirror ? 'scaleX(-1)' : undefined}
	style:object-fit={fit}
></video>

<style>
	.video-track {
		width: 100%;
		height: 100%;
		border-radius: 8px;
	}
</style>
