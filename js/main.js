'use strict';

/**
 * =================================================================
 * アプリケーションのデータ管理 (ストレージ層)
 * =================================================================
 */
const storage = {
  getAppData() {
    const data = localStorage.getItem('StayStockedApp');
    const defaults = { profiles: [], pets: { count: 0 }, stockItems: [], settings: { stockpileDays: 3 }, customMasterItems: [] };
    if (data) {
        const parsedData = JSON.parse(data);
        const merged = { ...defaults, ...parsedData, settings: { ...defaults.settings, ...(parsedData.settings || {}) } };
        // 読み込んだカスタム品目に計算関数を再設定
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
  
  stock() {
    const data = storage.getAppData();
    const days = data.settings.stockpileDays || 3;
    const today = new Date();
    const listOutput = document.getElementById('stock-list-output');

    // 設定された通知日数を取得
    const noticeDays = (data.settings.noticeDays && data.settings.noticeDays[days]) || {
        '3': 7,
        '7': 14,
        '14': 30
    }[days];

    this.renderStockpileModeSelector(() => this.stock());
    
    listOutput.innerHTML = '';

    if (data.profiles.length === 0) {
      listOutput.innerHTML = '<p>「くらし方」が未設定のため、推奨量を計算できません。</p><a href="#lifestyle" class="btn">先にくらし方を設定する</a>';
      return;
    }

    const params = this.getCalculationParams(data);
    const combinedMasterList = [...todoMasterList, ...data.customMasterItems];
    
    const stockItemsById = {};
    const otherItems = [];
    data.stockItems.forEach(item => {
        const id = item.masterId || item.customId;
        if(id) {
            if(!stockItemsById[id]) stockItemsById[id] = [];
            stockItemsById[id].push(item);
        } else {
            otherItems.push(item);
        }
    });

    const categories = {};
    let totalRequired = 0;
    let totalCurrent = 0;
    
    combinedMasterList.forEach(item => {
        if(item.calc && item.isNeeded && item.isNeeded(params)) {
            const required = item.calc(params, days);
            if (required > 0) {
                if (!categories[item.category]) {
                    categories[item.category] = { items: [], achieved: 0, total: 0 };
                }
                const currentItems = stockItemsById[item.id] || [];
                const current = currentItems.reduce((sum, stock) => sum + (parseFloat(stock.qty) || 0), 0);
                // ★★★ 全体の合計を計算 ★★★
                totalRequired += required;
                totalCurrent += current;

                if (!categories[item.category]) {
                    categories[item.category] = { items: [], achieved: 0, total: 0 };
                }
                
                categories[item.category].items.push({ ...item, required, current });
                categories[item.category].total++;
                if (current >= required) {
                    categories[item.category].achieved++;
                }
            }
        }
    });

    // 全体の進捗率を計算
    const overallPercentage = totalRequired > 0 ? Math.min((totalCurrent / totalRequired) * 100, 100) : 0;
    let overallStatusBarClass = 'is-low';
    if (overallPercentage >= 100) overallStatusBarClass = 'is-sufficient';
    else if (overallPercentage >= 50) overallStatusBarClass = 'is-medium';

    // ★★★ 全体の推奨アイテム数を計算 ★★★
    const overallItemCount = combinedMasterList.filter(item => item.isNeeded(params) && item.calc(params, days) > 0).length;

    let listHTML = '';
    for (const categoryName in categories) {
        const categoryData = categories[categoryName];
        listHTML += `
            <div class="overall-progress-card">
                <h3>全体の備蓄進捗</h3>
                <div class="overall-progress-header">
                    <span class="overall-summary-text">合計アイテム数: ${overallItemCount}</span>
                    <span class="overall-progress-text">${Math.round(overallPercentage)}% 達成</span>
                </div>
                <div class="overall-progress-bar progress-bar">
                    <div class="progress-bar-inner ${overallStatusBarClass}" style="width: ${overallPercentage}%;"></div>
                </div>
            </div>

                <p class="overall-summary-text">
                    <span>合計備蓄量: ${totalCurrent.toFixed(0)}</span>
                    <span>/</span>
                    <span>推奨合計量: ${totalRequired.toFixed(0)}</span>
                </p>
            </div>
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

            const registeredItems = stockItemsById[item.id] || [];
            // ★★★ 期限の判定ロジックをここに挿入 ★★★
            const expiringSoonItems = registeredItems.filter(stock => {
                if (!stock.expiry) return false;
                const expiryDate = new Date(stock.expiry);
                const diffTime = expiryDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                // 通知日数以内かどうかを判定
                return diffDays > 0 && diffDays <= noticeDays;
            });
            // 強調表示のCSSクラスを付与
            let highlightClass = '';
            let openAccordion = false;
            if (expiringSoonItems.length > 0) {
                highlightClass = 'is-expiring';
                openAccordion = true; // 期限が近い備蓄品があればアコーディオンを開く
            }
          
            const detailsHTML = registeredItems.length > 0
                ? registeredItems.map(stock => {
                    let subItemHighlightClass = '';
                    if (stock.expiry) {
                        const expiryDate = new Date(stock.expiry);
                        const diffTime = expiryDate.getTime() - today.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        // 期限間近の判定
                        if (diffDays > 0 && diffDays <= noticeDays) {
                            subItemHighlightClass = 'is-expiring-sub-item';
                        }
                        // 期限切れの判定
                        if (diffDays <= 0) {
                            subItemHighlightClass = 'is-expired-sub-item';
                        }
                    }
                    return `
                        <li class="stock-sub-item ${subItemHighlightClass}" data-id="${stock.id}">
                            <span class="product-name">${stock.productName || item.name}</span>
                            <div class="sub-item-details">
                                <span class="item-amount">${stock.qty} ${stock.unit}</span>
                                <span class="item-expiry">${stock.expiry ? stock.expiry : '期限なし'}</span>
                            </div>
                        </li>
                    `;
                }).join('')
                : '<li><p class="no-sub-item-message">この品目の備蓄はまだありません。</p></li>';
    
            // ★★★ HTML構造を修正 ★★★
            listHTML += `
                <details class="stock-accordion ${openAccordion ? 'open' : ''}">
                    <summary class="stock-accordion stock-progress-item ${highlightClass}">
                        <div class="progress-container">
                            <div class="item-header">
                                <div class="item-name">
                                    <div class="accordion-icon"></div>
                                    ${item.name}
                                    ${item.target ? `<span class="target-badge">${item.target}</span>` : ''}
                                </div>
                                <span class="item-amount">${item.current.toLocaleString()}${item.unit} / ${item.required.toLocaleString()}${item.unit}</span>
                            </div>
                            <div class="progress-bar">
                                <div class="progress-bar-inner ${statusBarClass}" style="width: ${percentage}%;"></div>
                            </div>
                        </div>
                    </summary>
                    <div class="accordion-content">
                        <ul class="stock-sub-list">${detailsHTML}</ul>
                        <button class="add-item-btn" data-id="${item.id}" data-name="${item.name}" data-unit="${item.unit}">＋ この品目を追加</button>
                    </div>
                </details>
            `;
        });
        listHTML += `</div>`;
    }
    listOutput.innerHTML = listHTML;
    
    const otherOutput = document.getElementById('other-stock-output');
    if (otherOutput) {
        otherOutput.innerHTML = '';
        if (otherItems.length > 0) {
            otherItems.forEach(item => {
                const li = document.createElement('li');
                li.className = 'stock-item-custom';
                let expiryText = item.expiry ? `期限: ${item.expiry}` : '期限なし';
                li.innerHTML = `
                    <div class="item-details">
                        <span class="item-name">${item.productName}</span>
                        <span class="item-amount">(${item.qty} ${item.unit || '個'})</span>
                        <span class="category-badge">${item.category || 'その他'}</span>
                        <span class="item-expiry">${expiryText}</span>
                    </div>
                    <div class="item-actions">
                        <button class="edit-btn" data-id="${item.id}">編集</button>
                        <button class="delete-btn" data-id="${item.id}">削除</button>
                    </div>
                `;
                otherOutput.appendChild(li);
            });
        } else {
            otherOutput.innerHTML = '<p>リストにない品目はまだ登録されていません。</p>';
        }

        otherOutput.addEventListener('click', (e) => {
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
    }

    listOutput.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-item-btn')) {
            const { id, name, unit } = e.target.dataset;
            const masterId = id.startsWith('custom-') ? null : id;
            sessionStorage.setItem('newItemFromTodo', JSON.stringify({ masterId, customId: id, name, unit }));
            window.location.hash = '#register';
        } else if (e.target.closest('.stock-sub-item')) {
            const itemId = e.target.closest('.stock-sub-item').dataset.id;
            sessionStorage.setItem('editItemId', itemId);
            window.location.hash = '#register';
        }
    });
  },

  register() {
    const editItemId = sessionStorage.getItem('editItemId');
    const data = storage.getAppData();
    const itemToEdit = editItemId ? data.stockItems.find(item => item.id === editItemId) : null;

    const titleEl = document.getElementById('register-title');
    const saveBtn = document.getElementById('saveItemBtn');
    const deleteBtn = document.getElementById('deleteItemBtn');
    const itemNameGroup = document.getElementById('item-name-group');
    const itemCategoryGroup = document.getElementById('item-category-group');
    const itemNameInput = document.getElementById('itemName');
    const itemCategorySelect = document.getElementById('itemCategory');
    const productNameInput = document.getElementById('productName');
    const itemQtyInput = document.getElementById('itemQty');
    const itemUnitInput = document.getElementById('itemUnit');
    const itemExpiryInput = document.getElementById('itemExpiry');
    let masterId = null;
    let customId = null;
    let itemName = '';
    
    itemNameGroup.style.display = 'block';
    itemCategoryGroup.style.display = 'none';
    itemNameInput.readOnly = true;
    itemNameInput.classList.add('readonly-input');

    if (itemToEdit) {
        titleEl.textContent = '備蓄品を編集';
        saveBtn.textContent = 'この内容で更新する';
        deleteBtn.style.display = 'block';
        masterId = itemToEdit.masterId;
        customId = itemToEdit.customId;
        itemName = itemToEdit.itemName;
        productNameInput.value = itemToEdit.productName || '';
        itemQtyInput.value = itemToEdit.qty;
        itemUnitInput.value = itemToEdit.unit;
        itemExpiryInput.value = itemToEdit.expiry || '';
        itemNameInput.value = itemName;
        deleteBtn.addEventListener('click', () => {
    if (confirm('この備蓄品を削除しますか？')) {
      const currentData = storage.getAppData();
      currentData.stockItems = currentData.stockItems.filter(item => item.id !== itemToEdit.id);
      storage.saveAppData(currentData);
      alert('備蓄品を削除しました！');
      sessionStorage.removeItem('editItemId');
      window.location.hash = '#stock';
    }
    });
    } else {
        titleEl.textContent = '新しい備蓄品を登録';
        saveBtn.textContent = '＋ この内容で登録する';
        deleteBtn.style.display = 'none';
        const newItemData = sessionStorage.getItem('newItemFromTodo');
        if (newItemData) {
            const item = JSON.parse(newItemData);
            masterId = item.masterId;
            customId = item.customId;
            itemName = item.name;
            itemUnitInput.value = item.unit;
            itemNameInput.value = itemName;
            itemUnitInput.readOnly = true;
            itemUnitInput.classList.add('readonly-input');
            sessionStorage.removeItem('newItemFromTodo');
        } else {
            titleEl.textContent = '新しい備蓄品を登録';
            itemNameInput.readOnly = false;
            itemNameInput.classList.remove('readonly-input');
            itemCategoryGroup.style.display = 'block';
        }
    }

    saveBtn.addEventListener('click', () => {
      const productName = productNameInput.value;
      const qty = parseFloat(itemQtyInput.value);
      const unit = itemUnitInput.value;
      const expiry = itemExpiryInput.value;
      const finalItemName = itemNameInput.value;
      
      if (!finalItemName || !productName || isNaN(qty) || !unit) {
        alert('品目名、商品名、数量、単位は必須です。');
        return;
      }

      const isCustomNew = !masterId && !customId && !itemToEdit;
      let finalCategory = '';
      if(isCustomNew){
          finalCategory = itemCategorySelect.value;
          if(!finalCategory){
               alert('カテゴリを選択してください。');
               return;
          }
      }

      const currentData = storage.getAppData();
      if (itemToEdit) {
          const itemIndex = currentData.stockItems.findIndex(item => item.id === itemToEdit.id);
          if (itemIndex > -1) {
              currentData.stockItems[itemIndex] = { ...itemToEdit, productName, qty, unit, expiry, itemName: finalItemName };
          }
      } else {
          if(!isCustomNew) {
            const masterItem = [...todoMasterList, ...currentData.customMasterItems].find(i => i.id === (masterId || customId));
            if(masterItem) finalCategory = masterItem.category;
          }
          
          const newItem = { 
              id: Date.now().toString(), 
              masterId, 
              customId, 
              itemName: finalItemName,
              category: finalCategory,
              productName, 
              qty, 
              unit, 
              expiry 
          };
          currentData.stockItems.push(newItem);
      }

      storage.saveAppData(currentData);
      sessionStorage.removeItem('editItemId');
      alert(itemToEdit ? '更新しました！' : '登録しました！');
      window.location.hash = '#stock';
    });
  },

  settings() {
    const data = storage.getAppData();
    // 設定フォームにlocalStorageの値を読み込む
    const noticeDays = data.settings.noticeDays || {};
    document.getElementById('noticeDays3').value = noticeDays['3'] || 7;
    document.getElementById('noticeDays7').value = noticeDays['7'] || 14;
    document.getElementById('noticeDays14').value = noticeDays['14'] || 30;

    // 設定保存ボタンのイベントリスナー
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        const currentData = storage.getAppData();
        currentData.settings.noticeDays = {
            '3': parseInt(document.getElementById('noticeDays3').value) || 7,
            '7': parseInt(document.getElementById('noticeDays7').value) || 14,
            '14': parseInt(document.getElementById('noticeDays14').value) || 30
        };
        storage.saveAppData(currentData);
        alert('設定を保存しました！');
        window.location.hash = '#home';
    });
    document.getElementById('resetDataBtn').addEventListener('click', () => {
        if (confirm('本当にすべてのデータをリセットしますか？この操作は元に戻せません。')) {
            localStorage.removeItem('StayStockedApp');
            alert('データをリセットしました');
            window.location.hash = '#home';
            location.reload();
        }
    });
    document.querySelector('a[href="#custom-list-editor"]').addEventListener('click', (e) => {
        e.preventDefault();
        window.location.hash = '#custom-list-editor';
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
                    <span class="item-expiry">${item.dailyQty ? `目標: 1人1日あたり ${item.dailyQty}${item.unit}` : '目標量なし'}</span>
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
              alert('品目名、カテゴリ、単位はすべて必須です。');
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
    const currentDays = data.settings.stockpileDays || 3; // ★★★ この行を追加 ★★★
    
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
