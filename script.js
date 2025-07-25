//script 1
const video = document.getElementById('video');
    const playBtn = document.getElementById('playBtn');
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');
    const timelineBar = document.getElementById('timelineBar');
    const timelineFill = document.getElementById('timelineFill');
    const timelineBuffered = document.getElementById('timelineBuffered');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const pipBtn = document.getElementById('pipBtn');
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearBtn');
    const channelList = document.getElementById('channelList');
    const infoChannel = document.getElementById('infoChannel');
    const infoClock = document.getElementById('infoClock');
    const resetBtn = document.getElementById('resetBtn');

    let previousVolume = 0.5;
    let hls = new Hls();
    let channels = [];
    let currentChannelUrl = '';
    let currentChannelName = '';

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

    fullscreenBtn.addEventListener('click', () => {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        video.parentElement.requestFullscreen();
      }
    });

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

    timelineBar.addEventListener('click', e => {
      const percent = e.offsetX / timelineBar.clientWidth;
      if (video.duration) video.currentTime = percent * video.duration;
    });

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
        // Volume control dengan - dan =
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
        if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          if (currentChannelUrl && currentChannelName) {
            playStream(currentChannelUrl, currentChannelName);
          }
        }
      }
    });

    //script 2
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
        const savedUrl = localStorage.getItem('lastChannelUrl');
        const savedChannel = channels.find(c => c.url === savedUrl);
        let first = savedChannel;
        if (!first) {
          // Cari channel TBS
          first = channels.find(c => c.name.toLowerCase() === 'tbs') || channels[0];
        }
        if (first) playStream(first.url, first.name);
      } catch (err) {
        infoChannel.textContent = 'Gagal memuat daftar channel';
        console.error('Playlist error:', err);
      }
    }

    function playStream(url, name = '') {
      currentChannelUrl = url;
      currentChannelName = name;
      video.classList.add('buffering');
      // Reset bar biru dan posisi video ke awal sebelum load
      video.pause();
      video.currentTime = 0;
      timelineFill.style.width = '0%';
      hls.detachMedia(); // Unbind previous events and detach
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.currentLevel = -1;
      // Remove previous canplay handler if any
      video.oncanplay = null;
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        // Set ulang bar biru dan posisi video ke awal saat video siap
        video.oncanplay = () => {
          video.currentTime = 0;
          timelineFill.style.width = '0%';
          video.oncanplay = null;
        };
        video.muted = false;
        video.play().then(() => {
          document.querySelector('.icon-play').style.display = 'none';
          document.querySelector('.icon-pause').style.display = '';
        }).catch(() => {
          document.querySelector('.icon-play').style.display = '';
          document.querySelector('.icon-pause').style.display = 'none';
        });
        setTimeout(() => video.classList.remove('buffering'), 2500);
      });
      infoChannel.textContent = 'Channel: ' + name;
      localStorage.setItem('lastChannelUrl', url);
      localStorage.setItem('lastChannelName', name);
    }

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

    searchInput.addEventListener('input', () => {
      clearBtn.style.display = searchInput.value ? 'block' : 'none';
      const keyword = searchInput.value.toLowerCase();
      const matched = channels.filter(c => c.name.toLowerCase().includes(keyword));
      const bsOnly = matched.filter(c => c.name.toLowerCase().startsWith('bs '));
      const nonBs = matched.filter(c => !c.name.toLowerCase().startsWith('bs '));
      updateChannelList([...nonBs, ...bsOnly]);
    });

    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      updateChannelList(channels);
    });

    resetBtn.addEventListener('click', () => {
      if (currentChannelUrl && currentChannelName) {
        playStream(currentChannelUrl, currentChannelName);
      }
    });


    // Saat internet kembali, lanjutkan load video (buffer pink akan bertambah)
    window.addEventListener('online', () => {
      if (hls) {
        hls.startLoad();
      }
    });


    // Hilangkan interval auto-refresh video, biarkan HLS handle buffering sendiri

    // Saat buffering, tampilkan animasi, dan lanjutkan otomatis jika buffer sudah cukup
    video.addEventListener('waiting', () => {
      video.classList.add('buffering');
    });
    video.addEventListener('playing', () => {
      video.classList.remove('buffering');
      document.querySelector('.icon-play').style.display = 'none';
      document.querySelector('.icon-pause').style.display = '';
    });

    window.addEventListener('load', () => {
      video.volume = parseFloat(volumeSlider.value || 0.5);
      previousVolume = video.volume;
      video.muted = false;
      if (video.volume === 0) {
        document.querySelector('.icon-unmute').style.display = 'none';
        document.querySelector('.icon-mute').style.display = '';
      } else {
        document.querySelector('.icon-unmute').style.display = '';
        document.querySelector('.icon-mute').style.display = 'none';
      }
      loadPlaylist();
    });

    // --- Pengingat Program (Reminders) ---
