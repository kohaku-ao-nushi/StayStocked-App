# 設計書 — StayStocked

## 1. アーキテクチャ概要

### 1.1 構成方針

- **フレームワークなし**。バンドラーなし。ES モジュール（`type="module"`）を直接ブラウザで実行する
- **ハッシュルーティング**（`#home`, `#stock` 等）によるSPA
- **データ永続化**は `localStorage` のみ。外部依存ゼロ

### 1.2 ディレクトリ構成

```
StayStocked-App/
├── index.html              # エントリーポイント。HTML 骨格のみ
├── css/
│   ├── style.css           # ベーススタイル・CSS変数
│   └── additions.css       # 追加スタイル・上書き
├── js/
│   ├── main.js             # アプリ起動・ページ登録
│   ├── router.js           # ハッシュルーター
│   ├── storage.js          # localStorage ラッパー
│   ├── masterData.js       # 備蓄品マスター・計算ロジック
│   ├── ui.js               # Toast / Confirm UI コンポーネント
│   └── pages/
│       ├── home.js         # ホーム画面
│       ├── lifestyle.js    # くらし方設定
│       ├── stock.js        # 備蓄リスト
│       ├── register.js     # 備蓄品登録・編集
│       ├── settings.js     # 設定
│       └── customListEditor.js  # カスタム品目管理
├── icons/                  # アイコン画像
└── docs/                   # ドキュメント（このディレクトリ）
```

---

## 2. モジュール設計

### 2.1 Router（`router.js`）

ハッシュ変更を監視し、該当ページの `template()` → `init()` を順番に呼ぶ。

```
hashchange
  └─ render()
       ├─ page.template() → #app-root.innerHTML に設定
       ├─ ヘッダータイトル更新
       ├─ ボトムナビのアクティブ状態更新
       └─ page.init()
```

**ページコントラクト**: すべてのページは `{ template(), init() }` を export する。
- `template()`: HTML文字列を返す。副作用なし
- `init()`: DOMへのイベント登録・データ取得・DOM更新を行う

### 2.2 Storage（`storage.js`）

`localStorage` の読み書きを一点集約。

```
storage.get()   → AppState（DEFAULTS とのマージ済み）
storage.save()  → JSON.stringify して localStorage に書き込む
storage.reset() → localStorage.removeItem
```

**AppState の型定義**:

```js
{
  profiles: [{ gender: '男性'|'女性', ageGroup: '乳幼児'|'子ども'|'成人'|'高齢者' }],
  pets: { count: number },
  stockItems: [{
    id: string,          // Date.now().toString()
    masterId: string|null,
    customId: string|null,
    itemName: string,
    category: string,
    productName: string,
    qty: number,
    unit: string,
    expiry: string       // ISO日付文字列 "YYYY-MM-DD"、未設定は ""
  }],
  settings: {
    stockpileDays: 3|7|14,
    noticeDays: { 3: number, 7: number, 14: number }
  },
  customMasterItems: [{
    id: string,          // "custom-" + Date.now()
    name: string,
    category: string,
    unit: string,
    dailyQty?: number    // 省略可能
  }]
}
```

### 2.3 MasterData（`masterData.js`）

備蓄品の定義と計算ロジックを保持する。

**`todoMasterList`**: 各品目の定義オブジェクトの配列

```js
{
  id: string,
  name: string,
  category: string,
  unit: string,
  target: string,                        // バッジ表示用
  calc: (params, days) => number,        // 必要量を計算
  isNeeded: (params) => boolean          // この品目が必要か
}
```

**`buildCalcParams(data)`**: `storage.get()` の戻り値を計算パラメータに変換する。

```js
// 戻り値
{
  adults: number,          // 成人（高齢者を含む）
  children: number,        // 子ども（3〜17歳）
  infants: number,         // 乳幼児（0〜2歳）
  elderly: number,         // 高齢者（65歳以上）
  females: number,         // 全年齢の女性
  females_menstrual: number, // 月経対象年齢（12歳以上65歳未満）の女性
  totalPeople: number,
  pets: number
}
```

