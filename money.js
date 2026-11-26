let activityFilter = 'all';
let lastCalc = 0;
let parsedShifts = [];
let tesseractLoading = null;
let moneySubPage = 'overview';

function itemHTML(t) {
  return `<div class="item"><div class="item-icon">${iconForCategory(t.category)}</div><div class="item-main"><strong>${esc(t.name)}</strong><small>${esc(t.category)} · ${dateStr(t.date)}</small></div><div class="item-amount" style="color:${t.type === 'income' ? 'var(--good)' : 'var(--text)'}">${t.type === 'income' ? '+' : '−'}${money(t.amount)}<small>${t.type === 'income' ? 'Income' : 'Expense'}</small></div></div>`;
}

function showMoneySub(id, btn) {
  moneySubPage = id;
  document.querySelectorAll('.money-sub').forEach(p => p.classList.toggle('hidden', p.id !== 'money-' + id));
  const buttons = [...document.querySelectorAll('#money .subnav button')];
  buttons.forEach(b => b.classList.remove('active'));
  if (btn && btn.classList) btn.classList.add('active');
  else {
    const map = { overview: 0, activity: 1, subs: 2, savings: 3, calc: 4, insights: 5 };
    if (buttons[map[id]]) buttons[map[id]].classList.add('active');
  }
  renderMoney();
}

function openForm(type) {
  const title = type === 'expense' ? 'Log spending' : type === 'income' ? 'Add income' : 'Add subscription';
  document.getElementById('modalTitle').textContent = title;
  let body = '';
  if (type === 'subscription') {
    body = `<div class="field"><label>Subscription name</label><input id="fName" placeholder="Netflix, phone plan..."></div><div class="two"><div class="field"><label>Amount ($)</label><input id="fAmount" type="number" min="0" step="0.01"></div><div class="field"><label>Frequency</label><select id="fFreq"><option value="monthly">Monthly</option><option value="weekly">Weekly</option><option value="yearly">Yearly</option></select></div></div><div class="field"><label>Next payment date</label><input id="fDate" type="date" value="${todayKey()}"></div><button class="primary" onclick="saveSub()">Save subscription</button>`;
  } else {
    body = `<div class="field"><label>Description</label><input id="fName" placeholder="${type === 'expense' ? 'Lunch, fuel, game...' : 'Pay from work'}"></div><div class="two"><div class="field"><label>Amount ($)</label><input id="fAmount" type="number" min="0" step="0.01" placeholder="0.00"></div><div class="field"><label>Date</label><input id="fDate" type="date" value="${todayKey()}"></div></div><div class="field"><label>Category</label><select id="fCategory">${(type === 'expense' ? ['Food', 'Takeaway', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Coffee', 'Other'] : ['Pay', 'Work', 'Other']).map(c => `<option>${c}</option>`).join('')}</select></div><button class="primary" onclick="saveTransaction('${type}')">Save ${type === 'expense' ? 'spending' : 'income'}</button>`;
  }
  document.getElementById('modalBody').innerHTML = body;
  document.getElementById('modal').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
}

function saveTransaction(type) {
  const name = document.getElementById('fName').value.trim();
  const amount = +document.getElementById('fAmount').value;
  const date = document.getElementById('fDate').value;
  const category = document.getElementById('fCategory').value;
  if (!name || amount <= 0 || !date) return toast('Enter a name, amount and date');
  data.transactions.push({ id: Date.now(), type, name, amount, date, category });
  closeModal();
  persist();
  toast('Saved to your activity');
}

function saveSub() {
  const name = document.getElementById('fName').value.trim();
  const amount = +document.getElementById('fAmount').value;
  const frequency = document.getElementById('fFreq').value;
  const next = document.getElementById('fDate').value;
  if (!name || amount <= 0) return toast('Enter a name and amount');
  data.subscriptions.push({ name, amount, frequency, next });
  closeModal();
  persist();
  toast('Subscription added');
}

function deleteSub(i) {
  if (confirm('Remove this subscription?')) {
    data.subscriptions.splice(i, 1);
    persist();
  }
}

