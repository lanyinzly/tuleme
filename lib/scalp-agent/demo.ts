import {
  PIPELINE,
  type AnalyzeRequest,
  type ScalpMetric,
  type ScalpReport,
} from "./schema";

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function hash(input: string) {
  let value = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    value ^= input.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

function riskLevel(score: number): ScalpMetric["riskLevel"] {
  if (score >= 72) return "low";
  if (score >= 45) return "watch";
  return "high";
}

function metric(
  key: ScalpMetric["key"],
  label: string,
  score: number,
  confidence: number,
  interpretation: string,
  evidence: string[],
  limitation: string,
): ScalpMetric {
  return {
    key,
    label,
    score: clamp(score),
    riskLevel: riskLevel(score),
    confidence: clamp(confidence),
    interpretation,
    evidence,
    limitation,
  };
}

export function createDemoReport(request: AnalyzeRequest): ScalpReport {
  const seed = hash(
    `${request.captureMode}-${request.quality.width}-${request.quality.height}-${request.quality.brightness}`,
  );
  const wobble = (slot: number) => ((seed >> (slot * 3)) % 13) - 6;
  const confidenceBase =
    request.quality.status === "pass"
      ? 84
      : request.quality.status === "warn"
        ? 70
        : 48;

  const metrics = [
    metric(
      "density",
      "毛囊密度",
      76 + wobble(0),
      confidenceBase,
      "可见发丝覆盖整体连续，局部区域略显疏松。",
      ["中心区域毛囊口分布较均匀", "右侧裁切可见轻微覆盖落差"],
      "手机照片未含比例尺，该分数是视觉代理，并非真实毛囊计数。",
    ),
    metric(
      "inflammation",
      "炎症平稳度",
      76 + wobble(1),
      confidenceBase - 3,
      "大部分头皮颜色平稳，少量局部泛红值得观察。",
      ["未见广泛强烈红斑", "分缝附近有轻微色差"],
      "光源色温会影响红度判断，建议下次使用自然白光复拍。",
    ),
    metric(
      "sebum",
      "油脂平衡",
      68 + wobble(2),
      confidenceBase - 6,
      "表面有轻微反光，但尚未形成明显大范围发丝粘连。",
      ["局部可见连续高光", "多数发根仍保持分离"],
      "照片只能观察油光与成束迹象，不能测量真实皮脂分泌量。",
    ),
    metric(
      "flaking",
      "清洁状态",
      82 + wobble(3),
      confidenceBase - 2,
      "当前画面没有看到明显片状堆积。",
      ["头皮表面整体干净", "未见大面积白色鳞屑"],
      "细小鳞屑可能受分辨率和压缩影响而不可见。",
    ),
    metric(
      "shaft_uniformity",
      "发丝均匀度",
      73 + wobble(4),
      confidenceBase - 4,
      "可见发丝粗细大致一致，少量细软发丝可继续追踪。",
      ["主发丝直径观感接近", "局部存在少量细软发丝"],
      "单张图片无法区分自然粗细差异与持续性变化。",
    ),
  ];

  const overallScore = clamp(
    metrics[0].score * 0.3 +
      metrics[1].score * 0.25 +
      metrics[2].score * 0.2 +
      metrics[3].score * 0.15 +
      metrics[4].score * 0.1,
  );

  return {
    reportId: `TL-${String(seed).slice(0, 6)}`,
    mode: "demo",
    capturedAt: new Date().toISOString(),
    captureMode: request.captureMode,
    overall: {
      score: overallScore,
      confidence: clamp(confidenceBase - 2),
      headline:
        overallScore >= 72
          ? "整体状态平稳，重点留意油脂与局部覆盖变化。"
          : "有几处值得观察，但先别急着给头皮下结论。",
    },
    quality: request.quality,
    metrics,
    findings: [
      "输入质量足以做一次视觉层面的基础观察。",
      "当前最值得追踪的是油光变化与局部发丝覆盖差异。",
      "同角度、同光线的连续照片，比单次高分更有价值。",
    ],
    recommendations: [
      {
        title: "今天：温和分区梳理",
        detail:
          "从发梢到发根分区梳理 2–3 分钟，避免抓挠或用力摩擦泛红区域。",
        cadence: "每天 1 次",
        priority: "today",
      },
      {
        title: "本周：观察清洁节奏",
        detail:
          "记录洗发后 24 小时的油光与发根成束程度，不因一次照片频繁更换产品。",
        cadence: "连续观察 7 天",
        priority: "this_week",
      },
      {
        title: "追踪：固定机位复拍",
        detail:
          "保持同一分缝、距离和自然白光，每周复拍一次，用趋势判断变化。",
        cadence: "每 7 天 1 次",
        priority: "track",
      },
    ],
    redFlags: [],
    pipeline: PIPELINE,
    disclaimer:
      "本报告用于头皮健康管理与趋势观察，不构成医疗诊断。若出现疼痛、渗出、出血、持续加重的红斑或短期快速脱发，请咨询皮肤科专业人员。",
  };
}

