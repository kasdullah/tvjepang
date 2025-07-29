// ===================== JAM TOKYO =====================
// Fungsi update jam Tokyo di pojok atas
const infoClock = document.getElementById('infoClock');
function updateTokyoClock() {
  const now = new Date();
  const options = { timeZone: 'Asia/Tokyo' };
  const tokyo = new Date(now.toLocaleString('en-US', options));
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const h = hari[tokyo.getDay()];
  const tgl = tokyo.getDate().toString().padStart(2, '0');
  const bln = bulan[tokyo.getMonth()];
  const thn = tokyo.getFullYear().toString().slice(-2);
  const jam = tokyo.getHours().toString().padStart(2, '0');
  const menit = tokyo.getMinutes().toString().padStart(2, '0');
  const text = `Tokyo, ${h} ${tgl} ${bln} ${thn}, ${jam}:${menit}`;
  infoClock.textContent = text;
}
setInterval(updateTokyoClock, 1000);

const timelineBar = document.getElementById('timelineBar');
const timelineBuffered = document.getElementById('timelineBuffered');
const channelList = document.getElementById('channelList');
const infoChannel = document.getElementById('infoChannel');
const video = document.getElementById('video');
const volumeSlider = document.getElementById('volumeSlider');
const timelineFill = document.getElementById('timelineFill');

let hls = new Hls();
let currentChannelUrl = '';
let currentChannelName = '';
let previousVolume = 0.5;
let channels = [];

var debug = false;
var native = false; // default
var pendingTimedMetadata = [];

// Inisialisasi volume dan load playlist saat halaman dimuat
window.addEventListener('load', () => {
  video.volume = parseFloat(volumeSlider.value || 0.5);
  previousVolume = video.volume;
  video.muted = false;
  loadPlaylist();
  addFullscreenListener(); // Pasang listener fullscreen
});

// Ambil daftar channel dari M3U dan tampilkan ke list
async function loadPlaylist() {
  try {
    const res = await fetch('https://raw.githubusercontent.com/luongz/iptv-jp/main/jp.m3u');
    const text = await res.text();
    const lines = text.replace(/\r/g, '').split('\n');
    for (let i = 0; i < lines.length; i++) {
      const info = lines[i];
      const url = lines[i + 1]?.trim();
      if (info?.startsWith('#EXTINF') && url?.startsWith('http')) {
        const name = info.split(',')[1]?.trim() || 'Channel';
        const groupMatch = info.match(/group-title="(.*?)"/);
        if (groupMatch?.[1].toLowerCase() === 'information') continue;
        channels.push({ name, url });
      }
    }
    channels.sort((a, b) => a.name.localeCompare(b.name));
    updateChannelList(channels);

    // Pilih channel terakhir yang ditonton, atau TBS, atau channel pertama
    const savedUrl = localStorage.getItem('lastChannelUrl');
    const savedChannel = channels.find(c => c.url === savedUrl);
    let first = savedChannel;
    if (!first) {
      first = channels.find(c => c.name.toLowerCase() === 'tbs') || channels[0];
    }
    if (first) playStream(first.url, first.name);
  } catch (err) {
    infoChannel.textContent = 'Gagal memuat daftar channel';
    console.error('Playlist error:', err);
  }
}

// Tampilkan daftar channel ke list
function updateChannelList(list) {
  channelList.innerHTML = '';
  list.forEach(c => {
    const item = document.createElement('div');
    item.className = 'channel-item';
    item.textContent = c.name;
    item.onclick = () => playStream(c.url, c.name);
    channelList.appendChild(item);
  });
  // Scroll ke atas setiap update
  channelList.scrollTop = 0;
}

//tambahan dari video player.js 
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


// Fungsi untuk menangani metadata waktu
function handleTimedMetadata(event, data) {
  for (var i = 0; i < data.samples.length; i++) {
    var pts = data.samples[i].pts;
    var str =  new TextDecoder('utf-8').decode(data.samples[i].data.subarray(22));
    pendingTimedMetadata.push({pts: pts, value: str});
  }
}

// Callback untuk update waktu video
function timeUpdateCallback() {
  var video = document.getElementById('video');
  if (pendingTimedMetadata.length == 0 || pendingTimedMetadata[0].pts > video.currentTime) {
    return;
  }
  var e = pendingTimedMetadata[0];
  pendingTimedMetadata = pendingTimedMetadata.slice(1);
  console.log('Metadata ' + e.value + " at " + e.pts + "s");
}