function deleteGoal(i) {
  if (confirm('Remove this goal?')) {
    data.goals.splice(i, 1);
    persist();
  }
}

function addGoal() {
  const name = document.getElementById('goalName').value.trim();
  const target = +document.getElementById('goalTarget').value;
  const current = +document.getElementById('goalCurrent').value || 0;
  if (!name || target <= 0) return toast('Enter a goal and target');
  data.goals.push({ name, target, current });
  document.getElementById('goalName').value = '';
  document.getElementById('goalTarget').value = '';
  document.getElementById('goalCurrent').value = '';
  persist();
  toast('Savings goal created');
}

function contribute(i) {
  const v = prompt('How much are you adding to ' + data.goals[i].name + '?');
  if (v !== null && +v > 0) {
    data.goals[i].current += +v;
    persist();
    toast('Savings updated');
  }
}

function saveLockedSavings() {
  const el = document.getElementById('lockedSavings');
  const v = Math.max(0, +el.value || 0);
  data.settings.locked = v;
  const s = document.getElementById('lockedSavingsSettings');
  if (s) s.value = v;
  persist();
  toast('Locked savings updated');
}

function saveMoneySettings() {
  data.settings.budget = +document.getElementById('weeklyBudget').value || 0;
  data.settings.save = +document.getElementById('weeklySave').value || 0;
  data.settings.start = +document.getElementById('startingBalance').value || 0;
  data.settings.locked = Math.max(0, +document.getElementById('lockedSavingsSettings').value || 0);
  const lockedEl = document.getElementById('lockedSavings');
  if (lockedEl) lockedEl.value = data.settings.locked || '';
  persist();
  toast('Money plan saved');
}

function setActivity(f, b) {
  activityFilter = f;
  document.querySelectorAll('#money-activity .tabs button').forEach(x => x.classList.remove('active'));
  b.classList.add('active');
  renderMoney();
}

function moneyInsights(weekSpentAmt) {
  const by = {};
  data.transactions.filter(t => t.type === 'expense' && isThisWeek(t.date)).forEach(t => {
    by[t.category] = (by[t.category] || 0) + (+t.amount);
  });
  const cats = Object.entries(by).sort((a, b) => b[1] - a[1]);
  const list = [];
  if (!data.transactions.length) list.push(['Start with one week', 'Log your purchases and pay for a week. PocketTrack can then spot patterns from your real numbers.']);
  if (weekSpentAmt > data.settings.budget) list.push(['You are over your weekly budget', `You have spent ${money(weekSpentAmt - data.settings.budget)} above your ${money(data.settings.budget)} weekly limit. Try pausing non-essential purchases until next week.`]);
  else if (data.settings.budget - weekSpentAmt < Math.max(15, data.settings.budget * .15)) list.push(['Budget getting tight', `Only ${money(data.settings.budget - weekSpentAmt)} remains in this week's spending budget. Keep a little buffer for unexpected costs.`]);
  if (cats.length && cats[0][1] > data.settings.budget * .35) list.push([`${cats[0][0]} is your biggest spend`, `${money(cats[0][1])} went to ${cats[0][0]} this week. If that feels high, plan purchases before your shifts.`]);
  const takeaway = by.Takeaway || 0, food = by.Food || 0, coffee = by.Coffee || 0;
  if (takeaway + food + coffee > data.settings.budget * .3) list.push(['Food and convenience spending is adding up', `You've logged ${money(takeaway + food + coffee)} across food, takeaway and coffee this week.`]);
  const subs = monthlySubs(data);
  if (subs > 100) list.push(['Review recurring payments', `Your subscriptions cost about ${money(subs)} per month.`]);
  if (data.settings.save > 0 && weekSpentAmt < data.settings.budget) list.push(['Protect your savings first', `Aim to move ${money(data.settings.save)} into savings after payday.`]);
  if (!list.length) list.push(['Looking steady', `Spending is within your weekly budget. Keep recording and move ${money(data.settings.save)} to savings after payday.`]);
  return list;
}

