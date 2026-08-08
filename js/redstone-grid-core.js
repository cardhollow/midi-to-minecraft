const NOTE_BLOCK_BASE = 184.997;
const REPEATER_DELAY_MS = 100;

let DATA = {
  Layers: {
    0: [{
      block: "redstone_all"
    }, {
      extraBlocks: [{
        block: "repeater",
        delay: 3,
        index: 0
      }, {
        block: "repeater",
        delay: 3,
        index: 2
      }, {
        block: "repeater",
        delay: 3,
        index: 4
      }, {
        block: "repeater",
        delay: 3,
        index: 6
      }, {
        block: "repeater",
        delay: 3,
        index: 8
      }, {
        block: "repeater",
        delay: 3,
        index: 10
      }, {
        block: "repeater",
        delay: 3,
        index: 12
      }, {
        block: "repeater",
        delay: 3,
        index: 14
      }, {
        block: "repeater",
        delay: 3,
        index: 16
      }, {
        block: "repeater",
        delay: 3,
        index: 18
      }, {
        block: "repeater",
        delay: 3,
        index: 20
      }, {
        block: "repeater",
        delay: 3,
        index: 22
      }, {
        block: "repeater",
        delay: 3,
        index: 24
      }, {
        block: "repeater",
        delay: 3,
        index: 26
      }, {
        block: "repeater",
        delay: 3,
        index: 28
      }, {
        block: "repeater",
        delay: 3,
        index: 30
      }, {
        block: "repeater",
        delay: 3,
        index: 32
      }, {
        block: "repeater",
        delay: 3,
        index: 34
      }, {
        block: "repeater",
        delay: 3,
        index: 36
      }, {
        block: "repeater",
        delay: 3,
        index: 38
      }, {
        block: "repeater",
        delay: 3,
        index: 40
      }, {
        block: "repeater",
        delay: 3,
        index: 42
      }, {
        block: "repeater",
        delay: 3,
        index: 44
      }, {
        block: "repeater",
        delay: 3,
        index: 46
      }, {
        block: "repeater",
        delay: 3,
        index: 48
      }, {
        block: "dirt",
        note: 0,
        index: 1
      }, {
        block: "dirt",
        note: 0,
        index: 3
      }, {
        block: "dirt",
        note: 2,
        index: 5
      }, {
        block: "dirt",
        note: 0,
        index: 7
      }, {
        block: "dirt",
        note: 5,
        index: 9
      }, {
        block: "dirt",
        note: 4,
        index: 11
      }, {
        block: "dirt",
        note: 0,
        index: 13
      }, {
        block: "dirt",
        note: 0,
        index: 15
      }, {
        block: "dirt",
        note: 2,
        index: 17
      }, {
        block: "dirt",
        note: 0,
        index: 19
      }, {
        block: "dirt",
        note: 7,
        index: 21
      }, {
        block: "dirt",
        note: 5,
        index: 23
      }, {
        block: "dirt",
        note: 0,
        index: 25
      }, {
        block: "dirt",
        note: 0,
        index: 27
      }, {
        block: "dirt",
        note: 12,
        index: 29
      }, {
        block: "dirt",
        note: 9,
        index: 31
      }, {
        block: "dirt",
        note: 5,
        index: 33
      }, {
        block: "dirt",
        note: 4,
        index: 35
      }, {
        block: "dirt",
        note: 2,
        index: 37
      }, {
        block: "dirt",
        note: 11,
        index: 39
      }, {
        block: "dirt",
        note: 11,
        index: 41
      }, {
        block: "dirt",
        note: 9,
        index: 43
      }, {
        block: "dirt",
        note: 5,
        index: 45
      }, {
        block: "dirt",
        note: 7,
        index: 47
      }, {
        block: "dirt",
        note: 5,
        index: 49
      }]
    }]
  }
};

