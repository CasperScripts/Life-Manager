let healthSub = 'overview';

const FOOD_DB = [
  { name: 'Chicken breast (100g)', cal: 165 },
  { name: 'White rice cooked (1 cup)', cal: 205 },
  { name: 'Brown rice cooked (1 cup)', cal: 215 },
  { name: 'Egg (1 large)', cal: 72 },
  { name: 'Oats (40g dry)', cal: 150 },
  { name: 'Banana', cal: 105 },
  { name: 'Apple', cal: 95 },
  { name: 'Greek yoghurt (170g)', cal: 100 },
  { name: 'Wholemeal toast (1 slice)', cal: 80 },
  { name: 'Peanut butter (1 tbsp)', cal: 94 },
  { name: 'Protein shake', cal: 120 },
  { name: 'Salmon (100g)', cal: 208 },
  { name: 'Pasta cooked (1 cup)', cal: 220 },
  { name: 'Beef mince cooked (100g)', cal: 250 },
  { name: 'Avocado (half)', cal: 120 },
  { name: 'Coffee with milk', cal: 40 },
  { name: 'Takeaway burger', cal: 550 },
  { name: 'Pizza slice', cal: 285 },
  { name: 'Salad bowl', cal: 320 },
  { name: 'Sandwich', cal: 350 },
  { name: 'Protein bar', cal: 200 },
  { name: 'Almonds (30g)', cal: 170 },
  { name: 'Milk full cream (250ml)', cal: 160 },
  { name: 'Veggie stir fry + rice', cal: 450 },
  { name: 'Fish and chips', cal: 700 }
];

function showHealthSub(id, btn) {
  healthSub = id;
  document.querySelectorAll('.health-sub').forEach(p => p.classList.toggle('hidden', p.id !== 'health-' + id));
  const buttons = [...document.querySelectorAll('#health .subnav button')];
  buttons.forEach(b => b.classList.remove('active'));
  if (btn && btn.classList) btn.classList.add('active');
  else {
    const map = { overview: 0, nutrition: 1, water: 2, gym: 3, sleep: 4 };
    if (buttons[map[id]]) buttons[map[id]].classList.add('active');
  }
  renderHealth();
}

function todayCalories() {
  return total(data.health.meals.filter(m => m.date === todayKey()), m => +m.calories || 0);
}

function todayWater() {
  return data.health.water[todayKey()] || 0;
}

function todaySteps() {
  return data.health.steps[todayKey()] || 0;
}

function addWater(ml) {
  const k = todayKey();
  data.health.water[k] = (data.health.water[k] || 0) + ml;
  persist();
  toast(`+${ml}ml water`);
}

function setWaterCustom() {
  const v = +document.getElementById('customWater').value;
  if (v <= 0) return toast('Enter an amount');
  addWater(v);
  document.getElementById('customWater').value = '';
}

function saveCalorieTarget() {
  data.health.calorieTarget = +document.getElementById('calorieTarget').value || 2200;
  data.health.waterTargetMl = +document.getElementById('waterTarget').value || 2500;
  persist();
  toast('Health targets saved');
}

function searchFood() {
  const q = (document.getElementById('foodSearch').value || '').toLowerCase().trim();
  const box = document.getElementById('foodResults');
  if (!q) { box.innerHTML = ''; return; }
  const hits = FOOD_DB.filter(f => f.name.toLowerCase().includes(q)).slice(0, 8);
  box.innerHTML = hits.map((f, i) => `<button type="button" data-fi="${i}" onclick="pickFoodIdx(${i})">${esc(f.name)} · ${f.cal} kcal</button>`).join('') || '<div class="empty">No matches — enter calories manually below.</div>';
  box._hits = hits;
}
function pickFoodIdx(i) {
  const hits = document.getElementById('foodResults')._hits || [];
  const f = hits[i];
  if (!f) return;
  pickFood(f.name, f.cal);
}

function pickFood(name, cal) {
  document.getElementById('mealName').value = name;
  document.getElementById('mealCals').value = cal;
  document.getElementById('foodResults').innerHTML = '';
}

function logMeal() {
  const name = document.getElementById('mealName').value.trim();
  const calories = +document.getElementById('mealCals').value;
  const meal = document.getElementById('mealType').value;
  if (!name || calories <= 0) return toast('Enter food and calories');
  data.health.meals.push({ id: uid(), date: todayKey(), meal, name, calories });
  document.getElementById('mealName').value = '';
  document.getElementById('mealCals').value = '';
  persist();
  toast('Meal logged');
}

function deleteMeal(id) {
  data.health.meals = data.health.meals.filter(m => m.id !== id);
  persist();
}

