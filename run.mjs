import { COLS, ROWS, directions, neighbor } from './maze.mjs';

export function createRun(maze, saved) {
  const fresh = { position: maze.start, route: [maze.start], steps: 0 };
  if (!saved || !Array.isArray(saved.route) || !Number.isSafeInteger(saved.steps)) return fresh;
  const route = saved.route;
  if (route[0] !== maze.start || route.length > COLS * ROWS || saved.steps < route.length - 1) return fresh;
  if (new Set(route).size !== route.length) return fresh;
  for (let i = 1; i < route.length; i++) {
    const from = route[i - 1];
    if (from === maze.exit || !directions.some((d, k) => (maze.passages[from] & d.bit) && neighbor(from, k) === route[i])) return fresh;
  }
  return { position: route[route.length - 1], route: route.slice(), steps: saved.steps };
}

export function advance(maze, run, direction) {
  if (run.position === maze.exit || !(maze.passages[run.position] & directions[direction].bit)) return false;
  const next = neighbor(run.position, direction);
  if (run.route[run.route.length - 2] === next) run.route.pop();
  else run.route.push(next);
  run.position = next;
  run.steps++;
  return true;
}