function expandRedstoneAll() {
  const layerNumbers = Object.keys(DATA.Layers).map(Number).sort((a, b) => a - b);
  const extraBlocksByLayer = {};
  for (const layerNumber of layerNumbers) {
    const layer = DATA.Layers[layerNumber];
    if (!layer) continue;
    const extras = [];
    for (const entry of layer) {
      if (entry && Array.isArray(entry.extraBlocks)) {
        for (const extra of entry.extraBlocks) {
          if (!extra || !Number.isInteger(Number(extra.index))) continue;
          extras.push({
            ...extra,
            index: Number(extra.index)
          });
        }
      }
    }
    extraBlocksByLayer[layerNumber] = extras;
  }

  for (const layerNumber of layerNumbers) {
    const layer = DATA.Layers[layerNumber];
    if (!layer) continue;

    const belowLayerNumber = getAdjacentLayer(layerNumber, "down");
    const belowLayer = belowLayerNumber === null ? null : DATA.Layers[belowLayerNumber];

    for (let x = 0; x < layer.length; x++) {
      const cell = layer[x];
      if (!cell || cell.block !== "redstone_all") continue;

      if (!belowLayer) {
        layer[x] = null;
        continue;
      }

      let lastRedstone = -1;
      for (let i = 0; i < belowLayer.length; i++) {
        const belowCell = belowLayer[i];
        if (belowCell && belowCell.block === "redstone") {
          lastRedstone = i;
        }
      }

      if (lastRedstone < 0) {
        layer[x] = null;
        continue;
      }

      for (let i = 0; i <= lastRedstone; i++) {
        layer[i] = { block: "redstone" };
      }
    }
  }

  for (const layerNumber of layerNumbers) {
    const layer = DATA.Layers[layerNumber];
    if (!layer) continue;
    const extras = extraBlocksByLayer[layerNumber] || [];
    for (const extra of extras) {
      const index = Number(extra.index);
      if (!Number.isInteger(index) || index < 0 || index >= GRID_WIDTH) continue;
      const replacement = { ...extra };
      delete replacement.index;
      layer[index] = replacement;
      for (let i = 0; i < layer.length; i++) {
        if (layer[i] === null || layer[i] === undefined) {
          layer[i] = { block: "redstone" };
        }
      }
    }
  }
}

let GRID_WIDTH = 16;

function adjustWidth() {
  let width = 0;
  for (const layerNumber of Object.keys(DATA.Layers)) {
    const layer = DATA.Layers[layerNumber];
    if (!Array.isArray(layer)) continue;
    width = Math.max(width, layer.length);
    for (const entry of layer) {
      if (!entry || !Array.isArray(entry.extraBlocks)) continue;
      for (const extra of entry.extraBlocks) {
        if (extra && Number.isInteger(Number(extra.index))) {
          width = Math.max(width, Number(extra.index) + 1);
        }
      }
    }
  }
  GRID_WIDTH = Math.max(16, width);
  document.documentElement.style.setProperty("--grid-width", GRID_WIDTH);
}

const BLOCKS = {
  dirt: { className: "block-dirt", displayName: "Dirt" },
  plank: { className: "block-plank", displayName: "Plank" },
  stone: { className: "block-stone", displayName: "Stone" },
  sand: { className: "block-sand", displayName: "Sand" },
  iron: { className: "block-iron", displayName: "Iron" },
  repeater: { className: "block-repeater", displayName: "Repeater" }
};

function getLayer(layerNumber) {
  return DATA.Layers[layerNumber] || [];
}

function getCell(layerNumber, x) {
  const layer = getLayer(layerNumber);
  return layer[x] || null;
}

function hasAdjacentBlock(layerNumber, x) {
  const cell = getCell(layerNumber, x);
  return !!cell;
}

function hasRedstone(layerNumber, x) {
  if (layerNumber === null) return false;
  const cell = getCell(layerNumber, x);
  return !!(cell && cell.block === "redstone");
}

function getAdjacentLayer(layerNumber, direction) {
  const layers = Object.keys(DATA.Layers).map(Number).sort((a, b) => a - b);
  const currentIndex = layers.indexOf(Number(layerNumber));
  if (currentIndex === -1) return null;
  if (direction === "up") {
    if (currentIndex <= 0) return null;
    return layers[currentIndex - 1];
  }
  if (direction === "down") {
    if (currentIndex >= layers.length - 1) return null;
    return layers[currentIndex + 1];
  }
  return null;
}

function getRedstoneConnections(layerNumber, x) {
  return {
    left: hasAdjacentBlock(layerNumber, x - 1),
    right: hasAdjacentBlock(layerNumber, x + 1),
    up: hasRedstone(getAdjacentLayer(layerNumber, "up"), x),
    down: hasRedstone(getAdjacentLayer(layerNumber, "down"), x)
  };
}

function getRedstoneShape(connections) {
  const count = Number(connections.left) + Number(connections.right) + Number(connections.up) + Number(connections.down);
  if (count === 0) return "single";
  if (count === 4) return "cross";
  if (count === 3) return "t";
  if (count === 2) {
    if (connections.left && connections.right) return "horizontal";
    if (connections.up && connections.down) return "vertical";
    return "l";
  }
  if (connections.left || connections.right) return "horizontal";
  return "vertical";
}