async function scanBarcode() {
  const status = document.getElementById('barcodeStatus');
  if (!('BarcodeDetector' in window)) {
    status.textContent = 'Barcode scanning is not supported in this browser. Enter calories manually.';
    return;
  }
  status.textContent = 'Opening camera…';
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    const video = document.getElementById('barcodeVideo');
    video.srcObject = stream;
    video.classList.remove('hidden');
    await video.play();
    const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
    status.textContent = 'Point at a barcode…';
    const timer = setInterval(async () => {
      try {
        const codes = await detector.detect(video);
        if (codes && codes[0]) {
          clearInterval(timer);
          stream.getTracks().forEach(t => t.stop());
          video.classList.add('hidden');
          const code = codes[0].rawValue;
          status.textContent = 'Looking up ' + code + '…';
          lookupBarcode(code);
        }
      } catch (_) {}
    }, 600);
    setTimeout(() => {
      clearInterval(timer);
      stream.getTracks().forEach(t => t.stop());
      video.classList.add('hidden');
      if (status.textContent.includes('Point')) status.textContent = 'No barcode found. Try again or enter manually.';
    }, 20000);
  } catch (e) {
    status.textContent = 'Camera permission needed for barcode scan, or enter calories manually.';
  }
}

async function lookupBarcode(code) {
  const status = document.getElementById('barcodeStatus');
  try {
    const res = await fetch('https://world.openfoodfacts.org/api/v2/product/' + encodeURIComponent(code) + '.json');
    const json = await res.json();
    if (json.status !== 1 || !json.product) {
      status.textContent = 'Product not found. Enter calories manually.';
      return;
    }
    const p = json.product;
    const name = p.product_name || 'Scanned product';
    const cal = Math.round((p.nutriments && (p.nutriments['energy-kcal_serving'] || p.nutriments['energy-kcal_100g'])) || 0);
    document.getElementById('mealName').value = name;
    if (cal) document.getElementById('mealCals').value = cal;
    status.textContent = cal ? `Found ${name} (~${cal} kcal). Check serving size, then log.` : `Found ${name}. Enter calories manually.`;
  } catch (e) {
    status.textContent = 'Lookup needs internet. Enter calories manually offline.';
  }
}

function noteFoodPhoto() {
  toast('Photo calorie AI needs a paid API — use search or manual entry');
}

function setActiveWorkout(i) {
  data.health.activePlanIndex = i;
  persist();
}

function toggleExercise(dayId, exId) {
  const k = todayKey();
  if (!data.routines.completions[k]) data.routines.completions[k] = {};
  const key = 'ex:' + dayId + ':' + exId;
  data.routines.completions[k][key] = !data.routines.completions[k][key];
  persist();
}

function completeWorkout() {
  const plan = data.health.workoutPlan[data.health.activePlanIndex || 0];
  if (!plan) return;
  data.health.workouts.push({ id: uid(), date: todayKey(), planId: plan.id, name: plan.name });
  const habit = data.routines.habits.find(h => h.name.toLowerCase().includes('gym'));
  if (habit) {
    if (!habit.done) habit.done = {};
    habit.done[todayKey()] = true;
  }
  persist();
  toast('Workout logged — nice work');
}

function savePB() {
  const name = document.getElementById('pbName').value.trim();
  const value = document.getElementById('pbValue').value.trim();
  if (!name || !value) return toast('Enter exercise and PB');
  data.health.personalBests[name] = value;
  document.getElementById('pbName').value = '';
  document.getElementById('pbValue').value = '';
  persist();
  toast('Personal best saved');
}

function saveSleepTargets() {
  data.health.sleep.bedtimeTarget = document.getElementById('bedTarget').value || '23:00';
  data.health.sleep.wakeTarget = document.getElementById('wakeTarget').value || '07:00';
  persist();
  toast('Sleep targets saved');
}

function logSleep() {
  const bed = document.getElementById('bedActual').value;
  const wake = document.getElementById('wakeActual').value;
  if (!bed || !wake) return toast('Enter bed and wake times');
  data.health.sleep.logs = data.health.sleep.logs.filter(l => l.date !== todayKey());
  data.health.sleep.logs.push({ date: todayKey(), bed, wake });
  persist();
  toast('Sleep logged');
}

function saveSteps() {
  const steps = +document.getElementById('manualSteps').value;
  if (steps < 0) return;
  data.health.steps[todayKey()] = steps;
  persist();
  toast('Steps saved');
}

function lastSleepHours() {
  const logs = data.health.sleep.logs || [];
  if (!logs.length) return null;
  const last = [...logs].sort((a, b) => b.date.localeCompare(a.date))[0];
  const [bh, bm] = last.bed.split(':').map(Number);
  const [wh, wm] = last.wake.split(':').map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return +(mins / 60).toFixed(1);
}

function weekWorkouts() {
  return data.health.workouts.filter(w => isThisWeek(w.date)).length;
}

