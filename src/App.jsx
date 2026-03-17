import { useEffect, useMemo, useState } from 'react';
import { supabase, supabaseConfigured, supabaseConfigMessage } from './lib/supabase.js';

const EMPTY_AUTH = {
  email: '',
  password: '',
  displayName: ''
};

const EMPTY_EVENT = {
  title: '',
  description: '',
  venue: '',
  starts_at: '',
  capacity: 20
};

function formatDateTime(value) {
  if (!value) return '未設定';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function toLocalDateTimeInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const tzOffset = date.getTimezoneOffset() * 60000;
  const local = new Date(date.getTime() - tzOffset);
  return local.toISOString().slice(0, 16);
}

function normalizeDateTime(input) {
  if (!input) return '';
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString();
}

function AppShell({ children }) {
  return <div className="app-shell">{children}</div>;
}

function SetupScreen() {
  return (
    <AppShell>
      <div className="card narrow setup-card">
        <h1>Event Manager B+ Supabase</h1>
        <p className="muted">{supabaseConfigMessage}</p>
        <ol>
          <li>README の SQL を Supabase の SQL Editor で実行します。</li>
          <li>.env.local を作り、接続情報を設定します。</li>
          <li>npm install → npm run dev で起動します。</li>
        </ol>
      </div>
    </AppShell>
  );
}

function AuthScreen({ authMode, setAuthMode, authForm, setAuthForm, onSignIn, onSignUp, authMessage, loading }) {
  return (
    <AppShell>
      <div className="card narrow auth-card">
        <h1>Event Manager B+ Supabase</h1>
        <p className="muted">B向けの本格動的版です。認証は Supabase Auth、イベントと参加情報は Supabase DB に保存されます。</p>

        <div className="segmented" role="tablist" aria-label="ログイン方式">
          <button className={authMode === 'signin' ? 'active' : ''} onClick={() => setAuthMode('signin')}>
            ログイン
          </button>
          <button className={authMode === 'signup' ? 'active' : ''} onClick={() => setAuthMode('signup')}>
            新規登録
          </button>
        </div>

        <div className="form-grid">
          {authMode === 'signup' && (
            <label>
              表示名
              <input
                value={authForm.displayName}
                onChange={(e) => setAuthForm((prev) => ({ ...prev, displayName: e.target.value }))}
                placeholder="例: Daichi"
              />
            </label>
          )}

          <label>
            メールアドレス
            <input
              type="email"
              value={authForm.email}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, email: e.target.value }))}
              placeholder="you@example.com"
            />
          </label>

          <label>
            パスワード
            <input
              type="password"
              value={authForm.password}
              onChange={(e) => setAuthForm((prev) => ({ ...prev, password: e.target.value }))}
              placeholder="8文字以上"
            />
          </label>
        </div>

        {authMessage ? <div className="notice">{authMessage}</div> : null}

        <div className="actions stack-mobile">
          {authMode === 'signin' ? (
            <button className="primary" onClick={onSignIn} disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          ) : (
            <button className="primary" onClick={onSignUp} disabled={loading}>
              {loading ? '登録中...' : '新規登録'}
            </button>
          )}
        </div>

        <div className="tip-box">
          <strong>補足</strong>
          <p>Supabase の Hosted プロジェクトではメール確認が既定で有効です。研修の検証を急ぐ場合は Supabase 側で一時的に Confirm Email を無効にすると流れがシンプルになります。</p>
        </div>
      </div>
    </AppShell>
  );
}

function Header({ profile, session, activeTab, setActiveTab, onSignOut }) {
  const roleLabel = profile?.role === 'admin' ? '管理者' : '一般ユーザー';

  return (
    <header className="page-header card">
      <div>
        <h1>Event Manager B+ Supabase</h1>
        <p className="muted">
          {profile?.display_name || session?.user?.email} / {roleLabel}
        </p>
      </div>

      <nav className="tab-row">
        <button className={activeTab === 'events' ? 'active' : ''} onClick={() => setActiveTab('events')}>
          イベント一覧
        </button>
        <button className={activeTab === 'my-events' ? 'active' : ''} onClick={() => setActiveTab('my-events')}>
          マイイベント
        </button>
        {profile?.role === 'admin' ? (
          <button className={activeTab === 'admin' ? 'active' : ''} onClick={() => setActiveTab('admin')}>
            管理者メニュー
          </button>
        ) : null}
      </nav>

      <div className="actions stack-mobile right-align">
        <span className="small muted">{session?.user?.email}</span>
        <button onClick={onSignOut}>ログアウト</button>
      </div>
    </header>
  );
}

