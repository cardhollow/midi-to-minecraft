const importMidiButton = document.getElementById("importMidiButton");
const midiFileInput = document.getElementById("midiFileInput");

let MIDI_JSON = [];

const START_BUCKET_MS = 70;
const MIN_MELODY_SPACING_MS = 140;
const TIME_STRETCH = 1.35;
const DROP_DRUM_CHANNELS = true;
const PREFERRED_CENTER_MIDI = 60;
const MAX_JUMP_PENALTY = 3.0;
const MIN_NOTE_DURATION_MS = 50;

function readVarLen(view, offset) {
  let value = 0;
  let byte = 0;
  do {
    byte = view.getUint8(offset++);
    value = (value << 7) | (byte & 0x7F);
  } while (byte & 0x80);
  return { value, offset };
}

function bytesToString(view, offset, length) {
  let out = "";
  for (let i = 0; i < length; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function quantize(value, step) {
  return Math.round(value / step) * step;
}

function midiNoteToGridNote(midiNote) {
  return clamp(Number(midiNote) - 48, 0, 24);
}

function programToBlock(program, channel) {
  const blocks = ["dirt", "oak_planks", "stone", "sand", "iron_block"];
  if (Number(channel) === 9) return "sand";
  return blocks[Math.abs(Number(program) || 0) % blocks.length];
}

function noteKey(channel, note) {
  return `${Number(channel)}:${Number(note)}`;
}

function closeActiveNote(activeNotes, key, endTick, endMs) {
  const stack = activeNotes.get(key);
  if (!stack || stack.length === 0) return null;

  const start = stack.pop();
  if (stack.length === 0) activeNotes.delete(key);

  return {
    ...start,
    endTick,
    endMs,
    durationTick: Math.max(0, endTick - start.startTick),
    durationMs: Math.max(0, endMs - start.startMs)
  };
}

function parseMidiFile(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  let offset = 0;

  function readU32() {
    const value = view.getUint32(offset, false);
    offset += 4;
    return value;
  }

  function readU16() {
    const value = view.getUint16(offset, false);
    offset += 2;
    return value;
  }

  function readU8() {
    const value = view.getUint8(offset);
    offset += 1;
    return value;
  }

  const headerId = bytesToString(view, offset, 4);
  offset += 4;
  if (headerId !== "MThd") throw new Error("Invalid MIDI file: missing MThd header.");

  const headerLength = readU32();
  const format = readU16();
  const trackCount = readU16();
  const division = readU16();
  offset += Math.max(0, headerLength - 6);

  const parsed = {
    format,
    trackCount,
    division,
    tracks: [],
    notes: []
  };

  for (let trackIndex = 0; trackIndex < trackCount; trackIndex++) {
    const trackId = bytesToString(view, offset, 4);
    offset += 4;
    if (trackId !== "MTrk") throw new Error("Invalid MIDI file: missing MTrk chunk.");

    const trackLength = readU32();
    const trackEnd = offset + trackLength;

    let runningStatus = 0;
    let absoluteTick = 0;
    let absoluteMs = 0;
    let tempoMicrosecondsPerQuarter = 500000;

    const channelPrograms = new Array(16).fill(0);
    const activeNotes = new Map();
    const trackNotes = [];

    while (offset < trackEnd) {
      const deltaResult = readVarLen(view, offset);
      const deltaTicks = deltaResult.value;
      offset = deltaResult.offset;

      absoluteTick += deltaTicks;
      absoluteMs += (deltaTicks * tempoMicrosecondsPerQuarter) / division / 1000;

      let status = readU8();
      if (status < 0x80) {
        offset -= 1;
        status = runningStatus;
      } else {
        runningStatus = status;
      }

      if (status === 0xFF) {
        const metaType = readU8();
        const lenResult = readVarLen(view, offset);
        const metaLength = lenResult.value;
        offset = lenResult.offset;

        if (metaType === 0x51 && metaLength === 3) {
          tempoMicrosecondsPerQuarter =
            (view.getUint8(offset) << 16) |
            (view.getUint8(offset + 1) << 8) |
            view.getUint8(offset + 2);
        }

        offset += metaLength;
        if (metaType === 0x2F) break;
        continue;
      }

      if (status === 0xF0 || status === 0xF7) {
        const lenResult = readVarLen(view, offset);
        offset = lenResult.offset + lenResult.value;
        continue;
      }

      const eventType = status & 0xF0;
      const channel = status & 0x0F;

      if (eventType === 0xC0) {
        const program = readU8();
        channelPrograms[channel] = program;
        continue;
      }

      if (eventType === 0xD0) {
        offset += 1;
        continue;
      }

      const data1 = readU8();
      const data2 = readU8();

      if (eventType === 0x90) {
        const note = data1;
        const velocity = data2;
        const key = noteKey(channel, note);

        if (velocity > 0) {
          if (!activeNotes.has(key)) activeNotes.set(key, []);
          activeNotes.get(key).push({
            note,
            velocity,
            channel,
            program: channelPrograms[channel],
            startTick: absoluteTick,
            startMs: absoluteMs
          });
        } else {
          const closed = closeActiveNote(activeNotes, key, absoluteTick, absoluteMs);
          if (closed) trackNotes.push(closed);
        }
        continue;
      }

      if (eventType === 0x80) {
        const note = data1;
        const key = noteKey(channel, note);
        const closed = closeActiveNote(activeNotes, key, absoluteTick, absoluteMs);
        if (closed) trackNotes.push(closed);
        continue;
      }
    }

    parsed.tracks.push({ index: trackIndex, notes: trackNotes });
    parsed.notes.push(...trackNotes);
    offset = trackEnd;
  }

  return parsed;
}

function trackScore(notes) {
  const usable = notes.filter(n => !DROP_DRUM_CHANNELS || Number(n.channel) !== 9);
  if (usable.length === 0) return -Infinity;

  const pitches = usable.map(n => n.note).sort((a, b) => a - b);
  const median = pitches[Math.floor(pitches.length / 2)];
  const centerBonus = 100 - Math.abs(median - PREFERRED_CENTER_MIDI) * 4;

  let longNotes = 0;
  let melodyRange = 0;
  for (const n of usable) {
    if ((n.durationMs || 0) >= MIN_NOTE_DURATION_MS) longNotes++;
    melodyRange += Math.abs(n.note - PREFERRED_CENTER_MIDI);
  }

  const density = usable.length;
  return centerBonus + longNotes * 2 + density * 0.5 - melodyRange * 0.06;
}

function pickMelodyFromTracks(parsed) {
  const rankedTracks = parsed.tracks
    .map(track => ({
      index: track.index,
      notes: track.notes.filter(n => !DROP_DRUM_CHANNELS || Number(n.channel) !== 9)
    }))
    .filter(t => t.notes.length > 0)
    .sort((a, b) => trackScore(b.notes) - trackScore(a.notes));

  if (rankedTracks.length === 0) return [];

  return rankedTracks[0].notes
    .slice()
    .sort((a, b) => {
      if (a.startTick !== b.startTick) return a.startTick - b.startTick;
      if (a.startMs !== b.startMs) return a.startMs - b.startMs;
      if (a.note !== b.note) return a.note - b.note;
      return a.velocity - b.velocity;
    });
}

function chooseTranspose(notes) {
  let bestShift = 0;
  let bestScore = -Infinity;

  for (let shift = -24; shift <= 24; shift++) {
    let score = 0;
    let last = null;

    for (const n of notes) {
      const p = n.note + shift;

      if (p >= 48 && p <= 72) score += 10;
      else score -= Math.abs(p < 48 ? 48 - p : p - 72) * 4;

      if (last !== null) score -= Math.abs(p - last) * MAX_JUMP_PENALTY;
      last = p;
    }

    if (score > bestScore) {
      bestScore = score;
      bestShift = shift;
    }
  }

  return bestShift;
}

function convertMidiToReadableJson(parsed) {
  const melodyNotes = pickMelodyFromTracks(parsed);
  if (melodyNotes.length === 0) return [];

  const transpose = chooseTranspose(melodyNotes);

  const buckets = new Map();
  for (const note of melodyNotes) {
    const bucket = quantize(note.startMs, START_BUCKET_MS);
    if (!buckets.has(bucket)) buckets.set(bucket, []);
    buckets.get(bucket).push(note);
  }

  const sortedBuckets = [...buckets.keys()].map(Number).sort((a, b) => a - b);

  const out = [];
  let lastEmittedMs = null;
  let lastPitch = null;

  for (const bucketMs of sortedBuckets) {
    const group = buckets.get(bucketMs);
    if (!group || group.length === 0) continue;

    let best = null;
    let bestScore = -Infinity;

    for (const n of group) {
      if (DROP_DRUM_CHANNELS && Number(n.channel) === 9) continue;

      const pitch = n.note + transpose;
      let score = 0;

      score += pitch * 2.5;
      score += (n.velocity || 0) * 0.7;
      score += Math.min(3000, n.durationMs || 0) / 180;

      if (pitch >= 48 && pitch <= 72) score += 25;
      else score -= Math.abs(pitch < 48 ? 48 - pitch : pitch - 72) * 6;

      if (lastPitch !== null) score -= Math.abs(pitch - lastPitch) * 1.9;

      if (lastEmittedMs !== null && (bucketMs - lastEmittedMs) < MIN_MELODY_SPACING_MS) {
        score -= 120;
      }

      if (score > bestScore) {
        bestScore = score;
        best = n;
      }
    }

    if (!best) continue;

    const startMs = Math.round(best.startMs * TIME_STRETCH);

    if (lastEmittedMs !== null && (startMs - lastEmittedMs) < MIN_MELODY_SPACING_MS) {
      continue;
    }

    out.push({
      delay: lastEmittedMs === null ? 0 : Math.max(0, startMs - lastEmittedMs),
      notes: [[
        "minecraft:" + programToBlock(best.program, best.channel),
        midiNoteToGridNote(best.note + transpose),
        Math.max(MIN_NOTE_DURATION_MS, Math.round((best.durationMs || 0) * TIME_STRETCH)),
        best.velocity,
        best.channel,
        best.program
      ]]
    });

    lastEmittedMs = startMs;
    lastPitch = best.note + transpose;
  }

  return out;
}

async function handleMidiImportFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const parsed = parseMidiFile(arrayBuffer);
  MIDI_JSON = convertMidiToReadableJson(parsed);
  window.MIDI_JSON = MIDI_JSON;
  console.log("MIDI_JSON:", JSON.stringify(MIDI_JSON, null, 2));
  updateLayers();
}

function constructTimeline(midiJson) {
  const timeline = {};
  const redstoneLayer = [
    { block: "redstone_all" },
    { extraBlocks: [] }
  ];

  const REPEATER_MS = [100, 200, 300, 400];

  function convertBlockName(blockName) {
    if (typeof blockName !== "string") return null;
    let name = blockName.replace(/^minecraft:/, "");
    if (name === "oak_planks") name = "plank";
    if (!BLOCKS[name]) return null;
    return name;
  }

  const hasMultipleLayers = midiJson.some(event =>
    Array.isArray(event?.notes) &&
    event.notes.length > 1 &&
    event.notes.slice(1).some(note => Array.isArray(note))
  );

  let currentIndex = 0;
  let hasPreviousValidChunk = false;

  for (const event of midiJson) {
    if (!Array.isArray(event.notes) || event.notes.length === 0) continue;

    let delayMs = Math.max(0, Number(event.delay) || 0);

    if (delayMs < 100) {
      delayMs = 100;
    }

    if (hasPreviousValidChunk) {
      if (hasMultipleLayers) {
        currentIndex += 1;
      }
    }

    let remainingMs = delayMs;

    while (remainingMs >= 100) {
      let repeaterDelay = 3;

      while (
        repeaterDelay > 0 &&
        REPEATER_MS[repeaterDelay] > remainingMs
      ) {
        repeaterDelay--;
      }

      redstoneLayer[1].extraBlocks.push({
        block: "repeater",
        delay: repeaterDelay,
        index: currentIndex
      });

      remainingMs -= REPEATER_MS[repeaterDelay];
      currentIndex += 1;
    }

    const firstNote = event.notes[0];

    if (Array.isArray(firstNote)) {
      const blockName = convertBlockName(firstNote[0]);
      const noteValue = firstNote[1];

      if (blockName) {
        redstoneLayer[1].extraBlocks.push({
          block: blockName,
          note: noteValue,
          index: currentIndex
        });

        currentIndex += 1;
      }
    }

    hasPreviousValidChunk = true;
  }

  timeline[0] = redstoneLayer;

  return timeline;
}

function createLayers(timeline, MIDI_JSON) {
  let maxLayers = 0;
  for (const event of MIDI_JSON) {
    if (!Array.isArray(event.notes)) continue;
    maxLayers = Math.max(maxLayers, event.notes.length);
  }

  const usableNoteLayers = Math.max(0, maxLayers - 1);
  const layers = {};

  for (let blockLayer = 0; blockLayer < usableNoteLayers; blockLayer++) {
    const actualLayer = blockLayer * 2 + 2;
    layers[actualLayer] = [];
  }

  function convertBlockName(blockName) {
    if (typeof blockName !== "string") return null;
    let name = blockName.replace(/^minecraft:/, "");
    if (name === "oak_planks") name = "plank";
    if (!BLOCKS[name]) return null;
    return name;
  }

  const extraBlocks = timeline?.[0]?.[1]?.extraBlocks || [];
  const repeaterIndexes = extraBlocks
    .map(item => Number(item.index))
    .filter(index => Number.isInteger(index))
    .sort((a, b) => a - b);

  const chunks = [];
  let currentChunk = [];
  for (const index of repeaterIndexes) {
    if (currentChunk.length === 0) {
      currentChunk.push(index);
      continue;
    }
    const previous = currentChunk[currentChunk.length - 1];
    if (index === previous + 1) currentChunk.push(index);
    else {
      chunks.push(currentChunk);
      currentChunk = [index];
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk);

  const blockPositions = chunks.map(chunk => chunk[chunk.length - 1] + 3);
  let chunkIndex = 0;

  for (let eventIndex = 0; eventIndex < MIDI_JSON.length; eventIndex++) {
    const event = MIDI_JSON[eventIndex];
    if (!Array.isArray(event.notes)) continue;
    if (chunkIndex >= blockPositions.length) break;

    const blockPosition = blockPositions[chunkIndex];

    for (let noteIndex = 0; noteIndex < event.notes.length; noteIndex++) {
      if (noteIndex === 0) continue;

      const note = event.notes[noteIndex];
      if (!Array.isArray(note)) continue;

      const midiBlock = note[0];
      const noteValue = note[1];
      const blockName = convertBlockName(midiBlock);
      if (!blockName) continue;

      const shiftedIndex = noteIndex - 1;
      const actualLayer = shiftedIndex * 2 + 2;

      if (!layers[actualLayer]) layers[actualLayer] = [];

      if (noteIndex === 1 || noteIndex === 2) {
        const firstPosition = blockPosition - 3;
        if (firstPosition >= 0) {
          layers[actualLayer][firstPosition] = { block: blockName, note: noteValue };
          if (noteIndex === 2 && event.notes.length > 3) {
            layers[actualLayer][firstPosition + 1] = { block: "redstone" };
          }
        }
        continue;
      }

      const extraLayer = shiftedIndex * 2 + 1;
      const firstRedstonePosition = blockPosition - 2;
      const secondRedstonePosition = blockPosition - 1;

      if (firstRedstonePosition >= 0) layers[actualLayer][firstRedstonePosition] = { block: "redstone" };
      if (secondRedstonePosition >= 0) layers[actualLayer][secondRedstonePosition] = { block: "redstone" };

      if (noteIndex > 2) {
        if (!layers[extraLayer]) layers[extraLayer] = [];
        if (firstRedstonePosition >= 0 && layers[actualLayer][firstRedstonePosition]?.block === "redstone") {
          layers[extraLayer][firstRedstonePosition] = { block: "redstone" };
        }
      }

      layers[actualLayer][blockPosition] = { block: blockName, note: noteValue };
    }

    chunkIndex++;
  }

  const filteredLayers = {};
  let newLayerNumber = 0;
  for (const oldLayerNumber of Object.keys(layers)) {
    const layer = layers[oldLayerNumber];
    if (!layer) continue;
    filteredLayers[newLayerNumber++] = layer;
  }

  return filteredLayers;
}

function updateLayers() {
  const timeline = constructTimeline(MIDI_JSON);
  const extraLayers = createLayers(timeline, MIDI_JSON);
  const finalLayers = {};

  const generatedLayerNumbers = Object.keys(extraLayers)
    .map(Number)
    .sort((a, b) => a - b);

  if (generatedLayerNumbers.length > 0) {
    finalLayers[0] = extraLayers[generatedLayerNumbers[0]];
  }

  finalLayers[1] = timeline[0];

  for (let i = 1; i < generatedLayerNumbers.length; i++) {
    finalLayers[i + 1] = extraLayers[generatedLayerNumbers[i]];
  }

  DATA = { Layers: finalLayers };
  createGrid();
  updatePlayButton();

  requestAnimationFrame(() => {
    const workspace = document.querySelector(".workspace");
    if (workspace) workspace.scrollLeft = 0;
  });
}
if (importMidiButton && midiFileInput) {
  importMidiButton.addEventListener("click", () => {
    midiFileInput.value = "";
    midiFileInput.click();
  });

  midiFileInput.addEventListener("change", async () => {
    const file = midiFileInput.files && midiFileInput.files[0];
    if (!file) return;

    try {
      await handleMidiImportFile(file);
    } catch (error) {
      console.error(error);
      alert("Failed to import MIDI: " + error.message);
    }
  });
}
