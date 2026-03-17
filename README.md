# Event Manager B+ Supabase

React + Vite + Supabase で作る **B向け本格動的版** のイベント管理サイトです。

## できること
- メールアドレス + パスワードでサインアップ / ログイン
- 一般ユーザー / 管理者のロール制御
- イベント一覧 / 詳細 / 検索
- 管理者によるイベント作成 / 編集 / 削除
- 一般ユーザーによる参加登録 / 取消
- 定員超過防止
- 重複参加防止
- DB 永続化（Supabase Postgres）

## 1. Supabase 側の準備
1. Supabase で新規プロジェクトを作成
2. `supabase/schema.sql` を SQL Editor に丸ごと貼り付けて実行
3. `Authentication > Providers > Email` でメール認証を確認
   - 研修で素早く試すなら **Confirm Email を一時的に無効** にすると楽です
4. `Project Settings / API` から次を控える
   - Project URL
   - Publishable key

## 2. 環境変数
`.env.example` をコピーして `.env.local` を作成し、値を入れてください。

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```

## 3. 起動
```bash
npm install
npm run dev
```

## 4. 最初の管理者を作る
1. 画面から任意のメールアドレスで **新規登録**
2. SQL Editor で次を実行

```sql
select public.promote_user_to_admin('your-admin@example.com');
```

3. いったんログアウトして再ログイン
4. 「管理者メニュー」タブが表示されたら成功

## 5. 本番ビルド確認
```bash
npm run build
npm run preview
```

## 6. 画面とDBの対応
- 認証: Supabase Auth
- プロフィール / ロール: `public.profiles`
- イベント: `public.events`
- 参加情報: `public.registrations`
- 定員チェック / 重複参加防止: `register_for_event()` RPC

## 7. 研修で見るべきポイント
- フロントの見た目だけでなく、**認証 / RLS / RPC / DB 永続化**が入っていること
- `localStorage` ではなく、別端末からログインしても同じデータが見えること
- イベント作成、参加、取消が DB に反映されること

## 8. 補足
- このアプリはクライアントサイドの Vite アプリです
- 動的な本体は Supabase 側にあります
- 画面は静的ホスティング（Vercel / Netlify / GitHub Pages 相当）でも動かせますが、認証リダイレクト URL の設定は Supabase 側で必要です