function renderMoney() {
  const spent = weekSpent(data);
  const earned = weekEarned(data);
  const bal = getBalance(data);
  const locked = +data.settings.locked || 0;
  const goalSaved = total(data.goals, g => +g.current || 0);
  const safe = Math.max(0, (+data.settings.budget || 0) - spent);
  const monthly = monthlySubs(data);
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  set('mBalance', money(bal));
  set('mSaved', money(locked));
  set('mSafe', money(safe));
  set('mWeekNet', money(earned - spent));
  set('mBudgetSpent', `${money(spent)} / ${money(data.settings.budget)}`);
  const pct = data.settings.budget > 0 ? spent / data.settings.budget * 100 : 0;
  const bar = document.getElementById('mBudgetBar');
  if (bar) {
    bar.style.width = Math.min(100, pct) + '%';
    bar.style.background = pct > 100 ? 'var(--bad)' : 'var(--accent)';
  }
  set('mBudgetLeft', spent > data.settings.budget ? `${money(spent - data.settings.budget)} over budget` : `${money(data.settings.budget - spent)} left this week`);
  set('mBudgetPct', Math.round(pct) + '% used');
  set('mGoalTotal', money(goalSaved));
  set('mGoalSub', data.goals.length ? `${data.goals.length} active goal${data.goals.length > 1 ? 's' : ''}` : 'Set your first goal');
  set('mSubsTotal', money(monthly));
  set('mSubsSub', 'Monthly recurring');

  const recent = document.getElementById('mRecent');
  if (recent) recent.innerHTML = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(itemHTML).join('') || '<div class="empty">No activity yet.</div>';

  const activityList = document.getElementById('activityList');
  if (activityList) activityList.innerHTML = data.transactions.filter(t => activityFilter === 'all' || t.type === activityFilter).sort((a, b) => b.date.localeCompare(a.date)).map(itemHTML).join('') || '<div class="empty">Nothing here yet.</div>';

  set('subMonthly', money(monthly));
  set('subYearly', money(monthly * 12));
  const subList = document.getElementById('subList');
  if (subList) subList.innerHTML = data.subscriptions.map((s, i) => `<div class="item"><div class="item-icon">${icon('repeat')}</div><div class="item-main"><strong>${esc(s.name)}</strong><small>${esc(s.frequency)} · Next ${s.next ? dateStr(s.next) : 'date not set'}</small></div><div class="item-amount">${money(s.amount)}<small><button class="text-btn" onclick="deleteSub(${i})">Remove</button></small></div></div>`).join('') || '<div class="empty">No subscriptions yet.</div>';

  const lockedInput = document.getElementById('lockedSavings');
  if (lockedInput && document.activeElement !== lockedInput) lockedInput.value = locked || '';
  const lockedSettings = document.getElementById('lockedSavingsSettings');
  if (lockedSettings && document.activeElement !== lockedSettings) lockedSettings.value = locked;

  const goalList = document.getElementById('goalList');
  if (goalList) {
    goalList.innerHTML = data.goals.map((g, i) => {
      const p = Math.min(100, (g.current / g.target) * 100);
      return `<div class="goal-card"><h3>${esc(g.name)}</h3><div class="goal-amount">${money(g.current)} <span style="font-size:13px;color:var(--muted);font-weight:500">of ${money(g.target)}</span></div><div class="progress"><div style="width:${p}%"></div></div><p>${Math.round(p)}% complete · ${money(Math.max(0, g.target - g.current))} to go</p><button class="text-btn" onclick="contribute(${i})"><span class="ico" data-icon="plus"></span> Add savings</button><button class="text-btn danger" onclick="deleteGoal(${i})">Remove</button></div>`;
    }).join('') || '<div class="empty">Create a goal for your car, emergency fund or something you want.</div>';
    mountIcons(goalList);
  }

  const insights = moneyInsights(spent);
  const insightList = document.getElementById('insightList');
  if (insightList) insightList.innerHTML = insights.map((x, i) => `<div class="insight" style="margin-bottom:10px"><div class="spark num">${i + 1}</div><div><strong>${esc(x[0])}</strong><p>${esc(x[1])}</p></div></div>`).join('');
}

