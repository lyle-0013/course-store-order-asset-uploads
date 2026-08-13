import { createServer } from "node:http";
import { infrai } from "./infrai_storage.js";
import { chooseOrderAsset, uploadRequestSchema } from "./order_asset_policy.js";

function existingBucket(): string {
  const value = process.env.ORDER_ASSET_BUCKET;
  if (!value) throw new Error("Set ORDER_ASSET_BUCKET to an existing bucket before starting the service.");
  return value;
}

const bucket = existingBucket();
const port = Number(process.env.PORT ?? 3000);

async function readJson(request: import("node:http").IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function send(response: import("node:http").ServerResponse, status: number, body: unknown) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function start() {
  createServer(async (request, response) => {
    if (request.method !== "POST" || request.url !== "/order-assets/presign") {
      send(response, 404, { message: "Route not found" });
      return;
    }

    try {
      const input = uploadRequestSchema.parse(await readJson(request));
      const decision = chooseOrderAsset(input);
      const signed = await infrai.storage.object.presign(bucket, decision.objectKey, {
        op: "put",
        expires_seconds: 600,
        content_type: input.contentType,
        max_bytes: input.sizeBytes,
        idempotency_key: `presign-${input.orderId}-${input.stage}-${input.fileName}`,
      });
      send(response, 201, {
        uploadUrl: signed.url,
        method: "PUT",
        objectKey: decision.objectKey,
        assetKind: decision.assetKind,
        nextOrderEvent: decision.nextOrderEvent,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Invalid request";
      send(response, 400, { message });
    }
  }).listen(port, () => {
    console.log(`Order asset lesson listening on http://localhost:${port}`);
  });
}

await start();
