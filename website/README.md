# UniqueRecord Website

Static website for `uniquerecord.com`:

- `/` -> intro page
- `/download.html` -> download page

## Structure

- `index.html` intro page
- `download.html` download page
- `assets/site.css` shared styles
- `assets/download.js` download page script
- `assets/logo.png` website logo
- `downloads/latest.json` current release manifest
- `downloads/UniqueRecord_Setup_*.exe` installer binary

## Cloudflare Pages + R2 deployment (recommended)

Use Cloudflare Pages for HTML/CSS/JS and Cloudflare R2 for installer binaries.

1. Bind a public R2 domain such as `https://download.uniquerecord.com`.
2. Prepare release artifacts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\prepare_cloudflare_pages_r2.ps1 `
  -R2PublicBaseUrl "https://download.uniquerecord.com"
```

3. Upload `build/cloudflare_pages_upload/website` to Cloudflare Pages (static files).
4. Upload `build/cloudflare_r2_upload/downloads` contents to your R2 bucket path `downloads/`.

Output details:

- Pages upload root: `build/cloudflare_pages_upload/website`
- R2 upload root: `build/cloudflare_r2_upload/downloads`
- `latest.json` in Pages will point download URL to your R2 public domain.

This avoids the 25 MB single-file upload limit of Cloudflare Pages.

## Update download manifest for new installer

Use (legacy mode, installer copied into website folder):

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\publish_website_download.ps1
```

This script will:

- find latest `dist_installer/UniqueRecord_Setup_*.exe`
- copy installer to `website/downloads/`
- compute SHA-256
- update `website/downloads/latest.json`