function calcPay() {
  const hb = +document.getElementById('hoursBase').value || 0;
  const hl = +document.getElementById('hoursLate').value || 0;
  const hw = +document.getElementById('hoursWeekend').value || 0;
  const hh = +document.getElementById('hoursHoliday').value || 0;
  const sh = +document.getElementById('shiftCount').value || 0;
  const ws = +document.getElementById('weekendShifts').value || 0;
  const ps = +document.getElementById('holidayShifts').value || 0;
  const rb = +document.getElementById('rateBase').value || 0;
  const rl = +document.getElementById('rateLate').value || 0;
  const rw = +document.getElementById('rateWeekend').value || 0;
  const rh = +document.getElementById('rateHoliday').value || 2;
  const a = hb * rb, b = hl * rl, c = hw * rw, d = hh * rb * rh;
  lastCalc = a + b + c + d;
  document.getElementById('payTotal').textContent = money(lastCalc);
  document.getElementById('payHours').textContent = (hb + hl + hw + hh).toFixed(2).replace(/\.00$/, '') + ' hours';
  document.getElementById('payPerShift').textContent = sh ? money(lastCalc / sh) + ' per shift' : '— per shift';
  document.getElementById('payBreakdown').textContent = `Base ${money(a)} · Late ${money(b)} · Weekend ${money(c)} (${ws} shifts) · Public holiday ${money(d)} (${ps} shifts). Approximate gross pay.`;
}

function saveCalculatedIncome() {
  if (lastCalc <= 0) return toast('Enter your hours first');
  data.transactions.push({ id: Date.now(), type: 'income', name: 'Estimated weekly pay', amount: +lastCalc.toFixed(2), date: todayKey(), category: 'Pay' });
  persist();
  toast('Pay estimate added');
}

function setRosterStatus(msg) {
  const el = document.getElementById('rosterStatus');
  if (el) el.textContent = msg || '';
}

function onRosterDrop(e) {
  e.preventDefault();
  document.getElementById('rosterDrop').classList.remove('drag');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) processRosterFile(f);
}

function onRosterFile(e) {
  const f = e.target.files && e.target.files[0];
  if (f) processRosterFile(f);
  e.target.value = '';
}

function loadTesseract() {
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (tesseractLoading) return tesseractLoading;
  tesseractLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    s.onerror = () => reject(new Error('Could not load scanner'));
    document.head.appendChild(s);
  });
  return tesseractLoading;
}

async function processRosterFile(file) {
  if (!file.type.startsWith('image/')) return toast('Please upload an image screenshot');
  const url = URL.createObjectURL(file);
  document.getElementById('rosterImg').src = url;
  document.getElementById('rosterPreview').style.display = 'block';
  document.getElementById('applyRosterBtn').classList.add('hidden');
  document.getElementById('rosterList').innerHTML = '';
  parsedShifts = [];
  setRosterStatus('Reading roster on your device…');
  try {
    const Tesseract = await loadTesseract();
    setRosterStatus('Scanning shift times…');
    const result = await Tesseract.recognize(file, 'eng', {
      logger: m => {
        if (m.status === 'recognizing text' && m.progress != null) {
          setRosterStatus('Scanning shift times… ' + Math.round(m.progress * 100) + '%');
        }
      }
    });
    parsedShifts = parseRosterText(result.data.text || '');
    // Also push shifts into schedule if days found
    if (parsedShifts.length) {
      parsedShifts.forEach(s => {
        const day = DAY_NAMES.indexOf(s.day);
        if (day < 0) return;
        const start = s.startLabel;
        const end = s.endLabel;
        // convert labels roughly for schedule storage
        data.schedule.shifts = data.schedule.shifts.filter(x => x.day !== day || x.source !== 'roster');
        data.schedule.shifts.push({
          id: uid(), day, title: 'Work', type: 'work',
          start: to24(start), end: to24(end), source: 'roster', hours: s.hours
        });
      });
      recommendGymDays();
    }
    renderParsedRoster();
    if (!parsedShifts.length) {
      setRosterStatus('Could not find clear shift times. Try a sharper screenshot, or enter hours manually.');
      toast('No shifts detected');
    } else {
      setRosterStatus(`Found ${parsedShifts.length} shift${parsedShifts.length > 1 ? 's' : ''}. Mark any public holidays, then apply.`);
      document.getElementById('applyRosterBtn').classList.remove('hidden');
      toast('Roster scanned');
    }
  } catch (err) {
    console.error(err);
    setRosterStatus('Scan failed. Check connection for first scan, then try again.');
    toast('Could not scan roster');
  }
}

