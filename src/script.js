// ============================================
// INITIALIZATION
// ============================================

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Lazy load config files
const lazyLoadScript = (src) => {
  if (!window.loadedScripts) window.loadedScripts = new Set();
  if (window.loadedScripts.has(src)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => { window.loadedScripts.add(src); resolve(); };
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

// ============================================
// STORAGE & CONFIGURATION
// ============================================

const storage = {
  get: (key, defaults = {}) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  },
  set: (key, data) => localStorage.setItem(key, JSON.stringify(data))
};

const THEMES = {
  light: {
    bg: '#f2f2f2', text: '#000000', cardBg: '#ffffff', cardBorder: '#e0e0e0',
    inputBg: '#ffffff', inputBorder: '#d0d0d0', primary: '#d400ffff', border: '#d0d0d0', gridLine: '#e0e0e0'
  },
  dark: {
    bg: '#1a1a1a', text: '#ffffff', cardBg: '#2d2d2d', cardBorder: '#444',
    inputBg: '#333', inputBorder: '#555', primary: '#d400ffff', border: '#555', gridLine: '#444'
  }
};

const SECONDARY_COLORS = {
  teal: '#00c9b1',
  blue: '#2196F3',
  purple: '#d400ffff',
  green: '#4CAF50',
  orange: '#FF9800',
  red: '#f44336',
  pink: '#E91E63'
};

// ============================================
// CACHE & DATA MANAGEMENT
// ============================================

async function clearSiteCache() {

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
  }

  localStorage.clear();

  sessionStorage.clear();

  alert("Cache vidé ! La page va se recharger.");

  window.location.reload(true);
}

const getWeightData = () => storage.get('weightData', []);
const getSleepData = () => storage.get('sleepData', []);
const getGoals = () => storage.get('goals', {
  weight: null, fat: null, muscle: null, weightGoal: null,
  weightStart: null, fatStart: null, muscleStart: null
});
const getSettings = () => storage.get('settings', {
  firstname: '', lastname: '', height: '', birthYear: '', theme: 'light', dateFormat: 'fr', secondaryColor: '#d400ffff', allergies: ''
});

function getChartConfig() {
  const theme = getSettings().theme || 'light';
  return THEMES[theme];
}

const save = {
  weight: data => { storage.set('weightData', data); refreshWeightChart(); displayGoals(); displayHomeScreen(); },
  sleep: data => { storage.set('sleepData', data); refreshSleepChart(); displayHomeScreen(); },
  goals: data => { storage.set('goals', data); displayGoals(); },
  sessions: data => { storage.set('sessionsData', data); displaySessionHistory(); updateSessionQuality(); },
  settings: data => { storage.set('settings', data); applyTheme(data.theme, data.secondaryColor); refreshAllGraphs(); displayHomeScreen(); }
};

const formatTime = decHours => {
  const h = Math.floor(decHours), m = Math.round((decHours - h) * 60);
  return h + 'h' + String(m).padStart(2, '0');
};

const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
};

// ============================================
// MODAL MANAGEMENT
// ============================================

const modal = {
  open: (id) => { document.getElementById(id).classList.add('active'); },
  close: (id) => { document.getElementById(id).classList.remove('active'); },
  closeAll: () => { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }
};

// ============================================
// WEIGHT & CHART FUNCTIONS
// ============================================

function openWeightChart() {
  modal.open('weight-modal');
  setTimeout(() => drawWeightChart(), 100);
}

function closeWeightChart() {
  modal.close('weight-modal');
  refreshAllGraphs();
}

