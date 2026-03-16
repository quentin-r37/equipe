<script lang="ts">
	import { enhance } from '$app/forms';
	import {
		Button,
		TextInput,
		PasswordInput,
		Tile,
		InlineNotification
	} from 'carbon-components-svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let mode = $state<'login' | 'register'>('login');
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-100">
	<Tile class="w-full max-w-md">
		<h2 class="mb-6 text-2xl font-semibold">{mode === 'login' ? 'Sign In' : 'Create Account'}</h2>

		{#if form?.message}
			<InlineNotification
				kind="error"
				title="Error"
				subtitle={form.message}
				hideCloseButton
				class="mb-4"
			/>
		{/if}

		<form method="post" action={mode === 'login' ? '?/signIn' : '?/signUp'} use:enhance>
			{#if mode === 'register'}
				<div class="mb-4">
					<TextInput name="name" labelText="Name" placeholder="Your full name" required />
				</div>
			{/if}
			<div class="mb-4">
				<TextInput
					name="email"
					type="email"
					labelText="Email"
					placeholder="email@example.com"
					required
				/>
			</div>
			<div class="mb-4">
				<PasswordInput
					name="password"
					labelText="Password"
					placeholder="Enter password"
					required
				/>
			</div>
			<div class="flex items-center gap-4">
				<Button type="submit">{mode === 'login' ? 'Sign In' : 'Register'}</Button>
				<button
					type="button"
					class="text-sm text-blue-600 hover:underline"
					onclick={() => (mode = mode === 'login' ? 'register' : 'login')}
				>
					{mode === 'login' ? 'Need an account?' : 'Already have an account?'}
				</button>
			</div>
		</form>
	</Tile>
</div>
