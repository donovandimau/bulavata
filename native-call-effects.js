/* Optional, local-only screen composition and recording for Dimau calls.
 * Caller-owned microphone/camera/remote streams are never stopped here.
 * Recording authorization, agreement and visible notices belong to the UI/server.
 */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.DimauCallEffects = api;
}(typeof window === 'object' ? window : null, function (root) {
  'use strict';
  var MAX_DURATION = 30 * 60 * 1000;
  var MAX_BYTES = 250000000;
  var FPS = 15;

  function environment(options) {
    var deps = options.dependencies || {};
    var browser = root || {};
    return {
      document: deps.document || browser.document,
      mediaDevices: deps.mediaDevices || (browser.navigator && browser.navigator.mediaDevices),
      MediaStream: deps.MediaStream || browser.MediaStream,
      MediaRecorder: deps.MediaRecorder || browser.MediaRecorder,
      AudioContext: deps.AudioContext || browser.AudioContext || browser.webkitAudioContext,
      Blob: deps.Blob || (typeof Blob === 'function' ? Blob : browser.Blob),
      raf: deps.requestAnimationFrame || (browser.requestAnimationFrame && browser.requestAnimationFrame.bind(browser)),
      caf: deps.cancelAnimationFrame || (browser.cancelAnimationFrame && browser.cancelAnimationFrame.bind(browser)),
      setTimeout: deps.setTimeout || setTimeout, clearTimeout: deps.clearTimeout || clearTimeout,
      setInterval: deps.setInterval || setInterval, clearInterval: deps.clearInterval || clearInterval
    };
  }
  function call(fn, value) { if (typeof fn === 'function') try { fn(value); } catch (_) {} }
  function stopTracks(stream) { if (stream && stream.getTracks) stream.getTracks().forEach(function (track) { try { track.stop(); } catch (_) {} }); }
  function releaseVideo(video) { if (!video) return; try { video.pause(); } catch (_) {} video.srcObject = null; }
  function videoFor(env, stream) {
    var video = env.document.createElement('video');
    video.muted = true; video.autoplay = true; video.playsInline = true; video.srcObject = stream;
    return video;
  }
  function live(track) { return track && track.readyState !== 'ended'; }
  function drawContain(context, video, x, y, width, height) {
    var vw = video.videoWidth || width, vh = video.videoHeight || height;
    if (video.readyState !== undefined && video.readyState < 2) return;
    var ratio = Math.min(width / vw, height / vh);
    var w = vw * ratio, h = vh * ratio;
    try { context.drawImage(video, x + (width - w) / 2, y + (height - h) / 2, w, h); } catch (_) { /* A source can end between the readiness check and drawing. */ }
  }
  function abortError() { var error = new Error('Recording was cancelled.'); error.name = 'AbortError'; return error; }

  async function createScreenShare(options) {
    options = options || {};
    var env = environment(options);
    if (!env.mediaDevices || typeof env.mediaDevices.getDisplayMedia !== 'function') throw new Error('Screen sharing is not supported in this browser.');
    var display = await env.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: FPS, max: 30 } }, audio: false });
    var displayTrack = display.getVideoTracks()[0];
    var composed = null, frame = null, displayVideo = null, cameraVideo = null, stopped = false, ended = false;
    function stop() {
      if (stopped) return;
      stopped = true;
      if (frame !== null && env.caf) env.caf(frame);
      if (displayTrack && displayTrack.removeEventListener) displayTrack.removeEventListener('ended', stop);
      stopTracks(composed); stopTracks(display);
      releaseVideo(displayVideo); releaseVideo(cameraVideo);
      if (!ended) { ended = true; call(options.onEnded); }
    }
    try {
      if (!displayTrack || !live(displayTrack)) throw new Error('No screen was shared.');
      if (displayTrack.addEventListener) displayTrack.addEventListener('ended', stop);
      var cameraTrack = options.cameraStream && options.cameraStream.getVideoTracks().find(live);
      if (!options.withCameraBubble || !cameraTrack) return { stream: display, track: displayTrack, stop: stop };
      if (!env.document || !env.MediaStream || !env.raf || !env.caf) throw new Error('Camera overlay is not supported in this browser.');
      var canvas = env.document.createElement('canvas');
      var settings = typeof displayTrack.getSettings === 'function' ? displayTrack.getSettings() : {};
      var width = settings.width || 1280, height = settings.height || 720;
      var scale = Math.min(1, 1280 / width, 720 / height);
      canvas.width = Math.max(2, Math.round(width * scale)); canvas.height = Math.max(2, Math.round(height * scale));
      var context = canvas.getContext('2d', { alpha: false });
      if (!context || typeof canvas.captureStream !== 'function') throw new Error('Camera overlay is not supported in this browser.');
      displayVideo = videoFor(env, display);
      cameraVideo = videoFor(env, new env.MediaStream([cameraTrack]));
      await Promise.all([displayVideo.play(), cameraVideo.play()]);
      if (stopped || !live(displayTrack)) throw new Error('Screen sharing ended before it was ready.');
      var lastFrame = -Infinity;
      function draw(timestamp) {
        if (stopped) return;
        if (timestamp - lastFrame >= 1000 / FPS) {
          lastFrame = timestamp;
          context.fillStyle = '#062c49'; context.fillRect(0, 0, canvas.width, canvas.height);
          drawContain(context, displayVideo, 0, 0, canvas.width, canvas.height);
          if (live(cameraTrack) && cameraTrack.enabled !== false && !cameraTrack.muted) {
            var size = Math.min(canvas.width, canvas.height) * 0.24, margin = size * 0.15;
            var cx = canvas.width - margin - size / 2, cy = canvas.height - margin - size / 2;
            context.save(); context.beginPath(); context.arc(cx, cy, size / 2, 0, Math.PI * 2); context.clip();
            var cw = cameraVideo.videoWidth || size, ch = cameraVideo.videoHeight || size;
            var crop = Math.min(cw, ch);
            try { context.drawImage(cameraVideo, (cw - crop) / 2, (ch - crop) / 2, crop, crop, cx - size / 2, cy - size / 2, size, size); } catch (_) {}
            context.restore(); context.beginPath(); context.arc(cx, cy, size / 2, 0, Math.PI * 2); context.strokeStyle = '#ffb69e'; context.lineWidth = 3; context.stroke();
          }
        }
        frame = env.raf(draw);
      }
      draw(0);
      composed = canvas.captureStream(FPS);
      var outputTrack = composed.getVideoTracks()[0];
      if (!outputTrack) throw new Error('Camera overlay could not produce a video track.');
      return { stream: composed, track: outputTrack, stop: stop };
    } catch (error) { stop(); throw error; }
  }

  function createRecorder(options) {
    options = options || {};
    if (typeof options.getStreams !== 'function') throw new TypeError('Recording needs a current stream provider.');
    var env = environment(options);
    var maxDuration = Math.min(MAX_DURATION, Math.max(1, options.maxDurationMs || MAX_DURATION));
    var maxBytes = Math.min(MAX_BYTES, Math.max(1, options.maxBytes || MAX_BYTES));
    var phase = 'idle', closed = false, suppressed = false, discard = false, finishCalled = false, stopRequested = false;
    var recorder = null, audioContext = null, destination = null, compressor = null, capture = null, output = null;
    var canvas = null, context = null, frame = null, interval = null, durationTimer = null, fallbackTimer = null;
    var audioSources = new Map(), videos = new Map(), chunks = [], bytes = 0, mimeType = 'video/webm';
    var done = Promise.resolve(null), resolveDone = null, lastFrame = -Infinity, errorReported = false;
    function error(error) {
      if (errorReported || suppressed) return;
      errorReported = true;
      call(options.onError, error instanceof Error ? error : new Error(String(error)));
    }
    function limit(reason) { var e = new Error(reason); e.name = 'RecordingLimitError'; error(e); stop(); }
    function clearTimers() {
      if (interval !== null) env.clearInterval(interval);
      if (durationTimer !== null) env.clearTimeout(durationTimer);
      if (frame !== null && env.caf) env.caf(frame);
      interval = durationTimer = frame = null;
    }
    function cleanup() {
      clearTimers();
      audioSources.forEach(function (entry) { try { entry.source.disconnect(); entry.gain.disconnect(); } catch (_) {} }); audioSources.clear();
      videos.forEach(function (entry) { releaseVideo(entry.video); }); videos.clear();
      stopTracks(capture); stopTracks(destination && destination.stream);
      capture = destination = output = null;
      if (compressor) { try { compressor.disconnect(); } catch (_) {} compressor = null; }
      if (audioContext) { try { Promise.resolve(audioContext.close()).catch(function () {}); } catch (_) {} audioContext = null; }
    }
    function finish() {
      if (finishCalled) return;
      finishCalled = true; phase = 'stopped';
      if (fallbackTimer !== null) env.clearTimeout(fallbackTimer);
      fallbackTimer = null;
      cleanup();
      if (recorder) { recorder.ondataavailable = recorder.onstop = recorder.onerror = null; }
      var blob = !suppressed && !discard && chunks.length ? new env.Blob(chunks, { type: mimeType }) : null;
      chunks = []; bytes = 0;
      if (blob && blob.size) call(options.onStop, blob);
      if (resolveDone) resolveDone(blob && blob.size ? blob : null);
    }
    function gather() {
      var streams = options.getStreams();
      if (!Array.isArray(streams)) throw new TypeError('Recording stream provider must return an array.');
      var audio = new Set(), video = new Set();
      streams.filter(Boolean).forEach(function (stream) {
        if (typeof stream.getTracks !== 'function') return;
        stream.getTracks().forEach(function (track) {
          if (!live(track)) return;
          if (track.kind === 'audio') audio.add(track);
          if (track.kind === 'video') video.add(track);
        });
      });
      if (audio.size > 16 || video.size > 9) throw new RangeError('Too many streams to record safely.');
      return { audio: audio, video: video };
    }
    function syncSources() {
      if (stopRequested || closed) return;
      var tracks = gather();
      audioSources.forEach(function (entry, track) {
        if (!tracks.audio.has(track)) { entry.source.disconnect(); entry.gain.disconnect(); audioSources.delete(track); }
      });
      tracks.audio.forEach(function (track) {
        var entry = audioSources.get(track);
        if (!entry) {
          var source = audioContext.createMediaStreamSource(new env.MediaStream([track]));
          var gain = audioContext.createGain();
          source.connect(gain); gain.connect(compressor || destination);
          entry = { source: source, gain: gain }; audioSources.set(track, entry);
        }
        // enabled has no change event. Polling also handles mute/unmute and device swaps.
        entry.gain.gain.value = track.enabled !== false && !track.muted && live(track) ? 0.7 : 0;
      });
      videos.forEach(function (entry, track) {
        if (!tracks.video.has(track)) { releaseVideo(entry.video); videos.delete(track); }
      });
      tracks.video.forEach(function (track) {
        if (videos.has(track)) return;
        var video = videoFor(env, new env.MediaStream([track]));
        videos.set(track, { video: video });
        Promise.resolve(video.play()).catch(function () { /* Audio remains recordable if a tile cannot play. */ });
      });
    }
    function draw(timestamp) {
      if (stopRequested || closed) return;
      if (timestamp - lastFrame >= 1000 / FPS) {
        lastFrame = timestamp;
        context.fillStyle = '#062c49'; context.fillRect(0, 0, canvas.width, canvas.height);
        var items = Array.from(videos.entries()).filter(function (entry) { return live(entry[0]) && entry[0].enabled !== false && !entry[0].muted; });
        if (!items.length) {
          context.fillStyle = '#ffffff'; context.font = '32px sans-serif'; context.textAlign = 'center';
          context.fillText('Sota Kece · Audio call', canvas.width / 2, canvas.height / 2);
        } else {
          var columns = Math.ceil(Math.sqrt(items.length)), rows = Math.ceil(items.length / columns);
          var width = canvas.width / columns, height = canvas.height / rows;
          items.forEach(function (entry, index) { drawContain(context, entry[1].video, (index % columns) * width + 4, Math.floor(index / columns) * height + 4, width - 8, height - 8); });
        }
      }
      frame = env.raf(draw);
    }
    function stop() {
      if (phase === 'idle') { phase = 'stopped'; stopRequested = true; return done; }
      if (phase === 'stopped' || phase === 'stopping') return done;
      stopRequested = true; phase = 'stopping';
      clearTimers();
      if (!recorder) { cleanup(); return done; }
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch (e) { error(e); finish(); return done; }
      // Final dataavailable and stop events are asynchronous. Keep their handlers
      // until finalization, but immediately release our capture/mixing resources.
      cleanup();
      if (!finishCalled) fallbackTimer = env.setTimeout(function () { error(new Error('The browser did not finish recording.')); discard = true; finish(); }, 5000);
      return done;
    }
    async function start() {
      if (closed || phase !== 'idle') throw new Error('Create a new recorder for each recording.');
      if (!env.document || !env.MediaStream || !env.MediaRecorder || !env.AudioContext || !env.raf || !env.caf || !env.Blob) throw new Error('Local recording is not supported in this browser.');
      phase = 'starting'; done = new Promise(function (resolve) { resolveDone = resolve; });
      try {
        var supported = ['video/webm;codecs=vp8,opus', 'video/webm'];
        mimeType = supported.find(function (type) { return typeof env.MediaRecorder.isTypeSupported !== 'function' || env.MediaRecorder.isTypeSupported(type); });
        if (!mimeType) throw new Error('This browser cannot create a WebM recording.');
        canvas = env.document.createElement('canvas'); canvas.width = 1280; canvas.height = 720;
        context = canvas.getContext('2d', { alpha: false });
        if (!context || typeof canvas.captureStream !== 'function') throw new Error('This browser cannot compose a call recording.');
        audioContext = new env.AudioContext(); destination = audioContext.createMediaStreamDestination();
        if (typeof audioContext.createDynamicsCompressor === 'function') { compressor = audioContext.createDynamicsCompressor(); compressor.connect(destination); }
        await audioContext.resume();
        if (stopRequested || closed) throw abortError();
        syncSources(); draw(0);
        capture = canvas.captureStream(FPS);
        var videoTrack = capture.getVideoTracks()[0];
        if (!videoTrack) throw new Error('The recording video could not start.');
        output = new env.MediaStream([videoTrack].concat(destination.stream.getAudioTracks()));
        recorder = new env.MediaRecorder(output, { mimeType: mimeType, videoBitsPerSecond: 1200000, audioBitsPerSecond: 64000 });
        recorder.ondataavailable = function (event) {
          var chunk = event.data;
          if (suppressed || discard || !chunk || !chunk.size) return;
          if (bytes + chunk.size > maxBytes) {
            discard = true; chunks = []; bytes = 0;
            limit('Recording exceeded its 250 MB safety limit.'); return;
          }
          chunks.push(chunk); bytes += chunk.size;
          // Leave headroom for the final browser-generated chunk.
          if (!stopRequested && bytes >= maxBytes * 0.9) limit('Recording reached its storage limit.');
        };
        recorder.onerror = function (event) { error(event.error || new Error('The browser could not continue recording.')); stop(); };
        recorder.onstop = finish;
        recorder.start(1000); phase = 'recording';
        interval = env.setInterval(function () { try { syncSources(); } catch (e) { error(e); stop(); } }, 250);
        durationTimer = env.setTimeout(function () { limit('Recording reached the 30 minute limit.'); }, maxDuration);
        return true;
      } catch (e) {
        if (!stopRequested && !closed) error(e);
        finish();
        throw stopRequested || closed ? abortError() : e;
      }
    }
    return {
      start: start, stop: stop,
      close: function () { closed = true; suppressed = true; chunks = []; return stop(); },
      get active() { return phase === 'starting' || phase === 'recording'; }
    };
  }
  return { createScreenShare: createScreenShare, createRecorder: createRecorder, maxRecordingDurationMs: MAX_DURATION, maxRecordingBytes: MAX_BYTES };
}));
