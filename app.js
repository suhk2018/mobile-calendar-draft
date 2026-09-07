const calendarGrid = document.querySelector('#calendarGrid');
const monthTitle = document.querySelector('#monthTitle');
const selectedDateLabel = document.querySelector('#selectedDateLabel');
const agendaTitle = document.querySelector('#agendaTitle');
const eventCount = document.querySelector('#eventCount');
const eventList = document.querySelector('#eventList');
const eventForm = document.querySelector('#eventForm');
const eventDate = document.querySelector('#eventDate');
const eventTitle = document.querySelector('#eventTitle');
const composer = document.querySelector('.composer');
const eventTemplate = document.querySelector('#eventTemplate');

const storageKey = 'green-calendar-events-v1';
const today = startOfDay(new Date());
let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = new Date(today);
let events = loadEvents();

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toKey(date) {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function fromKey(key) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function loadEvents() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(saved) ? saved : demoEvents();
  } catch {
    return demoEvents();
  }
}

function demoEvents() {
  const thisMonth = new Date();
  const day = Math.min(12, new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).getDate());
  return [
    { id: 'welcome', date: toKey(new Date(thisMonth.getFullYear(), thisMonth.getMonth(), day)), time: '10:00', title: '캘린더 초안 확인', color: 'mint' },
  ];
}

function saveEvents() {
  localStorage.setItem(storageKey, JSON.stringify(events));
}

function sameDay(a, b) {
  return toKey(a) === toKey(b);
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function renderCalendar() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  monthTitle.textContent = `${year}년 ${month + 1}월`;
  calendarGrid.replaceChildren();

  const firstVisible = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
    const key = toKey(date);
    const dayEvents = events.filter((event) => event.date === key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell';
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${formatLongDate(date)}${dayEvents.length ? `, 일정 ${dayEvents.length}개` : ''}`);
    if (date.getMonth() !== month) button.classList.add('is-outside');
    if (sameDay(date, today)) button.classList.add('is-today');
    if (sameDay(date, selectedDate)) button.classList.add('is-selected');

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = date.getDate();
    const dots = document.createElement('span');
    dots.className = 'event-dots';
    dayEvents.slice(0, 3).forEach((event) => {
      const dot = document.createElement('i');
      dot.className = `event-dot ${event.color}`;
      dots.append(dot);
    });
    button.append(number, dots);
    button.addEventListener('click', () => selectDate(date));
    calendarGrid.append(button);
  }
}

function renderAgenda() {
  const key = toKey(selectedDate);
  const dayEvents = events
    .filter((event) => event.date === key)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  selectedDateLabel.textContent = formatLongDate(selectedDate);
  agendaTitle.textContent = sameDay(selectedDate, today) ? '오늘의 일정' : '선택한 날짜의 일정';
  eventCount.textContent = `${dayEvents.length}개`;
  eventList.replaceChildren();

  if (dayEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '아직 일정이 없어요. 아래 + 버튼으로 추가해 보세요.';
    eventList.append(empty);
    return;
  }

  dayEvents.forEach((event) => {
    const item = eventTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector('.event-marker').classList.add(event.color);
    item.querySelector('strong').textContent = event.title;
    item.querySelector('.event-copy span').textContent = event.time || '시간 미정';
    const deleteButton = item.querySelector('.delete-button');
    deleteButton.addEventListener('click', () => {
      events = events.filter((savedEvent) => savedEvent.id !== event.id);
      saveEvents();
      render();
    });
    eventList.append(item);
  });
}

function selectDate(date) {
  selectedDate = startOfDay(date);
  cursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  eventDate.value = toKey(selectedDate);
  render();
}

function render() {
  renderCalendar();
  renderAgenda();
}

function openComposer() {
  eventDate.value = toKey(selectedDate);
  composer.classList.add('is-open');
  setTimeout(() => eventTitle.focus(), 160);
}

function closeComposer() {
  composer.classList.remove('is-open');
}

document.querySelector('#previousMonth').addEventListener('click', () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
  renderCalendar();
});

document.querySelector('#nextMonth').addEventListener('click', () => {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  renderCalendar();
});

document.querySelector('#todayButton').addEventListener('click', () => selectDate(today));
document.querySelector('#openComposer').addEventListener('click', openComposer);
document.querySelector('#closeComposer').addEventListener('click', closeComposer);

eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(eventForm);
  const date = String(form.get('date'));
  const title = String(form.get('title')).trim();
  if (!date || !title) return;

  events.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date,
    time: String(form.get('time')),
    title,
    color: String(form.get('color')),
  });
  saveEvents();
  eventForm.reset();
  eventForm.elements.color.value = 'mint';
  selectedDate = fromKey(date);
  cursor = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
  closeComposer();
  render();
});

render();
