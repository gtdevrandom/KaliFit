if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

// Utility: LocalStorage with defaults
const storage = {
  get: (key, defaults = {}) => {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  },
  set: (key, data) => localStorage.setItem(key, JSON.stringify(data))
};

// Theme configs
const THEMES = {
  light: {
    bg: '#f2f2f2', text: '#000000', cardBg: '#ffffff', cardBorder: '#e0e0e0',
    inputBg: '#ffffff', inputBorder: '#d0d0d0', primary: '#00c9b1', border: '#d0d0d0', gridLine: '#e0e0e0'
  },
  dark: {
    bg: '#1a1a1a', text: '#ffffff', cardBg: '#2d2d2d', cardBorder: '#444',
    inputBg: '#333', inputBorder: '#555', primary: '#00c9b1', border: '#555', gridLine: '#444'
  }
};

// Get/Set helpers
const getWeightData = () => storage.get('weightData', []);
const getSleepData = () => storage.get('sleepData', []);
const getGoals = () => storage.get('goals', {
  weight: null, fat: null, muscle: null, weightGoal: null,
  weightStart: null, fatStart: null, muscleStart: null
});
const getSettings = () => storage.get('settings', {
  firstname: '', lastname: '', height: '', birthYear: '', theme: 'light', dateFormat: 'fr'
});

function getChartConfig() {
  const theme = getSettings().theme || 'light';
  return THEMES[theme];
}

// Save helpers with callbacks
const save = {
  weight: data => { storage.set('weightData', data); refreshWeightChart(); displayGoals(); displayHomeScreen(); },
  sleep: data => { storage.set('sleepData', data); refreshSleepChart(); displayHomeScreen(); },
  goals: data => { storage.set('goals', data); displayGoals(); },
  settings: data => { storage.set('settings', data); applyTheme(data.theme); refreshAllGraphs(); displayHomeScreen(); }
};

// Utility: Format sleep time
const formatTime = decHours => {
  const h = Math.floor(decHours), m = Math.round((decHours - h) * 60);
  return h + 'h' + String(m).padStart(2, '0');
};

// Utility: Calculate BMI
const calculateBMI = (weightKg, heightCm) => {
  if (!weightKg || !heightCm) return null;
  const heightM = heightCm / 100;
  return (weightKg / (heightM * heightM)).toFixed(1);
};

// Modal helpers
const modal = {
  open: (id) => { document.getElementById(id).classList.add('active'); },
  close: (id) => { document.getElementById(id).classList.remove('active'); },
  closeAll: () => { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }
};

// Weight functions
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
}

function drawWeightChart() {
  const canvas = document.getElementById('weight-chart');
  if (!canvas) return;

  const data = getWeightData();
  const ctx = canvas.getContext('2d');
  const config = getChartConfig();

  // Clear canvas
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

  // Draw grid
  ctx.strokeStyle = config.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Draw line chart
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

  // Draw points
  ctx.fillStyle = config.primary;
  data.forEach((d, i) => {
    const x = padding + (graphWidth / (data.length - 1 || 1)) * i;
    const y = padding + graphHeight - ((d.value - minWeight) / weightRange) * graphHeight;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  // Draw axes labels
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
    // Chart is visible
    drawWeightChart();
  }
}

function refreshSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (canvas && canvas.offsetParent !== null) {
    // Chart is visible
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

// Sleep functions
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
}

function drawSleepChart() {
  const canvas = document.getElementById('sleep-chart');
  if (!canvas) return;

  const data = getSleepData();
  const ctx = canvas.getContext('2d');
  const config = getChartConfig();

  // Clear canvas
  canvas.width = canvas.offsetWidth;
  canvas.height = 250;

  // Display average
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

  // Draw grid
  ctx.strokeStyle = config.gridLine;
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = padding + (graphHeight / 4) * i;
    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(canvas.width - padding, y);
    ctx.stroke();
  }

  // Draw bars
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

    // Draw time labels below bars
    ctx.fillStyle = config.text || '#666';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    const dateObj = new Date(d.date);
    const dateStr = (dateObj.getDate()).toString().padStart(2, '0');
    ctx.fillText(dateStr, x + barWidth / 2, canvas.height - 20);
  });

  // Draw Y axis labels
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

// Navigation
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
          // Refresh graphs when switching to stats or profil
          if (target === 'screen-stats' || target === 'screen-profil') {
            setTimeout(() => {
              displayGoals();
              refreshAllGraphs();
            }, 100);
          } else if (target === 'screen-accueil') {
            setTimeout(() => displayHomeScreen(), 100);
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

  // Close modals on background click
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
        refreshAllGraphs();
        displayGoals();
      }
    });
  });

  // Load goals on startup
  displayGoals();
  displayHomeScreen();
  initNutrition();
  
  // Apply theme on startup
  const settings = getSettings();
  applyTheme(settings.theme);
});

