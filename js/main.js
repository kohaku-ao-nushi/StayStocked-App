'use strict';

/**
 * =================================================================
 * アプリケーションのデータ管理 (ストレージ層)
 * =================================================================
 */
const storage = {
  getAppData() {
    const data = localStorage.getItem('StayStockedApp');
    const defaults = { profiles: [], pets: { count: 0 }, stockItems: [], settings: { stockpileDays: 3, noticeDays: { '3': 7, '7': 14, '14': 30 } }, customMasterItems: [] };
    if (data) {
        const parsedData = JSON.parse(data);
        const merged = { ...defaults, ...parsedData, settings: { ...defaults.settings, ...(parsedData.settings || {}) } };
        merged.customMasterItems.forEach(item => {
            if (item.dailyQty) {
                item.calc = (p, days) => (p.totalPeople || 1) * item.dailyQty * days;
                item.isNeeded = () => true;
            }
        });
        return merged;
    }
    return defaults;
  },
  saveAppData(data) {
    const dataToSave = JSON.parse(JSON.stringify(data));
    dataToSave.customMasterItems.forEach(item => {
        delete item.calc;
        delete item.isNeeded;
    });
    localStorage.setItem('StayStockedApp', JSON.stringify(dataToSave));
  }
};

/**
 * =================================================================
 * ToDo備蓄のマスターデータ
 * =================================================================
 */