function openWeightForm() {
  document.getElementById('weight-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('weight-value').value = '';
  modal.open('weight-form-modal');
}

function closeWeightForm() {
  modal.close('weight-form-modal');
  displayGoals();
  refreshAllGraphs();
}

function saveWeight() {
  const date = document.getElementById('weight-date').value;
  const value = parseFloat(document.getElementById('weight-value').value);

  if (!date || isNaN(value)) {
    alert('Veuillez remplir tous les champs');
    return;
  }

  let data = getWeightData();
  const idx = data.findIndex(d => d.date === date);
  idx >= 0 ? data[idx].value = value : data.push({ date, value });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  save.weight(data);
  closeWeightForm();
  if (window.refreshAISuggestions) {
    setTimeout(() => window.refreshAISuggestions(), 500);
  }
}

function drawWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  const data = getWeightData();
  const ctx = canvas.getContext('2d');
  const config = getChartConfig();

  canvas.width = canvas.offsetWidth;
  canvas.height = 250;

  if (data.length === 0) {
    ctx.fillStyle = config.text || '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée', canvas.width / 2, canvas.height / 2);
    displayWeightList(data);
    return;
  }

  const padding = 40;
  const graphWidth = canvas.width - padding * 2;
  const graphHeight = canvas.height - padding * 2;

  const minWeight = Math.min(...data.map(d => d.value)) - 2;
  const maxWeight = Math.max(...data.map(d => d.value)) + 2;
  const weightRange = maxWeight - minWeight;

  ctx.strokeStyle = config.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  ctx.strokeStyle = config.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();

  data.forEach((d, i) => {
    const x = padding + (graphWidth / (data.length - 1 || 1)) * i;
    const y = padding + graphHeight - ((d.value - minWeight) / weightRange) * graphHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  ctx.fillStyle = config.primary;
  data.forEach((d, i) => {
    const x = padding + (graphWidth / (data.length - 1 || 1)) * i;
    const y = padding + graphHeight - ((d.value - minWeight) / weightRange) * graphHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = config.text || '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';

  for (let i = 0; i <= 4; i++) {
    const weight = minWeight + (weightRange / 4) * i;
    const y = padding + graphHeight - (graphHeight / 4) * i;
    ctx.fillText(weight.toFixed(1), padding - 25, y + 4);
  }

  displayWeightList(data);
}

function refreshWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (canvas && canvas.offsetParent !== null) {
    drawWeightChart();
  }
}

function refreshSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (canvas && canvas.offsetParent !== null) {
    drawSleepChart();
  }
}

function refreshAllGraphs() {
  refreshWeightChart();
  refreshSleepChart();
}

function displayWeightList(data) {
  document.getElementById('weight-list').innerHTML = data.slice().reverse().map(d => `
    <div class="data-item">
      <span class="date">${new Date(d.date).toLocaleDateString('fr-FR')}</span>
      <span class="value">${d.value} kg</span>
    </div>
  `).join('');
}

// ============================================
// SLEEP & CHART FUNCTIONS
// ============================================

function openSleepChart() {
  modal.open('sleep-modal');
  setTimeout(() => drawSleepChart(), 100);
}

function closeSleepChart() {
  modal.close('sleep-modal');
  refreshAllGraphs();
}

function openSleepForm() {
  document.getElementById('sleep-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('sleep-hours').value = '';
  document.getElementById('sleep-minutes').value = '';
  modal.open('sleep-form-modal');
}

function closeSleepForm() {
  modal.close('sleep-form-modal');
  refreshAllGraphs();
}

function saveSleep() {
  const date = document.getElementById('sleep-date').value;
  const hours = parseInt(document.getElementById('sleep-hours').value) || 0;
  const minutes = parseInt(document.getElementById('sleep-minutes').value) || 0;

  if (!date) { alert('Veuillez sélectionner une date'); return; }
  if (hours === 0 && minutes === 0) { alert('Veuillez entrer une durée'); return; }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) { 
    alert('Veuillez entrer des valeurs valides (0-23 heures, 0-59 minutes)'); return;
  }

  let data = getSleepData();
  const value = hours + (minutes / 60);
  const idx = data.findIndex(d => d.date === date);
  idx >= 0 ? data[idx].value = value : data.push({ date, value });
  data.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  save.sleep(data);
  closeSleepForm();
  if (window.refreshAISuggestions) {
    setTimeout(() => window.refreshAISuggestions(), 500);
  }
}

function drawSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas) return;

  const data = getSleepData();
  const ctx = canvas.getContext('2d');
  const config = getChartConfig();

  canvas.width = canvas.offsetWidth;
  canvas.height = 250;

  displaySleepAverage(data);

  if (data.length === 0) {
    ctx.fillStyle = config.text || '#999';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Aucune donnée', canvas.width / 2, canvas.height / 2);
    displaySleepList(data);
    return;
  }

  const padding = 40;
  const graphWidth = canvas.width - padding * 2;
  const graphHeight = canvas.height - padding * 2;

  const maxSleep = 12;
  const minSleep = 0;

  ctx.strokeStyle = config.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  const barWidth = graphWidth / (data.length * 1.5);
  ctx.fillStyle = config.primary;

  data.forEach((d, i) => {
    const x = padding + (graphWidth / data.length) * (i + 0.25);
    const y = padding + graphHeight - ((d.value / maxSleep) * graphHeight);
    const height = (d.value / maxSleep) * graphHeight;

    ctx.fillRect(x, y, barWidth, height);
    ctx.strokeStyle = config.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, height);

    ctx.fillStyle = config.text || '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const dateObj = new Date(d.date);
    const dateStr = (dateObj.getDate()).toString().padStart(2, '0');
    ctx.fillText(dateStr, x + barWidth / 2, canvas.height - 20);
  });

  ctx.fillStyle = config.text || '#666';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';

  for (let i = 0; i <= 4; i++) {
    const hours = (maxSleep / 4) * i;
    const y = padding + graphHeight - (graphHeight / 4) * i;
    ctx.fillText(hours.toFixed(1) + 'h', padding - 8, y + 4);
  }

  displaySleepList(data);
}

