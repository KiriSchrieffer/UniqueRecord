import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card } from '../components/fluent/Card';
import { Button } from '../components/fluent/Button';
import { TextField } from '../components/fluent/TextField';
import { Table } from '../components/fluent/Table';
import { StatusBadge } from '../components/fluent/StatusBadge';
import { Dropdown } from '../components/fluent/Dropdown';
import { Modal } from '../components/fluent/Modal';
import { Switch } from '../components/fluent/Switch';
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Download,
  FileVideo,
  Filter,
  Folder,
  Maximize2,
  Minimize2,
  Pause,
  PlayCircle,
  RefreshCw,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  CheckSquare,
  ChevronDown,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  deleteHistoryItems,
  formatDateTime,
  formatDurationHms,
  formatFileSize,
  getSessionMediaUrl,
  getSessionHistory,
  openPathInExplorer,
  openRecordingsDir,
  SessionMatchParticipant,
  SessionHistoryItem,
} from '../lib/api';
import { useI18n } from '../i18n';

type RowStatus = 'success' | 'recording' | 'error';

interface RecordRow {
  id: string;
  startTime: string;
  endTime: string;
  startTimeMs: number | null;
  durationMs: number | null;
  durationSeconds: number | null;
  duration: string;
  status: RowStatus;
  statusText: string;
  gameMode: string;
  gameId: string;
  outputPath: string | null;
  recordingsDir: string | null;
  filePath: string;
  fileSize: string;
  fileSizeBytes: number | null;
  outputExists: boolean;
  hero: string;
  battleRecord: string;
  equipment: string;
  runes: string;
  playerSummary: SessionMatchParticipant | null;
  participants: SessionMatchParticipant[];
}

type TimelineEventKind = 'kill' | 'teamfight' | 'objective' | 'voice' | 'bookmark';

interface TimelineEvent {
  id: string;
  kind: TimelineEventKind;
  timeSeconds: number;
  title: string;
  detail: string;
}

