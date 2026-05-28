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
  settings: {
    stockpileDays: 3,
    noticeDays: { 3: 7, 7: 14, 14: 30 }
  },
  customMasterItems: []
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
        settings: { ...DEFAULTS.settings, ...(saved.settings ?? {}) }
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
