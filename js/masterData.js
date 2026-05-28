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
 */
export const todoMasterList = [
  // ── 食品・飲料 ──────────────────────────────────────────────────
  { id: 'water',        name: '水',                    category: '食品・飲料', unit: 'L',    target: '全員',
    calc: (p, d) => p.totalPeople * 3 * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'staple_food',  name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食',   target: '成人・子ども',
    calc: (p, d) => (p.adults + p.children) * 3 * d,
    isNeeded: p => (p.adults + p.children) > 0 },

  { id: 'side_dish',    name: '缶詰・レトルト食品',    category: '食品・飲料', unit: '食',   target: '成人・子ども',
    calc: (p, d) => (p.adults + p.children) * 3 * d,
    isNeeded: p => (p.adults + p.children) > 0 },

  { id: 'baby_food',    name: '粉ミルク・液体ミルク',  category: '食品・飲料', unit: '日分', target: '乳幼児',
    calc: (p, d) => p.infants * d,
    isNeeded: p => p.infants > 0 },

  { id: 'elderly_food', name: 'おかゆ・介護食',        category: '食品・飲料', unit: '食',   target: '高齢者',
    calc: (p, d) => p.elderly * 3 * d,
    isNeeded: p => p.elderly > 0 },

  { id: 'sweets',       name: 'お菓子類',              category: '食品・飲料', unit: '袋',   target: '全員',
    calc: (p, d) => p.totalPeople * Math.ceil(d / 3),
    isNeeded: p => p.totalPeople > 0 },

  // ── 衛生用品 ──────────────────────────────────────────────────
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

  { id: 'sanitary_pads',   name: '生理用品',               category: '衛生用品', unit: '個',   target: '女性',
    calc: (p, d) => p.females * d * 10,
    isNeeded: p => p.females > 0 },

  // ── 生活用品 ──────────────────────────────────────────────────
  { id: 'first_aid_kit',  name: '救急箱',           category: '生活用品', unit: '箱',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'cassette_stove', name: 'カセットコンロ',   category: '生活用品', unit: '台',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'cassette_gas',   name: 'カセットボンベ',   category: '生活用品', unit: '本',    target: '全員',
    calc: (p, d) => Math.ceil(d * (4 / 3)),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'food_wrap',      name: '食品用ラップ',     category: '生活用品', unit: '本',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'poly_bag',       name: 'ポリ袋',           category: '生活用品', unit: '箱',    target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'flashlight',     name: '懐中電灯・ランタン', category: '生活用品', unit: '個',  target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'headlight',      name: 'ヘッドライト',     category: '生活用品', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'batteries',      name: '乾電池',           category: '生活用品', unit: 'セット', target: '全員',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'mobile_battery', name: '携帯充電器',       category: '生活用品', unit: '個',    target: '全員',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // ── ペット用品 ──────────────────────────────────────────────────
  { id: 'pet_food',   name: 'ペットフード',       category: 'ペット用品', unit: '日分', target: 'ペット',
    calc: (p, d) => p.pets * d,
    isNeeded: p => p.pets > 0 },

  { id: 'pet_toilet', name: 'ペット用トイレ用品', category: 'ペット用品', unit: '日分', target: 'ペット',
    calc: (p, d) => p.pets * d,
    isNeeded: p => p.pets > 0 },
];

/** カテゴリ一覧（マスターリストから重複を除いて抽出） */
export const CATEGORIES = [...new Set(todoMasterList.map(i => i.category))];

/**
 * storage.get() の戻り値から、必要量計算用のパラメータオブジェクトを生成する。
 * stock.js や home.js が必要量を計算するときに呼び出す。
 *
 * @param {Object} data - storage.get() の戻り値
 * @returns {{ adults, children, infants, elderly, females, totalPeople, pets }}
 */
export function buildCalcParams(data) {
  const p = {
    adults: 0, children: 0, infants: 0, elderly: 0, females: 0,
    totalPeople: data.profiles.length,
    pets: data.pets?.count ?? 0
  };
  data.profiles.forEach(({ gender, ageGroup }) => {
    if (gender === '女性') p.females++;
    if (ageGroup === '乳幼児')      p.infants++;
    else if (ageGroup === '子ども') p.children++;
    else if (ageGroup === '成人')   p.adults++;
    else if (ageGroup === '高齢者') { p.elderly++; p.adults++; }
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