**`getCombinedMasterList(customItems)`**: デフォルトマスターとカスタム品目を結合して返す。

### 2.4 UI（`ui.js`）

- `showToast(message, type)`: 2.5秒後に自動消去するトースト通知
- `showConfirm(message, options)`: `Promise<boolean>` を返す確認ダイアログ

### 2.5 ページ間のデータ受け渡し

`sessionStorage` でページ間コンテキストを渡す。

| キー | 型 | 用途 |
|---|---|---|
| `newItemFromTodo` | JSON | stock → register: `{ masterId, name, unit }` |
| `editItemId` | string | stock → register: 編集対象の stockItem.id |

---

## 3. データフロー

```
[くらし方設定] → storage.save(profiles, pets)
                        ↓
[備蓄リスト]   → storage.get()
               → buildCalcParams(data)   → CalcParams
               → getCombinedMasterList() → MasterList
               → item.calc(params, days) → 必要量
               → stockById 集計          → 現在量
               → 達成率 = 現在量 / 必要量
```

---

## 4. 備蓄量計算ロジック

### 4.1 CalcParams の生成規則

`buildCalcParams(data)` が `data.profiles` を走査して以下を生成する。

| パラメータ | 計算方法 |
|---|---|
| `infants` | `ageGroup === '乳幼児'` の人数 |
| `children` | `ageGroup === '子ども'` の人数 |
| `adults` | `ageGroup === '成人'` の人数 ＋ `elderly` |
| `elderly` | `ageGroup === '高齢者'` の人数 |
| `females` | `gender === '女性'` の全員 |
| `females_menstrual` | `gender === '女性'` かつ `ageGroup` が `'子ども'`（12歳以上の代理）または `'成人'` の人数 |
| `totalPeople` | `profiles.length` |
| `pets` | `data.pets.count` |

> **設計注記 — 高齢者の adults への加算について**  
> 高齢者は `elderly` にカウントされるとともに `adults` にも加算する。
> これにより `staple_food`（成人・子ども向け主食）の `calc` が高齢者分を含める。
> 一方 `elderly_food`（おかゆ等）は高齢者の嗜好・咀嚼補助品であり、
> 主食の**代替**ではなく**追加**として計上する設計とする。
> ただし高齢者が全量おかゆに移行している場合はカスタム品目で対応する。

### 4.2 各品目の計算式

#### 食品・飲料

| 品目 | 計算式 | 根拠 |
|---|---|---|
| 水 | `totalPeople × 3 × days` L | 1人1日3L（内閣府基準） |
| 主食（レトルト等） | `(adults + children) × 3 × days` 食 | 1人1日3食 |
| 副食（缶詰等） | `Math.ceil((adults + children) × days × 1.5)` 食分 | 1食に0.5缶想定、シェアを考慮 |
| 粉ミルク・液体ミルク | `infants × days` 日分 | 乳幼児1人1日分 |
| おかゆ・介護食 | `elderly × 3 × days` 食 | 高齢者1人1日3食 |
| お菓子類 | `totalPeople × Math.ceil(days / 3)` 袋 | 3日に1袋（ストレス緩和用） |

#### 衛生用品

| 品目 | 計算式 | 根拠 |
|---|---|---|
| 携帯トイレ | `totalPeople × 5 × days` 回分 | 1人1日5回 |
| ティッシュ | `Math.ceil(days / 7) × 2` 箱 | 1週間に2箱 |
| トイレットペーパー | `Math.ceil(totalPeople × days / 10)` ロール | 10人日で1ロール |
| 除菌ウェットティッシュ | `totalPeople × Math.ceil(days / 3)` 個 | 3日に1パック |
| ウェットボディタオル | `totalPeople × days` 枚 | 1人1日1枚 |
| マスク | `totalPeople × days` 枚 | 1人1日1枚 |
| おむつ | `infants × days` 日分 | 乳幼児1人1日分 |
| 生理用品 | `females_menstrual × Math.ceil(days / 5) × 20` 個 | 月経周期30日中5日、1周期20枚 |
| アルコール消毒液 | `Math.ceil(totalPeople / 3)` 本 | 3人に1本（500ml想定） |
| ビニール手袋 | `totalPeople × 2` 枚 | 1人2枚（予備含む） |

