// Récupère les données utilisateur
function getUserData() {
  const weightData = storage.get('weightData', []);
  const sleepData = storage.get('sleepData', []);
  const mealsData = storage.get('mealsData', []);
  const sessionsData = storage.get('sessionsData', []);
  const goals = storage.get('goals', {});
  const settings = storage.get('settings', {});
  
  return {
    weight: weightData,
    sleep: sleepData,
    meals: mealsData,
    sessions: sessionsData,
    goals: goals,
    settings: settings
  };
}

// Formatte les données pour l'IA
function formatDataForAI() {
  const data = getUserData();
  
  const lastWeight = data.weight.length > 0 ? data.weight[data.weight.length - 1].value : null;
  const lastSleep = data.sleep.length > 0 ? data.sleep[data.sleep.length - 1].duration : null;
  const recentMeals = data.meals.slice(-3);
  const recentSessions = data.sessions.slice(-3);
  
  return {
    lastWeight: lastWeight,
    height: data.settings.height || null,
    goal: data.goals.weightGoal || null,
    lastSleep: lastSleep,
    recentMeals: recentMeals,
    recentSessions: recentSessions
  };
}

// Fonction générique pour appeler l'IA
async function callAI(prompt, maxTokens = 200) {
  try {

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/Meta-Llama-3-8B-Instruct",
        messages: [
          { role: "system", content: "Tu es KaliFit, un assistant fitness expert et bienveillant." },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7
      })
    });

    const result = await response.json();

    if (result.choices && result.choices[0]) {
      return result.choices[0].message.content.trim();
    }

    return null;

  } catch (error) {
    console.error("Erreur IA:", error);
    return null;
  }
}

// Génère une suggestion nutritionnelle
async function generateNutritionSuggestion() {

  const data = formatDataForAI();

  const mealsText = data.recentMeals.length > 0 
    ? data.recentMeals.map(m => `${m.date}: ${m.name}`).join(', ')
    : "Aucun repas enregistré";

  const prompt = `Tu es un nutritionniste expert. Basé sur les repas récents: ${mealsText}
Donne 3 suggestions courtes et pratiques pour améliorer l'alimentation. Réponds en français.`;

  return await callAI(prompt, 200);
}

// Génère une suggestion d'entraînement
async function generateWorkoutSuggestion() {

  const data = formatDataForAI();

  const sessionsText = data.recentSessions.length > 0 
    ? data.recentSessions.map(s => `${s.date}: ${s.type} (${s.duration}min)`).join(', ')
    : "Aucune séance enregistrée";

  const weightInfo = data.lastWeight
    ? `Poids actuel: ${data.lastWeight}kg, Objectif: ${data.goal}kg`
    : "Pas de données de poids";

  const prompt = `Tu es un coach fitness expert.
Séances récentes: ${sessionsText}
${weightInfo}

Donne une suggestion d'entraînement courte (2-3 phrases). Réponds en français.`;

  return await callAI(prompt, 200);
}

// Génère une suggestion de sommeil
async function generateSleepSuggestion() {

  const data = formatDataForAI();

  const sleepInfo = data.lastSleep
    ? `Sommeil dernière nuit: ${data.lastSleep}h`
    : "Pas de données de sommeil";

  const prompt = `Tu es un expert en sommeil et santé.
${sleepInfo}

Donne une suggestion pour améliorer le sommeil (2-3 phrases). Réponds en français.`;

  return await callAI(prompt, 150);
}

// Met à jour les suggestions IA dans le HTML
async function updateAllAISuggestions() {

  try {

    const nutritionSuggestion = await generateNutritionSuggestion();
    if (nutritionSuggestion) {
      const nutritionCard = document.querySelectorAll('.ia-text')[0];
      if (nutritionCard) {
        nutritionCard.innerHTML = nutritionSuggestion.split('\n').slice(0,3).join('<br>');
        nutritionCard.classList.add('ia-updated');
      }
    }

    const workoutSuggestion = await generateWorkoutSuggestion();
    if (workoutSuggestion) {
      const workoutCard = document.querySelectorAll('.ia-text')[1];
      if (workoutCard) {
        workoutCard.innerHTML = workoutSuggestion.split('\n').slice(0,3).join('<br>');
        workoutCard.classList.add('ia-updated');
      }
    }

  } catch (error) {
    console.error("Erreur lors de la mise à jour IA:", error);
  }
}

// Rafraîchir les suggestions
function refreshAISuggestions() {
  updateAllAISuggestions().catch(error =>
    console.error("Erreur rafraîchissement IA:", error)
  );
}

window.refreshAISuggestions = refreshAISuggestions;

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {

  setTimeout(() => {
    updateAllAISuggestions();
    console.log('[IA] Suggestions mises à jour');
  }, 1500);

});

// Rafraîchir toutes les 2h
setInterval(() => {

  updateAllAISuggestions();
  console.log('[IA] Rafraîchissement automatique');

}, 7200000);

// Observer changements localStorage
const originalSet = Storage.prototype.setItem;

Storage.prototype.setItem = function(key, value) {

  originalSet.call(this, key, value);

  if (['weightData','mealsData','sessionsData','sleepData','nutritionData'].includes(key)) {

    console.log(`[IA] Données mises à jour: ${key}`);

    if (window.refreshAISuggestions) {
      setTimeout(() => window.refreshAISuggestions(), 300);
    }

  }

};