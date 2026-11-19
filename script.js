/* ==========================================================
   Luca Godoy · Portfolio
   Reproductor de highlights: autoplay silenciado al llegar
   a la sección, pausa al salir, loop y controles propios.
   ========================================================== */
(function () {
  'use strict';

  var player   = document.getElementById('player');
  var video    = document.getElementById('highlight');
  var seek     = document.getElementById('seek');
  var btnPlay  = document.getElementById('btnPlay');
  var btnMute  = document.getElementById('btnMute');
  var btnFull  = document.getElementById('btnFull');
  var timeEl   = document.getElementById('time');

  if (!player || !video) return;

  var icoPlay  = btnPlay.querySelector('.ico-play');
  var icoPause = btnPlay.querySelector('.ico-pause');
  var icoMuted = btnMute.querySelector('.ico-muted');
  var icoSound = btnMute.querySelector('.ico-sound');

  var userPaused = false;   // el usuario pausó a mano: no volver a arrancar solo
  var seeking = false;      // el usuario está arrastrando la línea de tiempo

  /* ---------- utilidades ---------- */

  function fmt(sec) {
    if (!isFinite(sec) || sec < 0) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function updateTime() {
    timeEl.textContent = fmt(video.currentTime) + ' / ' + fmt(video.duration);
  }

  function updateSeek() {
    if (seeking || !isFinite(video.duration) || video.duration === 0) return;
    var v = (video.currentTime / video.duration) * 1000;
    seek.value = v;
    seek.style.setProperty('--p', (v / 10) + '%');
  }

  function safePlay() {
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () { /* el navegador bloqueó el autoplay: queda el botón de play */ });
    }
  }

  /* ---------- estado visual ---------- */

  function syncPlayState() {
    var playing = !video.paused && !video.ended;
    icoPlay.hidden = playing;
    icoPause.hidden = !playing;
    btnPlay.setAttribute('aria-label', playing ? 'Pausar' : 'Reproducir');
  }

  function syncMuteState() {
    icoMuted.hidden = !video.muted;
    icoSound.hidden = video.muted;
    btnMute.setAttribute('aria-label', video.muted ? 'Activar sonido' : 'Silenciar');
    btnMute.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
  }

  /* ---------- acciones del usuario ---------- */

  function togglePlay() {
    if (video.paused) {
      userPaused = false;
      safePlay();
    } else {
      userPaused = true;
      video.pause();
    }
  }

  btnPlay.addEventListener('click', togglePlay);
  video.addEventListener('click', togglePlay);

  btnMute.addEventListener('click', function () {
    video.muted = !video.muted;
    syncMuteState();
  });

  btnFull.addEventListener('click', function () {
    var fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else if (player.requestFullscreen) {
      player.requestFullscreen();
    } else if (player.webkitRequestFullscreen) {
      player.webkitRequestFullscreen();
    } else if (video.webkitEnterFullscreen) {   // iPhone
      video.webkitEnterFullscreen();
    }
  });

  /* línea de tiempo */
  seek.addEventListener('input', function () {
    seeking = true;
    seek.style.setProperty('--p', (seek.value / 10) + '%');
    if (isFinite(video.duration)) {
      var t = (seek.value / 1000) * video.duration;
      timeEl.textContent = fmt(t) + ' / ' + fmt(video.duration);
    }
  });
  seek.addEventListener('change', function () {
    if (isFinite(video.duration)) {
      video.currentTime = (seek.value / 1000) * video.duration;
    }
    seeking = false;
    updateTime();
  });

  /* ---------- eventos del video ---------- */

  video.addEventListener('play', syncPlayState);
  video.addEventListener('pause', syncPlayState);
  video.addEventListener('ended', syncPlayState);
  video.addEventListener('volumechange', syncMuteState);
  video.addEventListener('loadedmetadata', function () { updateTime(); updateSeek(); });
  video.addEventListener('durationchange', updateTime);
  video.addEventListener('timeupdate', function () { updateTime(); updateSeek(); });

  /* ---------- autoplay al llegar / pausa al salir ---------- */

  // El autoplay de los navegadores exige que el video esté en silencio.
  video.muted = true;
  video.defaultMuted = true;
  video.loop = true;

  if ('IntersectionObserver' in window) {
    var thresholds = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var vh = window.innerHeight || document.documentElement.clientHeight;
        // "En pantalla" = al menos la mitad del video, o la mitad de la altura
        // de la ventana (para pantallas bajas, como un celular en horizontal).
        var inView = entry.intersectionRatio >= 0.5 ||
                     entry.intersectionRect.height >= vh * 0.5;
        if (inView) {
          if (!userPaused) safePlay();
        } else if (entry.intersectionRatio < 0.2 && !video.paused) {
          video.pause();          // ahorra recursos; no cuenta como pausa manual
        }
      });
    }, { threshold: thresholds });
    observer.observe(video);
  }

  // Si la pestaña pasa a segundo plano, pausamos; al volver, retomamos si corresponde.
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (!video.paused) video.pause();
    } else if (!userPaused && isInView(video)) {
      safePlay();
    }
  });

  function isInView(el) {
    var r = el.getBoundingClientRect();
    var h = window.innerHeight || document.documentElement.clientHeight;
    var visible = Math.min(r.bottom, h) - Math.max(r.top, 0);
    return visible >= Math.min(r.height, h) * 0.5;
  }

  syncPlayState();
  syncMuteState();
  updateTime();
})();
