import { CELL, COLS, ROWS, WIDTH, HEIGHT, MARGIN, FIRST_SEED, center, directions, makeMaze, neighbor, solutionFrom } from './maze.mjs';
import { FULL_VIEW, scene } from './scene.mjs';
import { createRun, advance } from './run.mjs';

const el = id => document.getElementById(id);
const stage = el('stage');
const field = el('field');
const finish = el('finish');
const hintButton = el('hint');
const keyDirections = { arrowup: 0, w: 0, arrowright: 1, d: 1, arrowdown: 2, s: 2, arrowleft: 3, a: 3 };
const storageKey = 'weiguang-maze.run.v1';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const heldKeys = new Map();
let maze, run, player, chalk, footprints, hints;
let drawn = [0, 0], animation = 0, elapsed = 0, activeSince = null;
let near = false, manualZoom = false, lastView = '';
let hold = null, repeatTimer = 0, gesture = null, hintTimer = 0, toastTimer = 0;

function announcement(text) {
  el('announcement').textContent = text;
}

function toast(text) {
  clearTimeout(toastTimer);
  const node = el('toast');
  node.textContent = text;
  node.classList.add('show');
  toastTimer = setTimeout(() => node.classList.remove('show'), 1550);
  announcement(text);
}

function timeSpent() {
  return elapsed + (activeSince === null ? 0 : performance.now() - activeSince);
}

function clockText() {
  const seconds = Math.floor(timeSpent() / 1000);
  const pair = number => String(number).padStart(2, '0');
  if (seconds >= 3600) return Math.floor(seconds / 3600) + ':' + pair(Math.floor(seconds / 60) % 60) + ':' + pair(seconds % 60);
  return pair(Math.floor(seconds / 60)) + ':' + pair(seconds % 60);
}

function stopClock() {
  elapsed = timeSpent();
  activeSince = null;
}

function startClock() {
  if (activeSince === null && !document.hidden && run.position !== maze.exit) activeSince = performance.now();
}

function refreshClock() {
  const value = clockText();
  if (el('time').textContent !== value) el('time').textContent = value;
}

function save() {
  if (!run) return;
  try {
    sessionStorage.setItem(storageKey, JSON.stringify({ seed: maze.seed, route: run.route, steps: run.steps, elapsed: Math.floor(timeSpent()) }));
  } catch { /* The maze also works when browser storage is unavailable. */ }
}

function readSave() {
  try {
    const data = JSON.parse(sessionStorage.getItem(storageKey));
    if (data && Number.isInteger(data.seed) && data.seed >= 0 && data.seed <= 0xffffffff) return data;
  } catch { /* Start fresh if the browser has no usable session. */ }
  return null;
}

function axisStart(centerAt, span, extent) {
  if (span >= extent + 2 * MARGIN) return (extent - span) / 2;
  return Math.max(-MARGIN, Math.min(extent + MARGIN - span, centerAt - span / 2));
}

function updateView() {
  const { clientWidth: w, clientHeight: h } = stage;
  if (w < 1 || h < 1) return;
  const fit = Math.min(w / FULL_VIEW[2], h / FULL_VIEW[3]);
  const detail = Math.max(1.32, 1.95 * fit);
  // Fill modest differences in screen shape while keeping extreme aspect ratios legible.
  const vw = near ? w / detail : Math.max(FULL_VIEW[2], w / (fit * 1.12));
  const vh = near ? h / detail : Math.max(FULL_VIEW[3], h / (fit * 1.12));
  const view = near
    ? [axisStart(drawn[0], vw, WIDTH), axisStart(drawn[1], vh, HEIGHT), vw, vh]
    : [(WIDTH - vw) / 2, (HEIGHT - vh) / 2, vw, vh];
  const value = view.map(n => +n.toFixed(2)).join(' ');
  if (value !== lastView) {
    field.setAttribute('viewBox', value);
    lastView = value;
  }
}

function zoomLabel() {
  const title = near ? '查看全图' : '放大迷宫';
  el('zoom-icon').setAttribute('href', near ? '#i-zoom-out' : '#i-zoom-in');
  el('zoom-name').textContent = near ? '全图' : '放大';
  el('zoom').setAttribute('aria-label', title);
  el('zoom').title = title;
}

function resized() {
  if (!manualZoom) {
    const cellPixels = CELL * Math.min(stage.clientWidth / FULL_VIEW[2], stage.clientHeight / FULL_VIEW[3]);
    near = cellPixels < 10.5;
  }
  zoomLabel();
  updateView();
}

