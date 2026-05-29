# 開発ガイド — StayStocked

## 1. 開発環境のセットアップ

### 前提条件

- 現代的なブラウザ（Chrome / Firefox / Safari 最新版）
- （任意）Node.js: 静的ファイルサーバー用

### 起動方法

```bash
# Python を使う場合
python3 -m http.server 8080
# → http://localhost:8080 をブラウザで開く

# Node.js の場合
npx serve .
# または
npx http-server -p 8080
```

> `file://` プロトコルでの直接起動は ES モジュールの CORS 制約で動作しない。
> 必ず HTTP サーバー経由でアクセスすること。

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

### 2.3 HTML インジェクション防止

ユーザー入力値を innerHTML に埋め込む場合は必ずエスケープすること。

```js
// NG: XSS の危険性あり
el.innerHTML = `<span>${userInput}</span>`;

// OK: テキストノードで設定
el.textContent = userInput;

// OK: エスケープ関数を使う
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
el.innerHTML = `<span>${escHtml(userInput)}</span>`;
```

現状は `productName`・`itemName` が innerHTML に直接埋め込まれており、要修正。

### 2.4 CSS

- カラー・スペーシング等の値はできるだけ `css/style.css` の `:root` CSS 変数を使う
- コンポーネント固有のスタイルは `css/additions.css` に追記する
- クラス名は BEM 記法（`block__element--modifier`）に準拠する

---

## 3. 新しいページの追加手順

1. `js/pages/` にファイルを作成し `{ template(), init() }` を export する
2. `js/main.js` で import してルーターに登録する
3. `js/router.js` の `PAGE_TITLES` にタイトルを追加する
4. （必要に応じて）`index.html` のボトムナビにリンクを追加する

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
  name: '表示名',            // ユーザーに見える品目名
  category: 'カテゴリ名',   // CATEGORIES 配列に自動追加される
  unit: '単位',
  target: '対象者バッジ',   // バッジ表示文字列（例：'全員', '乳幼児'）
  calc: (p, d) => ...,      // 必要量を返す。p = CalcParams, d = stockpileDays
  isNeeded: p => ...        // この品目を表示するか
}
```

**calc の注意点**:
- `d` が 0 のケースを考慮する（`d` が必ず 3/7/14 であっても防御的に書く）
- 整数でない場合は `Math.ceil()` で切り上げる

---

## 5. データスキーマの変更手順

`storage.js` の `DEFAULTS` にフィールドを追加した場合、既存データとのマージが `storage.get()` で自動的に行われる（スプレッド構文によるマージ）。

**ネストしたオブジェクトのマージは手動で行う必要がある**:

```js
// storage.js の get() 内
return {
  ...DEFAULTS,
  ...saved,
  settings: { ...DEFAULTS.settings, ...(saved.settings ?? {}) },
  // 新しいネストオブジェクトを追加した場合はここに追記
  newNestedField: { ...DEFAULTS.newNestedField, ...(saved.newNestedField ?? {}) }
};
```

---

## 6. よくある問題と対処法

### ページ遷移後にイベントが効かない

- 原因: `init()` が呼ばれるたびに同じ要素に `addEventListener` が重複登録されている
- 対処: `init()` は毎回 DOM を新規生成するため基本的に問題ないが、`stockPage.render()` のように `init()` 外から再描画する場合は既存リスナーの除去または `{ once: true }` の活用を検討する

### localStorage の容量不足

- `localStorage` は通常 5MB の制限がある
- 消費期限画像など大きなデータは保存しないこと

### ES モジュールのキャッシュ

- ブラウザは ES モジュールを積極的にキャッシュする
- 開発中は `Ctrl+Shift+R`（強制リロード）を使う

---

## 7. 修正履歴の管理

変更は必ず git でコミットし、以下の形式のコミットメッセージを使う。

```
<type>: <概要>

<詳細（任意）>
```

| type | 用途 |
|---|---|
| `fix` | バグ修正 |
| `feat` | 新機能追加 |
| `refactor` | 機能変更なしのコード改善 |
| `docs` | ドキュメントのみの変更 |
| `data` | マスターデータ・計算ロジックの変更 |