function EventCard({ event, registrationCount, isRegistered, canEdit, onSelect, onRegister, onCancel, onEdit, onDelete }) {
  const remaining = Math.max(event.capacity - registrationCount, 0);
  const isFull = remaining <= 0;

  return (
    <article className="event-card card">
      <div className="event-headline">
        <div>
          <div className="pill-row">
            <span className="pill">{formatDateTime(event.starts_at)}</span>
            {isRegistered ? <span className="pill success">参加予定</span> : null}
            {isFull ? <span className="pill danger">満席</span> : null}
          </div>
          <h3>{event.title}</h3>
          <p className="muted">会場: {event.venue}</p>
        </div>
      </div>

      <p className="description clamp-two">{event.description || '説明なし'}</p>

      <div className="metrics">
        <div>
          <span className="metric-label">参加者数</span>
          <strong>{registrationCount} 名</strong>
        </div>
        <div>
          <span className="metric-label">定員</span>
          <strong>{event.capacity} 名</strong>
        </div>
        <div>
          <span className="metric-label">残席</span>
          <strong>{remaining} 席</strong>
        </div>
      </div>

      <div className="actions wrap">
        <button onClick={() => onSelect(event)}>詳細</button>
        {!canEdit && !isRegistered ? (
          <button className="primary" onClick={() => onRegister(event.id)} disabled={isFull}>
            {isFull ? '満席' : '参加する'}
          </button>
        ) : null}
        {!canEdit && isRegistered ? (
          <button onClick={() => onCancel(event.id)}>参加取消</button>
        ) : null}
        {canEdit ? (
          <>
            <button onClick={() => onEdit(event)}>編集</button>
            <button className="danger-outline" onClick={() => onDelete(event.id)}>
              削除
            </button>
          </>
        ) : null}
      </div>
    </article>
  );
}

function EventDetail({ event, registrationCount, isRegistered, canEdit, onClose, onRegister, onCancel }) {
  if (!event) return null;
  const remaining = Math.max(event.capacity - registrationCount, 0);

  return (
    <div className="drawer card">
      <div className="drawer-header">
        <div>
          <h2>{event.title}</h2>
          <p className="muted">{formatDateTime(event.starts_at)} / {event.venue}</p>
        </div>
        <button onClick={onClose}>閉じる</button>
      </div>

      <div className="detail-grid">
        <div>
          <h3>説明</h3>
          <p>{event.description || '説明なし'}</p>
        </div>
        <div>
          <h3>参加状況</h3>
          <ul>
            <li>参加者数: {registrationCount} 名</li>
            <li>定員: {event.capacity} 名</li>
            <li>残席: {remaining} 席</li>
            <li>あなたの状態: {isRegistered ? '参加予定' : '未登録'}</li>
          </ul>
        </div>
      </div>

      {!canEdit ? (
        <div className="actions">
          {!isRegistered ? (
            <button className="primary" onClick={() => onRegister(event.id)} disabled={remaining <= 0}>
              {remaining <= 0 ? '満席' : '参加する'}
            </button>
          ) : (
            <button onClick={() => onCancel(event.id)}>参加取消</button>
          )}
        </div>
      ) : null}
    </div>
  );
}

