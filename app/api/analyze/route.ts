import { analyzeScalpImages } from "../../../lib/scalp-agent/orchestrator";
import type { AnalyzeRequest } from "../../../lib/scalp-agent/schema";

export const runtime = "edge";

function invalid(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  let body: AnalyzeRequest;
  try {
    body = (await request.json()) as AnalyzeRequest;
  } catch {
    return invalid("无法读取这次分析请求。");
  }

  if (!body || !["phone", "scope"].includes(body.captureMode)) {
    return invalid("请选择正确的拍摄模式。");
  }
  if (!body.quality) {
    return invalid("缺少图像质量信息。");
  }

  const images = body.images ?? [];
  if (!body.demoRequested) {
    if (images.length < 1 || images.length > 4) {
      return invalid("请提供 1–4 张同一次拍摄生成的图像区域。");
    }
    if (
      images.some(
        (image) =>
          typeof image !== "string" || !image.startsWith("data:image/"),
      )
    ) {
      return invalid("只接受图片数据。");
    }
    const totalCharacters = images.reduce(
      (total, image) => total + image.length,
      0,
    );
    if (totalCharacters > 12_000_000) {
      return invalid("图片过大，请压缩后重试。", 413);
    }
  }

  const report = await analyzeScalpImages({ ...body, images });
  return Response.json(report, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
