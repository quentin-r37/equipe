/**
 * One-shot migration: SeaweedFS filer paths -> S3 bucket objects.
 *
 * Files uploaded before the S3 switch live in the filer namespace under
 * `equipe/<teamId>/<fileId>/<urlencoded name>`. This copies each blob into the
 * S3 bucket under its new key (`<teamId>/<fileId>/<name>`) and rewrites
 * `file.storage_path` to match. Safe to re-run: rows already migrated are skipped.
 *
 *   node --env-file=.env scripts/migrate-storage-to-s3.mjs [--dry-run]
 *
 * Requires the filer to still be reachable (SEAWEEDFS_FILER_URL, default :8888).
 */
import {
	S3Client,
	PutObjectCommand,
	HeadObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand
} from '@aws-sdk/client-s3';
import postgres from 'postgres';

const dryRun = process.argv.includes('--dry-run');
// The filer sits on 8888 next to the S3 gateway on 8333, so the endpoint gives us both the
// local (`localhost`) and the in-cluster (`seaweedfs`) host without extra configuration.
const s3Endpoint = process.env.S3_ENDPOINT || 'http://localhost:8333';
const filerUrl = process.env.SEAWEEDFS_FILER_URL || s3Endpoint.replace(/:8333(\/|$)/, ':8888$1');
const bucket = process.env.S3_BUCKET || 'equipe';

const s3 = new S3Client({
	endpoint: s3Endpoint,
	region: process.env.S3_REGION || 'us-east-1',
	credentials: {
		accessKeyId: process.env.S3_ACCESS_KEY || 'equipeadmin',
		secretAccessKey: process.env.S3_SECRET_KEY || 'equipeadmin'
	},
	forcePathStyle: true
});

const sql = postgres(process.env.DATABASE_URL);

// The app creates the bucket on its first upload; the migration may well run before that.
if (!dryRun) {
	try {
		await s3.send(new HeadBucketCommand({ Bucket: bucket }));
	} catch {
		await s3.send(new CreateBucketCommand({ Bucket: bucket }));
		console.log(`created bucket "${bucket}"`);
	}
}

const rows = await sql`select id, name, mime_type, storage_path from "file" order by created_at`;
let migrated = 0;
let skipped = 0;

for (const row of rows) {
	// Legacy rows are the ones still carrying the `equipe/` filer prefix.
	if (!row.storage_path.startsWith('equipe/')) {
		skipped++;
		continue;
	}

	const [, teamId, fileId] = row.storage_path.split('/');
	const key = `${teamId}/${fileId}/${row.name}`;

	if (dryRun) {
		console.log(`would migrate ${row.storage_path} -> ${key}`);
		migrated++;
		continue;
	}

	// Already copied by an earlier run? Then just fix the row.
	let exists = true;
	try {
		await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
	} catch {
		exists = false;
	}

	if (!exists) {
		const res = await fetch(`${filerUrl}/${row.storage_path}`);
		if (!res.ok) {
			console.error(`SKIP ${row.id}: filer returned ${res.status} for ${row.storage_path}`);
			continue;
		}
		await s3.send(
			new PutObjectCommand({
				Bucket: bucket,
				Key: key,
				Body: new Uint8Array(await res.arrayBuffer()),
				ContentType: row.mime_type || 'application/octet-stream'
			})
		);
	}

	await sql`update "file" set storage_path = ${key} where id = ${row.id}`;
	console.log(`migrated ${row.storage_path} -> ${key}`);
	migrated++;
}

console.log(`\n${migrated} migrated, ${skipped} already on S3.`);
await sql.end();
