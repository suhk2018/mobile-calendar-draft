const calendarGrid = document.querySelector('#calendarGrid');
const calendarViewport = document.querySelector('#calendarViewport');
const monthTitle = document.querySelector('#monthTitle');
const selectedDateLabel = document.querySelector('#selectedDateLabel');
const agendaTitle = document.querySelector('#agendaTitle');
const eventCount = document.querySelector('#eventCount');
const addEventButton = document.querySelector('#addEventButton');
const agendaAddLabel = document.querySelector('#agendaAddLabel');
const agendaPanel = document.querySelector('#agendaPanel');
const agendaBackdrop = document.querySelector('#agendaBackdrop');
const closeAgendaButton = document.querySelector('#closeAgenda');
const eventList = document.querySelector('#eventList');
const eventForm = document.querySelector('#eventForm');
const eventStartDate = document.querySelector('#eventStartDate');
const eventEndDate = document.querySelector('#eventEndDate');
const eventTitle = document.querySelector('#eventTitle');
const eventMemo = document.querySelector('#eventMemo');
const eventAllDay = document.querySelector('#eventAllDay');
const eventTime = document.querySelector('#eventTime');
const eventTimeField = document.querySelector('#eventTimeField');
const eventTimePeriod = document.querySelector('#eventTimePeriod');
const eventTimeReadable = document.querySelector('#eventTimeReadable');
const composerTitle = document.querySelector('#composerTitle');
const eventSaveButton = eventForm.querySelector('.save-button');
const deleteEventButton = document.querySelector('#deleteEventButton');
const formError = document.querySelector('#formError');
const composer = document.querySelector('.composer');
const composerBackdrop = document.querySelector('#composerBackdrop');
const eventTemplate = document.querySelector('#eventTemplate');
const themeButton = document.querySelector('#themeButton');
const personalCalendarButton = document.querySelector('#personalCalendarButton');
const sharedCalendarButton = document.querySelector('#sharedCalendarButton');
const sharedCalendarTabs = document.querySelector('#sharedCalendarTabs');
const composerScopeLabel = document.querySelector('#composerScopeLabel');
const currentCalendarTitle = document.querySelector('#currentCalendarTitle');
const calendarEyebrow = document.querySelector('#calendarEyebrow');
const togetherCounter = document.querySelector('#togetherCounter');
const togetherDayCount = document.querySelector('#togetherDayCount');
const menuButton = document.querySelector('#menuButton');
const sideMenu = document.querySelector('#sideMenu');
const menuBackdrop = document.querySelector('#menuBackdrop');
const closeMenuButton = document.querySelector('#closeMenu');
const accountButton = document.querySelector('#accountButton');
const anniversaryBackdrop = document.querySelector('#anniversaryBackdrop');
const anniversarySheet = document.querySelector('#anniversarySheet');
const closeAnniversaryButton = document.querySelector('#closeAnniversary');
const anniversaryStartDate = document.querySelector('#anniversaryStartDate');
const anniversaryCurrentDay = document.querySelector('#anniversaryCurrentDay');
const milestoneList = document.querySelector('#milestoneList');
const birthdayList = document.querySelector('#birthdayList');
const birthdayForm = document.querySelector('#birthdayForm');
const birthdayInput = document.querySelector('#birthdayInput');
const birthdayError = document.querySelector('#birthdayError');

const storageKey = 'green-calendar-events-v1';
const themeStorageKey = 'calendar-theme-v1';
const calendarScopeStorageKey = 'calendar-scope-v1';
const today = startOfDay(new Date());
let cursor = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedStartDate = new Date(today);
let selectedEndDate = new Date(today);
let ignoreClickUntil = 0;
let swipeStart = null;
let swipeLatest = null;
let touchSwipeStart = null;
let dragAnchor = null;
let rangeDragging = false;
let longPressTimer = null;
let calendarScope = 'personal';
let preferredCalendarScope = localStorage.getItem(calendarScopeStorageKey) === 'shared' ? 'shared' : 'personal';
let personalEvents = loadEvents();
let sharedEvents = [];
let events = personalEvents;
let sharedCalendars = [];
let activeSharedCalendarId = null;
let editingEvent = null;
const holidaysByYear = new Map();
const maxCalendarEventLanes = 5;

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

function addDays(date, amount) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
}

function eventStart(event) {
  return event.startDate || event.date;
}

function eventEnd(event) {
  return event.endDate || event.startDate || event.date;
}

function eventIsAllDay(event) {
  return typeof event.allDay === 'boolean' ? event.allDay : !event.time;
}

function eventIsMultiDay(event) {
  return eventStart(event) !== eventEnd(event);
}

