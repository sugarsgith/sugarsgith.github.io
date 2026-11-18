# ファイルマップ

スロットセンスはビルド無しの静的サイトです。GitHub Pages がリポジトリの `main` ブランチのルートを、そのまま <https://sugarsgith.github.io> で配信します。ルートに `.nojekyll` があるので、Jekyll は通りません。

## 配信されるファイル

| パス | 役割 |
| --- | --- |
| `index.html` | メニュー。`a.m` のカードが各ツールへの入口 |
| `lycoris/index.html` | スマスロ リコリス・リコイル |
| `enen2/index.html` | L炎炎ノ消防隊2 |
| `umineko2/index.html` | Lうみねこのなく頃に2 |
| `magireco/index.html` | スマスロ マギアレコード |
| `bofuri/index.html` | スマスロ防振り |
| `otome5/index.html` | L戦国乙女5 |
| `sao2/index.html` | Lソードアート・オンラインⅡ |
| `hyena/index.html` | ハイエナ判定（天井・ゾーン）。リコリス、炎炎2、マギレコ |
| `history/index.html` | 終了保存した台の一覧、コピー、JSON の書き出しと取り込み |
| `topbar.js` | ページ先頭ステータス。`window.SSTop` |
| `topbar.css` | その見た目。ヘッダーを sticky にする |
| `sw.js` | SLOTSENSE の Service Worker。スコープ `/`。キャッシュ `slotsense-v7` |
| `manifest.webmanifest` | 名前 SLOTSENSE、`start_url` `/` |
| `icons/` | 192 / 512 / maskable / apple-touch-icon |
| `docs/` | この保守メモ。メニューには出さない |
| `AGENTS.md` | AI 向けのルール |
| `scripts/check-site.js` | リンクと JS 構文のチェック。サイトの動作には使わない |
| `taicho/` | 別 PWA「体調ログ」。スロットのメニューには無い |
| `muse-usage.json` | コミットメッセージ上は Scriptable ウィジェット用。メニューからも機種ページからもリンクしていない |

`muse-usage.json` はリポジトリのルートにあるため、Pages 上では URL を知っていれば読めます。中身の更新元は、このドキュメントの作成時にはコードから追えていません。スロットの機能ではないので、機種追加のついでに消さないでください。

## ページが共有しているもの

計算式と機種データは、各 `index.html` の中だけにあります。共通の JS モジュールはありません。

共有しているのは次です。

1. **見た目の先頭ステータス** … 機種ページとハイエナが `../topbar.css` と `../topbar.js` を読む。履歴ページとメニューは読まない。
2. **Service Worker** … メニューと機種ページと履歴は `/sw.js` を登録する。体調ログだけ `/taicho/sw.js` を登録する。
3. **終了保存** … キー `slotsense:sessions:v1`。書くのは各機種、一覧にするのは `history/index.html`。
4. **PWA の皮** … マニフェスト、アイコン、theme-color、ホーム画面用の meta。機種ページはルートのマニフェストを指す。

`topbar.js` の入口は 3 つです。

- `SSTop.render` … SAO2、防振り、戦国乙女5。ヘッダーへ `#ssEstimate` を足す。
- `SSTop.legacy` … リコリス、炎炎2、うみねこ2、マギアレコード。既存の `#hlbar` をクリックで `#est` に飛ばす。
- `SSTop.hyena` … ハイエナ。`#ssHyena` を `#chk` に飛ばす。

ハイエナの判定ロジックは、同じ HTML 内の先の `<script>` で `HY` を作り、`module.exports` に載せられるようにしてあります。テストランナーはリポジトリにありません。SAO2 は `window.sao2Test`、防振りは `window.bofuriTest`、戦国乙女5は `window.otome5Test` を、ブラウザで読めるように置いてあります。これらも自動テストにはつながっていません。

## 機種ページの世代

コピー元を間違えると、先頭バーや保存形式が揃いません。

**古い型（ページ内に高低バーと出典テーブルを描く）**

- リコリス。`MACHINES` 配列が残っているが、中身はリコリスだけ。選択 UI もリコリスだけ。
- 炎炎2、うみねこ2、マギアレコード。構成が近い（台・G 数、推測、示唆、⚙の重み、出典）。うみねこ2とマギアレコードは設定差カウンターがある。
- 先頭は `SSTop.legacy`。推測のバー本体は各ファイルの `hlBlock`。

**新しい型（`SSTop.render`）**

- 防振り、戦国乙女5、SAO2。1 ファイルに CSS と状態と `estimate` をまとめ、数字のみ / 示唆込みを並べる。
- 防振りと戦国乙女5の CSS は、古い型のスタイルを大きくコピーしたあと、末尾で幅 600px などに上書きしている。共通 CSS ファイルには切り出していない。
- リコリスの `estimate` は、機種データを第 1 引数に取り、各設定の百分率（合計 100）の配列を返す。表示の直前で `fr` が 0〜1 に戻す。炎炎2・うみねこ2・マギアレコード・新しい型は、0〜1 の `post` 配列を返す。呼び出し方を混ぜない。

**ハイエナ**

- 設定の確率ではなく、狙い目ラインと天井までの距離、投資の目安、閉店までに届くか。
- 機種はコード内の `HY.M`（`lyco` と `enen`）と、pt 管理の `MR`（マギレコ）。

新しい機種は新しい型でフォルダを増やします。古い型のファイルを、見た目を揃える目的だけで `render` に置き換えないでください。

## メニューとキャッシュと履歴の対応

機種を 1 つ足すと、次の 3 箇所が揃っている必要があります。`scripts/check-site.js` がここを見ます。

1. `index.html` の `a.m`（`href` は `短縮名/`）
2. `sw.js` の `PRECACHE`（`/短縮名/`）
3. 設定推測の機種なら `history/index.html` の `MACHINE_TITLES`

ハイエナは 1 と 2 だけです。履歴の機種名一覧には入れていません。履歴ページ自身はメニューと `PRECACHE` に入ります。

## 体調ログ（`/taicho/`）

スロットセンスとは別のアプリです。

- 画面は `taicho/index.html`。マニフェストの `start_url` は `/taicho/`、スコープも `/taicho/`。
- Service Worker は `taicho/sw.js`、キャッシュ名 `taicho-v1`（ドキュメント作成時点）。
- アイコンは `taicho/icons/`。SLOTSENSE の `icons/` とは別ファイルです。
- 保存キーは `taicho-log-v2`。旧 `taicho-log-v1` は `migrate` で v2 にしてから v2 へ書き出す。表示切替は `taicho-ov`。
- 読み込みに失敗したら `loadBlocked` で以後の保存を止め、書き出しで元の文字列を残す、という保護が入っています（コミット「Protect taicho records」）。

スロットのキャッシュバージョンを上げても、体調ログのキャッシュは消えません。体調ログを直したときだけ `taicho-vN` を上げます。