function displaySleepAverage(data) {
  const avgDiv = document.getElementById('sleep-average');
  if (!avgDiv || data.length === 0) {
    if (avgDiv) avgDiv.innerHTML = '';
    return;
  }

  const avg = data.reduce((sum, d) => sum + d.value, 0) / data.length;
  const avg7 = data.slice(-7).reduce((sum, d) => sum + d.value, 0) / data.slice(-7).length;

  avgDiv.innerHTML = `
    <div class="avg-stat"><span class="avg-label">Moyenne globale :</span><span class="avg-value">${formatTime(avg)}</span></div>
    <div class="avg-stat"><span class="avg-label">Derniers 7 jours :</span><span class="avg-value">${formatTime(avg7)}</span></div>
  `;
}

function displaySleepList(data) {
  document.getElementById('sleep-list').innerHTML = data.slice().reverse().map(d => `
    <div class="data-item">
      <span class="date">${new Date(d.date).toLocaleDateString('fr-FR')}</span>
      <span class="value">${formatTime(d.value)}</span>
    </div>
  `).join('');
}

// ============================================
// APP INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function () {
  var navItems = document.querySelectorAll('.nav-item');
  var screens = document.querySelectorAll('.screen');

  navItems.forEach(function (item) {
    item.addEventListener('click', function () {
      var target = item.getAttribute('data-screen');

      navItems.forEach(function (n) { n.classList.remove('active'); });
      item.classList.add('active');

      screens.forEach(function (s) {
        if (s.id === target) {
          s.classList.add('active');
          if (target === 'screen-stats' || target === 'screen-profil') {
            setTimeout(() => {
              displayGoals();
              updateStatsScreen(); 
              refreshAllGraphs();
            }, 100);
          } else if (target === 'screen-accueil') {
            setTimeout(() => {
              displayHomeScreen();
              updateHomeNutrition();
            }, 100);
          } else if (target === 'screen-nutrition') {
            setTimeout(() => {
              displayFoodsList();
              updateNutritionDisplay();
            }, 100);
          }
        } else {
          s.classList.remove('active');
        }
      });
    });
  });

  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        refreshAllGraphs();
        displayGoals();
      }
    });
  });

  displayGoals();
  displayHomeScreen();
  updateStatsScreen(); 
  initNutrition();
  
  const settings = getSettings();
  applyTheme(settings.theme, settings.secondaryColor);
});

// ============================================
// THEME & SETTINGS MANAGEMENT
// ============================================

function openSettings() {
  const settings = getSettings();
  document.getElementById('settings-firstname').value = settings.firstname || '';
  document.getElementById('settings-lastname').value = settings.lastname || '';
  document.getElementById('settings-height').value = settings.height || '';
  document.getElementById('settings-birth-year').value = settings.birthYear || '';
  document.getElementById('settings-allergies').value = settings.allergies || '';
  document.getElementById('settings-date-format').value = settings.dateFormat || 'fr';
  document.getElementById('settings-secondary-color').value = settings.secondaryColor || '#d400ffff';
  
  document.querySelectorAll('input[name="theme"]').forEach(radio => {
    radio.checked = radio.value === (settings.theme || 'light');
    radio.addEventListener('change', onThemeChange);
  });
}

function onThemeChange() {
  const settings = getSettings();
  settings.theme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
  save.settings(settings);
}

function saveSettings() {
  const settings = getSettings();
  settings.firstname = document.getElementById('settings-firstname').value;
  settings.lastname = document.getElementById('settings-lastname').value;
  settings.height = document.getElementById('settings-height').value;
  settings.birthYear = document.getElementById('settings-birth-year').value;
  settings.allergies = document.getElementById('settings-allergies').value;
  save.settings(settings);
  alert('Informations personnelles sauvegardées');
}

function savePreferences() {
  const settings = getSettings();
  settings.theme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
  settings.dateFormat = document.getElementById('settings-date-format').value;
  settings.secondaryColor = document.getElementById('settings-secondary-color').value || '#d400ffff';
  save.settings(settings);
  alert('Préférences sauvegardées');
}