function eventUsesPeriodBar(event) {
  return eventIsAllDay(event) || eventIsMultiDay(event);
}

function eventUsesTwoLineTimeBar(event) {
  return !eventIsAllDay(event) && !eventIsMultiDay(event);
}

function compareEventsByDisplay(a, b) {
  const startDifference = eventStart(a).localeCompare(eventStart(b));
  if (startDifference) return startDifference;
  if (eventIsAllDay(a) !== eventIsAllDay(b)) return eventIsAllDay(a) ? -1 : 1;
  if (!eventIsAllDay(a)) {
    const timeDifference = (a.time || '99:99').localeCompare(b.time || '99:99');
    if (timeDifference) return timeDifference;
  }
  return eventEnd(b).localeCompare(eventEnd(a)) || a.title.localeCompare(b.title, 'ko');
}

function eventColorVariable(color) {
  if (color === 'holiday') return 'var(--danger)';
  if (color === 'birthday') return 'var(--pink)';
  if (color === 'mint') return 'var(--primary)';
  return `var(--${color || 'primary'})`;
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

function anniversaryDayLabel(firstMetOn) {
  if (!firstMetOn) return '';
  const firstDay = fromKey(firstMetOn);
  const dayDifference = Math.round((today - firstDay) / 86400000);
  return dayDifference >= 0 ? `D+${dayDifference + 1}` : `D${dayDifference}`;
}

function formatAnniversaryDetail(firstMetOn) {
  if (!firstMetOn) return '만난 날을 설정해 주세요';
  const firstDay = fromKey(firstMetOn);
  const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'numeric', day: 'numeric' }).format(firstDay);
  return `${anniversaryDayLabel(firstMetOn)} · ${date}`;
}

function activeSharedCalendar() {
  return sharedCalendars.find((calendar) => calendar.id === activeSharedCalendarId);
}

function recurringDateForYear(dateKey, year) {
  const [, month, day] = dateKey.split('-').map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return new Date(year, month - 1, Math.min(day, lastDay));
}

function birthdayEventsForRange(startKey, endKey) {
  if (calendarScope !== 'shared') return [];
  const calendar = activeSharedCalendar();
  if (!calendar?.members?.length) return [];
  const startYear = fromKey(startKey).getFullYear();
  const endYear = fromKey(endKey).getFullYear();
  const birthdayEvents = [];
  calendar.members.filter((member) => member.birthday).forEach((member) => {
    for (let year = startYear; year <= endYear; year += 1) {
      const key = toKey(recurringDateForYear(member.birthday, year));
      if (key < startKey || key > endKey) continue;
      birthdayEvents.push({
        id: `birthday-${member.userId}-${year}`,
        startDate: key,
        endDate: key,
        allDay: true,
        time: '',
        title: member.isMe ? '내 생일' : '상대방 생일',
        color: 'birthday',
        isBirthday: true,
      });
    }
  });
  return birthdayEvents;
}