function place(x, y) {
  drawn = [x, y];
  player.setAttribute('transform', `translate(${x} ${y})`);
  chalk.setAttribute('cx', x);
  chalk.setAttribute('cy', y);
  if (near) updateView();
}

function moveLight(previousCell, cell) {
  cancelAnimationFrame(animation);
  const from = center(previousCell), to = center(cell);
  if (reducedMotion.matches) return place(...to);
  place(...from);
  const began = performance.now();
  function frame(now) {
    const fraction = Math.min(1, (now - began) / 82);
    const mix = 1 - (1 - fraction) ** 2;
    place(from[0] + (to[0] - from[0]) * mix, from[1] + (to[1] - from[1]) * mix);
    if (fraction < 1) animation = requestAnimationFrame(frame);
  }
  animation = requestAnimationFrame(frame);
}

function drawTrail() {
  const won = run.position === maze.exit;
  const tail = won ? run.route : run.route.slice(-24);
  footprints.setAttribute('points', tail.map(id => center(id).join(',')).join(' '));
  footprints.setAttribute('stroke', won ? '#c8ae7b' : '#8a969e');
  footprints.setAttribute('stroke-opacity', won ? '.83' : '.33');
}

function clearHint() {
  clearTimeout(hintTimer);
  if (hints) hints.replaceChildren();
  hintButton.classList.remove('lit');
}

function showHint() {
  if (run.position === maze.exit) return;
  clearHint();
  const next = solutionFrom(maze, run.position, 7);
  const points = next.map(center);
  const dots = points.slice(1).map(([x, y], i) =>
    `<circle cx="${x}" cy="${y}" r="${i === 0 ? 2.55 : 1.9}" opacity="${(1 - i * .085).toFixed(2)}"/>`
  ).join('');
  hints.innerHTML = `<polyline points="${points.map(p => p.join(',')).join(' ')}" stroke="#d1b278" stroke-opacity=".52" stroke-width="1.35" stroke-linejoin="round" fill="none"/>${dots}`;
  hintButton.classList.add('lit');
  const direction = directions.findIndex((_, d) => neighbor(run.position, d) === next[1]);
  announcement('前方的路线已亮起。先向' + directions[direction].name + '走。');
  hintTimer = setTimeout(clearHint, 5200);
}

function stopHold() {
  clearTimeout(repeatTimer);
  if (hold && hold.button) hold.button.classList.remove('held');
  hold = null;
}

function stopInput() {
  stopHold();
  heldKeys.clear();
  gesture = null;
}

function complete() {
  stopInput();
  stopClock();
  clearHint();
  hintButton.disabled = true;
  refreshClock();
  const message = '走了 ' + run.steps + ' 步，用时 ' + clockText() + '。';
  el('finish-stats').textContent = message;
  announcement('找到出口了。' + message);
  if (!finish.open) finish.showModal();
}

function move(direction) {
  const previousCell = run.position;
  if (!advance(maze, run, direction)) return;
  if (run.position !== maze.exit) startClock();
  el('step-count').textContent = run.steps;
  moveLight(previousCell, run.position);
  drawTrail();
  if (run.position === maze.exit) complete();
  save();
}

function startHold(direction, source, button = null) {
  if (hold && hold.direction === direction && hold.source === source) return;
  stopHold();
  if (run.position === maze.exit) return;
  hold = { direction, source, button };
  if (button) button.classList.add('held');
  move(direction);
  if (!hold) return;
  function tick() {
    if (!hold) return;
    move(hold.direction);
    if (hold) repeatTimer = setTimeout(tick, 105);
  }
  repeatTimer = setTimeout(tick, 215);
}

function loadMaze(seed, saved = null) {
  stopInput();
  clearHint();
  cancelAnimationFrame(animation);
  clearTimeout(toastTimer);
  el('toast').classList.remove('show');
  if (finish.open) finish.close();
  maze = makeMaze(seed);
  run = createRun(maze, saved);
  activeSince = null;
  elapsed = run.steps && Number.isFinite(saved?.elapsed) ? Math.max(0, saved.elapsed) : 0;
  field.innerHTML = scene(maze);
  player = el('player');
  chalk = el('chalk');
  footprints = el('footprints');
  hints = el('hint-layer');
  hintButton.disabled = false;
  el('step-count').textContent = run.steps;
  place(...center(run.position));
  drawTrail();
  resized();
  refreshClock();
  if (run.position === maze.exit) complete();
}

