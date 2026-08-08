function getStructureName(note) {
  return "note" + String(note).padStart(2, "0");
}

function getSupportBlock() {
  return "dirt";
}

function getLayerXOffset(layerNumber) {
  return -(Number(layerNumber) + 1);
}

function relativeX(offset) {
  return "~" + offset;
}

function relativeY(offset) {
  return "~" + offset;
}

function relativeZ() {
  return "~";
}

function getBlockStructureName(block) {
  return "noteblock:" + block;
}

function getRepeaterStructureName(delay) {
  return "noteblock:repeater_" + Number(delay);
}

function isCommandNoteBlock(cell) {
  if (!cell) return false;
  return cell.block === "dirt" || cell.block === "plank" || cell.block === "stone" || cell.block === "sand" || cell.block === "iron";
}

function initializeBlocks() {
  const commands = [];
  let supportBlock = "white_concrete";
  commands.push("setblock ~10 ~0 ~0 dirt");
  commands.push("structure save noteblock:dirt ~10 ~0 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~0 ~0 oak_planks");
  commands.push("structure save noteblock:plank ~10 ~0 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~0 ~0 stone");
  commands.push("structure save noteblock:stone ~10 ~0 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~0 ~0 sand");
  commands.push("structure save noteblock:sand ~10 ~0 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~0 ~0 iron_block");
  commands.push("structure save noteblock:iron ~10 ~0 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~-1 ~0 " + supportBlock);
  commands.push("setblock ~10 ~0 ~0 redstone_wire");
  commands.push("structure save noteblock:redstone ~10 ~-1 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~-1 ~0 " + supportBlock);
  commands.push('setblock ~10 ~0 ~0 unpowered_repeater["repeater_delay"=0]');
  commands.push("structure save noteblock:repeater_0 ~10 ~-1 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~-1 ~0 " + supportBlock);
  commands.push('setblock ~10 ~0 ~0 unpowered_repeater["repeater_delay"=1]');
  commands.push("structure save noteblock:repeater_1 ~10 ~-1 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~-1 ~0 " + supportBlock);
  commands.push('setblock ~10 ~0 ~0 unpowered_repeater["repeater_delay"=2]');
  commands.push("structure save noteblock:repeater_2 ~10 ~-1 ~0 ~10 ~0 ~0 false");
  commands.push("setblock ~10 ~-1 ~0 " + supportBlock);
  commands.push('setblock ~10 ~0 ~0 unpowered_repeater["repeater_delay"=3]');
  commands.push("structure save noteblock:repeater_3 ~10 ~-1 ~0 ~10 ~0 ~0 false");
  commands.push("fill ~10 ~-1 ~0 ~10 ~0 ~0 air");
  return commands.join("\n");
}

function makeNoteSupportCommand(xOffset, blockName) {
  return "structure load " + getBlockStructureName(blockName) + " " + relativeX(xOffset) + " ~-1 " + relativeZ();
}

function makeNoteCommand(cell, xOffset) {
  const structureName = getStructureName(cell.note);
  return "structure load " + structureName + " " + relativeX(xOffset) + " ~ " + relativeZ();
}

function makeRepeaterCommand(cell, xOffset) {
  const delay = Math.max(0, Math.min(3, Number(cell.delay) || 0));
  return "structure load " + getRepeaterStructureName(delay) + " " + relativeX(xOffset) + " ~-1 " + relativeZ();
}

function makeRedstoneCommand(xOffset) {
  return "structure load noteblock:redstone " + relativeX(xOffset) + " ~-1 " + relativeZ();
}

function makeNormalBlockCommand(cell, xOffset) {
  return "structure load " + getBlockStructureName(cell.block) + " " + relativeX(xOffset) + " ~ " + relativeZ();
}

function generateCellCommands(layerNumber, cell) {
  if (!cell) return [];
  const xOffset = getLayerXOffset(layerNumber);
  const commands = [];
  if (isCommandNoteBlock(cell) && typeof cell.note === "number") {
    if (cell.block === "sand") {
      commands.push("structure load " + getBlockStructureName("white_concrete") + " " + relativeX(xOffset) + " ~-1 " + relativeZ());
    }
    commands.push(makeNoteSupportCommand(xOffset, cell.block));
    commands.push(makeNoteCommand(cell, xOffset));
    return commands;
  }
  if (cell.block === "repeater") {
    commands.push(makeRepeaterCommand(cell, xOffset));
    return commands;
  }
  if (cell.block === "redstone") {
    commands.push(makeRedstoneCommand(xOffset));
    return commands;
  }
  commands.push("structure load " + getBlockStructureName(getSupportBlock()) + " " + relativeX(xOffset) + " ~-1 " + relativeZ());
  commands.push(makeNormalBlockCommand(cell, xOffset));
  return commands;
}

function generateColumnCommands(column, layerNumbers) {
  const commands = [];
  for (const layerNumber of layerNumbers) {
    const layer = Number(layerNumber);
    const cell = getCell(layer, column);
    if (!cell) continue;
    commands.push(...generateCellCommands(layer, cell));
  }
  commands.push("tp @s ~ ~ ~-1");
  return commands;
}

function generateCommands() {
  const layerNumbers = Object.keys(DATA.Layers).map(Number).sort((a, b) => a - b);
  const commands = [];
  commands.push("# ===== STRUCTURE SETUP =====");
  commands.push(initializeBlocks());
  commands.push("");
  commands.push("# ===== PRINT =====");
  for (let column = 0; column < GRID_WIDTH; column++) {
    commands.push(...generateColumnCommands(column, layerNumbers));
  }
  return commands.join("\n");
}

function updateCommandText() {
  commandTextarea.value = generateCommands();
}

const commandModal = document.getElementById("commandModal");
const commandTextarea = document.getElementById("commandTextarea");
const commandCopyButton = document.getElementById("commandCopyButton");
const commandCloseButton = document.getElementById("commandCloseButton");
const copyCommandButton = document.getElementById("copyCommandButton");

copyCommandButton.addEventListener("click", () => {
  updateCommandText();
  commandModal.classList.add("visible");
});

commandCloseButton.addEventListener("click", () => {
  commandModal.classList.remove("visible");
});

commandCopyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(commandTextarea.value);
  } catch (error) {
    commandTextarea.focus();
    commandTextarea.select();
    document.execCommand("copy");
  }
});

commandModal.addEventListener("click", event => {
  if (event.target === commandModal) {
    commandModal.classList.remove("visible");
  }
});
