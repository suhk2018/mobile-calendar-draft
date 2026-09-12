(() => {
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
  const byId = (id) => document.getElementById(id);
  const ui = {};

  function showError(element, message) { element.textContent = message; element.hidden = !message; }
  function mapEvent(row) { return { id: row.id, date: row.start_date, startDate: row.start_date, endDate: row.end_date, allDay: !row.event_time, time: row.event_time?.slice(0, 5) || '', title: row.title, color: row.color, authorId: row.created_by }; }

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
  }

  function subscribe() {
    if (channel) client.removeChannel(channel);
    channel = null;
    if (!activeCalendar) return;
    channel = client.channel(`events:${activeCalendar.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${activeCalendar.id}` }, loadEvents)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples' }, (payload) => {
        if (!calendars.some((calendar) => calendar.id === payload.new.id)) return;
        calendars = calendars.map((calendar) => calendar.id === payload.new.id ? { ...calendar, ...payload.new } : calendar);
        activeCalendar = calendars.find((calendar) => calendar.id === activeCalendar?.id) || activeCalendar;
        renderAccount();
        calendarsHandler(calendars, activeCalendar?.id || null);
      })
      .subscribe();
  }

  async function selectCalendar(id) {
    activeCalendar = calendars.find((calendar) => calendar.id === id) || calendars[0] || null;
    if (activeCalendar) localStorage.setItem('active-shared-calendar-v1', activeCalendar.id);
    calendarsHandler(calendars, activeCalendar?.id || null);
    renderAccount();
    await loadEvents();
    subscribe();
  }

  async function loadCalendars(preferredId) {
    calendars = [];
    activeCalendar = null;
    if (!session) return renderAccount();
    const { data, error } = await client.from('couple_members').select('couple_id, joined_at, couples(id, name, invite_code, created_by, first_met_on)').eq('user_id', session.user.id).order('joined_at');
    if (error) throw error;
    calendars = data.map((item) => item.couples).filter(Boolean);
    const savedId = preferredId || localStorage.getItem('active-shared-calendar-v1');
    activeCalendar = calendars.find((calendar) => calendar.id === savedId) || calendars[0] || null;
    renderAccount();
    calendarsHandler(calendars, activeCalendar?.id || null);
    await loadEvents();
    subscribe();
  }

  function renderCalendarCards() {
    ui.coupleList.replaceChildren();
    calendars.forEach((calendar) => {
      const card = document.createElement('div');
      card.className = 'couple-card';
      const caption = document.createElement('span');
      caption.textContent = calendar.id === activeCalendar?.id ? '현재 보고 있는 캘린더' : '함께 쓰는 캘린더';
      const name = document.createElement('strong');
      name.textContent = calendar.name;
      const anniversary = document.createElement('p');
      anniversary.className = 'couple-anniversary';
      anniversary.textContent = formatAnniversary(calendar.first_met_on);
      const openButton = document.createElement('button');
      openButton.type = 'button';
      openButton.className = 'calendar-open-button';
      openButton.textContent = calendar.id === activeCalendar?.id ? '선택됨' : '열기';
      openButton.addEventListener('click', async () => { await selectCalendar(calendar.id); closeSheet(); });
      const removeButton = document.createElement('button');
      removeButton.type = 'button';
      removeButton.className = 'calendar-delete-button';
      const isOwner = calendar.created_by === session.user.id;
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
      actions.append(openButton);
      const renameForm = document.createElement('form');
      renameForm.className = 'calendar-rename-form';
      renameForm.hidden = true;
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
      renameCancelButton.addEventListener('click', () => {
        renameInput.value = calendar.name;
        renameForm.hidden = true;
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
      renameForm.append(renameInput, renameSaveButton, renameCancelButton);
      if (isOwner) {
        const renameButton = document.createElement('button');
        renameButton.type = 'button';
        renameButton.className = 'calendar-rename-button';
        renameButton.textContent = '이름 변경';
        renameButton.addEventListener('click', () => {
          renameForm.hidden = false;
          renameInput.focus();
          renameInput.select();
        });
        actions.append(renameButton);
      }
      const anniversaryForm = document.createElement('form');
      anniversaryForm.className = 'anniversary-form';
      anniversaryForm.hidden = true;
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
      anniversaryForm.append(anniversaryInput, anniversarySaveButton, anniversaryCancelButton);
      const anniversaryButton = document.createElement('button');
      anniversaryButton.type = 'button';
      anniversaryButton.className = 'calendar-anniversary-button';
      anniversaryButton.textContent = calendar.first_met_on ? '만난 날 변경' : '만난 날 설정';
      anniversaryButton.addEventListener('click', () => {
        anniversaryForm.hidden = false;
        anniversaryInput.focus();
      });
      actions.append(anniversaryButton);
      actions.append(removeButton);
      const invite = document.createElement('p');
      invite.append('초대 코드 ');
      const inviteButton = document.createElement('button');
      inviteButton.type = 'button';
      inviteButton.className = 'invite-code';
      inviteButton.textContent = calendar.invite_code;
      inviteButton.title = '눌러서 복사';
      inviteButton.addEventListener('click', async () => {
        await navigator.clipboard.writeText(calendar.invite_code);
        inviteButton.textContent = '복사됨!';
        setTimeout(() => { inviteButton.textContent = calendar.invite_code; }, 1200);
      });
      invite.append(inviteButton);
      card.append(caption, name, actions, anniversary, invite, renameForm, anniversaryForm);
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

  async function init({ onEvents, onConnection, onCalendars, onCalendarActivated }) {
    eventHandler = onEvents;
    connectionHandler = onConnection || (() => {});
    calendarsHandler = onCalendars || (() => {});
    calendarActivatedHandler = onCalendarActivated || (() => {});
    ['accountButton', 'accountBackdrop', 'accountSheet', 'closeAccount', 'connectionNotice', 'signedOutView', 'signedInView', 'authForm', 'authError', 'signUpButton', 'accountEmail', 'signOutButton', 'coupleConnectedView', 'coupleSetupView', 'coupleList', 'createCoupleForm', 'joinCoupleForm', 'coupleError'].forEach((id) => { ui[id] = byId(id); });
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
    const values = { title: event.title, start_date: event.startDate, end_date: event.endDate, event_time: event.allDay ? null : event.time, color: event.color };
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

  window.sharedCalendar = { init, upsertEvent, deleteEvent, selectCalendar, isConnected: () => Boolean(session && activeCalendar), openSettings: openSheet };
})();
