import fs from 'node:fs';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

const httpsConfig =
	fs.existsSync('certs/key.pem') && fs.existsSync('certs/cert.pem')
		? { key: fs.readFileSync('certs/key.pem'), cert: fs.readFileSync('certs/cert.pem') }
		: undefined;

export default defineConfig({
	server: {
		https: httpsConfig
	},
	plugins: [
		sveltekit(),
		paraglideVitePlugin({ project: './project.inlang', outdir: './src/lib/paraglide' })
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
