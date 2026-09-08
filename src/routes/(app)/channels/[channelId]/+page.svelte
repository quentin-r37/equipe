<script lang="ts">
	import ChatPanel from '$lib/components/ChatPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title># {data.channel.name} · Equipe</title>
</svelte:head>

<ChatPanel channelId={data.channel.id} userId={data.user.id} initialMessages={data.messages} />
