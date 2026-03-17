<script lang="ts">
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<ChatPanel channelId={data.channel.id} userId={data.user.id} initialMessages={data.messages} />