// Settings functions
function openSettings() {
  const settings = getSettings();
  document.getElementById('settings-firstname').value = settings.firstname || '';
  document.getElementById('settings-lastname').value = settings.lastname || '';
  document.getElementById('settings-height').value = settings.height || '';
  document.getElementById('settings-birth-year').value = settings.birthYear || '';
  document.getElementById('settings-date-format').value = settings.dateFormat || 'fr';
  
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
  save.settings(settings);
  alert('Informations personnelles sauvegardées');
}

function savePreferences() {
  const settings = getSettings();
  settings.theme = document.querySelector('input[name="theme"]:checked')?.value || 'light';
  settings.dateFormat = document.getElementById('settings-date-format').value;
  save.settings(settings);
  alert('Préférences sauvegardées');
}

function applyTheme(theme) {
  const t = THEMES[theme] || THEMES.light;
  const root = document.documentElement;
  root.style.setProperty('--bg-color', t.bg);
  root.style.setProperty('--text-color', t.text);
  root.style.setProperty('--card-bg', t.cardBg);
  root.style.setProperty('--card-border', t.cardBorder);
  root.style.setProperty('--input-bg', t.inputBg);
  root.style.setProperty('--input-border', t.inputBorder);
  document.body.style.background = t.bg;
  document.documentElement.style.background = t.bg;
}

// Goals functions
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

