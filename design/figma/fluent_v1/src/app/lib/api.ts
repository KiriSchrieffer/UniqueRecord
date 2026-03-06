export type UiStatus = 'idle' | 'detecting' | 'recording';

export interface RuntimeStatusResponse {
  service_running: boolean;
  ui_status: UiStatus;
  detector_state: string;
  session_id: string | null;
  recorder_backend: string;
  native_host_path: string | null;
  poll_interval_ms: number;
  signals: Record<string, unknown>;
  unavailable_signals: string[];
  recording_duration_seconds: number | null;
  session_index_path: string | null;
  recent_events: Array<Record<string, unknown>>;
}

export interface SessionHistoryItem {
  session_id: string;
  game_id: string;
  start_ts_unix_ms: number | null;
  end_ts_unix_ms: number | null;
  duration_ms: number | null;
  start_reason_code: string | null;
  stop_reason_code: string | null;
  status: string;
  output_path: string | null;
  recordings_output_dir: string | null;
  file_size_bytes: number | null;
  match_metadata?: SessionMatchMetadata | null;
}

export interface SessionMatchParticipant {
  is_local_player?: boolean;
  team: string | null;
  summoner_name: string | null;
  puuid: string | null;
  champion: string | null;
  kills: number | null;
  deaths: number | null;
  assists: number | null;
  result: string | null;
  items: string[];
  runes: string[];
}

export interface SessionMatchMetadata {
  source: string | null;
  game_id: string | number | null;
  queue_id: number | null;
  game_mode: string | null;
  duration_seconds: number | null;
  player_summary: SessionMatchParticipant | null;
  participants: SessionMatchParticipant[];
}

export interface RuntimeSettingsResponse {
  global: {
    poll_interval_ms: number | null;
    recordings_output_dir: string | null;
    recordings_output_dir_resolved: string | null;
    recordings_index_path: string | null;
  };
  ui: {
    language: string;
  };
  recording_profile: {
    resolution: string | null;
    fps: number | null;
    video_bitrate_kbps: number | null;
    audio_bitrate_kbps: number | null;
    container: string | null;
    encoder: string | null;
    audio_codec: string | null;
    hardware_encoding_enabled: boolean | null;
    audio_input_device: string | null;
    audio_input_enabled: boolean | null;
    audio_output_enabled: boolean | null;
  };
  detection: {
    auto_detect_enabled: boolean;
    detection_interval_seconds: number;
    control_host: string;
    control_port: number;
    control_token: string;
    host_auto_start: boolean;
    host_keep_alive: boolean;
    host_keep_alive_interval_seconds: number;
  };
}

export interface AudioDeviceItem {
  id: string;
  label: string;
}

export interface AudioDevicesResponse {
  supported: boolean;
  input_devices: AudioDeviceItem[];
  output_devices: AudioDeviceItem[];
  error?: string;
}

export interface RecordingSettingsUpdateRequest {
  savePath?: string;
  uiLanguage?: string;
  resolution?: string;
  fps?: number;
  videoBitrateKbps?: number;
  audioBitrateKbps?: number;
  container?: string;
  encoder?: string;
  audioCodec?: string;
  hardwareEncodingEnabled?: boolean;
  audioInputDevice?: string | null;
  audioInputEnabled?: boolean;
  audioOutputEnabled?: boolean;
}

export interface SaveRecordingSettingsResponse {
  ok: boolean;
  settings: RuntimeSettingsResponse;
  status: RuntimeStatusResponse;
}

export interface DetectionSettingsUpdateRequest {
  autoDetect?: boolean;
  detectionInterval?: number;
  controlHost?: string;
  controlPort?: number;
  controlToken?: string;
  hostAutoStart?: boolean;
  hostKeepAlive?: boolean;
  keepAliveInterval?: number;
}

export interface SaveDetectionSettingsResponse {
  ok: boolean;
  settings: RuntimeSettingsResponse;
  status: RuntimeStatusResponse;
}

export interface DeleteHistoryItemsResponse {
  ok: boolean;
  deleted_sessions: string[];
  deleted_count: number;
  removed_file_count: number;
  missing_file_count: number;
  file_delete_errors: string[];
  remaining_count: number;
}