interface TimelineChapter {
  id: string;
  label: string;
  startSeconds: number;
  endSeconds: number;
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatKda(participant: SessionMatchParticipant | null): string {
  if (!participant) {
    return '--';
  }
  const kills = participant.kills;
  const deaths = participant.deaths;
  const assists = participant.assists;
  if (kills === null || deaths === null || assists === null) {
    return '--';
  }
  return `${kills}/${deaths}/${assists}`;
}

function formatListPreview(values: string[] | null | undefined): string {
  if (!values || values.length <= 0) {
    return '--';
  }
  const preview = values.slice(0, 2).join(' / ');
  if (values.length <= 2) {
    return preview;
  }
  return `${preview} +${values.length - 2}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function formatTimelineTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function History() {
  const { tr } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'table' | 'empty'>('table');
  const [items, setItems] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterDurationMin, setFilterDurationMin] = useState('');
  const [filterDurationMax, setFilterDurationMax] = useState('');
  const [filterFileState, setFilterFileState] = useState('all');
  const [filterGame, setFilterGame] = useState('all');

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteFiles, setDeleteFiles] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [playerRow, setPlayerRow] = useState<RecordRow | null>(null);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isPlayerPlaying, setIsPlayerPlaying] = useState(false);
  const [playerCurrentSeconds, setPlayerCurrentSeconds] = useState(0);
  const [playerDurationSeconds, setPlayerDurationSeconds] = useState(0);
  const [playerBufferedSeconds, setPlayerBufferedSeconds] = useState(0);
  const [playerVolume, setPlayerVolume] = useState(0.9);
  const [playerMuted, setPlayerMuted] = useState(false);
  const [playerPlaybackRate, setPlayerPlaybackRate] = useState(1);
  const [playerControlsVisible, setPlayerControlsVisible] = useState(true);
  const [isPlayerMiniMode, setIsPlayerMiniMode] = useState(false);
  const [showPlayerEventPanel, setShowPlayerEventPanel] = useState(true);
  const showPlayerEventUi = false;
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [timelineEventVisibility, setTimelineEventVisibility] = useState<Record<TimelineEventKind, boolean>>({
    kill: true,
    teamfight: true,
    objective: true,
    voice: true,
    bookmark: true,
  });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerSurfaceRef = useRef<HTMLDivElement | null>(null);
  const hideControlsTimerRef = useRef<number | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [detailsRow, setDetailsRow] = useState<RecordRow | null>(null);

  const mapSessionStatus = (status: string): { rowStatus: RowStatus; text: string } => {
    if (status === 'completed') {
      return { rowStatus: 'success', text: tr('已保存', 'Saved') };
    }
    if (status === 'recording') {
      return { rowStatus: 'recording', text: tr('录制中', 'Recording') };
    }
    return { rowStatus: 'error', text: tr('异常结束', 'Abnormal end') };
  };

  const loadHistory = async () => {
    setLoading(true);
    try {
      const rows = await getSessionHistory(1000);
      setItems(rows);
      setSelectedIds((prev) => prev.filter((id) => rows.some((item) => item.session_id === id)));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('读取视频列表失败', 'Failed to load video list'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const rows = useMemo<RecordRow[]>(() => {
    return items.map((item) => {
      const mapped = mapSessionStatus(item.status);
      const durationSeconds = item.duration_ms === null ? null : Math.floor(item.duration_ms / 1000);
      const outputExists = item.output_path !== null && item.file_size_bytes !== null;
      const matchMetadata = item.match_metadata || null;
      const playerSummary = matchMetadata?.player_summary || null;
      const participants = Array.isArray(matchMetadata?.participants) ? matchMetadata?.participants : [];
      return {
        id: item.session_id,
        startTime: formatDateTime(item.start_ts_unix_ms),
        endTime: formatDateTime(item.end_ts_unix_ms),
        startTimeMs: item.start_ts_unix_ms,
        durationMs: item.duration_ms,
        durationSeconds,
        duration: formatDurationHms(durationSeconds),
        status: mapped.rowStatus,
        statusText: mapped.text,
        gameMode: item.game_id === 'league_of_legends' ? tr('英雄联盟', 'League of Legends') : item.game_id,
        gameId: item.game_id,
        outputPath: item.output_path || null,
        recordingsDir: item.recordings_output_dir || null,
        filePath: item.output_path || item.recordings_output_dir || '--',
        fileSize: formatFileSize(item.file_size_bytes),
        fileSizeBytes: item.file_size_bytes,
        outputExists,
        hero: playerSummary?.champion || '--',
        battleRecord: formatKda(playerSummary),
        equipment: formatListPreview(playerSummary?.items),
        runes: formatListPreview(playerSummary?.runes),
        playerSummary,
        participants,
      };
    });
  }, [items, tr]);

  const filteredRows = useMemo(() => {
    const fromMs = filterDateFrom.trim().length > 0 ? new Date(`${filterDateFrom}T00:00:00`).getTime() : null;
    const toMs = filterDateTo.trim().length > 0 ? new Date(`${filterDateTo}T23:59:59`).getTime() : null;
    const minDuration = filterDurationMin.trim().length > 0 ? Number.parseInt(filterDurationMin, 10) : null;
    const maxDuration = filterDurationMax.trim().length > 0 ? Number.parseInt(filterDurationMax, 10) : null;

    return rows.filter((row) => {
      const byStatus = filterStatus === 'all' || row.status === filterStatus;
      const byGame = filterGame === 'all' || row.gameId === filterGame;

      const query = searchQuery.trim().toLowerCase();
      const byQuery =
        query.length === 0
          ? true
          : row.startTime.toLowerCase().includes(query) ||
            row.endTime.toLowerCase().includes(query) ||
            row.gameMode.toLowerCase().includes(query) ||
            row.filePath.toLowerCase().includes(query) ||
            row.hero.toLowerCase().includes(query) ||
            row.id.toLowerCase().includes(query);

      const byDateFrom = fromMs === null || (row.startTimeMs !== null && row.startTimeMs >= fromMs);
      const byDateTo = toMs === null || (row.startTimeMs !== null && row.startTimeMs <= toMs);

      const byDurationMin =
        minDuration === null ||
        (Number.isFinite(minDuration) && row.durationSeconds !== null && row.durationSeconds >= minDuration);
      const byDurationMax =
        maxDuration === null ||
        (Number.isFinite(maxDuration) && row.durationSeconds !== null && row.durationSeconds <= maxDuration);

      const byFileState =
        filterFileState === 'all' ||
        (filterFileState === 'exists' && row.outputExists) ||
        (filterFileState === 'missing' && !!row.outputPath && !row.outputExists);

      return byStatus && byGame && byQuery && byDateFrom && byDateTo && byDurationMin && byDurationMax && byFileState;
    });
  }, [
    rows,
    filterStatus,
    filterGame,
    searchQuery,
    filterDateFrom,
    filterDateTo,
    filterDurationMin,
    filterDurationMax,
    filterFileState,
  ]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const statusOptions = [
    { value: 'all', label: tr('全部状态', 'All statuses') },
    { value: 'success', label: tr('已保存', 'Saved') },
    { value: 'recording', label: tr('录制中', 'Recording') },
    { value: 'error', label: tr('异常结束', 'Abnormal end') },
  ];

  const gameOptions = [
    { value: 'all', label: tr('全部游戏', 'All games') },
    { value: 'league_of_legends', label: tr('英雄联盟', 'League of Legends') },
  ];

  const fileStateOptions = [
    { value: 'all', label: tr('全部文件状态', 'All file states') },
    { value: 'exists', label: tr('文件存在', 'File exists') },
    { value: 'missing', label: tr('文件缺失', 'File missing') },
  ];

  const openOutputFile = async (row: RecordRow) => {
    if (!row.outputPath || !row.outputExists) {
      return;
    }
    try {
      await openPathInExplorer(row.outputPath);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('打开文件失败', 'Failed to open file'));
    }
  };

  const openOutputFolder = async (row: RecordRow) => {
    try {
      if (row.outputPath) {
        await openPathInExplorer(row.outputPath, { revealInFolder: true });
      } else if (row.recordingsDir) {
        await openRecordingsDir(row.recordingsDir);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('打开目录失败', 'Failed to open directory'));
    }
  };

  const openPlayerModal = (row: RecordRow) => {
    if (!row.outputPath || !row.outputExists) {
      setError(tr('该录制文件不存在或尚未完成写入', 'The recording file is missing or not finalized yet'));
      return;
    }
    setPlayerRow(row);
    setPlayerError(null);
    setPlayerCurrentSeconds(0);
    setPlayerDurationSeconds(0);
    setPlayerBufferedSeconds(0);
    setPlayerPlaybackRate(1);
    setTimelineZoom(1);
    setIsPlayerMiniMode(false);
    setShowPlayerEventPanel(false);
    setHoveredEventId(null);
    setTimelineEventVisibility({
      kill: true,
      teamfight: true,
      objective: true,
      voice: true,
      bookmark: true,
    });
    setIsPlayerModalOpen(true);
  };

  const closePlayerModal = () => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    setIsPlayerModalOpen(false);
    setPlayerError(null);
    setPlayerRow(null);
    setIsPlayerPlaying(false);
    setPlayerControlsVisible(true);
  };

  const scheduleHidePlayerControls = () => {
    if (hideControlsTimerRef.current !== null) {
      window.clearTimeout(hideControlsTimerRef.current);
      hideControlsTimerRef.current = null;
    }
    if (!isPlayerPlaying) {
      return;
    }
    hideControlsTimerRef.current = window.setTimeout(() => {
      setPlayerControlsVisible(false);
    }, 2200);
  };

  const revealPlayerControls = () => {
    setPlayerControlsVisible(true);
    scheduleHidePlayerControls();
  };

  const syncPlayerFromVideo = () => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    if (Number.isFinite(element.currentTime)) {
      setPlayerCurrentSeconds(element.currentTime);
    }
    if (Number.isFinite(element.duration) && element.duration > 0) {
      setPlayerDurationSeconds(element.duration);
    }
    const buffered = element.buffered;
    if (buffered.length > 0) {
      setPlayerBufferedSeconds(buffered.end(buffered.length - 1));
    } else {
      setPlayerBufferedSeconds(0);
    }
  };

  const seekPlayerTo = (seconds: number) => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    const limit = playerDurationSeconds > 0 ? playerDurationSeconds : Number.isFinite(element.duration) ? element.duration : 0;
    const nextSeconds = clamp(seconds, 0, Math.max(0, limit || 0));
    element.currentTime = nextSeconds;
    setPlayerCurrentSeconds(nextSeconds);
    revealPlayerControls();
  };

  const togglePlayerPlayback = async () => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    try {
      if (element.paused) {
        await element.play();
      } else {
        element.pause();
      }
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : tr('视频播放失败', 'Failed to play video'));
    }
    revealPlayerControls();
  };

  const stepPlayerBySeconds = (delta: number) => {
    seekPlayerTo(playerCurrentSeconds + delta);
  };

  const setPlayerVolumeFromValue = (value: number) => {
    const normalized = clamp(value, 0, 1);
    setPlayerVolume(normalized);
    if (normalized > 0 && playerMuted) {
      setPlayerMuted(false);
    }
    revealPlayerControls();
  };

  const togglePlayerMute = () => {
    setPlayerMuted((prev) => !prev);
    revealPlayerControls();
  };

  const setPlayerRate = (rate: number) => {
    const normalized = clamp(rate, 0.5, 2);
    setPlayerPlaybackRate(Number(normalized.toFixed(2)));
    revealPlayerControls();
  };

  const togglePlayerFullscreen = async () => {
    const target = playerSurfaceRef.current;
    if (!target) {
      return;
    }
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await target.requestFullscreen();
      }
    } catch (err) {
      setPlayerError(err instanceof Error ? err.message : tr('无法切换全屏', 'Failed to toggle fullscreen'));
    }
    revealPlayerControls();
  };

  useEffect(() => {
    return () => {
      if (hideControlsTimerRef.current !== null) {
        window.clearTimeout(hideControlsTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const element = videoRef.current;
    if (!element) {
      return;
    }
    element.volume = playerVolume;
    element.muted = playerMuted;
    element.playbackRate = playerPlaybackRate;
  }, [isPlayerModalOpen, playerVolume, playerMuted, playerPlaybackRate]);

  useEffect(() => {
    if (!isPlayerModalOpen || !isPlayerPlaying) {
      if (hideControlsTimerRef.current !== null) {
        window.clearTimeout(hideControlsTimerRef.current);
        hideControlsTimerRef.current = null;
      }
      setPlayerControlsVisible(true);
      return;
    }
    scheduleHidePlayerControls();
  }, [isPlayerModalOpen, isPlayerPlaying]);

  useEffect(() => {
    if (!isPlayerModalOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName)) {
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        void togglePlayerPlayback();
        return;
      }
      if (event.code === 'ArrowLeft') {
        event.preventDefault();
        stepPlayerBySeconds(-5);
        return;
      }
      if (event.code === 'ArrowRight') {
        event.preventDefault();
        stepPlayerBySeconds(5);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isPlayerModalOpen, playerCurrentSeconds, isPlayerPlaying]);

  const openDetailsModal = (row: RecordRow) => {
    setDetailsRow(row);
    setIsDetailsModalOpen(true);
  };

  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setDetailsRow(null);
  };

  const toggleSelection = (sessionId: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId);
      }
      return [...prev, sessionId];
    });
  };

  const selectAllFiltered = () => {
    if (filteredRows.length <= 0) {
      return;
    }
    const allVisibleIds = filteredRows.map((row) => row.id);
    const isAllSelected = allVisibleIds.every((id) => selectedSet.has(id));
    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of allVisibleIds) {
        next.add(id);
      }
      return Array.from(next);
    });
  };

  const openDeleteModal = (sessionIds: string[]) => {
    if (sessionIds.length <= 0) {
      return;
    }
    setSelectedIds(Array.from(new Set(sessionIds)));
    setDeleteFiles(false);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) {
      return;
    }
    setIsDeleteModalOpen(false);
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.length <= 0 || deleteLoading) {
      return;
    }
    setDeleteLoading(true);
    try {
      const response = await deleteHistoryItems(selectedIds, { deleteFiles });
      await loadHistory();
      setSelectedIds([]);
      setIsDeleteModalOpen(false);
      setNotice(
        tr('已删除 {count} 条视频记录', 'Deleted {count} video records').replace('{count}', String(response.deleted_count)) +
          (deleteFiles
            ? tr('，并删除 {count} 个视频文件', ', and removed {count} video files').replace(
                '{count}',
                String(response.removed_file_count)
              )
            : '')
      );
      if (response.file_delete_errors.length > 0) {
        setError(
          tr(
            '已删除历史记录，但有 {count} 个视频文件删除失败。请检查文件占用或权限后重试。',
            'History deleted, but {count} video files could not be removed. Check file locks or permissions.'
          ).replace('{count}', String(response.file_delete_errors.length))
        );
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tr('删除失败', 'Delete failed'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const exportFilteredRows = () => {
    if (filteredRows.length <= 0) {
      return;
    }
    const header = [
      'session_id',
      'game',
      'status',
      'start_time',
      'end_time',
      'duration_seconds',
      'hero',
      'kda',
      'items',
      'runes',
      'output_path',
      'file_size_bytes',
    ];
    const lines = [header.join(',')];
    for (const row of filteredRows) {
      lines.push(
        [
          escapeCsv(row.id),
          escapeCsv(row.gameMode),
          escapeCsv(row.statusText),
          escapeCsv(row.startTime),
          escapeCsv(row.endTime),
          String(row.durationSeconds ?? ''),
          escapeCsv(row.hero),
          escapeCsv(row.battleRecord),
          escapeCsv(row.equipment),
          escapeCsv(row.runes),
          escapeCsv(row.outputPath || ''),
          String(row.fileSizeBytes ?? ''),
        ].join(',')
      );
    }
    const content = `\uFEFF${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `unique-record-videos-${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      key: 'select',
      header: tr('选择', 'Select'),
      width: '70px',
      render: (_: unknown, row: RecordRow) => (
        <input
          type="checkbox"
          checked={selectedSet.has(row.id)}
          onChange={() => toggleSelection(row.id)}
          aria-label={`select-${row.id}`}
        />
      ),
    },
    { key: 'startTime', header: tr('开始时间', 'Start time'), width: '180px' },
    { key: 'endTime', header: tr('结束时间', 'End time'), width: '180px' },
    {
      key: 'duration',
      header: tr('时长', 'Duration'),
      width: '100px',
      render: (value: string) => <span className="font-medium">{value}</span>,
    },
    { key: 'gameMode', header: tr('游戏', 'Game'), width: '140px' },
    { key: 'hero', header: tr('英雄', 'Champion'), width: '140px' },
    { key: 'battleRecord', header: tr('战绩', 'KDA'), width: '100px' },
    {
      key: 'status',
      header: tr('状态', 'Status'),
      width: '120px',
      render: (value: RowStatus) => {
        const map = {
          success: { status: 'success' as const, text: tr('已保存', 'Saved') },
          recording: { status: 'recording' as const, text: tr('录制中', 'Recording') },
          error: { status: 'error' as const, text: tr('异常结束', 'Abnormal end') },
        };
        return <StatusBadge status={map[value].status} text={map[value].text} size="sm" />;
      },
    },
    { key: 'fileSize', header: tr('文件大小', 'File size'), width: '110px' },
    {
      key: 'actions',
      header: tr('操作', 'Actions'),
      render: (_: unknown, row: RecordRow) => (
        <div className="flex items-center gap-1">
          <Button
            variant="subtle"
            size="sm"
            onClick={() => openDetailsModal(row)}
            title={tr('查看对局详情', 'View match details')}
          >
            <ChevronDown size={14} />
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={!row.outputExists}
            onClick={() => openPlayerModal(row)}
            title={row.outputExists ? tr('内置播放', 'Play in app') : tr('视频文件不可用', 'Video file unavailable')}
          >
            <PlayCircle size={14} />
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={!row.outputExists}
            onClick={() => void openOutputFile(row)}
            title={row.outputExists ? tr('打开视频文件', 'Open video file') : tr('视频文件不可用', 'Video file unavailable')}
          >
            <FileVideo size={14} />
          </Button>
          <Button
            variant="subtle"
            size="sm"
            disabled={!row.outputPath && !row.recordingsDir}
            onClick={() => void openOutputFolder(row)}
            title={row.outputPath ? tr('在资源管理器中定位文件', 'Reveal file in Explorer') : tr('打开录制目录', 'Open recordings folder')}
          >
            <Folder size={14} />
          </Button>
          <Button variant="subtle" size="sm" onClick={() => openDeleteModal([row.id])}>
            <Trash2 size={14} className="text-[var(--status-error)]" />
          </Button>
        </div>
      ),
    },
  ];

  const totalCount = rows.length;
  const successCount = rows.filter((row) => row.status === 'success').length;
  const errorCount = rows.filter((row) => row.status === 'error').length;
  const totalSizeBytes = items
    .filter((item) => typeof item.file_size_bytes === 'number')
    .reduce((acc, item) => acc + (item.file_size_bytes as number), 0);

  const isAllFilteredSelected = filteredRows.length > 0 && filteredRows.every((row) => selectedSet.has(row.id));
  const timelineDurationSeconds =
    playerDurationSeconds > 0
      ? playerDurationSeconds
      : playerRow?.durationSeconds && playerRow.durationSeconds > 0
      ? playerRow.durationSeconds
      : 0;
  const timelineWidthPercent = Math.max(100, Math.round(timelineZoom * 100));

  const timelineEventMeta = {
    kill: { label: tr('击杀', 'Kill'), color: '#ff6a8b' },
    teamfight: { label: tr('团战', 'Teamfight'), color: '#7f8dff' },
    objective: { label: tr('目标', 'Objective'), color: '#48d8ba' },
    voice: { label: tr('语音', 'Voice'), color: '#f8b85e' },
    bookmark: { label: tr('书签', 'Bookmark'), color: '#72c3ff' },
  } satisfies Record<TimelineEventKind, { label: string; color: string }>;

  const timelineChapters = useMemo<TimelineChapter[]>(() => {
    if (!playerRow || timelineDurationSeconds <= 0) {
      return [];
    }
    const earlyEnd = timelineDurationSeconds * 0.32;
    const midEnd = timelineDurationSeconds * 0.68;
    return [
      {
        id: 'chapter-early',
        label: tr('前期', 'Early Game'),
        startSeconds: 0,
        endSeconds: earlyEnd,
      },
      {
        id: 'chapter-mid',
        label: tr('中期', 'Mid Game'),
        startSeconds: earlyEnd,
        endSeconds: midEnd,
      },
      {
        id: 'chapter-late',
        label: tr('后期', 'Late Game'),
        startSeconds: midEnd,
        endSeconds: timelineDurationSeconds,
      },
    ];
  }, [playerRow, timelineDurationSeconds, tr]);

  const allTimelineEvents = useMemo<TimelineEvent[]>(() => {
    if (!playerRow || timelineDurationSeconds <= 0) {
      return [];
    }
    const hash = playerRow.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const offset = ((hash % 15) - 7) / 250;
    const anchors = [0.06, 0.17, 0.31, 0.5, 0.63, 0.78, 0.9].map((base) => clamp(base + offset, 0.03, 0.96));
    const championName = playerRow.playerSummary?.champion || tr('未知英雄', 'Unknown champion');
    const kdaText = formatKda(playerRow.playerSummary);

    return [
      {
        id: `${playerRow.id}-bookmark-start`,
        kind: 'bookmark',
        timeSeconds: clamp(2, 0, timelineDurationSeconds),
        title: tr('对局开始', 'Match Start'),
        detail: tr('录制已自动启动。', 'Recording auto-started.'),
      },
      {
        id: `${playerRow.id}-voice-call`,
        kind: 'voice',
        timeSeconds: timelineDurationSeconds * anchors[1],
        title: tr('语音指令片段', 'Voice Comms Segment'),
        detail: tr('预留人声转文字索引入口。', 'Reserved for speech-to-text indexing.'),
      },
      {
        id: `${playerRow.id}-kill-impact`,
        kind: 'kill',
        timeSeconds: timelineDurationSeconds * anchors[2],
        title: tr('关键击杀', 'Impact Kill'),
        detail: tr('英雄 {hero} 关键操作，KDA {kda}', 'Key play by {hero}, KDA {kda}')
          .replace('{hero}', championName)
          .replace('{kda}', kdaText),
      },
      {
        id: `${playerRow.id}-teamfight-main`,
        kind: 'teamfight',
        timeSeconds: timelineDurationSeconds * anchors[3],
        title: tr('团战高峰', 'Major Teamfight'),
        detail: tr('建议用于精彩片段提取。', 'Candidate for highlight extraction.'),
      },
      {
        id: `${playerRow.id}-objective`,
        kind: 'objective',
        timeSeconds: timelineDurationSeconds * anchors[4],
        title: tr('关键目标', 'Major Objective'),
        detail: tr('预留目标事件标记能力。', 'Reserved for objective event tagging.'),
      },
      {
        id: `${playerRow.id}-bookmark-custom`,
        kind: 'bookmark',
        timeSeconds: timelineDurationSeconds * anchors[5],
        title: tr('手动书签位', 'Manual Bookmark Slot'),
        detail: tr('预留用户手动打点。', 'Reserved for user bookmarks.'),
      },
      {
        id: `${playerRow.id}-bookmark-end`,
        kind: 'bookmark',
        timeSeconds: clamp(timelineDurationSeconds - 5, 0, timelineDurationSeconds),
        title: tr('对局结束', 'Match End'),
        detail: tr('录制准备封装输出。', 'Recording finalization.'),
      },
    ].sort((a, b) => a.timeSeconds - b.timeSeconds);
  }, [playerRow, timelineDurationSeconds, tr]);

  const visibleTimelineEvents = useMemo(() => {
    return allTimelineEvents.filter((event) => timelineEventVisibility[event.kind]);
  }, [allTimelineEvents, timelineEventVisibility]);

  const hoveredTimelineEvent = useMemo(() => {
    if (!hoveredEventId) {
      return null;
    }
    return visibleTimelineEvents.find((event) => event.id === hoveredEventId) || null;
  }, [hoveredEventId, visibleTimelineEvents]);

  const jumpToTimelineEvent = (event: TimelineEvent) => {
    seekPlayerTo(event.timeSeconds);
  };

  const jumpToNextTimelineEvent = () => {
    const nextEvent = visibleTimelineEvents.find((event) => event.timeSeconds > playerCurrentSeconds + 0.25);
    if (nextEvent) {
      jumpToTimelineEvent(nextEvent);
    }
  };

  const jumpToPreviousTimelineEvent = () => {
    const reversed = [...visibleTimelineEvents].reverse();
    const previousEvent = reversed.find((event) => event.timeSeconds < playerCurrentSeconds - 0.25);
    if (previousEvent) {
      jumpToTimelineEvent(previousEvent);
    }
  };

  const playerRateOptions = [0.75, 1, 1.25, 1.5, 2];
  const playerMediaUrl = playerRow ? getSessionMediaUrl(playerRow.id) : '';

  return (
    <AppLayout>
      <div className="p-8 max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('视频管理', 'Video Management')}</h1>
            <p className="text-[14px] text-[var(--muted-foreground)]">{tr('查看和管理已录制视频与对局信息', 'View recorded videos and match details')}</p>
          </div>
          <Button variant="secondary" onClick={() => void loadHistory()} disabled={loading}>
            <RefreshCw size={16} />
            {tr('刷新', 'Refresh')}
          </Button>
        </div>

        {error && (
          <Card padding="md" className="mb-4 border border-[var(--status-error)]/30">
            <p className="text-[13px] text-[var(--status-error)]">{error}</p>
          </Card>
        )}

        {notice && (
          <Card padding="md" className="mb-4 border border-[var(--status-success)]/30">
            <p className="text-[13px] text-[var(--status-success)]">{notice}</p>
          </Card>
        )}

        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <TextField
                placeholder={tr('搜索视频、英雄、时间...', 'Search videos, champions, time...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search size={16} />}
              />
            </div>
            <div className="w-52">
              <Dropdown
                options={statusOptions}
                value={filterStatus}
                onChange={setFilterStatus}
                placeholder={tr('筛选状态', 'Filter status')}
              />
            </div>
            <Button variant="secondary" onClick={() => setShowAdvancedFilters((prev) => !prev)}>
              <Filter size={18} />
              {tr('高级筛选', 'Advanced filters')}
            </Button>
            <Button variant="subtle" onClick={() => setViewMode(viewMode === 'table' ? 'empty' : 'table')}>
              {tr('切换视图', 'Switch view')}
            </Button>
          </div>

          {showAdvancedFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-3 gap-3">
              <TextField label={tr('开始日期', 'Start date')} type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              <TextField label={tr('结束日期', 'End date')} type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              <Dropdown label={tr('游戏', 'Game')} options={gameOptions} value={filterGame} onChange={setFilterGame} />
              <TextField
                label={tr('最小时长 (秒)', 'Minimum duration (sec)')}
                type="number"
                value={filterDurationMin}
                onChange={(e) => setFilterDurationMin(e.target.value)}
              />
              <TextField
                label={tr('最大时长 (秒)', 'Maximum duration (sec)')}
                type="number"
                value={filterDurationMax}
                onChange={(e) => setFilterDurationMax(e.target.value)}
              />
              <Dropdown label={tr('文件状态', 'File state')} options={fileStateOptions} value={filterFileState} onChange={setFilterFileState} />
            </div>
          )}
        </Card>

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card padding="md">
            <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('总视频数', 'Total videos')}</p>
            <p className="text-[var(--text-2xl)] font-semibold">{totalCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('成功保存', 'Saved')}</p>
            <p className="text-[var(--text-2xl)] font-semibold text-[var(--status-success)]">{successCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('异常结束', 'Abnormal end')}</p>
            <p className="text-[var(--text-2xl)] font-semibold text-[var(--status-error)]">{errorCount}</p>
          </Card>
          <Card padding="md">
            <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('总大小', 'Total size')}</p>
            <p className="text-[var(--text-2xl)] font-semibold">{formatFileSize(totalSizeBytes)}</p>
          </Card>
        </div>

        {viewMode === 'table' ? (
          <Table columns={columns} data={filteredRows} emptyMessage={loading ? tr('加载中...', 'Loading...') : tr('暂无视频记录', 'No videos yet')} />
        ) : (
          <Card padding="lg">
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-[var(--neutral-10)] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileVideo size={40} className="text-[var(--muted-foreground)]" />
              </div>
              <h3 className="text-[var(--text-lg)] font-semibold mb-2">{tr('暂无视频记录', 'No videos yet')}</h3>
              <p className="text-[14px] text-[var(--muted-foreground)] mb-6 max-w-md mx-auto">
                {tr('启动英雄联盟并进入对局，UniqueRecord 将自动开始录制。', 'Launch League of Legends and enter a match. UniqueRecord will start recording automatically.')}
              </p>
              <Button variant="primary" onClick={() => setViewMode('table')}>
                <PlayCircle size={18} />
                {tr('返回表格视图', 'Back to table view')}
              </Button>
            </div>
          </Card>
        )}

        {viewMode === 'table' && filteredRows.length > 0 && (
          <Card padding="md" className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-[13px] text-[var(--muted-foreground)]">
                {tr('共 {count} 条视频，已选择 {selected} 条', '{count} videos, {selected} selected')
                  .replace('{count}', String(filteredRows.length))
                  .replace('{selected}', String(selectedIds.length))}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={selectAllFiltered}>
                  {isAllFilteredSelected ? <Square size={16} /> : <CheckSquare size={16} />}
                  {isAllFilteredSelected ? tr('取消全选', 'Clear selection') : tr('全选当前筛选', 'Select all filtered')}
                </Button>
                <Button variant="secondary" size="sm" onClick={exportFilteredRows}>
                  <Download size={16} />
                  {tr('导出列表', 'Export list')}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => openDeleteModal(selectedIds)} disabled={selectedIds.length <= 0}>
                  <Trash2 size={16} />
                  {tr('批量删除', 'Batch delete')}
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Modal
        isOpen={isDetailsModalOpen}
        onClose={closeDetailsModal}
        size="lg"
        title={tr('对局详情', 'Match Details')}
        footer={
          <Button variant="subtle" onClick={closeDetailsModal}>
            {tr('关闭', 'Close')}
          </Button>
        }
      >
        <div className="space-y-4">
          {!detailsRow ? (
            <p className="text-[13px] text-[var(--muted-foreground)]">{tr('暂无详情数据', 'No detail data')}</p>
          ) : (
            <>
              <div className="p-3 rounded-[var(--radius-md)] bg-[var(--neutral-10)] border border-[var(--border)]">
                <p className="text-[13px] font-medium mb-1">{tr('当前视频', 'Current video')}</p>
                <p className="text-[12px] text-[var(--muted-foreground)]">
                  {detailsRow.startTime} · {detailsRow.gameMode}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Card padding="md">
                  <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('你的英雄', 'Your champion')}</p>
                  <p className="text-[14px] font-medium">{detailsRow.playerSummary?.champion || '--'}</p>
                </Card>
                <Card padding="md">
                  <p className="text-[12px] text-[var(--muted-foreground)] mb-1">{tr('你的战绩', 'Your KDA')}</p>
                  <p className="text-[14px] font-medium">{formatKda(detailsRow.playerSummary)}</p>
                </Card>
              </div>

              <div>
                <p className="text-[13px] font-medium mb-2">{tr('全员详情', 'All players')}</p>
                {detailsRow.participants.length <= 0 ? (
                  <p className="text-[12px] text-[var(--muted-foreground)]">
                    {tr('当前视频暂无全员对局数据。', 'No full participant data for this video.')}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[40vh] overflow-auto pr-1">
                    {detailsRow.participants.map((participant, index) => (
                      <div key={`${detailsRow.id}-participant-${index}`} className="p-3 rounded-[var(--radius-md)] border border-[var(--border)]">
                        <div className="flex items-center justify-between gap-3 mb-1">
                          <p className="text-[13px] font-medium">
                            {participant.summoner_name || tr('未知召唤师', 'Unknown player')} · {participant.champion || '--'}
                          </p>
                          <p className="text-[12px] text-[var(--muted-foreground)]">
                            {participant.team || '--'} {participant.result ? `· ${participant.result}` : ''}
                          </p>
                        </div>
                        <p className="text-[12px] text-[var(--muted-foreground)]">
                          {tr('战绩', 'KDA')}: {formatKda(participant)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isPlayerModalOpen}
        onClose={closePlayerModal}
        size="lg"
        className="max-w-[min(1200px,96vw)]"
        title={tr('内置播放器', 'Built-in Player')}
        footer={
          <>
            <Button variant="subtle" onClick={closePlayerModal}>
              {tr('关闭', 'Close')}
            </Button>
            <Button
              variant="secondary"
              disabled={!playerRow || (!playerRow.outputPath && !playerRow.recordingsDir)}
              onClick={() => {
                if (!playerRow) {
                  return;
                }
                void openOutputFolder(playerRow);
              }}
            >
              <Folder size={16} />
              {tr('打开目录', 'Open folder')}
            </Button>
            <Button
              variant="secondary"
              disabled={!playerRow || !playerRow.outputExists}
              onClick={() => {
                if (!playerRow) {
                  return;
                }
                void openOutputFile(playerRow);
              }}
            >
              <FileVideo size={16} />
              {tr('打开文件', 'Open file')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {playerError && <p className="text-[13px] text-[var(--status-error)]">{playerError}</p>}
          {!playerError && playerRow && (
            <div className="space-y-4">
              <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--neutral-10)] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[13px] text-[var(--muted-foreground)]">{tr('当前视频', 'Current video')}</p>
                    <p className="text-[14px] font-medium">
                      {playerRow.startTime} · {playerRow.hero || '--'} · {playerRow.duration}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="subtle"
                      size="sm"
                      onClick={() => {
                        setIsPlayerMiniMode((prev) => !prev);
                        revealPlayerControls();
                      }}
                    >
                      {isPlayerMiniMode ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
                      {isPlayerMiniMode ? tr('退出迷你模式', 'Exit mini mode') : tr('迷你模式', 'Mini mode')}
                    </Button>
                    {showPlayerEventUi && (
                      <Button
                        variant="subtle"
                        size="sm"
                        onClick={() => {
                          setShowPlayerEventPanel((prev) => !prev);
                          revealPlayerControls();
                        }}
                      >
                        {showPlayerEventPanel ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                        {showPlayerEventPanel ? tr('隐藏事件面板', 'Hide events panel') : tr('显示事件面板', 'Show events panel')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`grid gap-4 ${
                  !isPlayerMiniMode && showPlayerEventUi && showPlayerEventPanel ? 'xl:grid-cols-[minmax(0,1fr)_320px]' : 'grid-cols-1'
                }`}
              >
                <div className="space-y-3">
                  <div
                    ref={playerSurfaceRef}
                    className="player-surface relative rounded-[var(--radius-md)] overflow-hidden bg-black border border-[var(--border)]"
                    onMouseMove={revealPlayerControls}
                  >
                    <video
                      key={playerRow.id}
                      ref={videoRef}
                      className="player-video bg-black cursor-pointer"
                      preload="metadata"
                      src={playerMediaUrl}
                      onClick={() => {
                        void togglePlayerPlayback();
                      }}
                      onLoadedMetadata={syncPlayerFromVideo}
                      onDurationChange={syncPlayerFromVideo}
                      onTimeUpdate={syncPlayerFromVideo}
                      onProgress={syncPlayerFromVideo}
                      onPlay={() => {
                        setIsPlayerPlaying(true);
                        scheduleHidePlayerControls();
                      }}
                      onPause={() => {
                        setIsPlayerPlaying(false);
                        setPlayerControlsVisible(true);
                      }}
                      onEnded={() => {
                        setIsPlayerPlaying(false);
                        setPlayerControlsVisible(true);
                      }}
                      onError={() => {
                        setPlayerError(
                          tr(
                            '视频加载失败，请确认文件存在且编码可播放。',
                            'Failed to load video. Confirm the file exists and codec is playable.'
                          )
                        );
                      }}
                    />

                    {playerControlsVisible && (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <button
                          type="button"
                          className="pointer-events-auto inline-flex h-16 w-16 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white transition hover:bg-black/60"
                          onClick={() => {
                            void togglePlayerPlayback();
                          }}
                          aria-label={isPlayerPlaying ? tr('暂停', 'Pause') : tr('播放', 'Play')}
                        >
                          {isPlayerPlaying ? <Pause size={30} /> : <PlayCircle size={30} />}
                        </button>
                      </div>
                    )}
                  </div>

                  <div
                    className={`rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--neutral-10)] p-3 transition-opacity ${
                      playerControlsVisible ? 'opacity-100' : 'opacity-65'
                    }`}
                    onMouseMove={revealPlayerControls}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            stepPlayerBySeconds(-10);
                          }}
                        >
                          <SkipBack size={14} />
                          {tr('后退10秒', 'Back 10s')}
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            void togglePlayerPlayback();
                          }}
                        >
                          {isPlayerPlaying ? <Pause size={14} /> : <PlayCircle size={14} />}
                          {isPlayerPlaying ? tr('暂停', 'Pause') : tr('播放', 'Play')}
                        </Button>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            stepPlayerBySeconds(10);
                          }}
                        >
                          <SkipForward size={14} />
                          {tr('前进10秒', 'Forward 10s')}
                        </Button>
                        {showPlayerEventUi && (
                          <Button variant="subtle" size="sm" onClick={jumpToPreviousTimelineEvent}>
                            <ChevronLeft size={14} />
                            {tr('上一个事件', 'Prev event')}
                          </Button>
                        )}
                        {showPlayerEventUi && (
                          <Button variant="subtle" size="sm" onClick={jumpToNextTimelineEvent}>
                            <ChevronRight size={14} />
                            {tr('下一个事件', 'Next event')}
                          </Button>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)]"
                          onClick={togglePlayerMute}
                          aria-label={playerMuted ? tr('取消静音', 'Unmute') : tr('静音', 'Mute')}
                        >
                          {playerMuted || playerVolume <= 0.01 ? <VolumeX size={15} /> : <Volume2 size={15} />}
                        </button>
                        <input
                          className="player-volume-range"
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={playerMuted ? 0 : playerVolume}
                          onChange={(e) => {
                            setPlayerVolumeFromValue(Number.parseFloat(e.target.value));
                          }}
                          aria-label={tr('音量', 'Volume')}
                        />
                        <div className="flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] p-1">
                          {playerRateOptions.map((rate) => (
                            <button
                              key={`rate-${rate}`}
                              type="button"
                              className={`rounded-[var(--radius-sm)] px-2 py-1 text-[12px] transition ${
                                Math.abs(playerPlaybackRate - rate) < 0.01
                                  ? 'bg-[var(--fluent-blue)] text-white'
                                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                              }`}
                              onClick={() => {
                                setPlayerRate(rate);
                              }}
                            >
                              {rate}x
                            </button>
                          ))}
                        </div>
                        <Button variant="subtle" size="sm" onClick={() => void togglePlayerFullscreen()}>
                          <Maximize2 size={14} />
                          {tr('全屏', 'Fullscreen')}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--neutral-10)] p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[13px] font-medium">
                        {tr('时间轴', 'Timeline')} · {formatTimelineTimestamp(playerCurrentSeconds)} /{' '}
                        {formatTimelineTimestamp(timelineDurationSeconds)}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setTimelineZoom((prev) => clamp(prev / 2, 1, 8));
                          }}
                        >
                          {tr('缩小', 'Zoom out')}
                        </Button>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setTimelineZoom((prev) => clamp(prev * 2, 1, 8));
                          }}
                        >
                          {tr('放大', 'Zoom in')}
                        </Button>
                        <Button
                          variant="subtle"
                          size="sm"
                          onClick={() => {
                            setTimelineZoom(1);
                          }}
                        >
                          {tr('适配全长', 'Fit to full')}
                        </Button>
                        <span className="rounded-[var(--radius-sm)] border border-[var(--border)] px-2 py-1 text-[12px] text-[var(--muted-foreground)]">
                          {timelineZoom.toFixed(1)}x
                        </span>
                      </div>
                    </div>

                    <div className="overflow-x-auto pb-1">
                      <div className="relative min-h-[118px]" style={{ width: `${timelineWidthPercent}%` }}>
                        {timelineChapters.map((chapter, index) => {
                          const leftPercent = timelineDurationSeconds > 0 ? (chapter.startSeconds / timelineDurationSeconds) * 100 : 0;
                          const rightPercent = timelineDurationSeconds > 0 ? (chapter.endSeconds / timelineDurationSeconds) * 100 : 0;
                          const widthPercent = clamp(rightPercent - leftPercent, 0, 100);
                          return (
                            <div
                              key={chapter.id}
                              className={`absolute top-0 h-8 rounded-[var(--radius-sm)] border px-2 text-[11px] font-medium ${
                                index % 2 === 0
                                  ? 'border-[var(--fluent-blue)]/30 bg-[var(--fluent-blue-lighter)]/70'
                                  : 'border-[var(--neutral-40)] bg-white'
                              }`}
                              style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                            >
                              <span className="leading-7">{chapter.label}</span>
                            </div>
                          );
                        })}

                        {showPlayerEventUi &&
                          visibleTimelineEvents.map((event) => {
                            const leftPercent = timelineDurationSeconds > 0 ? (event.timeSeconds / timelineDurationSeconds) * 100 : 0;
                            const color = timelineEventMeta[event.kind].color;
                            return (
                              <button
                                key={event.id}
                                type="button"
                                className="absolute top-10 -translate-x-1/2 rounded-full border px-2 py-1 text-[11px] font-medium transition hover:-translate-y-[1px]"
                                style={{
                                  left: `${leftPercent}%`,
                                  borderColor: `${color}66`,
                                  background: `${color}22`,
                                  color,
                                }}
                                onClick={() => {
                                  jumpToTimelineEvent(event);
                                }}
                                onMouseEnter={() => setHoveredEventId(event.id)}
                                onMouseLeave={() => setHoveredEventId((prev) => (prev === event.id ? null : prev))}
                              >
                                {timelineEventMeta[event.kind].label}
                              </button>
                            );
                          })}

                        {showPlayerEventUi && hoveredTimelineEvent && (
                          <div
                            className="absolute top-[70px] z-20 w-64 -translate-x-1/2 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] p-2 shadow-[var(--shadow-lg)]"
                            style={{
                              left: `${clamp(
                                timelineDurationSeconds > 0
                                  ? (hoveredTimelineEvent.timeSeconds / timelineDurationSeconds) * 100
                                  : 0,
                                10,
                                90
                              )}%`,
                            }}
                          >
                            <p className="text-[12px] font-medium">
                              {hoveredTimelineEvent.title} · {formatTimelineTimestamp(hoveredTimelineEvent.timeSeconds)}
                            </p>
                            <p className="text-[12px] text-[var(--muted-foreground)]">{hoveredTimelineEvent.detail}</p>
                          </div>
                        )}

                        <div className="absolute bottom-0 left-0 right-0 h-12 px-1">
                          <div className="relative h-full">
                            <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--neutral-30)]" />
                            <div
                              className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--neutral-40)]"
                              style={{
                                width: `${
                                  timelineDurationSeconds > 0
                                    ? clamp((playerBufferedSeconds / timelineDurationSeconds) * 100, 0, 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <div
                              className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-[var(--fluent-blue)]"
                              style={{
                                width: `${
                                  timelineDurationSeconds > 0
                                    ? clamp((playerCurrentSeconds / timelineDurationSeconds) * 100, 0, 100)
                                    : 0
                                }%`,
                              }}
                            />
                            <input
                              className="player-seek-range absolute left-0 top-1/2 h-8 w-full -translate-y-1/2"
                              type="range"
                              min={0}
                              max={Math.max(0, timelineDurationSeconds)}
                              step={0.05}
                              value={clamp(playerCurrentSeconds, 0, Math.max(0, timelineDurationSeconds))}
                              onChange={(e) => {
                                seekPlayerTo(Number.parseFloat(e.target.value));
                              }}
                              onMouseDown={() => setPlayerControlsVisible(true)}
                              aria-label={tr('视频时间轴', 'Video timeline')}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--muted-foreground)]">
                      <span>{tr('键盘快捷键：空格播放/暂停，方向键可跳转。', 'Shortcuts: Space play/pause, arrow keys to seek.')}</span>
                      {showPlayerEventUi && (
                        <span>{tr('事件图层已预留 AI 标记能力。', 'Event layers are ready for AI markers.')}</span>
                      )}
                    </div>
                  </div>
                </div>

