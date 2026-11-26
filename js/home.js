const MOTIVATIONS = [
  'Small consistent steps beat perfect weeks.',
  'Protect your sleep and the rest gets easier.',
  'A short workout still counts — especially on hard days.',
  'Money clarity reduces stress. Log today\'s spends.',
  'Call, lift, hydrate, sleep. That\'s a solid day.',
  'You don\'t need a perfect schedule — just a balanced one.'
];

function motivationMessage() {
  const day = Math.floor(Date.now() / 86400000);
  return MOTIVATIONS[day % MOTIVATIONS.length];
}

function overviewScores() {
  const spent = weekSpent(data);
  const budget = data.settings.budget || 1;
  const moneyScore = Math.max(0, Math.min(100, 100 - (spent / budget) * 50 + (getBalance(data) > 0 ? 10 : 0)));
  const healthScore = Math.min(100, (todayWater() / (data.health.waterTargetMl || 2500)) * 40 + (weekWorkouts() / 3) * 40 + (todayCalories() > 0 ? 20 : 0));
  const habitScore = visibleHabits().length ? (habitsTodayDone() / visibleHabits().length) * 100 : 0;
  const sleepH = lastSleepHours();
  const sleepScore = sleepH == null ? 40 : Math.max(0, 100 - Math.abs(sleepH - 8) * 15);
  const goalSaved = total(data.goals, g => +g.current || 0);
  const goalTarget = total(data.goals, g => +g.target || 0) || 1;
  const goalScore = Math.min(100, (goalSaved / goalTarget) * 100);
  return {
    money: Math.round(moneyScore),
    health: Math.round(healthScore),
    habits: Math.round(habitScore),
    sleep: Math.round(sleepScore),
    goals: Math.round(goalScore)
  };
}

function buildAdvice() {
  const tips = [];
  const spent = weekSpent(data);
  const insights = moneyInsights(spent);
  if (insights[0]) tips.push({ area: 'Money', title: insights[0][0], body: insights[0][1] });

  if (weekWorkouts() < 2) tips.push({ area: 'Fitness', title: 'Gym consistency is low this week', body: `You've logged ${weekWorkouts()} workout${weekWorkouts() === 1 ? '' : 's'}. Aim for your next session on a free evening — check Schedule for suggested gym days.` });
  else tips.push({ area: 'Fitness', title: 'Training is on track', body: `${weekWorkouts()} sessions logged this week. Keep the 3-day split rolling without stacking every night.` });

  const sleepH = lastSleepHours();
  if (sleepH != null && (sleepH < 6.5 || sleepH > 9.5)) tips.push({ area: 'Sleep', title: 'Sleep timing needs attention', body: `Last logged sleep was ${sleepH}h. Nudge toward your ${data.health.sleep.bedtimeTarget} bedtime target.` });
  else if (sleepH == null) tips.push({ area: 'Sleep', title: 'Start logging sleep', body: 'Record bed and wake times for a few nights so PocketTrack can spot patterns.' });

  const habitDone = habitsTodayDone();
  const habitTotal = visibleHabits().length;
  if (habitTotal && habitDone < habitTotal / 2) tips.push({ area: 'Habits', title: 'Ease the load if today is hard', body: 'Turn on Minimum Effort Mode in Routines to keep essential habits without aiming for perfection.' });

  const waterPct = todayWater() / (data.health.waterTargetMl || 2500);
  if (waterPct < 0.4) tips.push({ area: 'Health', title: 'Hydration is behind', body: 'Quick-add 250ml or 500ml from Health → Water.' });

  return tips.slice(0, 5);
}

function weeklyReview() {
  const wins = [];
  const struggles = [];
  const next = [];

  const spent = weekSpent(data);
  if (spent <= data.settings.budget) wins.push(`Stayed within weekly budget (${money(spent)} of ${money(data.settings.budget)})`);
  else struggles.push(`Went over budget by ${money(spent - data.settings.budget)}`);

  const workouts = weekWorkouts();
  if (workouts >= 3) wins.push(`Hit ${workouts} gym sessions`);
  else if (workouts > 0) { wins.push(`Trained ${workouts} time${workouts > 1 ? 's' : ''}`); struggles.push('Missed the full 3-day gym target'); }
  else struggles.push('No workouts logged this week');

  if (+data.settings.locked > 0) wins.push(`Keeping ${money(data.settings.locked)} locked in savings`);

  const sleepLogs = (data.health.sleep.logs || []).filter(l => isThisWeek(l.date));
  if (sleepLogs.length >= 4) wins.push(`Logged sleep ${sleepLogs.length} nights`);
  else if (sleepLogs.length) struggles.push('Sleep logging was inconsistent');
  else struggles.push('Sleep was not tracked');

  let habitDays = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(weekStart());
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const done = data.routines.habits.filter(h => h.done && h.done[key]).length;
    if (done >= Math.ceil(data.routines.habits.length * 0.5)) habitDays++;
  }
  if (habitDays >= 4) wins.push(`Solid habit days: ${habitDays}/7`);
  else struggles.push(`Only ${habitDays} stronger habit days this week`);

  if (struggles.some(s => /budget/i.test(s))) next.push('Set a takeaway limit for next week and pack food for 1–2 shifts.');
  if (workouts < 3) next.push('Book 3 gym sessions on free evenings before filling free time.');
  if (sleepLogs.length < 4) next.push('Use the night routine and a fixed bedtime alarm.');
  if (!next.length) next.push('Keep the same rhythm — protect gym, sleep, and one social night.');

  return { wins, struggles, next: next.slice(0, 3) };
}

