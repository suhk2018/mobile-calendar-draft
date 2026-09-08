const calendarGrid = document.querySelector('#calendarGrid');
const calendarViewport = document.querySelector('#calendarViewport');
const monthTitle = document.querySelector('#monthTitle');
const selectedDateLabel = document.querySelector('#selectedDateLabel');
const agendaTitle = document.querySelector('#agendaTitle');
const eventCount = document.querySelector('#eventCount');
const eventList = document.querySelector('#eventList');
const eventForm = document.querySelector('#eventForm');
const eventStartDate = document.querySelector('#eventStartDate');
const eventEndDate = document.querySelector('#eventEndDate');
const eventTitle = document.querySelector('#eventTitle');
const formError = document.querySelector('#formError');
const composer = document.querySelector('.composer');
const composerBackdrop = document.querySelector('#composerBackdrop');
const eventTemplate = document.querySelector('#eventTemplate');
const rangeStatus = document.querySelector('#rangeStatus');
const themeButton = document.querySelector('#themeButton');

const storageKey = 'green-calendar-events-v1';
const themeStorageKey = 'calendar-theme-v1';
const today = startOfDay(new Date());
let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedStartDate = new Date(today);
let selectedEndDate = new Date(today);
let rangeMode = false;
let rangeAnchor = null;
let ignoreClickUntil = 0;
let swipeStart = null;
let touchSwipeStart = null;
let longPressTimer = null;
let longPressActivated = false;
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

function eventStart(event) {
  return event.startDate || event.date;
}

function eventEnd(event) {
  return event.endDate || event.startDate || event.date;
}

function eventCoversDate(event, key) {
  return eventStart(event) <= key && eventEnd(event) >= key;
}

function eventOverlapsRange(event, startKey, endKey) {
  return eventStart(event) <= endKey && eventEnd(event) >= startKey;
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
    { id: 'welcome', date: toKey(new Date(thisMonth.getFullYear(), thisMonth.getMonth(), day)), time: '10:00', title: '캘린더 확인하기', color: 'mint' },
  ];
}

function saveEvents() {
  localStorage.setItem(storageKey, JSON.stringify(events));
}

function sameDay(a, b) {
  return toKey(a) === toKey(b);
}

function daysInSelection() {
  return Math.round((selectedEndDate - selectedStartDate) / 86400000) + 1;
}

function formatLongDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatShortDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { month: 'short', day: 'numeric' }).format(date);
}

function formatSelectedRange() {
  if (sameDay(selectedStartDate, selectedEndDate)) return formatLongDate(selectedStartDate);
  return `${formatShortDate(selectedStartDate)} – ${formatShortDate(selectedEndDate)}`;
}

function formatEventDate(event) {
  const start = eventStart(event);
  const end = eventEnd(event);
  if (start === end) return formatShortDate(fromKey(start));
  return `${formatShortDate(fromKey(start))} – ${formatShortDate(fromKey(end))}`;
}

