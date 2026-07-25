import { createDemoReport } from "./demo";
import {
  conditionPrompt,
  densityPrompt,
  verifierPrompt,
} from "./prompts";
import {
  PIPELINE,
  type AnalyzeRequest,
  type ScalpReport,
} from "./schema";

const specialistSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    adequacy: { type: "number", minimum: 0, maximum: 100 },
    observations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: {
            type: "string",
            enum: [
              "density",
              "inflammation",
              "sebum",
              "flaking",
              "shaft_uniformity",
            ],
          },
          score: { type: "number", minimum: 0, maximum: 100 },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          evidence: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 4,
          },
          caveat: { type: "string" },
        },
        required: ["key", "score", "confidence", "evidence", "caveat"],
      },
    },
  },
  required: ["adequacy", "observations"],
} as const;

const finalSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overall: {
      type: "object",
      additionalProperties: false,
      properties: {
        score: { type: "number", minimum: 0, maximum: 100 },
        confidence: { type: "number", minimum: 0, maximum: 100 },
        headline: { type: "string" },
      },
      required: ["score", "confidence", "headline"],
    },
    metrics: {
      type: "array",
      minItems: 5,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          key: {
            type: "string",
            enum: [
              "density",
              "inflammation",
              "sebum",
              "flaking",
              "shaft_uniformity",
            ],
          },
          label: { type: "string" },
          score: { type: "number", minimum: 0, maximum: 100 },
          riskLevel: {
            type: "string",
            enum: ["low", "watch", "high"],
          },
          confidence: { type: "number", minimum: 0, maximum: 100 },
          interpretation: { type: "string" },
          evidence: {
            type: "array",
            items: { type: "string" },
            minItems: 1,
            maxItems: 4,
          },
          limitation: { type: "string" },
        },
        required: [
          "key",
          "label",
          "score",
          "riskLevel",
          "confidence",
          "interpretation",
          "evidence",
          "limitation",
        ],
      },
    },
    findings: {
      type: "array",
      items: { type: "string" },
      minItems: 2,
      maxItems: 5,
    },
    recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          cadence: { type: "string" },
          priority: {
            type: "string",
            enum: ["today", "this_week", "track"],
          },
        },
        required: ["title", "detail", "cadence", "priority"],
      },
    },
    redFlags: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
  },
  required: [
    "overall",
    "metrics",
    "findings",
    "recommendations",
    "redFlags",
  ],
} as const;

function extractOutputText(payload: Record<string, unknown>) {
  if (typeof payload.output_text === "string") return payload.output_text;
  const output = Array.isArray(payload.output) ? payload.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as { content?: unknown }).content)
      ? (item as { content: unknown[] }).content
      : [];
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  throw new Error("Model returned no parseable text output.");
}

async function callStructuredModel(args: {
  apiKey: string;
  prompt: string;
  images: string[];
  schemaName: string;
  schema: object;
}) {
  const model = process.env.OPENAI_MODEL || "gpt-5.6";
  const configuredBaseUrl =
    process.env.BASE_URL ||
    process.env.OPENAI_BASE_URL ||
    "https://api.openai.com/v1";
  const normalizedBaseUrl = configuredBaseUrl.replace(/\/+$/, "");
  const responsesUrl = normalizedBaseUrl.endsWith("/responses")
    ? normalizedBaseUrl
    : `${normalizedBaseUrl}/responses`;

  const response = await fetch(responsesUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      reasoning: { effort: "medium" },
      max_output_tokens: 2800,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: args.prompt },
            ...args.images.map((imageUrl) => ({
              type: "input_image",
              image_url: imageUrl,
              detail: "high",
            })),
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: args.schemaName,
          strict: true,
          schema: args.schema,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${detail}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return JSON.parse(extractOutputText(payload));
}

export async function analyzeScalpImages(
  request: AnalyzeRequest,
): Promise<ScalpReport> {
  const apiKey = process.env.API_KEY || process.env.OPENAI_API_KEY;
  const images = request.images ?? [];

  if (request.demoRequested || !apiKey || images.length === 0) {
    return createDemoReport(request);
  }

  try {
    const [density, condition] = await Promise.all([
      callStructuredModel({
        apiKey,
        prompt: densityPrompt(request.captureMode, request.quality),
        images,
        schemaName: "scalp_density_observations",
        schema: specialistSchema,
      }),
      callStructuredModel({
        apiKey,
        prompt: conditionPrompt(request.captureMode, request.quality),
        images,
        schemaName: "scalp_condition_observations",
        schema: specialistSchema,
      }),
    ]);

    const verified = await callStructuredModel({
      apiKey,
      prompt: verifierPrompt({
        captureMode: request.captureMode,
        quality: request.quality,
        density,
        condition,
      }),
      images: images.slice(0, 2),
      schemaName: "verified_scalp_report",
      schema: finalSchema,
    });

    return {
      reportId: `TL-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
      mode: "live",
      capturedAt: new Date().toISOString(),
      captureMode: request.captureMode,
      overall: verified.overall,
      quality: request.quality,
      metrics: verified.metrics,
      findings: verified.findings,
      recommendations: verified.recommendations,
      redFlags: verified.redFlags,
      pipeline: PIPELINE,
      disclaimer:
        "本报告用于头皮健康管理与趋势观察，不构成医疗诊断。若出现疼痛、渗出、出血、持续加重的红斑或短期快速脱发，请咨询皮肤科专业人员。",
    };
  } catch (error) {
    console.error(
      "Scalp analysis fell back to demo mode:",
      error instanceof Error ? error.message : "unknown error",
    );
    return createDemoReport(request);
  }
}
