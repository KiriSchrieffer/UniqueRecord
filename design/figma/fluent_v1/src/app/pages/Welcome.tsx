import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/fluent/Button';
import { TextField } from '../components/fluent/TextField';
import { Dropdown } from '../components/fluent/Dropdown';
import { Switch } from '../components/fluent/Switch';
import { Card } from '../components/fluent/Card';
import { Folder, Settings } from 'lucide-react';
import { UniqueRecordLogoSymbol } from '../components/branding/UniqueRecordLogo';
import { useI18n } from '../i18n';

export default function Welcome() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState({
    savePath: 'C:\\Users\\Public\\Videos\\UniqueRecord',
    quality: '1080p60',
    audioQuality: 'high',
    autoStart: true,
  });

  const steps = useMemo(
    () => [
      { title: tr('欢迎使用 UniqueRecord', 'Welcome to UniqueRecord'), icon: <UniqueRecordLogoSymbol size={28} /> },
      { title: tr('选择保存目录', 'Choose save directory'), icon: <Folder size={32} /> },
      { title: tr('配置录制参数', 'Configure recording profile'), icon: <Settings size={32} /> },
      { title: tr('完成设置', 'Setup completed'), icon: <UniqueRecordLogoSymbol size={28} /> },
    ],
    [tr]
  );

  const qualityOptions = [
    { value: '1080p60', label: '1080p 60FPS', recommended: true },
    { value: '1080p30', label: '1080p 30FPS' },
    { value: '720p60', label: '720p 60FPS' },
    { value: '720p30', label: '720p 30FPS' },
  ];

  const audioOptions = [
    { value: 'high', label: tr('高质量 (320kbps)', 'High quality (320kbps)'), recommended: true },
    { value: 'medium', label: tr('标准 (192kbps)', 'Standard (192kbps)') },
    { value: 'low', label: tr('低质量 (128kbps)', 'Low quality (128kbps)') },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-8">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center
                    transition-all duration-300
                    ${index <= currentStep ? 'bg-[var(--fluent-blue)] text-white' : 'bg-[var(--neutral-30)] text-[var(--muted-foreground)]'}
                  `}
                >
                  {index < currentStep ? (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.icon
                  )}
                </div>
                <span className={`text-[12px] ${index <= currentStep ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]'}`}>
                  {tr('步骤', 'Step')} {index + 1}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${index < currentStep ? 'bg-[var(--fluent-blue)]' : 'bg-[var(--neutral-30)]'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <Card padding="lg" shadow className="min-h-[400px] flex flex-col">
          <div className="flex-1">
            <h2 className="text-[var(--text-2xl)] font-semibold mb-2">{steps[currentStep].title}</h2>

            {currentStep === 0 && (
              <div className="mt-6 space-y-6">
                <div className="text-center py-8">
                  <div className="w-20 h-20 bg-[var(--neutral-10)] rounded-full border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
                    <UniqueRecordLogoSymbol size={44} />
                  </div>
                  <p className="text-[var(--text-lg)] text-[var(--foreground)] mb-4">{tr('为英雄联盟打造的自动录制工具', 'An automatic recorder built for League of Legends')}</p>
                  <p className="text-[14px] text-[var(--muted-foreground)] max-w-md mx-auto">
                    {tr('UniqueRecord 内置 Windows 原生录制引擎，无需额外安装第三方录屏工具。自动检测开局并开始录制，结算时自动结束并保存视频。', 'UniqueRecord ships with a Windows native recorder engine, without requiring third-party capture tools. It auto-detects match start and saves video automatically when match ends.')}
                  </p>
                </div>

                <div className="bg-[var(--neutral-10)] p-4 rounded-[var(--radius-lg)] space-y-2">
                  <h4 className="font-semibold text-[14px]">{tr('主要功能', 'Key features')}</h4>
                  <ul className="space-y-1.5 text-[13px] text-[var(--muted-foreground)]">
                    <li>{tr('自动检测开局并开始录制', 'Auto-detect match start and begin recording')}</li>
                    <li>{tr('游戏结束自动停止录制', 'Stop recording automatically at match end')}</li>
                    <li>{tr('本地保存高质量视频文件', 'Save high-quality local video files')}</li>
                    <li>{tr('内置原生录制引擎，即装即用', 'Built-in native engine, ready out of box')}</li>
                  </ul>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="mt-6 space-y-6">
                <p className="text-[14px] text-[var(--muted-foreground)]">{tr('选择录制视频保存路径，建议选择有足够空间的磁盘。', 'Choose where recordings are saved. A disk with enough free space is recommended.')}</p>

                <TextField
                  label={tr('保存目录', 'Save directory')}
                  value={config.savePath}
                  onChange={(e) => setConfig({ ...config, savePath: e.target.value })}
                  icon={<Folder size={16} />}
                  helperText={tr('录制视频将保存到此目录', 'Recorded videos will be saved here')}
                />

                <div className="bg-[var(--fluent-blue-lighter)] border border-[var(--fluent-blue-light)] p-4 rounded-[var(--radius-lg)]">
                  <h4 className="font-semibold text-[14px] text-[var(--fluent-blue)] mb-2">{tr('提示', 'Tip')}</h4>
                  <p className="text-[13px] text-[var(--foreground)]">{tr('一场 40 分钟的 1080p 60FPS 录像约占用 3-5 GB 空间，请确保目标磁盘空间充足。', 'A 40-minute 1080p 60FPS recording may use around 3-5 GB. Ensure enough free disk space.')}</p>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="mt-6 space-y-6">
                <p className="text-[14px] text-[var(--muted-foreground)]">{tr('配置录制画质和音频质量。后续可在“录制设置”中修改。', 'Configure video and audio quality. You can modify these later in Recording Settings.')}</p>

                <Dropdown
                  label={tr('画质设置', 'Video quality')}
                  options={qualityOptions}
                  value={config.quality}
                  onChange={(value) => setConfig({ ...config, quality: value })}
                />

                <Dropdown
                  label={tr('音频质量', 'Audio quality')}
                  options={audioOptions}
                  value={config.audioQuality}
                  onChange={(value) => setConfig({ ...config, audioQuality: value })}
                />

                <div className="flex items-center gap-3 p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
                  <Settings size={20} className="text-[var(--muted-foreground)]" />
                  <div className="flex-1">
                    <p className="text-[14px] font-medium">{tr('开机自动启动', 'Launch on startup')}</p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">{tr('随 Windows 启动后台检测服务', 'Start background detection with Windows')}</p>
                  </div>
                  <Switch checked={config.autoStart} onChange={(checked) => setConfig({ ...config, autoStart: checked })} />
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="mt-6 space-y-6">
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-[var(--status-success)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-[var(--status-success)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-[var(--text-lg)] font-semibold mb-2">{tr('配置完成', 'Setup complete')}</p>
                  <p className="text-[14px] text-[var(--muted-foreground)]">{tr('UniqueRecord 已准备就绪，开始使用自动录制。', 'UniqueRecord is ready. Start using automatic recording.')}</p>
                </div>

                <Card padding="md" className="bg-[var(--neutral-10)]">
                  <h4 className="font-semibold text-[14px] mb-3">{tr('配置摘要', 'Configuration summary')}</h4>
                  <div className="space-y-2 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">{tr('保存目录', 'Save directory')}</span>
                      <span className="text-[var(--foreground)] font-medium">{config.savePath}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">{tr('画质', 'Quality')}</span>
                      <span className="text-[var(--foreground)] font-medium">{qualityOptions.find((o) => o.value === config.quality)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">{tr('音频质量', 'Audio quality')}</span>
                      <span className="text-[var(--foreground)] font-medium">{audioOptions.find((o) => o.value === config.audioQuality)?.label}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">{tr('开机启动', 'Launch on startup')}</span>
                      <span className="text-[var(--foreground)] font-medium">{config.autoStart ? tr('已启用', 'Enabled') : tr('已禁用', 'Disabled')}</span>
                    </div>
                  </div>
                </Card>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--border)]">
            <Button variant="subtle" onClick={handleBack} disabled={currentStep === 0}>
              {tr('上一步', 'Back')}
            </Button>

            <div className="flex items-center gap-2">
              {currentStep < steps.length - 1 && (
                <Button variant="secondary" onClick={() => navigate('/dashboard')}>
                  {tr('跳过', 'Skip')}
                </Button>
              )}
              <Button variant="primary" onClick={handleNext}>
                {currentStep === steps.length - 1 ? tr('开始使用', 'Get started') : tr('下一步', 'Next')}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
