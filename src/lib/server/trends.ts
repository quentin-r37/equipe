import { db } from '$lib/server/db';
import { and, count, gte, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';

/** Width of the KPI sparkline window, in days. */
export const TREND_DAYS = 14;

/** Local-time `YYYY-MM-DD`, matching what `date_trunc` returns for a `timestamp` column. */
function dayKey(d: Date): string {
	const m = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	return `${d.getFullYear()}-${m}-${day}`;
}

/** Per-day `to_char` bucket key for a timestamp column, used in both SELECT and GROUP BY. */
const dayOf = (col: AnyPgColumn) => sql<string>`to_char(date_trunc('day', ${col}), 'YYYY-MM-DD')`;

/** A series of zeroes, for a KPI whose window cannot contain anything. */
export const emptySeries = () => new Array<number>(TREND_DAYS).fill(0);

/**
 * Opens the KPI window that ends today and asks the database for one series at a time.
 *
 * Buckets are dense (missing days are 0) so every plot built from the same window shares one
 * time axis and the tiles can be read against each other.
 */
export function trendWindow() {
	const since = new Date();
	since.setHours(0, 0, 0, 0);
	since.setDate(since.getDate() - (TREND_DAYS - 1));

	// Bucket key per slot, so a row's day maps straight to its index.
	const slotOf = new Map<string, number>();
	for (let i = 0; i < TREND_DAYS; i++) {
		const d = new Date(since);
		d.setDate(since.getDate() + i);
		slotOf.set(dayKey(d), i);
	}

	const bucketize = (rows: { day: string; total: number }[]): number[] => {
		const series = emptySeries();
		for (const row of rows) {
			const slot = slotOf.get(row.day);
			if (slot !== undefined) series[slot] = row.total;
		}
		return series;
	};

	/** Daily counts of `col` for one table, oldest first, narrowed by `scope`. */
	const countPerDay = async (table: PgTable, col: AnyPgColumn, scope: SQL | undefined) => {
		const day = dayOf(col);
		const rows = await db
			.select({ day, total: count() })
			.from(table)
			.where(and(scope, gte(col, since)))
			.groupBy(day);
		return bucketize(rows);
	};

	/**
	 * Daily sums of `value` for one table, oldest first, narrowed by `scope`.
	 *
	 * The sum is cast to `float8` rather than an integer: a bucket can hold a day's worth of
	 * uploaded bytes, which overflows `int4` well before it troubles a double.
	 */
	const sumPerDay = async (
		table: PgTable,
		col: AnyPgColumn,
		value: AnyPgColumn,
		scope: SQL | undefined
	) => {
		const day = dayOf(col);
		const rows = await db
			.select({ day, total: sql<number>`coalesce(sum(${value}), 0)::float8` })
			.from(table)
			.where(and(scope, gte(col, since)))
			.groupBy(day);
		return bucketize(rows);
	};

	return { since, countPerDay, sumPerDay };
}