function renderCalendar() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const selectedStartKey = toKey(selectedStartDate);
  const selectedEndKey = toKey(selectedEndDate);
  monthTitle.textContent = `${year}년 ${month + 1}월`;
  calendarGrid.replaceChildren();

  const firstVisible = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
    const key = toKey(date);
    const dayEvents = events.filter((event) => eventCoversDate(event, key));
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell';
    button.dataset.date = key;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${formatLongDate(date)}${dayEvents.length ? `, 일정 ${dayEvents.length}개` : ''}`);
    if (date.getMonth() !== month) button.classList.add('is-outside');
    if (sameDay(date, today)) button.classList.add('is-today');
    if (key >= selectedStartKey && key <= selectedEndKey) button.classList.add('is-in-range');
    if (key === selectedStartKey) button.classList.add('is-range-start');
    if (key === selectedEndKey) button.classList.add('is-range-end');

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
    button.addEventListener('click', () => {
      if (Date.now() < ignoreClickUntil) return;
      handleDateSelection(date);
    });
    calendarGrid.append(button);
  }
}

function renderAgenda() {
  const startKey = toKey(selectedStartDate);
  const endKey = toKey(selectedEndDate);
  const selectedEvents = events
    .filter((event) => eventOverlapsRange(event, startKey, endKey))
    .sort((a, b) => eventStart(a).localeCompare(eventStart(b)) || (a.time || '99:99').localeCompare(b.time || '99:99'));
  selectedDateLabel.textContent = formatSelectedRange();
  agendaTitle.textContent = daysInSelection() > 1 ? '선택한 기간의 일정' : sameDay(selectedStartDate, today) ? '오늘의 일정' : '선택한 날짜의 일정';
  eventCount.textContent = `${selectedEvents.length}개`;
  eventList.replaceChildren();

  if (selectedEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '아직 일정이 없어요. 아래 + 버튼으로 추가해 보세요.';
    eventList.append(empty);
    return;
  }

  selectedEvents.forEach((event) => {
    const item = eventTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector('.event-marker').classList.add(event.color);
    item.querySelector('strong').textContent = event.title;
    const timeText = event.time || '시간 미정';
    item.querySelector('.event-copy span').textContent = `${formatEventDate(event)} · ${timeText}`;
    const deleteButton = item.querySelector('.delete-button');
    deleteButton.addEventListener('click', () => {
      events = events.filter((savedEvent) => savedEvent.id !== event.id);
      saveEvents();
      render();
    });
    eventList.append(item);
  });
}

function render() {
  renderCalendar();
  renderAgenda();
}

function handleDateSelection(date) {
  const chosenDate = startOfDay(date);
  if (!rangeMode) {
    selectedStartDate = chosenDate;
    selectedEndDate = chosenDate;
    cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
    rangeStatus.textContent = '날짜를 길게 누르면 기간을 선택할 수 있어요';
    render();
    return;
  }

  if (!rangeAnchor) {
    rangeAnchor = chosenDate;
    selectedStartDate = chosenDate;
    selectedEndDate = chosenDate;
    cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
    rangeStatus.textContent = '마지막 날짜를 선택하세요';
    render();
    return;
  }

  selectedStartDate = chosenDate < rangeAnchor ? chosenDate : rangeAnchor;
  selectedEndDate = chosenDate < rangeAnchor ? rangeAnchor : chosenDate;
  rangeAnchor = null;
  rangeMode = false;
  rangeStatus.textContent = `${daysInSelection()}일이 선택됐어요`;
  cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  render();
}

function startRangeSelection(date) {
  const chosenDate = startOfDay(date);
  rangeMode = true;
  rangeAnchor = chosenDate;
  selectedStartDate = chosenDate;
  selectedEndDate = chosenDate;
  cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  rangeStatus.textContent = '마지막 날짜를 선택하세요';
  ignoreClickUntil = Date.now() + 500;
  render();
}

function animateCalendar(direction) {
  const className = direction > 0 ? 'is-sliding-left' : 'is-sliding-right';
  calendarViewport.classList.remove('is-sliding-left', 'is-sliding-right');
  requestAnimationFrame(() => calendarViewport.classList.add(className));
  setTimeout(() => calendarViewport.classList.remove(className), 240);
}

function changeMonth(offset) {
  cursor = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
  renderCalendar();
  animateCalendar(offset);
}

function openComposer() {
  eventStartDate.value = toKey(selectedStartDate);
  eventEndDate.value = toKey(selectedEndDate);
  eventEndDate.min = eventStartDate.value;
  formError.hidden = true;
  composerBackdrop.hidden = false;
  composer.classList.add('is-open');
  setTimeout(() => eventTitle.focus(), 180);
}

function closeComposer() {
  composer.classList.remove('is-open');
  setTimeout(() => {
    if (!composer.classList.contains('is-open')) composerBackdrop.hidden = true;
  }, 220);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeButton.textContent = isDark ? '☀' : '☾';
  themeButton.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
  document.querySelector('meta[name="theme-color"]').setAttribute('content', isDark ? '#101214' : '#3182f6');
}

function toggleTheme() {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
}

document.querySelector('#previousMonth').addEventListener('click', () => changeMonth(-1));
document.querySelector('#nextMonth').addEventListener('click', () => changeMonth(1));
document.querySelector('#todayButton').addEventListener('click', () => {
  selectedStartDate = new Date(today);
  selectedEndDate = new Date(today);
  cursor = new Date(today.getFullYear(), today.getMonth(), 1);
  rangeMode = false;
  rangeAnchor = null;
  rangeStatus.textContent = '오늘로 이동했어요';
  render();
});
document.querySelector('#openComposer').addEventListener('click', openComposer);
document.querySelector('#closeComposer').addEventListener('click', closeComposer);
composerBackdrop.addEventListener('click', closeComposer);
themeButton.addEventListener('click', toggleTheme);

function beginCalendarGesture(x, y, target) {
  swipeStart = { x, y };
  longPressActivated = false;
  const dayCell = target.closest('.day-cell');
  if (!dayCell) return;
  longPressTimer = setTimeout(() => {
    longPressTimer = null;
    longPressActivated = true;
    startRangeSelection(fromKey(dayCell.dataset.date));
    navigator.vibrate?.(30);
  }, 520);
}

function moveCalendarGesture(x, y) {
  if (!swipeStart || !longPressTimer) return;
  if (Math.hypot(x - swipeStart.x, y - swipeStart.y) > 10) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function endCalendarGesture(x, y) {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
  if (!swipeStart) return;
  const deltaX = x - swipeStart.x;
  const deltaY = y - swipeStart.y;
  swipeStart = null;
  if (longPressActivated) {
    longPressActivated = false;
    return;
  }
  if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
  ignoreClickUntil = Date.now() + 350;
  changeMonth(deltaX < 0 ? 1 : -1);
}

calendarViewport.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary) return;
  beginCalendarGesture(event.clientX, event.clientY, event.target);
});

calendarViewport.addEventListener('pointermove', (event) => {
  if (!event.isPrimary) return;
  moveCalendarGesture(event.clientX, event.clientY);
});

calendarViewport.addEventListener('pointerup', (event) => {
  if (!event.isPrimary) return;
  endCalendarGesture(event.clientX, event.clientY);
});

calendarViewport.addEventListener('pointercancel', () => {
  if (longPressTimer) clearTimeout(longPressTimer);
  longPressTimer = null;
  swipeStart = null;
});

// 오래된 iOS 홈 화면 웹앱처럼 Pointer Events가 없는 환경도 지원한다.
if (!window.PointerEvent) {
  calendarViewport.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchSwipeStart = { x: touch.clientX, y: touch.clientY };
    beginCalendarGesture(touch.clientX, touch.clientY, event.target);
  }, { passive: true });

  calendarViewport.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    moveCalendarGesture(touch.clientX, touch.clientY);
  }, { passive: true });

  calendarViewport.addEventListener('touchend', (event) => {
    if (!touchSwipeStart || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    touchSwipeStart = null;
    endCalendarGesture(touch.clientX, touch.clientY);
  }, { passive: true });

  calendarViewport.addEventListener('touchcancel', () => {
    touchSwipeStart = null;
    if (longPressTimer) clearTimeout(longPressTimer);
    longPressTimer = null;
    swipeStart = null;
  }, { passive: true });
}

eventStartDate.addEventListener('change', () => {
  eventEndDate.min = eventStartDate.value;
  if (!eventEndDate.value || eventEndDate.value < eventStartDate.value) eventEndDate.value = eventStartDate.value;
  formError.hidden = true;
});

eventEndDate.addEventListener('change', () => {
  formError.hidden = true;
});

eventForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const form = new FormData(eventForm);
  const startDate = String(form.get('startDate'));
  const endDate = String(form.get('endDate'));
  const title = String(form.get('title')).trim();
  if (!startDate || !endDate || !title) return;
  if (endDate < startDate) {
    formError.textContent = '종료일은 시작일보다 빠를 수 없어요.';
    formError.hidden = false;
    return;
  }

  events.push({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: startDate,
    startDate,
    endDate,
    time: String(form.get('time')),
    title,
    color: String(form.get('color')),
  });
  saveEvents();
  selectedStartDate = fromKey(startDate);
  selectedEndDate = fromKey(endDate);
  cursor = new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), 1);
  eventForm.reset();
  eventForm.elements.color.value = 'mint';
  closeComposer();
  rangeStatus.textContent = daysInSelection() > 1 ? `${daysInSelection()}일 일정이 추가됐어요` : '일정이 추가됐어요';
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && composer.classList.contains('is-open')) closeComposer();
});

applyTheme(document.documentElement.dataset.theme || 'light');
render();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => registration.update()).catch((error) => {
      console.warn('오프라인 사용을 위한 서비스 워커를 등록하지 못했습니다.', error);
    });
  });
}
