import React, { useEffect, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { TextField } from '../components/fluent/TextField';
import { Switch } from '../components/fluent/Switch';
import { StatusBadge } from '../components/fluent/StatusBadge';
import {
  AlertCircle,
  CheckCircle,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  PlayCircle,
  StopCircle,
} from 'lucide-react';
import {
  RuntimeSettingsResponse,
  RuntimeStatusResponse,
  getRuntimeSettings,
  getRuntimeStatus,
  saveDetectionSettings,
  startService,
  stopService,
} from '../lib/api';
import { useI18n } from '../i18n';

type DetectionSettingsState = {
  autoDetect: boolean;
  detectionInterval: string;
  controlHost: string;
  controlPort: string;
  controlToken: string;
  hostAutoStart: boolean;
  hostKeepAlive: boolean;
  keepAliveInterval: string;
};

const DEFAULT_SETTINGS: DetectionSettingsState = {
  autoDetect: true,
  detectionInterval: '1',
  controlHost: '127.0.0.1',
  controlPort: '8765',
  controlToken: '',
  hostAutoStart: true,
  hostKeepAlive: true,
  keepAliveInterval: '30',
};

function toDetectionSettings(runtimeSettings: RuntimeSettingsResponse): DetectionSettingsState {
  const detection = runtimeSettings.detection || ({} as RuntimeSettingsResponse['detection']);
  return {
    autoDetect:
      typeof detection.auto_detect_enabled === 'boolean'
        ? detection.auto_detect_enabled
        : DEFAULT_SETTINGS.autoDetect,
    detectionInterval:
      typeof detection.detection_interval_seconds === 'number'
        ? String(Math.max(1, detection.detection_interval_seconds))
        : DEFAULT_SETTINGS.detectionInterval,
    controlHost:
      typeof detection.control_host === 'string' && detection.control_host.trim()
        ? detection.control_host
        : DEFAULT_SETTINGS.controlHost,
    controlPort:
      typeof detection.control_port === 'number' ? String(detection.control_port) : DEFAULT_SETTINGS.controlPort,
    controlToken: typeof detection.control_token === 'string' ? detection.control_token : '',
    hostAutoStart:
      typeof detection.host_auto_start === 'boolean'
        ? detection.host_auto_start
        : DEFAULT_SETTINGS.hostAutoStart,
    hostKeepAlive:
      typeof detection.host_keep_alive === 'boolean'
        ? detection.host_keep_alive
        : DEFAULT_SETTINGS.hostKeepAlive,
    keepAliveInterval:
      typeof detection.host_keep_alive_interval_seconds === 'number'
        ? String(Math.max(5, detection.host_keep_alive_interval_seconds))
        : DEFAULT_SETTINGS.keepAliveInterval,
  };
}

export default function SettingsDetection() {
  const { tr } = useI18n();
  const [settings, setSettings] = useState<DetectionSettingsState>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<DetectionSettingsState>(DEFAULT_SETTINGS);
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const updateSetting = (key: keyof DetectionSettingsState, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const loadData = async () => {
    setActionLoading(true);
    try {
      const [status, runtimeSettings] = await Promise.all([getRuntimeStatus(), getRuntimeSettings()]);
      const loadedSettings = toDetectionSettings(runtimeSettings);
      setRuntimeStatus(status);
      setSettings(loadedSettings);
      setSavedSettings(loadedSettings);
      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('读取运行时配置失败', 'Failed to load runtime settings'));
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const runAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
      await loadData();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('操作失败', 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSave = async () => {
    if (actionLoading) {
      return;
    }

    const detectionInterval = Number.parseInt(settings.detectionInterval, 10);
    const controlPort = Number.parseInt(settings.controlPort, 10);
    const keepAliveInterval = Number.parseInt(settings.keepAliveInterval, 10);
    if (!Number.isFinite(detectionInterval) || detectionInterval < 1) {
      setError(tr('检测间隔必须是大于等于 1 的整数', 'Detection interval must be an integer >= 1'));
      return;
    }
    if (!Number.isFinite(controlPort) || controlPort < 1 || controlPort > 65535) {
      setError(tr('控制端口必须在 1 到 65535 之间', 'Control port must be between 1 and 65535'));
      return;
    }
    if (!Number.isFinite(keepAliveInterval) || keepAliveInterval < 5) {
      setError(tr('保活间隔必须是大于等于 5 的整数', 'Keep-alive interval must be an integer >= 5'));
      return;
    }

    setActionLoading(true);
    try {
      const response = await saveDetectionSettings({
        autoDetect: settings.autoDetect,
        detectionInterval,
        controlHost: settings.controlHost.trim(),
        controlPort,
        controlToken: settings.controlToken,
        hostAutoStart: settings.hostAutoStart,
        hostKeepAlive: settings.hostKeepAlive,
        keepAliveInterval,
      });
      const loaded = toDetectionSettings(response.settings);
      setSettings(loaded);
      setSavedSettings(loaded);
      setRuntimeStatus(response.status);
      setHasChanges(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('保存检测设置失败', 'Failed to save detection settings'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReset = () => {
    setSettings(savedSettings);
    setHasChanges(false);
    setError(null);
  };

  const serviceRunning = runtimeStatus?.service_running ?? false;
  const detectorState = runtimeStatus?.detector_state || 'idle';
  const lolDetected = detectorState !== 'idle';

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('检测与录制引擎设置', 'Detection & Recorder Settings')}</h1>
            <p className="text-[14px] text-[var(--muted-foreground)]">
              {tr('配置游戏检测和 Windows 原生录制引擎参数', 'Configure game detection and Windows native recorder settings')}
            </p>
          </div>

          {hasChanges && (
            <div className="flex items-center gap-2">
              <Button variant="subtle" onClick={handleReset} disabled={actionLoading}>
                <RotateCcw size={18} />
                {tr('重置', 'Reset')}
              </Button>
              <Button variant="primary" onClick={() => void handleSave()} disabled={actionLoading}>
                <Save size={18} />
                {tr('保存更改', 'Save changes')}
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
          <CardHeader
            title={tr('后台服务', 'Background Service')}
            subtitle={tr('UniqueRecord 运行时服务控制', 'UniqueRecord runtime service control')}
            action={
              <Button variant="secondary" size="sm" onClick={() => void loadData()} disabled={actionLoading}>
                <RefreshCw size={16} />
                {tr('刷新状态', 'Refresh status')}
              </Button>
            }
          />

          <div className="flex items-center justify-between p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
            <div className="flex items-center gap-3">
              <Server size={20} className="text-[var(--fluent-blue)]" />
              <div>
                <p className="text-[14px] font-medium">{tr('Runtime 服务', 'Runtime service')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">{serviceRunning ? tr('运行中', 'Running') : tr('未启动', 'Stopped')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {serviceRunning ? (
                <StatusBadge status="success" text={tr('已启动', 'Started')} />
              ) : (
                <StatusBadge status="idle" text={tr('未启动', 'Stopped')} />
              )}
              <Button
                variant={serviceRunning ? 'destructive' : 'primary'}
                size="sm"
                onClick={() => void runAction(() => (serviceRunning ? stopService() : startService()))}
                disabled={actionLoading}
              >
                {serviceRunning ? <StopCircle size={16} /> : <PlayCircle size={16} />}
                {serviceRunning ? tr('停止服务', 'Stop service') : tr('启动服务', 'Start service')}
              </Button>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('游戏检测状态', 'Game Detection Status')} subtitle={tr('英雄联盟客户端检测', 'League of Legends detection')} />

          <div className="space-y-4">
            <div className="bg-[var(--neutral-10)] p-4 rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {lolDetected ? (
                    <CheckCircle size={24} className="text-[var(--status-success)]" />
                  ) : (
                    <AlertCircle size={24} className="text-[var(--muted-foreground)]" />
                  )}
                  <div>
                    <p className="text-[14px] font-medium">{lolDetected ? tr('已检测到游戏/对局上下文', 'Game/session context detected') : tr('当前未检测到游戏上下文', 'No game context detected')}</p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">Detector state: {detectorState}</p>
                  </div>
                </div>
                {lolDetected ? (
                  <StatusBadge status="detecting" text={tr('检测中', 'Detecting')} />
                ) : (
                  <StatusBadge status="idle" text={tr('待机', 'Idle')} />
                )}
              </div>
            </div>
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('检测设置', 'Detection Settings')} subtitle={tr('配置英雄联盟检测行为', 'Configure League of Legends detection behavior')} />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <div className="flex-1">
                <p className="text-[14px] font-medium mb-1">{tr('自动检测游戏', 'Auto detect game')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">{tr('自动检测英雄联盟客户端和游戏进程', 'Automatically detect League of Legends client and game process')}</p>
              </div>
              <Switch checked={settings.autoDetect} onChange={(checked) => updateSetting('autoDetect', checked)} disabled={actionLoading} />
            </div>

            {settings.autoDetect && (
              <TextField
                label={tr('检测间隔 (秒)', 'Detection interval (seconds)')}
                type="number"
                value={settings.detectionInterval}
                onChange={(e) => updateSetting('detectionInterval', e.target.value)}
                helperText={tr('扫描游戏进程的时间间隔，建议 1-5 秒', 'Scan interval for game process, recommended 1-5 seconds')}
                disabled={actionLoading}
              />
            )}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('本地控制通道参数', 'Local Control Channel')} subtitle={tr('配置本地运行时服务地址', 'Configure local runtime service endpoint')} />

          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={tr('主机地址', 'Host')}
              value={settings.controlHost}
              onChange={(e) => updateSetting('controlHost', e.target.value)}
              helperText={tr('默认 127.0.0.1', 'Default 127.0.0.1')}
              disabled={actionLoading}
            />

            <TextField
              label={tr('端口', 'Port')}
              type="number"
              value={settings.controlPort}
              onChange={(e) => updateSetting('controlPort', e.target.value)}
              helperText={tr('默认端口 8765', 'Default port 8765')}
              disabled={actionLoading}
            />

            <div className="col-span-2">
              <TextField
                label={tr('访问令牌 (可选)', 'Access token (optional)')}
                type="password"
                value={settings.controlToken}
                onChange={(e) => updateSetting('controlToken', e.target.value)}
                helperText={tr('仅在启用鉴权时填写', 'Only required when authentication is enabled')}
                disabled={actionLoading}
              />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title={tr('录制引擎行为设置', 'Recorder Engine Behavior')} subtitle={tr('配置自动启动和保活机制', 'Configure auto start and keep-alive')} />

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <div className="flex-1">
                <p className="text-[14px] font-medium mb-1">{tr('自动启动录制引擎', 'Auto start recorder engine')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">{tr('启动 UniqueRecord 时自动初始化录制引擎', 'Initialize recorder engine automatically on app startup')}</p>
              </div>
              <Switch checked={settings.hostAutoStart} onChange={(checked) => updateSetting('hostAutoStart', checked)} disabled={actionLoading} />
            </div>

            <div className="flex items-center justify-between p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <div className="flex-1">
                <p className="text-[14px] font-medium mb-1">{tr('启用引擎保活机制', 'Enable engine keep-alive')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">{tr('定期检测录制引擎状态，异常时自动恢复', 'Periodically check recorder status and recover automatically')}</p>
              </div>
              <Switch checked={settings.hostKeepAlive} onChange={(checked) => updateSetting('hostKeepAlive', checked)} disabled={actionLoading} />
            </div>

            {settings.hostKeepAlive && (
              <TextField
                label={tr('保活检测间隔 (秒)', 'Keep-alive interval (seconds)')}
                type="number"
                value={settings.keepAliveInterval}
                onChange={(e) => updateSetting('keepAliveInterval', e.target.value)}
                helperText={tr('检测录制引擎运行状态的时间间隔', 'Interval for checking recorder health')}
                disabled={actionLoading}
              />
            )}
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
