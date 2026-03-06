const MANIFEST_URL = `/downloads/latest.json?t=${Date.now()}`;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let idx = 0;
  while (value >= 1024 && idx < units.length - 1) {
    value /= 1024;
    idx += 1;
  }
  return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatus(text, warn = false) {
  const el = document.getElementById("download-status");
  if (!el) return;
  el.textContent = text;
  if (warn) {
    el.classList.add("warn");
  } else {
    el.classList.remove("warn");
  }
}

function setDownloadLink(url, fileName) {
  const link = document.getElementById("download-btn");
  if (!link) return;
  link.href = url;
  link.setAttribute("download", fileName || "");
}

async function loadManifest() {
  try {
    const resp = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const manifest = await resp.json();

    const version = manifest.version || "unknown";
    const publishedAt = manifest.published_at || "-";
    const sizeBytes = Number(manifest.size_bytes || 0);
    const sha256 = manifest.sha256 || "-";
    const url = manifest.url || "#";
    const fileName = manifest.file_name || "";
    const notes = Array.isArray(manifest.notes) ? manifest.notes : [];

    setText("release-version", version);
    setText("release-time", publishedAt);
    setText("release-size", formatBytes(sizeBytes));
    setText("release-hash", sha256);
    setDownloadLink(url, fileName);

    const notesEl = document.getElementById("release-notes");
    if (notesEl) {
      notesEl.innerHTML = "";
      notes.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = String(item);
        notesEl.appendChild(li);
      });
      if (notes.length === 0) {
        const li = document.createElement("li");
        li.textContent = "当前版本未提供额外说明。";
        notesEl.appendChild(li);
      }
    }

    setStatus("下载信息已更新，可以直接下载安装。");
  } catch (err) {
    console.error("failed to load manifest", err);
    setStatus("暂时无法读取下载清单，请稍后重试或联系站点管理员。", true);
  }
}

loadManifest();
