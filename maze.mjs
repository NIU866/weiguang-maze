export const COLS = 61;
export const ROWS = 29;
export const CELL = 20;
export const WIDTH = COLS * CELL;
export const HEIGHT = ROWS * CELL;
export const MARGIN = 19;
export const FIRST_SEED = 0x5a318c84;

export const directions = [
  { dx: 0, dy: -1, bit: 1, opposite: 4, name: '上' },
  { dx: 1, dy: 0, bit: 2, opposite: 8, name: '右' },
  { dx: 0, dy: 1, bit: 4, opposite: 1, name: '下' },
  { dx: -1, dy: 0, bit: 8, opposite: 2, name: '左' }
];

function generator(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

export function neighbor(id, direction) {
  const d = directions[direction];
  const x = id % COLS + d.dx;
  const y = Math.floor(id / COLS) + d.dy;
  return x >= 0 && x < COLS && y >= 0 && y < ROWS ? y * COLS + x : -1;
}

export function center(id) {
  return [(id % COLS + 0.5) * CELL, (Math.floor(id / COLS) + 0.5) * CELL];
}

export function makeMaze(seed) {
  const random = generator(seed);
  const count = COLS * ROWS;
  const passages = new Uint8Array(count);
  const visited = new Uint8Array(count);
  const heading = new Int8Array(count).fill(-1);
  const root = Math.floor(random() * count);
  const active = [root];
  visited[root] = 1;

  // Usually extend the newest corridor, occasionally branch off an older one.
  while (active.length) {
    const index = random() < 0.76 ? active.length - 1 : Math.floor(random() * active.length);
    const cell = active[index];
    const options = [];
    for (let d = 0; d < 4; d++) {
      const next = neighbor(cell, d);
      if (next >= 0 && !visited[next]) options.push(d);
    }
    if (!options.length) {
      active.splice(index, 1);
      continue;
    }
    let d = options[Math.floor(random() * options.length)];
    if (options.includes(heading[cell]) && random() < 0.25) d = heading[cell];
    const next = neighbor(cell, d);
    passages[cell] |= directions[d].bit;
    passages[next] |= directions[d].opposite;
    heading[next] = d;
    visited[next] = 1;
    active.push(next);
  }

  // A quiet dead end near the upper left gives the first move a clear direction.
  let start = 0;
  let nearest = Infinity;
  for (let i = 0; i < count; i++) {
    if ((passages[i] & (passages[i] - 1)) !== 0) continue;
    const distance = (i % COLS - 9.2) ** 2 + (Math.floor(i / COLS) - 6.1) ** 2;
    if (distance < nearest) {
      start = i;
      nearest = distance;
    }
  }
  const exit = 20 * COLS + COLS - 1;

  // Root the tree at the exit so a hint also works after any wrong turn.
  const towardExit = new Int16Array(count).fill(-1);
  const queue = [exit];
  towardExit[exit] = exit;
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    for (let d = 0; d < 4; d++) {
      if (!(passages[cell] & directions[d].bit)) continue;
      const next = neighbor(cell, d);
      if (towardExit[next] >= 0) continue;
      towardExit[next] = cell;
      queue.push(next);
    }
  }
  return { seed: seed >>> 0, passages, start, exit, towardExit };
}

export function wallPath(maze) {
  const commands = [];
  const exitY = Math.floor(maze.exit / COLS) * CELL;
  commands.push('M0 0H' + WIDTH + 'V' + exitY, 'M' + WIDTH + ' ' + (exitY + CELL) + 'V' + HEIGHT + 'H0V0');
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const p = maze.passages[y * COLS + x];
      const right = (x + 1) * CELL;
      const bottom = (y + 1) * CELL;
      if (x + 1 < COLS && !(p & 2)) commands.push('M' + right + ' ' + (y * CELL) + 'v' + CELL);
      if (y + 1 < ROWS && !(p & 4)) commands.push('M' + (x * CELL) + ' ' + bottom + 'h' + CELL);
    }
  }
  return commands.join('');
}

export function solutionFrom(maze, start = maze.start, limit = COLS * ROWS) {
  const cells = [start];
  while (cells.length <= limit && cells[cells.length - 1] !== maze.exit) {
    cells.push(maze.towardExit[cells[cells.length - 1]]);
  }
  return cells;
}