function applyTheme(theme, secondaryColor) {
  const t = THEMES[theme] || THEMES.light;
  const root = document.documentElement;
  const primaryColor = secondaryColor || '#00c9b1';
  
  root.style.setProperty('--bg-color', t.bg);
  root.style.setProperty('--text-color', t.text);
  root.style.setProperty('--card-bg', t.cardBg);
  root.style.setProperty('--card-border', t.cardBorder);
  root.style.setProperty('--input-bg', t.inputBg);
  root.style.setProperty('--input-border', t.inputBorder);
  root.style.setProperty('--primary-color', primaryColor);
  document.body.style.background = t.bg;
  document.documentElement.style.background = t.bg;
  
  const themeColorMeta = document.getElementById('theme-color');
  if (themeColorMeta) {
    themeColorMeta.setAttribute('content', primaryColor);
  }
  
  updateManifestTheme(primaryColor, t.bg);
  updateNavBarImages(theme);
  
  updateStatsScreen();
  displaySessionHistory();
  displayFoodsList();
}

function updateNavBarImages(theme) {
  const navItems = document.querySelectorAll('.nav-item');
  const imageFolder = theme === 'dark' ? './public/images/nav-bar-white' : './public/images/nav-bar';
  
  const iconMap = {
    'screen-accueil': 'home',
    'screen-nutrition': 'food',
    'screen-sport': 'sport',
    'screen-stats': 'stats',
    'screen-profil': 'profil',
    'screen-settings': 'params'
  };
  
  navItems.forEach(item => {
    const screenId = item.getAttribute('data-screen');
    const iconName = iconMap[screenId];
    const img = item.querySelector('img.nav-icon');
    
    if (img && iconName) {
      const suffix = theme === 'dark' ? '-white' : '';
      img.src = `${imageFolder}/${iconName}${suffix}.webp`;
    }
  });
}

function updateManifestTheme(themeColor, bgColor) {
  const manifest = {
    short_name: 'KaliFit',
    name: 'KaliFit - Fitness & Nutrition',
    description: 'Application d\'entraînement physique et de nutrition',
    icons: [
      {
        src: './public/images/logo/logo-192.webp',
        type: 'image/webp',
        sizes: '192x192',
        purpose: 'any maskable'
      },
      {
        src: './public/images/logo/logo-512.webp',
        type: 'image/webp',
        sizes: '512x512',
        purpose: 'any maskable'
      }
    ],
    start_url: './',
    scope: './',
    display: 'standalone',
    orientation: 'portrait-primary',
    theme_color: themeColor,
    background_color: bgColor,
    shortcuts: [
      {
        name: 'Accueil',
        short_name: 'Accueil',
        description: 'Aller à la page d\'accueil',
        url: './',
        icons: [{ src: './public/images/logo/logo-192.webp', sizes: '192x192' }]
      }
    ]
  };
  
  const manifestBlob = new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' });
  const manifestUrl = URL.createObjectURL(manifestBlob);
  const manifestLink = document.getElementById('manifest-link');
  if (manifestLink) {
    manifestLink.href = manifestUrl;
  }
}

function applyColorPreview(color) {
  const t = THEMES[getSettings().theme] || THEMES.light;
  const root = document.documentElement;
  root.style.setProperty('--primary-color', color);
}

// ============================================
// GOALS MANAGEMENT
// ============================================

function openGoalForm() {
  const goals = getGoals();
  document.getElementById('goal-weight-start').value = goals.weightStart || '';
  document.getElementById('goal-fat-start').value = goals.fatStart || '';
  document.getElementById('goal-muscle-start').value = goals.muscleStart || '';
  document.getElementById('goal-weight-input').value = goals.weight || '';
  document.getElementById('goal-fat-input').value = goals.fat || '';
  document.getElementById('goal-muscle-input').value = goals.muscle || '';
  
  document.querySelectorAll('input[name="weight-goal"]').forEach(radio => {
    radio.checked = radio.value === goals.weightGoal;
  });
  
  modal.open('goal-form-modal');
}

function closeGoalForm() {
  modal.close('goal-form-modal');
  displayGoals();
  refreshAllGraphs();
}

function saveGoals() {
  const weight = parseFloat(document.getElementById('goal-weight-input').value);
  const fat = parseFloat(document.getElementById('goal-fat-input').value);
  const muscle = parseFloat(document.getElementById('goal-muscle-input').value);
  
  if (isNaN(weight) && isNaN(fat) && isNaN(muscle)) {
    alert('Veuillez entrer au moins un objectif');
    return;
  }

  const goals = {
    weightStart: parseFloat(document.getElementById('goal-weight-start').value) || null,
    fatStart: parseFloat(document.getElementById('goal-fat-start').value) || null,
    muscleStart: parseFloat(document.getElementById('goal-muscle-start').value) || null,
    weight: isNaN(weight) ? null : weight,
    fat: isNaN(fat) ? null : fat,
    muscle: isNaN(muscle) ? null : muscle,
    weightGoal: document.querySelector('input[name="weight-goal"]:checked')?.value || null
  };

  save.goals(goals);
  closeGoalForm();
}

// ============================================
// PROGRESS & HEATMAP
// ============================================

