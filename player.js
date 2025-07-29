var hls;
var debug = false;
var recoverDecodingErrorDate, recoverSwapAudioCodecDate;
var pendingTimedMetadata = [];
var native = false; // default

function handleMediaError(hls) {
  var now = performance.now();
  if(!recoverDecodingErrorDate || (now - recoverDecodingErrorDate) > 3000) {
    recoverDecodingErrorDate = performance.now();
    console.warn("trying to recover from media Error ...");
    hls.recoverMediaError();
  } else {
    if(!recoverSwapAudioCodecDate || (now - recoverSwapAudioCodecDate) > 3000) {
      recoverSwapAudioCodecDate = performance.now();
      console.warn("trying to swap Audio Codec and recover from media Error ...");
      hls.swapAudioCodec();
      hls.recoverMediaError();
    } else {
      console.error("cannot recover, last media error recovery failed ...");
    }
  }
}

function handleTimedMetadata(event, data) {
  for (var i = 0; i < data.samples.length; i++) {
    var pts = data.samples[i].pts;
    var str =  new TextDecoder('utf-8').decode(data.samples[i].data.subarray(22));
    pendingTimedMetadata.push({pts: pts, value: str});
  }
}

function timeUpdateCallback() {
  var video = document.getElementById('video');
  if (pendingTimedMetadata.length == 0 || pendingTimedMetadata[0].pts > video.currentTime) {
    return;
  }
  var e = pendingTimedMetadata[0];
  pendingTimedMetadata = pendingTimedMetadata.slice(1);
  console.log('Metadata ' + e.value + " at " + e.pts + "s");
}

function playM3u8(url){
  var video = document.getElementById('video');
  if(native){
    video.classList.add("native_mode");
    video.classList.remove("zoomed_mode");
  } else {
    video.classList.remove("native_mode");
    video.classList.add("zoomed_mode");
  }
  if(hls){ hls.destroy(); }
  if (window.Hls && window.Hls.isSupported()) {
    hls = new window.Hls({debug:debug});
    hls.on(window.Hls.Events.ERROR, function(event,data) {
      var  msg = "Player error: " + data.type + " - " + data.details;
      console.error(msg);
      if(data.fatal) {
        switch(data.type) {
          case window.Hls.ErrorTypes.MEDIA_ERROR:
            handleMediaError(hls);
            break;
          case window.Hls.ErrorTypes.NETWORK_ERROR:
            console.error("network error ...");
            break;
          default:
            console.error("unrecoverable error");
            hls.destroy();
            break;
        }
      }
    });
    var m3u8Url = decodeURIComponent(url)
    hls.loadSource(m3u8Url);
    hls.attachMedia(video);
    video.ontimeupdate = timeUpdateCallback;
    hls.on(window.Hls.Events.MANIFEST_PARSED,function() {
      video.play();
    });
    hls.on(window.Hls.Events.FRAG_PARSING_METADATA, handleTimedMetadata);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari, etc)
    video.src = url;
    video.addEventListener('loadedmetadata', function() {
      video.play();
    });
  } else {
    alert("HLS is not supported in this browser.");
  }
  document.title = url;
  // Simpan url terakhir ke localStorage
  localStorage.setItem('last_m3u8_url', url);
  document.getElementById('m3u8url').value = url;
}

// Fungsi untuk mengatur kontrol video saat fullscreen
function updateVideoControls() {
  var video = document.getElementById('video');
  var isFullscreen =
    document.fullscreenElement === video ||
    document.webkitFullscreenElement === video ||
    document.mozFullScreenElement === video ||
    document.msFullscreenElement === video;

  // Tambahkan/lepaskan class untuk transparansi kontrol
  if (isFullscreen) {
    video.classList.add('controls-transparent');
  } else {
    video.classList.remove('controls-transparent');
  }
  video.controls = true; // Tetap tampilkan controls (tapi transparan saat fullscreen)
}

// Tambahkan event listener untuk perubahan fullscreen
function addFullscreenListener() {
  var video = document.getElementById('video');
  video.addEventListener('fullscreenchange', updateVideoControls);
  video.addEventListener('webkitfullscreenchange', updateVideoControls);
  video.addEventListener('mozfullscreenchange', updateVideoControls);
  video.addEventListener('MSFullscreenChange', updateVideoControls);
}

// Inisialisasi input dan tombol
window.onload = function() {
  var lastUrl = localStorage.getItem('last_m3u8_url') || "";
  document.getElementById('m3u8url').value = lastUrl;
  if(lastUrl) playM3u8(lastUrl);
  document.getElementById('playBtn').onclick = function() {
    var url = document.getElementById('m3u8url').value.trim();
    if(url) playM3u8(url);
  };
  document.getElementById('m3u8url').addEventListener('keydown', function(e){
    if(e.key === "Enter"){
      var url = document.getElementById('m3u8url').value.trim();
      if(url) playM3u8(url);
    }
  });
  addFullscreenListener(); // Pasang listener fullscreen
};