function playStream(url, name = ''){
  currentChannelUrl = url;
  currentChannelName = name;
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
            if (currentChannelUrl && currentChannelName) {
                console.warn("Mencoba memutar ulang stream:", currentChannelName);
                playStream(currentChannelUrl, currentChannelName);
            }
            break;
          default:
            console.error("unrecoverable error");
            hls.destroy();
            break;
        }
      }
    });
    

    //POSISI VIDEO AWAL
    hls.loadSource(url);
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
 
// Update info channel  
  infoChannel.textContent = 'Channel: ' + name;
  localStorage.setItem('lastChannelUrl', url);
  localStorage.setItem('lastChannelName', name);
}

// ===================== KONTROL PLAYER =====================
// Play/Pause video
playBtn.addEventListener('click', () => {
  if (video.paused) {
    video.play().then(() => {
      document.querySelector('.icon-play').style.display = 'none';
      document.querySelector('.icon-pause').style.display = '';
    }).catch(() => {
      document.querySelector('.icon-play').style.display = '';
      document.querySelector('.icon-pause').style.display = 'none';
    });
  } else {
    video.pause();
    document.querySelector('.icon-play').style.display = '';
    document.querySelector('.icon-pause').style.display = 'none';
  }
});

// Mute/Unmute audio
muteBtn.addEventListener('click', () => {
  if (video.volume > 0) {
    previousVolume = video.volume;
    video.volume = 0;
    volumeSlider.value = 0;
    document.querySelector('.icon-unmute').style.display = 'none';
    document.querySelector('.icon-mute').style.display = '';
  } else {
    video.volume = previousVolume || 0.5;
    volumeSlider.value = previousVolume || 0.5;
    document.querySelector('.icon-unmute').style.display = '';
    document.querySelector('.icon-mute').style.display = 'none';
  }
});

// Kontrol volume slider
volumeSlider.addEventListener('input', () => {
  video.volume = parseFloat(volumeSlider.value);
  if (video.volume === 0) {
    document.querySelector('.icon-unmute').style.display = 'none';
    document.querySelector('.icon-mute').style.display = '';
  } else {
    document.querySelector('.icon-unmute').style.display = '';
    document.querySelector('.icon-mute').style.display = 'none';
    previousVolume = video.volume;
  }
});

// Fullscreen
fullscreenBtn.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    video.parentElement.requestFullscreen();
  }
});

// Picture-in-Picture (mini player)
pipBtn.addEventListener('click', async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await video.requestPictureInPicture();
    }
  } catch (err) {
    console.error('Mini player gagal:', err);
  }
});

// Timeline bar (seek video)
timelineBar.addEventListener('click', e => {
  const percent = e.offsetX / timelineBar.clientWidth;
  if (video.duration) video.currentTime = percent * video.duration;
});

// Update timeline saat video berjalan
video.addEventListener('timeupdate', () => {
  if (video.duration) {
    const buffered = video.buffered;
    if (buffered.length) {
      const bufferedEnd = buffered.end(buffered.length - 1);
      timelineBuffered.style.width = (bufferedEnd / video.duration) * 100 + '%';
    }
    timelineFill.style.width = (video.currentTime / video.duration) * 100 + '%';
  }
});

// ===================== KONTROL KEYBOARD =====================
// Shortcut keyboard SPAPSI untuk player  
window.addEventListener('keydown', e => {
  const isTyping = document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA';
  if (!isTyping) {
    if (e.code === 'Space') {
      e.preventDefault();
      if (video.paused) {
        video.play().then(() => {
          document.querySelector('.icon-play').style.display = 'none';
          document.querySelector('.icon-pause').style.display = '';
        });
      } else {
        video.pause();
        document.querySelector('.icon-play').style.display = '';
        document.querySelector('.icon-pause').style.display = 'none';
      }
    }
    if (e.code === 'ArrowRight') {
      e.preventDefault();
      if (video.duration) video.currentTime = Math.min(video.currentTime + 5, video.duration);
    }
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(video.currentTime - 5, 0);
    }

    // Volume control dengan - dan = HAPUS BAGIAN ICON KARNA MENGGUNAKAN CONTROL DEFAULT
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      video.volume = Math.max(0, video.volume - 0.05);
      volumeSlider.value = video.volume;
      if (video.volume === 0) {
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
      }
    }
    if (e.key === '=' || e.key === '+') {
      e.preventDefault();
      video.volume = Math.min(1, video.volume + 0.05);
      volumeSlider.value = video.volume;
      if (video.volume === 0) {
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
      }
    }

    // Reload channel dengan R
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      if (currentChannelUrl && currentChannelName) {
        playStream(currentChannelUrl, currentChannelName);
      }
    }
  }
});