function generateSessionsHeatmap() {
  const sessions = getSessionsData();
  const heatmapGrid = document.querySelector('.heatmap-grid');
  
  if (!heatmapGrid) return;

  const today = new Date();
  const days = [];
  
  for (let i = 34; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayIntensity = sessions
      .filter(s => s.date === dateStr)
      .reduce((total, s) => {
        const intensityMultiplier = s.intensity === 'elevee' ? 1.5 : s.intensity === 'modere' ? 1 : 0.5;
        return total + (s.duration * intensityMultiplier);
      }, 0);
    
    days.push({ date: dateStr, intensity: dayIntensity });
  }

  let html = days.map((day, index) => {
    const date = new Date(day.date);
    const dayOfWeek = (date.getDay() + 6) % 7; 
    const isNewRow = dayOfWeek === 0;
    
    let className = 'heatmap-cell';
    if (day.intensity === 0) className += ' inactive';
    else if (day.intensity < 15) className += ' active-low';
    else if (day.intensity < 30) className += ' active-mid';
    else className += ' active';
    
    const dateObj = new Date(day.date);
    const dayNum = dateObj.getDate();
    const tooltip = `${day.date}: ${day.intensity > 0 ? day.intensity.toFixed(0) + ' pts' : 'Repos'}`;
    
    return `<div class="${className}" title="${tooltip}" data-date="${day.date}"><span class="day-num">${dayNum}</span></div>`;
  }).join('');
  
  heatmapGrid.innerHTML = html;
}

function generateProgressEncouragement() {
  const weightData = getWeightData();
  const goals = getGoals();
  const sessions = getSessionsData();
  
  let encouragement = "Commencez à enregistrer vos données !";
  
  if (weightData.length > 0) {
    const currentWeight = weightData[weightData.length - 1].value;
    const firstWeight = weightData[0].value;
    const weightChange = firstWeight - currentWeight;
    
    if (goals.weightGoal === 'lose' && weightChange > 0) {
      encouragement = `🎉 ${weightChange.toFixed(1)}kg de moins ! Continue comme ça !`;
    } else if (goals.weightGoal === 'gain' && weightChange < 0) {
      encouragement = `💪 ${Math.abs(weightChange).toFixed(1)}kg de plus ! Tu es sur la bonne voie !`;
    } else if (weightData.length >= 7) {
      encouragement = "📈 Vous suivez vos progrès régulièrement. Excellent !";
    }
  }
  
  if (sessions.length > 0) {
    const thisWeek = sessions.filter(s => {
      const sessionDate = new Date(s.date);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return sessionDate >= oneWeekAgo;
    }).length;
    
    if (thisWeek >= 3) {
      encouragement = `🏆 ${thisWeek} séances cette semaine ! Vous êtes un champion !`;
    }
  }
  
  return encouragement;
}

function updateStatsScreen() {
  generateSessionsHeatmap();
  
  // Utiliser la suggestion IA pour l'encouragement au lieu du message statique
  if (window.refreshAISuggestions) {
    window.refreshAISuggestions();
  }
}


function displayGoals() {
  const goals = getGoals();
  const weightData = getWeightData();
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : goals.weightStart;

  const arrow = goals.weightGoal === 'lose' ? '↓' : goals.weightGoal === 'gain' ? '↑' : '';
  document.getElementById('goal-weight-obj').textContent = goals.weight ? goals.weight + ' kg ' + arrow : 'N/A';
  document.getElementById('goal-fat-obj').textContent = goals.fat ? goals.fat + '%' : 'N/A';
  document.getElementById('goal-muscle-obj').textContent = goals.muscle ? goals.muscle + ' kg' : 'N/A';

  if (!goals.weightStart || !goals.weight) {
    document.getElementById('goal-weight-display').textContent = 'N/A';
    document.getElementById('goal-weight-bar').style.width = '0%';
  } else {
    let progressPercent = 0;
    if (goals.weightGoal === 'lose') {
      const totalToLose = goals.weightStart - goals.weight;
      if (totalToLose > 0) progressPercent = Math.max(0, Math.min(100, ((goals.weightStart - currentWeight) / totalToLose) * 100));
    } else if (goals.weightGoal === 'gain') {
      const totalToGain = goals.weight - goals.weightStart;
      if (totalToGain > 0) progressPercent = Math.max(0, Math.min(100, ((currentWeight - goals.weightStart) / totalToGain) * 100));
    }
    document.getElementById('goal-weight-display').textContent = currentWeight.toFixed(1) + ' kg';
    document.getElementById('goal-weight-bar').style.width = progressPercent + '%';
  }

  ['fat', 'muscle'].forEach(type => {
    const display = document.getElementById(`goal-${type}-display`);
    const bar = document.getElementById(`goal-${type}-bar`);
    if (goals[type]) {
      display.textContent = (goals[type + 'Start'] || '--') + (type === 'fat' ? '%' : ' kg');
      bar.style.width = '0%';
    } else {
      display.textContent = 'N/A';
      bar.style.width = '0%';
    }
  });
}

