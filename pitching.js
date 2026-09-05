// Supabase 設定
    const SUPABASE_URL = "https://mzdzznqeaovejzjicift.supabase.co";
    const SUPABASE_KEY = "sb_publishable_nB5WDsbADtvwaIlHjUCr-g_F9hMMbhO";
    const currentTeamId = localStorage.getItem('baseball_team_id') || '安岡少年軟式野球部';

    function normalizeTeamName(str) {
      if (!str) return '';
      return String(str).replace(/[\s\u3000]/g, '').toLowerCase();
    }

    // トースト通知システム（alertの代替・iOS Safariフリーズ防止）
    const toastBox = document.getElementById('toast-box');
    let toastTimeout = null;
    function showToast(text, duration = 2800) {
      if (toastTimeout) clearTimeout(toastTimeout);
      toastBox.textContent = text;
      toastBox.classList.add('show');
      toastTimeout = setTimeout(() => {
        toastBox.classList.remove('show');
      }, duration);
    }

    // ホームに戻るボタン（再生停止して確実に遷移）
    document.getElementById('home-link-btn').addEventListener('click', function(e) {
      e.preventDefault();
      videoElement.pause();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      window.location.href = './index.html';
    });

    const videoElement = document.getElementById('hidden-video');
    const bufferCanvas = document.getElementById('buffer-canvas');
    const bufferCtx = bufferCanvas.getContext('2d', { willReadFrequently: true });

    const scanCanvas = document.getElementById('scan-canvas');
    const scanCtx = scanCanvas.getContext('2d');

    const outputCanvas = document.getElementById('output-canvas');
    const outputCtx = outputCanvas.getContext('2d');

    let pose = null;
    let isPoseLoaded = false;
    let isProcessing = false;
    let animationFrameId = null;
    let scanModeActive = false;

    let playerName = "せんしゅ1";
    let userHeightCm = 140;
    let selectedThrowArm = 'LEFT';
    let videoFileUrl = null;
    let selectedAngleMode = 'SIDE';

    let isSkeletonVisible = true;

    let tuneRuler = {
      isActive: false,
      topYNorm: 0.2,
      bottomYNorm: 0.8,
      centerXNorm: 0.5
    };
    let activeDragHandle = null;
    let dragStartY = 0;
    let snapTop = 0, snapBottom = 0;

    let manualToeOffsetDeg = 0;
    let isDraggingToe = false;
    let toeDragOrigin = { x: 0, y: 0 };
    let smoothToeDeg = 0;

    let zoomScale = 1.0;
    let zoomPan = { x: 0, y: 0 };
    let initialPinchDistance = 0;
    let initialZoomScale = 1.0;
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let panSnapshot = { x: 0, y: 0 };

    let prevLeadToeY = null;
    let leadFootFlatStationaryCount = 0;

    let currentCalculatedState = {
      displayToeAngle: 0,
      toeStateLabel: "◎ ストレート",
      kneeDevAngle: 0,
      kneeStateLabel: "まっすぐ (◎ 正常)",
      kneeFlexAngle: 0
    };

    let records = {
      maxStride: 0,
      maxMER: 0,
      maxTwist: 0,
      maxRelease: 0,
      ffKneeFlex: null,
      releaseKneeFlex: null,
      maxTrunkTilt: 0,
      toeAngle: 0,
      fcToeAngle: null,
      fcToeLabel: null,
      maxValgus: 0,
      ffValgusAngle: null,
      ffValgusLabel: null,
      maxTrunkLateral: 0,
      maxArmSlot: 0,
      maxInStepCm: 0,
      maxReleaseLateral: 0
    };

    const stepViews = {
      1: document.getElementById('view-step1'),
      2: document.getElementById('view-step2'),
      3: document.getElementById('view-step3'),
      4: document.getElementById('view-step4')
    };

    const stepPills = {
      1: document.getElementById('step-nav-1'),
      2: document.getElementById('step-nav-2'),
      3: document.getElementById('step-nav-3')
    };

    const c1Title = document.getElementById('c1-title');
    const c1Val = document.getElementById('c1-val');
    const c1Max = document.getElementById('c1-max');

    const c2Title = document.getElementById('c2-title');
    const c2Val = document.getElementById('c2-val');
    const c2Max = document.getElementById('c2-max');

    const c3Title = document.getElementById('c3-title');
    const c3Val = document.getElementById('c3-val');
    const c3Max = document.getElementById('c3-max');

    const c4Title = document.getElementById('c4-title');
    const c4Val = document.getElementById('c4-val');
    const c4Max = document.getElementById('c4-max');

    const c5Title = document.getElementById('c5-title');
    const c5Val = document.getElementById('c5-val');
    const c5Max = document.getElementById('c5-max');

    const c6Title = document.getElementById('c6-title');
    const c6Val = document.getElementById('c6-val');
    const c6Max = document.getElementById('c6-max');

    const angleModeBadge = document.getElementById('angle-mode-badge');
    const playerTagBadge = document.getElementById('player-tag-badge');

    const scanSeekBar = document.getElementById('scan-seek-bar');
    const scanTimeDisp = document.getElementById('scan-time-disp');
    const seekBar = document.getElementById('seek-bar');
    const timeDisp = document.getElementById('time-disp');
    const btnPlayPause = document.getElementById('btn-play-pause');
    const zoomBadge = document.getElementById('zoom-badge');
    const aiLoading = document.getElementById('ai-loading');
    const scanLoading = document.getElementById('scan-loading');
    const btnScanNextStep = document.getElementById('btn-scan-next-step');
    const scanGuideText = document.getElementById('scan-guide-text');

    const btnArmRight = document.getElementById('btn-arm-right');
    const btnArmLeft = document.getElementById('btn-arm-left');
    const btnToggleSkeleton = document.getElementById('btn-toggle-skeleton');

    const carteModal = document.getElementById('carte-modal');
    const btnCloseCarte = document.getElementById('btn-close-carte');
    const carteHistoryList = document.getElementById('carte-history-list');
    const playerSelectFilter = document.getElementById('player-select-filter');
    const btnDeleteAction = document.getElementById('btn-delete-action');

    const pastPlayerSelect = document.getElementById('past-player-select');
    const playerNameInput = document.getElementById('player-name-input');
    const heightInput = document.getElementById('height-input');

    const restoreModal = document.getElementById('restore-modal');
    const btnOpenRestore = document.getElementById('btn-open-restore');
    const btnCloseRestore = document.getElementById('btn-close-restore');
    const restorePlayerSelect = document.getElementById('restore-player-select');
    const restoreStatusInfo = document.getElementById('restore-status-info');
    const btnExecRestore = document.getElementById('btn-exec-restore');
    let cachedCloudPitchingRecords = [];

    function updateCardLabels() {
      const isLeft = (selectedThrowArm === 'LEFT');
      if (selectedAngleMode === 'SIDE') {
        angleModeBadge.textContent = "横向き解析 ⚾";
        angleModeBadge.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";

        c1Title.textContent = "🚶 ステップ幅 (歩幅)";
        c2Title.textContent = isLeft ? "💪 うでのしなり (左肩外旋)" : "💪 うでのしなり (右肩外旋)";
        c3Title.textContent = "🔄 捻転差 (胸と腰のひねり)";
        c4Title.textContent = "⚾ 指先リリース高";
        c5Title.textContent = isLeft ? "🦵 前足ヒザ屈曲角度 (右足)" : "🦵 前足ヒザ屈曲角度 (左足)";
        c6Title.textContent = "📐 体幹の前傾角度 (倒れ)";
      } else {
        angleModeBadge.textContent = "正面・斜め前解析 🎯";
        angleModeBadge.style.background = "linear-gradient(135deg, #10b981, #059669)";

        c1Title.textContent = "👟 前足つま先の向き";
        c2Title.textContent = "🦵 前足ヒザの内外反";
        c3Title.textContent = "📐 上半身の傾き (体幹側屈)";
        c4Title.textContent = isLeft ? "💪 アームスロット (左腕)" : "💪 アームスロット (右腕)";
        c5Title.textContent = "🚶 踏み出しのズレ (イン/アウト)";
        c6Title.textContent = "⚾ リリース左右位置 (打点)";
      }
    }

    btnArmRight.addEventListener('click', () => {
      selectedThrowArm = 'RIGHT';
      btnArmRight.classList.add('active');
      btnArmLeft.classList.remove('active');
      updateCardLabels();
      processSingleFrame();
    });

    btnArmLeft.addEventListener('click', () => {
      selectedThrowArm = 'LEFT';
      btnArmLeft.classList.add('active');
      btnArmRight.classList.remove('active');
      updateCardLabels();
      processSingleFrame();
    });

    btnToggleSkeleton.addEventListener('click', () => {
      isSkeletonVisible = !isSkeletonVisible;
      btnToggleSkeleton.textContent = isSkeletonVisible ? "🦴 骨格" : "🦴 非表示";
      btnToggleSkeleton.style.background = isSkeletonVisible ? "#ffffff" : "linear-gradient(135deg, #38bdf8, #0284c7)";
      btnToggleSkeleton.style.color = isSkeletonVisible ? "#334155" : "#ffffff";
      processSingleFrame();
    });

    function populatePastPlayers() {
      if (!pastPlayerSelect) return;
      const currentVal = pastPlayerSelect.value;
      pastPlayerSelect.innerHTML = '<option value="">-- 新しい選手を入力 --</option>';

      let savedPitch = [];
      let savedBat = [];
      try {
        savedPitch = JSON.parse(localStorage.getItem('pitching_ai_records_v1') || '[]');
        savedBat = JSON.parse(localStorage.getItem('batting_ai_records_v1') || '[]');
      } catch(e){}

      const playerMap = new Map();
      savedPitch.forEach(r => {
        if (r.playerName && !playerMap.has(r.playerName)) {
          playerMap.set(r.playerName, {
            name: r.playerName,
            height: r.height || 140,
            throwArm: r.throwArm || 'LEFT'
          });
        }
      });
      savedBat.forEach(r => {
        if (r.playerName && !playerMap.has(r.playerName)) {
          playerMap.set(r.playerName, {
            name: r.playerName,
            height: r.height || 140,
            throwArm: 'LEFT'
          });
        }
      });

      playerMap.forEach((info, name) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `👤 ${name} (${info.height}cm / ${info.throwArm === 'RIGHT' ? '右投' : '左投'})`;
        opt.dataset.height = info.height;
        opt.dataset.throwArm = info.throwArm;
        pastPlayerSelect.appendChild(opt);
      });

      if (currentVal && playerMap.has(currentVal)) {
        pastPlayerSelect.value = currentVal;
      }
    }

    pastPlayerSelect.addEventListener('change', (e) => {
      const selectedName = e.target.value;
      if (!selectedName) return;

      const opt = e.target.selectedOptions[0];
      if (!opt) return;

      const h = opt.dataset.height;
      const arm = opt.dataset.throwArm;

      playerNameInput.value = selectedName;
      if (h) heightInput.value = h;
      if (arm === 'RIGHT') {
        selectedThrowArm = 'RIGHT';
        btnArmRight.classList.add('active');
        btnArmLeft.classList.remove('active');
      } else {
        selectedThrowArm = 'LEFT';
        btnArmLeft.classList.add('active');
        btnArmRight.classList.remove('active');
      }
      updateCardLabels();
    });

    function setStep(stepNum) {
      Object.keys(stepViews).forEach(s => stepViews[s].classList.remove('active'));
      if (stepViews[stepNum]) stepViews[stepNum].classList.add('active');

      Object.keys(stepPills).forEach(s => stepPills[s].classList.remove('active'));
      if (stepNum <= 3 && stepPills[stepNum]) {
        stepPills[stepNum].classList.add('active');
      } else if (stepNum === 4 && stepPills[3]) {
        stepPills[3].classList.add('active');
      }

      if (stepNum === 3) {
        populatePastPlayers();
      }
    }

    stepPills[1].addEventListener('click', () => {
      videoElement.pause();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      tuneRuler.isActive = false;
      btnScanNextStep.style.display = 'none';
      setStep(1);
    });

    stepPills[2].addEventListener('click', () => {
      if (videoFileUrl) {
        videoElement.pause();
        setStep(2);
        setTimeout(() => {
          updateScanScreenSize();
          renderScanFrame();
        }, 100);
      }
    });

    stepPills[3].addEventListener('click', () => {
      if (videoFileUrl) {
        videoElement.pause();
        setStep(3);
      }
    });

    // 息子くんも読む！超ショート版AIトレーナー（3秒ルール）
    function generatePitchingAICoachAdvice(entry) {
      let praise = "腕の振りが鋭くなってきたぞ！";
      let mission = "お風呂あがりに壁に手をついて「胸ピーン」10秒！【🧘 ストレッチ】";

      if (entry.mode === 'SIDE') {
        const m = entry.metrics;
        const strideRatio = m.strideRatio || 0;
        const mer = m.mer || 0;
        const twist = m.twist || 0;
        const ffK = m.ffKneeFlex || 0;
        const relK = m.releaseKneeFlex || 0;

        if (strideRatio > 0 && strideRatio < 72) {
          praise = "しっかり前を向いて投げられてる！";
          mission = "幅跳びジャンプで前へピタッと着地×5回！【🦘 ジャンプ】";
        } else if (mer > 0 && mer < 150) {
          praise = "下半身の体重移動が良い感じ！";
          mission = "壁に手をついて胸ピーン！胸と肩甲骨をほぐそう【🧘 ストレッチ】";
        } else if (relK > ffK + 10) {
          praise = "腕の振りに力強さがあるぞ！";
          mission = "前足でピタッと止まる片足立ちキープ15秒！【🦩 バランス】";
        } else if (twist > 0 && twist < 22) {
          praise = "腕のしなりがナイス！";
          mission = "腰とお腹をねじるストレッチでタメを作ろう！【🧘 ストレッチ】";
        } else {
          praise = "歩幅もしなりも理想のフォーム！";
          mission = "今のナイスな感覚のままシャドウピッチング×10本！【🌟 継続】";
        }
      } else {
        const m = entry.metrics;
        const toe = m.toeAngle || 0;
        const valgus = m.valgus || 0;

        if (toe > 15) {
          praise = "腕がしっかり振れてるぞ！";
          mission = "地面のラインに沿って真っ直ぐ一歩ジャンプ！【🦘 ジャンプ】";
        } else if (valgus > 10) {
          praise = "思い切り腕を振れてる！";
          mission = "着地足でグラつかない片足立ちバランス20秒！【🦩 バランス】";
        } else {
          praise = "つま先もヒザも真っ直ぐ向いてる！";
          mission = "この安定したバランスをキープしよう！【🌟 継続】";
        }
      }

      let text = "【🤖 AIトレーナーの今日のミッション】\n";
      text += "🌟 ナイス！: " + praise + "\n";
      text += "🎯 今日の宿題（30秒）: " + mission;
      return text;
    }

    function initMediaPipe() {
      if (pose) return Promise.resolve();
      scanLoading.style.display = 'flex';
      aiLoading.style.display = 'flex';

      pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });

      pose.setOptions({
        modelComplexity: 2,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.15,
        minTrackingConfidence: 0.15
      });

      pose.onResults(onPoseResults);
      return pose.initialize().then(() => {
        isPoseLoaded = true;
        scanLoading.style.display = 'none';
        aiLoading.style.display = 'none';
      }).catch(err => {
        console.error("MediaPipe Load Error:", err);
        scanLoading.style.display = 'none';
        aiLoading.style.display = 'none';
      });
    }

    function getAspectFitBounds(srcW, srcH, dstW, dstH) {
      if (!srcW || !srcH || !dstW || !dstH) return { x: 0, y: 0, w: dstW || 300, h: dstH || 200 };
      const srcAspect = srcW / srcH;
      const dstAspect = dstW / dstH;
      let w, h, x, y;
      if (srcAspect > dstAspect) {
        w = dstW;
        h = dstW / srcAspect;
        x = 0;
        y = (dstH - h) / 2;
      } else {
        h = dstH;
        w = dstH * srcAspect;
        x = (dstW - w) / 2;
        y = 0;
      }
      return { x, y, w, h };
    }

    // 連続動画読み込み時のフリーズ・競合を完全に防ぐ安全ロード
    async function handleVideoLoad(file, angleMode) {
      if (!file) return;
      selectedAngleMode = angleMode;

      videoElement.pause();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      isProcessing = false;

      if (videoFileUrl) {
        URL.revokeObjectURL(videoFileUrl);
        videoFileUrl = null;
      }
      videoFileUrl = URL.createObjectURL(file);
      
      updateCardLabels();
      setStep(2);

      tuneRuler.isActive = false;
      btnScanNextStep.style.display = 'none';

      videoElement.muted = true;
      videoElement.playsInline = true;
      videoElement.src = videoFileUrl;
      videoElement.load();

      const onVideoReady = () => {
        updateScanScreenSize();
        renderScanFrame();
      };

      videoElement.onloadedmetadata = () => {
        try { videoElement.currentTime = 0.001; } catch (e) {}
        onVideoReady();
      };
      videoElement.onloadeddata = onVideoReady;

      setTimeout(onVideoReady, 150);
      await initMediaPipe();
    }

    const inputSide = document.getElementById('video-input-side');
    const inputFront = document.getElementById('video-input-front');

    inputSide.addEventListener('click', function() { this.value = null; });
    inputFront.addEventListener('click', function() { this.value = null; });

    inputSide.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        handleVideoLoad(e.target.files[0], 'SIDE');
      }
    });

    inputFront.addEventListener('change', function(e) {
      if (e.target.files && e.target.files[0]) {
        handleVideoLoad(e.target.files[0], 'FRONT');
      }
    });

    function updateScanScreenSize() {
      const rect = scanCanvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        scanCanvas.width = rect.width;
        scanCanvas.height = rect.height;
      }
    }

    function renderScanFrame() {
      const cw = scanCanvas.width;
      const ch = scanCanvas.height;
      if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;

      scanCtx.clearRect(0, 0, cw, ch);
      const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
      scanCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);

      if (Number.isFinite(videoElement.duration) && videoElement.duration > 0) {
        scanSeekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
        scanTimeDisp.textContent = `${videoElement.currentTime.toFixed(2)} / ${videoElement.duration.toFixed(2)}`;
      }

      if (tuneRuler.isActive) {
        drawInteractiveRuler(b);
      }
    }

    function drawInteractiveRuler(b) {
      const topY = b.y + tuneRuler.topYNorm * b.h;
      const bottomY = b.y + tuneRuler.bottomYNorm * b.h;
      const centerX = b.x + tuneRuler.centerXNorm * b.w;
      const barWidth = 50;

      scanCtx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      scanCtx.lineWidth = 4;
      scanCtx.beginPath();
      scanCtx.moveTo(centerX, topY);
      scanCtx.lineTo(centerX, bottomY);
      scanCtx.stroke();

      scanCtx.strokeStyle = "#38bdf8";
      scanCtx.lineWidth = 2;
      scanCtx.beginPath();
      scanCtx.moveTo(centerX, topY);
      scanCtx.lineTo(centerX, bottomY);
      scanCtx.stroke();

      scanCtx.strokeStyle = "#10b981";
      scanCtx.lineWidth = 3.5;
      scanCtx.beginPath();
      scanCtx.moveTo(centerX - barWidth, topY);
      scanCtx.lineTo(centerX + barWidth, topY);
      scanCtx.stroke();

      scanCtx.fillStyle = "#10b981";
      scanCtx.beginPath();
      scanCtx.arc(centerX, topY, 11, 0, Math.PI * 2);
      scanCtx.fill();
      scanCtx.strokeStyle = "#ffffff";
      scanCtx.lineWidth = 2;
      scanCtx.stroke();

      scanCtx.fillStyle = "#ffffff";
      scanCtx.font = "bold 10px sans-serif";
      scanCtx.textAlign = "center";
      scanCtx.fillText("👑 あたま ↕", centerX, topY - 14);

      scanCtx.strokeStyle = "#f43f5e";
      scanCtx.lineWidth = 3.5;
      scanCtx.beginPath();
      scanCtx.moveTo(centerX - barWidth, bottomY);
      scanCtx.lineTo(centerX + barWidth, bottomY);
      scanCtx.stroke();

      scanCtx.fillStyle = "#f43f5e";
      scanCtx.beginPath();
      scanCtx.arc(centerX, bottomY, 11, 0, Math.PI * 2);
      scanCtx.fill();
      scanCtx.strokeStyle = "#ffffff";
      scanCtx.lineWidth = 2;
      scanCtx.stroke();

      scanCtx.fillStyle = "#ffffff";
      scanCtx.fillText("👟 じめん ↕", centerX, bottomY + 18);
    }

    function getCanvasPoint(evt, canvas) {
      const rect = canvas.getBoundingClientRect();
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    }

    function onScanPointerDown(e) {
      if (!tuneRuler.isActive) return;
      const pt = getCanvasPoint(e, scanCanvas);
      const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
      
      const topY = b.y + tuneRuler.topYNorm * b.h;
      const bottomY = b.y + tuneRuler.bottomYNorm * b.h;
      const centerX = b.x + tuneRuler.centerXNorm * b.w;
      const tol = 30;

      if (Math.abs(pt.y - topY) <= tol && Math.abs(pt.x - centerX) <= 65) {
        activeDragHandle = 'top';
      } else if (Math.abs(pt.y - bottomY) <= tol && Math.abs(pt.x - centerX) <= 65) {
        activeDragHandle = 'bottom';
      } else if (pt.y > topY && pt.y < bottomY && Math.abs(pt.x - centerX) <= 40) {
        activeDragHandle = 'both';
      }
      dragStartY = pt.y;
      snapTop = tuneRuler.topYNorm;
      snapBottom = tuneRuler.bottomYNorm;
    }

    function onScanPointerMove(e) {
      if (!activeDragHandle || !tuneRuler.isActive) return;
      const pt = getCanvasPoint(e, scanCanvas);
      const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, scanCanvas.width, scanCanvas.height);
      const dNormY = (pt.y - dragStartY) / b.h;

      if (activeDragHandle === 'top') {
        tuneRuler.topYNorm = Math.min(tuneRuler.bottomYNorm - 0.1, Math.max(0.01, snapTop + dNormY));
      } else if (activeDragHandle === 'bottom') {
        tuneRuler.bottomYNorm = Math.max(tuneRuler.topYNorm + 0.1, Math.min(0.99, snapBottom + dNormY));
      } else if (activeDragHandle === 'both') {
        const heightNorm = snapBottom - snapTop;
        const newTop = Math.max(0.01, Math.min(0.99 - heightNorm, snapTop + dNormY));
        tuneRuler.topYNorm = newTop;
        tuneRuler.bottomYNorm = newTop + heightNorm;
      }
      renderScanFrame();
    }

    function onScanPointerUp() {
      activeDragHandle = null;
    }

    scanCanvas.addEventListener('mousedown', onScanPointerDown);
    scanCanvas.addEventListener('mousemove', onScanPointerMove);
    window.addEventListener('mouseup', onScanPointerUp);

    scanCanvas.addEventListener('touchstart', onScanPointerDown, { passive: true });
    scanCanvas.addEventListener('touchmove', onScanPointerMove, { passive: true });
    window.addEventListener('touchend', onScanPointerUp);

    scanSeekBar.addEventListener('input', () => {
      if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
      videoElement.currentTime = (scanSeekBar.value / 100) * videoElement.duration;
      renderScanFrame();
    });

    document.getElementById('btn-scan-prev').addEventListener('click', () => {
      videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
      renderScanFrame();
    });

    document.getElementById('btn-scan-next').addEventListener('click', () => {
      videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
      renderScanFrame();
    });

    document.getElementById('btn-scan-action').addEventListener('click', async () => {
      scanLoading.style.display = 'flex';
      scanModeActive = true;

      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      bufferCanvas.width = vw;
      bufferCanvas.height = vh;
      bufferCtx.drawImage(videoElement, 0, 0, vw, vh);

      try {
        await pose.send({ image: bufferCanvas });
      } catch (err) {
        console.error("Scan Error:", err);
      } finally {
        scanLoading.style.display = 'none';
        scanModeActive = false;
      }
    });

    btnScanNextStep.addEventListener('click', () => {
      setStep(3);
    });

    document.getElementById('btn-re-scan').addEventListener('click', () => {
      tuneRuler.isActive = false;
      btnScanNextStep.style.display = 'none';
      setStep(2);
      setTimeout(() => {
        updateScanScreenSize();
        renderScanFrame();
      }, 100);
    });

    document.getElementById('btn-start-analysis').addEventListener('click', () => {
      const pName = playerNameInput.value.trim();
      playerName = pName || "せんしゅ1";

      const hVal = parseFloat(heightInput.value);
      userHeightCm = (Number.isFinite(hVal) && hVal >= 80 && hVal <= 220) ? hVal : 140;

      playerTagBadge.textContent = `👤 ${playerName} (${userHeightCm}cm)`;

      setStep(4);
      setTimeout(() => {
        resetWorkspaceDimensions();
        processSingleFrame();
      }, 150);
    });

    function resetWorkspaceDimensions() {
      const rect = outputCanvas.parentElement.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        outputCanvas.width = rect.width;
        outputCanvas.height = rect.height;
      }
    }

    window.addEventListener('resize', () => {
      if (stepViews[4].classList.contains('active')) {
        resetWorkspaceDimensions();
        processSingleFrame();
      } else if (stepViews[2].classList.contains('active')) {
        updateScanScreenSize();
        renderScanFrame();
      }
    });

    function updateZoomBadge() {
      zoomBadge.textContent = `🔍 ${zoomScale.toFixed(1)}x (ピンチ可)`;
    }

    outputCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.max(1.0, Math.min(5.0, zoomScale * zoomFactor));
      if (newScale === 1.0) zoomPan = { x: 0, y: 0 };
      zoomScale = newScale;
      updateZoomBadge();
      processSingleFrame();
    }, { passive: false });

    let lastCalculatedLeadToePt = null;

    outputCanvas.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        initialPinchDistance = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoomScale = zoomScale;
      } else if (e.touches.length === 1) {
        const pt = getCanvasPoint(e, outputCanvas);
        if (selectedAngleMode === 'FRONT' && lastCalculatedLeadToePt && zoomScale === 1.0) {
          const distToToe = Math.hypot(pt.x - lastCalculatedLeadToePt.x, pt.y - lastCalculatedLeadToePt.y);
          if (distToToe <= 35) {
            isDraggingToe = true;
            toeDragOrigin = { ...pt };
            return;
          }
        }
        if (zoomScale > 1.0) {
          isPanning = true;
          panStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          panSnapshot = { ...zoomPan };
        }
      }
    }, { passive: true });

    outputCanvas.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        if (initialPinchDistance > 0) {
          const factor = dist / initialPinchDistance;
          zoomScale = Math.max(1.0, Math.min(5.0, initialZoomScale * factor));
          if (zoomScale === 1.0) zoomPan = { x: 0, y: 0 };
          updateZoomBadge();
          processSingleFrame();
        }
      } else if (e.touches.length === 1) {
        if (isDraggingToe) {
          const pt = getCanvasPoint(e, outputCanvas);
          const dx = pt.x - toeDragOrigin.x;
          manualToeOffsetDeg = Math.max(-30, Math.min(30, manualToeOffsetDeg + dx * 0.4));
          toeDragOrigin = { ...pt };
          processSingleFrame();
        } else if (isPanning && zoomScale > 1.0) {
          const dx = e.touches[0].clientX - panStart.x;
          const dy = e.touches[0].clientY - panStart.y;
          zoomPan.x = panSnapshot.x + dx;
          zoomPan.y = panSnapshot.y + dy;
          processSingleFrame();
        }
      }
    }, { passive: true });

    outputCanvas.addEventListener('touchend', (e) => {
      if (e.touches.length < 2) initialPinchDistance = 0;
      if (e.touches.length === 0) {
        isPanning = false;
        isDraggingToe = false;
      }
    });

    document.getElementById('btn-zoom-reset').addEventListener('click', () => {
      zoomScale = 1.0;
      zoomPan = { x: 0, y: 0 };
      manualToeOffsetDeg = 0;
      updateZoomBadge();
      processSingleFrame();
    });

    document.getElementById('btn-manual-fc').addEventListener('click', () => {
      if (selectedAngleMode === 'FRONT') {
        records.fcToeAngle = currentCalculatedState.displayToeAngle;
        records.fcToeLabel = `べた足時: ${currentCalculatedState.displayToeAngle}° (${currentCalculatedState.toeStateLabel})`;
        records.ffValgusAngle = currentCalculatedState.kneeDevAngle;
        records.ffValgusLabel = `べた足時: ${currentCalculatedState.kneeDevAngle}° (${currentCalculatedState.kneeStateLabel})`;
        
        c1Max.textContent = records.fcToeLabel;
        c2Max.textContent = records.ffValgusLabel;
        showToast(`👟 べた足時のつま先【${currentCalculatedState.displayToeAngle}°】を記録しました！`);
      } else {
        records.ffKneeFlex = currentCalculatedState.kneeFlexAngle;
        const brText = records.releaseKneeFlex !== null ? `屈曲 ${records.releaseKneeFlex}°` : '屈曲 --°';
        c5Max.textContent = `FF時: 屈曲 ${records.ffKneeFlex}° (リリース時: ${brText})`;
        showToast(`👟 べた足時の前足ヒザ屈曲【${records.ffKneeFlex}°】を記録しました！`);
      }
    });

    const STORAGE_KEY = 'pitching_ai_records_v1';

    function getSavedRecords() {
      try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
      } catch (e) {
        return [];
      }
    }

    function saveCurrentRecord() {
      const allRecords = getSavedRecords();
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getDate().toString().padStart(2,'0')}`;
      const timeStr = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;

      const newEntry = {
        id: Date.now(),
        date: dateStr,
        time: timeStr,
        playerName: playerName,
        height: userHeightCm,
        throwArm: selectedThrowArm,
        mode: selectedAngleMode,
        feelGrade: "😆 めっちゃ良かった！",
        bodyCondition: "🟢 どこも痛くない！元気！",
        playerNote: "",
        metrics: selectedAngleMode === 'SIDE' ? {
          stride: records.maxStride,
          strideRatio: Math.round((records.maxStride / userHeightCm) * 100),
          mer: records.maxMER,
          twist: records.maxTwist,
          releaseH: records.maxRelease,
          ffKneeFlex: records.ffKneeFlex !== null ? records.ffKneeFlex : currentCalculatedState.kneeFlexAngle,
          releaseKneeFlex: records.releaseKneeFlex !== null ? records.releaseKneeFlex : currentCalculatedState.kneeFlexAngle,
          trunkTilt: records.maxTrunkTilt
        } : {
          toeAngle: records.fcToeAngle !== null ? records.fcToeAngle : 0,
          toeLabel: records.fcToeLabel || "未測定",
          valgus: records.ffValgusAngle !== null ? records.ffValgusAngle : records.maxValgus,
          valgusLabel: records.ffValgusLabel || "未測定",
          trunkLateral: records.maxTrunkLateral,
          armSlot: records.maxArmSlot,
          inStep: records.maxInStepCm,
          releaseLateral: records.maxReleaseLateral
        }
      };

      allRecords.unshift(newEntry);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
        populatePastPlayers();
        showToast(`✅ ${playerName}君の投球データをカルテに保存しました！`);
      } catch (e) {
        showToast("⚠️ 保存容量がいっぱいです");
      }
    }

    document.getElementById('btn-save-record').addEventListener('click', saveCurrentRecord);

    function openCarteModal() {
      renderCarteList(true);
      carteModal.style.display = 'flex';
    }

    function closeCarteModal() {
      carteModal.style.display = 'none';
    }

    document.getElementById('btn-open-carte').addEventListener('click', openCarteModal);
    document.getElementById('btn-open-carte-top').addEventListener('click', openCarteModal);
    btnCloseCarte.addEventListener('click', closeCarteModal);

    function deleteSingleDayGroup(key) {
      let allRecords = getSavedRecords();
      allRecords = allRecords.filter(r => `${r.playerName}_${r.date}` !== key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      populatePastPlayers();
      renderCarteList(false);
      showToast("🗑️ 選択した日のカルテを削除しました");
    }

    async function sendRecordToCloud(groupKey, btnElement) {
      const allRecords = getSavedRecords();
      const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
      if (groupRecords.length === 0) return;

      const first = groupRecords[0];
      if (btnElement) {
        btnElement.disabled = true;
        btnElement.textContent = "⏳ クラウドに送信中...";
      }

      try {
        const adviceText = generatePitchingAICoachAdvice(first);
        const payload = groupRecords.map(r => ({
          team_id: currentTeamId,
          player_name: r.playerName,
          height: r.height,
          category: 'PITCHING',
          sub_side: r.throwArm,
          angle_mode: r.mode,
          metrics: r.metrics,
          feel_grade: r.feelGrade || first.feelGrade || "😆 めっちゃ良かった！",
          body_condition: r.bodyCondition || first.bodyCondition || "🟢 どこも痛くない！元気！",
          player_note: r.playerNote || first.playerNote || "",
          coach_advice: adviceText
        }));

        const res = await fetch(`${SUPABASE_URL}/rest/v1/baseball_records`, {
          method: "POST",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        showToast(`✅ 【${first.playerName}選手】の投球カルテをクラウドに送信しました！`);
        if (btnElement) {
          btnElement.textContent = "✅ 送信完了（再送信可）";
          btnElement.classList.add('sent');
        }
      } catch (err) {
        showToast(`❌ 送信に失敗しました: ${err.message}`);
        if (btnElement) {
          btnElement.textContent = "☁️ 📤 チーム・クラウドに送信する";
        }
      } finally {
        if (btnElement) btnElement.disabled = false;
      }
    }

    btnOpenRestore.addEventListener('click', async () => {
      document.getElementById('restore-team-name').textContent = currentTeamId;
      restoreStatusInfo.textContent = "⏳ クラウドのデータを検索中...";
      restorePlayerSelect.innerHTML = '<option value="">読み込み中...</option>';
      btnExecRestore.disabled = true;
      restoreModal.style.display = 'flex';

      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/baseball_records?category=eq.PITCHING&select=*&order=id.desc&limit=500`, {
          method: 'GET',
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const targetNorm = normalizeTeamName(currentTeamId);

        cachedCloudPitchingRecords = (data || []).filter(r => normalizeTeamName(r.team_id) === targetNorm);
        const playerNames = Array.from(new Set(cachedCloudPitchingRecords.map(r => r.player_name).filter(Boolean)));

        restorePlayerSelect.innerHTML = '';
        if (playerNames.length === 0) {
          restorePlayerSelect.innerHTML = '<option value="">(保存データなし)</option>';
          restoreStatusInfo.textContent = `⚠️ チーム【${currentTeamId}】の投球データは見つかりませんでした。`;
        } else {
          playerNames.forEach(p => {
            const count = cachedCloudPitchingRecords.filter(r => r.player_name === p).length;
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = `👤 ${p}（${count}件のカルテ）`;
            restorePlayerSelect.appendChild(opt);
          });
          restoreStatusInfo.textContent = `✅ ${playerNames.length}名の選手データが見つかりました。復旧したい選手を選択してください。`;
          btnExecRestore.disabled = false;
        }
      } catch(err) {
        restoreStatusInfo.textContent = `❌ 接続に失敗しました: ${err.message}`;
        restorePlayerSelect.innerHTML = '<option value="">エラー</option>';
      }
    });

    btnCloseRestore.addEventListener('click', () => {
      restoreModal.style.display = 'none';
    });

    btnExecRestore.addEventListener('click', () => {
      const targetPlayer = restorePlayerSelect.value;
      if (!targetPlayer) return;

      const targetRecords = cachedCloudPitchingRecords.filter(r => r.player_name === targetPlayer);
      if (targetRecords.length === 0) return;

      let localRecords = getSavedRecords();
      let restoredCount = 0;

      targetRecords.forEach(cr => {
        const crDate = cr.date || (cr.created_at ? cr.created_at.slice(0, 10).replace(/-/g, '/') : '');
        const exists = localRecords.some(lr => lr.playerName === cr.player_name && lr.date === crDate && lr.mode === cr.angle_mode);
        if (!exists) {
          const newEntry = {
            id: cr.id || Date.now() + Math.random(),
            date: crDate || new Date().toLocaleDateString('ja-JP'),
            time: cr.time || (cr.created_at ? cr.created_at.slice(11, 16) : '12:00'),
            playerName: cr.player_name,
            height: cr.height || 140,
            throwArm: cr.sub_side || 'RIGHT',
            mode: cr.angle_mode || 'SIDE',
            feelGrade: cr.feel_grade || '😆 めっちゃ良かった！',
            bodyCondition: cr.body_condition || '🟢 どこも痛くない！元気！',
            playerNote: cr.player_note || '',
            metrics: cr.metrics || {}
          };
          localRecords.unshift(newEntry);
          restoredCount++;
        }
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(localRecords));
      restoreModal.style.display = 'none';
      populatePastPlayers();
      renderCarteList(false);
      showToast(`✅ 【${targetPlayer}選手】の投球カルテ（${restoredCount}件）を端末に復旧しました！`);
    });

    function shareRecordToLine(groupKey) {
      const allRecords = getSavedRecords();
      const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
      if (groupRecords.length === 0) return;

      const first = groupRecords[0];
      const sideRec = groupRecords.find(r => r.mode === 'SIDE');
      const frontRec = groupRecords.find(r => r.mode === 'FRONT');

      let text = `⚾ 【投球バイオメカニクス 選手レポート】 ⚾\n`;
      text += `👤 選手名: ${first.playerName} 選手 (${first.height}cm / ${first.throwArm === 'RIGHT' ? '右投げ' : '左投げ'})\n`;
      text += `📅 測定日: ${first.date}\n\n`;

      if (sideRec) {
        text += `📊 【横向き測定データ】\n`;
        text += `・ステップ幅: ${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%身)\n`;
        text += `・腕のしなり(肩外旋): ${sideRec.metrics.mer}°\n`;
        text += `・捻転差: ${sideRec.metrics.twist}°\n`;
        text += `・リリース高: ${sideRec.metrics.releaseH}cm\n`;
        text += `・前足ヒザ: FF時 屈曲 ${sideRec.metrics.ffKneeFlex}° (リリース時: 屈曲 ${sideRec.metrics.releaseKneeFlex}°)\n`;
        text += `・体幹前傾: ${sideRec.metrics.trunkTilt}°\n\n`;
      }

      if (frontRec) {
        text += `🎯 【正面測定データ】\n`;
        text += `・つま先の向き: ${frontRec.metrics.toeAngle}°\n`;
        text += `・ヒザ内外反: ${frontRec.metrics.valgus}°\n`;
        text += `・体幹の傾き: ${frontRec.metrics.trunkLateral}°\n`;
        text += `・アームスロット: ${frontRec.metrics.armSlot}°\n`;
        text += `・踏み出しズレ: ${frontRec.metrics.inStep}cm\n`;
        text += `・リリース横幅: ${frontRec.metrics.releaseLateral}cm\n\n`;
      }

      text += generatePitchingAICoachAdvice(first) + "\n\n";

      text += `👦 【せんしゅのふりかえり】\n`;
      text += `・なげた感覚: ${first.feelGrade || '😆 めっちゃ良かった！'}\n`;
      text += `・カラダの調子: ${first.bodyCondition || '🟢 どこも痛くない！元気！'}\n`;
      if (first.playerNote && first.playerNote.trim() !== '') {
        text += `・ひとこと: 「${first.playerNote.trim()}」\n`;
      }

      if (navigator.share) {
        navigator.share({
          title: `${first.playerName}選手の投球フォームレポート`,
          text: text
        }).catch(err => {
          if (err.name !== 'AbortError') console.log('Share error:', err);
        });
      } else {
        document.execCommand('copy');
        showToast("📋 レポート文をクリップボードにコピーしました！");
      }
    }

    function renderCarteList(isInitialOpen) {
      const allRecords = getSavedRecords();
      carteHistoryList.innerHTML = '';

      const playerNames = Array.from(new Set(allRecords.map(r => r.playerName)));
      const previousSelection = playerSelectFilter.value;

      playerSelectFilter.innerHTML = '<option value="ALL">🌟 全員のカルテを表示</option>';
      playerNames.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = `👤 ${p}`;
        playerSelectFilter.appendChild(opt);
      });

      if (isInitialOpen) {
        playerSelectFilter.value = playerNames.includes(playerName) ? playerName : 'ALL';
      } else if (playerNames.includes(previousSelection) || previousSelection === 'ALL') {
        playerSelectFilter.value = previousSelection;
      } else {
        playerSelectFilter.value = 'ALL';
      }

      const selectedFilter = playerSelectFilter.value;
      btnDeleteAction.textContent = (selectedFilter === 'ALL') ? "⚠️ 全カルテ初期化" : `🗑️ ${selectedFilter}を全削除`;

      const filtered = selectedFilter === 'ALL' ? allRecords : allRecords.filter(r => r.playerName === selectedFilter);

      if (filtered.length === 0) {
        carteHistoryList.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-weight:800;">保存されたカルテはありません。<br>（誤って消去した場合は上の「☁️ 復旧」から復元できます）</div>';
        return;
      }

      const groups = {};
      filtered.forEach(r => {
        const key = `${r.playerName}_${r.date}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(r);
      });

      Object.keys(groups).forEach(key => {
        const recs = groups[key];
        const first = recs[0];
        const sideRec = recs.find(r => r.mode === 'SIDE');
        const frontRec = recs.find(r => r.mode === 'FRONT');

        const curFeel = first.feelGrade || "😆 めっちゃ良かった！";
        const curBody = first.bodyCondition || "🟢 どこも痛くない！元気！";

        const card = document.createElement('div');
        card.className = 'history-card';

        const aiAdviceHtml = generatePitchingAICoachAdvice(first).replace(/\n/g, '<br>');

        card.innerHTML = `
          <div class="history-card-head">
            <span>👤 ${first.playerName} (${first.height}cm・${first.throwArm === 'RIGHT' ? '右' : '左'})</span>
            <div style="display:flex; align-items:center; gap:6px;">
              <span style="color:#64748b; font-size:0.65rem;">📅 ${first.date}</span>
              <button class="btn-item-delete" data-group="${key}">🗑️</button>
            </div>
          </div>

          <div class="history-unified-grid">
            <div class="metric-section-block">
              <div class="metric-section-title">
                <span>⚾ 横向き解析</span>
                <span style="font-size:0.60rem; color:${sideRec ? '#10b981' : '#94a3b8'};">${sideRec ? '● 測定済' : '○ 未測定'}</span>
              </div>
              ${sideRec ? `
                <div class="metric-row-item"><span>🚶 ステップ幅:</span><b>${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio}%)</b></div>
                <div class="metric-row-item"><span>💪 腕のしなり:</span><b>${sideRec.metrics.mer}°</b></div>
                <div class="metric-row-item"><span>🔄 捻転差:</span><b>${sideRec.metrics.twist}°</b></div>
                <div class="metric-row-item"><span>⚾ リリース高:</span><b>${sideRec.metrics.releaseH}cm</b></div>
                <div class="metric-row-item"><span>🦵 FF時ヒザ:</span><b>屈曲 ${sideRec.metrics.ffKneeFlex}°</b></div>
                <div class="metric-row-item"><span>🦵 離球時ヒザ:</span><b>屈曲 ${sideRec.metrics.releaseKneeFlex}°</b></div>
                <div class="metric-row-item"><span>📐 体幹前傾:</span><b>${sideRec.metrics.trunkTilt}°</b></div>
              ` : `
                <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">横向き動画の測定データなし</div>
              `}
            </div>

            <div class="metric-section-block">
              <div class="metric-section-title">
                <span>🎯 正面・斜め前解析</span>
                <span style="font-size:0.60rem; color:${frontRec ? '#10b981' : '#94a3b8'};">${frontRec ? '● 測定済' : '○ 未測定'}</span>
              </div>
              ${frontRec ? `
                <div class="metric-row-item"><span>👟 つま先向き:</span><b>${frontRec.metrics.toeAngle}°</b></div>
                <div class="metric-row-item"><span>🦵 膝内外反:</span><b>${frontRec.metrics.valgus}°</b></div>
                <div class="metric-row-item"><span>📐 体幹側屈:</span><b>${frontRec.metrics.trunkLateral}°</b></div>
                <div class="metric-row-item"><span>💪 腕の高さ:</span><b>${frontRec.metrics.armSlot}°</b></div>
                <div class="metric-row-item"><span>🚶 踏出ズレ:</span><b>${frontRec.metrics.inStep}cm</b></div>
                <div class="metric-row-item"><span>⚾ リリース横:</span><b>${frontRec.metrics.releaseLateral}cm</b></div>
              ` : `
                <div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">正面動画の測定データなし</div>
              `}
            </div>
          </div>

          <div class="ai-coach-card">
            <div class="ai-coach-title">🤖 投球バイオメカニクス AIトレーナー診断</div>
            <div class="ai-coach-text">${aiAdviceHtml}</div>
          </div>

          <div class="player-reflection-box">
            <div class="reflection-sec-title">⚾ 今日のなげた感覚は？</div>
            <div class="chip-group" data-type="feel" data-group="${key}">
              <div class="choice-chip ${curFeel.includes('良かった') ? 'active' : ''}" data-val="😆 めっちゃ良かった！">😆 良かった</div>
              <div class="choice-chip ${curFeel.includes('ふつう') ? 'active' : ''}" data-val="😊 ふつう・いつも通り">😊 いつも通り</div>
              <div class="choice-chip ${curFeel.includes('いまいち') ? 'active' : ''}" data-val="😣 いまいち / タイミング合わず">😣 いまいち</div>
            </div>

            <div class="reflection-sec-title">💪 カラダの調子・違和感</div>
            <div class="chip-group" data-type="body" data-group="${key}">
              <div class="choice-chip ${curBody.includes('痛くない') ? 'active' : ''}" data-val="🟢 どこも痛くない！元気！">🟢 痛くない</div>
              <div class="choice-chip ${curBody.includes('重い') ? 'active' : ''}" data-val="🟡 ひじ・肩がちょっと重い">🟡 ちょっと重い</div>
              <div class="choice-chip ${curBody.includes('違和感') || (curBody.includes('痛みあり') && !curBody.includes('痛くない')) ? 'active' : ''}" data-val="🔴 ひじ・肩に違和感・痛みあり">🔴 違和感あり</div>
            </div>

            <div class="reflection-sec-title">📝 じぶんの気づき、監督、お父さん、お母さんへひとこと</div>
            <textarea class="player-textarea" data-group="${key}" placeholder="気づいたことや、次にやってみたいことを書いてね！">${first.playerNote || ''}</textarea>

            <button type="button" class="btn-send-cloud" data-group="${key}">
              <span>☁️ 📤 チーム・クラウドに送信する</span>
            </button>

            <button type="button" class="btn-share-line" data-group="${key}">
              <span>💬 📤 今日の総合レポートをLINEで送る</span>
            </button>
          </div>
        `;
        carteHistoryList.appendChild(card);
      });

      carteHistoryList.querySelectorAll('.choice-chip').forEach(chip => {
        chip.addEventListener('click', (e) => {
          const parent = e.currentTarget.parentElement;
          const type = parent.getAttribute('data-type');
          const groupKey = parent.getAttribute('data-group');
          const val = e.currentTarget.getAttribute('data-val');

          parent.querySelectorAll('.choice-chip').forEach(c => c.classList.remove('active'));
          e.currentTarget.classList.add('active');

          let allRecs = getSavedRecords();
          allRecs.forEach(item => {
            if (`${item.playerName}_${item.date}` === groupKey) {
              if (type === 'feel') item.feelGrade = val;
              if (type === 'body') item.bodyCondition = val;
            }
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
        });
      });

      carteHistoryList.querySelectorAll('.player-textarea').forEach(textarea => {
        textarea.addEventListener('input', (e) => {
          const groupKey = e.currentTarget.getAttribute('data-group');
          const textVal = e.currentTarget.value;
          let allRecs = getSavedRecords();
          allRecs.forEach(item => {
            if (`${item.playerName}_${item.date}` === groupKey) {
              item.playerNote = textVal;
            }
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecs));
        });
      });

      carteHistoryList.querySelectorAll('.btn-send-cloud').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const groupKey = e.currentTarget.getAttribute('data-group');
          await sendRecordToCloud(groupKey, e.currentTarget);
        });
      });

      carteHistoryList.querySelectorAll('.btn-share-line').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const groupKey = e.currentTarget.getAttribute('data-group');
          shareRecordToLine(groupKey);
        });
      });

      carteHistoryList.querySelectorAll('.btn-item-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const groupKey = e.currentTarget.getAttribute('data-group');
          deleteSingleDayGroup(groupKey);
        });
      });
    }

    playerSelectFilter.addEventListener('change', () => renderCarteList(false));

    btnDeleteAction.addEventListener('click', () => {
      const selectedFilter = playerSelectFilter.value;
      let allRecords = getSavedRecords();
      if (allRecords.length === 0) return;

      if (selectedFilter === 'ALL') {
        localStorage.removeItem(STORAGE_KEY);
        populatePastPlayers();
        renderCarteList(false);
        showToast("⚠️ すべてのカルテを初期化しました");
      } else {
        allRecords = allRecords.filter(r => r.playerName !== selectedFilter);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
        populatePastPlayers();
        renderCarteList(false);
        showToast(`🗑️ ${selectedFilter}選手のカルテを削除しました`);
      }
    });

    document.getElementById('btn-export-csv').addEventListener('click', () => {
      const allRecords = getSavedRecords();
      if (allRecords.length === 0) {
        showToast("保存されたデータがありません");
        return;
      }

      let csvContent = "\uFEFF日付,選手名,身長,利き腕,測定向き,歩幅(cm),歩幅率(%),肩外旋(deg),捻転差(deg),リリース高(cm),FF時ヒザ屈曲(deg),リリース時ヒザ屈曲(deg),体幹前傾(deg),つま先角度(deg),ヒザ内外反(deg),体幹側屈(deg),アームスロット(deg),ステップズレ(cm),リリース横幅(cm),なげた感覚,カラダの調子,選手コメント\n";

      allRecords.forEach(r => {
        const isSide = (r.mode === 'SIDE');
        const noteSafe = `"${(r.playerNote || '').replace(/"/g, '""')}"`;
        const row = [
          `"${r.date}"`,
          `"${r.playerName}"`,
          r.height,
          r.throwArm === 'RIGHT' ? "右" : "左",
          isSide ? "横向き" : "正面",
          isSide ? r.metrics.stride : "",
          isSide ? r.metrics.strideRatio : "",
          isSide ? r.metrics.mer : "",
          isSide ? r.metrics.twist : "",
          isSide ? r.metrics.releaseH : "",
          isSide ? r.metrics.ffKneeFlex : "",
          isSide ? r.metrics.releaseKneeFlex : "",
          isSide ? r.metrics.trunkTilt : "",
          !isSide ? r.metrics.toeAngle : "",
          !isSide ? r.metrics.valgus : "",
          !isSide ? r.metrics.trunkLateral : "",
          !isSide ? r.metrics.armSlot : "",
          !isSide ? r.metrics.inStep : "",
          !isSide ? r.metrics.releaseLateral : "",
          `"${r.feelGrade || '😆 良かった'}"`,
          `"${r.bodyCondition || '🟢 痛くない'}"`,
          noteSafe
        ];
        csvContent += row.join(",") + "\n";
      });

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `投球AIカルテ_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });

    function processSingleFrame() {
      if (!isPoseLoaded || isProcessing || !videoElement.videoWidth) {
        renderFrameOnly();
        return;
      }

      const vw = videoElement.videoWidth;
      const vh = videoElement.videoHeight;
      bufferCanvas.width = vw;
      bufferCanvas.height = vh;
      bufferCtx.drawImage(videoElement, 0, 0, vw, vh);

      isProcessing = true;
      pose.send({ image: bufferCanvas }).catch(err => {
        console.error("Inference Error:", err);
      }).finally(() => {
        isProcessing = false;
      });
    }

    function renderFrameOnly() {
      const cw = outputCanvas.width;
      const ch = outputCanvas.height;
      if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;

      outputCtx.clearRect(0, 0, cw, ch);
      outputCtx.save();
      outputCtx.translate(cw / 2 + zoomPan.x, ch / 2 + zoomPan.y);
      outputCtx.scale(zoomScale, zoomScale);
      outputCtx.translate(-cw / 2, -ch / 2);

      const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
      if (videoElement.readyState >= 2) {
        outputCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);
      }
      outputCtx.restore();
    }

    function getSegmentAngle3D(p1, p2) {
      if (!p1 || !p2) return NaN;
      return (Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180.0) / Math.PI;
    }

    function calcJointAngle3D(p1, p2, p3) {
      if (!p1 || !p2 || !p3) return NaN;
      const v1 = { x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0) };
      const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0) };

      const mag1 = Math.hypot(v1.x, v1.y, v1.z);
      const mag2 = Math.hypot(v2.x, v2.y, v2.z);
      if (mag1 < 1e-6 || mag2 < 1e-6) return NaN;

      const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
      const cosVal = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
      return (Math.acos(cosVal) * 180.0) / Math.PI;
    }

    function calcTrueMER(shoulderL, shoulderR, hipL, hipR, elbow, wrist) {
      if (!shoulderL || !shoulderR || !hipL || !hipR || !elbow || !wrist) return NaN;

      const midShoulder = {
        x: (shoulderL.x + shoulderR.x) / 2,
        y: (shoulderL.y + shoulderR.y) / 2,
        z: ((shoulderL.z || 0) + (shoulderR.z || 0)) / 2
      };
      const midHip = {
        x: (hipL.x + hipR.x) / 2,
        y: (hipL.y + hipR.y) / 2,
        z: ((hipL.z || 0) + (hipR.z || 0)) / 2
      };

      const trunkV = {
        x: midShoulder.x - midHip.x,
        y: midShoulder.y - midHip.y,
        z: midShoulder.z - midHip.z
      };

      const forearmV = {
        x: wrist.x - elbow.x,
        y: wrist.y - elbow.y,
        z: (wrist.z || 0) - (elbow.z || 0)
      };

      const trunkMag = Math.hypot(trunkV.x, trunkV.y, trunkV.z);
      const forearmMag = Math.hypot(forearmV.x, forearmV.y, forearmV.z);
      if (trunkMag < 1e-6 || forearmMag < 1e-6) return NaN;

      const dot = trunkV.x * forearmV.x + trunkV.y * forearmV.y + trunkV.z * forearmV.z;
      const cosVal = Math.max(-1.0, Math.min(1.0, dot / (trunkMag * forearmMag)));
      const baseAngle = (Math.acos(cosVal) * 180.0) / Math.PI;

      return 180.0 - baseAngle;
    }

    function onPoseResults(results) {
      if (scanModeActive) {
        if (results.poseLandmarks) {
          const landmarks = results.poseLandmarks;
          const NOSE = landmarks[0];
          const L_HEEL = landmarks[29] || landmarks[27];
          const R_HEEL = landmarks[30] || landmarks[28];
          
          if (NOSE && L_HEEL && R_HEEL) {
            tuneRuler.isActive = true;
            tuneRuler.topYNorm = Math.max(0.02, NOSE.y - 0.08);
            tuneRuler.bottomYNorm = Math.min(0.98, Math.max(L_HEEL.y, R_HEEL.y));
            tuneRuler.centerXNorm = NOSE.x;

            btnScanNextStep.style.display = 'block';
            scanGuideText.innerHTML = "🎯 <b>AIが検知したよ！</b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して頭と足元にピッタリ合わせてね！";
            renderScanFrame();
          }
        }
        return;
      }

      const cw = outputCanvas.width;
      const ch = outputCanvas.height;
      if (cw === 0 || ch === 0 || !videoElement.videoWidth) return;

      outputCtx.clearRect(0, 0, cw, ch);
      outputCtx.save();
      outputCtx.translate(cw / 2 + zoomPan.x, ch / 2 + zoomPan.y);
      outputCtx.scale(zoomScale, zoomScale);
      outputCtx.translate(-cw / 2, -ch / 2);

      const b = getAspectFitBounds(videoElement.videoWidth, videoElement.videoHeight, cw, ch);
      outputCtx.drawImage(videoElement, b.x, b.y, b.w, b.h);

      if (results.poseLandmarks) {
        const landmarks = results.poseLandmarks;

        const L_SHOULDER = landmarks[11];
        const R_SHOULDER = landmarks[12];
        const L_ELBOW = landmarks[13];
        const R_ELBOW = landmarks[14];
        const L_WRIST = landmarks[15];
        const R_WRIST = landmarks[16];
        const L_INDEX = landmarks[19];
        const R_INDEX = landmarks[20];
        const L_HIP = landmarks[23];
        const R_HIP = landmarks[24];
        const L_KNEE = landmarks[25];
        const R_KNEE = landmarks[26];
        const L_ANKLE = landmarks[27];
        const R_ANKLE = landmarks[28];
        const L_HEEL = landmarks[29];
        const R_HEEL = landmarks[30];
        const L_FOOT_INDEX = landmarks[31];
        const R_FOOT_INDEX = landmarks[32];

        const normalizedStatureHeight = (tuneRuler.bottomYNorm - tuneRuler.topYNorm) > 0.1 ? (tuneRuler.bottomYNorm - tuneRuler.topYNorm) : 0.75;
        const activePxPerCm = (normalizedStatureHeight * b.h) / userHeightCm;

        const isRightHanded = (selectedThrowArm === 'RIGHT');
        const isSouthpaw = !isRightHanded;

        const throwShoulder = isRightHanded ? R_SHOULDER : L_SHOULDER;
        const throwElbow = isRightHanded ? R_ELBOW : L_ELBOW;
        const throwWrist = isRightHanded ? R_WRIST : L_WRIST;
        let throwIndex = isRightHanded ? R_INDEX : L_INDEX;

        if (throwWrist && throwIndex) {
          const handDist = Math.hypot(throwIndex.x - throwWrist.x, throwIndex.y - throwWrist.y);
          if (handDist > 0.18 || throwIndex.visibility < 0.25) {
            throwIndex = throwWrist;
          }
        }

        const leadHip = isRightHanded ? L_HIP : R_HIP;
        const leadKnee = isRightHanded ? L_KNEE : R_KNEE;
        const leadAnkle = isRightHanded ? L_ANKLE : R_ANKLE;
        const leadHeel = isRightHanded ? (L_HEEL || L_ANKLE) : (R_HEEL || R_ANKLE);
        const leadToe = isRightHanded ? (L_FOOT_INDEX || L_ANKLE) : (R_FOOT_INDEX || R_ANKLE);

        const pivotHeel = isRightHanded ? (R_HEEL || R_ANKLE) : (L_HEEL || L_ANKLE);

        if (leadToe) {
          lastCalculatedLeadToePt = {
            x: b.x + leadToe.x * b.w,
            y: b.y + leadToe.y * b.h
          };
        }

        if (isSkeletonVisible) {
          drawPrecisionSkeleton(landmarks, b.x, b.y, b.w, b.h, isSouthpaw, isRightHanded);
        }

        let currentStrideCm = 0;
        let isStepping = false;
        let isKinematicFF = false;
        
        if (leadHeel && leadToe && pivotHeel) {
          const currentStridePx = Math.hypot((leadHeel.x - pivotHeel.x) * b.w, (leadHeel.y - pivotHeel.y) * b.h);
          currentStrideCm = currentStridePx / activePxPerCm;
          isStepping = currentStrideCm > (userHeightCm * 0.35);

          if (isStepping) {
            const currentLeadToeY = leadToe.y;
            if (prevLeadToeY !== null) {
              const toeVel = (currentLeadToeY - prevLeadToeY);
              if (Math.abs(toeVel) < 0.003 && currentLeadToeY >= (pivotHeel.y - 0.05)) {
                leadFootFlatStationaryCount++;
                if (leadFootFlatStationaryCount === 2) {
                  isKinematicFF = true;
                }
              } else {
                leadFootFlatStationaryCount = 0;
              }
            }
            prevLeadToeY = currentLeadToeY;
          }
        }

        if (selectedAngleMode === 'SIDE') {
          if (Number.isFinite(currentStrideCm)) {
            const strideCm = Math.round(currentStrideCm);
            if (strideCm >= 15 && strideCm <= Math.round(userHeightCm * 1.15)) {
              const strideRatio = Math.round((strideCm / userHeightCm) * 100);
              c1Val.textContent = `${strideCm} cm`;
              if (strideCm > records.maxStride) {
                records.maxStride = strideCm;
                c1Max.textContent = `最大: ${strideCm} cm (${strideRatio}%身)`;
              }
            }
          }

          if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP && throwElbow && throwWrist) {
            const trueMerDeg = calcTrueMER(L_SHOULDER, R_SHOULDER, L_HIP, R_HIP, throwElbow, throwWrist);
            if (Number.isFinite(trueMerDeg) && trueMerDeg >= 30 && trueMerDeg <= 200) {
              const roundedMER = Math.round(trueMerDeg);
              c2Val.textContent = `${roundedMER} °`;
              if (roundedMER > records.maxMER && roundedMER <= 190) {
                records.maxMER = roundedMER;
                c2Max.textContent = `最大: ${roundedMER} °`;
              }
            }
          }

          if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
            const shoulderAngle = getSegmentAngle3D(L_SHOULDER, R_SHOULDER);
            const hipAngle = getSegmentAngle3D(L_HIP, R_HIP);
            if (Number.isFinite(shoulderAngle) && Number.isFinite(hipAngle)) {
              let diff = Math.abs(shoulderAngle - hipAngle);
              if (diff > 180) diff = 360 - diff;
              const roundedTwist = Math.round(diff);
              if (roundedTwist <= 65) {
                c3Val.textContent = `${roundedTwist} °`;
                if (roundedTwist > records.maxTwist && roundedTwist >= 5) {
                  records.maxTwist = roundedTwist;
                  c3Max.textContent = `最大: ${roundedTwist} °`;
                }
              }
            }
          }

          let isHandForward = false;
          if (throwWrist && throwShoulder && leadHeel && pivotHeel) {
            const isThrowingToRight = leadHeel.x > pivotHeel.x;
            isHandForward = isThrowingToRight ? (throwWrist.x >= throwShoulder.x - 0.05) : (throwWrist.x <= throwShoulder.x + 0.05);
          }
          const isThrowingPhase = (currentStrideCm > (userHeightCm * 0.50)) && throwWrist && throwShoulder && (throwWrist.y < throwShoulder.y) && isHandForward;

          if (leadHip && leadKnee && leadAnkle) {
            const rawKneeAngle = calcJointAngle3D(leadHip, leadKnee, leadAnkle);
            if (Number.isFinite(rawKneeAngle) && rawKneeAngle >= 40 && rawKneeAngle <= 180) {
              const flexAngle = Math.max(0, Math.round(180 - rawKneeAngle));
              currentCalculatedState.kneeFlexAngle = flexAngle;
              c5Val.textContent = `屈曲 ${flexAngle} °`;

              if (isKinematicFF && records.ffKneeFlex === null) {
                records.ffKneeFlex = flexAngle;
              }

              if (isThrowingPhase && leadHeel && pivotHeel) {
                const lowestGroundY = Math.max(leadHeel.y, pivotHeel.y) * b.h;
                const releaseTarget = (throwIndex && throwIndex.y !== undefined) ? throwIndex : throwWrist;
                if (releaseTarget) {
                  const releasePointY = releaseTarget.y * b.h;
                  const releaseHeightPx = Math.max(0, lowestGroundY - releasePointY);
                  const releaseHeightCm = Math.round(releaseHeightPx / activePxPerCm);

                  if (Number.isFinite(releaseHeightCm) && releaseHeightCm >= 40 && releaseHeightCm <= Math.round(userHeightCm * 1.45)) {
                    c4Val.textContent = `${releaseHeightCm} cm`;
                    if (releaseHeightCm > records.maxRelease) {
                      records.maxRelease = releaseHeightCm;
                      records.releaseKneeFlex = flexAngle;
                      c4Max.textContent = `最高: ${releaseHeightCm} cm`;
                    }
                  }
                }
              }

              const ffText = records.ffKneeFlex !== null ? `屈曲 ${records.ffKneeFlex}°` : '屈曲 --°';
              const brText = records.releaseKneeFlex !== null ? `屈曲 ${records.releaseKneeFlex}°` : '屈曲 --°';
              c5Max.textContent = `FF時: ${ffText} (リリース時: ${brText})`;
            }
          }

          if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
            const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
            const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
            const trunkDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
            if (Number.isFinite(trunkDeg) && trunkDeg <= 60) {
              c6Val.textContent = `${trunkDeg} °`;
              if (trunkDeg > records.maxTrunkTilt) {
                records.maxTrunkTilt = trunkDeg;
                c6Max.textContent = `最大前傾: ${trunkDeg} °`;
              }
            }
          }

        } else {
          if (leadHeel && leadToe && leadAnkle) {
            if (!isStepping) {
              smoothToeDeg = 0;
              c1Val.textContent = `0 °`;
              if (!records.fcToeLabel) c1Max.textContent = `構え位置`;
            } else {
              const deltaX = (leadToe.x - leadHeel.x) * b.w;
              const deltaY = Math.max(10, (leadToe.y - leadHeel.y) * b.h);
              let angleDeg = (Math.atan2(deltaX, deltaY) * 180.0 / Math.PI) + manualToeOffsetDeg;
              let signedToeDev = isRightHanded ? angleDeg : -angleDeg;
              smoothToeDeg = smoothToeDeg === 0 ? signedToeDev : (smoothToeDeg * 0.7 + signedToeDev * 0.3);
              const displayAngle = Math.round(Math.abs(smoothToeDeg));
              let stateLabel = "◎ ストレート (0〜10°)";

              if (smoothToeDeg > 20) stateLabel = "⚠️ 開き注意 (アウト)";
              else if (smoothToeDeg > 10) stateLabel = "○ やや開き";
              else if (smoothToeDeg < -15) stateLabel = "⚠️ 被り・閉じすぎ (イン)";
              else if (smoothToeDeg < -5) stateLabel = "○ やや閉じ (クローズ)";

              currentCalculatedState.displayToeAngle = displayAngle;
              currentCalculatedState.toeStateLabel = stateLabel;
              c1Val.textContent = `${displayAngle} °`;

              if (isKinematicFF && records.fcToeAngle === null) {
                records.fcToeAngle = displayAngle;
                records.fcToeLabel = `べた足時: ${displayAngle}° (${stateLabel})`;
              }
              c1Max.textContent = records.fcToeLabel || stateLabel;
            }
          }

          if (leadHip && leadKnee && leadAnkle) {
            const thighAngle = Math.atan2(leadKnee.y - leadHip.y, leadKnee.x - leadHip.x);
            const shankAngle = Math.atan2(leadAnkle.y - leadKnee.y, leadAnkle.x - leadKnee.x);
            let valgusDiff = (shankAngle - thighAngle) * 180.0 / Math.PI;
            if (valgusDiff > 180) valgusDiff -= 360;
            if (valgusDiff < -180) valgusDiff += 360;

            let devAngle = isRightHanded ? -valgusDiff : valgusDiff;
            let absDev = Math.min(30, Math.round(Math.abs(devAngle)));
            let valgusStatus = "まっすぐ (◎ 正常)";
            if (absDev > 12) valgusStatus = (devAngle > 0) ? "⚠️ ニーイン (外反)" : "⚠️ 割れ (内反)";
            else if (absDev > 6) valgusStatus = (devAngle > 0) ? "○ やや内入り" : "○ やや外開き";

            currentCalculatedState.kneeDevAngle = absDev;
            currentCalculatedState.kneeStateLabel = valgusStatus;
            c2Val.textContent = `${absDev} °`;

            if (isKinematicFF && records.ffValgusAngle === null) {
              records.ffValgusAngle = absDev;
              records.ffValgusLabel = `べた足時: ${absDev}° (${valgusStatus})`;
            }
            c2Max.textContent = records.ffValgusLabel || valgusStatus;
            if (absDev > records.maxValgus && isStepping) records.maxValgus = absDev;
          }

          if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
            const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
            const midHip = { x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
            const lateralDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));
            if (Number.isFinite(lateralDeg) && lateralDeg <= 45) {
              c3Val.textContent = `${lateralDeg} °`;
              if (lateralDeg > records.maxTrunkLateral) {
                records.maxTrunkLateral = lateralDeg;
                c3Max.textContent = `最大傾き: ${lateralDeg} °`;
              }
            }
          }

          if (throwWrist && throwShoulder && L_SHOULDER && R_SHOULDER) {
            const otherShoulder = isRightHanded ? L_SHOULDER : R_SHOULDER;
            const armSlotAngle = calcJointAngle3D(throwWrist, throwShoulder, otherShoulder);
            if (Number.isFinite(armSlotAngle) && armSlotAngle >= 30 && armSlotAngle <= 180) {
              const roundedSlot = Math.round(armSlotAngle);
              c4Val.textContent = `${roundedSlot} °`;
              if (roundedSlot > records.maxArmSlot) {
                records.maxArmSlot = roundedSlot;
                c4Max.textContent = `最大挙上: ${roundedSlot} °`;
              }
            }
          }

          if (leadHeel && pivotHeel) {
            if (!isStepping) {
              c5Val.textContent = `0 cm`;
              c5Max.textContent = `構え位置`;
            } else {
              const lateralOffsetPx = Math.abs((leadHeel.x - pivotHeel.x) * b.w);
              const lateralOffsetCm = Math.round(lateralOffsetPx / activePxPerCm);
              if (Number.isFinite(lateralOffsetCm) && lateralOffsetCm <= 40) {
                const isCross = isRightHanded ? (leadHeel.x < pivotHeel.x) : (leadHeel.x > pivotHeel.x);
                const dirText = isCross ? "インステップ" : "アウトステップ";
                c5Val.textContent = `${lateralOffsetCm} cm`;
                if (lateralOffsetCm > records.maxInStepCm) {
                  records.maxInStepCm = lateralOffsetCm;
                  c5Max.textContent = `${dirText}: ${lateralOffsetCm} cm`;
                }
              }
            }
          }

          const isFrontThrowingPhase = isStepping && throwWrist && throwShoulder && (throwWrist.y < throwShoulder.y);
          if (isFrontThrowingPhase && L_SHOULDER && R_SHOULDER) {
            const midShoulder = { x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
            const releaseTarget = (throwIndex && throwIndex.x !== undefined) ? throwIndex : throwWrist;
            if (releaseTarget) {
              const lateralReleasePx = Math.abs((releaseTarget.x - midShoulder.x) * b.w);
              const lateralReleaseCm = Math.round(lateralReleasePx / activePxPerCm);
              if (Number.isFinite(lateralReleaseCm) && lateralReleaseCm <= 80) {
                c6Val.textContent = `${lateralReleaseCm} cm`;
                if (lateralReleaseCm > records.maxReleaseLateral) {
                  records.maxReleaseLateral = lateralReleaseCm;
                  c6Max.textContent = `最大横幅: ${lateralReleaseCm} cm`;
                }
              }
            }
          }
        }
      }

      outputCtx.restore();
    }

    function drawPrecisionSkeleton(landmarks, ox, oy, bw, bh, isSouthpaw, isRightHanded) {
      const connections = [
        [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
        [12, 14], [14, 16], [16, 18], [16, 20], [16, 22],
        [11, 23], [12, 24], [23, 24],
        [23, 25], [25, 27], [27, 29], [29, 31], [27, 31],
        [24, 26], [26, 28], [28, 30], [30, 32], [28, 32]
      ];

      outputCtx.strokeStyle = "#10b981";
      outputCtx.lineWidth = 3.5;
      connections.forEach(([i, j]) => {
        const p1 = landmarks[i];
        const p2 = landmarks[j];
        if (p1 && p2) {
          outputCtx.beginPath();
          outputCtx.moveTo(ox + p1.x * bw, oy + p1.y * bh);
          outputCtx.lineTo(ox + p2.x * bw, oy + p2.y * bh);
          outputCtx.stroke();
        }
      });

      const keyJoints = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32];
      const throwWristIdx = isRightHanded ? 16 : 15;
      const throwElbowIdx = isRightHanded ? 14 : 13;
      const throwIndexIdx = isRightHanded ? 20 : 19;
      const leadKneeIdx = isRightHanded ? 25 : 26;
      const leadToeIdx = isRightHanded ? 31 : 32;

      keyJoints.forEach(idx => {
        const p = landmarks[idx];
        if (p) {
          let drawX = ox + p.x * bw;
          let drawY = oy + p.y * bh;

          if (idx === throwIndexIdx && landmarks[throwWristIdx]) {
            const wristP = landmarks[throwWristIdx];
            const dist = Math.hypot(p.x - wristP.x, p.y - wristP.y);
            if (dist > 0.18) {
              drawX = ox + wristP.x * bw;
              drawY = oy + wristP.y * bh;
            }
          }

          outputCtx.beginPath();
          let radius = 4.5;
          if (idx === throwIndexIdx) radius = 7;
          else if (idx === throwWristIdx) radius = 6;
          else if (idx === throwElbowIdx) radius = 5.5;
          else if (idx === leadKneeIdx) radius = 6;
          else if (idx === leadToeIdx) radius = 7;

          outputCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
          
          if (idx === throwIndexIdx) outputCtx.fillStyle = "#ff007f";
          else if (idx === throwWristIdx) outputCtx.fillStyle = "#ff5252";
          else if (idx === throwElbowIdx) outputCtx.fillStyle = "#ff9f43";
          else if (idx === leadKneeIdx) outputCtx.fillStyle = "#ffe600";
          else if (idx === leadToeIdx) outputCtx.fillStyle = "#00d2ff";
          else if ([17, 18, 21, 22].includes(idx)) outputCtx.fillStyle = "#a855f7";
          else outputCtx.fillStyle = "#38bdf8";

          outputCtx.fill();
          outputCtx.strokeStyle = "#ffffff";
          outputCtx.lineWidth = 1.5;
          outputCtx.stroke();
        }
      });
    }

    function updatePlayState() {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      if (videoElement.paused) {
        btnPlayPause.textContent = "再生 ▶";
        btnPlayPause.style.background = "linear-gradient(135deg, #ff9f43, #ff5252)";
      } else {
        btnPlayPause.textContent = "停止 ⏸";
        btnPlayPause.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";
        renderLoop();
      }
    }

    function renderLoop() {
      if (!videoElement.paused && !videoElement.ended) {
        processSingleFrame();
        updateTimeUI();
        animationFrameId = requestAnimationFrame(renderLoop);
      }
    }

    function updateTimeUI() {
      if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
      seekBar.value = (videoElement.currentTime / videoElement.duration) * 100;
      timeDisp.textContent = `${videoElement.currentTime.toFixed(2)} / ${videoElement.duration.toFixed(2)}`;
    }

    videoElement.addEventListener('play', updatePlayState);
    videoElement.addEventListener('pause', updatePlayState);
    videoElement.addEventListener('ended', updatePlayState);
    videoElement.addEventListener('seeked', () => {
      if (stepViews[4].classList.contains('active')) {
        processSingleFrame();
      }
    });

    btnPlayPause.addEventListener('click', (e) => {
      e.stopPropagation();
      if (videoElement.paused) {
        videoElement.play().catch(err => {
          if (err.name !== 'AbortError') console.warn("Video Play Interrupted:", err);
        });
      } else {
        videoElement.pause();
      }
    });

    // スライダーシーク時は骨格の残像を消して映像を素早く同期
    seekBar.addEventListener('input', () => {
      if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
      videoElement.pause();
      videoElement.currentTime = (seekBar.value / 100) * videoElement.duration;
      updateTimeUI();
      renderFrameOnly();
    });

    document.getElementById('btn-frame-prev').addEventListener('click', (e) => {
      e.stopPropagation();
      videoElement.pause();
      videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
      updateTimeUI();
    });

    document.getElementById('btn-frame-next').addEventListener('click', (e) => {
      e.stopPropagation();
      videoElement.pause();
      videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
      updateTimeUI();
    });

    document.getElementById('btn-reset-max').addEventListener('click', () => {
      records = {
        maxStride: 0, maxMER: 0, maxTwist: 0, maxRelease: 0, ffKneeFlex: null, releaseKneeFlex: null, maxTrunkTilt: 0,
        toeAngle: 0, fcToeAngle: null, fcToeLabel: null, maxValgus: 0, ffValgusAngle: null, ffValgusLabel: null, maxTrunkLateral: 0, maxArmSlot: 0, maxInStepCm: 0, maxReleaseLateral: 0
      };
      smoothToeDeg = 0;
      manualToeOffsetDeg = 0;
      prevLeadToeY = null;
      leadFootFlatStationaryCount = 0;

      if (selectedAngleMode === 'SIDE') {
        c1Max.textContent = "最大: -- cm (0%身)";
        c2Max.textContent = "最大: -- °";
        c3Max.textContent = "最大: -- °";
        c4Max.textContent = "最高: -- cm";
        c5Max.textContent = "FF時: 屈曲 --° (リリース時: 屈曲 --°)";
        c6Max.textContent = "最大倒れ: -- °";
      } else {
        c1Max.textContent = "状態: --";
        c2Max.textContent = "状態: --";
        c3Max.textContent = "最大傾き: -- °";
        c4Max.textContent = "最大挙上: -- °";
        c5Max.textContent = "最大ズレ: -- cm";
        c6Max.textContent = "最大横幅: -- cm";
      }
      showToast("🏆 最大値をリセットしました");
    });

    document.getElementById('btn-re-select').addEventListener('click', () => {
      videoElement.pause();
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      tuneRuler.isActive = false;
      btnScanNextStep.style.display = 'none';
      zoomScale = 1.0;
      zoomPan = { x: 0, y: 0 };
      smoothToeDeg = 0;
      manualToeOffsetDeg = 0;
      prevLeadToeY = null;
      leadFootFlatStationaryCount = 0;
      updateZoomBadge();
      setStep(1);
    });

    document.addEventListener('DOMContentLoaded', () => {
      populatePastPlayers();
    });
