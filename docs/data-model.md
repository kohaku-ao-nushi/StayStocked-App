# データモデル定義書 — クラソナ（Crasona）

> **最終更新**: 2026-05-31
> ストレージキー: `StayStockedApp`（localStorage）

---

## AppState（全体構造）

```ts
{
  profiles:          Profile[],
  pets:              PetsData,
  stockItems:        StockItem[],
  consumptionLog:    ConsumptionLog[],
  settings:          Settings,
  customMasterItems: CustomMasterItem[],
  onboarding:        OnboardingState
}
```

---

## Profile

家族構成員1人分の情報。

```ts
{
  gender:   '男性' | '女性',
  ageGroup: '乳幼児' | '子ども' | '成人' | '高齢者'
}
```

| フィールド | 型 | 説明 |
|---|---|---|
| gender | string | 性別（生理用品計算に使用） |
| ageGroup | string | 年代区分（備蓄量計算に使用） |

---

## PetsData

ペット情報。

```ts
{
  count:   number,          // 後方互換用の頭数合計（非推奨）
  entries: PetEntry[]       // ペット種別ごとのエントリ
}

PetEntry {
  type:  string,    // ペット種別（例：「犬」「猫」「小動物」）
  unit:  string,    // 数え方（例：「匹」「羽」「頭」）
  count: number     // 頭数
}
```

---

## StockItem

登録された備蓄品1件分。

```ts
{
  id:          string,       // Date.now().toString()
  masterId:    string | null, // todoMasterList の id（マスター品目の場合）
  customId:    string | null, // customMasterItems の id（カスタム品目の場合）
  itemName:    string,       // 品目名（マスター品目の場合はマスターの name）
  category:    string,       // カテゴリ名
  productName: string,       // 商品名（ブランド名等、ユーザーが入力）
  qty:         number,       // 現在の数量
  unit:        string,       // 単位
  expiry:      string        // 消費期限 "YYYY-MM-DD"、未設定は ""
}
```

**注意**: `masterId` と `customId` はどちらか一方のみ設定される。
どちらも null の場合は旧形式の自由登録品目（現在は廃止）。

---

## ConsumptionLog

「使った」操作の履歴1件分。

```ts
{
  id:       string,   // "log_" + Date.now()
  stockId:  string,   // 対象 StockItem の id
  masterId: string,   // 品目の masterId または customId
  itemName: string,   // 品目名（記録時点）
  usedQty:  number,   // 使用した数量
  unit:     string,   // 単位
  date:     string    // "YYYY-MM-DD"（記録日）
}
```

---

## Settings

アプリ設定。

```ts
{
  stockpileDays:    3 | 7 | 14,          // 備蓄期間モード
  noticeDays:       { 3: number, 7: number, 14: number },  // 各モードの期限アラート日数
  nextCheckDate:    string | null,        // 次回棚卸し予定日 "YYYY-MM-DD"
  checkIntervalDays: number,             // 棚卸しリマインダー間隔（日）デフォルト30
  stockLevel:       'starter' | 'full',  // 備蓄モード
  hiddenMasterIds:  string[]             // 非表示品目IDの配列
}
```

**デフォルト値**:

| フィールド | デフォルト |
|---|---|
| stockpileDays | 3 |
| noticeDays | `{ 3: 7, 7: 14, 14: 30 }` |
| nextCheckDate | null |
| checkIntervalDays | 30 |
| stockLevel | 'starter' |
| hiddenMasterIds | [] |

---

## CustomMasterItem

ユーザーが追加したカスタム品目の定義。

```ts
{
  id:       string,         // "custom-" + Date.now()
  name:     string,         // 品目名
  category: string,         // カテゴリ名
  unit:     string,         // 単位
  dailyQty: number | null   // 1人1日あたりの目標量（null = 自由登録・目標量なし）
}
```

---

## OnboardingState

オンボーディングの完了フラグ。

```ts
{
  completed: boolean   // false = 未完了（初回起動時にオンボーディングを表示）
}
```

---

## スキーマ変更のルール

1. `storage.js` の `DEFAULTS` に新フィールドを追加する
2. ネストしたオブジェクトは `storage.get()` の return 文にマージ処理を追加する
3. 既存データとの後方互換を維持する（`?? defaultValue` パターンを使う）

```js
// storage.get() 内のマージパターン
return {
  ...DEFAULTS,
  ...saved,
  settings:   { ...DEFAULTS.settings,   ...(saved.settings   ?? {}) },
  onboarding: { ...DEFAULTS.onboarding, ...(saved.onboarding ?? {}) },
  // 新しいネストオブジェクトを追加した場合はここに追記
};
```
