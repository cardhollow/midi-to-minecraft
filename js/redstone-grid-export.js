function sanitizeFileName(name) {
  return String(name || "Redstone_Grid")
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .trim()
    .replace(/\s+/g, "_") || "Redstone_Grid";
}

function uuid() {
  if (crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  const a = crypto.getRandomValues(new Uint8Array(16));

  a[6] = (a[6] & 15) | 64;
  a[8] = (a[8] & 63) | 128;

  const h = Array.from(a).map(function (x) {
    return x.toString(16).padStart(2, "0");
  }).join("");

  return (
    h.slice(0, 8) + "-" +
    h.slice(8, 12) + "-" +
    h.slice(12, 16) + "-" +
    h.slice(16, 20) + "-" +
    h.slice(20)
  );
}

const crcTable = (function () {
  const table = new Uint32Array(256);

  for (let n = 0; n < 256; n++) {
    let c = n;

    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xEDB88320 ^ (c >>> 1);
      } else {
        c = c >>> 1;
      }
    }

    table[n] = c >>> 0;
  }

  return table;
})();

function crc32(bytes) {
  let c = 0xFFFFFFFF;

  for (const byte of bytes) {
    c = crcTable[(c ^ byte) & 255] ^ (c >>> 8);
  }

  return (c ^ 0xFFFFFFFF) >>> 0;
}

function u16(value) {
  return new Uint8Array([
    value & 255,
    (value >>> 8) & 255
  ]);
}

function u32(value) {
  return new Uint8Array([
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255
  ]);
}