// ============================================
// HOME SCREEN & STATS
// ============================================

function calculateTrainingLoad() {
  const sessions = getSessionsData();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const recentSessions = sessions.filter(s => new Date(s.date) >= sevenDaysAgo);
  
  if (recentSessions.length === 0) return 0;
  
  let totalLoad = 0;
  recentSessions.forEach(session => {
    const intensityMultiplier = 
      session.intensity === 'elevee' ? 1.5 : 
      session.intensity === 'modere' ? 1.0 : 
      0.5;
    totalLoad += session.duration * intensityMultiplier;
  });
  
  return Math.round(totalLoad);
}

function displayHomeScreen() {
  const weightData = getWeightData();
  const sleepData = getSleepData();
  const settings = getSettings();
  
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;
  document.getElementById('home-weight').textContent = currentWeight ? currentWeight.toFixed(1) + ' kg' : 'N/A';
  
  if (currentWeight && settings.height) {
    const bmi = calculateBMI(currentWeight, settings.height);
    document.getElementById('home-bmi').textContent = bmi ? bmi : 'N/A';
    
    let pointerPercent = 0;
    if (bmi < 18.5) {
      pointerPercent = (bmi / 18.5) * 20;
    } else if (bmi < 25) {
      pointerPercent = 20 + ((bmi - 18.5) / 6.5) * 20;
    } else if (bmi < 30) {
      pointerPercent = 40 + ((bmi - 25) / 5) * 20;
    } else if (bmi < 35) {
      pointerPercent = 60 + ((bmi - 30) / 5) * 20;
    } else {
      pointerPercent = 80 + Math.min((bmi - 35) / 10, 1) * 20;
    }
    document.getElementById('imc-pointer').style.left = Math.min(pointerPercent, 100) + '%';
  } else {
    document.getElementById('home-bmi').textContent = 'N/A';
    document.getElementById('imc-pointer').style.left = '0%';
  }
  
  const lastSleep = sleepData.length > 0 ? sleepData[sleepData.length - 1].value : null;
  if (lastSleep) {
    document.getElementById('home-sleep').textContent = formatTime(lastSleep);
    document.getElementById('home-sleep-text').textContent = formatTime(lastSleep);
  } else {
    document.getElementById('home-sleep').textContent = 'N/A';
    document.getElementById('home-sleep-text').textContent = 'N/A';
  }
  
  const trainingLoad = calculateTrainingLoad();
  const trainingLoadElement = document.getElementById('home-training-load');
  if (trainingLoadElement) {
    trainingLoadElement.textContent = trainingLoad > 0 ? trainingLoad + ' pts' : 'N/A';
  }
  
  updateHomeNutrition();
}

function updateHomeNutrition() {
  const foods = getTodayFoods();
  
  let totalProteins = 0, totalCarbs = 0, totalFats = 0, totalCalories = 0;
  
  foods.forEach(food => {
    totalProteins += food.proteins || 0;
    totalCarbs += food.carbs || 0;
    totalFats += food.fats || 0;
    totalCalories += food.calories || 0;
  });

  const targetProteins = 150;
  const targetCarbs = 250;
  const targetFats = 70;
  const targetCalories = 2000;

  document.getElementById('home-nutrition-protein-text').textContent = totalProteins.toFixed(1) + 'g';
  document.getElementById('home-nutrition-carbs-text').textContent = totalCarbs.toFixed(1) + 'g';
  document.getElementById('home-nutrition-fat-text').textContent = totalFats.toFixed(1) + 'g';
  document.getElementById('home-nutrition-calories-text').textContent = totalCalories.toFixed(0) + ' kcal';

  const proteinPercent = Math.min((totalProteins / targetProteins) * 100, 100);
  const carbsPercent = Math.min((totalCarbs / targetCarbs) * 100, 100);
  const fatPercent = Math.min((totalFats / targetFats) * 100, 100);

  document.getElementById('home-nutrition-protein-bar').style.width = proteinPercent + '%';
  document.getElementById('home-nutrition-carbs-bar').style.width = carbsPercent + '%';
  document.getElementById('home-nutrition-fat-bar').style.width = fatPercent + '%';
}

// ============================================
// NUTRITION & FOOD MANAGEMENT
// ============================================

const getNutritionData = () => storage.get('nutritionData', {});
const getTodayFoods = () => {
  const today = new Date().toISOString().split('T')[0];
  const data = getNutritionData();
  return data[today] || [];
};

