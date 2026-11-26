function activeRoutineList(kind) {
  const list = data.routines[kind] || [];
  if (data.routines.minimumEffort) return list.filter(t => t.essential);
  return list;
}

function isTaskDone(kind, id) {
  const map = data.routines.completions[todayKey()] || {};
  return !!map[kind + ':' + id];
}

function toggleTask(kind, id) {
  const k = todayKey();
  if (!data.routines.completions[k]) data.routines.completions[k] = {};
  const key = kind + ':' + id;
  data.routines.completions[k][key] = !data.routines.completions[k][key];
  // Sync related habits
  if (kind === 'morning' && routineComplete('morning')) markHabitByName('Morning routine', true);
  if (kind === 'night' && routineComplete('night')) markHabitByName('Night routine', true);
  persist();
}

function routineComplete(kind) {
  return activeRoutineList(kind).every(t => isTaskDone(kind, t.id));
}

function routineProgress(kind) {
  const list = activeRoutineList(kind);
  if (!list.length) return 0;
  const done = list.filter(t => isTaskDone(kind, t.id)).length;
  return done / list.length;
}

function markHabitByName(name, on) {
  const h = data.routines.habits.find(x => x.name === name);
  if (!h) return;
  if (!h.done) h.done = {};
  h.done[todayKey()] = !!on;
}

function toggleHabit(id) {
  const h = data.routines.habits.find(x => x.id === id);
  if (!h) return;
  if (!h.done) h.done = {};
  h.done[todayKey()] = !h.done[todayKey()];
  persist();
}

function habitStreak(h) {
  let streak = 0;
  const d = new Date();
  for (let i = 0; i < 60; i++) {
    const key = d.toISOString().slice(0, 10);
    if (h.done && h.done[key]) streak++;
    else if (i > 0) break;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function habitsTodayDone() {
  const habits = visibleHabits();
  if (!habits.length) return 0;
  return habits.filter(h => h.done && h.done[todayKey()]).length;
}

function visibleHabits() {
  if (data.routines.minimumEffort) return data.routines.habits.filter(h => h.essential);
  return data.routines.habits;
}

function toggleMinimumEffort() {
  data.routines.minimumEffort = !data.routines.minimumEffort;
  persist();
  toast(data.routines.minimumEffort ? 'Minimum effort on — keep the basics going' : 'Full routines restored');
}

function addRoutineTask(kind) {
  const input = document.getElementById(kind + 'NewTask');
  const text = (input.value || '').trim();
  if (!text) return toast('Enter a task');
  data.routines[kind].push({ id: uid(), text, essential: false });
  input.value = '';
  persist();
  toast('Task added');
}

function removeRoutineTask(kind, id) {
  data.routines[kind] = data.routines[kind].filter(t => t.id !== id);
  persist();
}

function addHabit() {
  const name = document.getElementById('newHabit').value.trim();
  if (!name) return toast('Enter a habit name');
  data.routines.habits.push({ id: uid(), name, frequency: 'daily', essential: false, done: {} });
  document.getElementById('newHabit').value = '';
  persist();
  toast('Habit added');
}

function removeHabit(id) {
  data.routines.habits = data.routines.habits.filter(h => h.id !== id);
  persist();
}

function renderRoutines() {
  const me = document.getElementById('minEffortToggle');
  if (me) me.classList.toggle('on', !!data.routines.minimumEffort);

  ['morning', 'night'].forEach(kind => {
    const box = document.getElementById(kind + 'List');
    if (!box) return;
    const list = activeRoutineList(kind);
    box.innerHTML = list.map(t => {
      const done = isTaskDone(kind, t.id);
      return `<div class="check-item ${done ? 'done' : ''}" onclick="toggleTask('${kind}','${t.id}')"><div class="check-box">${icon('check')}</div><div style="flex:1"><strong>${esc(t.text)}</strong>${t.essential ? '<small>Essential</small>' : ''}</div><button class="text-btn danger" onclick="event.stopPropagation();removeRoutineTask('${kind}','${t.id}')">Remove</button></div>`;
    }).join('') || '<div class="empty">No tasks yet.</div>';
    const prog = document.getElementById(kind + 'Prog');
    if (prog) {
      const p = routineProgress(kind) * 100;
      prog.style.width = p + '%';
    }
  });

  const habitList = document.getElementById('habitList');
  if (habitList) {
    habitList.innerHTML = visibleHabits().map(h => {
      const done = !!(h.done && h.done[todayKey()]);
      const streak = habitStreak(h);
      return `<div class="check-item ${done ? 'done' : ''}" onclick="toggleHabit('${h.id}')"><div class="check-box">${icon('check')}</div><div style="flex:1"><strong>${esc(h.name)}</strong><small>${esc(h.frequency)}${streak ? ` · <span class="streak">${streak}-day streak</span>` : ''}</small></div><button class="text-btn danger" onclick="event.stopPropagation();removeHabit('${h.id}')">Remove</button></div>`;
    }).join('') || '<div class="empty">Add habits you want to build.</div>';
  }

  const consistency = document.getElementById('consistencyNote');
  if (consistency) {
    const done = habitsTodayDone();
    const totalH = visibleHabits().length;
    consistency.innerHTML = totalH
      ? `<strong>${done}/${totalH} habits today</strong><p class="small-note" style="margin:6px 0 0">Showing up matters more than perfect streaks. Missed days don't reset your progress — just continue.</p>`
      : '<p class="small-note">Add a few habits to track consistency.</p>';
  }
}
