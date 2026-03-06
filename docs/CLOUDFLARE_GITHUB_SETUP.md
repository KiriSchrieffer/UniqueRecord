# Cloudflare + GitHub 连接说明

本项目使用以下发布模式：

- `Cloudflare Pages`：托管 `website/` 静态站点（官网与下载页）
- `Cloudflare R2`：托管安装器与下载清单文件
- `GitHub Actions`：自动打包安装器并上传到 R2，同时更新 `website/downloads/latest.json`

## 一次性配置

1. 在 Cloudflare 创建 R2 bucket（例如：`uniquerecord-downloads`）
2. 配置 R2 公网域名（例如：`https://download.uniquerecord.com`）
3. 在 GitHub 仓库添加 Secrets：

- `CF_ACCOUNT_ID`
- `CF_API_TOKEN`
- `CF_R2_BUCKET`
- `CF_R2_PUBLIC_BASE_URL`

4. 在 Cloudflare Pages 中连接 GitHub 仓库 `KiriSchrieffer/UniqueRecord`

- Production branch: `main`
- Build command: 留空
- Build output directory: `website`

## 发布流程

1. GitHub 仓库 -> `Actions` -> `Release Installer To R2`
2. 点击 `Run workflow`
3. 输入 `version`（例如 `1.0.1`）
4. 工作流将：

- 构建桌面程序与安装器
- 生成最新 `latest.json`
- 上传安装器与清单到 R2（`downloads/`）
- 提交 `website/downloads/latest.json` 到 `main`，触发 Pages 自动更新

