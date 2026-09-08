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
const themeButton = document.querySelector('#themeButton');
const personalCalendarButton = document.querySelector('#personalCalendarButton');
const sharedCalendarButton = document.querySelector('#sharedCalendarButton');
const sharedCalendarTabs = document.querySelector('#sharedCalendarTabs');
const composerScopeLabel = document.querySelector('#composerScopeLabel');
const currentCalendarLabel = document.querySelector('#currentCalendarLabel');
const menuButton = document.querySelector('#menuButton');
const sideMenu = document.querySelector('#sideMenu');
const menuBackdrop = document.querySelector('#menuBackdrop');
const closeMenuButton = document.querySelector('#closeMenu');
const accountButton = document.querySelector('#accountButton');

const storageKey = 'green-calendar-events-v1';
const themeStorageKey = 'calendar-theme-v1';
const today = startOfDay(new Date());
let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedStartDate = new Date(today);
let selectedEndDate = new Date(today);
let ignoreClickUntil = 0;
let swipeStart = null;
let touchSwipeStart = null;
let dragAnchor = null;
let rangeDragging = false;
let longPressTimer = null;
let calendarScope = 'personal';
let personalEvents = loadEvents();
let sharedEvents = [];
let events = personalEvents;
let sharedCalendars = [];
let activeSharedCalendarId = null;
const holidaysByYear = new Map();

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

async function loadHolidays(year) {
  if (holidaysByYear.has(year)) return;
  const cacheKey = `kr-holidays-${year}-v1`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (Array.isArray(cached)) holidaysByYear.set(year, cached);
  } catch {}
  if (holidaysByYear.has(year)) return;
  holidaysByYear.set(year, []);
  try {
    const response = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`);
    if (!response.ok) throw new Error('공휴일 정보를 불러오지 못했습니다.');
    const holidays = (await response.json()).map(({ date, localName }) => ({ date, name: localName }));
    holidaysByYear.set(year, holidays);
    localStorage.setItem(cacheKey, JSON.stringify(holidays));
    renderCalendar();
  } catch (error) {
    console.warn(error);
  }
}

function getHoliday(key) {
  const year = Number(key.slice(0, 4));
  return holidaysByYear.get(year)?.find((holiday) => holiday.date === key);
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
  loadHolidays(year);
  if (month === 0) loadHolidays(year - 1);
  if (month === 11) loadHolidays(year + 1);
  calendarGrid.replaceChildren();

  const firstVisible = new Date(year, month, 1 - new Date(year, month, 1).getDay());
  for (let index = 0; index < 42; index += 1) {
    const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
    const key = toKey(date);
    const dayEvents = events.filter((event) => eventCoversDate(event, key));
    const holiday = getHoliday(key);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell';
    button.dataset.date = key;
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${formatLongDate(date)}${holiday ? `, ${holiday.name}` : ''}${dayEvents.length ? `, 일정 ${dayEvents.length}개` : ''}`);
    if (date.getMonth() !== month) button.classList.add('is-outside');
    if (sameDay(date, today)) button.classList.add('is-today');
    if (holiday) button.classList.add('is-holiday');
    if (key >= selectedStartKey && key <= selectedEndKey) button.classList.add('is-in-range');
    if (key === selectedStartKey) button.classList.add('is-range-start');
    if (key === selectedEndKey) button.classList.add('is-range-end');

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = date.getDate();
    const eventLabels = document.createElement('span');
    eventLabels.className = 'day-event-labels';
    dayEvents.slice(0, 2).forEach((event) => {
      const label = document.createElement('span');
      label.className = `day-event-label ${event.color}`;
      label.textContent = event.title;
      eventLabels.append(label);
    });
    button.append(number);
    if (holiday) {
      const holidayName = document.createElement('span');
      holidayName.className = 'holiday-name';
      holidayName.textContent = holiday.name;
      button.append(holidayName);
    }
    button.append(eventLabels);
    button.addEventListener('click', () => {
      if (Date.now() < ignoreClickUntil) return;
      selectDateAndOpenComposer(date);
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
    empty.textContent = '아직 일정이 없어요. 날짜를 누르면 추가할 수 있어요.';
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
    deleteButton.addEventListener('click', async () => {
      try {
        if (calendarScope === 'shared') {
          await window.sharedCalendar.deleteEvent(event.id);
        } else {
          events = events.filter((savedEvent) => savedEvent.id !== event.id);
          personalEvents = events;
          saveEvents();
          render();
        }
      } catch (error) {
        eventCount.textContent = '오류';
        console.error(error);
      }
    });
    eventList.append(item);
  });
}

