import { LogoA } from './logos/LogoA';
import { LogoE } from './logos/LogoE';
import { LogoI } from './logos/LogoI';

interface TopRecommendationsProps {
  colorMode: 'color' | 'dark' | 'light';
}

export function TopRecommendations({ colorMode }: TopRecommendationsProps) {
  const recommendations = [
    {
      id: 'A',
      name: '录制核心',
      component: LogoA,
      reasons: [
        '视觉识别度最高：圆形录制按钮是行业通用语言',
        'Fluent 风格完美契合：简洁几何、现代清晰',
        '全尺寸适配性强：从 1024px 到 16px 系统托盘都清晰可读',
        '情感传达准确：专业可靠且不失亲和力'
      ]
    },
    {
      id: 'E',
      name: '时间轴',
      component: LogoE,
      reasons: [
        '概念最贴合产品核心：自动识别「时机」进行录制',
        '差异化竞争优势：避免与常规录屏工具雷同',
        '扩展性强：时间轴概念可延伸至产品 UI 设计语言',
        '专业感突出：适合向游戏主播/内容创作者推广'
      ]
    },
    {
      id: 'I',
      name: '字母融合',
      component: LogoI,
      reasons: [
        '品牌记忆点强：U+R 字母组合独特且易记',
        '国际化友好：纯字母设计跨文化无障碍',
        '现代简约美学：符合 2024 年扁平化趋势',
        '灵活性高：可轻松衍生出动态 Logo 动画'
      ]
    }
  ];

  return (
    <section className="mt-20">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-10 border-2 border-blue-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">🏆 设计师推荐 Top 3</h2>
        <p className="text-gray-600 mb-10">基于品牌定位、应用场景与市场竞争力的综合评估</p>
        
        <div className="grid grid-cols-3 gap-8">
          {recommendations.map((rec, index) => {
            const LogoComponent = rec.component;
            return (
              <div
                key={rec.id}
                className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-lg"
              >
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 px-6 py-4 text-white">
                  <div className="flex items-center gap-3">
                    <span className="text-4xl font-bold opacity-50">#{index + 1}</span>
                    <div>
                      <span className="text-sm opacity-90">方案 {rec.id}</span>
                      <h3 className="text-xl font-bold">{rec.name}</h3>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-gray-50">
                  <div className="bg-white rounded-lg p-4">
                    <LogoComponent colorMode="color" compact />
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <h4 className="font-bold text-gray-900 mb-3">推荐理由：</h4>
                  <ul className="space-y-2">
                    {rec.reasons.map((reason, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 p-6 bg-white rounded-xl border-2 border-blue-300">
          <h4 className="font-bold text-gray-900 mb-2">💡 最终建议</h4>
          <p className="text-gray-700 leading-relaxed">
            如果追求<strong className="text-blue-600">稳健与快速市场认知</strong>，推荐方案 A「录制核心」；<br />
            如果希望<strong className="text-indigo-600">突出产品独特性与技术优势</strong>，推荐方案 E「时间轴」；<br />
            如果计划<strong className="text-purple-600">国际化扩张与品牌长期建设</strong>，推荐方案 I「字母融合」。
          </p>
        </div>
      </div>
    </section>
  );
}
