import {
	S3Client,
	PutObjectCommand,
	GetObjectCommand,
	DeleteObjectCommand,
	HeadBucketCommand,
	CreateBucketCommand
} from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

// SeaweedFS is addressed through its S3 gateway (port 8333), like the other projects on this
// stack. Storage paths in the `file` table are used verbatim as object keys.

let client: S3Client | null = null;

function s3(): S3Client {
	if (!client) {
		client = new S3Client({
			endpoint: env.S3_ENDPOINT || 'http://localhost:8333',
			region: env.S3_REGION || 'us-east-1',
			credentials: {
				accessKeyId: env.S3_ACCESS_KEY || 'equipeadmin',
				secretAccessKey: env.S3_SECRET_KEY || 'equipeadmin'
			},
			// SeaweedFS only serves path-style addressing (no bucket-as-subdomain).
			forcePathStyle: true
		});
	}
	return client;
}

function bucket(): string {
	return env.S3_BUCKET || 'equipe';
}

let bucketReady: Promise<void> | null = null;

/** Creates the bucket on first upload; the check is memoized for the process lifetime. */
function ensureBucket(): Promise<void> {
	bucketReady ??= (async () => {
		const Bucket = bucket();
		try {
			await s3().send(new HeadBucketCommand({ Bucket }));
		} catch (err) {
			const name = err instanceof Error ? err.name : '';
			if (name !== 'NotFound' && name !== 'NoSuchBucket') throw err;
			await s3().send(new CreateBucketCommand({ Bucket }));
		}
	})().catch((err) => {
		// Never memoize a failure: a transient storage outage must not poison every later upload.
		bucketReady = null;
		throw err;
	});
	return bucketReady;
}

export async function uploadFile(path: string, data: Blob, contentType: string): Promise<void> {
	await ensureBucket();
	// Uploads are capped at MAX_UPLOAD_BYTES (50 MB), so buffering the body is bounded. The SDK
	// needs a known length anyway: a stream body would require ContentLength up front.
	const body = new Uint8Array(await data.arrayBuffer());
	await s3().send(
		new PutObjectCommand({
			Bucket: bucket(),
			Key: path,
			Body: body,
			ContentType: contentType || 'application/octet-stream'
		})
	);
}

export async function downloadFile(path: string): Promise<Response> {
	const res = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: path }));
	if (!res.Body) throw new Error(`SeaweedFS download failed: empty body for "${path}"`);

	const headers = new Headers({ 'Content-Type': res.ContentType || 'application/octet-stream' });
	if (res.ContentLength !== undefined) headers.set('Content-Length', String(res.ContentLength));

	// Stream the object through instead of buffering it in memory.
	return new Response(res.Body.transformToWebStream(), { headers });
}

export async function deleteFile(path: string): Promise<void> {
	// DeleteObject is idempotent: a missing key succeeds, which is the state we want.
	await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: path }));
}