                {showPlayerEventUi && !isPlayerMiniMode && showPlayerEventPanel && (
                  <aside className="rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--neutral-10)] p-3">
                    <p className="text-[13px] font-medium mb-2">{tr('事件图层', 'Event layers')}</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {(Object.keys(timelineEventMeta) as TimelineEventKind[]).map((kind) => (
                        <button
                          key={`filter-${kind}`}
                          type="button"
                          className={`rounded-[var(--radius-sm)] border px-2 py-1 text-[12px] transition ${
                            timelineEventVisibility[kind]
                              ? 'border-[var(--fluent-blue)] bg-[var(--fluent-blue-lighter)] text-[var(--fluent-blue)]'
                              : 'border-[var(--border)] text-[var(--muted-foreground)]'
                          }`}
                          onClick={() => {
                            setTimelineEventVisibility((prev) => ({ ...prev, [kind]: !prev[kind] }));
                          }}
                        >
                          {timelineEventMeta[kind].label}
                        </button>
                      ))}
                    </div>

                    <p className="text-[13px] font-medium mb-2">{tr('事件列表', 'Event list')}</p>
                    {visibleTimelineEvents.length <= 0 ? (
                      <p className="text-[12px] text-[var(--muted-foreground)]">
                        {tr('当前筛选下暂无事件。', 'No events under current filters.')}
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
                        {visibleTimelineEvents.map((event) => (
                          <button
                            key={`list-${event.id}`}
                            type="button"
                            className="w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--card)] p-2 text-left hover:border-[var(--fluent-blue)]"
                            onClick={() => {
                              jumpToTimelineEvent(event);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[12px] font-medium">{event.title}</span>
                              <span className="text-[11px] text-[var(--muted-foreground)]">
                                {formatTimelineTimestamp(event.timeSeconds)}
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{event.detail}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 rounded-[var(--radius-sm)] border border-dashed border-[var(--border)] p-2">
                      <p className="text-[11px] font-medium flex items-center gap-1">
                        <Bookmark size={12} />
                        {tr('后续扩展', 'Future expansion')}
                      </p>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {tr(
                          '这里将接入 AI 自动标记、语音转文字索引和用户手动打点。',
                          'This panel will host AI markers, speech transcript anchors and user bookmarks.'
                        )}
                      </p>
                    </div>
                  </aside>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={closeDeleteModal}
        title={tr('确认删除视频记录', 'Confirm delete videos')}
        footer={
          <>
            <Button variant="subtle" onClick={closeDeleteModal} disabled={deleteLoading}>
              {tr('取消', 'Cancel')}
            </Button>
            <Button variant="destructive" onClick={() => void confirmBatchDelete()} disabled={deleteLoading || selectedIds.length <= 0}>
              {deleteLoading
                ? tr('删除中...', 'Deleting...')
                : tr('删除 {count} 条视频', 'Delete {count} videos').replace('{count}', String(selectedIds.length))}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-[14px] text-[var(--foreground)]">
            {tr('即将删除 {count} 条视频记录。该操作会修改本地录制索引，无法撤销。', 'You are about to delete {count} video records. This action cannot be undone.')
              .replace('{count}', String(selectedIds.length))}
          </p>
          <div className="p-3 bg-[var(--neutral-10)] rounded-[var(--radius-lg)]">
            <Switch checked={deleteFiles} onChange={setDeleteFiles} label={tr('同时删除对应的视频文件', 'Delete corresponding video files')} />
            <p className="text-[12px] text-[var(--muted-foreground)] mt-2">
              {tr('关闭时仅删除索引记录，视频文件会保留在磁盘上。', 'When disabled, only index records are removed and video files remain on disk.')}
            </p>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}

