function recommendGymDays() {
  const busy = new Set(data.schedule.shifts.map(s => s.day));
  data.schedule.events.filter(e => e.type === 'social').forEach(e => busy.add(e.day));
  const free = [];
  for (let d = 0; d < 7; d++) {
    if (!busy.has(d)) free.push(d);
  }
  // Prefer weekday evenings that aren't overloaded; aim for 3 days
  const preferred = [0, 2, 4, 1, 3, 5, 6].filter(d => free.includes(d) || !data.schedule.shifts.some(s => s.day === d && hourOf(s.end) > 20));
  const picks = [];
  for (const d of preferred) {
    if (picks.length >= 3) break;
    // Avoid stacking gym on heavy social nights
    const social = data.schedule.events.some(e => e.day === d && e.type === 'social');
    if (social && picks.length >= 2) continue;
    if (!picks.includes(d)) picks.push(d);
  }
  while (picks.length < 3) {
    for (let d = 0; d < 7 && picks.length < 3; d++) if (!picks.includes(d)) picks.push(d);
  }
  data.schedule.gymDays = picks.slice(0, 3).sort((a, b) => a - b);
}

function hourOf(t) {
  if (!t) return 12;
  return +String(t).split(':')[0] || 12;
}

function toggleGymDay(day) {
  const set = new Set(data.schedule.gymDays || []);
  if (set.has(day)) set.delete(day);
  else {
    if (set.size >= 3) {
      // replace earliest
      const arr = [...set].sort((a, b) => a - b);
      set.delete(arr[0]);
    }
    set.add(day);
  }
  data.schedule.gymDays = [...set].sort((a, b) => a - b);
  persist();
}

function addScheduleEvent() {
  const title = document.getElementById('evtTitle').value.trim();
  const day = +document.getElementById('evtDay').value;
  const type = document.getElementById('evtType').value;
  const start = document.getElementById('evtStart').value || '18:00';
  const end = document.getElementById('evtEnd').value || '19:00';
  if (!title) return toast('Enter a title');
  data.schedule.events.push({ id: uid(), day, title, type, start, end });
  document.getElementById('evtTitle').value = '';
  persist();
  toast('Added to schedule');
}

function addWorkShift() {
  const day = +document.getElementById('shiftDay').value;
  const start = document.getElementById('shiftStart').value || '09:00';
  const end = document.getElementById('shiftEnd').value || '17:00';
  data.schedule.shifts = data.schedule.shifts.filter(s => !(s.day === day && s.source === 'manual'));
  data.schedule.shifts.push({ id: uid(), day, title: 'Work', type: 'work', start, end, source: 'manual' });
  recommendGymDays();
  persist();
  toast('Work shift saved');
}

function removeEvent(id) {
  data.schedule.events = data.schedule.events.filter(e => e.id !== id);
  persist();
}

function removeShift(id) {
  data.schedule.shifts = data.schedule.shifts.filter(s => s.id !== id);
  recommendGymDays();
  persist();
}

function dayItems(day) {
  const items = [];
  data.schedule.shifts.filter(s => s.day === day).forEach(s => items.push(s));
  data.schedule.events.filter(e => e.day === day).forEach(e => items.push(e));
  if ((data.schedule.gymDays || []).includes(day)) {
    items.push({ id: 'gym-' + day, title: 'Gym', type: 'gym', start: '17:30', end: '18:45' });
  }
  // Soft anchors
  items.push({ id: 'sleep-' + day, title: 'Sleep window', type: 'sleep', start: data.health.sleep.bedtimeTarget || '23:00', end: data.health.sleep.wakeTarget || '07:00' });
  return items.sort((a, b) => String(a.start).localeCompare(String(b.start)));
}

function todayPlanItems() {
  const day = dayIndex();
  const items = [];
  const checks = data.schedule.todayChecks[todayKey()] || {};

  items.push({ id: 'plan-morning', title: 'Morning routine', type: 'routine', done: routineComplete('morning') });
  dayItems(day).filter(x => x.type === 'work' || x.type === 'gym' || x.type === 'social' || x.type === 'personal').forEach(x => {
    items.push({
      id: 'plan-' + x.id,
      title: x.title + (x.start ? ` (${x.start})` : ''),
      type: x.type,
      done: !!checks['plan-' + x.id]
    });
  });
  items.push({ id: 'plan-habits', title: 'Daily habits', type: 'routine', done: habitsTodayDone() >= Math.max(1, Math.ceil(visibleHabits().length * 0.6)) });
  items.push({ id: 'plan-night', title: 'Night routine', type: 'routine', done: routineComplete('night') });
  return items;
}

function togglePlanItem(id) {
  if (id === 'plan-morning' || id === 'plan-night' || id === 'plan-habits') {
    toast('Complete this from Routines / Health');
    return;
  }
  const k = todayKey();
  if (!data.schedule.todayChecks[k]) data.schedule.todayChecks[k] = {};
  data.schedule.todayChecks[k][id] = !data.schedule.todayChecks[k][id];
  persist();
}

function renderSchedule() {
  if (!(data.schedule.gymDays || []).length) recommendGymDays();

  const grid = document.getElementById('weekGrid');
  if (grid) {
    const today = dayIndex();
    grid.innerHTML = DAY_NAMES.map((name, day) => {
      const items = dayItems(day).filter(x => x.type !== 'sleep');
      const gym = (data.schedule.gymDays || []).includes(day);
      return `<div class="day-card ${day === today ? 'today' : ''}"><h3>${name}${day === today ? ' · Today' : ''}<span>${gym ? 'Gym day' : ''}</span></h3>${items.map(i => `<span class="event-pill ${i.type}">${esc(i.title)}${i.start && i.type !== 'gym' ? ' ' + i.start : ''}</span>`).join('') || '<span class="small-note">Open / free time</span>'}<div style="margin-top:8px"><button class="chip ${gym ? 'active' : ''}" onclick="toggleGymDay(${day})">${gym ? 'Gym scheduled' : 'Mark gym'}</button></div></div>`;
    }).join('');
  }

  const gymRec = document.getElementById('gymRec');
  if (gymRec) {
    const days = (data.schedule.gymDays || []).map(d => DAY_SHORT[d]).join(', ');
    gymRec.innerHTML = `<strong>Suggested gym days: ${days || '—'}</strong><p class="small-note" style="margin:6px 0 0">Based on work shifts and social plans. Aim for 3 sessions without stacking every evening. Tap Mark gym to adjust.</p>`;
  }

  const shiftList = document.getElementById('shiftList');
  if (shiftList) {
    shiftList.innerHTML = data.schedule.shifts.map(s => `<div class="item"><div class="item-icon">${icon('work')}</div><div class="item-main"><strong>${DAY_NAMES[s.day]} work</strong><small>${s.start}–${s.end}</small></div><button class="text-btn danger" onclick="removeShift('${s.id}')">Remove</button></div>`).join('') || '<div class="empty">Add work shifts or upload a roster in Money → Pay calc.</div>';
  }

  const evtList = document.getElementById('eventList');
  if (evtList) {
    evtList.innerHTML = data.schedule.events.map(e => `<div class="item"><div class="item-icon">${icon(e.type === 'social' ? 'health' : 'schedule')}</div><div class="item-main"><strong>${esc(e.title)}</strong><small>${DAY_NAMES[e.day]} · ${e.start}–${e.end} · ${esc(e.type)}</small></div><button class="text-btn danger" onclick="removeEvent('${e.id}')">Remove</button></div>`).join('') || '<div class="empty">Add girlfriend time, gaming, or other commitments.</div>';
  }
}