function renderHealth() {
  const cals = todayCalories();
  const target = data.health.calorieTarget || 2200;
  const water = todayWater();
  const waterT = data.health.waterTargetMl || 2500;
  const steps = todaySteps();
  const sleepH = lastSleepHours();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

  set('hCals', cals + ' / ' + target);
  set('nutriCals', cals + ' / ' + target);
  set('hCalsLeft', Math.max(0, target - cals) + ' left');
  set('hWater', (water / 1000).toFixed(1) + 'L');
  set('hWaterLeft', Math.max(0, waterT - water) + 'ml left');
  set('hWorkouts', weekWorkouts() + ' / 3');
  set('hSteps', steps ? steps.toLocaleString() : '—');
  set('hSleep', sleepH != null ? sleepH + 'h' : '—');

  const calBar = document.getElementById('calBar');
  if (calBar) calBar.style.width = Math.min(100, target ? cals / target * 100 : 0) + '%';
  const waterBar = document.getElementById('waterBar');
  if (waterBar) waterBar.style.width = Math.min(100, waterT ? water / waterT * 100 : 0) + '%';

  const waterBig = document.getElementById('waterBig');
  if (waterBig) waterBig.textContent = (water / 1000).toFixed(2) + ' L';

  const ct = document.getElementById('calorieTarget');
  if (ct && document.activeElement !== ct) ct.value = target;
  const wt = document.getElementById('waterTarget');
  if (wt && document.activeElement !== wt) wt.value = waterT;

  const mealList = document.getElementById('mealList');
  if (mealList) {
    const todayMeals = data.health.meals.filter(m => m.date === todayKey()).reverse();
    mealList.innerHTML = todayMeals.map(m => `<div class="item"><div class="item-icon">${icon('food')}</div><div class="item-main"><strong>${esc(m.name)}</strong><small>${esc(m.meal)}</small></div><div class="item-amount">${m.calories} kcal<small><button class="text-btn" onclick="deleteMeal('${m.id}')">Remove</button></small></div></div>`).join('') || '<div class="empty">No meals logged today.</div>';
  }

  const plan = data.health.workoutPlan[data.health.activePlanIndex || 0];
  const planTabs = document.getElementById('workoutTabs');
  if (planTabs) {
    planTabs.innerHTML = data.health.workoutPlan.map((p, i) => `<button class="${i === (data.health.activePlanIndex || 0) ? 'active' : ''}" onclick="setActiveWorkout(${i})">${esc(p.name.replace('Day ', 'D'))}</button>`).join('');
  }
  const exList = document.getElementById('exerciseList');
  if (exList && plan) {
    const doneMap = (data.routines.completions[todayKey()] || {});
    exList.innerHTML = plan.exercises.map(ex => {
      const done = !!doneMap['ex:' + plan.id + ':' + ex.id];
      return `<div class="ex-row ${done ? 'done' : ''}"><div><strong>${esc(ex.name)}</strong><small style="display:block;color:var(--muted)">${ex.sets} × ${esc(ex.reps)}${ex.notes ? ' · ' + esc(ex.notes) : ''}</small></div><button class="secondary" onclick="toggleExercise('${plan.id}','${ex.id}')">${done ? 'Done' : 'Check'}</button></div>`;
    }).join('');
  }

  const hist = document.getElementById('workoutHistory');
  if (hist) {
    hist.innerHTML = [...data.health.workouts].reverse().slice(0, 8).map(w => `<div class="item"><div class="item-icon">${icon('gym')}</div><div class="item-main"><strong>${esc(w.name)}</strong><small>${dateStr(w.date)}</small></div></div>`).join('') || '<div class="empty">No workouts logged yet.</div>';
  }

  const pbList = document.getElementById('pbList');
  if (pbList) {
    const entries = Object.entries(data.health.personalBests || {});
    pbList.innerHTML = entries.map(([k, v]) => `<div class="settings-row"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('') || '<p class="small-note">No personal bests yet.</p>';
  }

  const bedT = document.getElementById('bedTarget');
  const wakeT = document.getElementById('wakeTarget');
  if (bedT && document.activeElement !== bedT) bedT.value = data.health.sleep.bedtimeTarget || '23:00';
  if (wakeT && document.activeElement !== wakeT) wakeT.value = data.health.sleep.wakeTarget || '07:00';

  const sleepHist = document.getElementById('sleepHistory');
  if (sleepHist) {
    sleepHist.innerHTML = [...(data.health.sleep.logs || [])].reverse().slice(0, 7).map(l => {
      const [bh, bm] = l.bed.split(':').map(Number);
      const [wh, wm] = l.wake.split(':').map(Number);
      let mins = (wh * 60 + wm) - (bh * 60 + bm); if (mins <= 0) mins += 24 * 60;
      return `<div class="item"><div class="item-icon">${icon('sleep')}</div><div class="item-main"><strong>${dateStr(l.date)}</strong><small>${l.bed} → ${l.wake}</small></div><div class="item-amount">${(mins / 60).toFixed(1)}h</div></div>`;
    }).join('') || '<div class="empty">Log sleep to see consistency.</div>';
  }

  const stepsEl = document.getElementById('manualSteps');
  if (stepsEl && document.activeElement !== stepsEl) stepsEl.value = steps || '';
}