function concatBytes(parts) {
  const total = parts.reduce(function (sum, part) {
    return sum + part.length;
  }, 0);

  const output = new Uint8Array(total);
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

function toBytes(data) {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  return new TextEncoder().encode(String(data));
}

function zipStore(files) {
  const encoder = new TextEncoder();
  const now = new Date();

  const dosTime =
    (now.getHours() << 11) |
    (now.getMinutes() << 5) |
    Math.floor(now.getSeconds() / 2);

  const dosDate =
    ((now.getFullYear() - 1980) << 9) |
    ((now.getMonth() + 1) << 5) |
    now.getDate();

  const locals = [];
  const centrals = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const dataBytes = toBytes(file.data);
    const crc = crc32(dataBytes);

    const localHeader = concatBytes([
      u32(0x04034B50),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      nameBytes
    ]);

    locals.push(localHeader, dataBytes);

    const centralHeader = concatBytes([
      u32(0x02014B50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(dosTime),
      u16(dosDate),
      u32(crc),
      u32(dataBytes.length),
      u32(dataBytes.length),
      u16(nameBytes.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      nameBytes
    ]);

    centrals.push(centralHeader);
    offset += localHeader.length + dataBytes.length;
  }

  const body = concatBytes(locals);
  const centralDirectory = concatBytes(centrals);
  const eocd = concatBytes([
    u32(0x06054B50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(centralDirectory.length),
    u32(body.length),
    u16(0)
  ]);

  return concatBytes([body, centralDirectory, eocd]);
}

function canvasToPngBytes() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(24, 24, 208, 208);
  ctx.fillStyle = "#000000";
  ctx.fillRect(40, 40, 176, 176);

  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 92px Arial, Helvetica, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("RG", 128, 118);

  ctx.font = "bold 24px Arial, Helvetica, sans-serif";
  ctx.fillText("REDSTONE", 128, 174);

  const dataUrl = canvas.toDataURL("image/png");
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const output = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    output[i] = binary.charCodeAt(i);
  }

  return output;
}

function createManifest(packName, packUuid, moduleUuid) {
  return {
    format_version: 2,
    header: {
      name: packName,
      description: "Generated Redstone Grid behavior pack",
      uuid: packUuid,
      version: [1, 0, 0],
      min_engine_version: [1, 21, 0]
    },
    modules: [{
      description: "Redstone Grid behavior pack",
      type: "data",
      uuid: moduleUuid,
      version: [1, 0, 0]
    }]
  };
}

function buildMcFunctionText() {
  if (typeof generateCommands === "function") {
    const result = generateCommands();
    if (typeof result !== "string") {
      throw new Error("generateCommands() must return a string.");
    }
    return result;
  }
  throw new Error("generateCommands() was not found.");
}

function getStructureFiles() {
  const files = [];
  for (let i = 0; i <= 24; i++) {
    const number = String(i).padStart(2, "0");
    files.push({
      source: "structures/note" + number + ".mcstructure",
      name: "structures/note" + number + ".mcstructure"
    });
  }
  return files;
}

async function fetchBinaryFile(path) {
  let response;
  try {
    response = await fetch(path, { cache: "no-store" });
  } catch (error) {
    throw new Error(
      "Error:\n" + error + "\n\n" +
      "Cannot access:\n" + path + "\n\n" +
      "Please reload and try again!"
    );
  }

  if (!response.ok) {
    throw new Error(
      "Failed to load:\n" + path + "\n\n" +
      "HTTP " + response.status + " " + response.statusText
    );
  }

  return new Uint8Array(await response.arrayBuffer());
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function getBuildCommand() {
  const input = document.getElementById("mcpackBuildCommandInput");

  if (!input) {
    return "build";
  }

  const value = input.value.trim();

  return value === "" ? "build" : value;
}

function createExportModal() {
  const existing = document.getElementById("mcpackExportModal");
  if (existing) return existing;

  const modal = document.createElement("div");
  modal.id = "mcpackExportModal";

  modal.innerHTML = `
      <div class="mcpack-modal-box">
        <div class="mcpack-modal-title">Export MCPACK</div>

        <div class="mcpack-hint">
          <b>Required folder structure:</b>
          <div>
            The MCPACK will contain:
            <br><br>
            <code>functions/${getBuildCommand()}.mcfunction</code>
            <br>
            <code>structures/note00.mcstructure</code>
            through <code>note24.mcstructure</code>
            <br><br>
          </div>
        </div>

        <label class="mcpack-label">Custom Command</label>
        <input
          id="mcpackBuildCommandInput"
          class="mcpack-name-input"
          type="text"
          value="build"
          placeholder="build"
          autocomplete="off"
          spellcheck="false"
          pattern="[A-Za-z0-9_]+"
          maxlength="64"
        >

        <div class="mcpack-command-hint">
          Only letters, numbers, and underscores are allowed.
        </div>

        <label class="mcpack-label">Behavior Pack Name</label>
        <input
          id="mcpackNameInput"
          class="mcpack-name-input"
          type="text"
          value="Redstone Grid"
          autocomplete="off"
          spellcheck="false"
        >

        <div class="mcpack-progress-wrap">
          <div class="mcpack-progress-track">
            <div id="mcpackProgressBar" class="mcpack-progress-bar"></div>
          </div>

          <div id="mcpackProgressPercent" class="mcpack-progress-percent">
            0%
          </div>
        </div>

        <div id="mcpackStatus" class="mcpack-status">
          Ready to export.
        </div>

        <div id="mcpackDownloadArea" class="mcpack-download-area"></div>

        <div class="mcpack-modal-buttons">
          <button id="mcpackCancelButton" class="mcpack-button">
            Cancel
          </button>

          <button
            id="mcpackExportButton"
            class="mcpack-button mcpack-primary"
          >
            Build MCPACK
          </button>
        </div>
      </div>
    `;

  const style = document.createElement("style");

  style.textContent = `
      #mcpackExportModal {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 18px;
        box-sizing: border-box;
        background: rgba(0, 0, 0, 0.78);
      }

      #mcpackExportModal.visible {
        display: flex;
      }

      .mcpack-modal-box {
        width: min(460px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        padding: 20px;
        box-sizing: border-box;
        border-radius: 15px;
        background: #181818;
        color: #ffffff;
        box-shadow: 0 20px 70px rgba(0, 0, 0, 0.7);
        font-family: Arial, Helvetica, sans-serif;
      }

      .mcpack-modal-title {
        margin-bottom: 15px;
        font-size: 21px;
        font-weight: 700;
      }

      .mcpack-hint {
        margin-bottom: 17px;
        padding: 13px;
        border-radius: 9px;
        background: #242424;
        color: #cccccc;
        font-size: 13px;
        line-height: 1.45;
      }

      .mcpack-hint pre {
        margin: 10px 0;
        padding: 10px;
        overflow-x: auto;
        border-radius: 7px;
        background: #101010;
        color: #ffffff;
        font-family: monospace;
        font-size: 12px;
      }

      .mcpack-hint code {
        color: #ffffff;
        font-family: monospace;
        font-size: 11px;
      }

      .mcpack-label {
        display: block;
        margin-bottom: 7px;
        color: #bbbbbb;
        font-size: 13px;
      }

      .mcpack-name-input {
        width: 100%;
        padding: 11px 12px;
        box-sizing: border-box;
        border: 1px solid #444444;
        border-radius: 8px;
        outline: none;
        background: #101010;
        color: #ffffff;
        font-size: 15px;
      }

      .mcpack-name-input:focus {
        border-color: #777777;
      }

      .mcpack-command-hint {
        margin-top: 6px;
        margin-bottom: 15px;
        color: #777777;
        font-size: 11px;
      }

      .mcpack-progress-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 15px;
      }

      .mcpack-progress-track {
        flex: 1;
        height: 8px;
        overflow: hidden;
        border-radius: 999px;
        background: #333333;
      }

      .mcpack-progress-bar {
        width: 0%;
        height: 100%;
        border-radius: 999px;
        background: #ffffff;
        transition: width 0.15s ease;
      }

      .mcpack-progress-percent {
        width: 42px;
        color: #cccccc;
        text-align: right;
        font-size: 12px;
        font-family: monospace;
      }

      .mcpack-status {
        min-height: 50px;
        margin-top: 12px;
        padding: 10px;
        box-sizing: border-box;
        border-radius: 8px;
        background: #101010;
        color: #aaaaaa;
        font-size: 12px;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .mcpack-download-area {
        margin-top: 10px;
      }

      .mcpack-download-button {
        width: 100%;
        min-height: 44px;
        border: 0;
        border-radius: 8px;
        background: #ffffff;
        color: #000000;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
      }

      .mcpack-modal-buttons {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }

      .mcpack-button {
        flex: 1;
        min-height: 43px;
        border: 0;
        border-radius: 8px;
        background: #303030;
        color: #ffffff;
        font-size: 14px;
        cursor: pointer;
      }

      .mcpack-primary {
        background: #ffffff;
        color: #000000;
        font-weight: 700;
      }

      .mcpack-button:disabled {
        opacity: 0.45;
        cursor: default;
      }

      .mcpack-name-input:invalid {
        border-color: #aa4444;
      }
    `;

  document.head.appendChild(style);
  document.body.appendChild(modal);

  const commandInput = modal.querySelector("#mcpackBuildCommandInput");
  const nameInput = modal.querySelector("#mcpackNameInput");
  const cancelButton = modal.querySelector("#mcpackCancelButton");
  const exportButton = modal.querySelector("#mcpackExportButton");
  const status = modal.querySelector("#mcpackStatus");
  const progressBar = modal.querySelector("#mcpackProgressBar");
  const progressPercent = modal.querySelector("#mcpackProgressPercent");
  const downloadArea = modal.querySelector("#mcpackDownloadArea");

  /*
   * Only allow:
   * A-Z
   * a-z
   * 0-9
   * _
   */
  commandInput.addEventListener("input", function () {
    this.value = this.value.replace(/[^A-Za-z0-9_]/g, "");

    updateBuildCommandPreview();
  });

  /*
   * Updates the displayed:
   *
   * functions/build.mcfunction
   *
   * to:
   *
   * functions/my_command.mcfunction
   */
  function updateBuildCommandPreview() {
    const command = getBuildCommand();

    const hint = modal.querySelector(".mcpack-hint div");

    if (!hint) return;

    hint.innerHTML = `
      The MCPACK will contain:
      <br><br>
      <code>functions/${command}.mcfunction</code>
      <br>
      <code>structures/note00.mcstructure</code>
      through <code>note24.mcstructure</code>
      <br><br>
    `;
  }

  cancelButton.addEventListener("click", function () {
    if (!exportButton.disabled) {
      modal.classList.remove("visible");
    }
  });

  modal.addEventListener("click", function (event) {
    if (
      event.target === modal &&
      !exportButton.disabled
    ) {
      modal.classList.remove("visible");
    }
  });

  exportButton.addEventListener("click", function () {
    const command = getBuildCommand();

    if (!/^[A-Za-z0-9_]+$/.test(command)) {
      status.textContent =
        "Invalid custom command. Only letters, numbers, and underscores are allowed.";

      commandInput.focus();
      return;
    }

    startMcpackExport(
      modal,
      nameInput,
      status,
      progressBar,
      progressPercent,
      downloadArea,
      exportButton
    );
  });

  return modal;
}

function startDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 10000);
  return url;
}

