/* eslint-disable @next/next/no-img-element */
import ScalpCheck from "./scalp-check";
import { PIPELINE } from "../lib/scalp-agent/schema";

const dimensions = [
  {
    number: "01",
    title: "毛囊密度",
    copy: "观察可见毛囊口、发丝覆盖与区域差异。手机模式给出视觉代理，专业镜检模式可结合标尺提高可比性。",
  },
  {
    number: "02",
    title: "炎症迹象",
    copy: "寻找局部泛红、刺激、破损等可见信号。它描述画面，不替皮肤科医生命名疾病。",
  },
  {
    number: "03",
    title: "油脂平衡",
    copy: "依据表面高光、发根成束和区域分布估计油脂观感，不把一张亮图误当成皮脂检测仪。",
  },
  {
    number: "04",
    title: "清洁状态",
    copy: "观察可见鳞屑与堆积，同时把分辨率、压缩和光线造成的漏检写进置信度。",
  },
];

export default function Home() {
  return (
    <main>
      <header className="site-header">
        <a className="wordmark" href="#top" aria-label="秃了么首页">
          秃了么<span aria-hidden="true">.</span>
        </a>
        <nav aria-label="主导航">
          <a href="#how">工作原理</a>
          <a href="#dimensions">检测维度</a>
          <a href="#agent">Agent</a>
        </nav>
        <a className="header-action" href="#check">
          开始检测
        </a>
      </header>

      <section className="hero section-shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">
            <span>SCALP SNAPSHOT</span>
            头皮今天有话说
          </p>
          <h1>
            拍张头皮，
            <br />
            看看它今天
            <br />
            想说什么<span className="coral-dot">。</span>
          </h1>
          <p className="hero-intro">
            手机或专业设备拍摄，一张照片读懂毛囊密度、炎症迹象与油脂状态。
            先看清证据，再给出下一步。
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#check">
              开始头皮快照
              <span aria-hidden="true">↗</span>
            </a>
            <span>约 30 秒 · 不保存原图</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="头皮分析结果示意">
          <div className="hero-sticker sticker-comb" aria-hidden="true">
            梳
          </div>
          <div className="hero-card">
            <div className="hero-image-wrap">
              <img
                src="/tuleme-hero.png"
                alt="用于头皮健康分析的清晰头皮微距照片"
              />
              <span className="scan-corner corner-one" />
              <span className="scan-corner corner-two" />
              <span className="sample-label">示例画面</span>
            </div>
            <div className="hero-metrics">
              <div>
                <span>毛囊密度</span>
                <strong>76</strong>
                <i style={{ "--score": "76%" } as React.CSSProperties} />
              </div>
              <div>
                <span>炎症风险</span>
                <strong>24</strong>
                <i
                  className="coral-bar"
                  style={{ "--score": "24%" } as React.CSSProperties}
                />
              </div>
              <div>
                <span>油脂平衡</span>
                <strong>68</strong>
                <i style={{ "--score": "68%" } as React.CSSProperties} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="promise-strip" aria-label="产品原则">
        <span>先检查图片</span>
        <b>→</b>
        <span>再分析证据</span>
        <b>→</b>
        <span>最后给建议</span>
        <em>不糊弄，不吓人，不装医生。</em>
      </section>

      <ScalpCheck />

      <section className="method section-shell" id="how">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">HOW IT WORKS</p>
            <h2>
              不读心，
              <br />
              只读图<span className="coral-dot">。</span>
            </h2>
          </div>
          <p>
            我们沿用“检索—综合—校验”的思路，把一张图拆成可追踪的证据链。
            每一步都能解释，质量不够时就停下来，而不是硬凑一个答案。
          </p>
        </div>
        <figure className="flow-figure">
          <img
            src="/tuleme-flow.png"
            alt="秃了么从拍摄引导、质量检查、区域取证、专项分析、交叉校验到报告与建议的六步流程"
          />
          <figcaption>
            看得见证据 · 说得清置信度 · 给得出下一步
          </figcaption>
        </figure>
      </section>

      <section className="dimensions section-shell" id="dimensions">
        <div className="section-heading">
          <p className="eyebrow">WHAT WE SCORE</p>
          <h2>
            四件事，
            <br />
            一张图先说清<span className="coral-dot">。</span>
          </h2>
        </div>
        <div className="dimension-grid">
          {dimensions.map((dimension) => (
            <article key={dimension.number} className="dimension-card">
              <span>{dimension.number}</span>
              <h3>{dimension.title}</h3>
              <p>{dimension.copy}</p>
            </article>
          ))}
        </div>
        <p className="calibration-note">
          <strong>专业设备模式</strong>
          可加入倍率、标尺与偏振信息；手机模式则明确标注“视觉代理”，避免把估计包装成测量。
        </p>
      </section>

      <section className="agent-section section-shell" id="agent">
        <div className="agent-copy">
          <p className="eyebrow">AGENT HARNESS</p>
          <h2>
            它不是拍脑袋的
            <br />
            Agent<span className="coral-dot">。</span>
          </h2>
          <p>
            两个视觉专项 Agent 独立看同一组原图与裁切图，再由校验 Agent
            对照证据、分数与限制。结果冲突时，不投票硬选，而是降低置信度并把原因告诉你。
          </p>
          <ul>
            <li>原图 + 左/中/右多区域裁切，减少单一区域偏差</li>
            <li>毛囊覆盖与头皮表面状态并行分析，避免提示词互相干扰</li>
            <li>结构化输出、证据绑定、阈值校验与健康安全边界</li>
            <li>同角度复拍后看趋势，不用一次分数制造焦虑</li>
          </ul>
        </div>
        <div className="agent-board" aria-label="Agent 编排流程">
          {PIPELINE.map((step, index) => (
            <div className="agent-node" key={step.id}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <p>{step.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="closing-cta section-shell">
        <p>先别急着和发际线谈判。</p>
        <h2>给头皮一张清楚的照片。</h2>
        <a className="primary-button dark-button" href="#check">
          现在拍一张
          <span aria-hidden="true">↑</span>
        </a>
      </section>

      <footer>
        <a className="wordmark" href="#top">
          秃了么<span>.</span>
        </a>
        <p>一张照片，读懂今天的头皮。</p>
        <p>仅用于健康管理与趋势观察，不构成医疗诊断。</p>
      </footer>
    </main>
  );
}
