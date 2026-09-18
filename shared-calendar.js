(() => {
  const meetingDayMemo = 'couple-calendar:meeting-day:v1';
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase);
  const client = configured ? window.supabase.createClient(config.url, config.anonKey) : null;
  let session = null;
  let calendars = [];
  let activeCalendar = null;
  let channel = null;
  let eventHandler = () => {};
  let connectionHandler = () => {};
  let calendarsHandler = () => {};
  let calendarActivatedHandler = () => {};
  let meetingDaysHandler = () => {};
  let meetingDays = [];
  let meetingTablesAvailable = true;
  const byId = (id) => document.getElementById(id);
  const ui = {};

  function showError(element, message) { element.textContent = message; element.hidden = !message; }
  function mapEvent(row) {
    const isMine = row.created_by === session?.user?.id;
    return { id: row.id, date: row.start_date, startDate: row.start_date, endDate: row.end_date, allDay: !row.event_time, time: row.event_time?.slice(0, 5) || '', title: row.title, memo: row.memo || '', color: row.color, authorId: row.created_by, authorLabel: isMine ? '나' : '상대방', authorBadge: isMine ? '나' : '상', isMeetingDay: row.memo === meetingDayMemo };
  }

  function mapMeetingPlace(row) {
    return {
      id: row.id,
      meetingDayId: row.meeting_day_id,
      name: row.place_name,
      address: row.address || '',
      latitude: row.latitude,
      longitude: row.longitude,
      memo: row.memo || '',
      order: row.visit_order || 0,
      authorId: row.created_by,
    };
  }

  function mapMeetingDay(row) {
    return {
      id: row.id,
      date: row.meeting_date,
      authorId: row.created_by,
      places: (row.meeting_places || []).map(mapMeetingPlace).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ko')),
    };
  }

  function legacyMeetingDays(rows) {
    return rows
      .filter((row) => row.memo === meetingDayMemo)
      .map((row) => ({ id: row.id, date: row.start_date, authorId: row.created_by, places: [], legacy: true }));
  }

  function meetingTableMissing(error) {
    return ['42P01', 'PGRST200', 'PGRST205'].includes(error?.code) || /meeting_days|meeting_places/i.test(error?.message || '');
  }

  function fromDateKey(key) {
    const [year, month, day] = key.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  function formatAnniversary(firstMetOn) {
    if (!firstMetOn) return '아직 만난 날이 설정되지 않았어요.';
    const firstDay = fromDateKey(firstMetOn);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const difference = Math.round((today - firstDay) / 86400000);
    const dDay = difference >= 0 ? `D+${difference + 1}` : `D${difference}`;
    const date = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' }).format(firstDay);
    return `${dDay} · ${date}부터 함께`;
  }

  async function loadEvents() {
    if (!activeCalendar) return eventHandler([]);
    const { data, error } = await client.from('events').select('*').eq('couple_id', activeCalendar.id).order('start_date');
    if (error) throw error;
    eventHandler(data.map(mapEvent));
    if (!meetingTablesAvailable) {
      meetingDays = legacyMeetingDays(data);
      meetingDaysHandler(meetingDays, false);
    }
  }

  async function loadMeetingDays() {
    if (!activeCalendar) {
      meetingDays = [];
      meetingDaysHandler([], meetingTablesAvailable);
      return;
    }
    const { data, error } = await client
      .from('meeting_days')
      .select('id, couple_id, meeting_date, created_by, meeting_places(id, meeting_day_id, place_name, address, latitude, longitude, memo, visit_order, created_by)')
      .eq('couple_id', activeCalendar.id)
      .order('meeting_date');
    if (error) {
      if (!meetingTableMissing(error)) throw error;
      meetingTablesAvailable = false;
      const { data: legacyRows, error: legacyError } = await client.from('events').select('*').eq('couple_id', activeCalendar.id).eq('memo', meetingDayMemo).order('start_date');
      if (legacyError) throw legacyError;
      meetingDays = legacyMeetingDays(legacyRows);
      meetingDaysHandler(meetingDays, false);
      return;
    }
    meetingTablesAvailable = true;
    meetingDays = data.map(mapMeetingDay);
    meetingDaysHandler(meetingDays, true);
  }

  function subscribe() {
    if (channel) client.removeChannel(channel);
    channel = null;
    if (!activeCalendar) return;
    channel = client.channel(`events:${activeCalendar.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${activeCalendar.id}` }, loadEvents);
    if (meetingTablesAvailable) {
      channel
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_days', filter: `couple_id=eq.${activeCalendar.id}` }, loadMeetingDays)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'meeting_places', filter: `couple_id=eq.${activeCalendar.id}` }, loadMeetingDays);
    }
    channel
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples' }, (payload) => {
        if (!calendars.some((calendar) => calendar.id === payload.new.id)) return;
        calendars = calendars.map((calendar) => calendar.id === payload.new.id ? { ...calendar, ...payload.new } : calendar);
        activeCalendar = calendars.find((calendar) => calendar.id === activeCalendar?.id) || activeCalendar;
        renderAccount();
        calendarsHandler(calendars, activeCalendar?.id || null);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couple_members' }, async (payload) => {
        if (!calendars.some((calendar) => calendar.id === payload.new.couple_id)) return;
        await loadCalendars(activeCalendar?.id);
      })
      .subscribe();
  }

  async function selectCalendar(id) {
    activeCalendar = calendars.find((calendar) => calendar.id === id) || calendars[0] || null;
    if (activeCalendar) localStorage.setItem('active-shared-calendar-v1', activeCalendar.id);
    calendarsHandler(calendars, activeCalendar?.id || null);
    renderAccount();
    await loadEvents();
    await loadMeetingDays();
    subscribe();
  }

  async function loadCalendars(preferredId) {
    calendars = [];
    activeCalendar = null;
    if (!session) return renderAccount();
    const { data, error } = await client.from('couple_members').select('couple_id, joined_at, couples(id, name, invite_code, created_by, first_met_on)').eq('user_id', session.user.id).order('joined_at');
    if (error) throw error;
    calendars = data.map((item) => item.couples).filter(Boolean);
    if (calendars.length) {
      const calendarIds = calendars.map((calendar) => calendar.id);
      const { data: memberRows, error: memberError } = await client.from('couple_members').select('couple_id, user_id, birthday').in('couple_id', calendarIds);
      if (memberError) throw memberError;
      calendars = calendars.map((calendar) => ({
        ...calendar,
        members: memberRows
          .filter((member) => member.couple_id === calendar.id)
          .map((member) => ({
            userId: member.user_id,
            birthday: member.birthday,
            isMe: member.user_id === session.user.id,
          })),
      }));
    }
    const savedId = preferredId || localStorage.getItem('active-shared-calendar-v1');
    activeCalendar = calendars.find((calendar) => calendar.id === savedId) || calendars[0] || null;
    renderAccount();
    calendarsHandler(calendars, activeCalendar?.id || null);
    await loadEvents();
    await loadMeetingDays();
    subscribe();
  }

  function renderCalendarCards() {
    ui.coupleList.replaceChildren();
    calendars.forEach((calendar) => {
      const isActive = calendar.id === activeCalendar?.id;
      const isOwner = calendar.created_by === session.user.id;
      const card = document.createElement('div');
      card.className = `couple-card${isActive ? ' is-active' : ''}`;

      const header = document.createElement('div');
      header.className = 'calendar-card-header';
      const icon = document.createElement('span');
      icon.className = 'calendar-card-icon';
      icon.textContent = '♥';
      icon.setAttribute('aria-hidden', 'true');
      const identity = document.createElement('div');
      identity.className = 'calendar-card-identity';
      const caption = document.createElement('span');
      caption.textContent = isActive ? '현재 사용 중' : '공유 캘린더';
      const name = document.createElement('strong');
      name.textContent = calendar.name;
      identity.append(caption, name);
      header.append(icon, identity);
      if (isActive) {
        const status = document.createElement('span');
        status.className = 'calendar-active-badge';
        status.textContent = '사용 중';
        header.append(status);
      }

      const anniversary = document.createElement('p');
      anniversary.className = 'couple-anniversary';
      anniversary.textContent = calendar.first_met_on ? formatAnniversary(calendar.first_met_on) : '처음 만난 날을 설정해 주세요';

      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'calendar-open-button';
      openButton.textContent = '이 캘린더 열기';
      openButton.addEventListener('click', async () => { await selectCalendar(calendar.id); closeSheet(); });

      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'calendar-delete-button';
      removeButton.textContent = isOwner ? '삭제' : '나가기';
      removeButton.addEventListener('click', async () => {
        const message = isOwner
          ? `'${calendar.name}' 캘린더와 등록된 공유 일정을 모두 삭제할까요? 이 작업은 되돌릴 수 없어요.`
          : `'${calendar.name}' 캘린더에서 나갈까요?`;
        if (!window.confirm(message)) return;
        showError(ui.coupleError, '');
        const { error } = await client.rpc('delete_or_leave_couple', { target_couple: calendar.id });
        if (error) return showError(ui.coupleError, error.message);
        if (calendar.id === activeCalendar?.id) localStorage.removeItem('active-shared-calendar-v1');
        await loadCalendars();
      });
      const actions = document.createElement('div');
      actions.className = 'calendar-card-actions';
      if (!isActive) actions.append(openButton);

      const renameForm = document.createElement('form');
      renameForm.className = 'calendar-rename-form';
      renameForm.hidden = true;
      const renameTitle = document.createElement('strong');
      renameTitle.className = 'calendar-inline-form-title';
      renameTitle.textContent = '캘린더 이름 변경';
      const renameInput = document.createElement('input');
      renameInput.type = 'text';
      renameInput.maxLength = 30;
      renameInput.required = true;
      renameInput.value = calendar.name;
      renameInput.setAttribute('aria-label', '새 캘린더 이름');
      const renameSaveButton = document.createElement('button');
      renameSaveButton.type = 'submit';
      renameSaveButton.textContent = '저장';
      const renameCancelButton = document.createElement('button');
      renameCancelButton.type = 'button';
      renameCancelButton.textContent = '취소';
      let renameButton;
      renameCancelButton.addEventListener('click', () => {
        renameInput.value = calendar.name;
        renameForm.hidden = true;
        renameButton?.setAttribute('aria-expanded', 'false');
      });
      renameForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const nextName = renameInput.value.trim();
        if (!nextName || renameSaveButton.disabled) return;
        showError(ui.coupleError, '');
        renameSaveButton.disabled = true;
        const { error } = await client.rpc('rename_couple', { target_couple: calendar.id, new_name: nextName });
        renameSaveButton.disabled = false;
        if (error) return showError(ui.coupleError, error.message);
        renameForm.hidden = true;
        await loadCalendars(calendar.id);
      });
      renameForm.append(renameTitle, renameInput, renameSaveButton, renameCancelButton);
      if (isOwner) {
        renameButton = document.createElement('button');
        renameButton.type = 'button';
        renameButton.className = 'calendar-rename-button';
        renameButton.textContent = '이름 변경';
        renameButton.setAttribute('aria-expanded', 'false');
        renameButton.addEventListener('click', () => {
          const shouldOpen = renameForm.hidden;
          renameForm.hidden = !shouldOpen;
          anniversaryForm.hidden = true;
          renameButton.setAttribute('aria-expanded', String(shouldOpen));
          anniversaryButton.setAttribute('aria-expanded', 'false');
          if (shouldOpen) {
            renameInput.focus();
            renameInput.select();
          }
        });
        actions.append(renameButton);
      }

      const anniversaryForm = document.createElement('form');
      anniversaryForm.className = 'anniversary-form';
      anniversaryForm.hidden = true;
      const anniversaryTitle = document.createElement('strong');
      anniversaryTitle.className = 'calendar-inline-form-title';
      anniversaryTitle.textContent = '처음 만난 날 변경';
      const anniversaryInput = document.createElement('input');
      anniversaryInput.type = 'date';
      anniversaryInput.required = true;
      anniversaryInput.value = calendar.first_met_on || '';
      anniversaryInput.setAttribute('aria-label', '처음 만난 날');
      const anniversarySaveButton = document.createElement('button');
      anniversarySaveButton.type = 'submit';
      anniversarySaveButton.textContent = '저장';
      const anniversaryCancelButton = document.createElement('button');
      anniversaryCancelButton.type = 'button';
      anniversaryCancelButton.textContent = '취소';
      anniversaryCancelButton.addEventListener('click', () => {
        anniversaryInput.value = calendar.first_met_on || '';
        anniversaryForm.hidden = true;
        anniversaryButton.setAttribute('aria-expanded', 'false');
      });
      anniversaryForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (!anniversaryInput.value || anniversarySaveButton.disabled) return;
        showError(ui.coupleError, '');
        anniversarySaveButton.disabled = true;
        const { error } = await client.rpc('set_couple_anniversary', { target_couple: calendar.id, new_date: anniversaryInput.value });
        anniversarySaveButton.disabled = false;
        if (error) return showError(ui.coupleError, error.message);
        anniversaryForm.hidden = true;
        await loadCalendars(calendar.id);
      });
      anniversaryForm.append(anniversaryTitle, anniversaryInput, anniversarySaveButton, anniversaryCancelButton);
      const anniversaryButton = document.createElement('button');
      anniversaryButton.type = 'button';
      anniversaryButton.className = 'calendar-anniversary-button';
      anniversaryButton.textContent = calendar.first_met_on ? '만난 날' : '날짜 설정';
      anniversaryButton.setAttribute('aria-expanded', 'false');
      anniversaryButton.addEventListener('click', () => {
        const shouldOpen = anniversaryForm.hidden;
        anniversaryForm.hidden = !shouldOpen;
        renameForm.hidden = true;
        anniversaryButton.setAttribute('aria-expanded', String(shouldOpen));
        renameButton?.setAttribute('aria-expanded', 'false');
        if (shouldOpen) anniversaryInput.focus();
      });
      actions.append(anniversaryButton);
      actions.append(removeButton);

      const invite = document.createElement('div');
      invite.className = 'calendar-invite-row';
      const inviteDescription = document.createElement('div');
      const inviteLabel = document.createElement('span');
      inviteLabel.textContent = '초대 코드';
      const inviteHelp = document.createElement('small');
      inviteHelp.textContent = '상대방에게 보내 함께 사용하세요';
      inviteDescription.append(inviteLabel, inviteHelp);
      const inviteButton = document.createElement('button');
      inviteButton.type = 'button';
      inviteButton.className = 'invite-copy-button';
      inviteButton.setAttribute('aria-label', `초대 코드 ${calendar.invite_code} 복사`);
      const inviteCode = document.createElement('strong');
      inviteCode.textContent = calendar.invite_code;
      const inviteAction = document.createElement('span');
      inviteAction.textContent = '복사';
      inviteButton.append(inviteCode, inviteAction);
      inviteButton.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(calendar.invite_code);
          inviteAction.textContent = '복사됨';
          setTimeout(() => { inviteAction.textContent = '복사'; }, 1200);
        } catch {
          showError(ui.coupleError, '초대 코드를 복사하지 못했어요. 코드를 길게 눌러 복사해 주세요.');
        }
      });
      invite.append(inviteDescription, inviteButton);

      card.append(header, anniversary, invite, actions, renameForm, anniversaryForm);
      ui.coupleList.append(card);
    });
  }

  function renderAccount() {
    ui.connectionNotice.hidden = configured;
    ui.signedOutView.hidden = Boolean(session);
    ui.signedInView.hidden = !session;
    if (!session) {
      connectionHandler(false);
      calendarsHandler([], null);
      return;
    }
    ui.accountEmail.textContent = session.user.email;
    ui.coupleConnectedView.hidden = calendars.length === 0;
    ui.coupleCount.textContent = `${calendars.length}개`;
    if (calendars.length === 0) ui.coupleSetupView.open = true;
    renderCalendarCards();
    connectionHandler(calendars.length > 0);
  }

  function openSheet() { ui.accountBackdrop.hidden = false; ui.accountSheet.classList.add('is-open'); }
  function closeSheet() { ui.accountSheet.classList.remove('is-open'); setTimeout(() => { if (!ui.accountSheet.classList.contains('is-open')) ui.accountBackdrop.hidden = true; }, 190); }

  async function runAuth(mode, form) {
    const values = new FormData(form);
    const credentials = { email: String(values.get('email')).trim(), password: String(values.get('password')) };
    showError(ui.authError, '');
    if (!configured) return showError(ui.authError, '먼저 Supabase 연결 정보를 설정해 주세요.');
    const result = mode === 'signup' ? await client.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}${window.location.pathname}` } }) : await client.auth.signInWithPassword(credentials);
    if (result.error) return showError(ui.authError, result.error.message);
    if (mode === 'signup' && result.data.user?.identities?.length === 0) showError(ui.authError, '이미 가입 요청된 이메일이에요. 위 로그인 버튼을 눌러 주세요.');
    else if (mode === 'signup' && !result.data.session) showError(ui.authError, '확인 이메일을 보냈어요. 이메일 인증 후 로그인해 주세요.');
  }

  async function submitCalendarForm(form, action) {
    const button = form.querySelector('button[type="submit"]');
    if (button.disabled) return;
    button.disabled = true;
    form.setAttribute('aria-busy', 'true');
    try {
      await action();
    } catch (error) {
      console.error(error);
      showError(ui.coupleError, '처리 중 문제가 생겼어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.');
    } finally {
      button.disabled = false;
      form.removeAttribute('aria-busy');
    }
  }

  async function init({ onEvents, onConnection, onCalendars, onCalendarActivated, onMeetingDays }) {
    eventHandler = onEvents;
    connectionHandler = onConnection || (() => {});
    calendarsHandler = onCalendars || (() => {});
    calendarActivatedHandler = onCalendarActivated || (() => {});
    meetingDaysHandler = onMeetingDays || (() => {});
    ['accountButton', 'accountBackdrop', 'accountSheet', 'closeAccount', 'connectionNotice', 'signedOutView', 'signedInView', 'authForm', 'authError', 'signUpButton', 'accountEmail', 'signOutButton', 'coupleConnectedView', 'coupleSetupView', 'coupleCount', 'coupleList', 'createCoupleForm', 'joinCoupleForm', 'coupleError'].forEach((id) => { ui[id] = byId(id); });
    ui.accountButton.addEventListener('click', openSheet);
    ui.closeAccount.addEventListener('click', closeSheet);
    ui.accountBackdrop.addEventListener('click', closeSheet);
    ui.authForm.addEventListener('submit', (event) => { event.preventDefault(); runAuth('signin', event.currentTarget); });
    ui.signUpButton.addEventListener('click', () => runAuth('signup', ui.authForm));
    ui.signOutButton.addEventListener('click', () => client.auth.signOut());
    ui.createCoupleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      submitCalendarForm(form, async () => {
        showError(ui.coupleError, '');
        const values = new FormData(form);
        const name = String(values.get('name')).trim();
        const firstMetOn = String(values.get('firstMetOn'));
        const { data, error } = await client.rpc('create_couple', { couple_name: name });
        if (error) return showError(ui.coupleError, error.message);
        const { error: anniversaryError } = await client.rpc('set_couple_anniversary', { target_couple: data, new_date: firstMetOn });
        if (anniversaryError) return showError(ui.coupleError, anniversaryError.message);
        form.reset();
        await loadCalendars(data);
        calendarActivatedHandler(data);
        ui.coupleSetupView.open = false;
        closeSheet();
      });
    });
    ui.joinCoupleForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      submitCalendarForm(form, async () => {
        showError(ui.coupleError, '');
        const code = String(new FormData(form).get('code')).trim().toUpperCase();
        const { data, error } = await client.rpc('join_couple', { invitation_code: code });
        if (error) return showError(ui.coupleError, error.message);
        form.reset();
        await loadCalendars(data);
        calendarActivatedHandler(data);
        ui.coupleSetupView.open = false;
        closeSheet();
      });
    });
    renderAccount();
    if (!configured) return;
    ({ data: { session } } = await client.auth.getSession());
    await loadCalendars();
    client.auth.onAuthStateChange(async (_event, nextSession) => { session = nextSession; await loadCalendars(); });
  }

  async function upsertEvent(event) {
    if (!client || !session || !activeCalendar) return false;
    const values = { title: event.title, memo: event.memo || '', start_date: event.startDate, end_date: event.endDate, event_time: event.allDay ? null : event.time, color: event.color };
    const query = event.authorId
      ? client.from('events').update(values).eq('id', event.id).eq('couple_id', activeCalendar.id)
      : client.from('events').insert({ ...values, id: event.id, couple_id: activeCalendar.id, created_by: session.user.id });
    const { error } = await query;
    if (error) throw error;
    await loadEvents();
    return true;
  }

  async function deleteEvent(id) {
    if (!client || !session || !activeCalendar) return false;
    const { error } = await client.from('events').delete().eq('id', id).eq('couple_id', activeCalendar.id);
    if (error) throw error;
    await loadEvents();
    return true;
  }

  async function setMeetingDay(date, enabled) {
    if (!client || !session || !activeCalendar) throw new Error('공유 캘린더에 연결한 뒤 다시 시도해 주세요.');
    const existing = meetingDays.find((day) => day.date === date);
    if (!meetingTablesAvailable) {
      if (enabled && !existing) {
        await upsertEvent({
          id: `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          startDate: date,
          endDate: date,
          allDay: true,
          time: '',
          title: '함께한 날',
          memo: meetingDayMemo,
          color: 'pink',
        });
      } else if (!enabled && existing) {
        await deleteEvent(existing.id);
      }
      await loadMeetingDays();
      return true;
    }
    if (enabled && !existing) {
      const { error } = await client.from('meeting_days').insert({ couple_id: activeCalendar.id, meeting_date: date, created_by: session.user.id });
      if (error && error.code !== '23505') throw error;
    } else if (!enabled && existing) {
      const { error } = await client.from('meeting_days').delete().eq('id', existing.id).eq('couple_id', activeCalendar.id);
      if (error) throw error;
    }
    await loadMeetingDays();
    return true;
  }

  async function upsertMeetingPlace(place) {
    if (!client || !session || !activeCalendar) throw new Error('공유 캘린더에 연결한 뒤 다시 시도해 주세요.');
    if (!meetingTablesAvailable) throw new Error('먼저 장소 기록용 Supabase 마이그레이션을 실행해 주세요.');
    let meetingDay = meetingDays.find((day) => day.date === place.date);
    if (!meetingDay) {
      const { data, error } = await client
        .from('meeting_days')
        .insert({ couple_id: activeCalendar.id, meeting_date: place.date, created_by: session.user.id })
        .select('id, couple_id, meeting_date, created_by')
        .single();
      if (error) throw error;
      meetingDay = mapMeetingDay(data);
    }
    const values = {
      couple_id: activeCalendar.id,
      meeting_day_id: meetingDay.id,
      place_name: place.name,
      address: place.address || '',
      latitude: Number.isFinite(place.latitude) ? place.latitude : null,
      longitude: Number.isFinite(place.longitude) ? place.longitude : null,
      memo: place.memo || '',
      visit_order: place.order || Math.max(0, ...(meetingDay.places || []).map((item) => item.order || 0)) + 1,
    };
    const query = place.id
      ? client.from('meeting_places').update(values).eq('id', place.id).eq('couple_id', activeCalendar.id)
      : client.from('meeting_places').insert({ ...values, created_by: session.user.id });
    const { error } = await query;
    if (error) throw error;
    await loadMeetingDays();
    return true;
  }

  async function deleteMeetingPlace(id) {
    if (!client || !session || !activeCalendar) throw new Error('공유 캘린더에 연결한 뒤 다시 시도해 주세요.');
    if (!meetingTablesAvailable) throw new Error('먼저 장소 기록용 Supabase 마이그레이션을 실행해 주세요.');
    const { error } = await client.from('meeting_places').delete().eq('id', id).eq('couple_id', activeCalendar.id);
    if (error) throw error;
    await loadMeetingDays();
    return true;
  }

  async function setBirthday(birthday) {
    if (!client || !session || !activeCalendar) throw new Error('공유 캘린더에 연결한 뒤 다시 시도해 주세요.');
    const { error } = await client.rpc('set_member_birthday', { target_couple: activeCalendar.id, new_birthday: birthday });
    if (error) throw error;
    await loadCalendars(activeCalendar.id);
    return true;
  }

  window.sharedCalendar = {
    init,
    upsertEvent,
    deleteEvent,
    setMeetingDay,
    upsertMeetingPlace,
    deleteMeetingPlace,
    setBirthday,
    selectCalendar,
    meetingTablesReady: () => meetingTablesAvailable,
    isConnected: () => Boolean(session && activeCalendar),
    accessToken: () => session?.access_token || '',
    openSettings: openSheet,
  };
})();
