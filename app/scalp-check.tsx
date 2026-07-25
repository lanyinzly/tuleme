"use client";
/* eslint-disable @next/next/no-img-element */

import { useRef, useState } from "react";
import type {
  CaptureMode,
  QualityMetrics,
  ScalpMetric,
  ScalpReport,
} from "../lib/scalp-agent/schema";
import { PIPELINE } from "../lib/scalp-agent/schema";

type PreparedImage = {
  preview: string;
  images: string[];
  quality: QualityMetrics;
};

const sampleQuality: QualityMetrics = {
  width: 1448,
  height: 1086,
  brightness: 148,
  blurScore: 82,
  clippedDark: 0.02,
  clippedBright: 0.03,
  status: "pass",
  reasons: ["清晰度、曝光和分辨率均适合演示分析"],
};

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法打开这张图片"));
    image.src = source;
  });
}

function calculateQuality(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
): QualityMetrics {
  const sample = document.createElement("canvas");
  sample.width = 96;
  sample.height = 96;
  const context = sample.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("浏览器无法读取图片像素");
  context.drawImage(canvas, 0, 0, 96, 96);
  const pixels = context.getImageData(0, 0, 96, 96).data;
  const grays = new Float32Array(96 * 96);
  let total = 0;
  let dark = 0;
  let bright = 0;

  for (let index = 0; index < grays.length; index += 1) {
    const offset = index * 4;
    const gray =
      pixels[offset] * 0.299 +
      pixels[offset + 1] * 0.587 +
      pixels[offset + 2] * 0.114;
    grays[index] = gray;
    total += gray;
    if (gray < 22) dark += 1;
    if (gray > 238) bright += 1;
  }

  let laplacianTotal = 0;
  let laplacianSquared = 0;
  let laplacianCount = 0;
  for (let y = 1; y < 95; y += 1) {
    for (let x = 1; x < 95; x += 1) {
      const center = grays[y * 96 + x];
      const laplacian =
        grays[(y - 1) * 96 + x] +
        grays[(y + 1) * 96 + x] +
        grays[y * 96 + x - 1] +
        grays[y * 96 + x + 1] -
        center * 4;
      laplacianTotal += laplacian;
      laplacianSquared += laplacian * laplacian;
      laplacianCount += 1;
    }
  }
  const mean = laplacianTotal / laplacianCount;
  const variance = laplacianSquared / laplacianCount - mean * mean;
  const blurScore = clamp(Math.sqrt(Math.max(0, variance)) * 4.2);
  const brightness = Math.round(total / grays.length);
  const clippedDark = dark / grays.length;
  const clippedBright = bright / grays.length;
  const reasons: string[] = [];

  if (image.naturalWidth < 640 || image.naturalHeight < 480) {
    reasons.push("分辨率太低，毛囊细节可能看不清");
  }
  if (brightness < 45) reasons.push("画面偏暗，请增加均匀白光");
  if (brightness > 225) reasons.push("画面过曝，请避开闪光反射");
  if (blurScore < 12) reasons.push("画面偏糊，请固定手机后重拍");
  if (clippedDark > 0.45) reasons.push("暗部过多，头皮可见范围不足");
  if (clippedBright > 0.45) reasons.push("高光过多，油脂判断会受影响");

  const hardFail =
    image.naturalWidth < 640 ||
    image.naturalHeight < 480 ||
    brightness < 45 ||
    brightness > 225 ||
    blurScore < 12 ||
    clippedDark > 0.45 ||
    clippedBright > 0.45;
  const warn =
    !hardFail &&
    (image.naturalWidth < 1000 ||
      image.naturalHeight < 700 ||
      blurScore < 24 ||
      brightness < 75 ||
      brightness > 205);

  if (!reasons.length) {
    reasons.push(
      warn
        ? "可以分析，但更高分辨率或更稳的拍摄会提升置信度"
        : "清晰度、曝光和分辨率均适合分析",
    );
  }

  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    brightness,
    blurScore,
    clippedDark,
    clippedBright,
    status: hardFail ? "fail" : warn ? "warn" : "pass",
    reasons,
  };
}

