import { execFile } from 'node:child_process';
import { access, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

const run = promisify(execFile);
const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const chrome = process.env.CHROME_BIN || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  : 'google-chrome');
const fps = 12;
const seconds = 8;
const workspace = await mkdtemp(path.join(tmpdir(), 'google-photos-cull-'));
const frames = path.join(workspace, 'frames');
const output = path.join(root, 'media', 'demo.gif');

await access(path.join(directory, 'photos', 'PA171331.jpg'));
await mkdir(frames);
await mkdir(path.dirname(output), { recursive: true });

let pending = 0;
let finished = 0;

async function worker(workerIndex) {
  const profile = path.join(workspace, `chrome-${workerIndex}`);
  while (pending < fps * seconds) {
    const frame = pending++;
    const url = pathToFileURL(path.join(directory, 'index.html'));
    url.searchParams.set('t', frame / fps);
    await run(chrome, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-sync',
      '--hide-scrollbars',
      '--window-size=800,540',
      `--user-data-dir=${profile}`,
      `--screenshot=${path.join(frames, `${String(frame).padStart(3, '0')}.png`)}`,
      url.href
    ], { maxBuffer: 1024 * 1024 });
    finished++;
    if (finished % fps === 0) process.stdout.write(`Captured ${finished}/${fps * seconds} frames\n`);
  }
}

try {
  await Promise.all([0, 1, 2, 3].map(worker));
  await run('ffmpeg', [
    '-v', 'error',
    '-framerate', String(fps),
    '-i', path.join(frames, '%03d.png'),
    '-filter_complex', '[0:v]split[a][b];[a]palettegen=stats_mode=diff:max_colors=256[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle',
    '-loop', '0',
    '-y', output
  ]);
  const metadata = JSON.parse((await run('ffprobe', [
    '-v', 'error', '-count_frames', '-show_entries',
    'stream=width,height,nb_read_frames:format=duration,size', '-of', 'json', output
  ])).stdout);
  process.stdout.write(`${JSON.stringify({ output, bytes: (await stat(output)).size, ...metadata }, null, 2)}\n`);
} finally {
  if (process.env.KEEP_DEMO_FRAMES === '1') process.stdout.write(`Frames: ${frames}\n`);
  else await rm(workspace, { recursive: true, force: true });
}