const DEFAULT_API_BASE = import.meta.env.VITE_UNIQUE_RECORD_API_BASE || '';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${DEFAULT_API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });
  if (!response.ok) {
    let detail = '';
    try {
      const errorPayload = (await response.json()) as { error?: string };
      if (errorPayload?.error) {
        detail = ` - ${errorPayload.error}`;
      }
    } catch {
      // Ignore parse failures for non-JSON error bodies.
    }
    throw new Error(`Request failed: ${response.status} ${response.statusText}${detail}`);
  }
  return response.json() as Promise<T>;
}

export async function getRuntimeStatus(): Promise<RuntimeStatusResponse> {
  return request<RuntimeStatusResponse>('/api/status');
}

export async function getSessionHistory(limit = 20): Promise<SessionHistoryItem[]> {
  const payload = await request<{ items: SessionHistoryItem[] }>(`/api/history?limit=${limit}`);
  return payload.items || [];
}

export function getSessionMediaUrl(sessionId: string): string {
  const query = new URLSearchParams({ sessionId });
  return `${DEFAULT_API_BASE}/api/media/session?${query.toString()}`;
}

export async function getRuntimeSettings(): Promise<RuntimeSettingsResponse> {
  return request<RuntimeSettingsResponse>('/api/settings');
}

export async function getAudioDevices(): Promise<AudioDevicesResponse> {
  return request<AudioDevicesResponse>('/api/audio/devices');
}

export async function saveRecordingSettings(
  payload: RecordingSettingsUpdateRequest
): Promise<SaveRecordingSettingsResponse> {
  return request<SaveRecordingSettingsResponse>('/api/settings/recording', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveDetectionSettings(
  payload: DetectionSettingsUpdateRequest
): Promise<SaveDetectionSettingsResponse> {
  return request<SaveDetectionSettingsResponse>('/api/settings/detection', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function startService(): Promise<RuntimeStatusResponse> {
  const payload = await request<{ status: RuntimeStatusResponse }>('/api/service/start', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return payload.status;
}

export async function stopService(): Promise<RuntimeStatusResponse> {
  const payload = await request<{ status: RuntimeStatusResponse }>('/api/service/stop', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return payload.status;
}

export async function startRecordingManually(): Promise<RuntimeStatusResponse> {
  const payload = await request<{ status: RuntimeStatusResponse }>('/api/recording/start', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return payload.status;
}

export async function stopRecordingManually(): Promise<RuntimeStatusResponse> {
  const payload = await request<{ status: RuntimeStatusResponse }>('/api/recording/stop', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return payload.status;
}

export async function openPathInExplorer(
  path: string,
  options?: { revealInFolder?: boolean }
): Promise<void> {
  await request<{ ok: boolean; target: string; action: string }>('/api/fs/open-path', {
    method: 'POST',
    body: JSON.stringify({
      path,
      revealInFolder: Boolean(options?.revealInFolder),
    }),
  });
}

export async function openRecordingsDir(path?: string): Promise<void> {
  await request<{ ok: boolean; target: string; action: string }>('/api/fs/open-recordings-dir', {
    method: 'POST',
    body: JSON.stringify(path ? { path } : {}),
  });
}

export async function selectDirectory(initialPath?: string): Promise<string | null> {
  const payload = await request<{ ok: boolean; selected: boolean; path: string | null }>(
    '/api/fs/select-directory',
    {
      method: 'POST',
      body: JSON.stringify(initialPath ? { initialPath } : {}),
    }
  );
  if (!payload.selected) {
    return null;
  }
  return payload.path;
}

export async function deleteHistoryItems(
  sessionIds: string[],
  options?: { deleteFiles?: boolean }
): Promise<DeleteHistoryItemsResponse> {
  return request<DeleteHistoryItemsResponse>('/api/history/delete', {
    method: 'POST',
    body: JSON.stringify({
      sessionIds,
      deleteFiles: Boolean(options?.deleteFiles),
    }),
  });
}

export function formatDurationHms(totalSeconds: number | null): string {
  if (totalSeconds === null || totalSeconds < 0) {
    return '00:00:00';
  }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatDateTime(valueMs: number | null): string {
  if (valueMs === null) {
    return '--';
  }
  const date = new Date(valueMs);
  if (Number.isNaN(date.getTime())) {
    return '--';
  }
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export function formatFileSize(sizeBytes: number | null): string {
  if (sizeBytes === null || sizeBytes <= 0) {
    return '--';
  }
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = sizeBytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  if (unitIndex === 0) {
    return `${value} ${units[unitIndex]}`;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