function initReminders() {
  // Mendapatkan waktu Tokyo (JST, UTC+9)
  function getTokyoNow() {
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 60 * 60 * 1000));
  }

  function getTodayName(now) {
    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return hari[now.getDay()];
  }

  function getDayIndex(dayName) {
    const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
    return hari.findIndex(h => h.toLowerCase() === (dayName || "").toLowerCase());
  }

  function getNextReminderDate(reminder, now) {
    const todayIdx = now.getDay();
    const reminderIdx = getDayIndex(reminder.day);
    if (reminderIdx === -1) return null;

    let dayDiff = (reminderIdx - todayIdx + 7) % 7;
    let reminderHour = parseInt(reminder.hour, 10);
    let reminderMinute = parseInt(reminder.minute, 10);
    let reminderDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), reminderHour, reminderMinute, 0, 0);
    reminderDate.setDate(reminderDate.getDate() + dayDiff);

    // Jika hari sama dan waktu sudah lewat, lompat ke minggu depan
    if (dayDiff === 0 && reminderDate < now) {
      reminderDate.setDate(reminderDate.getDate() + 7);
    }

    return reminderDate;
  }

  // Fungsi untuk estimasi waktu ke pengingat berikutnya (dalam jam/menit)
  function getTimeDiffString(target, now) {
    let diffMs = target - now;
    if (diffMs < 0) diffMs = 0;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const sisaMin = diffMin % 60;
    if (diffHour > 0) {
      return `${diffHour} jam ${sisaMin} menit lagi`;
    } else if (sisaMin > 0) {
      return `${sisaMin} menit lagi`;
    } else {
      return `Kurang dari 1 menit lagi`;
    }
  }

  fetch("reminders.json")
    .then(res => res.json())
    .then(data => {
      const container = document.getElementById("list");
      const warningDiv = document.getElementById("warning");
      if (!container) return;
      if (!Array.isArray(data) || data.length === 0) {
  container.textContent = "Belum ada pengingat.";
  container.style.color = "#fff"; // Atur warna jadi putih
  if (warningDiv) warningDiv.textContent = "⏰Pengingat program";
  warningDiv.style.color = "#4cc3ff";
  return;
}

      const now = getTokyoNow();

      // Tambahkan properti nextDate ke setiap reminder
      data.forEach(item => {
        item.nextDate = getNextReminderDate(item, now);
      });

      // Urutkan berdasarkan waktu terdekat dari sekarang
      data.sort((a, b) => {
        if (!a.nextDate) return 1;
        if (!b.nextDate) return -1;
        return a.nextDate - b.nextDate;
      });

      let adaMerah = false;

      data.forEach(item => {
        // Tandai merah jika jarak ke pengingat <= 24 jam (86400000 ms)
        const isRed = item.nextDate && (item.nextDate - now) <= 24 * 60 * 60 * 1000 && (item.nextDate - now) >= 0;
        const div = document.createElement("div");
        div.className = isRed ? "reminder-today" : "reminder-normal";
        if (isRed) {
          adaMerah = true;
          const estimasi = getTimeDiffString(item.nextDate, now);
          div.innerHTML = `${item.day ? item.day + ', ' : ''}${item.hour}:${item.minute.toString().padStart(2, '0')} – ${item.programName} (${item.channel}) <span style="margin-left:auto;color:#ff4d4d;font-weight:normal;font-size:0.95em;">${estimasi}</span>`;
        } else {
          div.textContent = `${item.day ? item.day + ', ' : ''}${item.hour}:${item.minute.toString().padStart(2, '0')} – ${item.programName} (${item.channel})`;
        }
        container.appendChild(div);
      });

      if (adaMerah && warningDiv) {
        warningDiv.textContent = `Ada pengingat dalam 24 jam ke depan!⚠️`;
      } else if (warningDiv) {
        warningDiv.textContent = "⏰Pengingat program";
        warningDiv.style.color = "#4cc3ff"; // Ganti dengan warna yang kamu mau
      }
      
    })
    .catch(() => {
      const container = document.getElementById("list");
      const warningDiv = document.getElementById("warning");
      if (container) container.textContent = "Gagal memuat data pengingat.";
      if (warningDiv) warningDiv.textContent = "⏰Pengingat program";
      warningDiv.style.color = "#4cc3ff";
    });
}

// Jalankan setelah DOM siap
window.addEventListener('DOMContentLoaded', initReminders);