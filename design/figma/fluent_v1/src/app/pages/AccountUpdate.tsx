import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppLayout } from '../components/layout/AppLayout';
import { Card, CardHeader } from '../components/fluent/Card';
import { TextField } from '../components/fluent/TextField';
import { Button } from '../components/fluent/Button';
import {
  applyUpdate,
  downloadLatestUpdate,
  getAuthStatus,
  getUpdateStatus,
  loginWithEmail,
  logoutAccount,
  registerWithEmail,
  startGoogleLogin,
  type AuthStatusResponse,
  type UpdateStatusResponse,
} from '../lib/api';
import { useI18n } from '../i18n';

const EMPTY_AUTH: AuthStatusResponse = {
  authenticated: false,
  user: null,
  google_enabled: false,
};

function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return '--';
  }
  return value;
}

export default function AccountUpdate() {
  const { tr } = useI18n();

  const [auth, setAuth] = useState<AuthStatusResponse>(EMPTY_AUTH);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [googlePolling, setGooglePolling] = useState(false);

  const [updateStatus, setUpdateStatus] = useState<UpdateStatusResponse | null>(null);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [downloadedInstallerPath, setDownloadedInstallerPath] = useState<string | null>(null);

  const refreshAuth = useCallback(async () => {
    setAuthLoading(true);
    setAuthError(null);
    try {
      const status = await getAuthStatus();
      setAuth(status);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tr('读取账号状态失败', 'Failed to load account status'));
    } finally {
      setAuthLoading(false);
    }
  }, [tr]);

  const refreshUpdateStatus = useCallback(async () => {
    setUpdateLoading(true);
    setUpdateError(null);
    try {
      const status = await getUpdateStatus();
      setUpdateStatus(status);
      setDownloadedInstallerPath(status.downloaded_installer_path);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : tr('读取更新状态失败', 'Failed to load update status'));
    } finally {
      setUpdateLoading(false);
    }
  }, [tr]);

  useEffect(() => {
    void refreshAuth();
    void refreshUpdateStatus();
  }, [refreshAuth, refreshUpdateStatus]);

  useEffect(() => {
    if (!googlePolling) {
      return;
    }
    const timer = window.setInterval(() => {
      void getAuthStatus()
        .then((status) => {
          setAuth(status);
          if (status.authenticated) {
            setGooglePolling(false);
          }
        })
        .catch(() => {
          // Ignore transient errors.
        });
    }, 2000);
    return () => {
      window.clearInterval(timer);
    };
  }, [googlePolling]);

  const authSummary = useMemo(() => {
    if (!auth.authenticated || !auth.user) {
      return tr('未登录', 'Not signed in');
    }
    return `${auth.user.display_name || auth.user.email} (${auth.user.provider})`;
  }, [auth, tr]);

  const handleRegister = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const next = await registerWithEmail({ email, password, displayName });
      setAuth(next);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tr('注册失败', 'Registration failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const next = await loginWithEmail({ email, password });
      setAuth(next);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tr('登录失败', 'Sign-in failed'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      const next = await logoutAccount();
      setAuth(next);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tr('退出登录失败', 'Failed to sign out'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError(null);
    setAuthLoading(true);
    try {
      await startGoogleLogin();
      setGooglePolling(true);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : tr('Google 登录发起失败', 'Failed to start Google sign-in'));
    } finally {
      setAuthLoading(false);
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateError(null);
    setUpdateLoading(true);
    try {
      const result = await downloadLatestUpdate();
      setDownloadedInstallerPath(result.installer_path);
      setUpdateStatus(result.status);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : tr('下载安装包失败', 'Failed to download installer'));
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleApplyUpdate = async () => {
    setUpdateError(null);
    setUpdateLoading(true);
    try {
      await applyUpdate(downloadedInstallerPath || undefined);
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : tr('启动更新失败', 'Failed to launch updater'));
      setUpdateLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-[var(--text-3xl)] font-semibold mb-2">{tr('账号与更新', 'Account & Updates')}</h1>
          <p className="text-[14px] text-[var(--muted-foreground)]">
            {tr(
              '登录账号并在应用内下载安装最新版本。用户数据保存于本机用户目录，更新后不会丢失。',
              'Sign in and install new versions from inside the app. User data is stored under local user profile and survives updates.'
            )}
          </p>
        </div>

        {authError && (
          <Card padding="md">
            <p className="text-[13px] text-[var(--status-error)]">{authError}</p>
          </Card>
        )}

        {updateError && (
          <Card padding="md">
            <p className="text-[13px] text-[var(--status-error)]">{updateError}</p>
          </Card>
        )}

        <Card padding="lg">
          <CardHeader title={tr('账号登录', 'Account Sign-in')} subtitle={tr('支持邮箱注册/登录与 Google 登录', 'Supports email register/sign-in and Google sign-in')} />
          <div className="space-y-4">
            <p className="text-[13px] text-[var(--muted-foreground)]">
              {tr('当前状态：', 'Current status: ')}
              <span className="font-medium text-[var(--foreground)]">{authSummary}</span>
            </p>

            {!auth.authenticated && (
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label={tr('邮箱', 'Email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                  label={tr('显示名称（可选）', 'Display name (optional)')}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
                <TextField
                  label={tr('密码', 'Password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              {!auth.authenticated ? (
                <>
                  <Button variant="primary" onClick={() => void handleRegister()} disabled={authLoading}>
                    {tr('邮箱注册并登录', 'Register with email')}
                  </Button>
                  <Button variant="subtle" onClick={() => void handleLogin()} disabled={authLoading}>
                    {tr('邮箱登录', 'Sign in with email')}
                  </Button>
                  <Button
                    variant="subtle"
                    onClick={() => void handleGoogleLogin()}
                    disabled={authLoading || !auth.google_enabled}
                  >
                    {tr('Google 登录', 'Sign in with Google')}
                  </Button>
                  {googlePolling && (
                    <p className="text-[12px] text-[var(--muted-foreground)]">
                      {tr('已拉起浏览器，等待 Google 登录完成...', 'Browser opened. Waiting for Google sign-in...')}
                    </p>
                  )}
                </>
              ) : (
                <Button variant="subtle" onClick={() => void handleLogout()} disabled={authLoading}>
                  {tr('退出登录', 'Sign out')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <CardHeader title={tr('应用内更新', 'In-app Updates')} subtitle={tr('检测、下载并安装新版本', 'Check, download, and install new versions')} />
          <div className="space-y-3 text-[13px]">
            <p>
              {tr('当前版本：', 'Current build: ')}
              <span className="font-medium">{updateStatus?.current.version || '--'}</span>
              {tr('，构建时间：', ', built at: ')}
              <span>{formatTimestamp(updateStatus?.current.built_at_utc)}</span>
            </p>
            <p>
              {tr('最新发布：', 'Latest release: ')}
              <span className="font-medium">{updateStatus?.latest?.file_name || '--'}</span>
            </p>
            <p>
              {tr('更新时间：', 'Published at: ')}
              <span>{formatTimestamp(updateStatus?.latest?.published_at)}</span>
            </p>
            <p>
              {tr('是否可更新：', 'Update available: ')}
              <span className="font-medium">
                {updateStatus?.update_available ? tr('是', 'Yes') : tr('否', 'No')}
              </span>
            </p>
            {downloadedInstallerPath && (
              <p>
                {tr('已下载安装器：', 'Downloaded installer: ')}
                <span className="font-medium break-all">{downloadedInstallerPath}</span>
              </p>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button variant="subtle" onClick={() => void refreshUpdateStatus()} disabled={updateLoading}>
              {tr('检查更新', 'Check updates')}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleDownloadUpdate()}
              disabled={updateLoading || !updateStatus?.update_available}
            >
              {tr('下载更新', 'Download update')}
            </Button>
            <Button
              variant="primary"
              onClick={() => void handleApplyUpdate()}
              disabled={updateLoading || !downloadedInstallerPath}
            >
              {tr('安装并重启', 'Install and restart')}
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}

