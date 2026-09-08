(() => {
  const config = window.SUPABASE_CONFIG || {};
  const configured = Boolean(config.url && config.anonKey && window.supabase);
  const client = configured ? window.supabase.createClient(config.url, config.anonKey) : null;
  let session = null;
  let couple = null;
  let channel = null;
  let eventHandler = () => {};

  const byId = (id) => document.getElementById(id);
  const ui = {};

  function showError(element, message) {
    element.textContent = message;
    element.hidden = !message;
  }

  function mapEvent(row) {
    return {
      id: row.id,
      date: row.start_date,
      startDate: row.start_date,
      endDate: row.end_date,
      time: row.event_time?.slice(0, 5) || '',
      title: row.title,
      color: row.color,
      authorId: row.created_by,
    };
  }

  async function loadEvents() {
    if (!couple) return;
    const { data, error } = await client.from('events').select('*').eq('couple_id', couple.id).order('start_date');
    if (error) throw error;
    eventHandler(data.map(mapEvent));
  }

  function subscribe() {
    if (channel) client.removeChannel(channel);
    if (!couple) return;
    channel = client.channel(`events:${couple.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `couple_id=eq.${couple.id}` }, loadEvents)
      .subscribe();
  }

  async function loadCouple() {
    couple = null;
    if (!session) return renderAccount();
    const { data, error } = await client.from('couple_members').select('couple_id, couples(id, name, invite_code)').eq('user_id', session.user.id).limit(1).maybeSingle();
    if (error) throw error;
    couple = data?.couples || null;
    renderAccount();
    if (couple) {
      await loadEvents();
      subscribe();
    }
  }

  function renderAccount() {
    ui.connectionNotice.hidden = configured;
    ui.signedOutView.hidden = Boolean(session);
    ui.signedInView.hidden = !session;
    if (!session) {
      ui.accountButton.textContent = '공유 설정';
      return;
    }
    ui.accountEmail.textContent = session.user.email;
    ui.coupleConnectedView.hidden = !couple;
    ui.coupleSetupView.hidden = Boolean(couple);
    ui.accountButton.textContent = couple ? couple.name : '연결하기';
    if (couple) {
      ui.coupleName.textContent = couple.name;
      ui.inviteCode.textContent = couple.invite_code;
    }
  }

  function openSheet() {
    ui.accountBackdrop.hidden = false;
    ui.accountSheet.classList.add('is-open');
  }

  function closeSheet() {
    ui.accountSheet.classList.remove('is-open');
    setTimeout(() => { if (!ui.accountSheet.classList.contains('is-open')) ui.accountBackdrop.hidden = true; }, 190);
  }

  async function runAuth(mode, form) {
    const values = new FormData(form);
    const credentials = { email: String(values.get('email')).trim(), password: String(values.get('password')) };
    showError(ui.authError, '');
    if (!configured) return showError(ui.authError, '먼저 Supabase 연결 정보를 설정해 주세요.');
    const result = mode === 'signup' ? await client.auth.signUp(credentials) : await client.auth.signInWithPassword(credentials);
    if (result.error) return showError(ui.authError, result.error.message);
    if (mode === 'signup' && !result.data.session) showError(ui.authError, '확인 이메일을 보냈어요. 이메일 인증 후 로그인해 주세요.');
  }

  async function init({ onEvents }) {
    eventHandler = onEvents;
    ['accountButton', 'accountBackdrop', 'accountSheet', 'closeAccount', 'connectionNotice', 'signedOutView', 'signedInView', 'authForm', 'authError', 'signUpButton', 'accountEmail', 'signOutButton', 'coupleConnectedView', 'coupleSetupView', 'coupleName', 'inviteCode', 'createCoupleForm', 'joinCoupleForm', 'coupleError'].forEach((id) => { ui[id] = byId(id); });
    ui.accountButton.addEventListener('click', openSheet);
    ui.closeAccount.addEventListener('click', closeSheet);
    ui.accountBackdrop.addEventListener('click', closeSheet);
    ui.authForm.addEventListener('submit', (event) => { event.preventDefault(); runAuth('signin', event.currentTarget); });
    ui.signUpButton.addEventListener('click', () => runAuth('signup', ui.authForm));
    ui.signOutButton.addEventListener('click', () => client.auth.signOut());
    ui.createCoupleForm.addEventListener('submit', async (event) => {
      event.preventDefault(); showError(ui.coupleError, '');
      const name = String(new FormData(event.currentTarget).get('name')).trim();
      const { error } = await client.rpc('create_couple', { couple_name: name });
      if (error) return showError(ui.coupleError, error.message);
      await loadCouple();
    });
    ui.joinCoupleForm.addEventListener('submit', async (event) => {
      event.preventDefault(); showError(ui.coupleError, '');
      const code = String(new FormData(event.currentTarget).get('code')).trim().toUpperCase();
      const { error } = await client.rpc('join_couple', { invitation_code: code });
      if (error) return showError(ui.coupleError, error.message);
      await loadCouple();
    });
    ui.inviteCode.addEventListener('click', async () => {
      await navigator.clipboard.writeText(couple.invite_code);
      ui.inviteCode.textContent = '복사됨!';
      setTimeout(() => { if (couple) ui.inviteCode.textContent = couple.invite_code; }, 1200);
    });
    renderAccount();
    if (!configured) return;
    ({ data: { session } } = await client.auth.getSession());
    await loadCouple();
    client.auth.onAuthStateChange(async (_event, nextSession) => {
      session = nextSession;
      await loadCouple();
    });
  }

  async function upsertEvent(event) {
    if (!client || !session || !couple) return false;
    const { error } = await client.from('events').upsert({ id: event.id, couple_id: couple.id, created_by: session.user.id, title: event.title, start_date: event.startDate, end_date: event.endDate, event_time: event.time || null, color: event.color });
    if (error) throw error;
    await loadEvents();
    return true;
  }

  async function deleteEvent(id) {
    if (!client || !session || !couple) return false;
    const { error } = await client.from('events').delete().eq('id', id);
    if (error) throw error;
    await loadEvents();
    return true;
  }

  window.sharedCalendar = { init, upsertEvent, deleteEvent, isConnected: () => Boolean(session && couple) };
})();