function displayGoals() {
  const goals = getGoals();
  const weightData = getWeightData();
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : goals.weightStart;

  // Display objectives
  const arrow = goals.weightGoal === 'lose' ? '↓' : goals.weightGoal === 'gain' ? '↑' : '';
  document.getElementById('goal-weight-obj').textContent = goals.weight ? goals.weight + ' kg ' + arrow : 'N/A';
  document.getElementById('goal-fat-obj').textContent = goals.fat ? goals.fat + '%' : 'N/A';
  document.getElementById('goal-muscle-obj').textContent = goals.muscle ? goals.muscle + ' kg' : 'N/A';

  // Display weight progression
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

  // Display fat/muscle (placeholder)
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

// Display home screen stats
function displayHomeScreen() {
  const weightData = getWeightData();
  const sleepData = getSleepData();
  const settings = getSettings();
  
  // Display weight
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].value : null;
  document.getElementById('home-weight').textContent = currentWeight ? currentWeight.toFixed(1) + ' kg' : 'N/A';
  
  // Calculate and display BMI with pointer
  if (currentWeight && settings.height) {
    const bmi = calculateBMI(currentWeight, settings.height);
    document.getElementById('home-bmi').textContent = bmi ? bmi : 'N/A';
    
    // Position IMC pointer (0-100%)
    // BMI ranges: <18.5 (0-20%), 18.5-25 (20-40%), 25-30 (40-60%), 30-35 (60-80%), >35 (80-100%)
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
  
  // Display sleep
  const lastSleep = sleepData.length > 0 ? sleepData[sleepData.length - 1].value : null;
  if (lastSleep) {
    document.getElementById('home-sleep').textContent = formatTime(lastSleep);
    document.getElementById('home-sleep-text').textContent = formatTime(lastSleep);
  } else {
    document.getElementById('home-sleep').textContent = 'N/A';
    document.getElementById('home-sleep-text').textContent = 'N/A';
  }
}

// Nutrition functions - Open Food Facts API
const getNutritionData = () => storage.get('nutritionData', {});
const getTodayFoods = () => {
  const today = new Date().toISOString().split('T')[0];
  const data = getNutritionData();
  return data[today] || [];
};

let currentFoodData = null;
let foodSearchResults = [];

function openFoodSearchModal() {
  modal.open('food-search-modal');
  document.getElementById('food-search-input').value = '';
  document.getElementById('food-search-results').innerHTML = '';
  foodSearchResults = [];
}

function closeFoodSearchModal() {
  modal.close('food-search-modal');
}

function closeFoodDetailsModal() {
  modal.close('food-details-modal');
  currentFoodData = null;
}

async function searchFoods() {
  const query = document.getElementById('food-search-input').value.trim();
  if (!query) {
    alert('Veuillez entrer un terme de recherche');
    return;
  }

  const resultsDiv = document.getElementById('food-search-results');
  resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.7;">Recherche en cours...</div>';

  try {
    const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1`);
    const data = await response.json();

    if (!data.products || data.products.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">Aucun aliment trouvé</div>';
      return;
    }

    foodSearchResults = data.products.filter(p => p.nutriments && (p.nutriments.energy_kcal || p.nutriments.energy_100g));
    
    if (foodSearchResults.length === 0) {
      resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;opacity:0.6;">Aucun aliment avec données nutritionnelles</div>';
      return;
    }

    resultsDiv.innerHTML = foodSearchResults.slice(0, 10).map((product, idx) => `
      <div style="padding:10px;border:1px solid #ddd;border-radius:6px;cursor:pointer;transition:background 0.2s;" onclick="selectFoodByIndex(${idx})" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
        <div style="font-weight:600;margin-bottom:4px;">${product.product_name || 'Produit sans nom'}</div>
        <div style="font-size:12px;opacity:0.7;">Marque: ${product.brands || 'Non spécifiée'}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Erreur API Open Food Facts:', error);
    resultsDiv.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6b6b;">Erreur lors de la recherche. Vérifiez votre connexion.</div>';
  }
}

function selectFoodByIndex(idx) {
  if (idx >= 0 && idx < foodSearchResults.length) {
    selectFood(foodSearchResults[idx]);
  }
}

function selectFood(product) {
  currentFoodData = product;
  
  const nutriments = product.nutriments || {};
  const calories = nutriments.energy_kcal || (nutriments.energy_100g ? nutriments.energy_100g / 100 : 0);
  const proteins = nutriments.proteins_100g || 0;
  const carbs = nutriments.carbohydrates_100g || 0;
  const fats = nutriments.fat_100g || 0;

  const detailsContent = document.getElementById('food-details-content');
  detailsContent.innerHTML = `
    <div style="padding:8px;background:#f0f0f0;border-radius:6px;">
      <div style="font-weight:600;margin-bottom:8px;">${product.product_name || 'Produit'}</div>
      <div style="font-size:13px;margin-bottom:8px;">Marque: ${product.brands || 'Non spécifiée'}</div>
      <div style="border-top:1px solid #ddd;padding-top:8px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
          <div><span style="opacity:0.7;">Calories (100g):</span> <strong>${calories.toFixed(1)} kcal</strong></div>
          <div><span style="opacity:0.7;">Protéines (100g):</span> <strong>${proteins.toFixed(1)}g</strong></div>
          <div><span style="opacity:0.7;">Glucides (100g):</span> <strong>${carbs.toFixed(1)}g</strong></div>
          <div><span style="opacity:0.7;">Lipides (100g):</span> <strong>${fats.toFixed(1)}g</strong></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('food-details-title').textContent = product.product_name || 'Détails de l\'aliment';
  document.getElementById('food-quantity-input').value = '100';
  modal.close('food-search-modal');
  modal.open('food-details-modal');
}

function addFoodToDay() {
  if (!currentFoodData) {
    alert('Veuillez sélectionner un aliment');
    return;
  }

  const quantity = parseFloat(document.getElementById('food-quantity-input').value);
  if (isNaN(quantity) || quantity <= 0) {
    alert('Veuillez entrer une quantité valide');
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const nutritionData = getNutritionData();
  if (!nutritionData[today]) nutritionData[today] = [];

  const nutriments = currentFoodData.nutriments || {};
  const calories = (nutriments.energy_kcal || (nutriments.energy_100g ? nutriments.energy_100g / 100 : 0)) * (quantity / 100);
  const proteins = (nutriments.proteins_100g || 0) * (quantity / 100);
  const carbs = (nutriments.carbohydrates_100g || 0) * (quantity / 100);
  const fats = (nutriments.fat_100g || 0) * (quantity / 100);

  const foodItem = {
    id: Date.now(),
    name: currentFoodData.product_name || 'Produit',
    quantity: quantity,
    calories: calories,
    proteins: proteins,
    carbs: carbs,
    fats: fats,
    timestamp: new Date().toISOString()
  };

  nutritionData[today].push(foodItem);
  storage.set('nutritionData', nutritionData);
  
  closeFoodDetailsModal();
  displayFoodsList();
  updateNutritionDisplay();
}

function displayFoodsList() {
  const foods = getTodayFoods();
  const foodsList = document.getElementById('foods-list');
  
  if (foods.length === 0) {
    foodsList.innerHTML = '<div style="text-align:center;opacity:0.6;">Aucun aliment ajouté</div>';
    return;
  }

  foodsList.innerHTML = foods.map((food, idx) => `
    <div style="padding:8px;border:1px solid #ddd;border-radius:6px;display:flex;justify-content:space-between;align-items:center;">
      <div>
        <div style="font-weight:600;">${food.name}</div>
        <div style="font-size:12px;opacity:0.7;">${food.quantity}g | ${food.calories.toFixed(0)} kcal</div>
      </div>
      <button style="background:#ff6b6b;color:white;border:none;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:12px;" onclick="removeFoodFromDay(${idx})">Supprimer</button>
    </div>
  `).join('');
}

function removeFoodFromDay(index) {
  const today = new Date().toISOString().split('T')[0];
  const nutritionData = getNutritionData();
  
  if (nutritionData[today]) {
    nutritionData[today].splice(index, 1);
    storage.set('nutritionData', nutritionData);
    displayFoodsList();
    updateNutritionDisplay();
  }
}

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
}

function initNutrition() {
  displayFoodsList();
  updateNutritionDisplay();
}