function formatFullDate(date) {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function remainingDayLabel(date) {
  const difference = Math.round((startOfDay(date) - today) / 86400000);
  if (difference === 0) return '오늘';
  return difference > 0 ? `${difference}일 남음` : `${Math.abs(difference)}일 지남`;
}

function upcomingMilestones(firstMetOn) {
  if (!firstMetOn) return [];
  const firstDay = fromKey(firstMetOn);
  const currentDay = Math.max(1, Math.round((today - firstDay) / 86400000) + 1);
  const firstHundred = Math.max(100, Math.ceil(currentDay / 100) * 100);
  const hundreds = Array.from({ length: 10 }, (_, index) => {
    const day = firstHundred + index * 100;
    return { type: 'hundred', label: `${day}일`, date: addDays(firstDay, day - 1) };
  });
  const years = [];
  let yearNumber = 1;
  while (years.length < 10) {
    const anniversaryDate = recurringDateForYear(firstMetOn, firstDay.getFullYear() + yearNumber);
    if (anniversaryDate >= today) years.push({ type: 'year', label: `${yearNumber}주년`, date: anniversaryDate });
    yearNumber += 1;
  }
  return [...hundreds, ...years].sort((a, b) => a.date - b.date || a.label.localeCompare(b.label, 'ko'));
}

function renderAnniversarySheet() {
  const calendar = activeSharedCalendar();
  if (!calendar) return;
  anniversaryStartDate.textContent = calendar.first_met_on ? `${formatFullDate(fromKey(calendar.first_met_on))}부터` : '처음 만난 날을 설정해 주세요';
  anniversaryCurrentDay.textContent = anniversaryDayLabel(calendar.first_met_on) || 'D-day';
  milestoneList.replaceChildren();
  upcomingMilestones(calendar.first_met_on).forEach((milestone) => {
    const item = document.createElement('article');
    item.className = `milestone-item ${milestone.type === 'year' ? 'is-year' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'milestone-icon';
    icon.textContent = milestone.type === 'year' ? '♥' : '✦';
    const copy = document.createElement('div');
    copy.className = 'milestone-copy';
    const title = document.createElement('strong');
    title.textContent = milestone.label;
    const remaining = document.createElement('span');
    remaining.textContent = remainingDayLabel(milestone.date);
    copy.append(title, remaining);
    const date = document.createElement('time');
    date.className = 'milestone-date';
    date.dateTime = toKey(milestone.date);
    date.textContent = formatFullDate(milestone.date);
    item.append(icon, copy, date);
    milestoneList.append(item);
  });

  birthdayList.replaceChildren();
  const membersWithBirthday = (calendar.members || []).filter((member) => member.birthday);
  if (!membersWithBirthday.length) {
    const empty = document.createElement('p');
    empty.className = 'birthday-empty';
    empty.textContent = '아직 저장된 생일이 없어요. 각자 자신의 휴대폰에서 생일을 저장해 주세요.';
    birthdayList.append(empty);
  } else {
    membersWithBirthday.forEach((member) => {
      let nextBirthday = recurringDateForYear(member.birthday, today.getFullYear());
      if (nextBirthday < today) nextBirthday = recurringDateForYear(member.birthday, today.getFullYear() + 1);
      const item = document.createElement('article');
      item.className = 'birthday-item';
      const icon = document.createElement('span');
      icon.className = 'milestone-icon';
      icon.textContent = '🎂';
      const copy = document.createElement('div');
      copy.className = 'milestone-copy';
      const title = document.createElement('strong');
      title.textContent = member.isMe ? '내 생일' : '상대방 생일';
      const remaining = document.createElement('span');
      remaining.textContent = remainingDayLabel(nextBirthday);
      copy.append(title, remaining);
      const date = document.createElement('time');
      date.className = 'milestone-date';
      date.dateTime = toKey(nextBirthday);
      date.textContent = formatFullDate(nextBirthday);
      item.append(icon, copy, date);
      birthdayList.append(item);
    });
  }
  const me = (calendar.members || []).find((member) => member.isMe);
  birthdayInput.value = me?.birthday || '';
  birthdayInput.max = toKey(today);
  birthdayError.hidden = true;
  birthdayError.textContent = '';
}

function openAnniversarySheet() {
  if (calendarScope !== 'shared' || !activeSharedCalendar()) return;
  renderAnniversarySheet();
  anniversaryBackdrop.hidden = false;
  anniversarySheet.classList.add('is-open');
  anniversarySheet.focus();
}

function closeAnniversarySheet() {
  anniversarySheet.classList.remove('is-open');
  setTimeout(() => {
    if (!anniversarySheet.classList.contains('is-open')) anniversaryBackdrop.hidden = true;
  }, 220);
}

function renderEventBars(firstVisible, birthdayEvents = [], firstMetKey = null, weekCount = 6) {
  const previousLaneByEvent = new Map();

  for (let week = 0; week < weekCount; week += 1) {
    const weekStartKey = toKey(addDays(firstVisible, week * 7));
    const weekEndKey = toKey(addDays(firstVisible, week * 7 + 6));
    const weekHasFirstMet = firstMetKey && firstMetKey >= weekStartKey && firstMetKey <= weekEndKey;
    const laneEnds = Array(maxCalendarEventLanes).fill(null);
    const holidayEvents = Array.from({ length: 7 }, (_, day) => {
      const date = addDays(firstVisible, week * 7 + day);
      const key = toKey(date);
      const holiday = getHoliday(key);
      return holiday ? { id: `holiday-${key}`, startDate: key, endDate: key, allDay: true, time: '', title: holiday.name, color: 'holiday', isHoliday: true } : null;
    }).filter(Boolean);
    const weekEvents = [...events, ...birthdayEvents, ...holidayEvents]
      .filter((event) => eventUsesPeriodBar(event)
        ? eventOverlapsRange(event, weekStartKey, weekEndKey)
        : eventStart(event) >= weekStartKey && eventStart(event) <= weekEndKey)
      .map((event) => {
        const twoLineTimeBar = eventUsesTwoLineTimeBar(event);
        return {
          event,
          clippedStart: twoLineTimeBar || eventStart(event) >= weekStartKey ? eventStart(event) : weekStartKey,
          clippedEnd: twoLineTimeBar ? eventStart(event) : (eventEnd(event) > weekEndKey ? weekEndKey : eventEnd(event)),
        };
      })
      .sort((a, b) => a.clippedStart.localeCompare(b.clippedStart)
        || Number(Boolean(b.event.isHoliday)) - Number(Boolean(a.event.isHoliday))
        || Number(Boolean(b.event.isBirthday)) - Number(Boolean(a.event.isBirthday))
        || Number(eventUsesPeriodBar(b.event)) - Number(eventUsesPeriodBar(a.event))
        || (eventUsesTwoLineTimeBar(a.event) && eventUsesTwoLineTimeBar(b.event) ? (a.event.time || '99:99').localeCompare(b.event.time || '99:99') : 0)
        || b.clippedEnd.localeCompare(a.clippedEnd)
        || a.event.title.localeCompare(b.event.title, 'ko'));

    const placedEvents = [];
    weekEvents.forEach(({ event, clippedStart, clippedEnd }) => {
      const preferredLane = previousLaneByEvent.get(event.id);
      let lane = Number.isInteger(preferredLane) && (!laneEnds[preferredLane] || laneEnds[preferredLane] < clippedStart)
        ? preferredLane
        : laneEnds.findIndex((laneEnd) => !laneEnd || laneEnd < clippedStart);
      if (lane < 0) return;

      laneEnds[lane] = clippedEnd;
      previousLaneByEvent.set(event.id, lane);
      placedEvents.push({ event, clippedStart, clippedEnd, lane });
    });

    const laneHeights = Array(maxCalendarEventLanes).fill(15);
    placedEvents.forEach(({ event, lane }) => {
      if (eventUsesTwoLineTimeBar(event)) laneHeights[lane] = 28;
    });
    const laneOffsets = laneHeights.map((_, lane) => laneHeights.slice(0, lane).reduce((sum, height) => sum + height + 2, 0));

    placedEvents.forEach(({ event, clippedStart, clippedEnd, lane }) => {
      const startColumn = addDays(firstVisible, week * 7).getDay() + Math.round((fromKey(clippedStart) - fromKey(weekStartKey)) / 86400000) + 1;
      const endColumn = startColumn + Math.round((fromKey(clippedEnd) - fromKey(clippedStart)) / 86400000);
      const bar = document.createElement('span');
      bar.className = `calendar-event-bar lane-${lane} ${event.color || 'mint'}`;
      if (weekHasFirstMet) bar.classList.add('first-met-week');
      if (event.isHoliday) bar.classList.add('is-holiday-event');
      if (eventUsesTwoLineTimeBar(event)) bar.classList.add('is-timed');
      if (event.authorLabel) bar.classList.add('has-author');
      if (eventIsMultiDay(event) && eventStart(event) < weekStartKey) bar.classList.add('continues-before');
      if (eventIsMultiDay(event) && eventEnd(event) > weekEndKey) bar.classList.add('continues-after');
      bar.style.gridColumn = `${startColumn} / ${endColumn + 1}`;
      bar.style.gridRow = String(week + 1);
      bar.style.setProperty('--event-lane-offset', `${laneOffsets[lane]}px`);
      const eventText = eventUsesPeriodBar(event) ? event.title : `${event.time} ${event.title}`;
      if (event.authorLabel) {
        const author = document.createElement('span');
        author.className = 'calendar-event-author';
        author.textContent = event.authorBadge;
        bar.append(author);
      }
      if (eventUsesTwoLineTimeBar(event)) {
        const timedCopy = document.createElement('span');
        timedCopy.className = 'calendar-event-timed-copy';
        const time = document.createElement('span');
        time.className = 'calendar-event-time';
        time.textContent = event.time;
        const title = document.createElement('span');
        title.className = 'calendar-event-title';
        title.textContent = event.title;
        timedCopy.append(title, time);
        bar.append(timedCopy);
      } else if (event.authorLabel) {
        const label = document.createElement('span');
        label.className = 'calendar-event-text';
        label.textContent = eventText;
        bar.append(label);
      } else {
        bar.textContent = eventText;
      }
      bar.title = `${event.authorLabel ? `${event.authorLabel} · ` : ''}${event.title} (${formatEventDate(event)})`;
      bar.setAttribute('aria-hidden', 'true');
      calendarGrid.append(bar);
    });
  }
}

function renderCalendar() {
  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const activeCalendar = sharedCalendars.find((calendar) => calendar.id === activeSharedCalendarId);
  const firstMetKey = calendarScope === 'shared' ? activeCalendar?.first_met_on : null;
  const selectedStartKey = toKey(selectedStartDate);
  const selectedEndKey = toKey(selectedEndDate);
  monthTitle.textContent = `${year}년 ${month + 1}월`;
  loadHolidays(year);
  if (month === 0) loadHolidays(year - 1);
  if (month === 11) loadHolidays(year + 1);
  calendarGrid.replaceChildren();

  const firstDayOfMonth = new Date(year, month, 1);
  const weekCount = Math.ceil((firstDayOfMonth.getDay() + new Date(year, month + 1, 0).getDate()) / 7);
  calendarGrid.style.setProperty('--calendar-weeks', weekCount);
  const firstVisible = new Date(year, month, 1 - firstDayOfMonth.getDay());
  const lastVisible = addDays(firstVisible, weekCount * 7 - 1);
  const birthdayEvents = birthdayEventsForRange(toKey(firstVisible), toKey(lastVisible));
  const visibleDays = Array.from({ length: weekCount * 7 }, (_, index) => {
    const date = new Date(firstVisible.getFullYear(), firstVisible.getMonth(), firstVisible.getDate() + index);
    const key = toKey(date);
    const dayEvents = [...events, ...birthdayEvents].filter((event) => eventCoversDate(event, key));
    const holiday = getHoliday(key);
    const colorEvent = [...dayEvents].sort((a, b) => Number(Boolean(a.isBirthday)) - Number(Boolean(b.isBirthday)) || compareEventsByDisplay(a, b))[0];
    return { date, key, dayEvents, holiday, colorEvent };
  });

  visibleDays.forEach(({ date, key, dayEvents, holiday, colorEvent }, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'day-cell';
    button.dataset.date = key;
    button.style.gridColumn = String((index % 7) + 1);
    button.style.gridRow = String(Math.floor(index / 7) + 1);
    button.setAttribute('role', 'gridcell');
    button.setAttribute('aria-label', `${formatLongDate(date)}${key === firstMetKey ? ', 처음 만난 날' : ''}${holiday ? `, ${holiday.name}` : ''}${dayEvents.length ? `, 일정 ${dayEvents.length}개` : ''}`);
    if (date.getMonth() !== month) button.classList.add('is-outside');
    if (sameDay(date, today)) button.classList.add('is-today');
    if (holiday) button.classList.add('is-holiday');
    if (colorEvent || holiday) {
      button.classList.add('has-events');
      button.style.setProperty('--day-event-color', eventColorVariable(colorEvent?.color || 'holiday'));
    }
    const isMultiDayColorEvent = colorEvent && eventStart(colorEvent) !== eventEnd(colorEvent) && key !== firstMetKey;
    if (isMultiDayColorEvent && index % 7 !== 0 && visibleDays[index - 1].colorEvent?.id === colorEvent.id && visibleDays[index - 1].key !== firstMetKey) {
      button.classList.add('event-range-continues-left');
    }
    if (isMultiDayColorEvent && index % 7 !== 6 && visibleDays[index + 1].colorEvent?.id === colorEvent.id && visibleDays[index + 1].key !== firstMetKey) {
      button.classList.add('event-range-continues-right');
    }
    if (key === firstMetKey) button.classList.add('is-first-met');
    if (key >= selectedStartKey && key <= selectedEndKey) button.classList.add('is-in-range');
    if (key === selectedStartKey) button.classList.add('is-range-start');
    if (key === selectedEndKey) button.classList.add('is-range-end');

    const number = document.createElement('span');
    number.className = 'day-number';
    number.textContent = date.getDate();
    button.append(number);
    const visibleItemCount = dayEvents.length + (holiday ? 1 : 0);
    if (visibleItemCount > maxCalendarEventLanes) {
      const overflow = document.createElement('span');
      overflow.className = 'day-overflow-count';
      overflow.textContent = `+${visibleItemCount - maxCalendarEventLanes}`;
      overflow.title = `공휴일을 포함해 이 날짜에 표시할 항목이 ${visibleItemCount}개 있어요`;
      button.append(overflow);
    }
    if (key === firstMetKey) {
      const firstMetLabel = document.createElement('span');
      firstMetLabel.className = 'first-met-label';
      firstMetLabel.textContent = '♥ 첫 만남';
      button.append(firstMetLabel);
    }
    button.addEventListener('click', () => {
      if (Date.now() < ignoreClickUntil) return;
      selectDate(date);
    });
    calendarGrid.append(button);
  });
  renderEventBars(firstVisible, birthdayEvents, firstMetKey, weekCount);
}

function renderAgenda() {
  const startKey = toKey(selectedStartDate);
  const endKey = toKey(selectedEndDate);
  const selectedEvents = [...events, ...birthdayEventsForRange(startKey, endKey)]
    .filter((event) => eventOverlapsRange(event, startKey, endKey))
    .sort(compareEventsByDisplay);
  selectedDateLabel.textContent = formatSelectedRange();
  agendaTitle.textContent = daysInSelection() > 1 ? '선택한 기간의 일정' : sameDay(selectedStartDate, today) ? '오늘의 일정' : '선택한 날짜의 일정';
  agendaAddLabel.textContent = daysInSelection() > 1 ? `${daysInSelection()}일 일정 추가` : `${formatShortDate(selectedStartDate)}에 일정 추가`;
  eventCount.textContent = `${selectedEvents.length}개`;
  eventList.replaceChildren();

  if (selectedEvents.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-state';
    empty.textContent = '아직 일정이 없어요. 일정 추가 버튼으로 새 일정을 만들어 보세요.';
    eventList.append(empty);
    return;
  }

  selectedEvents.forEach((event) => {
    const item = eventTemplate.content.firstElementChild.cloneNode(true);
    item.querySelector('.event-marker').classList.add(event.color);
    item.querySelector('strong').textContent = event.title;
    const timeText = eventIsAllDay(event) ? '종일' : event.time;
    const authorText = event.authorLabel ? `${event.authorLabel} · ` : '';
    item.querySelector('.event-copy span').textContent = `${authorText}${formatEventDate(event)} · ${timeText}`;
    const memo = item.querySelector('.event-memo');
    if (event.memo) {
      memo.textContent = event.memo;
      memo.hidden = false;
    }
    if (event.isBirthday) {
      item.setAttribute('aria-disabled', 'true');
      item.querySelector('.event-marker').classList.add('pink');
      eventList.append(item);
      return;
    }
    item.setAttribute('aria-label', `${event.title} 일정 수정`);
    item.addEventListener('click', () => openComposer(event));
    eventList.append(item);
  });
}

function render() {
  renderCalendar();
  renderAgenda();
}

function openAgendaSheet() {
  renderAgenda();
  agendaBackdrop.hidden = false;
  agendaPanel.classList.add('is-open');
  setTimeout(() => agendaPanel.focus({ preventScroll: true }), 100);
}

function closeAgendaSheet() {
  agendaPanel.classList.remove('is-open');
  setTimeout(() => {
    if (!agendaPanel.classList.contains('is-open')) agendaBackdrop.hidden = true;
  }, 220);
}

function selectDate(date) {
  const chosenDate = startOfDay(date);
  selectedStartDate = chosenDate;
  selectedEndDate = chosenDate;
  cursor = new Date(chosenDate.getFullYear(), chosenDate.getMonth(), 1);
  render();
  openAgendaSheet();
}

function updateDraggedRange(date) {
  const chosenDate = startOfDay(date);
  selectedStartDate = chosenDate < dragAnchor ? chosenDate : dragAnchor;
  selectedEndDate = chosenDate < dragAnchor ? dragAnchor : chosenDate;
  render();
}

function fitCalendarTitle() {
  currentCalendarTitle.style.removeProperty('font-size');
  requestAnimationFrame(() => {
    let fontSize = Number.parseFloat(getComputedStyle(currentCalendarTitle).fontSize);
    const minimumSize = calendarScope === 'shared' ? 15 : 17;
    while (currentCalendarTitle.scrollWidth > currentCalendarTitle.clientWidth && fontSize > minimumSize) {
      fontSize -= 1;
      currentCalendarTitle.style.fontSize = `${fontSize}px`;
    }
  });
}

function finishCalendarRestore() {
  delete document.documentElement.dataset.restoringCalendar;
}

function updateCalendarHeading() {
  const activeCalendar = activeSharedCalendar();
  const activeName = activeCalendar?.name;
  const title = calendarScope === 'shared' ? (activeName || '공유 캘린더') : '나의 일정';
  currentCalendarTitle.textContent = title;
  currentCalendarTitle.title = title;
  currentCalendarTitle.classList.toggle('is-shared-title', calendarScope === 'shared');
  calendarEyebrow.textContent = calendarScope === 'shared' ? 'TOGETHER CALENDAR' : 'MY CALENDAR';
  const dDay = calendarScope === 'shared' ? anniversaryDayLabel(activeCalendar?.first_met_on) : '';
  togetherCounter.hidden = !dDay;
  togetherDayCount.textContent = dDay;
  composerScopeLabel.textContent = calendarScope === 'shared' ? (activeName || 'TOGETHER SCHEDULE') : 'MY SCHEDULE';
  fitCalendarTitle();
}

function setCalendarScope(scope) {
  if (scope === 'shared' && !window.sharedCalendar?.isConnected()) {
    window.sharedCalendar?.openSettings();
    return;
  }
  calendarScope = scope;
  if (scope !== 'shared' && anniversarySheet.classList.contains('is-open')) closeAnniversarySheet();
  if (agendaPanel.classList.contains('is-open')) closeAgendaSheet();
  preferredCalendarScope = scope;
  localStorage.setItem(calendarScopeStorageKey, scope);
  events = scope === 'shared' ? sharedEvents : personalEvents;
  personalCalendarButton.classList.toggle('is-active', scope === 'personal');
  personalCalendarButton.setAttribute('aria-pressed', String(scope === 'personal'));
  sharedCalendarButton.setAttribute('aria-pressed', 'false');
  updateCalendarHeading();
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
    detail.textContent = formatAnniversaryDetail(calendar.first_met_on);
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

function updateAllDayControl() {
  eventTime.disabled = eventAllDay.checked;
  eventTime.required = !eventAllDay.checked;
  eventTimeField.classList.toggle('is-disabled', eventAllDay.checked);
  updateTimeReadable();
}

function updateTimeReadable() {
  if (!eventTime.value) {
    eventTimePeriod.textContent = '시간';
    eventTimeReadable.textContent = '선택해 주세요';
    return;
  }
  const [hourText = '0', minute = '00'] = eventTime.value.split(':');
  const hour = Number(hourText);
  eventTimePeriod.textContent = hour < 12 ? '오전' : '오후';
  eventTimeReadable.textContent = `${hour % 12 || 12}시 ${minute}분`;
}

function openComposer(eventToEdit = null) {
  editingEvent = eventToEdit;
  eventForm.reset();
  eventTitle.value = eventToEdit?.title || '';
  eventMemo.value = eventToEdit?.memo || '';
  eventStartDate.value = eventToEdit ? eventStart(eventToEdit) : toKey(selectedStartDate);
  eventEndDate.value = eventToEdit ? eventEnd(eventToEdit) : toKey(selectedEndDate);
  eventEndDate.min = eventStartDate.value;
  eventAllDay.checked = eventToEdit ? eventIsAllDay(eventToEdit) : true;
  eventTime.value = eventToEdit?.time || '09:00';
  eventForm.elements.color.value = eventToEdit?.color || 'mint';
  composerTitle.textContent = eventToEdit ? '일정 수정' : '일정 추가';
  eventSaveButton.textContent = eventToEdit ? '수정 내용 저장' : '일정 저장';
  deleteEventButton.hidden = !eventToEdit;
  updateAllDayControl();
  formError.hidden = true;
  composerBackdrop.hidden = false;
  composer.classList.add('is-open');
  setTimeout(() => composer.focus({ preventScroll: true }), 180);
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
document.querySelector('#closeComposer').addEventListener('click', closeComposer);
addEventButton.addEventListener('click', () => openComposer());
closeAgendaButton.addEventListener('click', closeAgendaSheet);
agendaBackdrop.addEventListener('click', closeAgendaSheet);
composerBackdrop.addEventListener('click', closeComposer);
deleteEventButton.addEventListener('click', async () => {
  if (!editingEvent || !window.confirm(`'${editingEvent.title}' 일정을 삭제할까요?`)) return;
  deleteEventButton.disabled = true;
  try {
    if (calendarScope === 'shared') {
      await window.sharedCalendar.deleteEvent(editingEvent.id);
    } else {
      events = events.filter((savedEvent) => savedEvent.id !== editingEvent.id);
      personalEvents = events;
      saveEvents();
    }
    editingEvent = null;
    closeComposer();
    render();
  } catch (error) {
    formError.textContent = '일정을 삭제하지 못했어요. 인터넷 연결을 확인해 주세요.';
    formError.hidden = false;
    console.error(error);
  } finally {
    deleteEventButton.disabled = false;
  }
});
themeButton.addEventListener('click', toggleTheme);
eventAllDay.addEventListener('change', updateAllDayControl);
eventTime.addEventListener('input', updateTimeReadable);
eventTime.addEventListener('change', updateTimeReadable);
menuButton.addEventListener('click', openSideMenu);
closeMenuButton.addEventListener('click', closeSideMenu);
menuBackdrop.addEventListener('click', closeSideMenu);
accountButton.addEventListener('click', closeSideMenu);
personalCalendarButton.addEventListener('click', () => { setCalendarScope('personal'); closeSideMenu(); });
sharedCalendarButton.addEventListener('click', () => { closeSideMenu(); window.sharedCalendar?.openSettings(); });
togetherCounter.addEventListener('click', openAnniversarySheet);
closeAnniversaryButton.addEventListener('click', closeAnniversarySheet);
anniversaryBackdrop.addEventListener('click', closeAnniversarySheet);
birthdayForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!birthdayInput.value) return;
  const saveButton = birthdayForm.querySelector('button[type="submit"]');
  birthdayError.hidden = true;
  saveButton.disabled = true;
  saveButton.textContent = '저장 중';
  try {
    await window.sharedCalendar.setBirthday(birthdayInput.value);
    saveButton.textContent = '저장됨';
    setTimeout(() => { saveButton.textContent = '저장'; }, 1100);
  } catch (error) {
    birthdayError.textContent = error.message || '생일을 저장하지 못했어요.';
    birthdayError.hidden = false;
    saveButton.textContent = '저장';
    console.error(error);
  } finally {
    saveButton.disabled = false;
  }
});

function beginCalendarGesture(x, y, target) {
  clearTimeout(longPressTimer);
  swipeStart = { x, y };
  swipeLatest = { x, y };
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
  swipeLatest = { x, y };
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
  swipeLatest = null;
  if (rangeDragging) {
    rangeDragging = false;
    dragAnchor = null;
    ignoreClickUntil = Date.now() + 400;
    return;
  }
  dragAnchor = null;
  if (deltaY < -36 && Math.abs(deltaY) > Math.abs(deltaX) * 1.05) {
    ignoreClickUntil = Date.now() + 350;
    openAgendaSheet();
    return;
  }
  if (Math.abs(deltaX) < 52 || Math.abs(deltaX) < Math.abs(deltaY) * 1.15) return;
  ignoreClickUntil = Date.now() + 350;
  changeMonth(deltaX < 0 ? 1 : -1);
}

calendarViewport.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary) return;
  try {
    calendarViewport.setPointerCapture(event.pointerId);
  } catch {
    // 일부 오래된 웹뷰는 포인터 캡처를 지원하지 않아도 기본 제스처 처리는 계속한다.
  }
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
  if (swipeStart && swipeLatest) {
    endCalendarGesture(swipeLatest.x, swipeLatest.y);
  } else {
    swipeStart = null;
    swipeLatest = null;
    dragAnchor = null;
    rangeDragging = false;
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
});

// 일부 모바일 웹뷰는 위로 미는 중 Pointer 이벤트를 취소하므로 Touch 이벤트로 한 번 더 감지한다.
if (window.PointerEvent) {
  calendarViewport.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    touchSwipeStart = { x: touch.clientX, y: touch.clientY };
  }, { passive: true });

  calendarViewport.addEventListener('touchend', (event) => {
    if (!touchSwipeStart || event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchSwipeStart.x;
    const deltaY = touch.clientY - touchSwipeStart.y;
    touchSwipeStart = null;
    if (deltaY < -36 && Math.abs(deltaY) > Math.abs(deltaX) * 1.05) {
      ignoreClickUntil = Date.now() + 350;
      if (!agendaPanel.classList.contains('is-open')) openAgendaSheet();
    }
  }, { passive: true });

  calendarViewport.addEventListener('touchcancel', () => {
    touchSwipeStart = null;
  }, { passive: true });
}

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
    swipeLatest = null;
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

  const savedEvent = {
    id: editingEvent?.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: startDate,
    startDate,
    endDate,
    allDay: eventAllDay.checked,
    time: eventAllDay.checked ? '' : eventTime.value,
    title,
    memo: String(form.get('memo') || '').trim(),
    color: String(form.get('color')),
    authorId: editingEvent?.authorId,
  };
  try {
    if (calendarScope === 'shared') {
      await window.sharedCalendar.upsertEvent(savedEvent);
    } else {
      const existingIndex = events.findIndex((saved) => saved.id === savedEvent.id);
      if (existingIndex >= 0) events.splice(existingIndex, 1, savedEvent);
      else events.push(savedEvent);
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
  editingEvent = null;
  eventForm.reset();
  eventForm.elements.color.value = 'mint';
  updateAllDayControl();
  closeComposer();
  render();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && composer.classList.contains('is-open')) closeComposer();
  if (event.key === 'Escape' && anniversarySheet.classList.contains('is-open')) closeAnniversarySheet();
  if (event.key === 'Escape' && agendaPanel.classList.contains('is-open')) closeAgendaSheet();
});

applyTheme(document.documentElement.dataset.theme || 'light');
window.addEventListener('resize', fitCalendarTitle);
render();
Promise.resolve(window.sharedCalendar?.init({
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
    if (anniversarySheet.classList.contains('is-open')) renderAnniversarySheet();
    if (preferredCalendarScope === 'shared' && activeSharedCalendarId) {
      setCalendarScope('shared');
      return;
    }
    updateCalendarHeading();
    renderSharedCalendarTabs();
  },
  onCalendarActivated() {
    setCalendarScope('shared');
  },
})).catch((error) => {
  console.error('공유 캘린더를 시작하지 못했습니다.', error);
}).finally(finishCalendarRestore);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then((registration) => registration.update()).catch((error) => {
      console.warn('오프라인 사용을 위한 서비스 워커를 등록하지 못했습니다.', error);
    });
  });
}