function renderHome() {
  const scores = overviewScores();
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  set('ovMoney', scores.money + '%');
  set('ovHealth', scores.health + '%');
  set('ovHabits', scores.habits + '%');
  set('ovSleep', scores.sleep + '%');

  const plan = document.getElementById('todayPlan');
  if (plan) {
    plan.innerHTML = todayPlanItems().map(item => `<div class="check-item ${item.done ? 'done' : ''}" onclick="togglePlanItem('${item.id}')"><div class="check-box">${icon('check')}</div><div><strong>${esc(item.title)}</strong><small>${esc(item.type)}</small></div></div>`).join('') || '<div class="empty">Add schedule items to build today\'s plan.</div>';
  }

  const habits = document.getElementById('homeHabits');
  if (habits) {
    habits.innerHTML = visibleHabits().map(h => {
      const done = !!(h.done && h.done[todayKey()]);
      return `<button class="chip ${done ? 'active' : ''}" onclick="toggleHabit('${h.id}')">${done ? '✓ ' : ''}${esc(h.name)}</button>`;
    }).join('') || '<span class="small-note">No habits yet</span>';
  }

  const bal = getBalance(data);
  const spent = weekSpent(data);
  set('homeBalance', money(bal));
  set('homeSpent', money(spent));
  set('homeBudgetLeft', money(Math.max(0, (data.settings.budget || 0) - spent)));
  set('homeLocked', money(+data.settings.locked || 0));
  set('homeSubs', money(monthlySubs(data)));

  set('homeCals', todayCalories() + ' kcal');
  set('homeWater', (todayWater() / 1000).toFixed(1) + 'L');
  set('homeGym', weekWorkouts() + ' workouts');
  const sleepH = lastSleepHours();
  set('homeSleep', sleepH != null ? sleepH + 'h last night' : 'Not logged');

  const mot = document.getElementById('motivationText');
  if (mot) mot.textContent = motivationMessage();

  const advice = document.getElementById('homeAdvice');
  if (advice) {
    const tips = buildAdvice();
    advice.innerHTML = tips.slice(0, 2).map(t => `<div class="insight"><div class="spark">${icon('spark')}</div><div><strong>${esc(t.title)}</strong><p>${esc(t.body)}</p></div></div>`).join('');
  }
}

function renderReview() {
  const rev = weeklyReview();
  const wins = document.getElementById('reviewWins');
  const struggles = document.getElementById('reviewStruggles');
  const next = document.getElementById('reviewNext');
  if (wins) wins.innerHTML = rev.wins.map(w => `<div class="item"><div class="item-icon">${icon('check')}</div><div class="item-main"><strong>${esc(w)}</strong></div></div>`).join('') || '<div class="empty">Keep logging to see wins.</div>';
  if (struggles) struggles.innerHTML = rev.struggles.map(w => `<div class="item"><div class="item-icon">${icon('spark')}</div><div class="item-main"><strong>${esc(w)}</strong></div></div>`).join('') || '<div class="empty">No major struggles spotted from your logs.</div>';
  if (next) next.innerHTML = rev.next.map((w, i) => `<div class="insight" style="margin-bottom:8px"><div class="spark num">${i + 1}</div><div><strong>Focus</strong><p>${esc(w)}</p></div></div>`).join('');
}

function renderAdvicePage() {
  const box = document.getElementById('adviceList');
  if (!box) return;
  box.innerHTML = buildAdvice().map(t => `<div class="insight" style="margin-bottom:10px"><div class="spark">${icon('spark')}</div><div><span class="badge">${esc(t.area)}</span><strong style="display:block;margin-top:6px">${esc(t.title)}</strong><p>${esc(t.body)}</p></div></div>`).join('') || '<div class="empty">Log a few days of activity to unlock advice.</div>';
}