function to24(label) {
  if (!label) return '09:00';
  if (label === '12:00am') return '00:00';
  const m = label.match(/(\d+):(\d+)(am|pm)/i);
  if (!m) return '09:00';
  let h = +m[1];
  const min = m[2];
  const ap = m[3].toLowerCase();
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  return String(h).padStart(2, '0') + ':' + min;
}

function parseTimeToken(raw) {
  let s = String(raw || '').trim().toLowerCase().replace(/\s+/g, '');
  s = s.replace(/o/g, '0').replace(/[lI]/g, '1');
  if (/^24:00$|^00:00$|^0:00$|^12:00am$|^12am$/.test(s)) return 24 * 60;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return null;
  let h = +m[1], min = +(m[2] || 0), ap = (m[3] || '').toLowerCase();
  if (min > 59 || h > 24) return null;
  if (ap === 'pm' && h < 12) h += 12;
  if (ap === 'am' && h === 12) h = 0;
  if (!ap && h === 24) return 24 * 60;
  if (h === 24) h = 0;
  if (h > 23) return null;
  return h * 60 + min;
}

function hoursBetween(startMin, endMin) {
  if (startMin == null || endMin == null) return 0;
  let end = endMin;
  if (end <= startMin) end += 24 * 60;
  return Math.max(0, (end - startMin) / 60);
}

function splitWeekdayHours(startMin, endMin) {
  const tot = hoursBetween(startMin, endMin);
  if (!tot) return { ordinary: 0, late: 0 };
  const end = endMin <= startMin ? endMin + 24 * 60 : endMin;
  const lateStart = 22 * 60, lateEnd = 24 * 60;
  let late = 0, cur = startMin;
  while (cur < end) {
    const dayBase = Math.floor(cur / (24 * 60)) * 24 * 60;
    const segEnd = Math.min(end, dayBase + 24 * 60);
    const ls = dayBase + lateStart, le = dayBase + lateEnd;
    const a = Math.max(cur, ls), b = Math.min(segEnd, le);
    if (b > a) late += (b - a) / 60;
    cur = segEnd;
  }
  late = Math.min(late, tot);
  return { ordinary: Math.max(0, tot - late), late };
}

function dayFromMatch(token) {
  token = token.toLowerCase();
  if (/^sun/.test(token)) return { name: 'Sunday', weekend: true };
  if (/^mon/.test(token)) return { name: 'Monday', weekend: false };
  if (/^tue/.test(token)) return { name: 'Tuesday', weekend: false };
  if (/^wed/.test(token)) return { name: 'Wednesday', weekend: false };
  if (/^thu/.test(token)) return { name: 'Thursday', weekend: false };
  if (/^fri/.test(token)) return { name: 'Friday', weekend: false };
  if (/^sat/.test(token)) return { name: 'Saturday', weekend: true };
  return null;
}