function render() {
  renderCalendar();
  renderAgenda();
}

function selectDateAndOpenComposer(date) {
  const chosenDate = startOfDay(date);
  selectedStartDate = chosenDate;
  selectedEndDate = chosenDate;
  cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  render();
  openComposer();
}

function updateDraggedRange(date) {
  const chosenDate = startOfDay(date);
  selectedStartDate = chosenDate < dragAnchor ? chosenDate : dragAnchor;
  selectedEndDate = chosenDate < dragAnchor ? dragAnchor : chosenDate;
  render();
}

function setCalendarScope(scope) {
  if (scope === 'shared' && !window.sharedCalendar?.isConnected()) {
    window.sharedCalendar?.openSettings();
    return;
  }
  calendarScope = scope;
  events = scope === 'shared' ? sharedEvents : personalEvents;
  personalCalendarButton.classList.toggle('is-active', scope === 'personal');
  personalCalendarButton.setAttribute('aria-pressed', String(scope === 'personal'));
  sharedCalendarButton.setAttribute('aria-pressed', 'false');
  const activeName = sharedCalendars.find((calendar) => calendar.id === activeSharedCalendarId)?.name;
  composerScopeLabel.textContent = scope === 'shared' ? (activeName || 'TOGETHER SCHEDULE') : 'MY SCHEDULE';
  currentCalendarLabel.textContent = scope === 'shared' ? (activeName || '공유 캘린더') : '나의 일정';
  renderSharedCalendarTabs();
  render();
}

function renderSharedCalendarTabs() {
  sharedCalendarTabs.replaceChildren();
  sharedCalendars.forEach((calendar) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'menu-calendar-button';
    const icon = document.createElement('span');
    icon.className = 'menu-calendar-icon';
    icon.textContent = '♥';
    const copy = document.createElement('span');
    copy.textContent = calendar.name;
    const detail = document.createElement('small');
    detail.textContent = '함께 쓰는 일정';
    copy.append(detail);
    button.append(icon, copy);
    button.setAttribute('aria-pressed', String(calendar.id === activeSharedCalendarId && calendarScope === 'shared'));
    button.classList.toggle('is-active', calendar.id === activeSharedCalendarId && calendarScope === 'shared');
    button.addEventListener('click', async () => {
      activeSharedCalendarId = calendar.id;
      await window.sharedCalendar.selectCalendar(calendar.id);
      setCalendarScope('shared');
      closeSideMenu();
    });
    sharedCalendarTabs.append(button);
  });
  sharedCalendarButton.querySelector('span:last-child').textContent = sharedCalendars.length ? '공유 캘린더 추가' : '공유 캘린더 연결';
}

function openSideMenu() {
  menuBackdrop.hidden = false;
  sideMenu.classList.add('is-open');
  menuButton.setAttribute('aria-expanded', 'true');
}

function closeSideMenu() {
  sideMenu.classList.remove('is-open');
  menuButton.setAttribute('aria-expanded', 'false');
  setTimeout(() => { if (!sideMenu.classList.contains('is-open')) menuBackdrop.hidden = true; }, 220);
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
  render();
});
document.querySelector('#closeComposer').addEventListener('click', closeComposer);
composerBackdrop.addEventListener('click', closeComposer);
themeButton.addEventListener('click', toggleTheme);
menuButton.addEventListener('click', openSideMenu);
closeMenuButton.addEventListener('click', closeSideMenu);
menuBackdrop.addEventListener('click', closeSideMenu);
accountButton.addEventListener('click', closeSideMenu);
personalCalendarButton.addEventListener('click', () => { setCalendarScope('personal'); closeSideMenu(); });
sharedCalendarButton.addEventListener('click', () => { closeSideMenu(); window.sharedCalendar?.openSettings(); });