async function startMcpackExport(modal, nameInput, status, progressBar, progressPercent, downloadArea, exportButton) {
  const packName = nameInput.value.trim() || "Redstone Grid";
  const safeName = sanitizeFileName(packName);
  const filename = safeName + ".mcpack";

  exportButton.disabled = true;
  downloadArea.innerHTML = "";
  progressBar.style.width = "0%";
  progressPercent.textContent = "0%";

  try {
    if (typeof DATA === "undefined" || !DATA || !DATA.Layers) {
      throw new Error("No circuit data found to export.");
    }

    status.textContent = "Generating commands...";
    progressBar.style.width = "5%";
    progressPercent.textContent = "5%";

    await new Promise(function (resolve) { setTimeout(resolve, 20); });

    const commands = buildMcFunctionText();
    const packUuid = uuid();
    const moduleUuid = uuid();
    const manifest = createManifest(packName, packUuid, moduleUuid);
    const packIconBytes = canvasToPngBytes();
    const structureEntries = getStructureFiles();
    const structureFiles = [];
    let totalBytes = 0;

    for (let i = 0; i < structureEntries.length; i++) {
      const entry = structureEntries[i];
      const current = i + 1;
      const total = structureEntries.length;
      const percent = 10 + Math.round((current / total) * 70);

      progressBar.style.width = percent + "%";
      progressPercent.textContent = percent + "%";

      status.textContent = "Loading structure " + current + " / " + total + "\n\n" + entry.source;

      const data = await fetchBinaryFile(entry.source);
      totalBytes += data.length;
      structureFiles.push({ name: entry.name, data: data });

      status.textContent = "Loaded structure " + current + " / " + total + "\n\n" + entry.source + "\n" + formatBytes(data.length);
    }

    progressBar.style.width = "82%";
    progressPercent.textContent = "82%";
    status.textContent = "All 25 structures loaded.\n\nBuilding MCPACK...";

    const files = [
      { name: "manifest.json", data: JSON.stringify(manifest, null, 2) },
      { name: "pack_icon.png", data: packIconBytes },
      { name: "functions/", data: new Uint8Array(0) },
      { name: "structures/", data: new Uint8Array(0) },
      { name: "functions/build.mcfunction", data: commands },
      ...structureFiles
    ];

    await new Promise(function (resolve) { setTimeout(resolve, 30); });

    progressBar.style.width = "90%";
    progressPercent.textContent = "90%";

    const mcpack = zipStore(files);

    progressBar.style.width = "100%";
    progressPercent.textContent = "100%";

    const blob = new Blob([mcpack], { type: "application/octet-stream" });

    status.textContent = "MCPACK ready!\n\n" + filename + "\n" + formatBytes(mcpack.length) + "\n\n" + "Tap Download MCPACK if the automatic download does not appear.";

    const downloadUrl = URL.createObjectURL(blob);
    const downloadButton = document.createElement("button");
    downloadButton.className = "mcpack-download-button";
    downloadButton.textContent = "Download MCPACK";
    downloadButton.addEventListener("click", function () {
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      status.textContent = "Download requested.\n\n" + filename;
    });

    downloadArea.appendChild(downloadButton);

    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);

    try {
      link.click();
    } catch (error) {
      console.warn("Automatic download blocked.", error);
    }

    link.remove();

    setTimeout(function () {
      URL.revokeObjectURL(downloadUrl);
    }, 60000);

  } catch (error) {
    console.error("MCPACK export error:", error);
    progressBar.style.width = "0%";
    progressPercent.textContent = "0%";
    status.textContent = "EXPORT FAILED\n\n" + error.message;
  } finally {
    exportButton.disabled = false;
  }
}

