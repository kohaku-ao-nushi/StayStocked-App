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
        const merged = { ...defaults, ...parsedData, settings: { ...defaults.settings, ...(parsedData.settings || {}) } };
        // 読み込んだカスタム品目に計算関数を再設定
        merged.customMasterItems.forEach(item => {
            if (item.dailyQty) {
                item.calc = (p, days) => item.dailyQty * days;
                item.isNeeded = () => true;
            }
        });
        return merged;
    }
    return defaults;
  },
  saveAppData(data) {
    // 保存する前に、関数などJSONで保存できないプロパティを削除
    const dataToSave = JSON.parse(JSON.stringify(data));
    dataToSave.customMasterItems.forEach(item => {
        delete item.calc;
        delete item.isNeeded;
    });
    localStorage.setItem('bosaistockApp', JSON.stringify(dataToSave));
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
      <label for="petCountSelect">ペットの頭数</label>
      <select id="petCountSelect">
        ${[0,1,2,3,4,5,6,7,8,9].map(n => `<option value="${n}">${n}頭</option>`).join('')}
      </select>
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
      <select id="customItemCategory">
        <option value="">カテゴリを選択</option>
        ${[...new Set(todoMasterList.map(i => i.category))].map(cat => `<option value="${cat}">${cat}</option>`).join('')}
        <option value="その他">その他</option>
      </select>
      <label for="customItemUnit">単位</label>
      <input type="text" id="customItemUnit" placeholder="例：袋">
      <label for="customItemDailyQty">1日あたりの目標量（任意）</label>
      <input type="number" id="customItemDailyQty" min="0" placeholder="例：1">
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
    const data = storage.getAppData();
    const profilesContainer = document.getElementById('profiles-container');
    const peopleCountSelect = document.getElementById('peopleCountSelect');
    const petCountSelect = document.getElementById('petCountSelect');

    const renderProfileCards = (num, profiles = []) => {
      profilesContainer.innerHTML = '';
      for (let i = 0; i < num; i++) {
        const profile = profiles[i] || {};
        const cardHTML = `
          <div class="profile-card" data-index="${i}">
            <h4>${i + 1}人目の情報</h4>
            <div class="form-group">
              <label>性別</label>
              <select class="gender-select">
                <option value="男性" ${profile.gender === '男性' ? 'selected' : ''}>男性</option>
                <option value="女性" ${profile.gender === '女性' ? 'selected' : ''}>女性</option>
              </select>
            </div>
            <div class="form-group">
              <label>年代</label>
              <select class="age-group-select">
                <option value="乳幼児" ${profile.ageGroup === '乳幼児' ? 'selected' : ''}>乳幼児 (0-2歳)</option>
                <option value="子ども" ${profile.ageGroup === '子ども' ? 'selected' : ''}>子ども (3-17歳)</option>
                <option value="成人" ${profile.ageGroup === '成人' ? 'selected' : ''}>成人 (18-64歳)</option>
                <option value="高齢者" ${profile.ageGroup === '高齢者' ? 'selected' : ''}>高齢者 (65歳以上)</option>
              </select>
            </div>
          </div>
        `;
        profilesContainer.insertAdjacentHTML('beforeend', cardHTML);
      }
    };
    
    peopleCountSelect.addEventListener('change', (e) => {
      renderProfileCards(parseInt(e.target.value), storage.getAppData().profiles);
    });

    document.getElementById('saveLifestyleBtn').addEventListener('click', () => {
        const newProfiles = [];
        document.querySelectorAll('.profile-card').forEach(card => {
            newProfiles.push({
                gender: card.querySelector('.gender-select').value,
                ageGroup: card.querySelector('.age-group-select').value
            });
        });
        
        const currentData = storage.getAppData();
        currentData.profiles = newProfiles;
        currentData.pets.count = parseInt(petCountSelect.value) || 0;
        storage.saveAppData(currentData);
        
        alert('くらし方を保存しました！');
        window.location.hash = '#home';
    });

    petCountSelect.value = data.pets.count || 0;
    const initialNum = data.profiles.length || 1;
    peopleCountSelect.value = initialNum;
    renderProfileCards(initialNum, data.profiles);
  },

  todo() {
    const data = storage.getAppData();
    const output = document.getElementById('todo-output');
    
    this.renderStockpileModeSelector(() => this.todo());

    if (data.profiles.length === 0) {
      output.innerHTML = '<p>先に「くらし方」で家族構成を設定してください。</p><a href="#lifestyle" class="btn">設定ページへ</a>';
      return;
    }
    
    const params = this.getCalculationParams(data);
    const days = data.settings.stockpileDays || 3;
    const combinedMasterList = [...todoMasterList, ...data.customMasterItems];

    const categories = {};
    combinedMasterList.forEach(item => {
        let quantity = null;
        let isNeeded = false;
        
        if (item.calc) {
            if (item.isNeeded && item.isNeeded(params)) {
                quantity = item.calc(params, days);
                isNeeded = true;
            }
        } else if (item.id.startsWith('custom-')) {
            quantity = '—';
            isNeeded = true;
        }

        if (isNeeded && quantity !== 0) {
            if (!categories[item.category]) categories[item.category] = [];
            categories[item.category].push({ ...item, quantity });
        }
    });

    let todoHTML = `<p>あなたの世帯で推奨される備蓄リストです（<strong>${days}日分</strong>）。項目をタップして備蓄品を登録しましょう。</p>`;
    for (const categoryName in categories) {
        todoHTML += `<div class="todo-category"><h3>${categoryName}</h3><ul class="stock-list">`;
        categories[categoryName].forEach(item => {
            const qtyDisplay = (typeof item.quantity === 'number') ? `<strong>${item.quantity.toLocaleString()}</strong> ${item.unit}` : '（任意）';
            todoHTML += `
                <li class="todo-item" data-id="${item.id}" data-name="${item.name}" data-unit="${item.unit}">
                    <span class="item-name">${item.name}</span>
                    <span class="item-qty">${qtyDisplay}</span>
                </li>
            `;
        });
        todoHTML += `</ul></div>`;
    }
    output.innerHTML = todoHTML;

    output.addEventListener('click', (e) => {
        const todoItem = e.target.closest('.todo-item');
        if (todoItem) {
            const { id, name, unit } = todoItem.dataset;
            const masterId = id.startsWith('custom-') ? null : id;
            sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId: masterId, customId: id, name, unit }));
            window.location.hash = '#register';
        }
    });
  },
  
  stock() {
    const data = storage.getAppData();
    const summaryOutput = document.getElementById('stock-summary-output');
    const itemsOutput = document.getElementById('stock-items-output');

    this.renderStockpileModeSelector(() => this.stock());
    
    summaryOutput.innerHTML = '';
    itemsOutput.innerHTML = '';

    if (data.profiles.length === 0) {
      summaryOutput.innerHTML = '<p>「くらし方」が未設定のため、推奨量を計算できません。</p><a href="#lifestyle" class="btn">先にくらし方を設定する</a>';
      return;
    }

    const params = this.getCalculationParams(data);
    const days = data.settings.stockpileDays || 3;
    const combinedMasterList = [...todoMasterList, ...data.customMasterItems];
    
    const currentStockById = {};
    data.stockItems.forEach(item => {
        const id = item.masterId || item.customId;
        if(id) {
            if(!currentStockById[id]) currentStockById[id] = 0;
            currentStockById[id] += parseFloat(item.qty) || 0;
        }
    });

    const categories = {};
    combinedMasterList.forEach(item => {
        if(item.calc && item.isNeeded && item.isNeeded(params)) {
            const required = item.calc(params, days);
            if (required > 0) {
                if (!categories[item.category]) {
                    categories[item.category] = { items: [], achieved: 0, total: 0 };
                }
                const current = currentStockById[item.id] || 0;
                categories[item.category].items.push({ ...item, required, current });
                categories[item.category].total++;
                if (current >= required) {
                    categories[item.category].achieved++;
                }
            }
        }
    });
    
    let summaryHTML = '';
    for (const categoryName in categories) {
        const categoryData = categories[categoryName];
        summaryHTML += `
          <div class="todo-category">
            <div class="category-header">
              <h3>${categoryName}</h3>
              <span class="category-achievement">${categoryData.achieved} / ${categoryData.total}</span>
            </div>
        `;
        categoryData.items.forEach(item => {
            const percentage = Math.min((item.current / item.required) * 100, 100);
            let statusBarClass = 'is-low';
            if (percentage >= 100) statusBarClass = 'is-sufficient';
            else if (percentage >= 50) statusBarClass = 'is-medium';

            summaryHTML += `
                <div class="stock-progress-item">
                    <div class="item-info">
                        <span class="item-name">${item.name}</span>
                        <span class="item-amount">${item.current.toLocaleString()}${item.unit} / ${item.required.toLocaleString()}${item.unit}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-bar-inner ${statusBarClass}" style="width: ${percentage}%;"></div>
                    </div>
                </div>
            `;
        });
        summaryHTML += `</div>`;
    }
    summaryOutput.innerHTML = summaryHTML;
    
    if (data.stockItems.length > 0) {
        data.stockItems.forEach(item => {
            const masterInfo = combinedMasterList.find(m => m.id === (item.masterId || item.customId));
            const category = masterInfo ? masterInfo.category : 'その他';

            const li = document.createElement('li');
            li.className = 'stock-item-custom';
            let expiryText = item.expiry ? `期限: ${item.expiry}` : '期限なし';
            li.innerHTML = `
                <div class="item-details">
                    <span class="item-name">${item.name}</span>
                    <span class="item-amount">(${item.qty} ${item.unit || '個'})</span>
                    <span class="category-badge">${category}</span>
                    <span class="item-expiry">${expiryText}</span>
                </div>
                <div class="item-actions">
                    <button class="edit-btn" data-id="${item.id}">編集</button>
                    <button class="delete-btn" data-id="${item.id}">削除</button>
                </div>
            `;
            itemsOutput.appendChild(li);
        });
    } else {
        itemsOutput.innerHTML = '<p>登録されている備蓄品はありません。</p>';
    }

    itemsOutput.addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
            sessionStorage.setItem('editItemId', e.target.dataset.id);
            window.location.hash = '#register';
        } else if (e.target.classList.contains('delete-btn')) {
            if (confirm('この備蓄品を削除しますか？')) {
                const currentData = storage.getAppData();
                currentData.stockItems = currentData.stockItems.filter(item => item.id !== e.target.dataset.id);
                storage.saveAppData(currentData);
                this.stock();
            }
        }
    });
  },

  register() {
    const editItemId = sessionStorage.getItem('editItemId');
    const data = storage.getAppData();
    const itemToEdit = editItemId ? data.stockItems.find(item => item.id === editItemId) : null;

    const titleEl = document.getElementById('register-title');
    const saveBtn = document.getElementById('saveItemBtn');
    const itemNameInput = document.getElementById('itemName');
    const itemQtyInput = document.getElementById('itemQty');
    const itemUnitInput = document.getElementById('itemUnit');
    const itemExpiryInput = document.getElementById('itemExpiry');
    let masterId = null;
    let customId = null;

    if (itemToEdit) {
        titleEl.textContent = '備蓄品を編集';
        saveBtn.textContent = 'この内容で更新する';
        masterId = itemToEdit.masterId;
        customId = itemToEdit.customId;
        itemNameInput.value = itemToEdit.name;
        itemQtyInput.value = itemToEdit.qty;
        itemUnitInput.value = itemToEdit.unit;
        itemExpiryInput.value = itemToEdit.expiry || '';
    } else {
        const newItemData = sessionStorage.getItem('newItemFromTodo');
        if (newItemData) {
            const item = JSON.parse(newItemData);
            masterId = item.masterId;
            customId = item.customId;
            itemNameInput.value = item.name;
            itemUnitInput.value = item.unit;
            if (item.masterId) {
                itemUnitInput.readOnly = true;
                itemUnitInput.style.backgroundColor = '#f0f0f0';
            }
            sessionStorage.removeItem('newItemFromTodo');
        }
    }

    saveBtn.addEventListener('click', () => {
      const name = itemNameInput.value;
      const qty = parseFloat(itemQtyInput.value);
      const unit = itemUnitInput.value;
      const expiry = itemExpiryInput.value;

      if (!name || isNaN(qty) || !unit) {
        alert('品名、数量、単位は必須です。');
        return;
      }

      const currentData = storage.getAppData();
      if (itemToEdit) {
          const itemIndex = currentData.stockItems.findIndex(item => item.id === itemToEdit.id);
          if (itemIndex > -1) {
              currentData.stockItems[itemIndex] = { ...itemToEdit, name, qty, unit, expiry };
          }
      } else {
          const newItem = { id: Date.now().toString(), masterId, customId, name, qty, unit, expiry };
          currentData.stockItems.push(newItem);
      }

      storage.saveAppData(currentData);
      sessionStorage.removeItem('editItemId');
      alert(itemToEdit ? '更新しました！' : '登録しました！');
      window.location.hash = '#stock';
    });
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
      const output = document.getElementById('custom-master-list-output');
      
      const renderCustomList = () => {
          const data = storage.getAppData();
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
                  <div class="item-details">
                    <span>${item.name} <span class="category-badge">${item.category}</span></span>
                    <span class="item-expiry">${item.dailyQty ? `目標: 1日${item.dailyQty}${item.unit}` : '目標量なし'}</span>
                  </div>
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
          const dailyQty = parseFloat(document.getElementById('customItemDailyQty').value);

          if (!name || !category || !unit) {
              alert('品名、カテゴリ、単位はすべて必須です。');
              return;
          }

          const newItem = { id: `custom-${Date.now()}`, name, category, unit };
          if (!isNaN(dailyQty) && dailyQty > 0) {
              newItem.dailyQty = dailyQty;
          }
          
          const data = storage.getAppData();
          data.customMasterItems.push(newItem);
          storage.saveAppData(data);
          
          document.getElementById('customItemName').value = '';
          document.getElementById('customItemCategory').value = '';
          document.getElementById('customItemUnit').value = '';
          document.getElementById('customItemDailyQty').value = '';
          
          renderCustomList();
      });
      
      output.addEventListener('click', e => {
          if (e.target.classList.contains('delete-custom-item-btn')) {
              const itemIdToDelete = e.target.dataset.id;
              if (confirm('この品目をリストから削除しますか？\n関連する在庫もすべて削除されます。')) {
                  const data = storage.getAppData();
                  data.customMasterItems = data.customMasterItems.filter(item => item.id !== itemIdToDelete);
                  data.stockItems = data.stockItems.filter(stock => stock.customId !== itemIdToDelete);
                  storage.saveAppData(data);
                  pages['custom-list-editor']();
              }
          }
      });

      renderCustomList();
  },

  // --- ヘルパー関数 ---
  getCalculationParams(data) {
    const params = {
      adults: 0, children: 0, infants: 0,
      totalPeople: data.profiles.length,
      females: 0, elderly: 0, pets: data.pets.count || 0
    };
    data.profiles.forEach(p => {
        if (p.gender === '女性') params.females++;
        switch (p.ageGroup) {
            case '乳幼児': params.infants++; break;
            case '子ども': params.children++; break;
            case '成人': params.adults++; break;
            case '高齢者': params.elderly++; params.adults++; break;
        }
    });
    return params;
  },

  renderStockpileModeSelector(onchangeCallback) {
    const data = storage.getAppData();
    const container = document.getElementById('mode-selector-container');
    const currentDays = data.settings.stockpileDays || 3;
    
    container.innerHTML = `
      <div class="stockpile-mode-selector">
        <button class="mode-btn ${currentDays === 3 ? 'is-active' : ''}" data-days="3">3日分</button>
        <button class="mode-btn ${currentDays === 7 ? 'is-active' : ''}" data-days="7">1週間</button>
        <button class="mode-btn ${currentDays === 14 ? 'is-active' : ''}" data-days="14">2週間</button>
      </div>
    `;

    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('mode-btn')) {
            const selectedDays = parseInt(e.target.dataset.days);
            const currentData = storage.getAppData();
            currentData.settings.stockpileDays = selectedDays;
            storage.saveAppData(currentData);
            onchangeCallback();
        }
    });
  }
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

/**
 * =================================================================
 * アプリケーションの初期化
 * =================================================================
 */
document.addEventListener('DOMContentLoaded', () => router.render());
window.addEventListener('hashchange', () => router.render());