function createRedstone(layerNumber, x) {
  const connections = getRedstoneConnections(layerNumber, x);
  const redstone = document.createElement("div");
  redstone.className = "redstone";
  if (connections.left) {
    const arm = document.createElement("div");
    arm.className = "redstone-arm redstone-left";
    redstone.appendChild(arm);
  }
  if (connections.right) {
    const arm = document.createElement("div");
    arm.className = "redstone-arm redstone-right";
    redstone.appendChild(arm);
  }
  if (connections.up) {
    const arm = document.createElement("div");
    arm.className = "redstone-arm redstone-up";
    redstone.appendChild(arm);
  }
  if (connections.down) {
    const arm = document.createElement("div");
    arm.className = "redstone-arm redstone-down";
    redstone.appendChild(arm);
  }
  return redstone;
}

function createBlock(cell) {
  const blockInfo = BLOCKS[cell.block];
  if (!blockInfo) return null;
  const block = document.createElement("div");
  block.className = "block " + blockInfo.className;

  if (cell.block === "repeater") {
    const line = document.createElement("div");
    line.className = "repeater-line";
    block.appendChild(line);
    const left = document.createElement("div");
    left.className = "repeater-dot left";
    block.appendChild(left);
    const right = document.createElement("div");
    right.className = "repeater-dot right";
    block.appendChild(right);
  }

  if (cell.block !== "repeater" && typeof cell.note === "number") {
    const value = document.createElement("div");
    value.className = "value";
    value.textContent = cell.note;
    block.appendChild(value);
  }

  if (cell.block === "repeater" && typeof cell.delay === "number") {
    const value = document.createElement("div");
    value.className = "value";
    value.textContent = cell.delay;
    block.appendChild(value);
  }

  return block;
}

function showInfo(layerNumber, x, cell) {
  const panel = document.getElementById("infoPanel");
  const title = document.getElementById("infoTitle");
  const content = document.getElementById("infoContent");
  panel.classList.add("visible");
  title.textContent = "Layer " + layerNumber + " · Cell " + (x + 1);

  if (cell.block === "repeater") {
    content.innerHTML = `
<div class="info-row"><span class="info-label">Block:</span><span class="info-value">Repeater</span></div>
<div class="info-row"><span class="info-label">Delay:</span><span class="info-value">${cell.delay} (${(cell.delay + 1) * 100} ms)</span></div>
<div class="info-row"><span class="info-label">Block:</span><span class="info-value">Redstone Dust</span></div>`;
    return;
  }

  if (cell.block === "redstone") {
    const shape = getRedstoneShape(getRedstoneConnections(layerNumber, x));
    content.innerHTML = `
<div class="info-row"><span class="info-label">Block:</span><span class="info-value">Redstone Dust</span></div>
<div class="info-row"><span class="info-label">Connection:</span><span class="info-value">${shape}</span></div>`;
    return;
  }

  const blockInfo = BLOCKS[cell.block];
  content.innerHTML = `
<div class="info-row"><span class="info-label">Block:</span><span class="info-value">Noteblock</span></div>
<div class="info-row"><span class="info-label">Block Under:</span><span class="info-value">${blockInfo.displayName}</span></div>
<div class="info-row"><span class="info-label">Notes:</span><span class="info-value">${cell.note}</span></div>`;
}

function hideInfo() {
  const panel = document.getElementById("infoPanel");
  panel.classList.remove("visible");
}

const poweredCells = new Set();

function powerKey(layerNumber, x) {
  return layerNumber + ":" + x;
}

function isPowered(layerNumber, x) {
  return poweredCells.has(powerKey(layerNumber, x));
}

function clearPower() {
  poweredCells.clear();
}

let audioContext = null;

function ensureAudioContext() {
  if (!audioContext) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    audioContext = new Ctor();
  }
  return audioContext;
}

async function prepareAudio() {
  const ctx = ensureAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
  return ctx;
}

function playNote(note) {
  const ctx = ensureAudioContext();
  const now = ctx.currentTime;
  const frequency = NOTE_BLOCK_BASE * Math.pow(2, Number(note) / 12);

  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(frequency, now);

  const harmonic = ctx.createOscillator();
  harmonic.type = "sine";
  harmonic.frequency.setValueAtTime(frequency * 2, now);

  const mainGain = ctx.createGain();
  const harmonicGain = ctx.createGain();
  mainGain.gain.setValueAtTime(1, now);
  harmonicGain.gain.setValueAtTime(0.22, now);

  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.linearRampToValueAtTime(0.18, now + 0.005);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

  osc.connect(mainGain);
  mainGain.connect(output);
  harmonic.connect(harmonicGain);
  harmonicGain.connect(output);
  output.connect(ctx.destination);

  osc.start(now);
  harmonic.start(now);
  osc.stop(now + 1.15);
  harmonic.stop(now + 1.15);
}