function newMaze() {
  let seed = crypto.getRandomValues(new Uint32Array(1))[0];
  if (seed === maze.seed) seed = (seed + 1) >>> 0;
  loadMaze(seed);
  save();
  stage.focus({ preventScroll: true });
  toast('已换一座迷宫');
}

el('zoom').addEventListener('click', () => {
  near = !near;
  manualZoom = true;
  zoomLabel();
  updateView();
});
hintButton.addEventListener('click', showHint);
el('new').addEventListener('click', newMaze);
el('again').addEventListener('click', newMaze);
el('see-route').addEventListener('click', () => {
  finish.close();
  near = false;
  manualZoom = true;
  zoomLabel();
  updateView();
  stage.focus({ preventScroll: true });
});

function movementKey(event) {
  const key = event.key.toLowerCase();
  if (Object.hasOwn(keyDirections, key)) return [key, keyDirections[key]];
  const physical = /^Key([WASD])$/.exec(event.code);
  if (physical) return [physical[1].toLowerCase(), keyDirections[physical[1].toLowerCase()]];
  return null;
}

window.addEventListener('keydown', event => {
  if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing || finish.open) return;
  if (event.key.toLowerCase() === 'h') {
    event.preventDefault();
    if (!event.repeat) showHint();
    return;
  }
  const key = movementKey(event);
  if (!key) return;
  event.preventDefault();
  if (heldKeys.has(key[0])) return;
  heldKeys.set(...key);
  startHold(key[1], 'key-' + key[0]);
});
window.addEventListener('keyup', event => {
  const key = movementKey(event);
  if (!key) return;
  heldKeys.delete(key[0]);
  if (!hold || hold.source !== 'key-' + key[0]) return;
  stopHold();
  const previous = Array.from(heldKeys).at(-1);
  if (previous) startHold(previous[1], 'key-' + previous[0]);
});

document.querySelectorAll('.pad button').forEach(button => {
  const d = Number(button.dataset.dir);
  button.addEventListener('pointerdown', e => {
    if (!e.isPrimary || e.button !== 0) return;
    e.preventDefault();
    button.setPointerCapture(e.pointerId);
    startHold(d, 'pad-' + e.pointerId, button);
  });
  const release = e => {
    if (hold?.source === 'pad-' + e.pointerId) stopHold();
  };
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, release);
  button.addEventListener('click', e => { if (e.detail === 0) move(d); });
});

function swipeDirection(dx, dy) {
  return Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0);
}

function tapAdjacent(e) {
  const matrix = field.getScreenCTM();
  if (!matrix) return;
  const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(matrix.inverse());
  const col = Math.floor(point.x / CELL), row = Math.floor(point.y / CELL);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
  const target = row * COLS + col;
  const d = directions.findIndex((_, direction) => neighbor(run.position, direction) === target);
  if (d >= 0) move(d);
}

stage.addEventListener('pointerdown', e => {
  if (!e.isPrimary || e.button !== 0 || run.position === maze.exit) return;
  stage.focus({ preventScroll: true });
  stage.setPointerCapture(e.pointerId);
  gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, dragged: false };
});
stage.addEventListener('pointermove', e => {
  if (!gesture || gesture.id !== e.pointerId) return;
  const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 13) return;
  gesture.x = e.clientX;
  gesture.y = e.clientY;
  gesture.dragged = true;
  startHold(swipeDirection(dx, dy), 'swipe-' + e.pointerId);
});
stage.addEventListener('pointerup', e => {
  if (!gesture || gesture.id !== e.pointerId) return;
  if (!gesture.dragged) {
    const dx = e.clientX - gesture.x, dy = e.clientY - gesture.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) >= 13) move(swipeDirection(dx, dy));
    else tapAdjacent(e);
  }
  if (hold?.source === 'swipe-' + e.pointerId) stopHold();
  gesture = null;
});
function cancelGesture(e) {
  if (gesture?.id === e.pointerId) gesture = null;
  if (hold?.source === 'swipe-' + e.pointerId) stopHold();
}
stage.addEventListener('pointercancel', cancelGesture);
stage.addEventListener('lostpointercapture', cancelGesture);

function suspend() {
  stopInput();
  stopClock();
  save();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) suspend();
  else if (run.steps) startClock();
});
window.addEventListener('blur', suspend);
window.addEventListener('focus', () => { if (run?.steps) startClock(); });
window.addEventListener('pagehide', suspend);
new ResizeObserver(resized).observe(stage);
const saved = readSave();
loadMaze(saved ? saved.seed : FIRST_SEED, saved);
setInterval(refreshClock, 400);
