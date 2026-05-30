# 開発ガイド — クラソナ（Crasona）

> **最終更新**: 2026-05-31

## 1. 開発環境のセットアップ

### 前提条件

- 現代的なブラウザ（Chrome / Safari 最新版）
- Python3（静的ファイルサーバー用）

### 起動方法

```bash
# リポジトリのルートで実行
python3 -m http.server 8080
# → http://localhost:8080 をブラウザで開く
```

> `file://` プロトコルでの直接起動は ES モジュールの CORS 制約で動作しない。
> 必ず HTTP サーバー経由でアクセスすること。

### PWA のリロード方法

Service Worker がキャッシュを保持するため、コード変更後は以下のいずれかを行う:
1. `sw.js` の `CACHE_VERSION` を上げる（デプロイ時の正式手順）
2. ブラウザの DevTools → Application → Service Workers → 「Unregister」

---

## 2. コーディング規約

### 2.1 基本方針

- `'use strict';` をすべての JS ファイルの先頭に記述する
- ES2020 以降の構文（オプショナルチェーン `?.`、Null 合体 `??`）を使用可
- `var` は使用禁止。`const` を基本とし、再代入が必要な場合のみ `let`
- `alert()` / `confirm()` は使用禁止。`showToast()` / `showConfirm()` を使う

### 2.2 ページモジュールのルール

- `template()` の中にイベントリスナーを登録しない（DOM がまだ存在しないため）
- `init()` の中でテンプレート文字列（HTML）を書かない
- ページ内部でしか使わないヘルパーは `_` プレフィックスを付けたメソッドにする
- `storage.get()` を複数箇所で呼ばない。関数の冒頭で一度取得してローカル変数に保持する
- 再描画が必要な場合は AbortController でイベントリスナーを管理し、スタックを防ぐ

```js
// AbortController パターン（stock.js が参考実装）
_listAbort = null;

render() {
  this._listAbort?.abort();
  this._listAbort = new AbortController();
  const { signal } = this._listAbort;
  el.addEventListener('click', handler, { signal });
}
```

### 2.3 HTML インジェクション防止

ユーザー入力値を innerHTML に埋め込む場合は必ずエスケープすること。

```js
// NG: XSS の危険性あり
el.innerHTML = `<span>${userInput}</span>`;

// OK: エスケープ関数を使う
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
el.innerHTML = `<span>${escHtml(userInput)}</span>`;
```

### 2.4 数値入力

`type="number"` のフィールドでは `handleNumberInput` が自動的に適用される（`main.js` でグローバル委譲）。
- 全角数字は半角に変換
- 数値以外は `.input-error` クラスを付与（赤いボーダー）

### 2.5 CSS

- カラー・スペーシング等の値はできるだけ `css/style.css` の `:root` CSS 変数を使う
- コンポーネント固有のスタイルは `css/additions.css` に追記する
- クラス名は BEM 記法（`block__element--modifier`）に準拠する

---

## 3. 新しいページの追加手順

1. `js/pages/` にファイルを作成し `{ template(), init() }` を export する
2. `js/main.js` で import してルーターに登録する
3. `js/router.js` の `PAGE_TITLES` にタイトルを追加する
4. `sw.js` の `APP_SHELL` にファイルパスを追加し `CACHE_VERSION` を上げる
5. （必要に応じて）`index.html` のボトムナビにリンクを追加する

```js
// js/pages/newPage.js
'use strict';
import { storage } from '../storage.js';

export const newPage = {
  template() {
    return `<div class="form-section">...</div>`;
  },
  init() {
    const data = storage.get();
    // DOM 操作・イベント登録
  }
};
```

---

## 4. マスターリストへの品目追加手順

`js/masterData.js` の `todoMasterList` 配列にオブジェクトを追加する。

```js
{
  id: 'unique_id',           // 既存 ID と重複しない英数字スネークケース
  name: '表示名',
  category: 'カテゴリ名',
  unit: '単位',
  target: '対象者バッジ',   // 例：'全員', '乳幼児', '女性'
  note: '補足説明テキスト', // アコーディオン内に表示
  calc: (p, d) => ...,      // 必要量を返す。p = CalcParams, d = stockpileDays
  isNeeded: p => ...        // この品目を表示するか
}
```

**calc の注意点**:
- 整数でない場合は `Math.ceil()` で切り上げる
- `isNeeded` が false の場合 `calc` は呼ばれないが、防御的に記述する

---

## 5. データスキーマの変更手順

`storage.js` の `DEFAULTS` にフィールドを追加した場合、既存データとのマージが `storage.get()` で自動的に行われる。

**ネストしたオブジェクトのマージは手動で追加が必要**:

```js
// storage.js の get() 内
return {
  ...DEFAULTS,
  ...saved,
  settings:   { ...DEFAULTS.settings,   ...(saved.settings   ?? {}) },
  onboarding: { ...DEFAULTS.onboarding, ...(saved.onboarding ?? {}) },
  // 新しいネストオブジェクトを追加した場合はここに追記
};
```

詳細は `docs/data-model.md` を参照。

---

## 6. デプロイ手順

```bash
# 変更をコミット
git add <files>
git commit -m "feat: 変更内容"

# Vercel に自動デプロイ
git push origin main
# → https://stay-stocked-app.vercel.app に自動反映（数分）
```

**PWA キャッシュの更新が必要な場合**（ファイル追加・大きな変更時）:
1. `sw.js` の `CACHE_VERSION` を上げる（例: `v5` → `v6`）
2. `APP_SHELL` に新しいファイルパスを追加する
3. コミット・プッシュ

---

## 7. よくある問題と対処法

### ページ遷移後にイベントが効かない

- 原因: `init()` が呼ばれるたびに同じ要素に `addEventListener` が重複登録されている
- 対処: AbortController パターンを使う（`stock.js` 参照）

### スワイプ操作が effect しない

- 原因: `<summary>` 内のボタンクリックがキャプチャフェーズで止まっている
- 対処: スワイプボタンは `<summary>` の外の `.stock-item-wrap` に配置する

### フィルタ入力中にフォーカスが外れる

- 原因: キーワード変更のたびにフィルタバーを DOM ごと再生成している
- 対処: `_filterReady` フラグでフィルタバーの再レンダリングをスキップする

### localStorage の容量不足

- `localStorage` は通常 5MB の制限がある
- 画像など大きなデータは保存しないこと

### ES モジュールのキャッシュ

- 開発中は `Ctrl+Shift+R`（強制リロード）を使う

---

## 8. コミットメッセージ規則

```
<type>: <概要（英語）>
```

| type | 用途 |
|---|---|
| `feat` | 新機能追加 |
| `fix` | バグ修正 |
| `refactor` | 機能変更なしのコード改善 |
| `docs` | ドキュメントのみの変更 |
| `data` | マスターデータ・計算ロジックの変更 |
| `rebrand` | ブランド名・表記の変更 |
| `style` | CSSのみの変更 |
