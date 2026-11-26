let reminderTimer = null;

function requestNotifyPermission() {
  if (!('Notification' in window)) {
    toast('Notifications are not supported in this browser');
    return;
  }
  Notification.requestPermission().then(p => {
    data.reminders.permissionAsked = true;
    persist();
    toast(p === 'granted' ? 'Notifications enabled' : 'Notifications blocked — you can enable later in Safari settings');
  });
}

function toggleReminder(id) {
  const item = data.reminders.items.find(r => r.id === id);
  if (!item) return;
  item.enabled = !item.enabled;
  if (item.enabled && Notification.permission !== 'granted') requestNotifyPermission();
  persist();
  scheduleReminderChecks();
}

function updateReminderTime(id, time) {
  const item = data.reminders.items.find(r => r.id === id);
  if (!item) return;
  item.time = time;
  persist();
}

function scheduleReminderChecks() {
  if (reminderTimer) clearInterval(reminderTimer);
  reminderTimer = setInterval(checkReminders, 30000);
  checkReminders();
}

function checkReminders() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const stamp = hh + ':' + mm;
  const dayKey = todayKey();
  data.reminders.items.filter(r => r.enabled && r.time === stamp).forEach(r => {
    const firedKey = 'fired:' + dayKey + ':' + r.id + ':' + stamp;
    if (sessionStorage.getItem(firedKey)) return;
    sessionStorage.setItem(firedKey, '1');
    try {
      new Notification('PocketTrack', { body: r.label, tag: r.id });
    } catch (_) {}
  });
}

function renderReminders() {
  const box = document.getElementById('reminderList');
  if (!box) return;
  const perm = ('Notification' in window) ? Notification.permission : 'unsupported';
  const status = document.getElementById('notifyStatus');
  if (status) status.textContent = perm === 'granted' ? 'Notifications allowed' : perm === 'denied' ? 'Blocked in browser settings' : perm === 'unsupported' ? 'Not supported here' : 'Not enabled yet';

  box.innerHTML = data.reminders.items.map(r => `<div class="settings-row"><div><strong style="font-size:13px">${esc(r.label)}</strong><div class="small-note">${r.enabled ? 'On' : 'Off'}</div></div><div style="display:flex;align-items:center;gap:8px"><input type="time" value="${r.time}" onchange="updateReminderTime('${r.id}',this.value)"><button class="toggle-sw ${r.enabled ? 'on' : ''}" onclick="toggleReminder('${r.id}')" aria-label="Toggle"></button></div></div>`).join('');
}
