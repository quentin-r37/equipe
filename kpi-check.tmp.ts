/* Runs the exact new KPI queries against the dev database to prove the SQL is valid. */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, eq, inArray, sql, gte, count } from 'drizzle-orm';
import { file, fileShare, meeting, team, teamMember } from 'C:/repo/perso/equipe/src/lib/server/db/schema';

const client = postgres(process.env.DATABASE_URL!);
const db = drizzle(client);

const since = new Date(Date.now() - 14 * 86400_000);
const dayOf = (col: any) => sql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

async function main() {
	const memberships = await db.select({ teamId: teamMember.teamId }).from(teamMember).limit(5);
	const teamIds = memberships.map((m) => m.teamId);
	console.log('teamIds', teamIds);

	for (const ids of [teamIds, [] as string[]]) {
		const visible = inArray(meeting.teamId, ids);
		const [totals] = await db
			.select({
				total: sql<number>`count(*)::int`,
				live: sql<number>`(count(*) filter (where ${meeting.status} = 'active'))::int`,
				mine: sql<number>`(count(*) filter (where ${meeting.createdBy} = ${'someone'}))::int`
			})
			.from(meeting)
			.where(visible);
		console.log('meeting totals', ids.length, totals);

		const owned = inArray(file.teamId, ids);
		const [library] = await db
			.select({
				files: sql<number>`count(*)::int`,
				bytes: sql<number>`coalesce(sum(${file.size}), 0)::float8`,
				mine: sql<number>`(count(*) filter (where ${file.userId} = ${'someone'}))::int`
			})
			.from(file)
			.where(owned);
		console.log('file library', ids.length, library, typeof library.bytes);

		// countPerDay over the share-link scope (subquery scope, the one new shape)
		const day = dayOf(fileShare.createdAt);
		const shareRows = await db
			.select({ day, total: count() })
			.from(fileShare)
			.where(
				and(
					sql`${fileShare.fileId} in (select ${file.id} from ${file} where ${owned})`,
					gte(fileShare.createdAt, since)
				)
			)
			.groupBy(day);
		console.log('share buckets', ids.length, shareRows);

		// sumPerDay over file sizes
		const fday = dayOf(file.createdAt);
		const byteRows = await db
			.select({ day: fday, total: sql<number>`coalesce(sum(${file.size}), 0)::float8` })
			.from(file)
			.where(and(owned, gte(file.createdAt, since)))
			.groupBy(fday);
		console.log('byte buckets', ids.length, byteRows, byteRows.map((r) => typeof r.total));

		// team + live/mine scoped countPerDay
		const mday = dayOf(meeting.createdAt);
		for (const scope of [
			visible,
			and(visible, eq(meeting.status, 'active')),
			and(visible, eq(meeting.createdBy, 'someone'))
		]) {
			const rows = await db.select({ day: mday, total: count() }).from(meeting).where(and(scope, gte(meeting.createdAt, since))).groupBy(mday);
			console.log('  meeting buckets', rows.length);
		}
		const tday = dayOf(team.createdAt);
		const trows = await db.select({ day: tday, total: count() }).from(team).where(and(inArray(team.id, ids), gte(team.createdAt, since))).groupBy(tday);
		console.log('team buckets', ids.length, trows);
	}
	await client.end();
}
main().catch((e) => {
	console.error('FAILED', e);
	process.exit(1);
});
