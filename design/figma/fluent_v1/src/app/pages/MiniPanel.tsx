import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '../components/fluent/Button';
import { StatusBadge } from '../components/fluent/StatusBadge';
import { StopCircle, PlayCircle, Maximize2, X, GripVertical, Eye } from 'lucide-react';
import {
  formatDurationHms,
  formatFileSize,
  getRuntimeSettings,
  getRuntimeStatus,
  getSessionHistory,
  RuntimeSettingsResponse,
  RuntimeStatusResponse,
  SessionHistoryItem,
  startRecordingManually,
  stopRecordingManually,
} from '../lib/api';
import { UniqueRecordLogoSymbol } from '../components/branding/UniqueRecordLogo';
import { useI18n } from '../i18n';

type PanelStatus = 'idle' | 'detecting' | 'recording';

export default function MiniPanel() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsResponse | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await getRuntimeStatus();
      setRuntimeStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('读取状态失败', 'Failed to load status'));
    }
  }, [tr]);

  const refreshMeta = useCallback(async () => {
    try {
      const [settingsPayload, historyPayload] = await Promise.all([getRuntimeSettings(), getSessionHistory(100)]);
      setRuntimeSettings(settingsPayload);
      setHistory(historyPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('读取历史数据失败', 'Failed to load history data'));
    }
  }, [tr]);

  useEffect(() => {
    void refreshStatus();
    void refreshMeta();

    const statusTimer = window.setInterval(() => {
      void refreshStatus();
    }, 1000);
    const metaTimer = window.setInterval(() => {
      void refreshMeta();
    }, 8000);

    return () => {
      window.clearInterval(statusTimer);
      window.clearInterval(metaTimer);
    };
  }, [refreshMeta, refreshStatus]);

  const handleMaximize = () => {
    navigate('/dashboard');
  };

  const handleClose = () => {
    navigate('/dashboard');
  };

  const runAction = async (action: () => Promise<unknown>) => {
    setIsActionLoading(true);
    try {
      await action();
      await refreshStatus();
      await refreshMeta();
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('操作失败', 'Action failed'));
    } finally {
      setIsActionLoading(false);
    }
  };

  const status: PanelStatus = runtimeStatus?.ui_status || 'idle';
  const serviceRunning = runtimeStatus?.service_running || false;
  const recordingDuration = formatDurationHms(runtimeStatus?.recording_duration_seconds ?? null);

  const lastCompleted = useMemo(() => history.find((item) => item.status === 'completed') || null, [history]);
  const todayCount = useMemo(() => {
    const now = new Date();
    const key = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return history.filter((item) => {
      if (item.status !== 'completed' || item.start_ts_unix_ms === null) {
        return false;
      }
      const dt = new Date(item.start_ts_unix_ms);
      return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}` === key;
    }).length;
  }, [history]);

  const configuredFps =
    typeof runtimeSettings?.recording_profile.fps === 'number' ? `${runtimeSettings.recording_profile.fps} FPS` : '--';

  return (
    <div className="min-h-screen bg-black/50 backdrop-blur-sm flex items-start justify-center pt-20">
      <div
        className={`
          w-80 bg-[var(--card)]
          border-2 border-[var(--border)]
          rounded-[var(--radius-xl)]
          shadow-[var(--shadow-xl)]
          overflow-hidden
          ${isDragging ? 'cursor-grabbing' : ''}
        `}
        style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)' }}
      >
        <div
          className="bg-[var(--neutral-10)] px-4 py-2 flex items-center justify-between cursor-grab active:cursor-grabbing border-b border-[var(--border)]"
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
        >
          <div className="flex items-center gap-2">
            <UniqueRecordLogoSymbol size={16} />
            <GripVertical size={16} className="text-[var(--muted-foreground)]" />
            <span className="text-[12px] font-semibold text-[var(--foreground)]">UniqueRecord</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleMaximize} className="p-1.5 hover:bg-[var(--neutral-20)] rounded-[var(--radius-sm)] transition-colors">
              <Maximize2 size={14} className="text-[var(--muted-foreground)]" />
            </button>
            <button onClick={handleClose} className="p-1.5 hover:bg-[var(--status-error)]/10 rounded-[var(--radius-sm)] transition-colors">
              <X size={14} className="text-[var(--muted-foreground)] hover:text-[var(--status-error)]" />
            </button>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            {status === 'recording' ? (
              <StatusBadge status="recording" text={tr('录制中', 'Recording')} />
            ) : status === 'detecting' ? (
              <StatusBadge status="detecting" text={tr('检测中', 'Detecting')} />
            ) : (
              <StatusBadge status="idle" text={tr('待机中', 'Idle')} />
            )}
            {!serviceRunning && <StatusBadge status="error" text={tr('服务未启动', 'Service stopped')} size="sm" />}
          </div>

          {error && <p className="text-[12px] text-[var(--status-error)] mb-3">{error}</p>}

          {status === 'recording' && (
            <div className="space-y-4">
              <div className="bg-[var(--neutral-10)] rounded-[var(--radius-lg)] p-4 text-center">
                <p className="text-[11px] text-[var(--muted-foreground)] mb-1 uppercase tracking-wide">{tr('录制时长', 'Duration')}</p>
                <p className="text-[28px] font-semibold text-[var(--status-recording)] font-mono">{recordingDuration}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--neutral-10)] rounded-[var(--radius-md)] p-3">
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1 uppercase">{tr('最近文件大小', 'Last file size')}</p>
                  <p className="text-[14px] font-semibold">{formatFileSize(lastCompleted?.file_size_bytes || null)}</p>
                </div>
                <div className="bg-[var(--neutral-10)] rounded-[var(--radius-md)] p-3">
                  <p className="text-[10px] text-[var(--muted-foreground)] mb-1 uppercase">{tr('目标帧率', 'Target FPS')}</p>
                  <p className="text-[14px] font-semibold">{configuredFps}</p>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={() => void runAction(() => stopRecordingManually())}
                className="w-full"
                disabled={isActionLoading || !serviceRunning}
              >
                <StopCircle size={18} />
                {tr('停止录制', 'Stop recording')}
              </Button>
            </div>
          )}

          {status === 'detecting' && (
            <div className="space-y-4">
              <div className="bg-[var(--fluent-blue-lighter)] rounded-[var(--radius-lg)] p-4 text-center">
                <Eye size={32} className="text-[var(--fluent-blue)] mx-auto mb-2" />
                <p className="text-[13px] text-[var(--foreground)] mb-1">{tr('等待游戏进入对局', 'Waiting for match start')}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{tr('进入对局后会自动开始录制', 'Recording starts automatically when match begins')}</p>
              </div>

              <Button
                variant="primary"
                onClick={() => void runAction(() => startRecordingManually())}
                className="w-full"
                disabled={isActionLoading || !serviceRunning}
              >
                <PlayCircle size={18} />
                {tr('手动开始录制', 'Start recording')}
              </Button>
            </div>
          )}

          {status === 'idle' && (
            <div className="space-y-4">
              <div className="bg-[var(--neutral-10)] rounded-[var(--radius-lg)] p-4 text-center">
                <p className="text-[13px] text-[var(--muted-foreground)] mb-1">{tr('当前待机', 'Currently idle')}</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">{tr('启动游戏并进入对局后会自动检测', 'Launch game and enter match for auto detection')}</p>
              </div>

              <Button
                variant="primary"
                onClick={() => void runAction(() => startRecordingManually())}
                className="w-full"
                disabled={isActionLoading || !serviceRunning}
              >
                <PlayCircle size={18} />
                {tr('手动开始录制', 'Start recording')}
              </Button>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-[var(--border)]">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[var(--muted-foreground)]">{tr('今日录制', 'Today')}</span>
              <span className="font-semibold">{todayCount} {tr('局', 'sessions')}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--neutral-10)] px-4 py-2 border-t border-[var(--border)]">
          <p className="text-[10px] text-[var(--muted-foreground)] text-center">{tr('可拖动此窗口 · 双击可切回主界面', 'Draggable window · double-click to return to main UI')}</p>
        </div>
      </div>
    </div>
  );
}