function openMcpackExportModal() {
  const modal = createExportModal();
  const nameInput = modal.querySelector("#mcpackNameInput");
  const status = modal.querySelector("#mcpackStatus");
  const progressBar = modal.querySelector("#mcpackProgressBar");
  const progressPercent = modal.querySelector("#mcpackProgressPercent");
  const downloadArea = modal.querySelector("#mcpackDownloadArea");
  const exportButton = modal.querySelector("#mcpackExportButton");

  nameInput.value = "Redstone Grid";
  status.textContent = "Ready to export.\n\n25 structure files will be loaded from /structures/.";
  progressBar.style.width = "0%";
  progressPercent.textContent = "0%";
  downloadArea.innerHTML = "";
  exportButton.disabled = false;
  modal.classList.add("visible");

  setTimeout(function () {
    nameInput.focus();
    nameInput.select();
  }, 50);
}

const exportMcpackButton = document.createElement("button");
exportMcpackButton.id = "exportMcpackButton";
exportMcpackButton.className = "tab";
exportMcpackButton.textContent = "Export MCPACK";

const tabBar = document.querySelector(".tab-bar");
if (tabBar) {
  tabBar.appendChild(exportMcpackButton);
} else {
  console.error("Could not find .tab-bar");
}

exportMcpackButton.addEventListener("click", openMcpackExportModal);
window.downloadMcpack = openMcpackExportModal;
