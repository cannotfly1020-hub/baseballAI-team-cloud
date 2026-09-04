// Supabase 設定
const SUPABASE_URL = "https://mzdzznqeaovejzjicift.supabase.co";
const SUPABASE_KEY = "sb_publishable_nB5WDsbADtvwaIlHjUCr-g_F9hMMbhO"
const currentTeamId = localStorage.getItem('baseball_team_id') || '安岡少年軟式野球部';

function normalizeTeamName(str) {
  if (!str) return "";
  return String(str).replace(/[\s\u3000]/g, "").toLowerCase();
}

// Safari特有のリンクジャンプ保護
document.getElementById('home-link-btn').addEventListener('click', function(e) {
  e.preventDefault();
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
let poseInitPromise = null; // ★ AI初期化のPromiseを保持
let isPoseLoaded = false;
let isProcessing = false;
let animationFrameId = null;
let scanModeActive = false;

let playerName = "バッター1";
let userHeightCm = 140;
let selectedBatBox = 'RIGHT';
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

let zoomScale = 1.0;
let zoomPan = {x: 0, y: 0};
let initialPinchDistance = 0;
let initialZoomScale = 1.0;
let isPanning = false;
let panStart = {x: 0, y: 0};
let panSnapshot = {x: 0, y: 0};

let initialNoseX = null;
let initialNoseY = null;

let currentCalculatedState = {
  twistSignedDeg: 0,
  twistStatusLabel: "同調 (0°)",
  kneeFlexAngle: 0,
  strideCm: 0,
  trunkTiltDeg: 0,
  headShiftCm: 0,
  headShiftYCm: 0,
  topHandHeightCm: 0,
  impactHandHeightCm: 0,
  inStepCm: 0,
  inStepDir: "まっすぐ",
  shoulderOpenDeg: 0,
  shoulderOpenLabel: "◎ タメ十分 (壁キープ)",
  kneeValgusAngle: 0,
  kneeValgusLabel: "まっすぐ (◎正常)",
  leadElbowAngle: 0,
  backElbowAngle: 0
};

let records = {
  maxTwistSigned: 0,
  twistStatusLabel: null,
  impactKneeFlex: null,
  maxStride: 0,
  maxTrunkTilt: 0,
  maxHeadShift: 0,
  maxHeadShiftY: 0,
  maxTopHandH: 0,
  impactHandH: null,
  impactShoulderOpen: null,
  impactShoulderOpenLabel: null,
  maxInStepCm: 0,
  inStepDir: "まっすぐ",
  impactKneeValgus: null,
  impactKneeValgusLabel: null,
  takebackLeadElbow: null,
  impactBackElbow: null
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
const c7Title = document.getElementById('c7-title');
const c7Val = document.getElementById('c7-val');
const c7Max = document.getElementById('c7-max');
const c8Title = document.getElementById('c8-title');
const c8Val = document.getElementById('c8-val');
const c8Max = document.getElementById('c8-max');
const c9Title = document.getElementById('c9-title');
const c9Val = document.getElementById('c9-val');
const c9Max = document.getElementById('c9-max');
const c10Title = document.getElementById('c10-title');
const c10Val = document.getElementById('c10-val');
const c10Max = document.getElementById('c10-max');

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

const btnBatRight = document.getElementById('btn-box-right');
const btnBatLeft = document.getElementById('btn-box-left');
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
let cachedCloudBattingRecords = [];

const toastBox = document.getElementById('toast-box');
let toastTimeout = null;

function showToast(text, duration = 2500) {
  if (toastTimeout) clearTimeout(toastTimeout);
  toastBox.textContent = text;
  toastBox.classList.add('show');
  toastTimeout = setTimeout(() => {
    toastBox.classList.remove('show');
  }, duration);
}

function updateCardLabels() {
  const isLeft = (selectedBatBox === 'LEFT');
  if (selectedAngleMode === 'SIDE') {
    angleModeBadge.textContent = "横向き解析";
    angleModeBadge.style.background = "linear-gradient(135deg, #10b981, #059669)";
    c1Title.textContent = "捻転差(下半身先行度)";
    c2Title.textContent = isLeft ? "前足ヒザ壁 (右屈曲)" : "前足ヒザ壁 (左屈曲)";
    c3Title.textContent = "ステップ幅 (歩幅)";
    c4Title.textContent = "体幹軸傾斜(スイング軸)";
    c5Title.textContent = "頭の前後移動 (突っ込み)";
    c6Title.textContent = "頭の上下動 (沈み込み)";
    c7Title.textContent = "グリップトップ高";
    c8Title.textContent = "インパクトグリップ高";
    c9Title.textContent = isLeft ? "テイクバック前ヒジ (右肘)" : "テイクバック前ヒジ(左肘)";
    c10Title.textContent = isLeft ? "※インパクト後ヒジ (左肘)" : "インパクト後ヒジ (右肘)";

    c1Val.textContent = "-- °";
    c1Max.textContent = "最大タメ: -- °";
    c3Val.textContent = "-- cm";
    c3Max.textContent = "最大: -- cm (0%身)";
  } else {
    angleModeBadge.textContent = "正面(投手側)解析";
    angleModeBadge.style.background = "linear-gradient(135deg, #0284c7, #0369a1)";
    c1Title.textContent = "頭の横ズレ幅 (目線ブレ)";
    c2Title.textContent = "頭の上下動 (沈み込み/浮き)";
    c3Title.textContent = isLeft ? "前肩の開き(右肩のタメ)" : "前肩の開き(左肩のタメ)";
    c4Title.textContent = "ステップのズレ (イン/アウト)";
    c5Title.textContent = "上半身の傾き (軸の左右倒れ)";
    c6Title.textContent = isLeft ? "前ヒザの踏ん張り(右足)" : "前ヒザの踏ん張り (左足)";
    c7Title.textContent = "グリップトップ高";
    c8Title.textContent = "インパクトグリップ高";
    c9Title.textContent = isLeft ? "テイクバック前ヒジ (右肘)" : "テイクバック前ヒジ(左肘)";
    c10Title.textContent = isLeft ? "インパクト後ヒジ (左肘)" : "インパクト後ヒジ (右肘)";

    c1Val.textContent = "-- cm";
    c1Max.textContent = "最大横ズレ: -- cm";
    c3Val.textContent = "-- °";
    c3Max.textContent = "状態: --";
  }
}

btnBatRight.addEventListener('click', () => {
  selectedBatBox = 'RIGHT';
  btnBatRight.classList.add('active');
  btnBatLeft.classList.remove('active');
  updateCardLabels();
});

btnBatLeft.addEventListener('click', () => {
  selectedBatBox = 'LEFT';
  btnBatLeft.classList.add('active');
  btnBatRight.classList.remove('active');
  updateCardLabels();
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
        batBox: 'RIGHT'
      });
    }
  });

  savedBat.forEach(r => {
    if (r.playerName) {
      playerMap.set(r.playerName, {
        name: r.playerName,
        height: r.height || 140,
        batBox: r.batBox || r.batSide || 'RIGHT'
      });
    }
  });

  playerMap.forEach((info, name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = `${name} (${info.height}cm / ${info.batBox === 'RIGHT' ? '右打' : '左打'})`;
    opt.dataset.height = info.height;
    opt.dataset.batBox = info.batBox;
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
  const box = opt.dataset.batBox;

  playerNameInput.value = selectedName;
  if (h) heightInput.value = h;

  if (box === 'RIGHT') {
    selectedBatBox = 'RIGHT';
    btnBatRight.classList.add('active');
    btnBatLeft.classList.remove('active');
  } else {
    selectedBatBox = 'LEFT';
    btnBatLeft.classList.add('active');
    btnBatRight.classList.remove('active');
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

// ★ ルール3: MediaPipe（AI）のスマホ最適化と起動の堅牢化
function initMediaPipe() {
  if (pose) return poseInitPromise; // 既に初期化中/完了ならPromiseを返す

  scanLoading.style.display = 'flex';
  aiLoading.style.display = 'flex';

  pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
  });

  pose.setOptions({
    modelComplexity: 1, // ★ ルール3: 2から1に変更（スマホのメモリ不足・フリーズ対策）
    smoothLandmarks: true,
    enableSegmentation: false,
    smoothSegmentation: false,
    minDetectionConfidence: 0.15,
    minTrackingConfidence: 0.15,
  });

  pose.onResults(onPoseResults);

  poseInitPromise = pose.initialize().then(() => {
    isPoseLoaded = true;
    scanLoading.style.display = 'none';
    aiLoading.style.display = 'none';
  }).catch(err => {
    console.error("MediaPipe Load Error:", err);
    scanLoading.style.display = 'none';
    aiLoading.style.display = 'none';
  });

  return poseInitPromise;
}

function getAspectFitBounds(srcW, srcH, dstW, dstH) {
  if (!srcW || !srcH || !dstW || !dstH) return {x: 0, y: 0, w: dstW || 300, h: dstH || 200 };
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

// ★ ルール2: スマホ特有の動画読み込みバグ対策
function handleVideoLoad(file, angleMode) {
  if (!file) return;
  selectedAngleMode = angleMode;
  if (videoFileUrl) {
    URL.revokeObjectURL(videoFileUrl);
    videoFileUrl = null;
  }
  videoFileUrl = URL.createObjectURL(file);
  updateCardLabels();
  setStep(2);
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.src = videoFileUrl;
  videoElement.load();

  // ★ ルール2: iOS等で動画のサイズと長さを強制認識させるための「起爆剤」
  const playPromise = videoElement.play();
  if (playPromise !== undefined) {
    playPromise.then(() => {
      videoElement.pause();
    }).catch(error => {
      console.warn("Auto-play prevented, silently handled.", error);
    });
  }

  const onVideoReady = () => {
    updateScanScreenSize();
    renderScanFrame();
  };

  videoElement.onloadedmetadata = () => {
    try { videoElement.currentTime = 0.001; } catch (e) {}
    onVideoReady();
  };
  videoElement.onloadeddata = onVideoReady;

  setTimeout(onVideoReady, 120);
  setTimeout(onVideoReady, 300);
  setTimeout(onVideoReady, 1000); // タイミングがずれるスマホ向けに念のため追加

  initMediaPipe().catch(err => console.warn("MediaPipe init error:", err));
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

// ★ ルール4: 描画領域（Canvas）エラーの回避
function renderScanFrame() {
  if (!scanCanvas || !videoElement) return; // 早期リターンでエラー回避
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

  scanCtx.strokeStyle = "rgba(16, 185, 129, 0.4)";
  scanCtx.lineWidth = 4;
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
  scanCtx.fillText("あたま ", centerX, topY - 14);

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
  scanCtx.fillText(" じめん↑", centerX, bottomY + 18);
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
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

document.getElementById('btn-scan-prev').addEventListener('click', () => {
  videoElement.currentTime = Math.max(0, videoElement.currentTime - 0.033);
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

document.getElementById('btn-scan-next').addEventListener('click', () => {
  videoElement.currentTime = Math.min(videoElement.duration || 0, videoElement.currentTime + 0.033);
  tuneRuler.isActive = false;
  btnScanNextStep.style.display = 'none';
  renderScanFrame();
});

// ★ ルール3: スキャンボタン押下時にAIの起動完了を待機する処理
document.getElementById('btn-scan-action').addEventListener('click', async () => {
  // 初期化が終わっていない場合は完了を待つ
  if (!isPoseLoaded && poseInitPromise) {
    scanLoading.style.display = 'flex';
    scanLoading.querySelector('div:last-child').textContent = "AIの準備中...";
    await poseInitPromise;
  }

  // 待機後もまだ読み込まれていないか、動画が不正ならリターン
  if (!isPoseLoaded || !videoElement?.videoWidth) {
    showToast("動画の読み込み、またはAIの準備が完了していません。");
    return;
  }

  scanLoading.style.display = 'flex';
  scanLoading.querySelector('div:last-child').textContent = "AIがからだを探しているよ...";
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
  const pName = document.getElementById('player-name-input').value.trim();
  playerName = pName || "バッター1";

  const hVal = parseFloat(document.getElementById('height-input').value);
  userHeightCm = (Number.isFinite(hVal) && hVal >= 80 && hVal <= 220) ? hVal : 140;

  playerTagBadge.textContent = `${playerName} (${userHeightCm}cm)`;

  initialNoseX = null;
  initialNoseY = null;

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
  zoomBadge.textContent = `${zoomScale.toFixed(1)}x (ピンチ可)`;
}

outputCanvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
  const newScale = Math.max(1.0, Math.min(5.0, zoomScale * zoomFactor));
  if (newScale === 1.0) zoomPan = {x: 0, y: 0};
  zoomScale = newScale;
  updateZoomBadge();
  processSingleFrame();
}, { passive: false });

outputCanvas.addEventListener('touchstart', (e) => {
  if (e.touches.length === 2) {
    initialPinchDistance = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY
    );
    initialZoomScale = zoomScale;
  } else if (e.touches.length === 1 && zoomScale > 1.0) {
    isPanning = true;
    panStart = {x: e.touches[0].clientX, y: e.touches[0].clientY };
    panSnapshot = { ...zoomPan };
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
      if (zoomScale === 1.0) zoomPan = {x: 0, y: 0};
      updateZoomBadge();
      processSingleFrame();
    }
  } else if (e.touches.length === 1 && isPanning && zoomScale > 1.0) {
    const dx = e.touches[0].clientX - panStart.x;
    const dy = e.touches[0].clientY - panStart.y;
    zoomPan.x = panSnapshot.x + dx;
    zoomPan.y = panSnapshot.y + dy;
    processSingleFrame();
  }
}, { passive: true });

outputCanvas.addEventListener('touchend', (e) => {
  if (e.touches.length < 2) initialPinchDistance = 0;
  if (e.touches.length === 0) isPanning = false;
});

document.getElementById('btn-zoom-reset').addEventListener('click', () => {
  zoomScale = 1.0;
  zoomPan = {x: 0, y: 0 };
  updateZoomBadge();
  processSingleFrame();
});

document.getElementById('btn-manual-top').addEventListener('click', () => {
  records.takebackLeadElbow = currentCalculatedState.leadElbowAngle;
  c9Max.textContent = `トップ時: ${records.takebackLeadElbow}°`;
  showToast(`トップ時の前ヒジ角度 【${records.takebackLeadElbow}°】を記録しました!`);
});

document.getElementById('btn-manual-impact').addEventListener('click', () => {
  records.impactKneeFlex = currentCalculatedState.kneeFlexAngle;
  records.impactShoulderOpen = currentCalculatedState.shoulderOpenDeg;
  records.impactShoulderOpenLabel = currentCalculatedState.shoulderOpenLabel;
  records.impactBackElbow = currentCalculatedState.backElbowAngle;
  records.impactHandH = currentCalculatedState.impactHandHeightCm;
  records.impactKneeValgus = currentCalculatedState.kneeValgusAngle;
  records.impactKneeValgusLabel = currentCalculatedState.kneeValgusLabel;

  if (selectedAngleMode === 'SIDE') {
    c2Max.textContent = `インパクト時: 屈曲 ${records.impactKneeFlex}°(壁)`;
    c8Max.textContent = `インパクト時: ${records.impactHandH} cm`;
    c10Max.textContent = `インパクト時: ${records.impactBackElbow}°`;
  } else {
    c3Max.textContent = `インパクト時: ${records.impactShoulderOpen}° (${records.impactShoulderOpenLabel})`;
    c6Max.textContent = `インパクト時: ${records.impactKneeValgus}° (${records.impactKneeValgusLabel})`;
    c8Max.textContent = `インパクト時: ${records.impactHandH} cm`;
    c10Max.textContent = `インパクト時: ${records.impactBackElbow}°`;
  }
  showToast("インパクト瞬間の各数値を記録しました!");
});

function generateBattingAICoachAdvice(entry) {
  let praises = [];
  let improvements = [];

  if (entry.mode === 'SIDE') {
    const m = entry.metrics;
    const twist = m.twist || 0;

    if (twist >= 22 && twist <= 38) {
      praises.push(`捻転差【+${twist}°】! 下半身先行のタメがバッチリできています!(飛距離UP)`);
    } else if (twist > 38) {
      improvements.push(`捻りを少し抑えて、スムーズに胸を回す意識を持とう!(◎ミート率安定)`);
    } else if (twist >= 8 && twist < 22) {
      improvements.push(`骨盤を先に回しながら胸を少し残し、タメを作ってみよう!(打球初速UP)`);
    } else if (twist < 0) {
      improvements.push(`手から振らず、着地後に腰(骨盤)から回す意識を持とう!(パワーUP)`);
    }

    const kFlex = (m.impactKneeFlex !== null && m.impactKneeFlex !== undefined) ? m.impactKneeFlex : 0;
    if (kFlex >= 15 && kFlex <= 32) {
      praises.push(`前足ヒザ【屈曲 ${kFlex}°】の強い壁でパワーが伝わっています! (強い打球)`);
    } else if (kFlex > 38) {
      improvements.push(`着地後に前ヒザをピタッと止め、回転の強い壁を作ろう!(飛距離UP)`);
    } else if (kFlex < 10) {
      improvements.push(`前ヒザを突っ張りすぎず、少しゆとりを持って踏ん張ろう!(ケガ予防)`);
    }

    const leadElbow = (m.takebackLeadElbow !== null && m.takebackLeadElbow !== undefined) ? m.takebackLeadElbow : null;
    if (leadElbow !== null) {
      if (leadElbow >= 110 && leadElbow <= 135) {
        praises.push(`テイクバックの前ヒジ【${leadElbow}°】が理想的! 最短軌道で振れています!(ヘッドスピードUP)`);
      } else if (leadElbow > 140) {
        improvements.push(`前ヒジを軽く曲げて懐を柔らかく保ち、遠回りを防ごう!(◎ミート力UP)`);
      } else if (leadElbow < 100) {
        improvements.push(`トップで懐を広く取る意識を持とう!(飛距離UP)`);
      }
    }

    const backElbow = (m.impactBackElbow !== null && m.impactBackElbow !== undefined) ? m.impactBackElbow : null;
    if (backElbow !== null) {
      if (backElbow >= 85 && backElbow <= 115) {
        praises.push(`インパクトで後ろヒジ【${backElbow}°】が引きつけられ力強い!(打球初速UP)`);
      } else if (backElbow > 125) {
        improvements.push(`ボールを体の近くまでしっかり引きつけて叩こう!(強い打球)`);
      }
    }

    if (m.strideRatio >= 40 && m.strideRatio <= 55) {
      praises.push(`ステップ幅が身長の【${m.strideRatio}%】で理想の黄金比です!(◎ タイミング安定)`);
    } else if (m.strideRatio > 0 && m.strideRatio < 38) {
      improvements.push(`前足を力強く踏み出して、体重移動の力を使おう!(飛距離UP)`);
    } else if (m.strideRatio > 58) {
      improvements.push(`少しスタンスを狭めて、スムーズに腰を回そう!(ミート力UP)`);
    }

    if (m.headShift <= 8) {
      praises.push(`頭の突っ込み【${m.headShift}cm】が少なく、軸足に体重が残っています!(◎見極めUP)`);
    } else {
      improvements.push(`軸足の股関節に体重を残したままクルッと回転しよう!(空振り激減)`);
    }

    const headY = m.headShiftY || 0;
    if (headY > 0 && headY <= 6) {
      praises.push(`目線の上下動【${headY}cm】が少なく、ボールが見えています!(◎選球眼UP)`);
    } else if (headY > 6) {
      improvements.push(`スイング中の頭の高さをキープし、目線のズレをなくそう!(◎空振り激減)`);
    }
  } else {
    const m = entry.metrics;
    const headX = m.headShiftX !== undefined ? m.headShiftX : (m.headShift || 0);

    if (headX <= 6) {
      praises.push(`頭の横ブレ【${headX}cm】が少なく、目線がピタッと安定!(◎ミート率UP)`);
    } else {
      improvements.push(`片足立ち素振りで体幹を鍛え、目線をブラさない軸を作ろう!(◎ミート率UP)`);
    }

    const headY = m.headShiftY || 0;
    if (headY <= 6) {
      praises.push(`頭の上下動【${headY}cm】が少なく、高低を見極められています!(コース対応UP)`);
    } else {
      improvements.push(`構えた高さをキープして回転し、高低の変化球に強くなろう!(◎選球眼UP)`);
    }

    const sOpen = m.impactShoulderOpen !== undefined ? m.impactShoulderOpen : (m.shoulderOpen || 0);
    if (sOpen <= 18) {
      praises.push(`前肩の開き【${sOpen}°】を抑え、懐の深いタメができています!(外角対応UP)`);
    } else if (sOpen > 25) {
      improvements.push(`インパクト直前まで前肩を投手へ向け続け、タメを作ろう!(◎逆方向ヒッティング)`);
    }

    const valgus = m.impactKneeValgus !== undefined ? m.impactKneeValgus : (m.kneeValgus || 0);
    if (valgus <= 6) {
      praises.push(`前ヒザが外へ逃げず【${valgus}°】しっかり踏ん張れています!(打球初速UP)`);
    } else if (valgus > 10) {
      improvements.push(`前足の内ももと母指球でグッと受け止め、力を伝えよう!(飛距離UP)`);
    }

    if (m.inStep <= 8) {
      praises.push(`投手へ真っ直ぐ踏み込めており、全コースに対応できます!(◎コース対応)`);
    } else {
      improvements.push(`地面のラインに沿って真っ直ぐ踏み出す素振りをしよう!(コース見極め)`);
    }

    if (m.trunkTilt >= 10 && m.trunkTilt <= 25) {
      praises.push(`スイング軸の傾き【${m.trunkTilt}°】が理想的なライナー軌道です!(長打力UP)`);
    } else if (m.trunkTilt > 28) {
      improvements.push(`上体をあおらず、軸を安定させて強いライナーを打とう!(ライナー量産)`);
    }
  }

  const praiseText = praises.length > 0 ? praises.slice(0, 2).map(p => "・" + p).join("\n") : "・一生懸命にフルスイングできています!";
  const improveText = improvements.length > 0 ? improvements.slice(0, 1).map(i => "・" + i).join("\n") : "・今の良いフォームバランスをキープしよう!";

  let text = "【打撃AIコーチ診断】\n";
  text += "ナイス!:\n" + praiseText + "\n\n";
  text += "つぎの意識:\n" + improveText;
  return text;
}

const STORAGE_KEY = 'batting_ai_records_v1';

function getSavedRecords() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Storage Load Error", e);
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
    batBox: selectedBatBox,
    mode: selectedAngleMode,
    feelGrade: "めっちゃ芯で捉えた!",
    bodyCondition: "どこも痛くない!元気!",
    playerNote: "",
    metrics: selectedAngleMode === 'SIDE' ? {
      twist: records.maxTwistSigned !== 0 ? records.maxTwistSigned : currentCalculatedState.twistSignedDeg,
      twistLabel: records.twistStatusLabel || currentCalculatedState.twistStatusLabel,
      impactKneeFlex: records.impactKneeFlex !== null ? records.impactKneeFlex : currentCalculatedState.kneeFlexAngle,
      stride: records.maxStride,
      strideRatio: Math.round((records.maxStride / userHeightCm) * 100),
      trunkTilt: records.maxTrunkTilt,
      headShift: records.maxHeadShift,
      headShiftY: records.maxHeadShiftY,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow !== null ? records.takebackLeadElbow : currentCalculatedState.leadElbowAngle,
      impactBackElbow: records.impactBackElbow !== null ? records.impactBackElbow : currentCalculatedState.backElbowAngle
    } : {
      headShiftX: records.maxHeadShift,
      headShiftY: records.maxHeadShiftY,
      impactShoulderOpen: records.impactShoulderOpen !== null ? records.impactShoulderOpen : currentCalculatedState.shoulderOpenDeg,
      impactShoulderOpenLabel: records.impactShoulderOpenLabel || currentCalculatedState.shoulderOpenLabel,
      inStep: records.maxInStepCm,
      inStepDir: records.inStepDir,
      impactKneeValgus: records.impactKneeValgus !== null ? records.impactKneeValgus : currentCalculatedState.kneeValgusAngle,
      impactKneeValgusLabel: records.impactKneeValgusLabel || currentCalculatedState.kneeValgusLabel,
      trunkTilt: records.maxTrunkTilt,
      topHandH: records.maxTopHandH,
      impactHandH: records.impactHandH !== null ? records.impactHandH : currentCalculatedState.impactHandHeightCm,
      takebackLeadElbow: records.takebackLeadElbow,
      impactBackElbow: records.impactBackElbow
    }
  };

  allRecords.unshift(newEntry);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
    populatePastPlayers();
    showToast(`${playerName}君の打撃データをカルテに保存しました!`);
  } catch (e) {
    showToast("! 保存容量がいっぱいです");
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

async function sendRecordToCloud(groupKey, btnElement) {
  const allRecords = getSavedRecords();
  const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
  if (groupRecords.length === 0) return;
  const first = groupRecords[0];

  if (btnElement) {
    btnElement.disabled = true;
    btnElement.textContent = "クラウドに送信中...";
  }

  try {
    const adviceText = generateBattingAICoachAdvice(first);
    const payload = groupRecords.map(r => ({
      team_id: currentTeamId,
      player_name: r.playerName,
      height: r.height,
      category: 'BATTING',
      sub_side: r.batBox || r.batSide || 'RIGHT',
      angle_mode: r.mode,
      metrics: r.metrics,
      feel_grade: r.feelGrade || first.feelGrade || "めっちゃ良かった!",
      body_condition: r.bodyCondition || first.bodyCondition || "どこも痛くない!元気!",
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

    showToast(`【${first.playerName}選手】の打撃カルテをクラウドに送信しました!`);
    if (btnElement) {
      btnElement.textContent = "送信完了(再送信可)";
      btnElement.classList.add('sent');
    }
  } catch (err) {
    console.error("Cloud Send Error:", err);
    alert(`送信に失敗しました: ${err.message} \nインターネット接続を確認してください。`);
    if (btnElement) {
      btnElement.textContent = "チーム・クラウドに送信する";
    }
  } finally {
    if (btnElement) btnElement.disabled = false;
  }
}

btnOpenRestore.addEventListener('click', async () => {
  document.getElementById('restore-team-name').textContent = currentTeamId;
  restoreStatusInfo.textContent = "クラウドのデータを検索中...";
  restorePlayerSelect.innerHTML = '<option value="">読み込み中... </option>';
  btnExecRestore.disabled = true;
  restoreModal.style.display = 'flex';

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/baseball_records?category=eq.BATTING&select=*&order=id.desc&limit=500`, {
      method: 'GET',
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`
      }
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const targetNorm = normalizeTeamName(currentTeamId);
    cachedCloudBattingRecords = (data || []).filter(r => normalizeTeamName(r.team_id) === targetNorm);

    const playerNames = Array.from(new Set(cachedCloudBattingRecords.map(r => r.player_name).filter(Boolean)));
    restorePlayerSelect.innerHTML = "";

    if (playerNames.length === 0) {
      restorePlayerSelect.innerHTML = '<option value="">(保存データなし)</option>';
      restoreStatusInfo.textContent = `! チーム【${currentTeamId}】の打撃データは見つかりませんでした。`;
    } else {
      playerNames.forEach(p => {
        const count = cachedCloudBattingRecords.filter(r => r.player_name === p).length;
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = `${p} (${count}件のカルテ)`;
        restorePlayerSelect.appendChild(opt);
      });
      restoreStatusInfo.textContent = `${playerNames.length}名の選手データが見つかりました。復旧したい選手を選択してください。`;
    }
    btnExecRestore.disabled = false;
  } catch(err) {
    console.error("Restore fetch error:", err);
    restoreStatusInfo.textContent = `接続に失敗しました: ${err.message}`;
    restorePlayerSelect.innerHTML = '<option value="">エラー</option>';
  }
});

btnCloseRestore.addEventListener('click', () => {
  restoreModal.style.display = 'none';
});

btnExecRestore.addEventListener('click', () => {
  const targetPlayer = restorePlayerSelect.value;
  if (!targetPlayer) return;

  const targetRecords = cachedCloudBattingRecords.filter(r => r.player_name === targetPlayer);
  if (targetRecords.length === 0) return;

  let localRecords = getSavedRecords();
  let restoredCount = 0;

  targetRecords.forEach(cr => {
    const crDate = cr.date || (cr.created_at ? cr.created_at.slice(0, 10).replace(/-/g, '/') : "");
    const exists = localRecords.some(lr => lr.playerName === cr.player_name && lr.date === crDate && lr.mode === cr.angle_mode);

    if (!exists) {
      const newEntry = {
        id: cr.id || Date.now() + Math.random(),
        date: crDate || new Date().toLocaleDateString('ja-JP'),
        time: cr.time || (cr.created_at ? cr.created_at.slice(11, 16) : '12:00'),
        playerName: cr.player_name,
        height: cr.height || 140,
        batBox: cr.sub_side || 'RIGHT',
        mode: cr.angle_mode || 'SIDE',
        feelGrade: cr.feel_grade || 'めっちゃ良かった!',
        bodyCondition: cr.body_condition || 'どこも痛くない!元気!',
        playerNote: cr.player_note || "",
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
  showToast(`【${targetPlayer}選手】の打撃カルテ(${restoredCount}件)を端末に復旧しました!`);
});

function shareRecordToLine(groupKey) {
  const allRecords = getSavedRecords();
  const groupRecords = allRecords.filter(r => `${r.playerName}_${r.date}` === groupKey);
  if (groupRecords.length === 0) return;

  const first = groupRecords[0];
  const sideRec = groupRecords.find(r => r.mode === 'SIDE');
  const frontRec = groupRecords.find(r => r.mode === 'FRONT');
  const isLeft = (first.batBox === 'LEFT' || first.batSide === 'LEFT');

  let text = `【打撃バイオメカニクス 選手レポート】\n`;
  text += `選手名: ${first.playerName}選手 (${first.height}cm / ${isLeft ? '左打ち' : '右打ち'})\n`;
  text += `測定日: ${first.date}\n\n`;

  if (sideRec) {
    text += `【横向き測定データ(論文準拠)】\n`;
    text += `・捻転差(下半身先行): ${sideRec.metrics.twist >= 0 ? '+' : ""}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})\n`;
    text += `・前ヒザの壁: 屈曲 ${sideRec.metrics.impactKneeFlex}°\n`;
    if (sideRec.metrics.takebackLeadElbow !== null && sideRec.metrics.takebackLeadElbow !== undefined) {
      text += `・テイクバック前ヒジ (${isLeft ? '右' : '左'}): ${sideRec.metrics.takebackLeadElbow}°\n`;
    }
    if (sideRec.metrics.impactBackElbow !== null && sideRec.metrics.impactBackElbow !== undefined) {
      text += `・インパクト後ヒジ (${isLeft ? '左' : '右'}): ${sideRec.metrics.impactBackElbow}°\n`;
    }
    text += `・ステップ幅: ${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio || 0}%身)\n`;
    text += `・頭の突っ込み(前後): ${sideRec.metrics.headShift}cm\n`;
    text += `・頭の上下動(沈み込み): ${sideRec.metrics.headShiftY || 0}cm\n`;
    text += `・体幹スイング軸傾斜: ${sideRec.metrics.trunkTilt}°\n`;
    text += `・トップ高: ${sideRec.metrics.topHandH}cm / インパクト高: ${sideRec.metrics.impactHandH || '--'}cm\n\n`;
  }

  if (frontRec) {
    const shoulderOpen = frontRec.metrics.impactShoulderOpen !== undefined ? frontRec.metrics.impactShoulderOpen : (frontRec.metrics.shoulderOpen || 0);
    const shoulderOpenLabel = frontRec.metrics.impactShoulderOpenLabel || frontRec.metrics.shoulderOpenLabel || 'タメ十分';
    const kneeValgus = frontRec.metrics.impactKneeValgus !== undefined ? frontRec.metrics.impactKneeValgus : (frontRec.metrics.kneeValgus || 0);
    const kneeValgusLabel = frontRec.metrics.impactKneeValgusLabel || frontRec.metrics.kneeValgusLabel || '正常';

    text += `【正面測定データ(論文準拠)】\n`;
    text += `・頭の横ブレ(目線): ${frontRec.metrics.headShiftX || frontRec.metrics.headShift || 0}cm\n`;
    text += `・頭の上下動(目線): ${frontRec.metrics.headShiftY || 0}cm\n`;
    text += `・前肩の開き(タメ): ${shoulderOpen}° (${shoulderOpenLabel})\n`;
    text += `・前ヒザの踏ん張り(割れ): ${kneeValgus}° (${kneeValgusLabel})\n`;
    text += `・ステップズレ: ${frontRec.metrics.inStep || 0}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})\n`;
    text += `・上半身の傾き: ${frontRec.metrics.trunkTilt || 0}°\n\n`;
  }

  text += generateBattingAICoachAdvice(first) + "\n\n";
  text += `【せんしゅのふりかえり】\n`;
  text += `・打った感覚: ${first.feelGrade || 'めっちゃ芯で捉えた!'}\n`;
  text += `・カラダの調子: ${first.bodyCondition || 'どこも痛くない!元気!'}\n`;
  if (first.playerNote && first.playerNote.trim() !== "") {
    text += `・ひとこと: 「${first.playerNote.trim()}」\n`;
  }

  if (navigator.share) {
    navigator.share({
      title: `${first.playerName}選手の打撃フォームレポート`,
      text: text
    }).catch(err => {
      if (err.name !== 'AbortError') console.log('Share error:', err);
    });
  } else {
    document.execCommand('copy');
    showToast("レポート文をクリップボードにコピーしました!\nLINE等に貼り付けて監督に送れます。");
  }
}

function renderCarteList(isInitialOpen) {
  const allRecords = getSavedRecords();
  carteHistoryList.innerHTML = "";

  const playerNames = Array.from(new Set(allRecords.map(r => r.playerName)));
  const previousSelection = playerSelectFilter.value;
  playerSelectFilter.innerHTML = '<option value="ALL">全員のカルテを表示</option>';

  playerNames.forEach(p => {
    const opt = document.createElement('option');
    opt.value = p;
    opt.textContent = `${p}`;
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
  btnDeleteAction.textContent = (selectedFilter === 'ALL') ? "! 全カルテ初期化" : `${selectedFilter}を全削除`;

  const filtered = selectedFilter === 'ALL' ? allRecords : allRecords.filter(r => r.playerName === selectedFilter);
  if (filtered.length === 0) {
    carteHistoryList.innerHTML = '<div style="text-align:center; padding: 20px; color:#64748b; font-weight:800;">保存されたカルテはありません</div>';
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
    const isLeft = (first.batBox === 'LEFT' || first.batSide === 'LEFT');
    const curFeel = first.feelGrade || "めっちゃ芯で捉えた!";
    const curBody = first.bodyCondition || "どこも痛くない!元気!";

    const card = document.createElement('div');
    card.className = 'history-card';
    const aiAdviceHtml = generateBattingAICoachAdvice(first).replace(/\n/g, '<br>');

    card.innerHTML = `
      <div class="history-card-head">
        <span>${first.playerName} (${first.height}cm ${isLeft ? '左打' : '右打'})</span>
        <div style="display: flex; align-items:center; gap:6px;">
          <span style="color:#64748b; font-size:0.65rem;">📅 ${first.date}</span>
          <button class="btn-item-delete" data-group="${key}">削除</button>
        </div>
      </div>
      <div class="history-unified-grid">
        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>横向き(側方)解析</span>
            <span style="font-size:0.60rem; color:${sideRec ? '#10b981' : '#94a3b8'};">${sideRec ? '測定済' : '未測定'}</span>
          </div>
          ${sideRec ? `
            <div class="metric-row-item"><span>捻転差(タメ):</span><b>${sideRec.metrics.twist >= 0 ? '+' : ""}${sideRec.metrics.twist}° (${sideRec.metrics.twistLabel || 'タメ'})</b></div>
            <div class="metric-row-item"><span>前ヒザ壁:</span><b>屈曲 ${sideRec.metrics.impactKneeFlex}°</b></div>
            <div class="metric-row-item"><span>TOP前ヒジ:</span><b>${sideRec.metrics.takebackLeadElbow !== undefined && sideRec.metrics.takebackLeadElbow !== null ? sideRec.metrics.takebackLeadElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>離球後ヒジ:</span><b>${sideRec.metrics.impactBackElbow !== undefined && sideRec.metrics.impactBackElbow !== null ? sideRec.metrics.impactBackElbow + '°' : '--'}</b></div>
            <div class="metric-row-item"><span>ステップ幅:</span><b>${sideRec.metrics.stride}cm (${sideRec.metrics.strideRatio || 0}%)</b></div>
            <div class="metric-row-item"><span>頭突っ込み:</span><b>${sideRec.metrics.headShift}cm</b></div>
            <div class="metric-row-item"><span>頭上下動:</span><b>${sideRec.metrics.headShiftY || 0}cm</b></div>
            <div class="metric-row-item"><span>体幹傾斜:</span><b>${sideRec.metrics.trunkTilt}°</b></div>
            <div class="metric-row-item"><span>トップ/インパクト高:</span><b>${sideRec.metrics.topHandH}cm / ${sideRec.metrics.impactHandH || '--'}cm</b></div>
          ` : `<div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">横向き動画のデータなし</div>`}
        </div>
        <div class="metric-section-block">
          <div class="metric-section-title">
            <span>正面(投手側)解析</span>
            <span style="font-size:0.60rem; color:${frontRec ? '#10b981' : '#94a3b8'};">${frontRec ? '測定済' : '未測定'}</span>
          </div>
          ${frontRec ? `
            <div class="metric-row-item"><span>頭の横ブレ:</span><b>${frontRec.metrics.headShiftX || frontRec.metrics.headShift || 0}cm</b></div>
            <div class="metric-row-item"><span>頭の上下動:</span><b>${frontRec.metrics.headShiftY || 0}cm</b></div>
            <div class="metric-row-item"><span>前肩の開き:</span><b>${frontRec.metrics.impactShoulderOpen !== undefined ? frontRec.metrics.impactShoulderOpen : (frontRec.metrics.shoulderOpen || 0)}° (${frontRec.metrics.impactShoulderOpenLabel || frontRec.metrics.shoulderOpenLabel || 'タメ十分'})</b></div>
            <div class="metric-row-item"><span>前ヒザ割れ:</span><b>${frontRec.metrics.impactKneeValgus !== undefined ? frontRec.metrics.impactKneeValgus : (frontRec.metrics.kneeValgus || 0)}° (${frontRec.metrics.impactKneeValgusLabel || frontRec.metrics.kneeValgusLabel || '正常'})</b></div>
            <div class="metric-row-item"><span>踏出ズレ:</span><b>${frontRec.metrics.inStep || 0}cm (${frontRec.metrics.inStepDir || 'まっすぐ'})</b></div>
            <div class="metric-row-item"><span>軸の左右傾き:</span><b>${frontRec.metrics.trunkTilt || 0}°</b></div>
          ` : `<div style="text-align:center; padding: 10px 0; color:#94a3b8; font-size:0.65rem;">正面動画のデータなし</div>`}
        </div>
      </div>
      <div class="ai-coach-card">
        <div class="ai-coach-title">打撃バイオメカニクス AIコーチ診断</div>
        <div class="ai-coach-text">${aiAdviceHtml}</div>
      </div>
      <div class="player-reflection-box">
        <div class="reflection-sec-title">今日の打撃の感覚は?</div>
        <div class="chip-group" data-type="feel" data-group="${key}">
          <div class="choice-chip ${curFeel.includes('芯') ? 'active' : ''}" data-val="めっちゃ芯で捉えた!">芯で捉えた</div>
          <div class="choice-chip ${curFeel.includes('ふつう') ? 'active' : ''}" data-val="ふつう・いつも通り">いつも通り</div>
          <div class="choice-chip ${curFeel.includes('詰まった') || curFeel.includes('いまいち') ? 'active' : ''}" data-val="詰まった / 泳がされた">詰まった</div>
        </div>
        <div class="reflection-sec-title">カラダの調子・違和感</div>
        <div class="chip-group" data-type="body" data-group="${key}">
          <div class="choice-chip ${curBody.includes('痛くない') ? 'active' : ''}" data-val="どこも痛くない!元気!">痛くない</div>
          <div class="choice-chip ${curBody.includes('重い') ? 'active' : ''}" data-val="腰や手首がちょっと重い">ちょっと重い</div>
          <div class="choice-chip ${curBody.includes('違和感') ? 'active' : ''}" data-val="腰や手首に違和感・痛みあり">違和感あり</div>
        </div>
        <div class="reflection-sec-title">じぶんの気づき、監督、お父さん、お母さんへひとこと</div>
        <textarea class="player-textarea" data-group="${key}" placeholder="気づいたことや、次にやってみたいことを書いてね! ">${first.playerNote || ""}</textarea>
        <button type="button" class="btn-send-cloud" data-group="${key}">
          <span>チーム・クラウドに送信する</span>
        </button>
        <button type="button" class="btn-share-line" data-group="${key}">
          <span>今日の打撃レポートをLINEで送る</span>
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
      let allRecords = getSavedRecords();
      allRecords = allRecords.filter(r => `${r.playerName}_${r.date}` !== groupKey);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      showToast("カルテを1件削除しました");
      renderCarteList(false);
    });
  });
}

playerSelectFilter.addEventListener('change', () => renderCarteList(false));

btnDeleteAction.addEventListener('click', () => {
  const selectedFilter = playerSelectFilter.value;
  let allRecords = getSavedRecords();
  if (allRecords.length === 0) return;

  if (selectedFilter === 'ALL') {
    if (confirm("! 【注意】すべての選手のカルテデータを完全に初期化しますか? \n(消去しても上の「復旧」から復元できます)")) {
      localStorage.removeItem(STORAGE_KEY);
      populatePastPlayers();
      renderCarteList(false);
    }
  } else {
    if (confirm(`${selectedFilter}選手のすべての測定データを削除しますか? \n(消去しても上の「復旧」から復元できます)`)) {
      allRecords = allRecords.filter(r => r.playerName !== selectedFilter);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allRecords));
      populatePastPlayers();
      renderCarteList(false);
    }
  }
});

document.getElementById('btn-export-csv').addEventListener('click', () => {
  const allRecords = getSavedRecords();
  if (allRecords.length === 0) {
    showToast("保存されたデータがありません");
    return;
  }

  let csvContent = "\uFEFF日付,選手名,身長,打席,測定向き,捻転差(deg),捻転状態,前ヒザ壁(deg),テイクバック前ヒジ(deg),インパクト後ヒジ(deg),ステップ幅(cm),ステップ率(%),頭突っ込み(cm),頭上下動(cm),スイング軸傾斜(deg),頭横ブレ(cm),前肩開き(deg),前肩状態,前ヒザ内外反(deg),ステップズレ(cm),打った感覚,カラダの調子,選手コメント\n";

  allRecords.forEach(r => {
    const isSide = (r.mode === 'SIDE');
    const noteSafe = `"${(r.playerNote || "").replace(/"/g, '""')}"`;
    const sOpen = !isSide ? (r.metrics.impactShoulderOpen !== undefined ? r.metrics.impactShoulderOpen : (r.metrics.shoulderOpen || 0)) : "";
    const sOpenL = !isSide ? `${r.metrics.impactShoulderOpenLabel || r.metrics.shoulderOpenLabel || ""}` : "";
    const kValg = !isSide ? (r.metrics.impactKneeValgus !== undefined ? r.metrics.impactKneeValgus : (r.metrics.kneeValgus || 0)) : "";

    const row = [
      `"${r.date}"`,
      `"${r.playerName}"`,
      r.height,
      (r.batBox === 'RIGHT' || r.batSide === 'RIGHT') ? "右打" : "左打",
      isSide ? "横向き" : "正面",
      isSide ? r.metrics.twist : "",
      isSide ? `"${r.metrics.twistLabel || ""}"` : "",
      isSide ? r.metrics.impactKneeFlex : "",
      isSide ? (r.metrics.takebackLeadElbow || "") : "",
      isSide ? (r.metrics.impactBackElbow || "") : "",
      isSide ? r.metrics.stride : "",
      isSide ? (r.metrics.strideRatio || 0) : "",
      isSide ? r.metrics.headShift : "",
      isSide ? (r.metrics.headShiftY || 0) : (!isSide ? r.metrics.headShiftY : ""),
      isSide ? r.metrics.trunkTilt : r.metrics.trunkTilt,
      !isSide ? (r.metrics.headShiftX || r.metrics.headShift || 0) : "",
      sOpen,
      sOpenL,
      kValg,
      !isSide ? (r.metrics.inStep || 0) : "",
      `"${r.feelGrade || '芯で捉えた'}"`,
      `"${r.bodyCondition || '痛くない'}"`,
      noteSafe
    ];
    csvContent += row.join(",") + "\n";
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `打撃AIカルテ_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ★ ルール4: 描画領域エラーの回避
function processSingleFrame() {
  if (!isPoseLoaded || isProcessing || !videoElement?.videoWidth) {
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
  if (!outputCanvas || !videoElement) return;
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

function calcJointAngle3D(p1, p2, p3) {
  if (!p1 || !p2 || !p3) return NaN;
  const v1 = {x: p1.x - p2.x, y: p1.y - p2.y, z: (p1.z || 0) - (p2.z || 0)};
  const v2 = {x: p3.x - p2.x, y: p3.y - p2.y, z: (p3.z || 0) - (p2.z || 0)};
  const mag1 = Math.hypot(v1.x, v1.y, v1.z);
  const mag2 = Math.hypot(v2.x, v2.y, v2.z);
  if (mag1 < 1e-6 || mag2 < 1e-6) return NaN;
  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const cosVal = Math.max(-1.0, Math.min(1.0, dot / (mag1 * mag2)));
  return (Math.acos(cosVal) * 180.0) / Math.PI;
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
        scanGuideText.innerHTML = "<b>AIが検知したよ! </b> ズレがあれば<b>丸いハンドルを上下にドラッグ</b>して合わせてね!";
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
    const NOSE = landmarks[0];
    const L_SHOULDER = landmarks[11];
    const R_SHOULDER = landmarks[12];
    const L_ELBOW = landmarks[13];
    const R_ELBOW = landmarks[14];
    const L_WRIST = landmarks[15];
    const R_WRIST = landmarks[16];
    const L_HIP = landmarks[23];
    const R_HIP = landmarks[24];
    const L_KNEE = landmarks[25];
    const R_KNEE = landmarks[26];
    const L_ANKLE = landmarks[27];
    const R_ANKLE = landmarks[28];
    const L_HEEL = landmarks[29];
    const R_HEEL = landmarks[30];

    const normalizedStatureHeight = (tuneRuler.bottomYNorm - tuneRuler.topYNorm) > 0.1 ? (tuneRuler.bottomYNorm - tuneRuler.topYNorm) : 0.75;
    const activePxPerCm = (normalizedStatureHeight * b.h) / userHeightCm;
    const isRightBatter = (selectedBatBox === 'RIGHT');

    const frontHip = isRightBatter ? L_HIP : R_HIP;
    const backHip = isRightBatter ? R_HIP : L_HIP;
    const frontKnee = isRightBatter ? L_KNEE : R_KNEE;
    const frontAnkle = isRightBatter ? L_ANKLE : R_ANKLE;
    const frontHeel = isRightBatter ? (L_HEEL || L_ANKLE) : (R_HEEL || R_ANKLE);
    const backHeel = isRightBatter ? (R_HEEL || R_ANKLE) : (L_HEEL || L_ANKLE);
    const frontShoulder = isRightBatter ? L_SHOULDER : R_SHOULDER;
    const backShoulder = isRightBatter ? R_SHOULDER : L_SHOULDER;
    const topWrist = isRightBatter ? R_WRIST : L_WRIST;

    const leadElbowJoints = isRightBatter
      ? {s: L_SHOULDER, e: L_ELBOW, w: L_WRIST }
      : {s: R_SHOULDER, e: R_ELBOW, w: R_WRIST };
    const backElbowJoints = isRightBatter
      ? {s: R_SHOULDER, e: R_ELBOW, w: R_WRIST }
      : {s: L_SHOULDER, e: L_ELBOW, w: L_WRIST };

    if (isSkeletonVisible) {
      drawBattingSkeleton(landmarks, b.x, b.y, b.w, b.h, isRightBatter);
    }

    if (NOSE && initialNoseX === null) {
      initialNoseX = NOSE.x;
      initialNoseY = NOSE.y;
    }

    if (frontShoulder && backShoulder && frontHip && backHip) {
      const hipDx = (frontHip.x - backHip.x);
      const hipDz = ((frontHip.z || 0) - (backHip.z || 0));
      const shoulderDx = (frontShoulder.x - backShoulder.x);
      const shoulderDz = ((frontShoulder.z || 0) - (backShoulder.z || 0));
      const hipRot = Math.atan2(hipDz, hipDx) * (180.0 / Math.PI);
      const shoulderRot = Math.atan2(shoulderDz, shoulderDx) * (180.0 / Math.PI);

      let signedTwist = isRightBatter ? (hipRot - shoulderRot) : (shoulderRot - hipRot);
      if (signedTwist > 180) signedTwist -= 360;
      if (signedTwist < -180) signedTwist += 360;

      let roundedTwist = Math.round(signedTwist);
      if (roundedTwist >= -40 && roundedTwist <= 60) {
        let twistLabel = "同調 (0°)";
        if (roundedTwist >= 22 && roundedTwist <= 38) {
          twistLabel = "理想タメ (下半身先行)";
        } else if (roundedTwist > 38) {
          twistLabel = "○ タメ大";
        } else if (roundedTwist >= 10 && roundedTwist < 22) {
          twistLabel = "やや下半身先行";
        } else if (roundedTwist < -5) {
          twistLabel = "! 手打ち (上体先行)";
        }
        currentCalculatedState.twistSignedDeg = roundedTwist;
        currentCalculatedState.twistStatusLabel = twistLabel;

        if (selectedAngleMode === 'SIDE') {
          c1Val.textContent = `${roundedTwist >= 0 ? '+' : ""}${roundedTwist}°`;
          if (roundedTwist > records.maxTwistSigned && roundedTwist >= 5) {
            records.maxTwistSigned = roundedTwist;
            records.twistStatusLabel = twistLabel;
            c1Max.textContent = `最大タメ: +${roundedTwist}° (${twistLabel})`;
          }
        }
      }
    }

    if (frontHip && frontKnee && frontAnkle) {
      const rawKneeAngle = calcJointAngle3D(frontHip, frontKnee, frontAnkle);
      if (Number.isFinite(rawKneeAngle) && rawKneeAngle >= 40 && rawKneeAngle <= 180) {
        const flexAngle = Math.max(0, Math.round(180 - rawKneeAngle));
        currentCalculatedState.kneeFlexAngle = flexAngle;
        if (selectedAngleMode === 'SIDE') {
          c2Val.textContent = `屈曲 ${flexAngle}°`;
        }
      }
    }

    if (frontHeel && backHeel) {
      const stridePx = Math.hypot((frontHeel.x - backHeel.x) * b.w, (frontHeel.y - backHeel.y) * b.h);
      const strideCm = Math.round(stridePx / activePxPerCm);
      if (Number.isFinite(strideCm) && strideCm >= 10 && strideCm <= Math.round(userHeightCm * 1.0)) {
        currentCalculatedState.strideCm = strideCm;
        if (selectedAngleMode === 'SIDE') {
          c3Val.textContent = `${strideCm} cm`;
          if (strideCm > records.maxStride) {
            records.maxStride = strideCm;
            c3Max.textContent = `最大: ${strideCm} cm (${Math.round((strideCm/userHeightCm)*100)}%身)`;
          }
        }
      }
    }

    if (L_SHOULDER && R_SHOULDER && L_HIP && R_HIP) {
      const midShoulder = {x: (L_SHOULDER.x + R_SHOULDER.x)/2, y: (L_SHOULDER.y + R_SHOULDER.y)/2 };
      const midHip = {x: (L_HIP.x + R_HIP.x)/2, y: (L_HIP.y + R_HIP.y)/2 };
      const tiltDeg = Math.round(Math.abs((Math.atan2(midShoulder.x - midHip.x, midHip.y - midShoulder.y) * 180.0) / Math.PI));

      if (Number.isFinite(tiltDeg) && tiltDeg <= 55) {
        currentCalculatedState.trunkTiltDeg = tiltDeg;
        if (selectedAngleMode === 'SIDE') {
          c4Val.textContent = `${tiltDeg} °`;
          if (tiltDeg > records.maxTrunkTilt) {
            records.maxTrunkTilt = tiltDeg;
            c4Max.textContent = `最大: ${tiltDeg} °`;
          }
        } else {
          c5Val.textContent = `${tiltDeg} °`;
          if (tiltDeg > records.maxTrunkTilt) {
            records.maxTrunkTilt = tiltDeg;
            c5Max.textContent = `最大傾き: ${tiltDeg}°`;
          }
        }
      }
    }

    if (NOSE && initialNoseX !== null) {
      const shiftXPx = Math.abs((NOSE.x - initialNoseX) * b.w);
      const shiftYPx = Math.abs((NOSE.y - initialNoseY) * b.h);
      const shiftXCm = Math.round(shiftXPx / activePxPerCm);
      const shiftYCm = Math.round(shiftYPx / activePxPerCm);

      currentCalculatedState.headShiftCm = shiftXCm;
      currentCalculatedState.headShiftYCm = shiftYCm;

      if (selectedAngleMode === 'SIDE') {
        c5Val.textContent = `${shiftXCm} cm`;
        if (shiftXCm > records.maxHeadShift && shiftXCm <= 60) {
          records.maxHeadShift = shiftXCm;
          c5Max.textContent = `最大移動: ${shiftXCm} cm`;
        }
        c6Val.textContent = `${shiftYCm} cm`;
        if (shiftYCm > records.maxHeadShiftY && shiftYCm <= 50) {
          records.maxHeadShiftY = shiftYCm;
          c6Max.textContent = `最大上下: ${shiftYCm} cm`;
        }
      } else {
        c1Val.textContent = `${shiftXCm} cm`;
        c2Val.textContent = `${shiftYCm} cm`;
        if (shiftXCm > records.maxHeadShift && shiftXCm <= 50) {
          records.maxHeadShift = shiftXCm;
          c1Max.textContent = `最大横ズレ: ${shiftXCm} cm`;
        }
        if (shiftYCm > records.maxHeadShiftY && shiftYCm <= 50) {
          records.maxHeadShiftY = shiftYCm;
          c2Max.textContent = `最大上下: ${shiftYCm} cm`;
        }
      }
    }

    if (topWrist && frontHeel) {
      const lowestGroundY = Math.max(frontHeel.y, backHeel ? backHeel.y : frontHeel.y) * b.h;
      const currentHandH = Math.round(Math.max(0, lowestGroundY - topWrist.y * b.h) / activePxPerCm);
      if (Number.isFinite(currentHandH) && currentHandH >= 30 && currentHandH <= Math.round(userHeightCm * 1.4)) {
        currentCalculatedState.impactHandHeightCm = currentHandH;
        if (currentHandH > records.maxTopHandH) {
          records.maxTopHandH = currentHandH;
          currentCalculatedState.topHandHeightCm = currentHandH;
          c7Val.textContent = `${currentHandH} cm`;
          c7Max.textContent = `最高: ${currentHandH} cm`;
        } else {
          c7Val.textContent = `${records.maxTopHandH || currentHandH} cm`;
        }
        c8Val.textContent = `${currentHandH} cm`;
      }
    }

    if (selectedAngleMode === 'FRONT') {
      if (frontShoulder && backShoulder) {
        const dx = (frontShoulder.x - backShoulder.x);
        const dz = ((frontShoulder.z || 0) - (backShoulder.z || 0));
        const shoulderSpan = Math.hypot(dx, dz);
        let openRatio = Math.abs(dx) / (shoulderSpan || 1);
        let rawOpenAngle = Math.round(Math.asin(Math.min(1.0, Math.max(0.0, openRatio))) * (180.0 / Math.PI));
        
        let sLabel = "◎ タメ十分 (壁キープ)";
        if (rawOpenAngle > 25) {
          sLabel = "! 開き早い (胸が正対)";
        } else if (rawOpenAngle > 18) {
          sLabel = "やや開き";
        }
        currentCalculatedState.shoulderOpenDeg = rawOpenAngle;
        currentCalculatedState.shoulderOpenLabel = sLabel;
        c3Val.textContent = `${rawOpenAngle}°`;
        if (!records.impactShoulderOpenLabel) {
          c3Max.textContent = `状態: ${sLabel}`;
        }
      }

      if (frontHeel && backHeel) {
        const stepOffsetPx = Math.abs((frontHeel.x - backHeel.x) * b.w);
        const inStepCm = Math.round(stepOffsetPx / activePxPerCm);
        const isCross = isRightBatter ? (frontHeel.x > backHeel.x) : (frontHeel.x < backHeel.x);
        const dirLabel = inStepCm <= 4 ? "まっすぐ" : (isCross ? "インステップ" : "アウトステップ");

        currentCalculatedState.inStepCm = inStepCm;
        currentCalculatedState.inStepDir = dirLabel;
        c4Val.textContent = `${inStepCm} cm`;
        if (inStepCm > records.maxInStepCm && inStepCm <= 45) {
          records.maxInStepCm = inStepCm;
          records.inStepDir = dirLabel;
          c4Max.textContent = `最大ズレ: ${inStepCm} cm (${dirLabel})`;
        }
      }

      if (frontHip && frontKnee && frontAnkle) {
        const thighAngle = Math.atan2(frontKnee.y - frontHip.y, frontKnee.x - frontHip.x);
        const shankAngle = Math.atan2(frontAnkle.y - frontKnee.y, frontAnkle.x - frontKnee.x);
        let valgusDiff = (shankAngle - thighAngle) * 180.0 / Math.PI;

        if (valgusDiff > 180) valgusDiff -= 360;
        if (valgusDiff < -180) valgusDiff += 360;

        let devAngle = isRightBatter ? valgusDiff : -valgusDiff;
        let absDev = Math.min(30, Math.round(Math.abs(devAngle)));
        let valgusStatus = "◎ 踏ん張り良好";

        if (absDev > 10) {
          valgusStatus = (devAngle > 0) ? "! 割れ(外逃げ)" : "! 内入り";
        } else if (absDev > 6) {
          valgusStatus = (devAngle > 0) ? "やや開き" : "やや内";
        }

        currentCalculatedState.kneeValgusAngle = absDev;
        currentCalculatedState.kneeValgusLabel = valgusStatus;
        c6Val.textContent = `${absDev}°`;
        if (!records.impactKneeValgusLabel) {
          c6Max.textContent = `状態: ${valgusStatus}`;
        }
      }
    }

    if (leadElbowJoints.s && leadElbowJoints.e && leadElbowJoints.w) {
      const rawLeadElbowAngle = calcJointAngle3D(leadElbowJoints.s, leadElbowJoints.e, leadElbowJoints.w);
      if (Number.isFinite(rawLeadElbowAngle) && rawLeadElbowAngle >= 35 && rawLeadElbowAngle <= 180) {
        const leadDeg = Math.round(rawLeadElbowAngle);
        currentCalculatedState.leadElbowAngle = leadDeg;
        c9Val.textContent = `${leadDeg} °`;
      }
    }

    if (backElbowJoints.s && backElbowJoints.e && backElbowJoints.w) {
      const rawBackElbowAngle = calcJointAngle3D(backElbowJoints.s, backElbowJoints.e, backElbowJoints.w);
      if (Number.isFinite(rawBackElbowAngle) && rawBackElbowAngle >= 35 && rawBackElbowAngle <= 180) {
        const backDeg = Math.round(rawBackElbowAngle);
        currentCalculatedState.backElbowAngle = backDeg;
        c10Val.textContent = `${backDeg} °`;
      }
    }
  }

  outputCtx.restore();
}

function drawBattingSkeleton(landmarks, ox, oy, bw, bh, isRightBatter) {
  const connections = [
    [11, 12], [11, 13], [13, 15], [15, 17], [15, 19],
    [12, 14], [14, 16], [16, 18], [16, 20],
    [11, 23], [12, 24], [23, 24],
    [23, 25], [25, 27], [27, 29], [29, 31],
    [24, 26], [26, 28], [28, 30], [30, 32]
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

  const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28, 31, 32];
  const frontKneeIdx = isRightBatter ? 25 : 26;
  const backElbowIdx = isRightBatter ? 14 : 13;

  keyJoints.forEach(idx => {
    const p = landmarks[idx];
    if (p) {
      let drawX = ox + p.x * bw;
      let drawY = oy + p.y * bh;
      outputCtx.beginPath();
      
      let radius = 5;
      if ([15, 16].includes(idx)) radius = 7;
      if (idx === frontKneeIdx) radius = 7;
      if (idx === backElbowIdx) radius = 6;
      
      outputCtx.arc(drawX, drawY, radius, 0, Math.PI * 2);
      
      if ([15, 16].includes(idx)) {
        outputCtx.fillStyle = "#f59e0b";
      } else if (idx === frontKneeIdx) {
        outputCtx.fillStyle = "#ffe600";
      } else if (idx === backElbowIdx) {
        outputCtx.fillStyle = "#f43f5e";
      } else {
        outputCtx.fillStyle = "#34d399";
      }
      
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
    btnPlayPause.textContent = "再生";
    btnPlayPause.style.background = "linear-gradient(135deg, #f59e0b, #d97706)";
  } else {
    btnPlayPause.textContent = "停止";
    btnPlayPause.style.background = "linear-gradient(135deg, #10b981, #059669)";
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

seekBar.addEventListener('input', () => {
  if (!Number.isFinite(videoElement.duration) || videoElement.duration === 0) return;
  videoElement.pause();
  videoElement.currentTime = (seekBar.value / 100) * videoElement.duration;
  updateTimeUI();
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
    maxTwistSigned: 0, twistStatusLabel: null, impactKneeFlex: null, maxStride: 0, maxTrunkTilt: 0,
    maxHeadShift: 0, maxHeadShiftY: 0, maxTopHandH: 0, impactHandH: null,
    impactShoulderOpen: null, impactShoulderOpenLabel: null, maxInStepCm: 0, inStepDir: "まっすぐ",
    impactKneeValgus: null, impactKneeValgusLabel: null,
    takebackLeadElbow: null, impactBackElbow: null
  };
  initialNoseX = null;
  initialNoseY = null;
  updateCardLabels();
  showToast("最大値をリセットしました");
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
  zoomPan = {x: 0, y: 0 };
  initialNoseX = null;
  initialNoseY = null;
  updateZoomBadge();
  setStep(1);
});

document.addEventListener('DOMContentLoaded', () => {
  populatePastPlayers();
});
