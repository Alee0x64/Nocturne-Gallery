"use strict";
const SUPABASE_URL = "https://shgitavnpjxldlkyuvqz.supabase.co";
const SUPABASE_KEY = "sb_publishable_bM7-tKDOLfeDG5z-SyY6Sg_da4g2I0I";
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);
const WIDTH = 1200;
const HEIGHT = 800;
const HISTORY_LIMIT = 40;
const $ = (selector) => document.querySelector(selector);
const loginScreen = $("#login-screen");
const loginForm = $("#login-form");
const loginMessage = $("#login-message");
const studio = $("#studio");
const logoutButton = $("#logout-button");
const displayCanvas = $("#display-canvas");
const displayCtx = displayCanvas.getContext("2d");
const toolSelect = $("#tool-select");
const colorInput = $("#brush-color");
const sizeInput = $("#brush-size");
const opacityInput = $("#brush-opacity");
const sizeValue = $("#size-value");
const opacityValue = $("#opacity-value");
const layersList = $("#layers-list");
const activeLayerLabel = $("#active-layer-label");
const undoButton = $("#undo-button");
const redoButton = $("#redo-button");
const publishForm = $("#publish-form");
const publishButton = $("#publish-button");
const publishMessage = $("#publish-message");
function setMessage(element, message, type = "") {
  element.textContent = message;
  element.className = `message ${type}`;
}
function showStudio(isLoggedIn) {
  loginScreen.classList.toggle("hidden", isLoggedIn);
  studio.classList.toggle("hidden", !isLoggedIn);
  logoutButton.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    renderLayers();
    renderCanvas();
    loadSavedProjects();
  }
}
loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = $("#login-email").value.trim();
  const password = $("#login-password").value;
  const submitButton = loginForm.querySelector(
    'button[type="submit"]'
  );
  submitButton.disabled = true;
  setMessage(loginMessage, "Signing in...");
  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    setMessage(
      loginMessage,
      "Signed in successfully.",
      "success"
    );
    showStudio(true);
  } catch (error) {
    setMessage(
      loginMessage,
      error.message || "Sign-in failed.",
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
});
logoutButton.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    alert(`Could not sign out: ${error.message}`);
    return;
  }
  showStudio(false);
});
supabaseClient.auth.onAuthStateChange((event, session) => {
  showStudio(Boolean(session));
});
async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    setMessage(loginMessage, error.message, "error");
    showStudio(false);
    return;
  }
  showStudio(Boolean(data.session));
}
let nextLayerId = 1;
let activeLayerId = null;
let layers = [];
function createLayer(name) {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  const layer = {
    id: nextLayerId++,
    name,
    canvas,
    ctx,
    visible: true,
    opacity: 1,
    history: [],
    historyIndex: -1
  };
  layers.push(layer);
  activeLayerId = layer.id;
  saveHistory(layer);
  return layer;
}
function activeLayer() {
  return layers.find((layer) => layer.id === activeLayerId);
}
function saveHistory(layer) {
  layer.history = layer.history.slice(
    0,
    layer.historyIndex + 1
  );
  const snapshot = layer.ctx.getImageData(
    0,
    0,
    WIDTH,
    HEIGHT
  );
  layer.history.push(snapshot);
  if (layer.history.length > HISTORY_LIMIT) {
    layer.history.shift();
  }
  layer.historyIndex = layer.history.length - 1;
  updateHistoryButtons();
}
function restoreHistory(layer) {
  const snapshot = layer.history[layer.historyIndex];
  if (!snapshot) return;
  layer.ctx.clearRect(0, 0, WIDTH, HEIGHT);
  layer.ctx.putImageData(snapshot, 0, 0);
  renderCanvas();
  updateHistoryButtons();
}
function undo() {
  const layer = activeLayer();
  if (!layer || layer.historyIndex <= 0) return;
  layer.historyIndex--;
  restoreHistory(layer);
}
function redo() {
  const layer = activeLayer();
  if (
    !layer ||
    layer.historyIndex >= layer.history.length - 1
  ) {
    return;
  }
  layer.historyIndex++;
  restoreHistory(layer);
}
function updateHistoryButtons() {
  const layer = activeLayer();
  undoButton.disabled =
    !layer || layer.historyIndex <= 0;
  redoButton.disabled =
    !layer ||
    layer.historyIndex >= layer.history.length - 1;
}
undoButton.addEventListener("click", undo);
redoButton.addEventListener("click", redo);
const layerOpacityInput = $("#layer-opacity");
const layerOpacityValue = $("#layer-opacity-value");
function updateLayerOpacityControl() {
  const layer = activeLayer();
  if (!layerOpacityInput || !layerOpacityValue) return;
  const opacity = Math.round((layer?.opacity ?? 1) * 100);
  layerOpacityInput.value = opacity;
  layerOpacityValue.textContent = opacity;
  layerOpacityInput.disabled = !layer;
}
if (layerOpacityInput) {
  layerOpacityInput.addEventListener("input", () => {
    const layer = activeLayer();
    if (!layer) return;
    layer.opacity = Number(layerOpacityInput.value) / 100;
    if (layerOpacityValue) {
      layerOpacityValue.textContent = layerOpacityInput.value;
    }
    renderCanvas();
  });
  layerOpacityInput.addEventListener("change", () => {
    const layer = activeLayer();
    if (layer) saveHistory(layer);
  });
}
function renderLayers() {
  if (!layersList) return;
  layersList.replaceChildren();
  for (const layer of [...layers].reverse()) {
    const row = document.createElement("div");
    row.className = "layer-row";
    if (layer.id === activeLayerId) {
      row.classList.add("active");
    }
    const visibility = document.createElement("button");
    visibility.type = "button";
    visibility.className = "layer-visibility";
    visibility.textContent = layer.visible ? "◉" : "○";
    visibility.title = layer.visible ? "Hide layer" : "Show layer";
    visibility.addEventListener("click", () => {
      layer.visible = !layer.visible;
      renderLayers();
      renderCanvas();
    });
    const selectButton = document.createElement("button");
    selectButton.type = "button";
    selectButton.className = "layer-select";
    selectButton.textContent = layer.name;
    selectButton.addEventListener("click", () => {
      activeLayerId = layer.id;
      renderLayers();
      updateHistoryButtons();
      updateLayerOpacityControl();
    });
    row.append(visibility, selectButton);
    layersList.appendChild(row);
  }
  const layer = activeLayer();
  if (activeLayerLabel) {
    activeLayerLabel.textContent = layer
      ? layer.name
      : "No layer selected";
  }
  updateHistoryButtons();
  updateLayerOpacityControl();
}
$("#add-layer")?.addEventListener("click", () => {
  createLayer(`Layer ${nextLayerId}`);
  renderLayers();
  renderCanvas();
});
$("#delete-layer")?.addEventListener("click", () => {
  if (layers.length <= 1) {
    alert("You need at least one layer.");
    return;
  }
  const layer = activeLayer();
  if (!layer) return;
  if (!confirm(`Delete "${layer.name}"? This cannot be undone.`)) {
    return;
  }
  layers = layers.filter(item => item.id !== layer.id);
  activeLayerId = layers[layers.length - 1].id;
  renderLayers();
  renderCanvas();
});
layersList?.addEventListener("dblclick", event => {
  const button = event.target.closest(".layer-select");
  if (!button) return;
  const layer = layers.find(item => item.id === activeLayerId);
  if (!layer) return;
  const newName = prompt("Enter a layer name:", layer.name);
  if (newName && newName.trim()) {
    layer.name = newName.trim().slice(0, 60);
    renderLayers();
  }
});
function renderCanvas() {
  displayCtx.clearRect(0, 0, WIDTH, HEIGHT);
  for (const layer of layers) {
    if (layer.visible) {
      displayCtx.globalAlpha = layer.opacity ?? 1;
      displayCtx.drawImage(layer.canvas, 0, 0);
    }
  }
  displayCtx.globalAlpha = 1;
console.log(
  "Canvas:", displayCanvas.width, displayCanvas.height,
  "| Display:", displayCanvas.getBoundingClientRect().width,
  displayCanvas.getBoundingClientRect().height
);
}
function createMergedCanvas() {
  const merged = document.createElement("canvas");
  merged.width = WIDTH;
  merged.height = HEIGHT;
  const ctx = merged.getContext("2d");
  for (const layer of layers) {
    if (layer.visible) {
      ctx.globalAlpha = layer.opacity ?? 1;
      ctx.drawImage(layer.canvas, 0, 0);
    }
  }
  ctx.globalAlpha = 1;
  return merged;
}
function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create the PNG image."));
    }, "image/png");
  });
}
$("#export-button").addEventListener("click", async () => {
  try {
    const blob = await canvasToBlob(createMergedCanvas());
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `nocturne-${Date.now()}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    alert(error.message);
  }
});
let drawing = false;
let startX = 0;
let startY = 0;
let lastX = 0;
let lastY = 0;
let activePointerId = null;
let drawingSnapshot = null;
sizeInput.addEventListener("input", () => {
  sizeValue.textContent = sizeInput.value;
});
opacityInput.addEventListener("input", () => {
  opacityValue.textContent = opacityInput.value;
});

function getCanvasPoint(event) {
  const rect = displayCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (displayCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (displayCanvas.height / rect.height)
  };
}
function applyBrush(ctx, tool) {
  const baseSize = Number(sizeInput.value) || 1;
  const opacity = Math.max(
    0,
    Math.min(1, Number(opacityInput.value) / 100)
  );
  ctx.lineWidth = tool === "marker"
    ? baseSize * 1.8
    : baseSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.globalAlpha = tool === "marker"
    ? Math.min(1, opacity * 0.72)
    : opacity;
  ctx.globalCompositeOperation = tool === "eraser"
    ? "destination-out"
    : "source-over";
  ctx.strokeStyle = colorInput.value;
  ctx.fillStyle = colorInput.value;
  ctx.shadowBlur = tool === "glow"
    ? Math.max(8, baseSize * 1.8)
    : 0;
  ctx.shadowColor = colorInput.value;
}
function drawSegment(ctx, fromX, fromY, toX, toY, tool) {
  if (tool === "airbrush") {
    const distance = Math.hypot(
      toX - fromX,
      toY - fromY
    );
    const steps = Math.max(1, Math.ceil(distance / 4));
    const radius = Math.max(3, Number(sizeInput.value) * 1.5);
    ctx.save();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = colorInput.value;
    ctx.globalAlpha = Math.max(
      0.02,
      Number(opacityInput.value) / 100 * 0.12
    );
    for (let step = 0; step <= steps; step++) {
      const t = step / steps;
      const cx = fromX + (toX - fromX) * t;
      const cy = fromY + (toY - fromY) * t;
      for (
        let i = 0;
        i < Math.max(8, Math.round(radius * 1.5));
        i++
      ) {
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * radius;
        ctx.beginPath();
        ctx.arc(
          cx + Math.cos(angle) * r,
          cy + Math.sin(angle) * r,
          Math.max(0.5, radius * 0.035),
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    }
    ctx.restore();
    return;
  }
  ctx.save();
  applyBrush(ctx, tool);
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();
  ctx.restore();
}
function drawShape(ctx, tool, x1, y1, x2, y2) {
  ctx.save();
  applyBrush(ctx, tool);
  ctx.beginPath();
  if (tool === "line") {
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  } else if (tool === "rect") {
    ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
  } else if (tool === "circle") {
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    ctx.ellipse(
      centerX,
      centerY,
      Math.abs(x2 - x1) / 2,
      Math.abs(y2 - y1) / 2,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
  }
  ctx.restore();
}
function sampleColorAt(x, y) {
  const merged = createMergedCanvas();
  const pixel = merged.getContext("2d").getImageData(
    Math.max(0, Math.min(WIDTH - 1, Math.floor(x))),
    Math.max(0, Math.min(HEIGHT - 1, Math.floor(y))),
    1,
    1
  ).data;
  if (pixel[3] === 0) return;
  colorInput.value = "#" + [...pixel]
    .slice(0, 3)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");

  if (typeof updatePaletteSelection === "function") {
    updatePaletteSelection();
  }
}
function floodFill(layer, startX, startY) {
  const x = Math.floor(startX);
  const y = Math.floor(startY);
  if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) {
    return false;
  }
  const image = layer.ctx.getImageData(0, 0, WIDTH, HEIGHT);
  const data = image.data;
  const start = (y * WIDTH + x) * 4;
  const target = [
    data[start],
    data[start + 1],
    data[start + 2],
    data[start + 3]
  ];
  const hex = colorInput.value.replace("#", "");
  const fill = [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16),
    Math.round(Number(opacityInput.value) / 100 * 255)
  ];
  if (
    target[0] === fill[0] &&
    target[1] === fill[1] &&
    target[2] === fill[2] &&
    target[3] === fill[3]
  ) {
    return false;
  }
  const tolerance = 18;
  const matches = (index) =>
    Math.abs(data[index] - target[0]) <= tolerance &&
    Math.abs(data[index + 1] - target[1]) <= tolerance &&
    Math.abs(data[index + 2] - target[2]) <= tolerance &&
    Math.abs(data[index + 3] - target[3]) <= tolerance;
  const stack = [[x, y]];
  const seen = new Uint8Array(WIDTH * HEIGHT);
  seen[y * WIDTH + x] = 1;
  while (stack.length) {
    const [px, py] = stack.pop();
    const position = py * WIDTH + px;
    const index = position * 4;
    if (!matches(index)) continue;
    data[index] = fill[0];
    data[index + 1] = fill[1];
    data[index + 2] = fill[2];
    data[index + 3] = fill[3];
    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (
        nx < 0 ||
        ny < 0 ||
        nx >= WIDTH ||
        ny >= HEIGHT
      ) {
        continue;
      }
      const next = ny * WIDTH + nx;
      if (!seen[next]) {
        seen[next] = 1;
        stack.push([nx, ny]);
      }
    }
  }
  layer.ctx.putImageData(image, 0, 0);
  return true;
}
displayCanvas.addEventListener("pointerdown", (event) => {
  if (event.button !== 0 && event.pointerType === "mouse") {
    return;
  }
  const layer = activeLayer();
  if (!layer || !layer.visible) return;
  event.preventDefault();
  const point = getCanvasPoint(event);
  const tool = toolSelect.value;
  if (tool === "eyedropper") {
    sampleColorAt(point.x, point.y);
    return;
  }
  if (tool === "fill") {
    if (floodFill(layer, point.x, point.y)) {
      saveHistory(layer);
      renderCanvas();
    }
    return;
  }
  displayCanvas.setPointerCapture(event.pointerId);
  activePointerId = event.pointerId;
  drawing = true;
  startX = lastX = point.x;
  startY = lastY = point.y;
  drawingSnapshot = layer.ctx.getImageData(
    0,
    0,
    WIDTH,
    HEIGHT
  );
  if (
    [
      "pen",
      "pencil",
      "marker",
      "airbrush",
      "glow",
      "eraser"
    ].includes(tool)
  ) {
    drawSegment(
      layer.ctx,
      startX,
      startY,
      startX,
      startY,
      tool
    );
    renderCanvas();
  }
});
displayCanvas.addEventListener("pointermove", (event) => {
  if (!drawing || event.pointerId !== activePointerId) {
    return;
  }
  event.preventDefault();
  const layer = activeLayer();
  if (!layer) return;
  const point = getCanvasPoint(event);
  const tool = toolSelect.value;
  if (
    [
      "pen",
      "pencil",
      "marker",
      "airbrush",
      "glow",
      "eraser"
    ].includes(tool)
  ) {
    drawSegment(
      layer.ctx,
      lastX,
      lastY,
      point.x,
      point.y,
      tool
    );
  } else {
    layer.ctx.putImageData(drawingSnapshot, 0, 0);
    drawShape(
      layer.ctx,
      tool,
      startX,
      startY,
      point.x,
      point.y
    );
  }
  lastX = point.x;
  lastY = point.y;
  renderCanvas();
});
function finishDrawing(event) {
  if (!drawing || event.pointerId !== activePointerId) {
    return;
  }
  const layer = activeLayer();
  if (layer) {
    const tool = toolSelect.value;
    if (["line", "rect", "circle"].includes(tool)) {
      const point = getCanvasPoint(event);
      layer.ctx.putImageData(drawingSnapshot, 0, 0);
      drawShape(
        layer.ctx,
        tool,
        startX,
        startY,
        point.x,
        point.y
      );
    }
    saveHistory(layer);
    renderCanvas();
  }
  drawing = false;
  activePointerId = null;
  drawingSnapshot = null;
}
displayCanvas.addEventListener("pointerup", finishDrawing);
displayCanvas.addEventListener("pointercancel", finishDrawing);
displayCanvas.addEventListener("lostpointercapture", () => {
  if (drawing) {
    drawing = false;
    activePointerId = null;
    drawingSnapshot = null;
  }
});
$("#clear-button").addEventListener("click", () => {
  const layer = activeLayer();
  if (!layer) return;
  if (!confirm(`Clear all contents of "${layer.name}"?`)) {
    return;
  }
  layer.ctx.clearRect(0, 0, WIDTH, HEIGHT);
  saveHistory(layer);
  renderCanvas();
});
const nocturnePalette = [
  "#ff1744",
  "#ff4081",
  "#f500ff",
  "#b388ff",
  "#7c4dff",
  "#536dfe",
  "#00e5ff",
  "#1de9b6",
  "#69f0ae",
  "#eeff41",
  "#ff9100",
  "#ffffff",
  "#c7c7d1",
  "#777788",
  "#292333",
  "#100a14",
  "#000000"
];
function createNeonPalette() {
  const palette = document.querySelector(
    "#color-palette, #palette, .color-palette"
  );
  if (!palette) return;
  palette.replaceChildren();
  nocturnePalette.forEach((color) => {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.title = color;
    swatch.setAttribute("aria-label", `Choose ${color}`);
    swatch.style.backgroundColor = color;
    swatch.style.width = "28px";
    swatch.style.height = "28px";
    swatch.style.borderRadius = "6px";
    swatch.style.border = "1px solid #ffffff55";
    swatch.style.cursor = "pointer";
    swatch.style.boxShadow =
      color.startsWith("#ff") || color === "#f500ff"
        ? `0 0 8px ${color}66`
        : "none";
    swatch.addEventListener("click", () => {
      colorInput.value = color;
      if (typeof updatePaletteSelection === "function") {
        updatePaletteSelection();
      }
    });
    palette.appendChild(swatch);
  });
}
createNeonPalette();
function updatePaletteSelection() {
  document.querySelectorAll(
    "#color-palette button, #palette button, .color-palette button"
  ).forEach((button) => {
    const selected =
      button.title.toLowerCase() === colorInput.value.toLowerCase();
    button.style.outline = selected
      ? "2px solid white"
      : "none";
    button.style.outlineOffset = selected ? "2px" : "0";
  });
}
colorInput.addEventListener("input", updatePaletteSelection);
function duplicateActiveLayer() {
  const source = activeLayer();
  if (!source) return;
  const copy = createLayer(
    `${source.name} copy`,
    source.opacity,
    source.visible
  );
  copy.ctx.clearRect(0, 0, WIDTH, HEIGHT);
  copy.ctx.drawImage(source.canvas, 0, 0);
  const sourceIndex = layers.indexOf(source);
  layers.splice(sourceIndex + 1, 0, copy);
  activeLayerId = copy.id;
  renderLayers();
  renderCanvas();
  saveHistory(copy);
}
document.querySelector("#duplicate-layer")?.addEventListener(
  "click",
  duplicateActiveLayer
);
function moveActiveLayer(direction) {
  const index = layers.findIndex(
    (layer) => layer.id === activeLayerId
  );
  if (index < 0) return;
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= layers.length) {
    return;
  }
  [layers[index], layers[nextIndex]] = [
    layers[nextIndex],
    layers[index]
  ];
  renderLayers();
  renderCanvas();
}
document.querySelector("#layer-up")?.addEventListener(
  "click",
  () => moveActiveLayer(1)
);
document.querySelector("#layer-down")?.addEventListener(
  "click",
  () => moveActiveLayer(-1)
);
document.addEventListener("keydown", (event) => {
  const target = event.target;
  const typing = target instanceof HTMLElement &&
    (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
    );
  if (typing) return;
  const key = event.key.toLowerCase();
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && key === "z" && event.shiftKey) {
    event.preventDefault();
    if (typeof redo === "function") redo();
    return;
  }
  if (modifier && key === "z") {
    event.preventDefault();
    if (typeof undo === "function") undo();
    return;
  }
  if (modifier && key === "y") {
    event.preventDefault();
    if (typeof redo === "function") redo();
    return;
  }
  if (modifier && key === "s") {
    event.preventDefault();
    if (typeof saveProject === "function") {
      saveProject();
    }
    return;
  }
  if (modifier && key === "d") {
    event.preventDefault();
    duplicateActiveLayer();
    return;
  }
  if (key === "+" || key === "=") {
    changeZoom(0.1);
    return;
  }
  if (key === "-") {
    changeZoom(-0.1);
    return;
  }
  if (key === "0") {
    resetZoom();
    return;
  }
  const toolShortcuts = {
    p: "pencil",
    b: "pen",
    m: "marker",
    e: "eraser",
    g: "glow",
    i: "eyedropper",
    f: "fill",
    l: "line",
    r: "rect",
    o: "circle"
  };
  if (toolShortcuts[key]) {
    const optionExists = Array.from(toolSelect.options)
      .some((option) => option.value === toolShortcuts[key]);
    if (optionExists) {
      toolSelect.value = toolShortcuts[key];
    }
  }
});
updatePaletteSelection();
displayCanvas.style.touchAction = "none";
displayCanvas.style.userSelect = "none";
displayCanvas.style.webkitUserSelect = "none";
displayCanvas.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});
const zoomSelect = document.querySelector("#zoom-level");
zoomSelect?.addEventListener("change", () => {
  setCanvasZoom(zoomSelect.value);
});
document.querySelector("#zoom-in")?.addEventListener("click", () => {
  setCanvasZoom(canvasZoom + 0.25);
});
document.querySelector("#zoom-out")?.addEventListener("click", () => {
  setCanvasZoom(canvasZoom - 0.25);
});
window.addEventListener("resize", () => {
  if (document.fullscreenElement === document.querySelector("#studio")) {
    fitCanvasToScreen();
  }
});
const mobileToolButton = document.querySelector(
  "#mobile-tools-toggle, [data-mobile-tools-toggle]"
);
const toolPanel = document.querySelector(
  "#tools-panel, .tools-panel, .tool-panel"
);
if (mobileToolButton && toolPanel) {
  mobileToolButton.addEventListener("click", () => {
    const isOpen = toolPanel.classList.toggle("mobile-open");
    mobileToolButton.setAttribute(
      "aria-expanded",
      String(isOpen)
    );
  });
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const openPanel = document.querySelector(
      ".mobile-open"
    );
    if (openPanel) {
      openPanel.classList.remove("mobile-open");
    }
  }
});
window.addEventListener("error", (event) => {
  console.error(
    "[Nocturne Editor] An error occurred:",
    event.message
  );
});
try {
  renderCanvas();
  renderLayers();
  updatePaletteSelection();
} catch (error) {
  console.error(
    "[Nocturne Editor] Initial rendering failed:",
    error
  );
}
if (layers.length === 0) {
  createLayer("Background");
}
async function loadSavedProjects() {
  const projectsSelect = document.querySelector("#saved-projects");
  const message = document.querySelector("#project-message");
  if (!projectsSelect) {
    console.error(
      "No #saved-projects element found in editor.html"
    );
    return;
  }
  projectsSelect.replaceChildren();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "Loading projects...";
  projectsSelect.appendChild(placeholder);
  try {
    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (!sessionData.session) {
      placeholder.textContent = "Sign in to see your projects";
      return;
    }
    const { data, error } = await supabaseClient
      .from("studio_projects")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    projectsSelect.replaceChildren();
    const firstOption = document.createElement("option");
    firstOption.value = "";
    firstOption.textContent = data.length
      ? "Choose a saved project..."
      : "No saved projects yet";
    projectsSelect.appendChild(firstOption);
    for (const project of data) {
      const option = document.createElement("option");
      option.value = project.id;
      option.textContent =
        `${project.name} — ${new Date(
          project.updated_at
        ).toLocaleString()}`;
      projectsSelect.appendChild(option);
    }
    if (message) {
      message.textContent = "";
    }
  } catch (error) {
    console.error("Could not load saved projects:", error);
    placeholder.textContent = "Could not load projects";
    if (message) {
      message.textContent = error.message;
      message.className = "message error";
    }
  }
}
let canvasZoom = 1;
const canvasWrap = document.querySelector("#canvas-wrap");
function setCanvasZoom(value) {
  canvasZoom = Math.max(0.25, Math.min(3, Number(value) || 1));
  displayCanvas.style.width = `${WIDTH * canvasZoom}px`;
  displayCanvas.style.height = `${HEIGHT * canvasZoom}px`;
  displayCanvas.style.maxWidth = "none";
  displayCanvas.style.maxHeight = "none";
  if (zoomSelect) {
    const matchingOption = [...zoomSelect.options].find(
      option => Number(option.value) === canvasZoom
    );
    if (matchingOption) {
      zoomSelect.value = matchingOption.value;
    }
  }
}
function fitCanvasToScreen() {
  const wrapper = document.querySelector("#canvas-wrap");
  if (!wrapper || !displayCanvas) return;
  const availableWidth = wrapper.clientWidth;
  const availableHeight = wrapper.clientHeight;
  if (!availableWidth || !availableHeight) return;
  const fitZoom = Math.min(
    availableWidth / WIDTH,
    availableHeight / HEIGHT
  );
  setCanvasZoom(fitZoom);
}
document.querySelector("#zoom-fit")?.addEventListener("click", () => {
  fitCanvasToScreen();
});
document.addEventListener("fullscreenchange", () => {
  requestAnimationFrame(() => {
    fitCanvasToScreen();
  });
});
const importButton = document.querySelector("#import-image-button");
const importInput = document.querySelector("#import-image-input");
const fullscreenButton = document.querySelector("#fullscreen-button");
const saveProjectButton = document.querySelector("#save-project");
const loadProjectButton = document.querySelector("#load-project");
const deleteProjectButton = document.querySelector("#delete-project");
const projectsDropdown = document.querySelector("#saved-projects");
const projectNameInput = document.querySelector("#project-name");
const projectMessage = document.querySelector("#project-message");
function showProjectMessage(message, isError = false) {
  if (!projectMessage) return;
  projectMessage.textContent = message;
  projectMessage.className = isError
    ? "message error"
    : "message success";
}
importButton?.addEventListener("click", () => {
  importInput?.click();
});
importInput?.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  const layer = activeLayer();
  if (!file || !layer) return;
  if (!file.type.startsWith("image/")) {
    alert("Please select an image file.");
    importInput.value = "";
    return;
  }
  try {
    const image = new Image();
    const imageURL = URL.createObjectURL(file);
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = imageURL;
    });
    const scale = Math.min(
      WIDTH / image.width,
      HEIGHT / image.height,
      1
    );
    const imageWidth = image.width * scale;
    const imageHeight = image.height * scale;
    layer.ctx.drawImage(
      image,
      (WIDTH - imageWidth) / 2,
      (HEIGHT - imageHeight) / 2,
      imageWidth,
      imageHeight
    );
    URL.revokeObjectURL(imageURL);
    saveHistory(layer);
    renderCanvas();
    renderLayers();
  } catch (error) {
    console.error("Image import failed:", error);
    alert("Could not import that image.");
  } finally {
    importInput.value = "";
  }
});
fullscreenButton?.addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }
    const target = document.querySelector("#studio");
    if (!target || !target.requestFullscreen) {
      alert("Fullscreen is not supported by this browser.");
      return;
    }
    await target.requestFullscreen();
  } catch (error) {
    console.error("Fullscreen failed:", error);
  }
});
document.addEventListener("fullscreenchange", () => {
  document.body.classList.toggle(
    "studio-fullscreen",
    document.fullscreenElement !== null
  );
});
function serializeProject() {
  return {
    version: 1,
    width: WIDTH,
    height: HEIGHT,
    layers: layers.map((layer) => ({
      name: layer.name,
      visible: layer.visible,
      opacity: layer.opacity,
      image: layer.canvas.toDataURL("image/png")
    }))
  };
}
async function saveProject() {
  const { data: sessionData, error: sessionError } =
    await supabaseClient.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) {
    throw new Error("Please sign in before saving a project.");
  }
  const name =
    projectNameInput?.value.trim() || "Untitled project";
  const projectData = serializeProject();
  const { data: existing, error: lookupError } =
    await supabaseClient
      .from("studio_projects")
      .select("id")
      .eq("user_id", sessionData.session.user.id)
      .eq("name", name)
      .maybeSingle();
  if (lookupError) throw lookupError;
  let result;
  if (existing) {
    result = await supabaseClient
      .from("studio_projects")
      .update({
        project_data: projectData,
        updated_at: new Date().toISOString()
      })
      .eq("id", existing.id);
  } else {
    result = await supabaseClient
      .from("studio_projects")
      .insert({
        user_id: sessionData.session.user.id,
        name,
        project_data: projectData
      });
  }
  if (result.error) throw result.error;
  await loadSavedProjects();
  showProjectMessage(`Project "${name}" saved successfully.`);
}
saveProjectButton?.addEventListener("click", async () => {
  saveProjectButton.disabled = true;
  showProjectMessage("Saving project...");
  try {
    await saveProject();
  } catch (error) {
    console.error("Save project failed:", error);
    showProjectMessage(error.message, true);
  } finally {
    saveProjectButton.disabled = false;
  }
});
loadProjectButton?.addEventListener("click", async () => {
  const id = projectsDropdown?.value;
  if (!id) {
    showProjectMessage("Choose a project first.", true);
    return;
  }
  loadProjectButton.disabled = true;
  try {
    const { data, error } = await supabaseClient
      .from("studio_projects")
      .select("name, project_data")
      .eq("id", id)
      .single();
    if (error) throw error;
    const saved = data.project_data;
    if (!saved || !Array.isArray(saved.layers) || !saved.layers.length) {
      throw new Error("This project has no valid layer data.");
    }
    const restoredLayers = [];
    for (const item of saved.layers) {
      const layer = createLayer(item.name || "Layer");
      layer.ctx.clearRect(0, 0, WIDTH, HEIGHT);
      if (item.image) {
        const image = new Image();
        await new Promise((resolve, reject) => {
          image.onload = resolve;
          image.onerror = reject;
          image.src = item.image;
        });
        layer.ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
      }
      layer.visible = item.visible !== false;
      layer.opacity = Number.isFinite(item.opacity)
        ? item.opacity
        : 1;
      layer.history = [];
      layer.historyIndex = -1;
      saveHistory(layer);
      restoredLayers.push(layer);
    }
    layers = restoredLayers;
    activeLayerId = layers[layers.length - 1].id;
    nextLayerId = Math.max(...layers.map((layer) => layer.id)) + 1;
    if (projectNameInput) projectNameInput.value = data.name;
    renderLayers();
    renderCanvas();
    showProjectMessage(`Opened "${data.name}".`);
  } catch (error) {
    console.error("Open project failed:", error);
    showProjectMessage(error.message, true);
  } finally {
    loadProjectButton.disabled = false;
  }
});
deleteProjectButton?.addEventListener("click", async () => {
  const id = projectsDropdown?.value;
  if (!id) {
    showProjectMessage("Choose a project to delete.", true);
    return;
  }
  const selectedName =
    projectsDropdown.selectedOptions[0]?.textContent || "this project";
  if (!confirm(`Delete "${selectedName}" permanently?`)) return;
  deleteProjectButton.disabled = true;
  try {
    const { error } = await supabaseClient
      .from("studio_projects")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await loadSavedProjects();
    showProjectMessage("Saved project deleted.");
  } catch (error) {
    console.error("Delete project failed:", error);
    showProjectMessage(error.message, true);
  } finally {
    deleteProjectButton.disabled = false;
  }
});
publishForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = $("#art-title").value.trim();
  const description = $("#art-description").value.trim();
  const selectedCategory = $("#art-category").value;
  if (!title) {
    setMessage(
      publishMessage,
      "Please enter a title for your artwork.",
      "error"
    );
    return;
  }
  publishButton.disabled = true;
  const originalButtonText = publishButton.textContent;
  publishButton.textContent = "Publishing...";
  let uploadedPath = null;
  try {
    setMessage(publishMessage, "Checking your session...");
    const { data, error: sessionError } =
      await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    const session = data.session;
    if (!session) {
      throw new Error("Please sign in to publish your drawing.");
    }
    setMessage(publishMessage, "Preparing your drawing...");
    const canvas = createMergedCanvas();
    const blob = await canvasToBlob(canvas);
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50) || "artwork";
    const path =
      `${session.user.id}/${Date.now()}-${safeTitle}.png`;
    uploadedPath = path;
        setMessage(publishMessage, "Uploading your drawing...");
    const { error: uploadError } = await supabaseClient.storage
      .from("artworks")
      .upload(path, blob, {
        contentType: "image/png",
        upsert: false
      });
    if (uploadError) throw uploadError;
    const { data: publicUrlData } = supabaseClient.storage
      .from("artworks")
      .getPublicUrl(path);
    const imageUrl = publicUrlData.publicUrl;
    setMessage(publishMessage, "Adding it to the gallery...");
    const categoryMap = {
      "Digital Art": "digital",
      "Sketch": "sketch",
      "Pixel Art": "digital",
      "Illustration": "digital",
      "Other": "digital"
    };
    const { error: insertError } = await supabaseClient
      .from("artworks")
      .insert({
        title: title,
        description: description,
        category: categoryMap[selectedCategory] || "digital",
        image_url: imageUrl
      });
    if (insertError) throw insertError;
    publishForm.reset();
    setMessage(
      publishMessage,
      "Published successfully! Open the Gallery page and refresh to see your drawing.",
      "success"
    );
      } catch (error) {
    console.error("Publish artwork failed:", error);
    if (uploadedPath) {
      const { error: cleanupError } = await supabaseClient.storage
        .from("artworks")
        .remove([uploadedPath]);
      if (cleanupError) {
        console.warn(
          "Could not remove the uploaded image:",
          cleanupError
        );
      }
    }
    setMessage(
      publishMessage,
      `Could not publish: ${
        error?.message || "Unknown error"
      }. Check your Supabase policies and try again.`,
      "error"
    );
  } finally {
    publishButton.disabled = false;
    publishButton.textContent = originalButtonText;
  }
});