function isNoteBlock(cell) {
  if (!cell) return false;
  return cell.block === "dirt" || cell.block === "plank" || cell.block === "stone" || cell.block === "sand" || cell.block === "iron";
}

function playColumn(x, layerNumbers) {
  for (const layerNumber of layerNumbers) {
    const cell = getCell(Number(layerNumber), x);
    if (!cell) continue;
    if (isNoteBlock(cell) && typeof cell.note === "number") {
      playNote(Math.max(0, Math.min(24, cell.note)));
    }
    if (cell.block === "redstone") poweredCells.add(powerKey(Number(layerNumber), x));
    if (cell.block === "repeater") poweredCells.add(powerKey(Number(layerNumber), x));
  }
}

function getColumnDelay(x, layerNumbers) {
  let highest = -1;
  for (const layerNumber of layerNumbers) {
    const cell = getCell(Number(layerNumber), x);
    if (cell && cell.block === "repeater") {
      const delay = Math.max(0, Math.min(3, Number(cell.delay) || 0));
      highest = Math.max(highest, delay);
    }
  }
  if (highest < 0) return 0;
  return (highest + 1) * REPEATER_DELAY_MS;
}

let playing = false;
let playerHead = -1;
let playbackSession = 0;
const gridCellElements = new Map();

function gridCellKey(layerNumber, x) {
  return `${layerNumber}:${x}`;
}

function getGridCellElement(layerNumber, x) {
  return gridCellElements.get(gridCellKey(layerNumber, x));
}

function updatePlayerHeadVisual(oldX, newX) {
  const layerNumbers = Object.keys(DATA.Layers);
  for (const layerNumber of layerNumbers) {
    if (oldX >= 0) {
      const oldCell = getGridCellElement(Number(layerNumber), oldX);
      if (oldCell) oldCell.classList.remove("player-head");
    }
    if (newX >= 0) {
      const newCell = getGridCellElement(Number(layerNumber), newX);
      if (newCell) newCell.classList.add("player-head");
    }
  }
}

function updateColumnPowerVisual(x, layerNumbers) {
  for (const layerNumber of layerNumbers) {
    const layer = Number(layerNumber);
    const cell = getCell(layer, x);
    const cellElement = getGridCellElement(layer, x);
    if (!cell || !cellElement) continue;
    const powered = isPowered(layer, x);
    const redstone = cellElement.querySelector(".redstone");
    if (redstone) redstone.classList.toggle("powered", powered);
    const repeater = cellElement.querySelector(".block-repeater");
    if (repeater) repeater.classList.toggle("powered", powered);
  }
}

function clearAllPowerVisuals() {
  for (const cellElement of gridCellElements.values()) {
    const redstone = cellElement.querySelector(".redstone");
    if (redstone) redstone.classList.remove("powered");
    const repeater = cellElement.querySelector(".block-repeater");
    if (repeater) repeater.classList.remove("powered");
  }
}

function createGrid() {
  adjustWidth();
  expandRedstoneAll();

  const grid = document.getElementById("grid");
  grid.innerHTML = "";
  gridCellElements.clear();

  const layerNumbers = Object.keys(DATA.Layers);
  layerNumbers.forEach(layerNumber => {
    const label = document.createElement("div");
    label.className = "layer-label";
    label.textContent = layerNumber;
    grid.appendChild(label);

    for (let x = 0; x < GRID_WIDTH; x++) {
      const cellElement = document.createElement("div");
      cellElement.className = "cell";
      gridCellElements.set(gridCellKey(Number(layerNumber), x), cellElement);

      if (x === playerHead) {
        cellElement.classList.add("player-head");
      }

      const cell = getCell(Number(layerNumber), x);
      if (!cell) {
        cellElement.addEventListener("click", hideInfo);
        grid.appendChild(cellElement);
        continue;
      }

      cellElement.addEventListener("click", async event => {
        event.stopPropagation();
        await prepareAudio();
        if (isNoteBlock(cell) && typeof cell.note === "number") {
          playNote(Math.max(0, Math.min(24, cell.note)));
        }
        showInfo(Number(layerNumber), x, cell);
      });

      if (cell.block === "redstone") {
        const redstone = createRedstone(Number(layerNumber), x);
        if (isPowered(Number(layerNumber), x)) {
          redstone.classList.add("powered");
        }
        cellElement.appendChild(redstone);
      } else {
        const block = createBlock(cell, Number(layerNumber), x);
        if (cell.block === "repeater" && isPowered(Number(layerNumber), x)) {
          block.classList.add("powered");
        }
        if (block) cellElement.appendChild(block);
      }

      grid.appendChild(cellElement);
    }
  });
}

