'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const effects = require('../native-call-effects.js');

function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
function track(kind, name = kind) {
  const listeners = new Map();
  return {
    kind, name, enabled: true, muted: false, readyState: 'live', stopped: 0,
    getSettings: () => ({ width: 1920, height: 1080 }),
    stop() { this.stopped++; this.readyState = 'ended'; },
    addEventListener(name, fn) { listeners.set(name, fn); },
    removeEventListener(name, fn) { if (listeners.get(name) === fn) listeners.delete(name); },
    end() { this.readyState = 'ended'; listeners.get('ended')?.(); }
  };
}
class Stream {
  constructor(tracks = []) { this.tracks = tracks.slice(); }
  getTracks() { return this.tracks.slice(); }
  getVideoTracks() { return this.tracks.filter(t => t.kind === 'video'); }
  getAudioTracks() { return this.tracks.filter(t => t.kind === 'audio'); }
}
function harness(extra = {}) {
  let nextId = 1;
  const timeouts = new Map(), intervals = new Map(), frames = new Map(), videos = [], canvases = [], captures = [], contexts = [], recorders = [];
  const displayTrack = track('video', 'display'), display = new Stream([displayTrack]);
  const calls = [];
  function node() { return { connections: [], disconnected: 0, connect(other) { this.connections.push(other); }, disconnect() { this.disconnected++; } }; }
  class AudioContext {
    constructor() { this.sources = []; this.gains = []; this.closed = 0; contexts.push(this); }
    createMediaStreamDestination() { this.mix = { ...node(), stream: new Stream([track('audio', 'mixed')]) }; return this.mix; }
    createDynamicsCompressor() { this.compressor = node(); return this.compressor; }
    createMediaStreamSource(stream) { const source = { ...node(), stream }; this.sources.push(source); return source; }
    createGain() { const gain = { ...node(), gain: { value: 1 } }; this.gains.push(gain); return gain; }
    async resume() { if (extra.resumeGate) await extra.resumeGate.promise; }
    async close() { this.closed++; }
  }
  class Recorder {
    static isTypeSupported(type) { return !extra.noWebM && type.startsWith('video/webm'); }
    constructor(stream, options) { this.stream = stream; this.options = options; this.state = 'inactive'; this.stops = 0; recorders.push(this); }
    start(timeslice) { if (extra.startError) throw new Error('start failed'); this.timeslice = timeslice; this.state = 'recording'; }
    emit(chunk) { this.ondataavailable?.({ data: typeof chunk === 'string' ? new Blob([chunk]) : chunk }); }
    stop() { this.stops++; this.state = 'inactive'; queueMicrotask(() => { if (extra.finalChunk) this.emit(extra.finalChunk); this.onstop?.(); }); }
  }
  const document = {
    createElement(tag) {
      if (tag === 'video') {
        const video = { readyState: 2, videoWidth: 640, videoHeight: 480, paused: 0, async play() { if (extra.playError) throw new Error('play blocked'); }, pause() { this.paused++; } };
        videos.push(video); return video;
      }
      if (tag === 'canvas') {
        const draws = [];
        const context = { draws, fillRect() {}, fillText() {}, save() {}, restore() {}, beginPath() {}, arc() {}, clip() {}, stroke() {}, drawImage(...args) { draws.push(args); } };
        const canvas = { context, getContext() { return context; }, captureStream(fps) { const s = new Stream([track('video', 'canvas')]); s.fps = fps; captures.push(s); return s; } };
        canvases.push(canvas); return canvas;
      }
      throw new Error('Unexpected element ' + tag);
    }
  };
  const dependencies = {
    document, MediaStream: Stream, MediaRecorder: Recorder, AudioContext, Blob,
    mediaDevices: { async getDisplayMedia(options) { calls.push(options); return display; } },
    requestAnimationFrame(fn) { const id = nextId++; frames.set(id, fn); return id; },
    cancelAnimationFrame(id) { frames.delete(id); },
    setTimeout(fn, delay) { const id = nextId++; timeouts.set(id, { fn, delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(fn, delay) { const id = nextId++; intervals.set(id, { fn, delay }); return id; },
    clearInterval(id) { intervals.delete(id); }
  };
  return {
    dependencies, calls, display, displayTrack, videos, canvases, captures, contexts, recorders, timeouts, intervals, frames,
    refresh() { Array.from(intervals.values()).forEach(t => t.fn()); },
    frame(timestamp = 100) { const pending = Array.from(frames.values()); frames.clear(); pending.forEach(fn => fn(timestamp)); },
    timeout(delay) { const found = Array.from(timeouts.entries()).find(([, t]) => t.delay === delay); assert.ok(found, 'expected timer ' + delay); timeouts.delete(found[0]); found[1].fn(); }
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));

test('plain screen sharing requests no audio and stops only the acquired display stream once', async () => {
  const h = harness(); let ended = 0;
  const camera = track('video', 'camera');
  const share = await effects.createScreenShare({ dependencies: h.dependencies, cameraStream: new Stream([camera]), onEnded: () => ended++ });
  assert.equal(h.calls[0].audio, false);
  assert.equal(share.track, h.displayTrack);
  h.displayTrack.end(); share.stop();
  assert.equal(h.displayTrack.stopped, 1);
  assert.equal(camera.stopped, 0);
  assert.equal(ended, 1);
});

test('camera bubble composes a capped video-only canvas and releases borrowed camera elements safely', async () => {
  const h = harness(); const camera = track('video', 'camera'), mic = track('audio', 'mic'); let ended = 0;
  const share = await effects.createScreenShare({ dependencies: h.dependencies, cameraStream: new Stream([camera, mic]), withCameraBubble: true, onEnded: () => ended++ });
  assert.equal(h.canvases[0].width, 1280);
  assert.equal(h.canvases[0].height, 720);
  assert.equal(share.stream.getAudioTracks().length, 0);
  assert.equal(share.stream.fps, 15);
  assert.equal(h.canvases[0].context.draws.length, 2);
  camera.enabled = false; h.frame();
  assert.equal(h.canvases[0].context.draws.length, 3, 'muted camera bubble is not rendered');
  share.stop(); share.stop();
  assert.equal(h.frames.size, 0);
  assert.equal(h.captures[0].getVideoTracks()[0].stopped, 1);
  assert.equal(h.displayTrack.stopped, 1);
  assert.equal(camera.stopped + mic.stopped, 0);
  assert.ok(h.videos.every(v => v.srcObject === null && v.paused === 1));
  assert.equal(ended, 1);
});

test('failed screen composition cleans the display without stopping the caller camera', async () => {
  const h = harness({ playError: true }); const camera = track('video');
  await assert.rejects(effects.createScreenShare({ dependencies: h.dependencies, cameraStream: new Stream([camera]), withCameraBubble: true }), /play blocked/);
  assert.equal(h.displayTrack.stopped, 1);
  assert.equal(camera.stopped, 0);
  assert.equal(h.frames.size, 0);
});

test('recording starts only explicitly, deduplicates borrowed tracks and mixes enabled microphones', async () => {
  const h = harness(); const local = track('audio', 'local'), remote = track('audio', 'remote'), camera = track('video', 'camera');
  let streams = [new Stream([local, camera]), new Stream([local]), new Stream([remote])];
  const blobs = [], errors = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => streams, onStop: b => blobs.push(b), onError: e => errors.push(e) });
  assert.equal(h.contexts.length + h.recorders.length + h.canvases.length, 0);
  assert.equal(recording.active, false);
  await recording.start();
  assert.equal(recording.active, true);
  assert.equal(h.contexts[0].sources.length, 2);
  assert.equal(h.recorders[0].stream.getTracks().length, 2, 'one composite video and one mixed audio');
  assert.equal(h.recorders[0].timeslice, 1000);
  assert.equal(h.contexts[0].gains[0].gain.value, 0.7);
  local.enabled = false; h.refresh();
  assert.equal(h.contexts[0].gains[0].gain.value, 0);
  const replacement = track('audio', 'replacement'); streams = [new Stream([local, camera]), new Stream([replacement])]; h.refresh();
  assert.equal(h.contexts[0].sources[1].disconnected, 1);
  assert.equal(h.contexts[0].sources[2].stream.getTracks()[0], replacement);
  h.recorders[0].emit('recorded webm payload');
  const blob = await recording.stop();
  assert.equal(recording.active, false);
  assert.equal(blobs.length, 1); assert.equal(blob, blobs[0]);
  assert.equal(blob.type, 'video/webm;codecs=vp8,opus');
  assert.equal(await blob.text(), 'recorded webm payload');
  assert.equal(errors.length, 0);
  for (const t of [local, remote, camera, replacement]) assert.equal(t.stopped, 0);
  assert.equal(h.frames.size + h.intervals.size + h.timeouts.size, 0);
  assert.equal(h.contexts[0].closed, 1);
  assert.equal(h.captures[0].getVideoTracks()[0].stopped, 1);
  assert.equal(h.contexts[0].mix.stream.getAudioTracks()[0].stopped, 1);
});

test('empty recordings never invoke onStop and do not produce a download', async () => {
  const h = harness(); let calls = 0;
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], onStop: () => calls++ });
  await recording.start(); assert.equal(await recording.stop(), null);
  assert.equal(calls, 0); assert.equal(h.recorders[0].stops, 1);
  await recording.stop(); assert.equal(h.recorders[0].stops, 1);
});

