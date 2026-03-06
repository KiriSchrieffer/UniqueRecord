import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { StatusBadge } from '../components/fluent/StatusBadge';
import {
  Copy,
  Download,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Folder,
} from 'lucide-react';
import {
  formatDateTime,
  getRuntimeSettings,
  getRuntimeStatus,
  getSessionHistory,
  openRecordingsDir,
  RuntimeSettingsResponse,
  RuntimeStatusResponse,
  SessionHistoryItem,
} from '../lib/api';
import { useI18n } from '../i18n';

interface DiagnosticCheck {
  name: string;
  status: 'success' | 'error' | 'idle';
  message: string;
  detail?: string;
}

interface RecentErrorItem {
  code: string;
  time: string;
  message: string;
  solution: string;
}

interface LogEntry {
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

function mapLogLevel(event: Record<string, unknown>): 'info' | 'warning' | 'error' {
  const type = String(event.type || '');
  const reason = String(event.reason_code || '').toLowerCase();
  if (type === 'diagnostic') {
    return 'warning';
  }
  if (reason.includes('abnormal') || reason.includes('process_exit')) {
    return 'error';
  }
  return 'info';
}

export default function Diagnostics() {
  const { tr } = useI18n();
  const [runtimeStatus, setRuntimeStatus] = useState<RuntimeStatusResponse | null>(null);
  const [runtimeSettings, setRuntimeSettings] = useState<RuntimeSettingsResponse | null>(null);
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [isRunningCheck, setIsRunningCheck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mapLogMessage = useCallback(
    (event: Record<string, unknown>): string => {
      const type = String(event.type || 'unknown');
      const action = String(event.action || 'none');
      const reason = String(event.reason_code || '');
      const fromState = String(event.from_state || '');
      const toState = String(event.to_state || '');
      const details = event.details as Record<string, unknown> | undefined;
      const sessionId = typeof details?.session_id === 'string' ? details.session_id : '';

      if (type === 'state_changed') {
        return tr('状态变化', 'State changed') + `: ${fromState || '--'} -> ${toState || '--'}${sessionId ? ` (session: ${sessionId})` : ''}`;
      }
      if (type === 'recording_action' && action === 'start_recording') {
        return tr('开始录制', 'Start recording') + `${sessionId ? ` (session: ${sessionId})` : ''}`;
      }
      if (type === 'recording_action' && action === 'stop_recording') {
        return tr('停止录制', 'Stop recording') + `${reason ? ` (${reason})` : ''}${sessionId ? ` (session: ${sessionId})` : ''}`;
      }
      if (type === 'diagnostic') {
        return tr('诊断事件', 'Diagnostic event') + `${reason ? `: ${reason}` : ''}`;
      }
      return `${type}${action !== 'none' ? ` / ${action}` : ''}${reason ? ` (${reason})` : ''}`;
    },
    [tr]
  );

  const toLogEntries = useCallback(
    (status: RuntimeStatusResponse | null): LogEntry[] => {
      if (!status || !Array.isArray(status.recent_events)) {
        return [];
      }
      return status.recent_events
        .slice()
        .reverse()
        .slice(0, 120)
        .map((event) => {
          const tsValue = typeof event.ts === 'number' ? event.ts : null;
          const displayTime = formatDateTime(tsValue);
          const timeOnly = displayTime === '--' ? '--:--:--' : displayTime.split(' ')[1] || displayTime;
          return {
            timestamp: timeOnly,
            level: mapLogLevel(event),
            message: mapLogMessage(event),
          };
        });
    },
    [mapLogMessage]
  );

  const toRecentErrors = useCallback(
    (items: SessionHistoryItem[]): RecentErrorItem[] => {
      return items
        .filter((item) => item.status !== 'completed')
        .slice(0, 20)
        .map((item) => {
          const code = (item.stop_reason_code || item.status || 'unknown').toUpperCase();
          return {
            code,
            time: formatDateTime(item.end_ts_unix_ms || item.start_ts_unix_ms),
            message: tr('会话 {id} 未正常完成', 'Session {id} did not finish normally').replace('{id}', item.session_id),
            solution:
              item.stop_reason_code === 'process_exit_stop'
                ? tr('检测到游戏进程退出，可检查游戏/驱动稳定性。', 'Game process exited; check game and driver stability.')
                : tr('查看实时日志并重试录制，必要时重新启动后台服务。', 'Check runtime logs and retry recording. Restart service if needed.'),
          };
        });
    },
    [tr]
  );

  const refreshDiagnostics = useCallback(async () => {
    setIsRunningCheck(true);
    try {
      const [statusPayload, settingsPayload, historyPayload] = await Promise.all([
        getRuntimeStatus(),
        getRuntimeSettings(),
        getSessionHistory(200),
      ]);
      setRuntimeStatus(statusPayload);
      setRuntimeSettings(settingsPayload);
      setHistory(historyPayload);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('读取诊断信息失败', 'Failed to load diagnostics'));
    } finally {
      setIsRunningCheck(false);
    }
  }, [tr]);

  useEffect(() => {
    void refreshDiagnostics();
    const timer = window.setInterval(() => {
      void refreshDiagnostics();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [refreshDiagnostics]);

  const systemChecks = useMemo<DiagnosticCheck[]>(() => {
    const settings = runtimeSettings;
    const status = runtimeStatus;
    const recordingsDir =
      settings?.global.recordings_output_dir_resolved || settings?.global.recordings_output_dir || null;

    return [
      {
        name: tr('后台服务状态', 'Background service'),
        status: status?.service_running ? 'success' : 'error',
        message: status?.service_running ? tr('运行中', 'Running') : tr('未启动', 'Stopped'),
        detail: status?.service_running ? `UI status: ${status.ui_status}` : tr('请先启动 Runtime 服务。', 'Please start runtime service first.'),
      },
      {
        name: tr('游戏检测引擎', 'Game detection engine'),
        status: !status ? 'idle' : status.detector_state === 'idle' ? 'idle' : 'success',
        message: status ? status.detector_state : tr('未知', 'Unknown'),
        detail: status
          ? tr('当前会话: {id}', 'Current session: {id}').replace('{id}', status.session_id || '--')
          : '--',
      },
      {
        name: tr('录制后端', 'Recorder backend'),
        status: status?.recorder_backend?.includes('process') ? 'success' : 'error',
        message: status?.recorder_backend || 'unknown',
        detail: status?.native_host_path || tr('未发现可用 native host', 'Native host unavailable'),
      },
      {
        name: tr('录制目录', 'Recordings directory'),
        status: recordingsDir ? 'success' : 'error',
        message: recordingsDir ? tr('已配置', 'Configured') : tr('未配置', 'Not configured'),
        detail: recordingsDir || '--',
      },
      {
        name: tr('索引文件', 'Session index'),
        status: status?.session_index_path ? 'success' : 'error',
        message: status?.session_index_path ? tr('可用', 'Available') : tr('不可用', 'Unavailable'),
        detail: status?.session_index_path || '--',
      },
    ];
  }, [runtimeSettings, runtimeStatus, tr]);

  const recentErrors = useMemo(() => toRecentErrors(history), [history, toRecentErrors]);
  const logs = useMemo(() => toLogEntries(runtimeStatus), [runtimeStatus, toLogEntries]);

  const exportDiagnostics = () => {
    const payload = {
      generated_at: new Date().toISOString(),
      status: runtimeStatus,
      settings: runtimeSettings,
      checks: systemChecks,
      recent_errors: recentErrors,
      logs,
      history_preview: history.slice(0, 50),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unique-record-diagnostics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copyLogs = async () => {
    if (logs.length <= 0) {
      return;
    }
    const content = logs.map((entry) => `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}`).join('\n');
    try {
      await navigator.clipboard.writeText(content);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('复制日志失败', 'Failed to copy logs'));
    }
  };

  const openLogsDirectory = async () => {
    try {
      const preferredPath =
        runtimeSettings?.global.recordings_output_dir_resolved || runtimeSettings?.global.recordings_output_dir || undefined;
      await openRecordingsDir(preferredPath);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('打开目录失败', 'Failed to open directory'));
    }
  };

  const runtimeSystem = typeof navigator !== 'undefined' ? navigator.platform : 'Unknown';

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('诊断中心', 'Diagnostics')}</h1>
            <p className="text-[14px] text-[var(--muted-foreground)]">{tr('实时检查系统状态、错误记录与运行日志', 'Check system health, errors and runtime logs in real time')}</p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => void refreshDiagnostics()} disabled={isRunningCheck}>
              <RefreshCw size={18} className={isRunningCheck ? 'animate-spin' : ''} />
              {isRunningCheck ? tr('检测中...', 'Checking...') : tr('运行诊断', 'Run diagnostics')}
            </Button>
            <Button variant="primary" onClick={exportDiagnostics} disabled={isRunningCheck}>
              <Download size={18} />
              {tr('导出诊断报告', 'Export diagnostics')}
            </Button>
          </div>
        </div>

        {error && (
          <Card padding="md" className="mb-4 border border-[var(--status-error)]/30">
            <p className="text-[13px] text-[var(--status-error)]">{error}</p>
          </Card>
        )}

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('系统健康状态', 'System health checks')} subtitle={tr('关键组件运行状态检查', 'Status checks of core components')} />

          <div className="grid grid-cols-2 gap-3">
            {systemChecks.map((check) => (
              <div key={check.name} className="flex items-start gap-3 p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
                <div className="mt-0.5">
                  {check.status === 'success' ? (
                    <CheckCircle size={20} className="text-[var(--status-success)]" />
                  ) : check.status === 'error' ? (
                    <XCircle size={20} className="text-[var(--status-error)]" />
                  ) : (
                    <AlertTriangle size={20} className="text-[var(--status-idle)]" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[14px] font-medium">{check.name}</p>
                    <StatusBadge
                      status={check.status === 'success' ? 'success' : check.status === 'error' ? 'error' : 'idle'}
                      text={check.message}
                      size="sm"
                      showDot={false}
                    />
                  </div>
                  {check.detail && <p className="text-[12px] text-[var(--muted-foreground)] break-all">{check.detail}</p>}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="mb-6">
          <CardHeader title={tr('最近错误', 'Recent errors')} subtitle={tr('最近的异常会话与错误信息', 'Latest abnormal sessions and error details')} />

          {recentErrors.length === 0 ? (
            <div className="text-center py-8 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
              <CheckCircle size={32} className="text-[var(--status-success)] mx-auto mb-2" />
              <p className="text-[14px] text-[var(--muted-foreground)]">{tr('暂无错误记录，系统运行正常', 'No recent errors. System is healthy.')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentErrors.map((entry) => (
                <div
                  key={`${entry.code}-${entry.time}-${entry.message}`}
                  className="p-4 bg-[var(--neutral-10)] rounded-[var(--radius-lg)] border-l-4 border-[var(--status-error)]"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-[var(--status-error)]/10 text-[var(--status-error)] text-[11px] font-mono rounded-[var(--radius-sm)]">
                        {entry.code}
                      </span>
                      <span className="text-[12px] text-[var(--muted-foreground)]">{entry.time}</span>
                    </div>
                  </div>
                  <p className="text-[14px] font-medium mb-1">{entry.message}</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">{tr('建议处理', 'Suggestion')}：{entry.solution}</p>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card padding="lg">
          <CardHeader
            title={tr('实时日志', 'Realtime logs')}
            subtitle={tr('运行时事件日志（实时刷新）', 'Runtime event logs (auto-refresh)')}
            action={
              <Button variant="subtle" size="sm" onClick={() => void copyLogs()} disabled={logs.length <= 0}>
                <Copy size={16} />
                {tr('复制日志', 'Copy logs')}
              </Button>
            }
          />

          <div className="bg-[var(--neutral-100)] rounded-[var(--radius-lg)] p-4 font-mono text-[12px] max-h-96 overflow-auto">
            {logs.length <= 0 ? (
              <div className="text-[#a0a0a0]">{tr('暂无日志数据', 'No logs yet')}</div>
            ) : (
              logs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`flex items-start gap-3 py-1 ${
                    log.level === 'error'
                      ? 'text-[#ff6b6b]'
                      : log.level === 'warning'
                        ? 'text-[#ffd93d]'
                        : 'text-[#a0a0a0]'
                  }`}
                >
                  <span className="text-[#666666]">[{log.timestamp}]</span>
                  <span className="uppercase w-16">[{log.level}]</span>
                  <span className="flex-1">{log.message}</span>
                </div>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 mt-4">
            <Button variant="secondary" size="sm" onClick={() => void openLogsDirectory()}>
              <Folder size={16} />
              {tr('打开录制目录', 'Open recordings folder')}
            </Button>
            <Button variant="subtle" size="sm" onClick={() => void refreshDiagnostics()} disabled={isRunningCheck}>
              <RefreshCw size={16} />
              {tr('刷新', 'Refresh')}
            </Button>
          </div>
        </Card>

        <Card padding="md" className="mt-6 bg-[var(--neutral-10)]">
          <div className="grid grid-cols-3 gap-4 text-[13px]">
            <div>
              <p className="text-[var(--muted-foreground)] mb-1">{tr('应用版本', 'App version')}</p>
              <p className="font-medium">UniqueRecord v1.0.0</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1">{tr('录制引擎', 'Recorder engine')}</p>
              <p className="font-medium">{runtimeStatus?.recorder_backend || 'unknown'}</p>
            </div>
            <div>
              <p className="text-[var(--muted-foreground)] mb-1">{tr('系统', 'System')}</p>
              <p className="font-medium">{runtimeSystem}</p>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
