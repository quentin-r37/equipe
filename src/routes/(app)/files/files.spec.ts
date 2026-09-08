import { beforeEach, expect, it, vi } from 'vitest';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';

const mock = vi.hoisted(() => ({
	results: [] as unknown[][],
	conditions: [] as unknown[],
	offsets: [] as number[]
}));
vi.mock('$lib/server/db', () => ({
	db: {
		select: () => {
			const result = mock.results.shift() ?? [];
			const query = {
				from: () => query,
				where: (condition: unknown) => {
					mock.conditions.push(condition);
					return query;
				},
				orderBy: () => query,
				limit: () => query,
				offset: (offset: number) => {
					mock.offsets.push(offset);
					return query;
				},
				then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(result).then(resolve)
			};
			return query;
		}
	}
}));
vi.mock('$lib/server/fileShare', () => ({
	countActiveSharesByFile: async () => new Map(),
	countActiveSharesForTeams: async () => 0
}));
// The KPI band has its own queries; these tests are about the filter/pagination SQL.
vi.mock('$lib/server/trends', () => ({
	TREND_DAYS: 14,
	emptySeries: () => new Array(14).fill(0),
	trendWindow: () => ({
		since: new Date(),
		countPerDay: async () => new Array(14).fill(0),
		sumPerDay: async () => new Array(14).fill(0)
	})
}));
vi.mock('$lib/server/files', () => ({
	FileError: class extends Error {},
	storeUploadedFile: vi.fn(),
	deleteFileWithCleanup: vi.fn()
}));

import { load } from './+page.server';

beforeEach(() => {
	mock.results.length = 0;
	mock.conditions.length = 0;
	mock.offsets.length = 0;
});

it('combines search with membership restrictions before paginating older files', async () => {
	mock.results.push([{ teamId: 'allowed-team' }], [{ total: 51 }], []);
	const result = await load({
		url: new URL('http://localhost/files?q=budget&team=other-team&type=pdf&page=999&sort=oldest'),
		locals: { user: { id: 'user' } }
	} as Parameters<typeof load>[0]);
	const query = new PgDialect().sqlToQuery(mock.conditions[2] as SQL);
	expect(query.params).toContain('allowed-team');
	expect(query.params).toContain('other-team');
	expect(query.params).toContain('%budget%');
	expect(query.params).toContain('application/pdf');
	expect(query.sql).toContain(' and ');
	expect(mock.offsets).toEqual([50]);
	expect(result).toMatchObject({ currentPage: 3, pageCount: 3, total: 51 });
});

it('treats percent and underscore as literal file-name characters', async () => {
	mock.results.push([{ teamId: 'team' }], [{ total: 0 }], []);
	await load({
		url: new URL('http://localhost/files?q=100%25_report&page=-2&type=invalid'),
		locals: { user: { id: 'user' } }
	} as Parameters<typeof load>[0]);
	const query = new PgDialect().sqlToQuery(mock.conditions[2] as SQL);
	expect(query.params).toContain('%100\\%\\_report%');
	expect(mock.offsets).toEqual([0]);
});

it('does not return files to users with no team memberships', async () => {
	mock.results.push([], [{ total: 0 }]);
	const result = await load({
		url: new URL('http://localhost/files'),
		locals: { user: { id: 'user' } }
	} as Parameters<typeof load>[0]);
	const query = new PgDialect().sqlToQuery(mock.conditions[1] as SQL);
	expect(query.sql).toContain('false');
	expect(result).toMatchObject({ files: [], total: 0 });
	expect(mock.offsets).toEqual([]);
});