test('final asynchronous recorder chunks are included after stop before producing the blob', async () => {
  const h = harness({ finalChunk: 'tail' }); const blobs = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], onStop: b => blobs.push(b) });
  await recording.start(); h.recorders[0].emit('header');
  const blob = await recording.stop();
  assert.equal(await blob.text(), 'headertail'); assert.equal(blobs.length, 1);
});

test('duration limit stops recording, releases resources and returns existing nonempty data', async () => {
  const h = harness(); const errors = [], blobs = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], maxDurationMs: 20, onError: e => errors.push(e), onStop: b => blobs.push(b) });
  await recording.start(); h.recorders[0].emit('data'); h.timeout(20); await tick();
  assert.equal(recording.active, false); assert.equal(h.recorders[0].stops, 1);
  assert.equal(errors[0].name, 'RecordingLimitError'); assert.equal(blobs.length, 1);
  assert.equal(h.frames.size + h.timeouts.size + h.intervals.size, 0);
});

test('byte limit leaves final-chunk headroom and never retains an oversized recording', async () => {
  const h = harness({ finalChunk: 'fin' }); const errors = [], blobs = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], maxBytes: 100, onError: e => errors.push(e), onStop: b => blobs.push(b) });
  await recording.start(); h.recorders[0].emit('x'.repeat(90)); await tick();
  assert.equal(recording.active, false); assert.equal(blobs[0].size, 93);
  assert.equal(errors.length, 1);
  const over = harness(); let oversizedResult = 0; const overErrors = [];
  const second = effects.createRecorder({ dependencies: over.dependencies, getStreams: () => [], maxBytes: 100, onStop: () => oversizedResult++, onError: e => overErrors.push(e) });
  await second.start(); over.recorders[0].emit('x'.repeat(101)); await tick();
  assert.equal(oversizedResult, 0); assert.equal(overErrors.length, 1); assert.equal(second.active, false);
});