function beginCalendarGesture(x, y, target) {
  clearTimeout(longPressTimer);
  swipeStart = { x, y };
  const dayCell = target.closest('.day-cell');
  dragAnchor = dayCell ? fromKey(dayCell.dataset.date) : null;
  rangeDragging = false;
  if (dragAnchor) {
    longPressTimer = setTimeout(() => {
      rangeDragging = true;
      selectedStartDate = new Date(dragAnchor);
      selectedEndDate = new Date(dragAnchor);
      render();
      navigator.vibrate?.(18);
    }, 480);
  }
}

function moveCalendarGesture(x, y) {
  if (!swipeStart) return false;
  if (!rangeDragging) {
    if (Math.hypot(x - swipeStart.x, y - swipeStart.y) > 16) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
    return false;
  }
  if (!dragAnchor) return false;
  const dayCell = document.elementFromPoint(x, y)?.closest('.day-cell');
  if (!dayCell) return true;
  updateDraggedRange(fromKey(dayCell.dataset.date));
  return true;
}

function endCalendarGesture(x, y) {
  if (!swipeStart) return;
  clearTimeout(longPressTimer);
  longPressTimer = null;
  const deltaX = x - swipeStart.x;
  const deltaY = y - swipeStart.y;
  swipeStart = null;
  if (rangeDragging) {
    rangeDragging = false;
    dragAnchor = null;
    ignoreClickUntil = Date.now() + 400;
    openComposer();
    return;
  }
  dragAnchor = null;
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
  if (moveCalendarGesture(event.clientX, event.clientY)) event.preventDefault();
});

calendarViewport.addEventListener('pointerup', (event) => {
  if (!event.isPrimary) return;
  endCalendarGesture(event.clientX, event.clientY);
});

calendarViewport.addEventListener('pointercancel', () => {
  swipeStart = null;
  dragAnchor = null;
  rangeDragging = false;
  clearTimeout(longPressTimer);
  longPressTimer = null;
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
    if (moveCalendarGesture(touch.clientX, touch.clientY)) event.preventDefault();
  }, { passive: false });

  calendarViewport.addEventListener('touchend', (event) => {
    if (!touchSwipeStart || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    touchSwipeStart = null;
    endCalendarGesture(touch.clientX, touch.clientY);
  }, { passive: true });

  calendarViewport.addEventListener('touchcancel', () => {
    touchSwipeStart = null;
    swipeStart = null;
    dragAnchor = null;
    rangeDragging = false;
    clearTimeout(longPressTimer);
    longPressTimer = null;
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

eventForm.addEventListener('submit', async (event) => {
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

  const newEvent = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: startDate,
    startDate,
    endDate,
    time: String(form.get('time')),
    title,
    color: String(form.get('color')),
  };
  try {
    if (calendarScope === 'shared') {
      await window.sharedCalendar.upsertEvent(newEvent);
    } else {
      events.push(newEvent);
      personalEvents = events;
      saveEvents();
    }
  } catch (error) {
    formError.textContent = '일정을 저장하지 못했어요. 인터넷 연결을 확인해 주세요.';
    formError.hidden = false;
    console.error(error);
    return;
  }
  selectedStartDate = fromKey(startDate);
  selectedEndDate = fromKey(endDate);
  cursor = new Date(selectedStartDate.getFullYear(), selectedStartDate.getMonth(), 1);
  eventForm.reset();
  eventForm.elements.color.value = 'mint';
  closeComposer();
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && composer.classList.contains('is-open')) closeComposer();
});

applyTheme(document.documentElement.dataset.theme || 'light');
render();
window.sharedCalendar?.init({
  onEvents(nextSharedEvents) {
    sharedEvents = nextSharedEvents;
    if (calendarScope === 'shared') {
      events = nextSharedEvents;
      render();
    }
  },
  onConnection(connected) {
    if (!connected && calendarScope === 'shared') setCalendarScope('personal');
  },
  onCalendars(nextCalendars, activeId) {
    sharedCalendars = nextCalendars;
    activeSharedCalendarId = activeId;
    renderSharedCalendarTabs();
  },
}).catch((error) => {
  console.error('공유 캘린더를 시작하지 못했습니다.', error);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => registration.update()).catch((error) => {
      console.warn('오프라인 사용을 위한 서비스 워커를 등록하지 못했습니다.', error);
    });
  });
}
