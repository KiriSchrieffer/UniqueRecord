import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { StatusBadge } from '../components/fluent/StatusBadge';
import {
  Calendar,
  Clock,
  Eye,
  FileVideo,
  Folder,
  HardDrive,
  PlayCircle,
  RefreshCw,
  Server,
  StopCircle,
} from 'lucide-react';
import {
  formatDateTime,
  formatDurationHms,
  formatFileSize,
  getRuntimeStatus,
  getRuntimeSettings,
  getSessionHistory,
  openPathInExplorer,
  openRecordingsDir,
  SessionHistoryItem,
  startRecordingManually,
  startService,
  stopRecordingManually,
  stopService,
  UiStatus,
} from '../lib/api';
import { useI18n } from '../i18n';

interface DashboardData {
  serviceRunning: boolean;
  uiStatus: UiStatus;
  recordingDurationSeconds: number | null;
  recordingsOutputDir: string | null;
}

function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { tr } = useI18n();
  const [data, setData] = useState<DashboardData>({
    serviceRunning: false,
    uiStatus: 'idle',
    recordingDurationSeconds: null,
    recordingsOutputDir: null,
  });
  const [sessions, setSessions] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [status, history, settings] = await Promise.all([
        getRuntimeStatus(),
        getSessionHistory(50),
        getRuntimeSettings(),
      ]);
      setData({
        serviceRunning: status.service_running,
        uiStatus: status.ui_status,
        recordingDurationSeconds: status.recording_duration_seconds,
        recordingsOutputDir:
          history[0]?.recordings_output_dir ||
          settings.global.recordings_output_dir_resolved ||
          settings.global.recordings_output_dir ||
          status.session_index_path?.replace(/[\\/]recording_index\.jsonl$/i, '') ||
          null,
      });
      setSessions(history);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('无法连接到本地后端服务', 'Unable to connect to local backend service.'));
    } finally {
      setLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => {
      void refresh();
    }, 1000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);

    const completed = sessions.filter((item) => item.status === 'completed');
    const todayCount = completed.filter((item) => {
      if (item.start_ts_unix_ms === null) {
        return false;
      }
      const d = new Date(item.start_ts_unix_ms);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      return key === todayKey;
    }).length;

    const weekCount = completed.filter((item) => {
      if (item.start_ts_unix_ms === null) {
        return false;
      }
      return item.start_ts_unix_ms >= weekStart.getTime();
    }).length;

    const totalDurationHours = sum(
      completed
        .filter((item) => typeof item.duration_ms === 'number')
        .map((item) => (item.duration_ms as number) / (1000 * 60 * 60))
    );

    const totalSizeBytes = sum(
      completed
        .filter((item) => typeof item.file_size_bytes === 'number')
        .map((item) => item.file_size_bytes as number)
    );

    return [
      { label: tr('今日录制', 'Today'), value: String(todayCount), unit: tr('局', 'sessions'), icon: <FileVideo size={20} /> },
      { label: tr('本周录制', 'This week'), value: String(weekCount), unit: tr('局', 'sessions'), icon: <Calendar size={20} /> },
      {
        label: tr('总时长', 'Total duration'),
        value: totalDurationHours.toFixed(1),
        unit: tr('小时', 'hours'),
        icon: <Clock size={20} />,
      },
      {
        label: tr('磁盘占用', 'Disk usage'),
        value: formatFileSize(totalSizeBytes),
        unit: '',
        icon: <HardDrive size={20} />,
      },
    ];
  }, [sessions, tr]);

  const currentStatusText = useMemo(() => {
    if (!data.serviceRunning) {
      return {
        badge: <StatusBadge status="idle" text={tr('服务未启动', 'Service stopped')} />,
        title: tr('UniqueRecord 后台服务未运行', 'UniqueRecord background service is not running'),
        description: tr('请先启动后台服务，再进行自动检测或手动录制。', 'Start the background service before detection or recording.'),
      };
    }
    if (data.uiStatus === 'recording') {
      return {
        badge: <StatusBadge status="recording" text={tr('录制中', 'Recording')} />,
        title: tr('正在录制当前对局', 'Recording current match'),
        description: tr('游戏结束后将自动停止并保存到录制目录。', 'Recording will stop automatically when match ends.'),
      };
    }
    if (data.uiStatus === 'detecting') {
      return {
        badge: <StatusBadge status="detecting" text={tr('检测中', 'Detecting')} />,
        title: tr('已检测到游戏运行，等待对局阶段', 'Game detected, waiting for in-match state'),
        description: tr('进入对局后将自动开始录制。', 'Recording starts automatically when match begins.'),
      };
    }
    return {
      badge: <StatusBadge status="idle" text={tr('待机中', 'Idle')} />,
      title: tr('当前未检测到可录制对局', 'No recordable match detected'),
      description: tr('启动英雄联盟并进入对局后将自动录制。', 'Launch League of Legends and enter a match to auto-record.'),
    };
  }, [data.serviceRunning, data.uiStatus, tr]);

  const lastSession = sessions[0] || null;
  const resolvedRecordingsDir = lastSession?.recordings_output_dir || data.recordingsOutputDir || null;

  const runAction = async (action: () => Promise<unknown>) => {
    setActionLoading(true);
    try {
      await action();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('操作失败', 'Action failed'));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('控制台', 'Dashboard')}</h1>
          <p className="text-[14px] text-[var(--muted-foreground)]">{tr('当前状态监控与快速操作', 'Status monitoring and quick actions')}</p>
        </div>

        {error && (
          <Card padding="md" className="mb-4 border border-[var(--status-error)]/30">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[13px] text-[var(--status-error)]">{error}</p>
              <Button variant="subtle" size="sm" onClick={() => void refresh()}>
                <RefreshCw size={14} />
                {tr('重试', 'Retry')}
              </Button>
            </div>
          </Card>
        )}

        <Card padding="lg" shadow className="mb-6">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0">
              <div
                className={`
                  w-24 h-24 rounded-full flex items-center justify-center
                  ${
                    data.uiStatus === 'recording'
                      ? 'bg-[var(--status-recording)]/10'
                      : data.uiStatus === 'detecting'
                        ? 'bg-[var(--fluent-blue-lighter)]'
                        : 'bg-[var(--neutral-10)]'
                  }
                `}
              >
                {data.uiStatus === 'recording' ? (
                  <StopCircle size={40} className="text-[var(--status-recording)]" />
                ) : data.uiStatus === 'detecting' ? (
                  <Eye size={40} className="text-[var(--fluent-blue)]" />
                ) : (
                  <PlayCircle size={40} className="text-[var(--muted-foreground)]" />
                )}
              </div>
            </div>

            <div className="flex-1">
              <div className="mb-3">{currentStatusText.badge}</div>
              <h2 className="text-[var(--text-xl)] font-semibold mb-2">{currentStatusText.title}</h2>
              <p className="text-[14px] text-[var(--muted-foreground)] mb-4">{currentStatusText.description}</p>

              {data.uiStatus === 'recording' && (
                <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--border)]">
                  <div>
                    <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('录制时长', 'Recording duration')}</p>
                    <p className="text-[var(--text-xl)] font-semibold text-[var(--status-recording)]">
                      {formatDurationHms(data.recordingDurationSeconds)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 min-w-44">
              <Button
                variant={data.serviceRunning ? 'secondary' : 'primary'}
                onClick={() => void runAction(() => (data.serviceRunning ? stopService() : startService()))}
                disabled={actionLoading}
              >
                <Server size={16} />
                {data.serviceRunning ? tr('停止后台服务', 'Stop service') : tr('启动后台服务', 'Start service')}
              </Button>

              {data.uiStatus === 'recording' ? (
                <Button
                  variant="destructive"
                  onClick={() => void runAction(() => stopRecordingManually())}
                  disabled={actionLoading || !data.serviceRunning}
                >
                  <StopCircle size={18} />
                  {tr('手动停止录制', 'Stop recording')}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={() => void runAction(() => startRecordingManually())}
                  disabled={actionLoading || !data.serviceRunning}
                >
                  <PlayCircle size={18} />
                  {tr('手动开始录制', 'Start recording')}
                </Button>
              )}

              <Button variant="secondary" onClick={() => navigate('/mini-panel')}>
                {tr('迷你控制面板', 'Mini panel')}
              </Button>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-4 mb-6">
          {stats.map((stat, index) => (
            <Card key={index} padding="md" hover>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-[var(--fluent-blue-lighter)] rounded-[var(--radius-md)] flex items-center justify-center">
                  <div className="text-[var(--fluent-blue)]">{stat.icon}</div>
                </div>
              </div>
              <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{stat.label}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-[var(--text-2xl)] font-semibold">{stat.value}</span>
                {stat.unit && <span className="text-[14px] text-[var(--muted-foreground)]">{stat.unit}</span>}
              </div>
            </Card>
          ))}
        </div>

        <Card padding="lg">
          <CardHeader
            title={tr('最近一局', 'Most recent session')}
            action={
              <Button variant="subtle" size="sm" onClick={() => navigate('/history')}>
                {tr('查看全部', 'View all')}
              </Button>
            }
          />

          {loading ? (
            <div className="text-[13px] text-[var(--muted-foreground)]">{tr('加载中...', 'Loading...')}</div>
          ) : !lastSession ? (
            <div className="text-[13px] text-[var(--muted-foreground)]">{tr('暂无录制记录', 'No recordings yet')}</div>
          ) : (
            <div className="bg-[var(--neutral-10)] p-4 rounded-[var(--radius-lg)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <FileVideo size={24} className="text-[var(--fluent-blue)]" />
                  <div>
                    <p className="text-[14px] font-medium">{tr('英雄联盟对局', 'League of Legends session')}</p>
                    <p className="text-[12px] text-[var(--muted-foreground)]">{formatDateTime(lastSession.start_ts_unix_ms)}</p>
                  </div>
                </div>
                <StatusBadge
                  status={lastSession.status === 'completed' ? 'success' : 'error'}
                  text={lastSession.status === 'completed' ? tr('已保存', 'Saved') : tr('异常结束', 'Abnormal end')}
                  size="sm"
                />
              </div>

              <div className="flex items-center gap-6 text-[13px] text-[var(--muted-foreground)] mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock size={14} />
                  <span>
                    {tr('时长', 'Duration')}: {formatDurationHms(lastSession.duration_ms === null ? null : Math.floor(lastSession.duration_ms / 1000))}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <HardDrive size={14} />
                  <span>
                    {tr('大小', 'Size')}: {formatFileSize(lastSession.file_size_bytes)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!lastSession.output_path}
                  onClick={() =>
                    void runAction(() =>
                      openPathInExplorer(lastSession.output_path as string, {
                        revealInFolder: true,
                      })
                    )
                  }
                >
                  <Folder size={16} />
                  {tr('定位文件', 'Show file')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={!resolvedRecordingsDir}
                  onClick={() => void runAction(() => openRecordingsDir(resolvedRecordingsDir || undefined))}
                >
                  <Folder size={16} />
                  {tr('打开录制目录', 'Open recordings folder')}
                </Button>
              </div>
              <p className="mt-3 text-[12px] text-[var(--muted-foreground)] break-all">
                {tr('录制目录', 'Recordings folder')}：{resolvedRecordingsDir || '--'}
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
