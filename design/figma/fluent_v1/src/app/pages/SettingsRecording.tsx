import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { TextField } from '../components/fluent/TextField';
import { Dropdown } from '../components/fluent/Dropdown';
import { Switch } from '../components/fluent/Switch';
import {
  getAudioDevices,
  getRuntimeSettings,
  saveRecordingSettings,
  selectDirectory,
  type AudioDeviceItem,
  type RuntimeSettingsResponse,
} from '../lib/api';
import { Folder, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { AppLanguage, normalizeAppLanguage, useI18n } from '../i18n';

type RecordingSettingsState = {
  savePath: string;
  uiLanguage: AppLanguage;
  resolution: string;
  fps: string;
  bitrate: string;
  container: string;
  encoder: string;
  audioCodec: string;
  audioBitrate: string;
  hardwareAccel: boolean;
  audioInputDevice: string;
  audioInputEnabled: boolean;
  audioOutputEnabled: boolean;
  autoSplit: boolean;
  splitSize: string;
};

const DEFAULT_MICROPHONE_ID = '__default__';

const DEFAULT_SETTINGS: RecordingSettingsState = {
  savePath: '',
  uiLanguage: 'zh-CN',
  resolution: '1920x1080',
  fps: '60',
  bitrate: '8000',
  container: 'mp4',
  encoder: 'auto',
  audioCodec: 'aac',
  audioBitrate: '192',
  hardwareAccel: true,
  audioInputDevice: DEFAULT_MICROPHONE_ID,
  audioInputEnabled: true,
  audioOutputEnabled: true,
  autoSplit: false,
  splitSize: '5000',
};

function toSettingsState(runtimeSettings: RuntimeSettingsResponse): RecordingSettingsState {
  const profile = runtimeSettings.recording_profile || {};
  const resolvedPath =
    runtimeSettings.global.recordings_output_dir_resolved ||
    runtimeSettings.global.recordings_output_dir ||
    DEFAULT_SETTINGS.savePath;
  const encoder =
    typeof profile.encoder === 'string' && ['auto', 'x264', 'nvenc', 'qsv', 'amf'].includes(profile.encoder)
      ? profile.encoder
      : DEFAULT_SETTINGS.encoder;
  const hardwareAccel =
    typeof profile.hardware_encoding_enabled === 'boolean'
      ? profile.hardware_encoding_enabled
      : encoder !== 'x264';

  return {
    ...DEFAULT_SETTINGS,
    savePath: resolvedPath,
    uiLanguage: normalizeAppLanguage(runtimeSettings.ui?.language),
    resolution:
      typeof profile.resolution === 'string' && profile.resolution
        ? profile.resolution
        : DEFAULT_SETTINGS.resolution,
    fps: typeof profile.fps === 'number' && profile.fps > 0 ? String(profile.fps) : DEFAULT_SETTINGS.fps,
    bitrate:
      typeof profile.video_bitrate_kbps === 'number' && profile.video_bitrate_kbps > 0
        ? String(profile.video_bitrate_kbps)
        : DEFAULT_SETTINGS.bitrate,
    container: profile.container === 'avi' ? 'avi' : 'mp4',
    encoder,
    audioCodec: profile.audio_codec === 'aac' ? 'aac' : DEFAULT_SETTINGS.audioCodec,
    audioBitrate:
      typeof profile.audio_bitrate_kbps === 'number' && profile.audio_bitrate_kbps > 0
        ? String(profile.audio_bitrate_kbps)
        : DEFAULT_SETTINGS.audioBitrate,
    hardwareAccel,
    audioInputDevice:
      typeof profile.audio_input_device === 'string' && profile.audio_input_device.trim()
        ? profile.audio_input_device
        : DEFAULT_SETTINGS.audioInputDevice,
    audioInputEnabled:
      typeof profile.audio_input_enabled === 'boolean'
        ? profile.audio_input_enabled
        : DEFAULT_SETTINGS.audioInputEnabled,
    audioOutputEnabled:
      typeof profile.audio_output_enabled === 'boolean'
        ? profile.audio_output_enabled
        : DEFAULT_SETTINGS.audioOutputEnabled,
  };
}

export default function SettingsRecording() {
  const { tr, setLanguage } = useI18n();
  const hasUserChangedLanguageRef = useRef(false);
  const [settings, setSettings] = useState<RecordingSettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<RecordingSettingsState>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [isPickingDirectory, setIsPickingDirectory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioDeviceError, setAudioDeviceError] = useState<string | null>(null);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioDeviceItem[]>([]);
  const [audioDevicesSupported, setAudioDevicesSupported] = useState(false);

  const resolutionOptions = [
    { value: '1920x1080', label: '1920 x 1080 (1080p)', recommended: true },
    { value: '2560x1440', label: '2560 x 1440 (2K)' },
    { value: '1280x720', label: '1280 x 720 (720p)' },
    { value: '3840x2160', label: '3840 x 2160 (4K)' },
  ];

  const fpsOptions = [
    { value: '60', label: '60 FPS', recommended: true },
    { value: '30', label: '30 FPS' },
    { value: '120', label: '120 FPS' },
  ];

  const bitrateOptions = [
    { value: '8000', label: '8000 Kbps', recommended: true },
    { value: '6000', label: '6000 Kbps' },
    { value: '10000', label: '10000 Kbps' },
    { value: '12000', label: '12000 Kbps' },
  ];

  const containerOptions = [
    { value: 'mp4', label: 'MP4 (H.264 + AAC)', recommended: true },
    { value: 'avi', label: 'AVI (compatibility mode)' },
  ];

  const encoderOptions = [
    { value: 'auto', label: tr('自动', 'Auto'), recommended: true },
    { value: 'x264', label: 'x264 (CPU)' },
    { value: 'nvenc', label: 'NVENC (NVIDIA GPU)' },
    { value: 'qsv', label: 'QuickSync (Intel GPU)' },
    { value: 'amf', label: 'AMF (AMD GPU)' },
  ];

  const audioCodecOptions = [{ value: 'aac', label: 'AAC', recommended: true }];

  const audioBitrateOptions = [
    { value: '192', label: '192 Kbps', recommended: true },
    { value: '160', label: '160 Kbps' },
    { value: '128', label: '128 Kbps' },
    { value: '96', label: '96 Kbps' },
  ];

  const languageOptions = [
    { value: 'zh-CN', label: '中文', recommended: true },
    { value: 'en-US', label: 'English' },
  ];

  const microphoneOptions = useMemo(() => {
    const options = [
      {
        value: DEFAULT_MICROPHONE_ID,
        label: tr('系统默认麦克风', 'Default microphone (system default)'),
        recommended: true,
      },
    ];
    const seen = new Set<string>([DEFAULT_MICROPHONE_ID]);
    for (const device of audioInputDevices) {
      if (seen.has(device.id)) {
        continue;
      }
      seen.add(device.id);
      options.push({ value: device.id, label: device.label });
    }
    if (settings.audioInputDevice && !seen.has(settings.audioInputDevice)) {
      options.push({
        value: settings.audioInputDevice,
        label: `${settings.audioInputDevice} (${tr('不可用', 'Unavailable')})`,
      });
    }
    return options;
  }, [audioInputDevices, settings.audioInputDevice, tr]);

  const updateSetting = (key: keyof RecordingSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateLanguage = (value: string) => {
    const normalized = normalizeAppLanguage(value);
    hasUserChangedLanguageRef.current = true;
    updateSetting('uiLanguage', normalized);
    setLanguage(normalized);
  };

  const handleSave = async () => {
    if (isSaving) {
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      const payload = {
        savePath: settings.savePath.trim(),
        uiLanguage: settings.uiLanguage,
        resolution: settings.resolution,
        fps: Number.parseInt(settings.fps, 10),
        videoBitrateKbps: Number.parseInt(settings.bitrate, 10),
        audioBitrateKbps: Number.parseInt(settings.audioBitrate, 10),
        container: settings.container,
        encoder: settings.encoder,
        audioCodec: settings.audioCodec,
        hardwareEncodingEnabled: settings.hardwareAccel,
        audioInputDevice: settings.audioInputDevice,
        audioInputEnabled: settings.audioInputEnabled,
        audioOutputEnabled: settings.audioOutputEnabled,
      };
      const response = await saveRecordingSettings(payload);
      const normalized = toSettingsState(response.settings);
      setSettings((prev) => ({ ...prev, ...normalized }));
      setSavedSettings((prev) => ({ ...prev, ...normalized }));
      setLanguage(normalized.uiLanguage);
      hasUserChangedLanguageRef.current = false;
      setHasChanges(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('保存录制设置失败。', 'Failed to save recording settings.'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSettings);
    setLanguage(savedSettings.uiLanguage);
    hasUserChangedLanguageRef.current = false;
    setHasChanges(false);
    setError(null);
  };

  useEffect(() => {
    const loadRuntimeSettings = async () => {
      setIsLoading(true);
      try {
        const [runtimeSettings, audioDevices] = await Promise.all([getRuntimeSettings(), getAudioDevices()]);
        const loadedSettings = toSettingsState(runtimeSettings);
        const shouldKeepUserLanguage = hasUserChangedLanguageRef.current;
        setSettings((prev) => ({
          ...prev,
          ...loadedSettings,
          uiLanguage: shouldKeepUserLanguage ? prev.uiLanguage : loadedSettings.uiLanguage,
        }));
        setSavedSettings((prev) => ({ ...prev, ...loadedSettings }));
        if (!shouldKeepUserLanguage) {
          setLanguage(loadedSettings.uiLanguage);
          setHasChanges(false);
        }

        setAudioDevicesSupported(Boolean(audioDevices.supported));
        setAudioInputDevices(audioDevices.input_devices || []);
        setAudioDeviceError(audioDevices.error || null);
      } catch {
        // Keep defaults if backend settings are temporarily unavailable.
      } finally {
        setIsLoading(false);
      }
    };
    void loadRuntimeSettings();
  }, [setLanguage]);

  const handlePickSavePath = async () => {
    setIsPickingDirectory(true);
    try {
      const selectedPath = await selectDirectory(settings.savePath || undefined);
      if (!selectedPath) {
        return;
      }
      setSettings((prev) => ({ ...prev, savePath: selectedPath }));
      setHasChanges(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('选择录制目录失败。', 'Failed to select recording directory.'));
    } finally {
      setIsPickingDirectory(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('录制设置', 'Recording Settings')}</h1>
            <p className="text-[14px] text-[var(--muted-foreground)]">
              {tr('配置画质、编码器偏好、音频来源和输出路径。', 'Configure quality, encoder preferences, audio sources, and output destination.')}
            </p>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="subtle" onClick={handleReset} disabled={isSaving || isLoading || isPickingDirectory}>
                <RotateCcw size={18} />
                {tr('重置', 'Reset')}
              </Button>
              <Button variant="primary" onClick={() => void handleSave()} disabled={isSaving || isLoading || isPickingDirectory}>
                <Save size={18} />
                {isSaving ? tr('保存中...', 'Saving...') : tr('保存', 'Save')}
              </Button>
            </div>
          )}
        </div>

        {error && (
          <Card padding="md" className="mb-4 border border-[var(--status-error)]/30">
            <p className="text-[13px] text-[var(--status-error)]">{error}</p>
          </Card>
        )}

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('语言设置', 'Language')} subtitle={tr('选择程序界面语言', 'Select application UI language')} />

          <Dropdown
            label={tr('界面语言', 'UI Language')}
            options={languageOptions}
            value={settings.uiLanguage}
            onChange={updateLanguage}
          />
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('存储', 'Storage')} subtitle={tr('选择录像文件保存位置', 'Choose where recording files are saved')} />

          <div className="space-y-4">
            <TextField
              label={tr('保存目录', 'Save Directory')}
              value={settings.savePath}
              onChange={(e) => updateSetting('savePath', e.target.value)}
              icon={<Folder size={16} />}
              onIconClick={() => void handlePickSavePath()}
              iconButtonLabel={tr('选择录制目录', 'Choose recording directory')}
              disabled={isPickingDirectory || isSaving}
              helperText={tr('点击文件夹图标可打开 Windows 目录选择器。', 'Click the folder icon to open Windows directory picker.')}
            />

            <div className="bg-[var(--fluent-blue-lighter)] border border-[var(--fluent-blue-light)] p-4 rounded-[var(--radius-lg)] flex items-start gap-3">
              <AlertCircle size={18} className="text-[var(--fluent-blue)] mt-0.5" />
              <div className="text-[13px]">
                <p className="font-medium text-[var(--fluent-blue)] mb-1">{tr('兼容性说明', 'Compatibility note')}</p>
                <p className="text-[var(--foreground)]">{tr('原生模式支持 MP4 (H.264 + AAC)，并提供 AVI 兼容回退。', 'Native mode supports MP4 (H.264 + AAC) and AVI fallback.')}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('视频质量', 'Video Quality')} subtitle={tr('分辨率、帧率与码率', 'Resolution, framerate, and bitrate')} />

          <div className="grid grid-cols-2 gap-4">
            <Dropdown
              label={tr('分辨率', 'Resolution')}
              options={resolutionOptions}
              value={settings.resolution}
              onChange={(value) => updateSetting('resolution', value)}
            />

            <Dropdown
              label={tr('帧率', 'FPS')}
              options={fpsOptions}
              value={settings.fps}
              onChange={(value) => updateSetting('fps', value)}
            />

            <Dropdown
              label={tr('视频码率', 'Video Bitrate')}
              options={bitrateOptions}
              value={settings.bitrate}
              onChange={(value) => updateSetting('bitrate', value)}
            />

            <Dropdown
              label={tr('封装格式', 'Container')}
              options={containerOptions}
              value={settings.container}
              onChange={(value) => updateSetting('container', value)}
            />
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('编码器', 'Encoder')} subtitle={tr('视频编码偏好与硬件模式', 'Video encoder preference and hardware mode')} />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Dropdown
              label={tr('视频编码器', 'Video Encoder')}
              options={encoderOptions}
              value={settings.encoder}
              onChange={(value) => updateSetting('encoder', value)}
            />

            <div className="flex items-end">
              <Switch
                label={tr('启用硬件编码', 'Enable hardware encoding')}
                checked={settings.hardwareAccel}
                onChange={(checked) => updateSetting('hardwareAccel', checked)}
              />
            </div>
          </div>

          <div className="bg-[var(--neutral-10)] p-4 rounded-[var(--radius-lg)]">
            <p className="text-[13px] text-[var(--muted-foreground)]">
              {tr('硬件加速开关会在录制运行时应用到原生录制引擎。', 'Hardware acceleration switch is applied to native recorder at runtime.')}
            </p>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('音频设置', 'Audio')} subtitle={tr('编码格式、码率与输入源', 'Codec, bitrate, and input source')} />

          <div className="grid grid-cols-2 gap-4 mb-4">
            <Dropdown
              label={tr('音频编码', 'Audio Codec')}
              options={audioCodecOptions}
              value={settings.audioCodec}
              onChange={(value) => updateSetting('audioCodec', value)}
            />

            <Dropdown
              label={tr('音频码率', 'Audio Bitrate')}
              options={audioBitrateOptions}
              value={settings.audioBitrate}
              onChange={(value) => updateSetting('audioBitrate', value)}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <Dropdown
              label={tr('麦克风输入设备', 'Microphone Input Device')}
              options={microphoneOptions}
              value={settings.audioInputDevice}
              onChange={(value) => updateSetting('audioInputDevice', value)}
              disabled={!audioDevicesSupported || !settings.audioInputEnabled}
            />

            {audioDeviceError && (
              <p className="text-[12px] text-[var(--status-error)]">
                {tr('音频设备查询失败', 'Audio device query failed')}: {audioDeviceError}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <Switch
                label={tr('录制系统音频', 'Capture system audio')}
                checked={settings.audioOutputEnabled}
                onChange={(checked) => updateSetting('audioOutputEnabled', checked)}
              />
            </div>

            <div className="p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <Switch
                label={tr('录制麦克风音频', 'Capture microphone audio')}
                checked={settings.audioInputEnabled}
                onChange={(checked) => updateSetting('audioInputEnabled', checked)}
                disabled={!audioDevicesSupported}
              />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title={tr('高级设置', 'Advanced')} subtitle={tr('预留选项（当前仅 UI）', 'Reserved options (UI only)')} />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <div className="flex-1">
                <p className="text-[14px] font-medium mb-1">{tr('自动分割录制文件', 'Auto split recording files')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  {tr('该项当前仅为界面态，不会下发到录制后端。', 'This option is currently UI-only and is not sent to recorder backend.')}
                </p>
              </div>
              <Switch checked={settings.autoSplit} onChange={(checked) => updateSetting('autoSplit', checked)} />
            </div>

            {settings.autoSplit && (
              <TextField
                label={tr('分割大小 (MB)', 'Split Size (MB)')}
                type="number"
                value={settings.splitSize}
                onChange={(e) => updateSetting('splitSize', e.target.value)}
              />
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