// ===================== SEARCH & RESET CHANNEL =====================
// Fitur pencarian channel
searchInput.addEventListener('input', () => {
  clearBtn.style.display = searchInput.value ? 'block' : 'none';
  const keyword = searchInput.value.toLowerCase();
  const matched = channels.filter(c => c.name.toLowerCase().includes(keyword));
  const bsOnly = matched.filter(c => c.name.toLowerCase().startsWith('bs '));
  const nonBs = matched.filter(c => !c.name.toLowerCase().startsWith('bs '));
  updateChannelList([...nonBs, ...bsOnly]);
});

// Tombol clear pencarian
clearBtn.addEventListener('click', () => {
  searchInput.value = '';
  clearBtn.style.display = 'none';
  updateChannelList(channels);
});

// Tombol reset channel (reload stream)
resetBtn.addEventListener('click', () => {
  if (currentChannelUrl && currentChannelName) {
    playStream(currentChannelUrl, currentChannelName);
  }
});

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

// ===================== MODULAR REMINDER VIEW =====================
// --------- Bagian 1: Helper waktu untuk reminder ---------
function getTokyoNow() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (9 * 60 * 60 * 1000));
}

function getDayIndex(dayName) {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  return hari.findIndex(h => h.toLowerCase() === (dayName || "").toLowerCase());
}

// Hitung tanggal reminder berikutnya
function getNextReminderDate(reminder, now) {
  const todayIdx = now.getDay();
  const reminderIdx = getDayIndex(reminder.day);
  if (reminderIdx === -1) return null;
  let dayDiff = (reminderIdx - todayIdx + 7) % 7;
  let reminderHour = parseInt(reminder.hour, 10);
  let reminderMinute = parseInt(reminder.minute, 10);
  let reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), reminderHour, reminderMinute, 0, 0);
  reminderDate.setDate(reminderDate.getDate() + dayDiff);
  if (dayDiff === 0 && reminderDate < now) {
    reminderDate.setDate(reminderDate.getDate() + 7);
  }
  return reminderDate;
}

// Estimasi waktu ke pengingat berikutnya
function getTimeDiffString(target, now) {
  let diffMs = target - now - (30 * 60 * 1000); // Kurangi 30 menit
  if (diffMs <= 0) {
    return "SEDANG TAYANG";
  }
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const sisaMin = diffMin % 60;
  if (diffHour > 0) {
    return `${diffHour} jam ${sisaMin} menit lagi`;
  } else {
    return `${sisaMin} menit lagi`;
  }
}

