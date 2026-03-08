const CACHE_BUSTER = Date.now();
const MANIFEST_SOURCES = [
  {
    url: `https://download.uniquerecord.com/downloads/latest.json?t=${CACHE_BUSTER}`,
    label: "R2",
  },
  {
    url: `/downloads/latest.json?t=${CACHE_BUSTER}`,
    label: "Pages fallback",
  },
];

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
  el.classList.toggle("warn", warn);
}

function setDownloadLink(url, fileName) {
  const link = document.getElementById("download-btn");
  if (!link) return;
  link.href = url;
  link.setAttribute("download", fileName || "");
}

async function loadManifest() {
  try {
    let manifest = null;
    let sourceLabel = "";
    let lastError = null;

    for (const source of MANIFEST_SOURCES) {
      try {
        const resp = await fetch(source.url, { cache: "no-store" });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        manifest = await resp.json();
        sourceLabel = source.label;
        break;
      } catch (err) {
        lastError = err;
        console.warn(`manifest load failed from ${source.label}`, err);
      }
    }

    if (!manifest) throw lastError || new Error("manifest unavailable");

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
        li.textContent = "No additional release notes were provided for this build.";
        notesEl.appendChild(li);
      }
    }

    setStatus(`Release manifest loaded successfully from ${sourceLabel}. The installer is ready to download.`);
  } catch (err) {
    console.error("failed to load manifest", err);
    setStatus("The download manifest is temporarily unavailable. Please try again later.", true);
  }
}

loadManifest();