test('close discards pending data and cannot stop borrowed streams or invoke a late onStop', async () => {
  const h = harness({ finalChunk: 'tail' }); const mic = track('audio'); let stopped = 0;
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [new Stream([mic])], onStop: () => stopped++ });
  await recording.start(); h.recorders[0].emit('data');
  await recording.close(); await recording.close();
  assert.equal(stopped, 0); assert.equal(mic.stopped, 0); assert.equal(h.contexts[0].closed, 1);
  await assert.rejects(recording.start(), /new recorder/);
});

test('closing during audio startup cancels all later capture and reports no spurious error', async () => {
  const gate = deferred(), h = harness({ resumeGate: gate }); const errors = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], onError: e => errors.push(e) });
  const starting = recording.start(); const closing = recording.close(); gate.resolve();
  await assert.rejects(starting, e => e.name === 'AbortError'); await closing;
  assert.equal(h.recorders.length + h.captures.length, 0);
  assert.equal(h.contexts[0].closed, 1); assert.equal(errors.length, 0);
});

test('unsupported WebM and encoder startup failures clean resources and surface errors', async () => {
  const h = harness({ noWebM: true }); const errors = [];
  const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], onError: e => errors.push(e) });
  await assert.rejects(recording.start(), /WebM/); assert.equal(errors.length, 1);
  const broken = harness({ startError: true }); const second = effects.createRecorder({ dependencies: broken.dependencies, getStreams: () => [] });
  await assert.rejects(second.start(), /start failed/);
  assert.equal(broken.contexts[0].closed, 1); assert.equal(broken.captures[0].getVideoTracks()[0].stopped, 1);
  assert.equal(broken.frames.size, 0);
});

test('hard duration and byte ceilings cannot be raised by options', async () => {
  assert.equal(effects.maxRecordingDurationMs, 1800000); assert.equal(effects.maxRecordingBytes, 250000000);
  const h = harness(); const recording = effects.createRecorder({ dependencies: h.dependencies, getStreams: () => [], maxDurationMs: 999999999, maxBytes: 999999999 });
  await recording.start();
  assert.ok(Array.from(h.timeouts.values()).some(t => t.delay === 1800000));
  await recording.close();
});