// --------- Bagian 2: Render daftar pengingat ---------
let estimasiInterval = null;
function renderReminders() {
  fetch("reminders.json")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("list");
      const warningDiv = document.getElementById("warning");
      container.innerHTML = "";
      if (!Array.isArray(data) || data.length === 0) {
        container.textContent = "Belum ada pengingat.";
        container.style.color = "#fff";
        if (warningDiv) warningDiv.textContent = "⏰Pengingat program";
        warningDiv.style.color = "#4cc3ff";
        return;
      }

      // Hitung waktu sekarang (Tokyo - 30 menit)
      const now = new Date(getTokyoNow().getTime() - 30 * 60 * 1000);
      const nowMs = now.getTime();
      const plus30Ms = 30 * 60 * 1000;

      // Tambahkan properti nextDate ke setiap reminder
      data.forEach(item => {
        item.nextDate = getNextReminderDate(item, now);
      });

      // Urutkan reminder sesuai status dan waktu
      const sorted = [...data].sort((a, b) => {
        const aStart = a.nextDate?.getTime() || 0;
        const bStart = b.nextDate?.getTime() || 0;
        const aActive = aStart && nowMs >= aStart && nowMs < aStart + plus30Ms;
        const bActive = bStart && nowMs >= bStart && nowMs < bStart + plus30Ms;
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        if (aActive && bActive) return aStart - bStart;

        const aSoon = aStart > nowMs && aStart - nowMs < 24 * 60 * 60 * 1000;
        const bSoon = bStart > nowMs && bStart - nowMs < 24 * 60 * 60 * 1000;
        if (aSoon && !bSoon) return -1;
        if (!aSoon && bSoon) return 1;
        if (aSoon && bSoon) return aStart - bStart;

        const aExpired = aStart && nowMs >= aStart + plus30Ms;
        const bExpired = bStart && nowMs >= bStart + plus30Ms;
        if (!aExpired && bExpired) return -1;
        if (aExpired && !bExpired) return 1;

        return Math.abs(aStart - nowMs) - Math.abs(bStart - nowMs);
      });

      let adaMerah = false;
      // Render setiap reminder
      sorted.forEach(item => {
        const tayangStart = item.nextDate;
        const tayangEnd = new Date(tayangStart.getTime() + plus30Ms);
        const isRed = tayangStart && (
          (tayangStart - now <= 24 * 60 * 60 * 1000 && tayangStart - now >= 0) ||
          (nowMs >= tayangStart.getTime() && nowMs < tayangEnd.getTime())
        );
        if (isRed) adaMerah = true;
        const isSedangTayang = tayangStart && nowMs >= tayangStart.getTime() && nowMs < tayangEnd.getTime();

        // Buat HTML pengingat sesuai urutan permintaan
        const estimasiId = `estimasi-${item.day}-${item.hour}-${item.minute}-${item.programName.replace(/\W/g, '')}-${item.channel.replace(/\W/g, '')}`;
        const div = document.createElement("div");
        div.className = isRed ? "reminder-today" : "reminder-normal";

        let html = `
  <div style="display:flex;flex-direction:column;width:100%;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span>
        ${isSedangTayang
          ? `<span id="${estimasiId}" style="color:#ff4d4d;font-weight:bold;font-size:0.98em;"><b>SEDANG TAYANG</b></span>`
          : isRed
            ? `<span id="${estimasiId}" style="color:#ff4d4d;font-weight:bold;font-size:0.98em;"><b>${getTimeDiffString(tayangStart, now)}</b></span>`
            : ''
        }
      </span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
      <span class="waktu-pengingat" style="font-weight:bold;text-align:left;display:block;">${item.day ? item.day + ', ' : ''}${item.hour}:${item.minute.toString().padStart(2, '0')}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:2px;">
      <span style="flex:1;text-align:left;">${item.programName}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;margin-top:6px;">
      <button class="btn-ganti-channel" data-channel="${item.channel}" style="padding:2px 12px;border-radius:4px;border:1px solid #4cc3ff;background:#eaf8ff;color:#0077b6;cursor:pointer;">${item.channel}</button>
    </div>
  </div>
`;

        div.innerHTML = html;
        container.appendChild(div);

        // Event listener tombol channel
        const btn = div.querySelector('.btn-ganti-channel');
        if (btn) {
          btn.onclick = function() {
            const channelName = this.getAttribute('data-channel');
            const found = channels.find(c => c.name === channelName);
            if (found) {
              playStream(found.url, found.name);
            } else {
              alert('Channel tidak ditemukan di daftar!');
            }
          };
        }
      });

      // Tampilkan warning jika ada pengingat dalam 24 jam ke depan
      if (adaMerah && warningDiv) {
        warningDiv.textContent = `Ada pengingat dalam 24 jam ke depan!⚠️`;
        warningDiv.style.color = "#ff4d4d";
      } else if (warningDiv) {
        warningDiv.textContent = "⏰Pengingat program";
        warningDiv.style.color = "#4cc3ff";
      }

      // Update estimasi waktu setiap menit
      if (estimasiInterval) clearInterval(estimasiInterval);
      estimasiInterval = setInterval(() => {
        const now = getTokyoNow();
        const nowMs = now.getTime();
        sorted.forEach(item => {
          const tayangStart = item.nextDate;
          const tayangEnd = new Date(tayangStart.getTime() + plus30Ms);
          const estimasiId = `estimasi-${item.day}-${item.hour}-${item.minute}-${item.programName.replace(/\W/g, '')}-${item.channel.replace(/\W/g, '')}`;
          const span = document.getElementById(estimasiId);
          if (span) {
            if (tayangStart && nowMs >= tayangStart.getTime() && nowMs < tayangEnd.getTime()) {
              span.innerHTML = "<b>SEDANG TAYANG</b>";
              span.style.fontWeight = "bold";
            } else if (tayangStart && tayangStart - now <= 24 * 60 * 60 * 1000 && tayangStart - now >= 0) {
              span.innerHTML = `<b>${getTimeDiffString(tayangStart, now)}</b>`;
              span.style.fontWeight = "bold";
            }
          }
        });
      }, 1000 * 60);
    })
    .catch(() => {
      // Jika gagal memuat data pengingat
      document.getElementById("list").textContent = "Gagal memuat data pengingat.";
      document.getElementById("list").style.color = "#fff";
      const warningDiv = document.getElementById("warning");
      if (warningDiv) {
        warningDiv.textContent = "⏰Pengingat program";
        warningDiv.style.color = "#4cc3ff";
      }
    });
}

// Panggil renderReminders saat halaman dimuat
renderReminders();
setInterval(renderReminders, 60000); // update tiap 1 menit
// ================= END MODULAR REMINDER VIEW =================