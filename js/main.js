'use strict';

/**
 * =================================================================
 * アプリケーションのデータ管理 (ストレージ層)
 * =================================================================
 */
const storage = {
  getAppData() {
    const data = localStorage.getItem('bosaistockApp');
    const defaults = { profiles: [], pets: { count: 0 }, stockItems: [], settings: { stockpileDays: 3 }, customMasterItems: [] };
    if (data) {
        const parsedData = JSON.parse(data);
        return { ...defaults, ...parsedData, settings: { ...defaults.settings, ...(parsedData.settings || {}) } };
    }
    return defaults;
  },
  saveAppData(data) {
    localStorage.setItem('bosaistockApp', JSON.stringify(data));
  }
};

/**
 * =================================================================
 * ToDo備蓄のマスターデータ (政府資料を参考に拡充)
 * =================================================================
 */
const todoMasterList = [
  // 食品・飲料
  { id: 'water', name: '水', category: '食品・飲料', unit: 'L', calc: (p, days) => p.totalPeople * 3 * days, isNeeded: p => p.totalPeople > 0 },
  { id: 'staple_food', name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食', calc: (p, days) => (p.adults + p.children) * 3 * days, isNeeded: p => (p.adults + p.children) > 0 },
  { id: 'side_dish', name: '缶詰・レトルト食品', category: '食品・飲料', unit: '食', calc: (p, days) => (p.adults + p.children) * 3 * days, isNeeded: p => (p.adults + p.children) > 0 },
  { id: 'baby_food', name: '粉ミルク・液体ミルク', category: '食品・飲料', unit: '日分', calc: (p, days) => p.infants * days, isNeeded: p => p.infants > 0 },
  { id: 'sweets', name: 'お菓子類', category: '食品・飲料', unit: '袋', calc: (p, days) => p.totalPeople * Math.ceil(days / 3), isNeeded: p => p.totalPeople > 0 },
  // 衛生用品
  { id: 'portable_toilet', name: '携帯トイレ・簡易トイレ', category: '衛生用品', unit: '回分', calc: (p, days) => p.totalPeople * 5 * days, isNeeded: p => p.totalPeople > 0 },
  { id: 'tissue', name: 'ティッシュペーパー', category: '衛生用品', unit: '箱', calc: (p, days) => Math.ceil(days / 7) * 2, isNeeded: p => p.totalPeople > 0 },
  { id: 'toilet_paper', name: 'トイレットペーパー', category: '衛生用品', unit: 'ロール', calc: (p, days) => Math.ceil(p.totalPeople * 0.25 * days), isNeeded: p => p.totalPeople > 0 },
  { id: 'wet_tissue', name: '除菌ウェットティッシュ', category: '衛生用品', unit: '個', calc: (p, days) => p.totalPeople * Math.ceil(days / 3), isNeeded: p => p.totalPeople > 0 },
  { id: 'mask', name: 'マスク', category: '衛生用品', unit: '枚', calc: (p, days) => p.totalPeople * days, isNeeded: p => p.totalPeople > 0 },
  { id: 'diapers', name: 'おむつ', category: '衛生用品', unit: '日分', calc: (p, days) => p.infants * days, isNeeded: p => p.infants > 0 },
  { id: 'sanitary_pads', name: '生理用品', category: '衛生用品', unit: '日分', calc: (p, days) => p.females * days, isNeeded: p => p.females > 0 },
  // 生活用品
  { id: 'first_aid_kit', name: '救急箱', category: '生活用品', unit: '箱', calc: () => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'cassette_stove', name: 'カセットコンロ', category: '生活用品', unit: '台', calc: () => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'cassette_gas', name: 'カセットボンベ', category: '生活用品', unit: '本', calc: (p, days) => Math.ceil(days * 2), isNeeded: p => p.totalPeople > 0 },
  { id: 'food_wrap', name: '食品用ラップ', category: '生活用品', unit: '本', calc: () => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'poly_bag', name: 'ポリ袋', category: '生活用品', unit: '箱', calc: () => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'flashlight', name: '懐中電灯・ランタン', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  { id: 'batteries', name: '乾電池', category: '生活用品', unit: 'セット', calc: () => 1, isNeeded: p => p.totalPeople > 0 },
  { id: 'mobile_battery', name: '携帯充電器', category: '生活用品', unit: '個', calc: p => p.totalPeople, isNeeded: p => p.totalPeople > 0 },
  // ペット用品
  { id: 'pet_food', name: 'ペットフード', category: 'ペット用品', unit: '日分', calc: (p, days) => p.pets * days, isNeeded: p => p.pets > 0 },
  { id: 'pet_toilet', name: 'ペット用トイレ用品', category: 'ペット用品', unit: '日分', calc: (p, days) => p.pets * days, isNeeded: p => p.pets > 0 },
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
      <a href="#lifestyle"><img src="icons/lifestyle.png" alt="">くらし方</a>
      <a href="#todo"><img src="icons/todo.png" alt="">ToDo備蓄</a>
      <a href="#stock"><img src="icons/stock.png" alt="">備蓄管理</a>
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
      <label for="petCount">ペットの頭数</label>
      <input type="number" id="petCount" min="0" value="0">
    </div>
    <button id="saveLifestyleBtn" class="btn">この内容で保存する</button>
  `,
  todo: `
    <h2>ToDo備蓄</h2>
    <div id="mode-selector-container"></div>
    <div id="todo-output"></div>
  `,
  stock: `
    <h2>備蓄管理</h2>
    <div id="mode-selector-container"></div>
    <h3>サマリー</h3>
    <div id="stock-summary-output"></div>
    <hr>
    <h3>登録済み備蓄品リスト (個別管理)</h3>
    <div id="stock-items-output" class="stock-list"></div>
    <a href="#register" class="btn">新しく備蓄品を登録する</a>
  `,
  register: `
    <h2 id="register-title">備蓄品を登録</h2>
    <div class="form-group">
      <label for="itemName">品名</label>
      <input type="text" id="itemName" placeholder="例：水 2L">
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
      <label for="itemExpiry">賞味期限（任意）</label>
      <input type="date" id="itemExpiry">
    </div>
    <button id="saveItemBtn" class="btn">＋ この内容で登録する</button>
  `,
  settings: `
    <h2>設定</h2>
    <a href="#custom-list-editor" class="btn">品目リストの編集</a>
    <button id="resetDataBtn" class="btn" style="background-color: #d9534f;">全データをリセットする</button>
  `,
  'custom-list-editor': `
    <h2>品目リストの編集</h2>
    <h3>デフォルトの推奨品目</h3>
    <ul class="master-list">
      ${todoMasterList.map(item => `<li>${item.name} <span class="category-badge">${item.category}</span></li>`).join('')}
    </ul>
    <hr>
    <h3>あなたが追加した品目</h3>
    <div id="custom-master-list-output"></div>
    <div class="form-group">
      <h4>新しい品目を追加</h4>
      <label for="customItemName">品目名</label>
      <input type="text" id="customItemName" placeholder="例：プロテイン">
      <label for="customItemCategory">カテゴリ</label>
      <input type="text" id="customItemCategory" placeholder="例：食品・飲料">
      <label for="customItemUnit">単位</label>
      <input type="text" id="customItemUnit" placeholder="例：袋">
    </div>
    <button id="addCustomItemBtn" class="btn">＋ この品目をリストに追加</button>
  `,
  'how-to': `
    <h2>使い方</h2>
    <p>1. 「くらし方」で家族構成を設定します。</p>
    <p>2. 「ToDo備蓄」で必要な備蓄量の目安を確認します。</p>
    <p>3. ToDoリストの項目をタップして、「備蓄管理」に登録します。</p>
    <p>定期的にリストを見直して、いざという時に備えましょう！</p>
  `,
  help: `
    <h2>ヘルプ</h2>
    <p>このアプリは、あなたの防災備蓄をサポートするためのツールです。</p>
    <p>データはすべてお使いのブラウザ内（localStorage）に保存され、外部に送信されることはありません。</p>
    <p>お問い合わせや不具合の報告は、〇〇までお願いします。（連絡先を記載）</p>
  `
};

/**
 * =================================================================
 * ページごとのロジック (コントローラー層)
 * =================================================================
 */
const pages = {
  lifestyle() {
    // ... (変更なし)
  },

  todo() {
    // ... (変更なし)
  },
  
  stock() {
    // ... (変更なし)
  },

  register() {
    // ... (変更なし)
  },

  settings() {
      document.getElementById('resetDataBtn').addEventListener('click', () => {
          if (confirm('本当にすべてのデータをリセットしますか？この操作は元に戻せません。')) {
              localStorage.removeItem('bosaistockApp');
              alert('データをリセットしました');
              window.location.hash = '#home';
              location.reload();
          }
      });
  },
  
  'custom-list-editor'() {
      const data = storage.getAppData();
      const output = document.getElementById('custom-master-list-output');
      
      const renderCustomList = () => {
          output.innerHTML = '';
          if (data.customMasterItems.length === 0) {
              output.innerHTML = '<p>あなたが追加した品目はまだありません。</p>';
              return;
          }
          const list = document.createElement('ul');
          list.className = 'master-list is-custom';
          data.customMasterItems.forEach(item => {
              const li = document.createElement('li');
              li.innerHTML = `
                  ${item.name} <span class="category-badge">${item.category}</span>
                  <button class="delete-custom-item-btn" data-id="${item.id}">削除</button>
              `;
              list.appendChild(li);
          });
          output.appendChild(list);
      };

      document.getElementById('addCustomItemBtn').addEventListener('click', () => {
          const name = document.getElementById('customItemName').value;
          const category = document.getElementById('customItemCategory').value;
          const unit = document.getElementById('customItemUnit').value;

          if (!name || !category || !unit) {
              alert('品名、カテゴリ、単位はすべて必須です。');
              return;
          }

          const newItem = {
              id: `custom-${Date.now()}`,
              name,
              category,
              unit
          };

          data.customMasterItems.push(newItem);
          storage.saveAppData(data);
          
          document.getElementById('customItemName').value = '';
          document.getElementById('customItemCategory').value = '';
          document.getElementById('customItemUnit').value = '';
          
          renderCustomList();
      });
      
      output.addEventListener('click', e => {
          if (e.target.classList.contains('delete-custom-item-btn')) {
              const itemId = e.target.dataset.id;
              if (confirm('この品目をリストから削除しますか？')) {
                  data.customMasterItems = data.customMasterItems.filter(item => item.id !== itemId);
                  storage.saveAppData(data);
                  renderCustomList();
              }
          }
      });

      renderCustomList();
  },

  // --- ヘルパー関数 (変更なし) ---
  getCalculationParams(data) { /* ... */ },
  renderStockpileModeSelector(onchangeCallback) { /* ... */ }
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
        // `pages.lifestyle` など、変更がない部分は簡略化のため省略しています。
        // 実際にはすべてのページロジックがここに存在します。
        pages[pageKey]();
      }
    } else {
      window.location.hash = '#home';
    }
  },
  
  getHeaderTitle(key) {
    const titles = {
      home: 'bosaistock ホーム',
      lifestyle: 'くらし方',
      todo: 'ToDo備蓄',
      stock: '備蓄管理',
      register: '備蓄品登録',
      settings: '設定',
      'how-to': '使い方',
      help: 'ヘルプ',
      'custom-list-editor': '品目リストの編集'
    };
    return titles[key] || 'bosaistock';
  }
};

// --- ここから下は、変更がないため省略したページごとのロジックです ---
// (実際のファイルでは省略せずにすべて含めてください)
pages.lifestyle = function() { /* ... */ };
pages.todo = function() { /* ... */ };
pages.stock = function() { /* ... */ };
pages.register = function() { /* ... */ };
pages.getCalculationParams = function(data) { /* ... */ };
pages.renderStockpileModeSelector = function(onchangeCallback) { /* ... */ };

/**
 * =================================================================
 * アプリケーションの初期化
 * =================================================================
 */
document.addEventListener('DOMContentLoaded', () => router.render());
window.addEventListener('hashchange', () => router.render());
