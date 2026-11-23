import { WIDTH, HEIGHT, MARGIN, center, wallPath } from './maze.mjs';

export const FULL_VIEW = [-MARGIN, -MARGIN, WIDTH + 2 * MARGIN, HEIGHT + 2 * MARGIN];

export function scene(maze) {
  const [sx, sy] = center(maze.start);
  const [ex, ey] = center(maze.exit);
  const wall = wallPath(maze);
  return `
    <defs>
      <radialGradient id="floor" gradientUnits="userSpaceOnUse" cx="560" cy="240" r="780" gradientTransform="translate(0 32) scale(1 .86)">
        <stop stop-color="#0b0e12"/><stop offset=".56" stop-color="#080a0d"/><stop offset="1" stop-color="#040506"/>
      </radialGradient>
      <radialGradient id="graphite" gradientUnits="userSpaceOnUse" cx="553" cy="221" r="842" gradientTransform="translate(0 34) scale(1 .87)">
        <stop stop-color="#75808d"/><stop offset=".47" stop-color="#636d79"/><stop offset=".81" stop-color="#505965"/><stop offset="1" stop-color="#454d58"/>
      </radialGradient>
      <radialGradient id="chalk" gradientUnits="userSpaceOnUse" cx="${sx}" cy="${sy}" r="132">
        <stop stop-color="#eff1ef" stop-opacity=".67"/><stop offset=".3" stop-color="#b6c0c8" stop-opacity=".34"/>
        <stop offset="1" stop-color="#9cabb6" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="player-halo">
        <stop stop-color="#fffdf2" stop-opacity=".85"/><stop offset=".075" stop-color="#faf9ec" stop-opacity=".64"/>
        <stop offset=".21" stop-color="#d7dce1" stop-opacity=".31"/><stop offset=".48" stop-color="#b9c6d4" stop-opacity=".105"/>
        <stop offset="1" stop-color="#a1b1ca" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="player-core">
        <stop stop-color="#ffffff"/><stop offset=".2" stop-color="#fffdef"/><stop offset=".5" stop-color="#e6e7db" stop-opacity=".45"/>
        <stop offset="1" stop-color="#e3e8ee" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="gate-halo">
        <stop stop-color="#efc77e" stop-opacity=".37"/><stop offset=".22" stop-color="#d7a85d" stop-opacity=".22"/>
        <stop offset=".65" stop-color="#b48a47" stop-opacity=".065"/><stop offset="1" stop-color="#a1783d" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="gate-line"><stop stop-color="#c8a263" stop-opacity=".12"/><stop offset=".56" stop-color="#f0cc89"/><stop offset="1" stop-color="#d3ad70" stop-opacity=".18"/></linearGradient>
      <path id="walls" d="${wall}"/>
    </defs>
    <rect x="-4000" y="-4000" width="10000" height="10000" fill="url(#floor)"/>
    <use href="#walls" fill="none" stroke="url(#graphite)" stroke-width="1.13" stroke-linejoin="miter" stroke-linecap="square"/>
    <use href="#walls" fill="none" stroke="url(#chalk)" stroke-width="1.14" stroke-linecap="square"/>
    <polyline id="footprints" fill="none" stroke="#8a969e" stroke-opacity=".33" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>
    <g transform="translate(${ex} ${ey})">
      <circle r="43" fill="url(#gate-halo)"/>
      <path d="M-6 0H24" stroke="url(#gate-line)" stroke-width="1"/>
      <path d="M10 -10v4m0 12v4m-5 -20h5m-5 20h5" fill="none" stroke="#d3af76" stroke-width="1.35"/>
      <path d="M0 -5.4 4.4 0 0 5.4 -4.4 0Z" stroke="#efc883" fill="#332b20" stroke-width="1.4"/>
      <circle r="1.3" fill="#ffdfa4"/>
    </g>
    <g id="hint-layer" fill="#e9c68a"></g>
    <g id="player" transform="translate(${sx} ${sy})">
      <circle r="38" fill="url(#player-halo)" class="aura"/>
      <circle r="11" fill="url(#player-core)"/>
      <path d="M-7.2 0 -1 -.95 0 -7.4 1 -.95 7.2 0 1.05 1.05 0 7.4 -1.05 1.05Z" fill="#fffcee" opacity=".74"/>
      <circle r="2.35" fill="#fffff5"/>
    </g>`;
}

export function artwork(maze, pixelWidth = 2516) {
  const view = FULL_VIEW.join(' ');
  const pixelHeight = Math.round(pixelWidth * FULL_VIEW[3] / FULL_VIEW[2]);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${pixelHeight}" viewBox="${view}">${scene(maze)}</svg>`;
}