async function prepareImage(file: File): Promise<PreparedImage> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法处理这张图片");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const preview = canvas.toDataURL("image/jpeg", 0.84);
    const quality = calculateQuality(image, canvas);

    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    const cropY = Math.max(0, (image.naturalHeight - cropSize) / 2);
    const crops = [0, 0.5, 1].map((position) => {
      const cropX = Math.max(
        0,
        (image.naturalWidth - cropSize) * position,
      );
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = 720;
      cropCanvas.height = 720;
      const cropContext = cropCanvas.getContext("2d");
      if (!cropContext) throw new Error("浏览器无法生成区域图");
      cropContext.drawImage(
        image,
        cropX,
        cropY,
        cropSize,
        cropSize,
        0,
        0,
        720,
        720,
      );
      return cropCanvas.toDataURL("image/jpeg", 0.82);
    });

    return { preview, images: [preview, ...crops], quality };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function metricTone(metric: ScalpMetric) {
  if (metric.riskLevel === "high") return "metric-high";
  if (metric.riskLevel === "watch") return "metric-watch";
  return "metric-low";
}

export default function ScalpCheck() {
  const [captureMode, setCaptureMode] = useState<CaptureMode>("phone");
  const [prepared, setPrepared] = useState<PreparedImage | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<ScalpReport | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file?: File) {
    if (!file) return;
    setError("");
    setReport(null);
    setLoadingImage(true);
    try {
      setPrepared(await prepareImage(file));
    } catch (caught) {
      setPrepared(null);
      setError(caught instanceof Error ? caught.message : "图片处理失败");
    } finally {
      setLoadingImage(false);
    }
  }

  async function runAnalysis(demoRequested = false) {
    if (!demoRequested && !prepared) return;
    setError("");
    setReport(null);
    setAnalyzing(true);
    setProgress(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(current + 1, PIPELINE.length - 1));
    }, 620);

    try {
      const quality = demoRequested ? sampleQuality : prepared!.quality;
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: demoRequested ? [] : prepared!.images,
          captureMode,
          quality,
          demoRequested,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || "分析暂时没有完成，请再试一次");
      }
      const result = (await response.json()) as ScalpReport;
      const remaining = Math.max(0, 3200 - (Date.now() - startedAt));
      await new Promise((resolve) => window.setTimeout(resolve, remaining));
      setProgress(PIPELINE.length);
      setReport(result);
      if (demoRequested) {
        setPrepared({
          preview: "/tuleme-hero.png",
          images: [],
          quality: sampleQuality,
        });
      }
      window.setTimeout(() => {
        document
          .getElementById("analysis-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "分析失败");
    } finally {
      window.clearInterval(timer);
      setAnalyzing(false);
    }
  }

  function reset() {
    setPrepared(null);
    setReport(null);
    setProgress(0);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <section className="check-section section-shell" id="check">
      <div className="check-title">
        <p className="eyebrow">TRY IT NOW</p>
        <h2>
          把照片交给证据，
          <br />
          别交给焦虑<span className="coral-dot">。</span>
        </h2>
        <p>
          图片会先在浏览器中缩放并做清晰度检查；原图不落库，分析请求完成后即结束。
        </p>
      </div>

      <div className="check-workspace">
        <div className="mode-switch" aria-label="选择拍摄方式">
          <button
            className={captureMode === "phone" ? "active" : ""}
            onClick={() => setCaptureMode("phone")}
            type="button"
          >
            <span>手机拍摄</span>
            <small>日常快照</small>
          </button>
          <button
            className={captureMode === "scope" ? "active" : ""}
            onClick={() => setCaptureMode("scope")}
            type="button"
          >
            <span>专业设备</span>
            <small>镜检 / 标尺图</small>
          </button>
        </div>

        {!prepared ? (
          <div
            className={`upload-zone ${loadingImage ? "is-loading" : ""}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              void handleFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture={captureMode === "phone" ? "environment" : undefined}
              onChange={(event) => void handleFile(event.target.files?.[0])}
              aria-label="上传头皮照片"
            />
            <span className="upload-number">01</span>
            <div className="camera-mark" aria-hidden="true">
              <i />
            </div>
            <h3>{loadingImage ? "正在检查图片…" : "上传或拍摄头皮照片"}</h3>
            <p>
              分开头发，镜头垂直头皮，保持约 10–15 cm 距离。
              <br />
              使用均匀白光，避免闪光直射。
            </p>
            <button
              type="button"
              className="upload-button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loadingImage}
            >
              选择照片
            </button>
            <button
              type="button"
              className="text-button"
              onClick={() => void runAnalysis(true)}
              disabled={analyzing}
            >
              先用示例体验完整流程 →
            </button>
          </div>
        ) : (
          <div className="prepared-zone">
            <div className="prepared-image">
              <img
                src={prepared.preview}
                alt="待分析的头皮照片预览"
              />
              <span className={`quality-pill ${prepared.quality.status}`}>
                {prepared.quality.status === "pass"
                  ? "图片过关"
                  : prepared.quality.status === "warn"
                    ? "可以分析"
                    : "建议重拍"}
              </span>
            </div>
            <div className="quality-panel">
              <div className="quality-heading">
                <div>
                  <span>02 · 质量检查</span>
                  <h3>
                    {prepared.quality.status === "fail"
                      ? "这张图还不够诚实"
                      : "这张图可以说话"}
                  </h3>
                </div>
                <button type="button" onClick={reset}>
                  换一张
                </button>
              </div>
              <div className="quality-stats">
                <div>
                  <span>分辨率</span>
                  <strong>
                    {prepared.quality.width} × {prepared.quality.height}
                  </strong>
                </div>
                <div>
                  <span>亮度</span>
                  <strong>{prepared.quality.brightness}</strong>
                </div>
                <div>
                  <span>清晰度</span>
                  <strong>{prepared.quality.blurScore}</strong>
                </div>
              </div>
              <ul>
                {prepared.quality.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
              <button
                type="button"
                className="primary-button analyze-button"
                onClick={() => void runAnalysis(false)}
                disabled={
                  analyzing || prepared.quality.status === "fail"
                }
              >
                {analyzing
                  ? "正在交叉分析…"
                  : prepared.quality.status === "fail"
                    ? "重拍后再分析"
                    : "开始分析"}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
        )}

        {analyzing && (
          <div className="pipeline-live" aria-live="polite">
            <div className="pipeline-top">
              <span>Agent 正在工作</span>
              <strong>
                {Math.min(progress + 1, PIPELINE.length)}/{PIPELINE.length}
              </strong>
            </div>
            {PIPELINE.map((step, index) => (
              <div
                key={step.id}
                className={
                  index < progress
                    ? "done"
                    : index === progress
                      ? "current"
                      : ""
                }
              >
                <i>{index < progress ? "✓" : index + 1}</i>
                <span>
                  <strong>{step.label}</strong>
                  <small>{step.detail}</small>
                </span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>

      {report && (
        <div className="analysis-result" id="analysis-result">
          <div className="result-header">
            <div>
              <p className="eyebrow">
                REPORT {report.reportId}
                <span className={`mode-badge ${report.mode}`}>
                  {report.mode === "live" ? "视觉模型" : "演示推理"}
                </span>
              </p>
              <h3>{report.overall.headline}</h3>
              <p>
                结论置信度 {report.overall.confidence}% ·{" "}
                {report.captureMode === "scope" ? "专业设备模式" : "手机模式"}
              </p>
            </div>
            <div
              className="overall-score"
              style={
                {
                  "--overall": `${report.overall.score * 3.6}deg`,
                } as React.CSSProperties
              }
            >
              <span>
                <strong>{report.overall.score}</strong>
                /100
              </span>
            </div>
          </div>

          {report.mode === "demo" && (
            <p className="demo-notice">
              当前展示的是可交互演示结果。部署环境配置
              OPENAI_API_KEY 后，上传照片会进入真实的多视角视觉推理。
            </p>
          )}

          <div className="result-metrics">
            {report.metrics.map((metric) => (
              <article className={metricTone(metric)} key={metric.key}>
                <div className="metric-top">
                  <span>{metric.label}</span>
                  <strong>{metric.score}</strong>
                </div>
                <div className="metric-track">
                  <i style={{ width: `${metric.score}%` }} />
                </div>
                <p>{metric.interpretation}</p>
                <ul>
                  {metric.evidence.slice(0, 2).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <small>
                  置信度 {metric.confidence}% · {metric.limitation}
                </small>
              </article>
            ))}
          </div>

          <div className="result-lower">
            <div className="finding-card">
              <span className="card-kicker">这次看到了什么</span>
              <ol>
                {report.findings.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ol>
            </div>
            <div className="recommendation-card">
              <span className="card-kicker">接下来怎么做</span>
              {report.recommendations.map((recommendation) => (
                <div key={recommendation.title}>
                  <span>{recommendation.cadence}</span>
                  <strong>{recommendation.title}</strong>
                  <p>{recommendation.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {report.redFlags.length > 0 && (
            <div className="red-flags">
              <strong>建议线下确认</strong>
              {report.redFlags.map((flag) => (
                <span key={flag}>{flag}</span>
              ))}
            </div>
          )}

          <div className="result-footer">
            <p>{report.disclaimer}</p>
            <button type="button" onClick={reset}>
              再测一张
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
