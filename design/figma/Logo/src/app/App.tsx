import { useState } from 'react';
import { LogoGrid } from './components/LogoGrid';
import { TopRecommendations } from './components/TopRecommendations';

function App() {
  const [colorMode, setColorMode] = useState<'color' | 'dark' | 'light'>('color');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">UniqueRecord Logo 设计方案</h1>
              <p className="text-gray-600 mt-1">Windows 游戏自动录制工具 - 品牌视觉系统</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setColorMode('color')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'color'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                彩色版
              </button>
              <button
                onClick={() => setColorMode('dark')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                单色深色版
              </button>
              <button
                onClick={() => setColorMode('light')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  colorMode === 'light'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                反白版
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-8 py-12">
        <LogoGrid colorMode={colorMode} />
        <TopRecommendations colorMode={colorMode} />
      </main>

      <footer className="bg-white border-t border-gray-200 mt-20">
        <div className="max-w-[1800px] mx-auto px-8 py-6 text-center text-gray-600">
          <p>UniqueRecord - 游戏自动录制工具 | 2024 品牌设计方案</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
