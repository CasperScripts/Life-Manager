let data = loadData();
let currentPage = 'home';

function persist() {
  saveData(data);
  render();
}

function toast(s) {
  const el = document.getElementById('toast');
  el.textContent = s;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 2200);
}

function showPage(id, btn) {
  currentPage = id;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === id));
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  if (btn && btn.dataset.page) btn.classList.add('active');
  window.scrollTo(0, 0);
  render();
}

function exportData() {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'pockettrack-backup.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('Backup exported');
}

function importData(e) {
  const f = e.target.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!d.transactions || !d.settings) throw 0;
      data = migrate(d);
      persist();
      hydrateSettingsForms();
      toast('Backup restored');
    } catch (_) {
      toast('That backup file is not valid');
    }
  };
  r.readAsText(f);
  e.target.value = '';
}

function resetData() {
  if (confirm('This permanently deletes your PocketTrack data on this device. Export a backup first. Continue?')) {
    data = resetStoredData();
    persist();
    hydrateSettingsForms();
    toast('Data reset');
  }
}

function hydrateSettingsForms() {
  const map = {
    weeklyBudget: data.settings.budget,
    weeklySave: data.settings.save,
    startingBalance: data.settings.start,
    lockedSavingsSettings: data.settings.locked || 0,
    lockedSavings: data.settings.locked || '',
    calorieTarget: data.health.calorieTarget,
    waterTarget: data.health.waterTargetMl
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val;
  });
}

function render() {
  renderHome();
  renderMoney();
  renderHealth();
  renderRoutines();
  renderSchedule();
  renderReview();
  renderAdvicePage();
  renderReminders();
  mountIcons();
}

function init() {
  if (!(data.schedule.gymDays || []).length) recommendGymDays();
  mountIcons();
  hydrateSettingsForms();
  calcPay();
  render();
  scheduleReminderChecks();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
