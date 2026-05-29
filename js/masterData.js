'use strict';
/**
 * masterData.js — 備蓄品マスターリストと計算ロジック
 *
 * todoMasterList の各アイテムの構造：
 *   id        : アイテムを一意に識別する文字列
 *   name      : 表示名
 *   category  : カテゴリ名（カテゴリ別表示に使う）
 *   unit      : 単位
 *   target    : 対象者（バッジ表示用）
 *   calc(p, days) : 必要量を計算する関数。p = buildCalcParams() の戻り値
 *   isNeeded(p)   : この品目が必要かどうか（乳幼児がいない家庭では粉ミルクを非表示など）
 *
 * 計算根拠は docs/design.md セクション4.2 を参照。
 */
export const todoMasterList = [
  // ── 食品・飲料 ──────────────────────────────────────────────────────
  { id: 'water',        name: '水',                    category: '食品・飲料', unit: 'L',    target: '全員',
    calc: (p, d) => p.totalPeople * 3 * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'staple_food',  name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食',   target: '成人・子ども',
    calc: (p, d) => (p.adults + p.children) * 3 * d,
    isNeeded: p => (p.adults + p.children) > 0 },

  // 缶詰は食事ごとに1人1缶ではなくシェアを前提に1.5食分/人/日で算出
  { id: 'side_dish',    name: '缶詰・レトルト食品',    category: '食品・飲料', unit: '食分', target: '成人・子ども',
    calc: (p, d) => Math.ceil((p.adults + p.children) * d * 1.5),
    isNeeded: p => (p.adults + p.children) > 0 },

  { id: 'baby_food',    name: '粉ミルク・液体ミルク',  category: '食品・飲料', unit: '日分', target: '乳幼児',
    calc: (p, d) => p.infants * d,
    isNeeded: p => p.infants > 0 },

  { id: 'elderly_food', name: 'おかゆ・介護食',        category: '食品・飲料', unit: '食',   target: '高齢者',
    calc: (p, d) => p.elderly * 3 * d,
    isNeeded: p => p.elderly > 0 },

  { id: 'sweets',       name: 'お菓子・嗜好品',        category: '食品・飲料', unit: '袋',   target: '全員',
    calc: (p, d) => p.totalPeople * Math.ceil(d / 3),
    isNeeded: p => p.totalPeople > 0 },

  // ── 衛生用品 ──────────────────────────────────────────────────────
  { id: 'portable_toilet', name: '携帯トイレ・簡易トイレ', category: '衛生用品', unit: '回分', target: '全員',
    calc: (p, d) => p.totalPeople * 5 * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'tissue',          name: 'ティッシュペーパー',     category: '衛生用品', unit: '箱',   target: '全員',
    calc: (p, d) => Math.ceil(d / 7) * 2,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'toilet_paper',    name: 'トイレットペーパー',     category: '衛生用品', unit: 'ロール', target: '全員',
    calc: (p, d) => Math.ceil(p.totalPeople * d / 10),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'wet_tissue',      name: '除菌ウェットティッシュ', category: '衛生用品', unit: '個',   target: '全員',
    calc: (p, d) => p.totalPeople * Math.ceil(d / 3),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'wet_body_towel',  name: 'ウェットボディタオル',   category: '衛生用品', unit: '枚',   target: '全員',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'mask',            name: 'マスク',                 category: '衛生用品', unit: '枚',   target: '全員',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'diapers',         name: 'おむつ',                 category: '衛生用品', unit: '日分', target: '乳幼児',
    calc: (p, d) => p.infants * d,
    isNeeded: p => p.infants > 0 },

  // 月経対象年齢（子ども女性・成人女性）のみ。月経周期30日中5日、1周期20枚で算出。
  { id: 'sanitary_pads',   name: '生理用品',               category: '衛生用品', unit: '個',   target: '女性',
    calc: (p, d) => p.females_menstrual * Math.ceil(d / 5) * 20,
    isNeeded: p => p.females_menstrual > 0 },

  { id: 'alcohol_disinfectant', name: 'アルコール消毒液',  category: '衛生用品', unit: '本',   target: '全員',
    calc: p => Math.max(1, Math.ceil(p.totalPeople / 3)),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'vinyl_gloves',    name: 'ビニール手袋',            category: '衛生用品', unit: '枚',   target: '全員',
    calc: p => p.totalPeople * 2,
    isNeeded: p => p.totalPeople > 0 },

  // ── 医療・医薬 ──────────────────────────────────────────────────────
  { id: 'first_aid_kit',   name: '救急箱',                  category: '医療・医薬', unit: '箱',   target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // 常備薬は記録用として日分で計上（実際の種類・数量はユーザー管理）
  { id: 'regular_medicine', name: '常備薬・持病の薬',       category: '医療・医薬', unit: '日分', target: '全員',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'thermometer',      name: '体温計',                  category: '医療・医薬', unit: '本',   target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ── 生活用品 ──────────────────────────────────────────────────────
  { id: 'cassette_stove',   name: 'カセットコンロ',          category: '生活用品', unit: '台',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // 1本60分使用。1日2回の調理（計80分）で1.34本/日
  { id: 'cassette_gas',     name: 'カセットボンベ',          category: '生活用品', unit: '本',    target: '全員',
    calc: (p, d) => Math.ceil(d * 1.34),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'food_wrap',        name: '食品用ラップ',             category: '生活用品', unit: '本',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'poly_bag',         name: 'ポリ袋',                  category: '生活用品', unit: '箱',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ランタンは2人に1台（共有できる据え置き型）
  { id: 'flashlight',       name: '懐中電灯・ランタン',       category: '生活用品', unit: '個',    target: '全員',
    calc: p => Math.max(1, Math.ceil(p.totalPeople / 2)),
    isNeeded: p => p.totalPeople > 0 },

  // ヘッドライトは1人1台（避難移動時に両手が使えるよう全員分）
  { id: 'headlight',        name: 'ヘッドライト',             category: '生活用品', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'batteries',        name: '乾電池',                  category: '生活用品', unit: 'セット', target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'mobile_battery',   name: '携帯充電器',               category: '生活用品', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // 停電時の情報収集に必須。手回し・ソーラー対応のものを推奨
  { id: 'disaster_radio',   name: '防災ラジオ（手回し対応）', category: '生活用品', unit: '台',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'duct_tape',        name: 'ガムテープ',               category: '生活用品', unit: '個',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'work_gloves',      name: '軍手',                    category: '生活用品', unit: '双',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // ── 防災装備 ──────────────────────────────────────────────────────
  { id: 'helmet',           name: '防災頭巾・ヘルメット',      category: '防災装備', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'whistle',          name: 'ホイッスル',               category: '防災装備', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // ── 書類・現金 ──────────────────────────────────────────────────────
  // 数量1は「準備済みか否か」の確認用。実際の内容はユーザー管理。
  { id: 'important_docs',   name: '重要書類のコピー',          category: '書類・現金', unit: 'セット', target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'cash',             name: '現金・小銭',               category: '書類・現金', unit: 'セット', target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ── ペット用品 ──────────────────────────────────────────────────────
  { id: 'pet_food',         name: 'ペットフード',             category: 'ペット用品', unit: '日分', target: 'ペット',
    calc: (p, d) => p.pets * d,
    isNeeded: p => p.pets > 0 },

  { id: 'pet_toilet',       name: 'ペット用トイレ用品',        category: 'ペット用品', unit: '日分', target: 'ペット',
    calc: (p, d) => p.pets * d,
    isNeeded: p => p.pets > 0 },
];

/** カテゴリ一覧（マスターリストから重複を除いて抽出） */
export const CATEGORIES = [...new Set(todoMasterList.map(i => i.category))];

/**
 * storage.get() の戻り値から、必要量計算用のパラメータオブジェクトを生成する。
 *
 * @param {Object} data - storage.get() の戻り値
 * @returns {{ adults, children, infants, elderly, females, females_menstrual, totalPeople, pets }}
 */
export function buildCalcParams(data) {
  const p = {
    adults: 0, children: 0, infants: 0, elderly: 0,
    females: 0, females_menstrual: 0,
    totalPeople: data.profiles.length,
    pets: data.pets?.count ?? 0
  };
  data.profiles.forEach(({ gender, ageGroup }) => {
    if (gender === '女性') {
      p.females++;
      // 月経対象年齢：子ども（3〜17歳）と成人（18〜64歳）の女性
      if (ageGroup === '子ども' || ageGroup === '成人') p.females_menstrual++;
    }
    if (ageGroup === '乳幼児')      p.infants++;
    else if (ageGroup === '子ども') p.children++;
    else if (ageGroup === '成人')   p.adults++;
    else if (ageGroup === '高齢者') {
      p.elderly++;
      // 高齢者は elderly_food（おかゆ）に加え staple_food にも含める。
      // おかゆは主食の代替ではなく嗜好・咀嚼補助品として追加計上する設計。
      p.adults++;
    }
  });
  return p;
}

/**
 * デフォルトのマスターリスト と カスタム品目 を結合して返す。
 * カスタム品目には calc / isNeeded を動的に付与する。
 *
 * @param {Array} customItems - data.customMasterItems
 * @returns {Array}
 */
export function getCombinedMasterList(customItems = []) {
  const processed = customItems.map(item => ({
    ...item,
    calc:     item.dailyQty ? (p, d) => (p.totalPeople || 1) * item.dailyQty * d : null,
    isNeeded: () => !!item.dailyQty
  }));
  return [...todoMasterList, ...processed];
}
