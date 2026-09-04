    const SUPABASE_URL = "https://mzdzznqeaovejzjicift.supabase.co";
    const SUPABASE_KEY = "sb_publishable_nB5WDsbADtvwaIlHjUCr-g_F9hMMbhO";

    let currentTeamId = localStorage.getItem('baseball_team_id') || '安岡少年軟式野球部';
    localStorage.setItem('baseball_team_id', currentTeamId);

    let coachPasscode = localStorage.getItem('coach_passcode') || '1234';
    let isCoachUnlocked = false;

    let rawAllCloudRecords = [];
    let cloudRecords = [];
    let playerChartInstance = null;
    let coachChartInstance = null;

    let currentCoachSelectedPlayer = null;
    let playerPeriod = 'ALL';
    let coachPeriod = 'ALL';

    // 投球・打撃の指標マスタ
    const PITCHING_METRICS = [
      { key: 'stride', label: '🚶 歩幅', unit: 'cm' },
      { key: 'strideRatio', label: '🚶 歩幅率', unit: '%' },
      { key: 'mer', label: '💪 腕のしなり/肩外旋', unit: '°' },
      { key: 'twist', label: '🔄 捻転差', unit: '°' },
      { key: 'headShift', label: '👀 頭の突っ込み', unit: 'cm' },
      { key: 'headShiftY', label: '👀 頭の上下動', unit: 'cm' },
      { key: 'releaseH', label: '⚾ リリース高', unit: 'cm' },
      { key: 'trunkTilt', label: '📐 体幹前傾', unit: '°' },
      { key: 'ffKneeFlex', label: '🦵 前足ヒザ屈曲', unit: '°' }
    ];

    const BATTING_METRICS = [
      { key: 'twist', label: '🔄 捻転差/タメ', unit: '°' },
      { key: 'impactKneeFlex', label: '🦵 前ヒザの壁', unit: '°' },
      { key: 'stride', label: '🚶 ステップ幅', unit: 'cm' },
      { key: 'strideRatio', label: '🚶 ステップ率', unit: '%' },
      { key: 'headShift', label: '👀 頭の突っ込み', unit: 'cm' },
      { key: 'headShiftY', label: '👀 頭の上下動', unit: 'cm' },
      { key: 'trunkTilt', label: '📐 スイング軸傾斜', unit: '°' },
      { key: 'impactShoulderOpen', label: '🛡️ 前肩の開き', unit: '°' },
      { key: 'takebackLeadElbow', label: '💪 テイクバック前ヒジ', unit: '°' },
      { key: 'impactBackElbow', label: '💥 インパクト後ヒジ', unit: '°' },
      { key: 'inStep', label: '🚶 踏み出しズレ', unit: 'cm' },
      { key: 'topHandH', label: '✊ グリップトップ高', unit: 'cm' },
      { key: 'impactHandH', label: '💥 インパクトグリップ高', unit: 'cm' }
    ];

    function showToast(text, duration = 3000) {
      const toast = document.getElementById('toast-box');
      toast.textContent = text;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), duration);
    }

    function normalizeTeamName(str) {
      if (!str) return '';
      return String(str).replace(/[\s\u3000]/g, '').toLowerCase();
    }

    function getMetricDefinition(category, metricKey) {
      const list = (category === 'PITCHING') ? PITCHING_METRICS : BATTING_METRICS;
      return list.find(m => m.key === metricKey) || { key: metricKey, label: metricKey, unit: '°' };
    }

    function safeGetTime(r) {
      if (!r) return 0;
      if (r.created_at) {
        const t = new Date(r.created_at).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      if (r.date) {
        const cleanDate = String(r.date).replace(/-/g, '/');
        const cleanTime = r.time ? String(r.time).slice(0, 5) : '12:00';
        const t = new Date(`${cleanDate} ${cleanTime}`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return Number(r.id) || 0;
    }

    function getAllUnifiedRecords() {
      let combined = [...cloudRecords];

      try {
        const pLocals = JSON.parse(localStorage.getItem('pitching_ai_records_v1') || '[]');
        pLocals.forEach(p => {
          combined.push({
            id: 'local_p_' + (p.id || Math.random()),
            player_name: p.playerName,
            category: 'PITCHING',
            date: p.date,
            time: p.time,
            created_at: p.date ? p.date.replace(/\//g, '-') + 'T' + (p.time || '12:00') + ':00' : null,
            height: p.height,
            angle_mode: p.mode,
            metrics: p.metrics || {},
            feel_grade: p.feelGrade,
            body_condition: p.bodyCondition
          });
        });

        const bLocals = JSON.parse(localStorage.getItem('batting_ai_records_v1') || '[]');
        bLocals.forEach(b => {
          combined.push({
            id: 'local_b_' + (b.id || Math.random()),
            player_name: b.playerName,
            category: 'BATTING',
            date: b.date,
            time: b.time,
            created_at: b.date ? b.date.replace(/\//g, '-') + 'T' + (b.time || '12:00') + ':00' : null,
            height: b.height,
            angle_mode: b.mode,
            metrics: b.metrics || {},
            feel_grade: b.feelGrade,
            body_condition: b.bodyCondition
          });
        });
      } catch (e) {}

      const seen = new Set();
      const unique = [];
      combined.forEach(r => {
        const sig = `${r.player_name}_${r.category}_${r.date}_${r.time || ''}_${r.metrics?.twist || ''}_${r.metrics?.stride || ''}_${r.metrics?.mer || ''}`;
        if (!seen.has(sig)) {
          seen.add(sig);
          unique.push(r);
        }
      });

      return unique;
    }

    document.addEventListener('DOMContentLoaded', () => {
      document.getElementById('current-team-name').textContent = currentTeamId;
      initTabs();
      initTeamModal();
      initCoachAuth();
      initMetricSelects();
      fetchCloudRecords();
    });

    function initTabs() {
      const tabPlayer = document.getElementById('tab-btn-player');
      const tabCoach = document.getElementById('tab-btn-coach');
      const contentPlayer = document.getElementById('tab-player');
      const contentCoach = document.getElementById('tab-coach');

      tabPlayer.addEventListener('click', () => {
        tabPlayer.classList.add('active');
        tabCoach.classList.remove('active');
        contentPlayer.classList.add('active');
        contentCoach.classList.remove('active');
        renderPlayerPersonalView();
      });

      tabCoach.addEventListener('click', async () => {
        if (!isCoachUnlocked) {
          openPassModal();
        } else {
          await activateCoachTab();
        }
      });

      document.getElementById('btn-coach-refresh').addEventListener('click', async () => {
        const btn = document.getElementById('btn-coach-refresh');
        btn.textContent = "⏳ 更新中...";
        await fetchCloudRecords(true);
        btn.textContent = "🔄 最新更新";
      });
    }

    async function activateCoachTab() {
      document.getElementById('tab-btn-coach').classList.add('active');
      document.getElementById('tab-btn-player').classList.remove('active');
      document.getElementById('tab-coach').classList.add('active');
      document.getElementById('tab-player').classList.remove('active');
      
      await fetchCloudRecords(false);
      renderCoachView();
    }

    function openPassModal() {
      document.getElementById('input-passcode').value = '';
      document.getElementById('pass-modal').style.display = 'flex';
      setTimeout(() => document.getElementById('input-passcode').focus(), 100);
    }

    function initCoachAuth() {
      document.getElementById('btn-close-pass-modal').addEventListener('click', () => {
        document.getElementById('pass-modal').style.display = 'none';
      });

      document.getElementById('btn-submit-passcode').addEventListener('click', async () => {
        const input = document.getElementById('input-passcode').value.trim();
        if (input === coachPasscode) {
          isCoachUnlocked = true;
          document.getElementById('pass-modal').style.display = 'none';
          showToast("🔓 指導者メニューを解除しました！");
          await activateCoachTab();
        } else {
          showToast("❌ 暗証番号が違います");
        }
      });

      document.getElementById('btn-lock-coach').addEventListener('click', () => {
        isCoachUnlocked = false;
        document.getElementById('tab-btn-player').click();
        showToast("🔒 指導者画面をロックしました");
      });

      document.getElementById('btn-change-pass').addEventListener('click', () => {
        const newP = prompt("新しい4桁の暗証番号を入力してください:", coachPasscode);
        if (newP && newP.trim().length >= 4) {
          coachPasscode = newP.trim();
          localStorage.setItem('coach_passcode', coachPasscode);
          showToast("✅ 暗証番号を変更しました！");
        }
      });
    }

    function initTeamModal() {
      const badge = document.getElementById('team-badge-btn');
      const modal = document.getElementById('team-modal');
      badge.addEventListener('click', () => {
        document.getElementById('input-team-name').value = currentTeamId;
        modal.style.display = 'flex';
      });

      document.getElementById('btn-close-team-modal').addEventListener('click', () => {
        modal.style.display = 'none';
      });

      document.getElementById('btn-save-team-name').addEventListener('click', async () => {
        const newTeam = document.getElementById('input-team-name').value.trim();
        if (newTeam) {
          currentTeamId = newTeam;
          localStorage.setItem('baseball_team_id', currentTeamId);
          document.getElementById('current-team-name').textContent = currentTeamId;
          modal.style.display = 'none';
          showToast(`✅ チームアカウントを【${currentTeamId}】に変更しました`);
          await fetchCloudRecords(true);
        }
      });
    }

    async function fetchCloudRecords(isManual = false) {
      const statusText = document.getElementById('cloud-status-text');
      statusText.textContent = "同期中...";

      try {
        const url = `${SUPABASE_URL}/rest/v1/baseball_records?select=*&order=id.desc&limit=500`;
        const res = await fetch(url, {
          method: "GET",
          headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`
          }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        rawAllCloudRecords = data || [];

        const targetNorm = normalizeTeamName(currentTeamId);
        cloudRecords = rawAllCloudRecords.filter(r => {
          return normalizeTeamName(r.team_id) === targetNorm;
        });

        statusText.textContent = "同期完了";

        renderPlayerPersonalView();
        if (isCoachUnlocked) renderCoachView();

        if (isManual) {
          showToast(`✅ 【${currentTeamId}】のデータを更新しました！\n（${cloudRecords.length}件の記録を受信）`);
        }
      } catch (err) {
        statusText.textContent = "通信エラー";
        if (isManual) {
          showToast(`❌ 同期に失敗しました: ${err.message}`);
        }
      }
    }

    function renderPlayerPersonalView() {
      const select = document.getElementById('player-personal-select');
      const prevVal = select.value;
      select.innerHTML = '';

      const allData = getAllUnifiedRecords();
      const pNames = Array.from(new Set(allData.map(r => r.player_name).filter(Boolean)));

      if (pNames.length === 0) {
        select.innerHTML = '<option value="">(カルテ未測定)</option>';
        updatePlayerChart();
        return;
      }

      pNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `👤 ${name}`;
        select.appendChild(opt);
      });

      if (pNames.includes(prevVal)) {
        select.value = prevVal;
      }

      updatePlayerChart();
      updatePlayerCompareDates();
    }

    // ==========================================
    // 📌 【ピン留め機能 ＆ 指標セレクト初期化】
    // ==========================================
    function initMetricSelects() {
      const fillMetrics = (catSelectId, metricSelectId) => {
        const cat = document.getElementById(catSelectId).value;
        const metricSelect = document.getElementById(metricSelectId);
        metricSelect.innerHTML = '';
        const list = (cat === 'PITCHING') ? PITCHING_METRICS : BATTING_METRICS;
        list.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.key;
          opt.textContent = `${m.label} (${m.unit})`;
          metricSelect.appendChild(opt);
        });
      };

      // 📌 選手画面のピン留め復元（デフォルト：BATTING 打撃指標）
      const pinnedPlayerCat = localStorage.getItem('pinned_graph_category_player') || 'BATTING';
      const pinnedPlayerMetric = localStorage.getItem('pinned_graph_metric_player');
      document.getElementById('player-category-select').value = pinnedPlayerCat;
      fillMetrics('player-category-select', 'player-metric-select');
      if (pinnedPlayerMetric) {
        const optExists = Array.from(document.getElementById('player-metric-select').options).some(o => o.value === pinnedPlayerMetric);
        if (optExists) document.getElementById('player-metric-select').value = pinnedPlayerMetric;
      }
      updatePinButtonUI('player');

      // 📌 指導者画面のピン留め復元（デフォルト：BATTING 打撃指標）
      const pinnedCoachCat = localStorage.getItem('pinned_graph_category_coach') || 'BATTING';
      const pinnedCoachMetric = localStorage.getItem('pinned_graph_metric_coach');
      document.getElementById('coach-category-select').value = pinnedCoachCat;
      fillMetrics('coach-category-select', 'coach-metric-select');
      if (pinnedCoachMetric) {
        const optExists = Array.from(document.getElementById('coach-metric-select').options).some(o => o.value === pinnedCoachMetric);
        if (optExists) document.getElementById('coach-metric-select').value = pinnedCoachMetric;
      }
      updatePinButtonUI('coach');

      // 選手側イベントリスナー
      document.getElementById('player-category-select').addEventListener('change', () => {
        fillMetrics('player-category-select', 'player-metric-select');
        updatePinButtonUI('player');
        updatePlayerChart();
      });

      document.getElementById('player-metric-select').addEventListener('change', () => {
        updatePinButtonUI('player');
        updatePlayerChart();
      });

      document.getElementById('btn-pin-player-category').addEventListener('click', () => {
        togglePin('player');
      });

      // 指導者側イベントリスナー
      document.getElementById('coach-category-select').addEventListener('change', () => {
        fillMetrics('coach-category-select', 'coach-metric-select');
        updatePinButtonUI('coach');
        updateCoachChart();
      });

      document.getElementById('coach-metric-select').addEventListener('change', () => {
        updatePinButtonUI('coach');
        updateCoachChart();
      });

      document.getElementById('btn-pin-coach-category').addEventListener('click', () => {
        togglePin('coach');
      });

      document.getElementById('player-personal-select').addEventListener('change', () => {
        updatePlayerChart();
        updatePlayerCompareDates();
      });

      document.getElementById('player-compare-category-select').addEventListener('change', () => {
        updatePlayerCompareDates();
      });
      document.getElementById('coach-compare-category-select').addEventListener('change', () => {
        updateCoachCompareDates();
      });

      document.querySelectorAll('#player-period-chips .period-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('#player-period-chips .period-chip').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          playerPeriod = e.currentTarget.getAttribute('data-period');
          updatePlayerChart();
        });
      });

      document.querySelectorAll('#coach-period-chips .period-chip').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('#coach-period-chips .period-chip').forEach(b => b.classList.remove('active'));
          e.currentTarget.classList.add('active');
          coachPeriod = e.currentTarget.getAttribute('data-period');
          updateCoachChart();
        });
      });

      document.getElementById('btn-player-mode-trend').addEventListener('click', () => {
        document.getElementById('btn-player-mode-trend').classList.add('active');
        document.getElementById('btn-player-mode-compare').classList.remove('active');
        document.getElementById('player-trend-area').style.display = 'flex';
        document.getElementById('player-compare-area').style.display = 'none';
      });

      document.getElementById('btn-player-mode-compare').addEventListener('click', () => {
        document.getElementById('btn-player-mode-compare').classList.add('active');
        document.getElementById('btn-player-mode-trend').classList.remove('active');
        document.getElementById('player-compare-area').style.display = 'flex';
        document.getElementById('player-trend-area').style.display = 'none';
        updatePlayerCompareDates();
      });

      document.getElementById('btn-coach-mode-trend').addEventListener('click', () => {
        document.getElementById('btn-coach-mode-trend').classList.add('active');
        document.getElementById('btn-coach-mode-compare').classList.remove('active');
        document.getElementById('coach-trend-area').style.display = 'flex';
        document.getElementById('coach-compare-area').style.display = 'none';
      });

      document.getElementById('btn-coach-mode-compare').addEventListener('click', () => {
        document.getElementById('btn-coach-mode-compare').classList.add('active');
        document.getElementById('btn-coach-mode-trend').classList.remove('active');
        document.getElementById('coach-compare-area').style.display = 'flex';
        document.getElementById('coach-trend-area').style.display = 'none';
        updateCoachCompareDates();
      });

      document.getElementById('player-compare-date-1').addEventListener('change', renderPlayerCompareTable);
      document.getElementById('player-compare-date-2').addEventListener('change', renderPlayerCompareTable);
      document.getElementById('coach-compare-date-1').addEventListener('change', renderCoachCompareTable);
      document.getElementById('coach-compare-date-2').addEventListener('change', renderCoachCompareTable);
    }

    // ピン留めUIの更新
    function updatePinButtonUI(target) {
      const catSelect = document.getElementById(`${target}-category-select`);
      const metricSelect = document.getElementById(`${target}-metric-select`);
      const pinBtn = document.getElementById(`btn-pin-${target}-category`);
      const pinText = document.getElementById(`pin-text-${target}`);

      const pinnedCat = localStorage.getItem(`pinned_graph_category_${target}`) || 'BATTING';
      const pinnedMetric = localStorage.getItem(`pinned_graph_metric_${target}`) || '';

      const isCurrentPinned = (catSelect.value === pinnedCat && (!pinnedMetric || metricSelect.value === pinnedMetric));

      if (isCurrentPinned) {
        pinBtn.classList.add('pinned');
        pinText.textContent = '固定中';
      } else {
        pinBtn.classList.remove('pinned');
        pinText.textContent = '初期固定';
      }
    }

    // ピン留めのアクション実行
    function togglePin(target) {
      const catSelect = document.getElementById(`${target}-category-select`);
      const metricSelect = document.getElementById(`${target}-metric-select`);
      const currentCat = catSelect.value;
      const currentMetric = metricSelect.value;

      localStorage.setItem(`pinned_graph_category_${target}`, currentCat);
      localStorage.setItem(`pinned_graph_metric_${target}`, currentMetric);

      updatePinButtonUI(target);

      const catLabel = currentCat === 'BATTING' ? '🏏 打撃' : '⚾ 投球';
      const metricDef = getMetricDefinition(currentCat, currentMetric);
      showToast(`📌 【${catLabel} / ${metricDef.label}】をアプリ起動時の初期表示に固定しました！`);
    }

    function filterRecordsByPeriod(recs, periodCode) {
      if (periodCode === 'ALL') return recs;
      const nowMs = Date.now();
      let limitMs = nowMs;

      const ONE_DAY = 24 * 60 * 60 * 1000;
      if (periodCode === '1W') limitMs -= 7 * ONE_DAY;
      else if (periodCode === '1M') limitMs -= 30 * ONE_DAY;
      else if (periodCode === '1Y') limitMs -= 365 * ONE_DAY;
      else if (periodCode === '2Y') limitMs -= 2 * 365 * ONE_DAY;
      else if (periodCode === '3Y') limitMs -= 3 * 365 * ONE_DAY;
      else if (periodCode === '4Y') limitMs -= 4 * 365 * ONE_DAY;
      else if (periodCode === '5Y') limitMs -= 5 * 365 * ONE_DAY;
      else if (periodCode === '6Y') limitMs -= 6 * 365 * ONE_DAY;

      return recs.filter(r => safeGetTime(r) >= limitMs);
    }

    // 📈 グラフ描画（同日重なり解消 ＆ 単位完全連動）
    function buildChartDataAndOptions(recs, category, metricKey, isCoach = false) {
      const metricDef = getMetricDefinition(category, metricKey);
      const unit = metricDef.unit;

      recs.sort((a, b) => safeGetTime(a) - safeGetTime(b));

      const dayTracker = {};
      const labels = recs.map(r => {
        const dStr = (r.date || r.created_at?.slice(0, 10) || '').slice(5, 10);
        const tStr = r.time ? String(r.time).slice(0, 5) : '';
        const modeTag = r.angle_mode ? (r.angle_mode === 'SIDE' ? '(横)' : '(正)') : '';

        dayTracker[dStr] = (dayTracker[dStr] || 0) + 1;
        
        if (tStr) {
          return `${dStr} ${tStr} ${modeTag}`.trim();
        } else if (dayTracker[dStr] > 1) {
          return `${dStr} #${dayTracker[dStr]} ${modeTag}`.trim();
        } else {
          return `${dStr} ${modeTag}`.trim();
        }
      });

      const values = recs.map(r => {
        if (!r.metrics) return null;
        let v = r.metrics[metricKey];
        if (v === undefined || v === null) {
          if (metricKey === 'headShift') v = r.metrics.headShiftX;
          if (metricKey === 'impactShoulderOpen') v = r.metrics.shoulderOpen;
          if (metricKey === 'ffKneeFlex') v = r.metrics.kneeFlex;
          if (metricKey === 'impactKneeValgus') v = r.metrics.kneeValgus;
        }
        const num = parseFloat(v);
        return Number.isFinite(num) ? num : null;
      });

      const validVals = values.filter(v => v !== null);
      const latestVal = validVals.length ? validVals[validVals.length - 1] : null;
      const latestText = latestVal !== null ? `${latestVal} ${unit}` : `-- ${unit}`;

      if (!isCoach) {
        document.getElementById('player-metric-name').textContent = metricDef.label;
        document.getElementById('player-metric-latest').textContent = latestText;
      } else {
        document.getElementById('coach-metric-name').textContent = metricDef.label;
        document.getElementById('coach-metric-latest').textContent = latestText;
      }

      return {
        chartData: {
          labels: labels.length ? labels : ['データなし'],
          datasets: [{
            label: `${metricDef.label} (${unit})`,
            data: values.length ? values : [0],
            borderColor: isCoach ? '#f59e0b' : '#0284c7',
            backgroundColor: isCoach ? 'rgba(245, 158, 11, 0.12)' : 'rgba(2, 132, 199, 0.1)',
            borderWidth: 2.5,
            pointRadius: 4.5,
            pointBackgroundColor: isCoach ? '#0284c7' : '#ff5e36',
            fill: true,
            tension: 0.25
          }]
        },
        chartOptions: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  return `${context.dataset.label}: ${context.parsed.y} ${unit}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: false,
              ticks: {
                font: { size: 10, weight: 'bold' },
                callback: function(val) {
                  return val + ' ' + unit;
                }
              }
            },
            x: {
              ticks: {
                font: { size: 8.5, weight: 'bold' },
                maxRotation: 45,
                minRotation: 0
              }
            }
          }
        }
      };
    }

    function updatePlayerChart() {
      const playerName = document.getElementById('player-personal-select').value;
      const category = document.getElementById('player-category-select').value;
      const metricKey = document.getElementById('player-metric-select').value;

      const allData = getAllUnifiedRecords();
      let recs = allData.filter(r => r.player_name === playerName && r.category === category);
      recs = filterRecordsByPeriod(recs, playerPeriod);

      const { chartData, chartOptions } = buildChartDataAndOptions(recs, category, metricKey, false);

      const ctx = document.getElementById('player-chart').getContext('2d');
      if (playerChartInstance) playerChartInstance.destroy();
      playerChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
      });
    }

    function updateCoachChart() {
      if (!currentCoachSelectedPlayer) return;
      const category = document.getElementById('coach-category-select').value;
      const metricKey = document.getElementById('coach-metric-select').value;

      let recs = cloudRecords.filter(r => r.player_name === currentCoachSelectedPlayer && r.category === category);
      recs = filterRecordsByPeriod(recs, coachPeriod);

      const { chartData, chartOptions } = buildChartDataAndOptions(recs, category, metricKey, true);

      const ctx = document.getElementById('coach-chart').getContext('2d');
      if (coachChartInstance) coachChartInstance.destroy();
      coachChartInstance = new Chart(ctx, {
        type: 'line',
        data: chartData,
        options: chartOptions
      });
    }

    function getConditionMeta(lastRec) {
      if (!lastRec) {
        return { face: '😐', label: '未測定', class: 'cond-normal', praise: 'いつでも測定お待ちしています！' };
      }
      const feel = lastRec.feel_grade || '';
      const body = lastRec.body_condition || '';

      if (body.includes('違和感') || body.includes('痛みあり')) {
        return { 
          face: '🚨', 
          label: '要ケア', 
          class: 'cond-care', 
          praise: `【要ケア】ひじ・肩・腰に違和感ありと報告。「無理せず軽めのメニューにしよう」と優しく声をかけてあげてください！` 
        };
      }
      if (body.includes('重い')) {
        return { 
          face: '🟡', 
          label: '重い', 
          class: 'cond-down', 
          praise: `「ちょっと体張ってるみたいだな。入念にストレッチしてから入ろう！」と声かけが効果的です。` 
        };
      }
      if (feel.includes('良かった') || feel.includes('芯')) {
        return { 
          face: '🔥', 
          label: '絶好調', 
          class: 'cond-fire', 
          praise: `「最近キレがいいな！今の感覚バッチリだぞ！」と思い切り褒めてあげるとさらに伸びます！` 
        };
      }
      if (feel.includes('ふつう') || feel.includes('いつも通り')) {
        return { 
          face: '😄', 
          label: '好調', 
          class: 'cond-up', 
          praise: `「フォームが安定してきたな！」と継続の努力を認めてあげましょう。` 
        };
      }
      return { 
        face: '🙂', 
        label: '順調', 
        class: 'cond-normal', 
        praise: `「焦らず自分のペースでフォームを作っていこう！」と背中を押してあげてください。` 
      };
    }

    function renderCoachView() {
      const diagnosticBanner = document.getElementById('coach-diagnostic-banner');
      const otherTeams = Array.from(new Set(rawAllCloudRecords.map(r => r.team_id).filter(Boolean)));
      const otherNonMatchTeams = otherTeams.filter(t => normalizeTeamName(t) !== normalizeTeamName(currentTeamId));

      if (cloudRecords.length === 0 && otherNonMatchTeams.length > 0) {
        diagnosticBanner.style.display = 'flex';
        diagnosticBanner.innerHTML = `
          <div>⚠️ <b>チーム名の不一致を検出しました！</b></div>
          <div>クラウド上に <b>【${otherNonMatchTeams.join(', ')}】</b> として保存されたデータ（${rawAllCloudRecords.length}件）が見つかりました。<br>
          送信側のスマホでチーム名が「${otherNonMatchTeams[0]}」のままになっている可能性があります。</div>
        `;
      } else {
        diagnosticBanner.style.display = 'none';
      }

      const playerNames = Array.from(new Set(cloudRecords.map(r => r.player_name).filter(Boolean)));
      document.getElementById('coach-player-count').textContent = `${playerNames.length}名`;

      const grid = document.getElementById('coach-pawapro-grid');
      grid.innerHTML = '';

      if (playerNames.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:15px; font-size:0.75rem; color:#94a3b8; font-weight:800;">
          【${currentTeamId}】の選手データはまだ届いていません。<br>
          （選手側のスマホのカルテで「☁️ チームに送信」を押したか確認してください）
        </div>`;
        return;
      }

      if (!currentCoachSelectedPlayer || !playerNames.includes(currentCoachSelectedPlayer)) {
        currentCoachSelectedPlayer = playerNames[0];
      }

      playerNames.forEach(name => {
        const pRecs = cloudRecords.filter(r => r.player_name === name);
        pRecs.sort((a, b) => safeGetTime(b) - safeGetTime(a));
        const latest = pRecs[0];
        const meta = getConditionMeta(latest);

        const card = document.createElement('div');
        card.className = `player-condition-card ${name === currentCoachSelectedPlayer ? 'selected' : ''}`;
        card.innerHTML = `
          <div class="cond-face">${meta.face}</div>
          <div class="player-card-name">${name}</div>
          <div class="cond-label-badge ${meta.class}">${meta.label}</div>
          <div class="cond-update-date">${latest ? (latest.date || latest.created_at || '').slice(5, 10) : '--/--'}</div>
        `;

        card.addEventListener('click', () => {
          document.querySelectorAll('.player-condition-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          currentCoachSelectedPlayer = name;
          updateCoachSelectedPlayerView();
        });

        grid.appendChild(card);
      });

      updateCoachSelectedPlayerView();
      initCleanupModalSelect(playerNames);
    }

    function updateCoachSelectedPlayerView() {
      if (!currentCoachSelectedPlayer) return;
      document.getElementById('coach-selected-name').textContent = `👤 ${currentCoachSelectedPlayer} 選手の分析`;

      const pRecs = cloudRecords.filter(r => r.player_name === currentCoachSelectedPlayer);
      pRecs.sort((a, b) => safeGetTime(b) - safeGetTime(a));
      const latest = pRecs[0];
      const meta = getConditionMeta(latest);

      document.getElementById('praise-icon').textContent = meta.face;
      document.getElementById('praise-title').textContent = `【${currentCoachSelectedPlayer} 選手への声かけヒント】`;
      document.getElementById('praise-text').textContent = meta.praise;

      updateCoachChart();
      updateCoachCompareDates();
    }

    function updatePlayerCompareDates() {
      const pName = document.getElementById('player-personal-select').value;
      const cat = document.getElementById('player-compare-category-select').value;
      const d1 = document.getElementById('player-compare-date-1');
      const d2 = document.getElementById('player-compare-date-2');
      fillCompareDropdowns(pName, cat, d1, d2, false);
      renderPlayerCompareTable();
    }

    function updateCoachCompareDates() {
      const cat = document.getElementById('coach-compare-category-select').value;
      const d1 = document.getElementById('coach-compare-date-1');
      const d2 = document.getElementById('coach-compare-date-2');
      fillCompareDropdowns(currentCoachSelectedPlayer, cat, d1, d2, true);
      renderCoachCompareTable();
    }

    function fillCompareDropdowns(playerName, category, sel1, sel2, isCoachOnly = false) {
      sel1.innerHTML = '';
      sel2.innerHTML = '';
      if (!playerName) return;

      const allData = isCoachOnly ? cloudRecords : getAllUnifiedRecords();
      const recs = allData.filter(r => r.player_name === playerName && r.category === category);
      recs.sort((a, b) => safeGetTime(a) - safeGetTime(b));

      if (recs.length === 0) {
        sel1.innerHTML = '<option value="">(記録なし)</option>';
        sel2.innerHTML = '<option value="">(記録なし)</option>';
        return;
      }

      recs.forEach((r, idx) => {
        const title = `${r.date || r.created_at?.slice(0,10)} ${r.time ? String(r.time).slice(0,5) : ''} (${r.angle_mode === 'SIDE' ? '横' : '正'})`.trim();
        const opt1 = document.createElement('option');
        opt1.value = r.id;
        opt1.textContent = `過去: ${title}`;
        sel1.appendChild(opt1);

        const opt2 = document.createElement('option');
        opt2.value = r.id;
        opt2.textContent = `最新: ${title}`;
        sel2.appendChild(opt2);
      });

      sel1.selectedIndex = 0;
      sel2.selectedIndex = recs.length - 1;
    }

    function renderCompareTableGeneric(sel1Id, sel2Id, tbodyId, th1Id, th2Id, isCoachOnly = false) {
      const id1 = document.getElementById(sel1Id).value;
      const id2 = document.getElementById(sel2Id).value;
      const tbody = document.getElementById(tbodyId);
      tbody.innerHTML = '';

      const allData = isCoachOnly ? cloudRecords : getAllUnifiedRecords();
      const r1 = allData.find(r => String(r.id) === String(id1));
      const r2 = allData.find(r => String(r.id) === String(id2));

      if (!r1 || !r2) {
        tbody.innerHTML = '<tr><td colspan="4" style="color:#94a3b8;">比較する2回のデータを選んでください</td></tr>';
        return;
      }

      document.getElementById(th1Id).textContent = (r1.date || r1.created_at?.slice(0,10) || '過去');
      document.getElementById(th2Id).textContent = (r2.date || r2.created_at?.slice(0,10) || '最新');

      const isPitch = (r2.category === 'PITCHING');
      const metricsList = isPitch ? PITCHING_METRICS : BATTING_METRICS;

      if (r1.height && r2.height) {
        const diffH = r2.height - r1.height;
        const diffText = diffH > 0 ? `+${diffH} cm` : `${diffH} cm`;
        tbody.innerHTML += `
          <tr style="background:#f0fdf4;">
            <td style="font-weight:900; color:#0369a1;">🌱 身長の伸び</td>
            <td>${r1.height} cm</td>
            <td>${r2.height} cm</td>
            <td class="diff-plus">${diffText}</td>
          </tr>
        `;
      }

      metricsList.forEach(m => {
        let v1 = r1.metrics?.[m.key];
        let v2 = r2.metrics?.[m.key];

        if (v1 === undefined && m.key === 'impactShoulderOpen') v1 = r1.metrics?.shoulderOpen;
        if (v2 === undefined && m.key === 'impactShoulderOpen') v2 = r2.metrics?.shoulderOpen;
        if (v1 === undefined && m.key === 'ffKneeFlex') v1 = r1.metrics?.kneeFlex;
        if (v2 === undefined && m.key === 'ffKneeFlex') v2 = r2.metrics?.kneeFlex;

        if (v1 !== undefined || v2 !== undefined) {
          const val1 = (v1 !== undefined && v1 !== null) ? `${v1} ${m.unit}` : '--';
          const val2 = (v2 !== undefined && v2 !== null) ? `${v2} ${m.unit}` : '--';

          let diffElem = '<td>--</td>';
          const n1 = parseFloat(v1);
          const n2 = parseFloat(v2);
          if (Number.isFinite(n1) && Number.isFinite(n2)) {
            const diff = Math.round((n2 - n1) * 10) / 10;
            const diffCls = diff >= 0 ? 'diff-plus' : 'diff-minus';
            const sign = diff > 0 ? '+' : '';
            diffElem = `<td class="${diffCls}">${sign}${diff} ${m.unit}</td>`;
          }

          tbody.innerHTML += `
            <tr>
              <td>${m.label}</td>
              <td>${val1}</td>
              <td>${val2}</td>
              ${diffElem}
            </tr>
          `;
        }
      });
    }

    function renderPlayerCompareTable() {
      renderCompareTableGeneric('player-compare-date-1', 'player-compare-date-2', 'player-compare-tbody', 'th-p-date1', 'th-p-date2', false);
    }

    function renderCoachCompareTable() {
      renderCompareTableGeneric('coach-compare-date-1', 'coach-compare-date-2', 'coach-compare-tbody', 'th-c-date1', 'th-c-date2', true);
    }

    function initCleanupModalSelect(playerNames) {
      const select = document.getElementById('cleanup-player-select');
      select.innerHTML = '';
      playerNames.forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = `👤 ${name}`;
        select.appendChild(opt);
      });

      document.getElementById('btn-cleanup-cloud').addEventListener('click', () => {
        document.getElementById('cleanup-modal').style.display = 'flex';
      });

      document.getElementById('btn-close-cleanup').addEventListener('click', () => {
        document.getElementById('cleanup-modal').style.display = 'none';
      });

      document.getElementById('btn-exec-cleanup').addEventListener('click', async () => {
        const targetName = document.getElementById('cleanup-player-select').value;
        if (!targetName) return;
        if (!confirm(`⚠️ 本当に【${targetName}】選手のクラウドデータを全削除しますか？\n（誤送信テストデータの削除用です）`)) return;

        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/baseball_records?player_name=eq.${encodeURIComponent(targetName)}`, {
            method: 'DELETE',
            headers: {
              "apikey": SUPABASE_KEY,
              "Authorization": `Bearer ${SUPABASE_KEY}`
            }
          });
          if (!res.ok) throw new Error("HTTP error " + res.status);
          showToast(`🗑️ 【${targetName}】選手のデータを削除しました`);
          document.getElementById('cleanup-modal').style.display = 'none';
          await fetchCloudRecords(true);
        } catch (e) {
          showToast("❌ 削除に失敗しました: " + e.message);
        }
      });
    }
