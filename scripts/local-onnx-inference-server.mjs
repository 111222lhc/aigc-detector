#!/usr/bin/env node

/**
 * Local-only HTTP inference service for the exported Chinese AIGC ONNX candidate.
 *
 * Security contract:
 * - binds to 127.0.0.1 by default; never use 0.0.0.0 in local mode;
 * - requires a local API key for every health or inference request;
 * - applies a request-size and text-size limit;
 * - returns no input text, token IDs, model internals, or stack traces.
 *
 * The file contains no model weights and no evaluation texts. It is intended to run
 * in the user's existing `onnx_node_validation` directory, which already has the
 * audited `onnxruntime-node` dependency installed. Production deployment is a
 * separate gated step after V2 validation and server resource review.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import * as ort from "onnxruntime-node";

const DEFAULT_PORT = 18765;
const DEFAULT_MAX_TEXT_CHARACTERS = 50000;
const MAX_REQUEST_BYTES = 120000;
const SERVICE_VERSION = "local-onnx-inference-v1";

function parseArguments() {
  const result = {};
  for (let index = 2; index < process.argv.length; index += 2) {
    const key = process.argv[index];
    const value = process.argv[index + 1];
    if (key?.startsWith("--") && value && !value.startsWith("--")) {
      result[key.slice(2)] = value;
    }
  }
  return result;
}

function parseEnvFile(value) {
  const values = {};
  for (const rawLine of value.replace(/^\ufeff/u, "").split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator <= 0) throw new Error("The local service configuration contains an invalid line.");
    values[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  return values;
}

function requireSetting(settings, name) {
  const value = settings[name];
  if (!value) throw new Error(`Missing required local service setting: ${name}`);
  return value;
}

function parseBoundedInteger(value, settingName, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${settingName} must be an integer from ${minimum} to ${maximum}.`);
  }
  return parsed;
}

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    const stream = fs.createReadStream(filePath);
    stream.on("error", reject);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("end", () => resolve(hash.digest("hex")));
  });
}

function secureEqual(expected, actual) {
  if (typeof actual !== "string") return false;
  const expectedBytes = Buffer.from(expected, "utf8");
  const actualBytes = Buffer.from(actual, "utf8");
  return expectedBytes.length === actualBytes.length && crypto.timingSafeEqual(expectedBytes, actualBytes);
}

function isWhitespace(character) {
  return /\s/u.test(character);
}

function isControl(character) {
  const code = character.codePointAt(0);
  return (code <= 31 || (code >= 127 && code <= 159)) && !isWhitespace(character);
}

function isPunctuation(character) {
  const code = character.codePointAt(0);
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) || (code >= 91 && code <= 96) || (code >= 123 && code <= 126) || /[，。！？；：、“”‘’（）《》【】—…]/u.test(character);
}

function isChineseCharacter(character) {
  const code = character.codePointAt(0);
  return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf) || (code >= 0xf900 && code <= 0xfaff);
}

function cleanAndSplit(text, doLowerCase) {
  let cleaned = "";
  for (const character of text.normalize("NFC")) {
    if (character === "\u0000" || character === "\ufffd" || isControl(character)) continue;
    if (isChineseCharacter(character) || isPunctuation(character)) cleaned += ` ${character} `;
    else if (isWhitespace(character)) cleaned += " ";
    else cleaned += character;
  }
  return cleaned.trim().split(/\s+/u).filter(Boolean).map((token) => (doLowerCase ? token.toLowerCase() : token));
}

function wordPiece(token, vocabulary, unknownToken) {
  if (vocabulary.has(token)) return [token];
  const characters = [...token];
  const pieces = [];
  let start = 0;
  while (start < characters.length) {
    let end = characters.length;
    let current;
    while (start < end) {
      const candidate = `${start === 0 ? "" : "##"}${characters.slice(start, end).join("")}`;
      if (vocabulary.has(candidate)) {
        current = candidate;
        break;
      }
      end -= 1;
    }
    if (!current) return [unknownToken];
    pieces.push(current);
    start = end;
  }
  return pieces;
}

function encode(text, tokenizer) {
  const pieces = cleanAndSplit(text, tokenizer.doLowerCase)
    .flatMap((token) => wordPiece(token, tokenizer.vocabulary, tokenizer.unknownToken))
    .slice(0, tokenizer.maxLength - 2);
  const tokens = [tokenizer.clsToken, ...pieces, tokenizer.sepToken];
  const ids = tokens.map((token) => tokenizer.vocabulary.get(token) ?? tokenizer.unknownId);
  return new ort.Tensor("int64", BigInt64Array.from(ids, (id) => BigInt(id)), [1, ids.length]);
}

async function readTokenizer(exportDirectory, maxLength) {
  const [vocabContent, configContent, specialTokensContent] = await Promise.all([
    fsp.readFile(path.join(exportDirectory, "vocab.txt"), "utf8"),
    fsp.readFile(path.join(exportDirectory, "tokenizer_config.json"), "utf8"),
    fsp.readFile(path.join(exportDirectory, "special_tokens_map.json"), "utf8"),
  ]);
  const vocabulary = new Map(vocabContent.split(/\r?\n/u).filter(Boolean).map((token, index) => [token, index]));
  const config = JSON.parse(configContent);
  const specialTokens = JSON.parse(specialTokensContent);
  const tokenizer = {
    vocabulary,
    maxLength,
    doLowerCase: Boolean(config.do_lower_case),
    clsToken: specialTokens.cls_token ?? "[CLS]",
    sepToken: specialTokens.sep_token ?? "[SEP]",
    unknownToken: specialTokens.unk_token ?? "[UNK]",
  };
  tokenizer.unknownId = vocabulary.get(tokenizer.unknownToken);
  for (const required of [tokenizer.clsToken, tokenizer.sepToken, tokenizer.unknownToken]) {
    if (!vocabulary.has(required)) throw new Error(`Tokenizer vocabulary lacks ${required}.`);
  }
  return tokenizer;
}

function softmax(logits) {
  const maxLogit = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - maxLogit));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / total);
}

function writeJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(body);
}

function readJsonRequest(request) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_REQUEST_BYTES) {
        reject(Object.assign(new Error("Request body too large."), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Malformed JSON request."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

async function main() {
  const argumentsMap = parseArguments();
  const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
  const configPath = path.resolve(argumentsMap.config ?? path.join(scriptDirectory, "local_service.env"));
  const config = parseEnvFile(await fsp.readFile(configPath, "utf8"));
  const apiKey = requireSetting(config, "AIGC_SERVICE_API_KEY");
  if (apiKey.length < 32) throw new Error("AIGC_SERVICE_API_KEY must be at least 32 characters.");
  const host = config.HOST ?? "127.0.0.1";
  if (host !== "127.0.0.1" && host !== "::1") throw new Error("Local service may bind only to 127.0.0.1 or ::1.");
  const port = parseBoundedInteger(config.PORT ?? String(DEFAULT_PORT), "PORT", 1024, 65535);
  const maxTextCharacters = parseBoundedInteger(config.MAX_TEXT_CHARACTERS ?? String(DEFAULT_MAX_TEXT_CHARACTERS), "MAX_TEXT_CHARACTERS", 1, DEFAULT_MAX_TEXT_CHARACTERS);
  const exportDirectory = path.resolve(requireSetting(config, "MODEL_EXPORT_DIR"));
  const fixture = JSON.parse(await fsp.readFile(path.join(exportDirectory, "node_consistency_fixture.json"), "utf8"));
  const modelPath = path.join(exportDirectory, fixture.onnx_model);
  const [tokenizer, modelSha256] = await Promise.all([readTokenizer(exportDirectory, fixture.max_length), sha256File(modelPath)]);
  const session = await ort.InferenceSession.create(modelPath, {
    executionProviders: ["cpu"],
    enableCpuMemArena: false,
    enableMemPattern: false,
    executionMode: "sequential",
    graphOptimizationLevel: "disabled",
    interOpNumThreads: 1,
    intraOpNumThreads: 1,
  });
  const startedAt = Date.now();
  let requestInProgress = false;

  const server = http.createServer(async (request, response) => {
    const providedKey = request.headers["x-aigc-api-key"];
    if (!secureEqual(apiKey, Array.isArray(providedKey) ? providedKey[0] : providedKey)) {
      writeJson(response, 401, { error: "unauthorized" });
      return;
    }
    if (request.method === "GET" && request.url === "/health") {
      writeJson(response, 200, {
        status: "ok",
        service_version: SERVICE_VERSION,
        engine: "candidate-bert-onnx-local-v1",
        execution_provider: "cpu",
        model_sha256: modelSha256,
        uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
      });
      return;
    }
    if (request.method !== "POST" || request.url !== "/v1/detect") {
      writeJson(response, 404, { error: "not_found" });
      return;
    }
    if (requestInProgress) {
      writeJson(response, 429, { error: "busy", retry_after_seconds: 1 });
      return;
    }
    requestInProgress = true;
    const started = performance.now();
    try {
      const body = await readJsonRequest(request);
      if (typeof body?.text !== "string") throw Object.assign(new Error("text must be a string."), { statusCode: 400 });
      const text = body.text.trim();
      if (text.length < 2) throw Object.assign(new Error("text is too short."), { statusCode: 400 });
      if (text.length > maxTextCharacters) throw Object.assign(new Error("text exceeds configured character limit."), { statusCode: 413 });
      const inputIds = encode(text, tokenizer);
      const attentionMask = new ort.Tensor("int64", BigInt64Array.from({ length: inputIds.size }, () => 1n), inputIds.dims);
      const tokenTypeIds = new ort.Tensor("int64", BigInt64Array.from({ length: inputIds.size }, () => 0n), inputIds.dims);
      const output = await session.run({ input_ids: inputIds, attention_mask: attentionMask, token_type_ids: tokenTypeIds });
      const probabilities = softmax([...output.logits.data].map(Number));
      writeJson(response, 200, {
        engine: "candidate-bert-onnx-local-v1",
        model_sha256: modelSha256,
        ai_probability: probabilities[1],
        human_probability: probabilities[0],
        predicted_label: probabilities[1] >= 0.5 ? "ai" : "human",
        truncated: cleanAndSplit(text, tokenizer.doLowerCase).flatMap((token) => wordPiece(token, tokenizer.vocabulary, tokenizer.unknownToken)).length > tokenizer.maxLength - 2,
        latency_ms: Math.round((performance.now() - started) * 100) / 100,
      });
    } catch (error) {
      writeJson(response, error?.statusCode ?? 500, { error: error?.statusCode ? error.message : "inference_failed" });
    } finally {
      requestInProgress = false;
    }
  });
  server.keepAliveTimeout = 5000;
  server.headersTimeout = 8000;
  server.listen(port, host, () => {
    process.stdout.write(`${JSON.stringify({ status: "listening", host, port, service_version: SERVICE_VERSION, model_sha256: modelSha256 })}\n`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}

main().catch((error) => {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
});