function calculateDailyNeeds() {
  const settings = getSettings();
  const weightData = getWeightData();
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;
  const height = settings.height ? parseInt(settings.height) : null;
  const birthYear = settings.birthYear ? parseInt(settings.birthYear) : null;

  if (!currentWeight || !height) {
    return {
      calories: 2500,
      proteins: 150,
      carbs: 300,
      fats: 100
    };
  }

  const age = birthYear ? new Date().getFullYear() - birthYear : 30;
  let calories;
  
  const bmr = 88.362 + (13.397 * currentWeight) + (4.799 * height) - (5.677 * age);
  calories = Math.round(bmr * 1.5); 
  const proteins = Math.round(currentWeight * 1.8);
  const carbs = Math.round(currentWeight * 5);
  const fats = Math.round(currentWeight * 1);

  return {
    calories: Math.max(calories, 1500),
    proteins: proteins,
    carbs: carbs,
    fats: fats
  };
}

function updateNutritionDisplay() {
  const foods = getTodayFoods();
  
  const totals = {
    calories: 0,
    proteins: 0,
    carbs: 0,
    fats: 0
  };

  foods.forEach(food => {
    totals.calories += food.calories;
    totals.proteins += food.proteins;
    totals.carbs += food.carbs;
    totals.fats += food.fats;
  });

  const needs = calculateDailyNeeds();

  document.getElementById('nutrition-calories-text').textContent = totals.calories.toFixed(0) + ' / ' + needs.calories + ' kcal';
  document.getElementById('nutrition-protein-text').textContent = totals.proteins.toFixed(1) + ' / ' + needs.proteins + 'g';
  document.getElementById('nutrition-carbs-text').textContent = totals.carbs.toFixed(1) + ' / ' + needs.carbs + 'g';
  document.getElementById('nutrition-fat-text').textContent = totals.fats.toFixed(1) + ' / ' + needs.fats + 'g';

  document.getElementById('nutrition-protein-bar').style.width = Math.min((totals.proteins / needs.proteins) * 100, 100) + '%';
  document.getElementById('nutrition-carbs-bar').style.width = Math.min((totals.carbs / needs.carbs) * 100, 100) + '%';
  document.getElementById('nutrition-fat-bar').style.width = Math.min((totals.fats / needs.fats) * 100, 100) + '%';
  
  updateHomeNutrition();
}

function initNutrition() {
  displayFoodsList();
  updateNutritionDisplay();
  updateHomeNutrition();
}


// ============================================
// SESSIONS & TRAINING
// ============================================

const getSessionsData = () => storage.get('sessionsData', []);

