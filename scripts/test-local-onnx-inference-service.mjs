#!/usr/bin/env node

/** Verify the local-only service contract without disclosing the local API key. */
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function readEnv(raw) {
  return Object.fromEntries(raw.split(/\r?\n/u).filter((line) => line && !line.startsWith("#")).map((line) => {
    const separator = line.indexOf("=");
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
}

async function main() {
  const serviceDirectory = getArgument("--service-dir");
  if (!serviceDirectory) throw new Error("Usage: node test-local-onnx-inference-service.mjs --service-dir <onnx_node_validation>");
  const settings = readEnv(await fs.readFile(path.join(serviceDirectory, "local_service.env"), "utf8"));
  const origin = `http://${settings.HOST}:${settings.PORT}`;
  const headers = { "x-aigc-api-key": settings.AIGC_SERVICE_API_KEY };
  const health = await fetch(`${origin}/health`, { headers });
  const healthJson = await health.json();
  const detection = await fetch(`${origin}/v1/detect`, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({ text: "清晨的雾气还没有散去，街角早餐铺的蒸汽先飘到了路边。" }),
  });
  const detectionJson = await detection.json();
  const unauthorized = await fetch(`${origin}/health`);
  const tooShort = await fetch(`${origin}/v1/detect`, { method: "POST", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify({ text: "a" }) });
  const result = {
    status: health.status === 200 && detection.status === 200 && unauthorized.status === 401 && tooShort.status === 400 ? "ok" : "failed",
    health: { status: health.status, engine: healthJson.engine, execution_provider: healthJson.execution_provider },
    inference: { status: detection.status, engine: detectionJson.engine, ai_probability: detectionJson.ai_probability, predicted_label: detectionJson.predicted_label, latency_ms: detectionJson.latency_ms },
    authorization_rejection_status: unauthorized.status,
    input_validation_rejection_status: tooShort.status,
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  if (result.status !== "ok") process.exitCode = 1;
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