const todoMasterList = [
  // 食品・飲料
  { id: 'water', name: '水', category: '食品・飲料', unit: 'L', calc: (p, days) => p.totalPeople * 3 * days, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'staple_food', name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食', calc: (p, days) => (p.adults + p.children) * 3 * days, isNeeded: p => (p.adults + p.children) > 0, target: '成人・子ども' },
  { id: 'side_dish', name: '缶詰・レトルト食品', category: '食品・飲料', unit: '食', calc: (p, days) => (p.adults + p.children) * 3 * days, isNeeded: p => (p.adults + p.children) > 0, target: '成人・子ども' },
  { id: 'baby_food', name: '粉ミルク・液体ミルク', category: '食品・飲料', unit: '日分', calc: (p, days) => p.infants * days, isNeeded: p => p.infants > 0, target: '乳幼児' },
  { id: 'elderly_food', name: 'おかゆ・介護食', category: '食品・飲料', unit: '食', calc: (p, days) => p.elderly * 3 * days, isNeeded: p => p.elderly > 0, target: '高齢者' },
  { id: 'sweets', name: 'お菓子類', category: '食品・飲料', unit: '袋', calc: (p, days) => p.totalPeople * Math.ceil(days / 3), isNeeded: p => p.totalPeople > 0, target: '全員' },
  // 衛生用品
  { id: 'portable_toilet', name: '携帯トイレ・簡易トイレ', category: '衛生用品', unit: '回分', calc: (p, days) => p.totalPeople * 5 * days, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'tissue', name: 'ティッシュペーパー', category: '衛生用品', unit: '箱', calc: (p, days) => Math.ceil(days / 7) * 2, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'toilet_paper', name: 'トイレットペーパー', category: '衛生用品', unit: 'ロール', calc: (p, days) => Math.ceil(p.totalPeople * days / 10), isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'wet_tissue', name: '除菌ウェットティッシュ', category: '衛生用品', unit: '個', calc: (p, days) => p.totalPeople * Math.ceil(days / 3), isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'wet_body_towel', name: 'ウェットボディタオル', category: '衛生用品', unit: '枚', calc: (p, days) => p.totalPeople * days, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'mask', name: 'マスク', category: '衛生用品', unit: '枚', calc: (p, days) => p.totalPeople * days, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'diapers', name: 'おむつ', category: '衛生用品', unit: '日分', calc: (p, days) => p.infants * days, isNeeded: p => p.infants > 0, target: '乳幼児' },
  { id: 'sanitary_pads', name: '生理用品', category: '衛生用品', unit: '個', calc: (p, days) => p.females * days * 10, isNeeded: p => p.females > 0, target: '女性' },
  // 生活用品
  { id: 'first_aid_kit', name: '救急箱', category: '生活用品', unit: '箱', calc: () => 1, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'cassette_stove', name: 'カセットコンロ', category: '生活用品', unit: '台', calc: () => 1, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'cassette_gas', name: 'カセットボンベ', category: '生活用品', unit: '本', calc: (p, days) => Math.ceil(days * (4/3)), isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'food_wrap', name: '食品用ラップ', category: '生活用品', unit: '本', calc: () => 1, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'poly_bag', name: 'ポリ袋', category: '生活用品', unit: '箱', calc: () => 1, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'flashlight', name: '懐中電灯・ランタン', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'headlight', name: 'ヘッドライト', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'batteries', name: '乾電池', category: '生活用品', unit: 'セット', calc: () => 1, isNeeded: p => p.totalPeople > 0, target: '全員' },
  { id: 'mobile_battery', name: '携帯充電器', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0, target: '全員' },
  // ペット用品
  { id: 'pet_food', name: 'ペットフード', category: 'ペット用品', unit: '日分', calc: (p, days) => p.pets * days, isNeeded: p => p.pets > 0, target: 'ペット' },
  { id: 'pet_toilet', name: 'ペット用トイレ用品', category: 'ペット用品', unit: '日分', calc: (p, days) => p.pets * days, isNeeded: p => p.pets > 0, target: 'ペット' },
];

/**
 * =================================================================
 * 各ページのHTMLテンプレート
 * =================================================================
 */
const templates = {
  home: `
    <h2>ホーム</h2>
    <p>日々の備えを、ここから始めましょう。</p>
    <div class="grid-menu">
      <a href="#lifestyle"><img src="icons/suggest.png" alt="">くらし方</a>
      <a href="#stock"><img src="icons/stock.png" alt="">備蓄リスト</a>
      <a href="#settings"><img src="icons/setting.png" alt="">設定</a>
      <a href="#how-to"><img src="icons/manual.png" alt="">使い方</a>
      <a href="#help"><img src="icons/help.png" alt="">ヘルプ</a>
    </div>
  `,
  lifestyle: `
    <h2>くらし方</h2>
    <div class="form-group">
      <label for="peopleCountSelect">一緒に住んでいる人数を選んでください：</label>
      <select id="peopleCountSelect">
        ${[1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}人</option>`).join('')}
      </select>
    </div>
    <div id="profiles-container"></div>
    <hr>
    <h3>ペットについて</h3>
    <div class="form-group">
      <label for="petCountSelect">ペットの頭数</label>
      <select id="petCountSelect">
        ${[0,1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}頭</option>`).join('')}
      </select>
    </div>
    <button id="saveLifestyleBtn" class="btn">この内容で保存する</button>
  `,
  stock: `
    <h2>備蓄リスト</h2>
    <div id="mode-selector-container"></div>
    <div id="stock-list-output"></div>
    <a href="#register" class="btn">リストにない品目を追加する</a>
  `,
  register: `
    <h2 id="register-title">備蓄品を登録</h2>
    <div class="form-group" id="item-name-group">
      <label for="itemName">品目名</label>
      <input type="text" id="itemName" placeholder="例：水">
    </div>
    <div class="form-group" id="item-category-group">
      <label for="itemCategory">カテゴリ</label>
      <select id="itemCategory">
        <option value="">カテゴリを選択</option>
        ${[...new Set(todoMasterList.map(i => i.category))].map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        <option value="その他">その他</option>
      </select>
    </div>
    <div class="form-group">
      <label for="productName">商品名</label>
      <input type="text" id="productName" placeholder="例：天然水">
    </div>
    <div class="form-group">
      <label for="itemQty">数量</label>
      <input type="number" id="itemQty" min="0" value="1" step="any">
    </div>
    <div class="form-group">
      <label for="itemUnit">単位</label>
      <input type="text" id="itemUnit" placeholder="例：個, 本, L">
    </div>
    <div class="form-group">
      <label for="itemExpiry">期限（任意）</label>
      <input type="date" id="itemExpiry">
    </div>
    <div class="form-actions">
      <button id="saveItemBtn" class="btn">＋ この内容で登録する</button>
      <a href="#stock" class="btn btn-secondary">キャンセル</a>
      <button id="deleteItemBtn" class="btn btn-danger" style="display:none;">この備蓄品を削除する</button>
    </div>
  `,
  settings: `
    <h2>設定</h2>
    <a href="#custom-list-editor" class="btn">品目リストの編集</a>
    
    <hr>
    <h3>通知設定</h3>
    <p>備蓄品の期限が近づいた際の通知日数を設定します。</p>
    <div class="form-group">
      <label for="noticeDays3">3日分モードの通知日数（日）</label>
      <input type="number" id="noticeDays3" min="1" value="7">
    </div>
    <div class="form-group">
      <label for="noticeDays7">1週間モードの通知日数（日）</label>
      <input type="number" id="noticeDays7" min="1" value="14">
    </div>
    <div class="form-group">
      <label for="noticeDays14">2週間モードの通知日数（日）</label>
      <input type="number" id="noticeDays14" min="1" value="30">
    </div>
    
    <button id="saveSettingsBtn" class="btn">設定を保存する</button>
    
    <button id="resetDataBtn" class="btn btn-danger">全データをリセットする</button>
  `,
  'custom-list-editor': `
    <h2>品目リストの編集</h2>
    <h3>デフォルトの推奨品目</h3>
    <ul class="master-list">
      ${todoMasterList.map(item => `
        <li>
          <div class="master-item-details">
            <span>${item.name}</span>
            <div class="master-item-badges">
              ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
              <span class="category-badge">${item.category}</span>
            </div>
          </div>
        </li>
      `).join('')}
    </ul>
    <hr>
    <h3>あなたが追加した品目</h3>
    <div id="custom-master-list-output"></div>
    <div class="form-group">
      <h4>新しい品目を追加</h4>
      <label for="customItemName">品目名</label>
      <input type="text" id="customItemName" placeholder="例：プロテイン">
      <label for="customItemCategory">カテゴリ</label>
      <select id="customItemCategory">
        <option value="">カテゴリを選択</option>
        ${[...new Set(todoMasterList.map(i => i.category))].map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        <option value="その他">その他</option>
      </select>
      <label for="customItemUnit">単位</label>
      <input type="text" id="customItemUnit" placeholder="例：袋">
      <label for="customItemDailyQty">1人1日あたりの目標量（任意）</label>
      <input type="number" id="customItemDailyQty" min="0" placeholder="例：1">
    </div>
    <button id="addCustomItemBtn" class="btn">＋ この品目をリストに追加</button>
  `,
  'how-to': `
    <h2>使い方</h2>
    <p>1. 「くらし方」で家族構成を設定します。</p>
    <p>2. 「備蓄リスト」で必要な備蓄量の目安と現在の在庫状況を確認します。</p>
    <p>3. 品目をタップして在庫の詳細を確認・追加・編集します。</p>
  `,
  help: `
    <h2>ヘルプ</h2>
    <p>このアプリは、あなたの防災備蓄をサポートするためのツールです。</p>
    <p>データはすべてお使いのブラウザ内（localStorage）に保存され、外部に送信されることはありません。</p>
  `
};

/**
 * =================================================================
 * SPAルーター機能
 * =================================================================
 */
const router = {
  render() {
    const hash = window.location.hash || '#home';
    const pageKey = hash.substring(1);
    
    const appRoot = document.getElementById('app-root');
    const headerTitle = document.getElementById('header-title');

    if (templates[pageKey]) {
      appRoot.innerHTML = templates[pageKey];
      headerTitle.textContent = this.getHeaderTitle(pageKey);
      if (pages[pageKey]) {
        pages[pageKey]();
      }
    } else {
      window.location.hash = '#home';
    }
  },
  
  getHeaderTitle(key) {
    const titles = {
      home: 'StayStocked',
      lifestyle: 'くらし方',
      stock: '備蓄リスト',
      register: '備蓄品登録',
      settings: '設定',
      'how-to': '使い方',
      help: 'ヘルプ',
      'custom-list-editor': '品目リストの編集'
    };
    return titles[key] || 'StayStocked';
  }
};

/**
 * =================================================================
 * アプリケーションの初期化
 * =================================================================
 */
document.addEventListener('DOMContentLoaded', () => router.render());
window.addEventListener('hashchange', () => router.render());