function parseRosterText(text) {
  const cleaned = text.replace(/[–—−]/g, '-').replace(/\u00a0/g, ' ');
  const lines = cleaned.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const shifts = [], seen = new Set();
  const dayRe = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;
  const timeRe = /(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to|–|—)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/ig;
  let currentDay = null;
  function pushShift(day, startRaw, endRaw) {
    const start = parseTimeToken(startRaw), end = parseTimeToken(endRaw);
    if (start == null || end == null) return;
    const hrs = hoursBetween(start, end);
    if (hrs <= 0 || hrs > 16) return;
    const key = day.name + '|' + start + '|' + end;
    if (seen.has(key)) return;
    seen.add(key);
    const parts = day.weekend ? { ordinary: 0, late: 0, weekend: hrs } : { ...splitWeekdayHours(start, end), weekend: 0 };
    shifts.push({
      day: day.name, weekend: day.weekend, holiday: false,
      startLabel: formatMins(start), endLabel: formatMins(end),
      hours: +hrs.toFixed(2), ordinary: +parts.ordinary.toFixed(2), late: +parts.late.toFixed(2),
      weekendHours: +parts.weekend.toFixed(2)
    });
  }
  for (const line of lines) {
    if (/\b(off|rdo|leave|annual|sick|unavailable)\b/i.test(line) && !timeRe.test(line)) { timeRe.lastIndex = 0; continue; }
    timeRe.lastIndex = 0;
    const dayMatch = line.match(dayRe);
    if (dayMatch) currentDay = dayFromMatch(dayMatch[1]);
    let times, found = false;
    while ((times = timeRe.exec(line))) {
      found = true;
      const day = currentDay || (dayMatch ? dayFromMatch(dayMatch[1]) : null);
      if (day) pushShift(day, times[1], times[2]);
    }
    if (!found && currentDay) {
      const loose = line.match(/(\d{1,2}(?::\d{2})?)\s*[- ]\s*(\d{1,2}(?::\d{2})?)/);
      if (loose) pushShift(currentDay, loose[1], loose[2]);
    }
  }
  if (!shifts.length) {
    const block = cleaned.replace(/\n/g, ' ');
    const re = /\b(mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b[^0-9]{0,24}(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:-|to)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/ig;
    let m;
    while ((m = re.exec(block))) {
      const day = dayFromMatch(m[1]);
      if (day) pushShift(day, m[2], m[3]);
    }
  }
  const order = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
  return shifts.sort((a, b) => (order[a.day] || 9) - (order[b.day] || 9));
}

function formatMins(mins) {
  if (mins == null) return '';
  if (mins === 24 * 60) return '12:00am';
  const h = Math.floor(mins / 60) % 24, m = mins % 60;
  const ap = h >= 12 ? 'pm' : 'am';
  let hr = h % 12; if (!hr) hr = 12;
  return hr + ':' + (m < 10 ? '0' : '') + m + ap;
}

function renderParsedRoster() {
  const list = document.getElementById('rosterList');
  if (!list) return;
  list.innerHTML = parsedShifts.map((s, i) => `<div class="roster-shift"><div><strong>${esc(s.day)} · ${esc(s.startLabel)}–${esc(s.endLabel)}</strong><small>${s.hours}h · ${s.weekend ? 'Weekend' : s.late ? `Ordinary ${s.ordinary}h + late ${s.late}h` : 'Weekday ordinary'}</small></div><label><input type="checkbox" ${s.holiday ? 'checked' : ''} onchange="toggleHolidayShift(${i},this.checked)"> Public holiday</label></div>`).join('');
}

function toggleHolidayShift(i, on) {
  if (!parsedShifts[i]) return;
  parsedShifts[i].holiday = !!on;
}

function applyParsedRoster() {
  if (!parsedShifts.length) return toast('No shifts to apply');
  let base = 0, late = 0, weekend = 0, holiday = 0, weekendShifts = 0, holidayShifts = 0;
  parsedShifts.forEach(s => {
    if (s.holiday) { holiday += s.hours; holidayShifts++; }
    else if (s.weekend) { weekend += s.weekendHours || s.hours; weekendShifts++; }
    else { base += s.ordinary; late += s.late; }
  });
  document.getElementById('hoursBase').value = +base.toFixed(2);
  document.getElementById('hoursLate').value = +late.toFixed(2);
  document.getElementById('hoursWeekend').value = +weekend.toFixed(2);
  document.getElementById('hoursHoliday').value = +holiday.toFixed(2);
  document.getElementById('weekendShifts').value = weekendShifts;
  document.getElementById('holidayShifts').value = holidayShifts;
  document.getElementById('shiftCount').value = parsedShifts.length;
  calcPay();
  persist();
  setRosterStatus(`Applied ${parsedShifts.length} shifts to the calculator.`);
  toast('Hours filled from roster');
}