function openSessionForm() {
  document.getElementById('session-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('session-type').value = '';
  document.getElementById('session-duration').value = '';
  document.getElementById('session-calories').value = '';
  document.getElementById('session-notes').value = '';
  document.querySelector('input[name="session-intensity"][value="modere"]').checked = true;
  modal.open('session-form-modal');
}

function closeSessionForm() {
  modal.close('session-form-modal');
  displaySessionHistory();
  updateSessionQuality();
  updateStatsScreen();
  displayHomeScreen();
}

function saveSession() {
  const date = document.getElementById('session-date').value;
  const type = document.getElementById('session-type').value;
  const duration = parseInt(document.getElementById('session-duration').value);
  const intensity = document.querySelector('input[name="session-intensity"]:checked')?.value;
  const calories = parseInt(document.getElementById('session-calories').value) || 0;
  const notes = document.getElementById('session-notes').value;

  if (!date || !type || isNaN(duration) || duration <= 0 || !intensity) {
    alert('Veuillez remplir tous les champs obligatoires');
    return;
  }

  let data = getSessionsData();
  const session = {
    id: Date.now(),
    date: date,
    type: type,
    duration: duration,
    intensity: intensity,
    calories: calories,
    notes: notes,
    timestamp: new Date().toISOString()
  };

  data.push(session);
  data.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  save.sessions(data);
  closeSessionForm();
  if (window.refreshAISuggestions) {
    setTimeout(() => window.refreshAISuggestions(), 500);
  }
}

function displaySessionHistory() {
  const sessions = getSessionsData();
  const container = document.getElementById('session-history-container');

  if (sessions.length === 0) {
    container.innerHTML = '<div style="text-align:center;opacity:0.6;padding:20px;color:var(--text-color);">Aucune séance ajoutée</div>';
    return;
  }

  const sportEmoji = {
    cardio: '🏃',
    musculation: '💪',
    yoga: '🧘',
    football: '⚽',
    tennis: '🎾',
    crossfit: '🔥',
    autre: '🏋️'
  };

  const intensityLabel = {
    faible: 'Faible',
    modere: 'Modérée',
    elevee: 'Élevée'
  };

  container.innerHTML = sessions.slice(0, 20).map(session => `
    <div style="padding:12px;border:1px solid var(--card-border);border-radius:6px;margin-bottom:8px;background:var(--card-bg);color:var(--text-color);">
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;font-weight:600;">
          <span style="font-size:20px;">${sportEmoji[session.type] || '🏋️'}</span>
          <span>${session.type.charAt(0).toUpperCase() + session.type.slice(1)}</span>
        </div>
        <button style="background:#ff6b6b;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="deleteSession('${session.id}')">Supprimer</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:13px;">
        <div><span style="opacity:0.7;">Date:</span> ${new Date(session.date).toLocaleDateString('fr-FR')}</div>
        <div><span style="opacity:0.7;">Durée:</span> ${session.duration} min</div>
        <div><span style="opacity:0.7;">Intensité:</span> ${intensityLabel[session.intensity]}</div>
        <div><span style="opacity:0.7;">Calories:</span> ${session.calories} kcal</div>
      </div>
      ${session.notes ? `<div style="margin-top:8px;padding:8px;background:var(--input-bg);border-left:3px solid var(--primary-color);font-size:12px;">${session.notes}</div>` : ''}
    </div>
  `).join('');
}

function deleteSession(sessionId) {
  if (confirm('Êtes-vous sûr de vouloir supprimer cette séance ?')) {
    let data = getSessionsData();
    data = data.filter(s => s.id !== parseInt(sessionId));
    storage.set('sessionsData', data);
    displaySessionHistory();
    updateSessionQuality();
    updateStatsScreen();
    displayHomeScreen();
  }
}

function updateSessionQuality() {
  const sessions = getSessionsData();
  const container = document.getElementById('sport-session-quality');

  if (sessions.length === 0) {
    container.textContent = 'N/A';
    return;
  }

  const quality = calculateSessionQuality();
  container.textContent = quality + '/10';
}

function calculateSessionQuality() {
  const sessions = getSessionsData();
  if (sessions.length === 0) return 'N/A';

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSessions = sessions.filter(s => new Date(s.date) >= sevenDaysAgo);

  if (recentSessions.length === 0) return 'N/A';

  let score = 0;

  const daysWithSessions = new Set(recentSessions.map(s => s.date)).size;
  if (daysWithSessions >= 5) score += 3;
  else if (daysWithSessions >= 3) score += 2;
  else if (daysWithSessions >= 1) score += 1;

  const types = new Set(recentSessions.map(s => s.type)).size;
  if (types >= 3) score += 2;
  else if (types >= 2) score += 1;

  const highIntensityCount = recentSessions.filter(s => s.intensity === 'elevee').length;
  if (highIntensityCount >= 2) score += 2;
  else if (highIntensityCount >= 1) score += 1;

  const avgDuration = recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length;
  if (avgDuration >= 45) score += 3;
  else if (avgDuration >= 30) score += 2;
  else if (avgDuration >= 15) score += 1;

  return Math.min(score, 10);
}

// ============================================
// EXPORT & IMPORT FUNCTIONS
// ============================================

function exportUserData() {
  // Collecte toutes les données utilisateur
  const userData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    data: {
      settings: getSettings(),
      goals: getGoals(),
      weightData: getWeightData(),
      sleepData: getSleepData(),
      sessionsData: getSessionsData(),
      nutritionData: getNutritionData()
    }
  };

  // Convertit les données en JSON
  const jsonString = JSON.stringify(userData, null, 2);
  
  // Crée un blob et le télécharge
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `KaliFit_export_${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  
  alert('✅ Vos données ont été exportées avec succès !');
}

function importUserData() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  
  input.addEventListener('change', function(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const userData = JSON.parse(e.target.result);
        
        // Validation du format
        if (!userData.data) {
          throw new Error('Format de fichier invalide');
        }
        
        // Confirmez avant d'importer
        if (confirm('⚠️ Cela va remplacer vos données actuelles. Êtes-vous sûr ?')) {
          // Importe les données
          if (userData.data.settings) storage.set('settings', userData.data.settings);
          if (userData.data.goals) storage.set('goals', userData.data.goals);
          if (userData.data.weightData) storage.set('weightData', userData.data.weightData);
          if (userData.data.sleepData) storage.set('sleepData', userData.data.sleepData);
          if (userData.data.sessionsData) storage.set('sessionsData', userData.data.sessionsData);
          if (userData.data.nutritionData) storage.set('nutritionData', userData.data.nutritionData);
          
          alert('✅ Vos données ont été importées avec succès ! La page va se recharger.');
          setTimeout(() => window.location.reload(), 1000);
        }
      } catch (error) {
        alert('❌ Erreur lors de l\'importation : ' + error.message);
      }
    };
    reader.readAsText(file);
  });
  
  input.click();
}