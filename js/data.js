const KEY = 'pockettrack.v1';
const SCHEMA = 2;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function weekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

function isThisWeek(dateStr) {
  return new Date(dateStr + 'T12:00:00') >= weekStart();
}

function money(n) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(n) || 0);
}

function dateStr(d) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function total(arr, fn) {
  return arr.reduce((s, x) => s + fn(x), 0);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function defaultWorkoutPlan() {
  return [
    {
      id: 'day-a',
      name: 'Day A — Push',
      exercises: [
        { id: 'a1', name: 'Bench Press', sets: 3, reps: '8-10', notes: 'Controlled tempo, full range' },
        { id: 'a2', name: 'Overhead Press', sets: 3, reps: '8-10', notes: 'Brace core' },
        { id: 'a3', name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', notes: '' },
        { id: 'a4', name: 'Lateral Raises', sets: 3, reps: '12-15', notes: '' },
        { id: 'a5', name: 'Tricep Pushdowns', sets: 3, reps: '10-12', notes: '' }
      ]
    },
    {
      id: 'day-b',
      name: 'Day B — Pull',
      exercises: [
        { id: 'b1', name: 'Lat Pulldown', sets: 3, reps: '8-10', notes: 'Squeeze at bottom' },
        { id: 'b2', name: 'Seated Row', sets: 3, reps: '8-10', notes: '' },
        { id: 'b3', name: 'Face Pulls', sets: 3, reps: '12-15', notes: 'Rear delts' },
        { id: 'b4', name: 'Dumbbell Curls', sets: 3, reps: '10-12', notes: '' },
        { id: 'b5', name: 'Hammer Curls', sets: 2, reps: '10-12', notes: '' }
      ]
    },
    {
      id: 'day-c',
      name: 'Day C — Legs',
      exercises: [
        { id: 'c1', name: 'Goblet Squat', sets: 3, reps: '8-10', notes: 'Depth you can control' },
        { id: 'c2', name: 'Romanian Deadlift', sets: 3, reps: '8-10', notes: 'Hinge, soft knees' },
        { id: 'c3', name: 'Walking Lunges', sets: 3, reps: '10/leg', notes: '' },
        { id: 'c4', name: 'Leg Curl', sets: 3, reps: '10-12', notes: '' },
        { id: 'c5', name: 'Calf Raises', sets: 3, reps: '12-15', notes: '' }
      ]
    }
  ];
}

function defaultHealth() {
  return {
    calorieTarget: 2200,
    waterTargetMl: 2500,
    meals: [],
    water: {},
    steps: {},
    workouts: [],
    personalBests: {},
    workoutPlan: defaultWorkoutPlan(),
    activePlanIndex: 0,
    sleep: {
      bedtimeTarget: '23:00',
      wakeTarget: '07:00',
      logs: []
    }
  };
}

function defaultRoutines() {
  return {
    minimumEffort: false,
    morning: [
      { id: 'm1', text: 'Make bed', essential: true },
      { id: 'm2', text: 'Drink a glass of water', essential: true },
      { id: 'm3', text: 'Put on smartwatch', essential: true },
      { id: 'm4', text: 'Quick stretch / mobility', essential: false },
      { id: 'm5', text: 'Review today’s plan', essential: false }
    ],
    night: [
      { id: 'n1', text: 'Call / message girlfriend', essential: true },
      { id: 'n2', text: 'Prep clothes / bag for tomorrow', essential: false },
      { id: 'n3', text: 'No screens 20 min before bed', essential: true },
      { id: 'n4', text: 'Lights out near target bedtime', essential: true }
    ],
    habits: [
      { id: 'h1', name: 'Drink enough water', frequency: 'daily', essential: true, done: {} },
      { id: 'h2', name: 'Morning routine', frequency: 'daily', essential: true, done: {} },
      { id: 'h3', name: 'Gym session', frequency: 'weekly', target: 3, essential: false, done: {} },
      { id: 'h4', name: 'Wear smartwatch', frequency: 'daily', essential: true, done: {} },
      { id: 'h5', name: 'Night routine', frequency: 'daily', essential: true, done: {} },
      { id: 'h6', name: 'Call before bed', frequency: 'daily', essential: false, done: {} }
    ],
    completions: {}
  };
}

function defaultSchedule() {
  return {
    events: [
      { id: 'e1', day: 5, title: 'See girlfriend', type: 'social', start: '18:00', end: '21:00' },
      { id: 'e2', day: 6, title: 'Gaming / relax', type: 'personal', start: '19:00', end: '22:00' }
    ],
    shifts: [],
    gymDays: [],
    todayChecks: {}
  };
}

function defaultReminders() {
  return {
    permissionAsked: false,
    items: [
      { id: 'r1', label: 'Morning routine', time: '07:30', enabled: false, kind: 'morning' },
      { id: 'r2', label: 'Water check-in', time: '14:00', enabled: false, kind: 'water' },
      { id: 'r3', label: 'Night routine / bedtime', time: '22:30', enabled: false, kind: 'sleep' },
      { id: 'r4', label: 'Gym reminder', time: '17:00', enabled: false, kind: 'gym' }
    ]
  };
}

function defaultData() {
  return {
    transactions: [],
    subscriptions: [],
    goals: [],
    settings: { budget: 150, save: 100, start: 0, locked: 0 },
    health: defaultHealth(),
    routines: defaultRoutines(),
    schedule: defaultSchedule(),
    reminders: defaultReminders(),
    meta: { schemaVersion: SCHEMA }
  };
}

function migrate(raw) {
  const base = defaultData();
  if (!raw || typeof raw !== 'object') return base;
  const d = Object.assign({}, base, raw);
  d.transactions = Array.isArray(raw.transactions) ? raw.transactions : [];
  d.subscriptions = Array.isArray(raw.subscriptions) ? raw.subscriptions : [];
  d.goals = Array.isArray(raw.goals) ? raw.goals : [];
  d.settings = Object.assign({}, base.settings, raw.settings || {});
  if (d.settings.locked == null) d.settings.locked = 0;
  d.health = Object.assign({}, base.health, raw.health || {});
  d.health.sleep = Object.assign({}, base.health.sleep, (raw.health && raw.health.sleep) || {});
  if (!Array.isArray(d.health.workoutPlan) || !d.health.workoutPlan.length) d.health.workoutPlan = defaultWorkoutPlan();
  if (!Array.isArray(d.health.meals)) d.health.meals = [];
  if (!Array.isArray(d.health.workouts)) d.health.workouts = [];
  if (!d.health.water) d.health.water = {};
  if (!d.health.steps) d.health.steps = {};
  if (!d.health.personalBests) d.health.personalBests = {};
  d.routines = Object.assign({}, base.routines, raw.routines || {});
  if (!Array.isArray(d.routines.morning)) d.routines.morning = base.routines.morning;
  if (!Array.isArray(d.routines.night)) d.routines.night = base.routines.night;
  if (!Array.isArray(d.routines.habits)) d.routines.habits = base.routines.habits;
  if (!d.routines.completions) d.routines.completions = {};
  d.schedule = Object.assign({}, base.schedule, raw.schedule || {});
  if (!Array.isArray(d.schedule.events)) d.schedule.events = base.schedule.events;
  if (!Array.isArray(d.schedule.shifts)) d.schedule.shifts = [];
  if (!Array.isArray(d.schedule.gymDays)) d.schedule.gymDays = [];
  if (!d.schedule.todayChecks) d.schedule.todayChecks = {};
  d.reminders = Object.assign({}, base.reminders, raw.reminders || {});
  if (!Array.isArray(d.reminders.items)) d.reminders.items = base.reminders.items;
  d.meta = Object.assign({}, base.meta, raw.meta || {}, { schemaVersion: SCHEMA });
  return d;
}

function loadData() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    return migrate(raw);
  } catch (e) {
    return defaultData();
  }
}

function saveData(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

function resetStoredData() {
  localStorage.removeItem(KEY);
  return loadData();
}

function getBalance(data) {
  const income = total(data.transactions.filter(t => t.type === 'income'), t => +t.amount);
  const spent = total(data.transactions.filter(t => t.type === 'expense'), t => +t.amount);
  const locked = +data.settings.locked || 0;
  return (+data.settings.start || 0) + income - spent - locked;
}

function weekSpent(data) {
  return total(data.transactions.filter(t => t.type === 'expense' && isThisWeek(t.date)), t => +t.amount);
}

function weekEarned(data) {
  return total(data.transactions.filter(t => t.type === 'income' && isThisWeek(t.date)), t => +t.amount);
}

function monthlySubs(data) {
  return total(data.subscriptions, s => +s.amount * (s.frequency === 'weekly' ? 4.333 : s.frequency === 'yearly' ? 1 / 12 : 1));
}

function dayIndex(d = new Date()) {
  return (d.getDay() + 6) % 7;
}

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