#### 医療・医薬

| 品目 | 計算式 | 根拠 |
|---|---|---|
| 救急箱 | `1` 箱 | 世帯に1箱 |
| 常備薬・持病の薬 | `totalPeople × days` 日分 | 記録用（実際の量はユーザー管理） |
| 体温計 | `1` 本 | 世帯に1本 |

#### 生活用品

| 品目 | 計算式 | 根拠 |
|---|---|---|
| カセットコンロ | `1` 台 | 世帯に1台 |
| カセットボンベ | `Math.ceil(days × 1.34)` 本 | 1日1.34本（1本60分、1日80分調理） |
| 食品用ラップ | `1` 本 | 世帯に1本 |
| ポリ袋 | `1` 箱 | 世帯に1箱 |
| 懐中電灯・ランタン | `Math.ceil(totalPeople / 2)` 個 | 2人に1台（共有可） |
| ヘッドライト | `totalPeople` 個 | 1人1台（避難時の両手フリー） |
| 乾電池 | `1` セット | 世帯に1セット |
| 携帯充電器 | `totalPeople` 個 | 1人1台 |
| 防災ラジオ（手回し対応） | `1` 台 | 世帯に1台 |
| ガムテープ | `1` 個 | 世帯に1個 |
| 軍手 | `totalPeople` 双 | 1人1双 |

#### 防災装備

| 品目 | 計算式 | 根拠 |
|---|---|---|
| 防災頭巾・ヘルメット | `totalPeople` 個 | 1人1個 |
| ホイッスル | `totalPeople` 個 | 1人1個 |

#### 書類・現金

| 品目 | 計算式 | 根拠 |
|---|---|---|
| 重要書類コピー | `1` セット | 世帯に1セット（保険証・通帳等） |
| 現金・小銭 | `1` セット | 世帯に1セット（目安：1〜2万円） |

#### ペット用品

| 品目 | 計算式 | 根拠 |
|---|---|---|
| ペットフード | `pets × days` 日分 | ペット1頭1日分 |
| ペット用トイレ用品 | `pets × days` 日分 | ペット1頭1日分 |

---

## 5. カテゴリ構成

| カテゴリ | 含む品目 |
|---|---|
| 食品・飲料 | 水、主食、副食、粉ミルク、おかゆ、お菓子 |
| 衛生用品 | トイレ系、清潔保持用品、生理用品 |
| 医療・医薬 | 救急箱、常備薬、体温計 |
| 生活用品 | 調理・照明・情報収集・その他日用品 |
| 防災装備 | 頭部保護・救難信号用品 |
| 書類・現金 | 重要書類、現金 |
| ペット用品 | ペットフード、トイレ用品 |

---

## 6. UI 設計

### 6.1 ナビゲーション

- **ヘッダー**: ページタイトルを動的表示（Router が更新）
- **ボトムナビ**: ホーム / くらし方 / 備蓄リスト / 設定 の4タブ
- **グリッドメニュー**（ホームのみ）: 主要4ページへのショートカット

### 6.2 備蓄リスト

- `<details>` / `<summary>` でアコーディオン表示
- 期限切れ（赤）・期限間近（橙）の視覚フィードバック
- プログレスバーは3段階（赤 `is-low` / 橙 `is-medium` / 緑 `is-sufficient`）

### 6.3 フォームのアクセシビリティ

- `showConfirm` は `role="dialog"` `aria-modal="true"` を付与する
- ラジオボタンは `<label>` でラベルと関連付け、タップ領域を確保する

---

## 7. 既知の制約・将来の拡張ポイント

| 制約 | 将来の対応策 |
|---|---|
| `localStorage` はブラウザ・デバイスをまたいで共有できない | クラウド同期（Supabase等）の導入 |
| ペット種別を区別できない | `pets` を `[{ type, count }]` の配列に変更 |
| テストコードがない | Vitest + jsdom によるユニットテストの追加 |
| PWA 未対応 | manifest.json + Service Worker の実装 |
