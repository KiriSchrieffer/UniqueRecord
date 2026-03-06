import { LogoA } from './logos/LogoA';
import { LogoB } from './logos/LogoB';
import { LogoC } from './logos/LogoC';
import { LogoD } from './logos/LogoD';
import { LogoE } from './logos/LogoE';
import { LogoF } from './logos/LogoF';
import { LogoG } from './logos/LogoG';
import { LogoH } from './logos/LogoH';
import { LogoI } from './logos/LogoI';
import { LogoJ } from './logos/LogoJ';
import { LogoK } from './logos/LogoK';
import { LogoL } from './logos/LogoL';

interface LogoGridProps {
  colorMode: 'color' | 'dark' | 'light';
}

const logos = [
  { id: 'A', name: '录制核心', component: LogoA, description: '圆形录制按钮结合窗口框架，象征核心录制功能。适用于主图标与启动界面。' },
  { id: 'B', name: '镜头光圈', component: LogoB, description: '相机光圈几何图形，代表精准捕捉。适用于专业向用户群体。' },
  { id: 'C', name: '播放轨迹', component: LogoC, description: '播放按钮与录制轨迹融合，体现录制到回放的完整流程。适用于视频编辑场景。' },
  { id: 'D', name: '窗口捕获', component: LogoD, description: '窗口框架内嵌录制点，直观展示屏幕录制概念。适用于系统托盘图标。' },
  { id: 'E', name: '时间轴', component: LogoE, description: '时间轴上的关键帧，象征自动识别时机。适用于时间线相关功能。' },
  { id: 'F', name: '可靠盾牌', component: LogoF, description: '盾牌形态结合 REC 标识，传达可靠与安全感。适用于企业级用户。' },
  { id: 'G', name: '立方视角', component: LogoG, description: '立方体代表独特性与多维度录制。适用于 3D 游戏场景。' },
  { id: 'H', name: '循环轨道', component: LogoH, description: '圆环轨道象征持续捕捉与循环录制。适用于长时间录制场景。' },
  { id: 'I', name: '字母融合', component: LogoI, description: 'U+R 首字母创意组合，兼具识别度与简洁性。适用于国际化推广。' },
  { id: 'J', name: '像素网格', component: LogoJ, description: '像素化录制按钮，致敬游戏文化。适用于游戏社区推广。' },
  { id: 'K', name: '波形律动', component: LogoK, description: '音视频波形与录制点结合，展现动态捕捉。适用于直播场景。' },
  { id: 'L', name: '双环交织', component: LogoL, description: '双环交织代表游戏与录制的无缝连接。适用于品牌故事叙述。' },
];

export function LogoGrid({ colorMode }: LogoGridProps) {
  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-8">12 套设计方案</h2>
      <div className="grid grid-cols-3 gap-8">
        {logos.map((logo) => {
          const LogoComponent = logo.component;
          return (
            <div
              key={logo.id}
              className={`rounded-xl border-2 overflow-hidden transition-all hover:shadow-lg ${
                colorMode === 'light' ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <div className={`px-6 py-4 border-b-2 ${
                colorMode === 'light' ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className={`text-sm font-bold ${
                      colorMode === 'light' ? 'text-blue-400' : 'text-blue-600'
                    }`}>方案 {logo.id}</span>
                    <h3 className={`text-lg font-bold ${
                      colorMode === 'light' ? 'text-white' : 'text-gray-900'
                    }`}>{logo.name}</h3>
                  </div>
                </div>
                <p className={`text-sm mt-2 ${
                  colorMode === 'light' ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  {logo.description}
                </p>
              </div>
              
              <div className={`p-8 ${colorMode === 'light' ? 'bg-gray-900' : 'bg-white'}`}>
                <LogoComponent colorMode={colorMode} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