function wait(milliseconds, session) {
  return new Promise(resolve => {
    const start = performance.now();
    function check() {
      if (!playing || session !== playbackSession) {
        resolve();
        return;
      }
      const elapsed = performance.now() - start;
      if (elapsed >= milliseconds) {
        resolve();
        return;
      }
      requestAnimationFrame(check);
    }
    requestAnimationFrame(check);
  });
}

let scrollAnimationFrame = null;

function scrollToPlayerHead(x) {
  const grid = document.getElementById("grid");

  if (!grid) {
    console.log("SCROLL: grid not found", x);
    return;
  }

  const cells = grid.querySelectorAll(".cell");

  if (!cells[x]) {
    console.log("SCROLL: cell not found", x);
    return;
  }

  const cell = cells[x];

  let scroller = grid.parentElement;

  while (
    scroller &&
    scroller !== document.body &&
    scroller.scrollWidth <= scroller.clientWidth
  ) {
    scroller = scroller.parentElement;
  }

  if (!scroller || scroller === document.body) {
    console.log("SCROLL: no horizontal scroller found", x);
    return;
  }

  const scrollerRect = scroller.getBoundingClientRect();
  const cellRect = cell.getBoundingClientRect();

  const cellCenter =
    cellRect.left -
    scrollerRect.left +
    cellRect.width / 2;

  const visibleCenter =
    scroller.clientWidth / 2;

  let targetScroll =
    scroller.scrollLeft +
    cellCenter -
    visibleCenter;

  const maxScroll =
    scroller.scrollWidth -
    scroller.clientWidth;

  targetScroll = Math.max(
    0,
    Math.min(targetScroll, maxScroll)
  );

  if (Math.abs(targetScroll - scroller.scrollLeft) < 1) {
    return;
  }

  if (scrollAnimationFrame !== null) {
    cancelAnimationFrame(scrollAnimationFrame);
    scrollAnimationFrame = null;
  }

  const startScroll = scroller.scrollLeft;
  const distance = targetScroll - startScroll;
  const startTime = performance.now();
  const duration = 160;

  function animate(now) {
    const progress =
      Math.min((now - startTime) / duration, 1);

    const eased =
      1 - Math.pow(1 - progress, 3);

    scroller.scrollLeft =
      startScroll + distance * eased;

    if (progress < 1) {
      scrollAnimationFrame =
        requestAnimationFrame(animate);
    } else {
      scrollAnimationFrame = null;
    }
  }

  scrollAnimationFrame =
    requestAnimationFrame(animate);
}
async function play() {
  if (playing) return;
  await prepareAudio();
  const session = ++playbackSession;
  playing = true;
  playerHead = -1;
  clearPower();
  clearAllPowerVisuals();
  updatePlayButton();
  const layerNumbers = Object.keys(DATA.Layers);

  for (let x = 0; x < GRID_WIDTH; x++) {
    if (!playing || session !== playbackSession) return;
    updatePlayerHeadVisual(playerHead, x);
    playerHead = x;
    scrollToPlayerHead(x);
    playColumn(x, layerNumbers);
    updateColumnPowerVisual(x, layerNumbers);
    const delay = getColumnDelay(x, layerNumbers);
    if (delay > 0) {
      await wait(delay, session);
      if (!playing || session !== playbackSession) return;
    }
  }

  if (playing && session === playbackSession) stop();
}

function stop() {
  playing = false;
  playbackSession++;
  updatePlayerHeadVisual(playerHead, -1);
  playerHead = -1;
  clearPower();
  clearAllPowerVisuals();
  updatePlayButton();
}

function updatePlayButton() {
  const button = document.getElementById("playButton");
  if (playing) {
    button.textContent = "Stop";
    button.classList.add("stop");
  } else {
    button.textContent = "Play";
    button.classList.remove("stop");
  }
}

document.getElementById("playButton").addEventListener("click", () => {
  if (playing) stop();
  else play();
});

document.querySelector(".workspace").addEventListener("click", event => {
  if (event.target === event.currentTarget) hideInfo();
});

createGrid();
updatePlayButton();
