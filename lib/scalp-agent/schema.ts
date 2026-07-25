export type CaptureMode = "phone" | "scope";
export type AnalysisMode = "demo" | "live";

export type QualityMetrics = {
  width: number;
  height: number;
  brightness: number;
  blurScore: number;
  clippedDark: number;
  clippedBright: number;
  status: "pass" | "warn" | "fail";
  reasons: string[];
};

export type ScalpMetricKey =
  | "density"
  | "inflammation"
  | "sebum"
  | "flaking"
  | "shaft_uniformity";

export type ScalpMetric = {
  key: ScalpMetricKey;
  label: string;
  score: number;
  riskLevel: "low" | "watch" | "high";
  confidence: number;
  interpretation: string;
  evidence: string[];
  limitation: string;
};

export type Recommendation = {
  title: string;
  detail: string;
  cadence: string;
  priority: "today" | "this_week" | "track";
};

export type PipelineStep = {
  id: string;
  label: string;
  detail: string;
};

export type ScalpReport = {
  reportId: string;
  mode: AnalysisMode;
  capturedAt: string;
  captureMode: CaptureMode;
  overall: {
    score: number;
    confidence: number;
    headline: string;
  };
  quality: QualityMetrics;
  metrics: ScalpMetric[];
  findings: string[];
  recommendations: Recommendation[];
  redFlags: string[];
  pipeline: PipelineStep[];
  disclaimer: string;
};

export type AnalyzeRequest = {
  images?: string[];
  captureMode: CaptureMode;
  quality: QualityMetrics;
  demoRequested?: boolean;
};

export const PIPELINE: PipelineStep[] = [
  {
    id: "capture",
    label: "拍摄引导",
    detail: "统一角度、距离和光线，先把输入变得可比较。",
  },
  {
    id: "quality",
    label: "质量检查",
    detail: "检查清晰度、曝光、分辨率和头皮可见范围。",
  },
  {
    id: "regions",
    label: "区域取证",
    detail: "原图与左、中、右裁切共同进入视觉证据层。",
  },
  {
    id: "specialists",
    label: "专项分析",
    detail: "密度 Agent 与头皮状态 Agent 并行独立判断。",
  },
  {
    id: "verify",
    label: "交叉校验",
    detail: "核对证据、分数和置信度，冲突时主动降级。",
  },
  {
    id: "report",
    label: "报告与建议",
    detail: "把观察转成可执行的护理与复拍计划。",
  },
];

