'use strict';
/**
 * storage.js — データの読み書きをすべてここに集約する
 *
 * 設計のポイント：
 *   get() / save() / reset() の3つだけ公開する。
 *   他のファイルはこのインターフェース越しにだけデータを触る。
 *   将来 localStorage → IndexedDB → クラウドに変えるときも、
 *   このファイルだけ書き換えれば済む。
 */

const KEY = 'StayStockedApp';

/** アプリの初期状態。新規インストール時・リセット時に使う */
const DEFAULTS = {
  profiles: [],
  pets: { count: 0 },
  stockItems: [],
  consumptionLog: [],          // ローリングストック消費履歴
  settings: {
    stockpileDays: 3,
    noticeDays: { 3: 7, 7: 14, 14: 30 },
    nextCheckDate: null,        // 次回棚卸し予定日（ISO文字列）
    checkIntervalDays: 30,      // 棚卸しリマインダー間隔（日）
    stockLevel: 'starter',      // 'starter' | 'full'
    hiddenMasterIds: []         // 非表示にした品目ID一覧
  },
  customMasterItems: [],
  onboarding: { completed: false }  // 初回案内フラグ
};

export const storage = {
  /**
   * localStorageからデータを読み込む。
   * 保存データにない新フィールドはデフォルト値で補完するので、
   * アプリを更新して項目が増えても既存データが壊れない。
   */
  get() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return JSON.parse(JSON.stringify(DEFAULTS));
      const saved = JSON.parse(raw);
      return {
        ...DEFAULTS,
        ...saved,
        settings:   { ...DEFAULTS.settings,   ...(saved.settings   ?? {}) },
        onboarding: { ...DEFAULTS.onboarding, ...(saved.onboarding ?? {}) }
      };
    } catch {
      // JSON.parse が失敗した場合（壊れたデータ）はデフォルトを返す
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  },

  /** データをlocalStorageに書き込む */
  save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  },

  /** 全データを削除する（設定リセット用） */
  reset() {
    localStorage.removeItem(KEY);
  }
};