function EventForm({ eventForm, setEventForm, editingEventId, onSubmit, onCancel, loading }) {
  return (
    <section className="card">
      <div className="section-header">
        <div>
          <h2>{editingEventId ? 'イベント編集' : 'イベント作成'}</h2>
          <p className="muted">管理者だけがイベントを追加・編集・削除できます。</p>
        </div>
      </div>

      <div className="form-grid two-column">
        <label>
          タイトル
          <input
            value={eventForm.title}
            onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="例: 新卒研修キックオフ"
          />
        </label>

        <label>
          会場
          <input
            value={eventForm.venue}
            onChange={(e) => setEventForm((prev) => ({ ...prev, venue: e.target.value }))}
            placeholder="例: 会議室 A"
          />
        </label>

        <label>
          開催日時
          <input
            type="datetime-local"
            value={eventForm.starts_at}
            onChange={(e) => setEventForm((prev) => ({ ...prev, starts_at: e.target.value }))}
          />
        </label>

        <label>
          定員
          <input
            type="number"
            min="1"
            value={eventForm.capacity}
            onChange={(e) => setEventForm((prev) => ({ ...prev, capacity: e.target.value }))}
          />
        </label>

        <label className="full-width">
          説明
          <textarea
            rows="4"
            value={eventForm.description}
            onChange={(e) => setEventForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="イベントの概要や持ち物を書いてください"
          />
        </label>
      </div>

      <div className="actions wrap">
        <button className="primary" onClick={onSubmit} disabled={loading}>
          {loading ? '保存中...' : editingEventId ? '更新する' : '作成する'}
        </button>
        {editingEventId ? <button onClick={onCancel}>編集をやめる</button> : null}
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authMode, setAuthMode] = useState('signin');
  const [authForm, setAuthForm] = useState(EMPTY_AUTH);
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [statsMap, setStatsMap] = useState({});
  const [myRegistrations, setMyRegistrations] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('events');
  const [search, setSearch] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [eventForm, setEventForm] = useState(EMPTY_EVENT);
  const [editingEventId, setEditingEventId] = useState(null);
  const [savingEvent, setSavingEvent] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) {
      setAuthLoading(false);
      return;
    }

    let isMounted = true;

    const init = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) return;
      if (error) {
        setAuthMessage(error.message);
      }
      setSession(data.session ?? null);
      setAuthLoading(false);
    };

    init();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setAuthLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      setEvents([]);
      setMyRegistrations([]);
      setStatsMap({});
      setSelectedEvent(null);
      return;
    }

    hydrateApp(session.user).catch((error) => {
      setMessage(error.message || 'データの読み込みに失敗しました。');
    });
  }, [session?.user?.id]);

  const myEventIds = useMemo(() => new Set(myRegistrations.map((item) => item.event_id)), [myRegistrations]);

  const filteredEvents = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return events;
    return events.filter((event) => {
      const haystack = `${event.title} ${event.description ?? ''} ${event.venue ?? ''}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [events, search]);

  const myEvents = useMemo(() => events.filter((event) => myEventIds.has(event.id)), [events, myEventIds]);

  async function ensureProfile(user, displayNameFromForm = '') {
    const desiredName = displayNameFromForm || user.user_metadata?.display_name || user.email?.split('@')[0] || 'User';

    const payload = {
      id: user.id,
      email: user.email,
      display_name: desiredName
    };

    const { error } = await supabase.from('profiles').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
  }

  async function hydrateApp(user) {
    setDataLoading(true);

    try {
      const [{ data: profileRow, error: profileError }, { data: eventsRows, error: eventsError }, { data: statsRows, error: statsError }, { data: registrationRows, error: registrationError }] = await Promise.all([
        supabase.from('profiles').select('id, email, display_name, role').eq('id', user.id).maybeSingle(),
        supabase.from('events').select('id, title, description, venue, starts_at, capacity, created_by').order('starts_at', { ascending: true }),
        supabase.rpc('get_event_stats'),
        supabase.from('registrations').select('event_id').eq('user_id', user.id)
      ]);

      if (profileError) throw profileError;
      if (eventsError) throw eventsError;
      if (statsError) throw statsError;
      if (registrationError) throw registrationError;

      const nextStats = Object.fromEntries((statsRows ?? []).map((row) => [row.event_id, Number(row.registration_count)]));

      setProfile(profileRow);
      setEvents(eventsRows ?? []);
      setStatsMap(nextStats);
      setMyRegistrations(registrationRows ?? []);
    } finally {
      setDataLoading(false);
    }
  }

  function validateAuthForm(isSignup) {
    if (!authForm.email.trim()) return 'メールアドレスを入力してください。';
    if (!authForm.password.trim() || authForm.password.trim().length < 8) return 'パスワードは8文字以上にしてください。';
    if (isSignup && !authForm.displayName.trim()) return '表示名を入力してください。';
    return '';
  }

  async function handleSignUp() {
    const validationMessage = validateAuthForm(true);
    if (validationMessage) {
      setAuthMessage(validationMessage);
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    try {
      const { data, error } = await supabase.auth.signUp({
        email: authForm.email.trim(),
        password: authForm.password.trim(),
        options: {
          data: {
            display_name: authForm.displayName.trim()
          },
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.user && data.session) {
        await ensureProfile(data.user, authForm.displayName.trim());
        setAuthForm(EMPTY_AUTH);
        setAuthMessage('登録とログインに成功しました。');
        return;
      }

      setAuthMessage('登録は受け付けられました。メール確認が有効な場合は、受信メールのリンクを開いてからログインしてください。');
      setAuthMode('signin');
    } catch (error) {
      setAuthMessage(error.message || '登録に失敗しました。');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignIn() {
    const validationMessage = validateAuthForm(false);
    if (validationMessage) {
      setAuthMessage(validationMessage);
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: authForm.email.trim(),
        password: authForm.password.trim()
      });

      if (error) throw error;
      if (data.user) {
        await ensureProfile(data.user);
      }

      setAuthForm(EMPTY_AUTH);
    } catch (error) {
      setAuthMessage(error.message || 'ログインに失敗しました。');
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setMessage(error.message || 'ログアウトに失敗しました。');
      return;
    }
    setActiveTab('events');
    setMessage('ログアウトしました。');
  }

  function validateEventForm() {
    if (!eventForm.title.trim()) return 'タイトルを入力してください。';
    if (!eventForm.venue.trim()) return '会場を入力してください。';
    if (!eventForm.starts_at) return '開催日時を入力してください。';
    if (!normalizeDateTime(eventForm.starts_at)) return '開催日時の形式が不正です。';
    if (!eventForm.capacity || Number(eventForm.capacity) <= 0) return '定員は1以上にしてください。';
    return '';
  }

  async function handleSaveEvent() {
    const validationMessage = validateEventForm();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setSavingEvent(true);
    setMessage('');

    const payload = {
      title: eventForm.title.trim(),
      description: eventForm.description.trim(),
      venue: eventForm.venue.trim(),
      starts_at: normalizeDateTime(eventForm.starts_at),
      capacity: Number(eventForm.capacity),
      created_by: session.user.id
    };

    try {
      if (editingEventId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingEventId);
        if (error) throw error;
        setMessage('イベントを更新しました。');
      } else {
        const { error } = await supabase.from('events').insert(payload);
        if (error) throw error;
        setMessage('イベントを作成しました。');
      }

      setEventForm(EMPTY_EVENT);
      setEditingEventId(null);
      await hydrateApp(session.user);
    } catch (error) {
      setMessage(error.message || 'イベント保存に失敗しました。');
    } finally {
      setSavingEvent(false);
    }
  }

  function handleEditEvent(event) {
    setEditingEventId(event.id);
    setEventForm({
      title: event.title,
      description: event.description ?? '',
      venue: event.venue ?? '',
      starts_at: toLocalDateTimeInput(event.starts_at),
      capacity: event.capacity
    });
    setActiveTab('admin');
  }

  function cancelEditingEvent() {
    setEditingEventId(null);
    setEventForm(EMPTY_EVENT);
  }

  async function handleDeleteEvent(eventId) {
    const ok = window.confirm('このイベントを削除しますか？');
    if (!ok) return;

    try {
      const { error } = await supabase.from('events').delete().eq('id', eventId);
      if (error) throw error;
      if (selectedEvent?.id === eventId) setSelectedEvent(null);
      setMessage('イベントを削除しました。');
      await hydrateApp(session.user);
    } catch (error) {
      setMessage(error.message || 'イベント削除に失敗しました。');
    }
  }

  async function handleRegister(eventId) {
    try {
      const { error } = await supabase.rpc('register_for_event', { p_event_id: eventId });
      if (error) throw error;
      setMessage('イベントに参加登録しました。');
      await hydrateApp(session.user);
    } catch (error) {
      setMessage(error.message || '参加登録に失敗しました。');
    }
  }

  async function handleCancel(eventId) {
    try {
      const { error } = await supabase.rpc('cancel_registration', { p_event_id: eventId });
      if (error) throw error;
      setMessage('参加を取り消しました。');
      await hydrateApp(session.user);
    } catch (error) {
      setMessage(error.message || '参加取消に失敗しました。');
    }
  }

  if (!supabaseConfigured) {
    return <SetupScreen />;
  }

  if (authLoading) {
    return (
      <AppShell>
        <div className="card narrow">
          <h1>読み込み中...</h1>
        </div>
      </AppShell>
    );
  }

  if (!session?.user) {
    return (
      <AuthScreen
        authMode={authMode}
        setAuthMode={setAuthMode}
        authForm={authForm}
        setAuthForm={setAuthForm}
        onSignIn={handleSignIn}
        onSignUp={handleSignUp}
        authMessage={authMessage}
        loading={authLoading}
      />
    );
  }

  return (
    <AppShell>
      <Header profile={profile} session={session} activeTab={activeTab} setActiveTab={setActiveTab} onSignOut={handleSignOut} />

      {message ? <div className="notice">{message}</div> : null}

      <section className="toolbar card">
        <label className="search-box">
          <span>検索</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="タイトル・説明・会場で検索" />
        </label>
        <div className="muted small">イベント {events.length} 件 / 参加中 {myRegistrations.length} 件</div>
      </section>

      <div className="layout-grid">
        <main className="main-column">
          {activeTab === 'events' ? (
            <section className="card">
              <div className="section-header">
                <div>
                  <h2>イベント一覧</h2>
                  <p className="muted">Supabase DB に保存されたイベントを表示しています。</p>
                </div>
              </div>

              {dataLoading ? <p>読み込み中...</p> : null}

              {!dataLoading && filteredEvents.length === 0 ? (
                <p className="muted">イベントがありません。管理者でログインして作成してください。</p>
              ) : null}

              <div className="event-list">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    registrationCount={statsMap[event.id] ?? 0}
                    isRegistered={myEventIds.has(event.id)}
                    canEdit={profile?.role === 'admin'}
                    onSelect={setSelectedEvent}
                    onRegister={handleRegister}
                    onCancel={handleCancel}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'my-events' ? (
            <section className="card">
              <div className="section-header">
                <div>
                  <h2>マイイベント</h2>
                  <p className="muted">あなたが参加登録したイベントです。</p>
                </div>
              </div>

              {myEvents.length === 0 ? <p className="muted">まだ参加中のイベントはありません。</p> : null}

              <div className="event-list">
                {myEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    registrationCount={statsMap[event.id] ?? 0}
                    isRegistered={true}
                    canEdit={false}
                    onSelect={setSelectedEvent}
                    onRegister={handleRegister}
                    onCancel={handleCancel}
                    onEdit={handleEditEvent}
                    onDelete={handleDeleteEvent}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {activeTab === 'admin' && profile?.role === 'admin' ? (
            <>
              <EventForm
                eventForm={eventForm}
                setEventForm={setEventForm}
                editingEventId={editingEventId}
                onSubmit={handleSaveEvent}
                onCancel={cancelEditingEvent}
                loading={savingEvent}
              />

              <section className="card">
                <div className="section-header">
                  <div>
                    <h2>管理対象イベント</h2>
                    <p className="muted">作成・編集・削除の対象一覧です。</p>
                  </div>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>タイトル</th>
                        <th>開催日時</th>
                        <th>会場</th>
                        <th>参加数</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.id}>
                          <td>{event.title}</td>
                          <td>{formatDateTime(event.starts_at)}</td>
                          <td>{event.venue}</td>
                          <td>
                            {statsMap[event.id] ?? 0} / {event.capacity}
                          </td>
                          <td>
                            <div className="actions wrap">
                              <button onClick={() => handleEditEvent(event)}>編集</button>
                              <button className="danger-outline" onClick={() => handleDeleteEvent(event.id)}>
                                削除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          ) : null}
        </main>

        <aside className="side-column">
          <EventDetail
            event={selectedEvent}
            registrationCount={selectedEvent ? statsMap[selectedEvent.id] ?? 0 : 0}
            isRegistered={selectedEvent ? myEventIds.has(selectedEvent.id) : false}
            canEdit={profile?.role === 'admin'}
            onClose={() => setSelectedEvent(null)}
            onRegister={handleRegister}
            onCancel={handleCancel}
          />

          <section className="card info-panel">
            <h2>現在のセッション</h2>
            <ul>
              <li>ユーザーID: {session.user.id}</li>
              <li>メール: {session.user.email}</li>
              <li>ロール: {profile?.role ?? '読み込み中'}</li>
            </ul>
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
