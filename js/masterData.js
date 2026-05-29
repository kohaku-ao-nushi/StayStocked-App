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
 *   note          : 用途・目安量・選び方などの補足説明（品目リスト画面のアコーディオンに表示）
 *
 * 計算根拠は docs/design.md セクション4.2 を参照。
 */
export const todoMasterList = [
  // ── 食品・飲料 ──────────────────────────────────────────────────────
  { id: 'water',        name: '水',                    category: '食品・飲料', unit: 'L',    target: '全員',
    note: '飲料水・調理用として1人1日3Lが目安（内閣府基準）。2Lペットボトル×2本で1人1日分。定期的に飲んで補充するローリングストック法が効果的。',
    calc: (p, d) => p.totalPeople * 3 * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'staple_food',  name: 'レトルトご飯・乾麺など', category: '食品・飲料', unit: '食',   target: '成人・子ども',
    note: '1人1日3食分を計上。火を使わずそのまま食べられるものも含めておくと安心。乾燥パスタ・アルファ米・カップ麺など種類を分散させると飽きにくい。',
    calc: (p, d) => (p.adults + p.children) * 3 * d,
    isNeeded: p => (p.adults + p.children) > 0 },

  // 缶詰は食事ごとに1人1缶ではなくシェアを前提に1.5食分/人/日で算出
  { id: 'side_dish',    name: '缶詰・レトルト食品',    category: '食品・飲料', unit: '食分', target: '成人・子ども',
    note: '主食の副菜として計上。1〜2缶を家族でシェアすることを想定し1.5食分／人／日で算出。さば缶・ツナ缶・焼き鳥缶など栄養バランスを考えて選ぶ。',
    calc: (p, d) => Math.ceil((p.adults + p.children) * d * 1.5),
    isNeeded: p => (p.adults + p.children) > 0 },

  { id: 'baby_food',    name: '粉ミルク・液体ミルク',  category: '食品・飲料', unit: '日分', target: '乳幼児',
    note: '乳幼児1人の1日分を計上。液体ミルクは缶・パックを開けてそのまま飲めるため断水時に特に有効。普段から使い慣れた銘柄を備蓄する。',
    calc: (p, d) => p.infants * d,
    isNeeded: p => p.infants > 0 },

  { id: 'elderly_food', name: 'おかゆ・介護食',        category: '食品・飲料', unit: '食',   target: '高齢者',
    note: '高齢者の咀嚼・消化を補助する食品。主食の代替ではなく嗜好・補助品として追加計上。レトルトおかゆ・ゼリー飲料・とろみ剤なども含めて選択する。',
    calc: (p, d) => p.elderly * 3 * d,
    isNeeded: p => p.elderly > 0 },

  { id: 'sweets',       name: 'お菓子・嗜好品',        category: '食品・飲料', unit: '袋',   target: '全員',
    note: '避難時のストレス緩和・気分転換に有効。子どもがいる家庭では特に重要。3日に1袋を目安。チョコレートやビスケットなど高カロリーで日持ちするものが向く。',
    calc: (p, d) => p.totalPeople * Math.ceil(d / 3),
    isNeeded: p => p.totalPeople > 0 },

  // ── 衛生用品 ──────────────────────────────────────────────────────
  { id: 'portable_toilet', name: '携帯トイレ・簡易トイレ', category: '衛生用品', unit: '回分', target: '全員',
    note: '断水・排水管破損時に使用。1人1日5回使用を想定。凝固剤・消臭袋付きのセットを選ぶ。段ボール+便座タイプの簡易トイレと組み合わせると使いやすい。',
    calc: (p, d) => p.totalPeople * 5 * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'tissue',          name: 'ティッシュペーパー',     category: '衛生用品', unit: '箱',   target: '全員',
    note: '鼻水・清拭・簡易的な拭き取りに使用。1週間で2箱を目安。ウェットティッシュと用途を分けて備蓄する。',
    calc: (p, d) => Math.ceil(d / 7) * 2,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'toilet_paper',    name: 'トイレットペーパー',     category: '衛生用品', unit: 'ロール', target: '全員',
    note: '携帯トイレ使用時にも必要。10人日で1ロールを目安。圧縮タイプは省スペースで備蓄できる。シングルの方が枚数が多く経済的。',
    calc: (p, d) => Math.ceil(p.totalPeople * d / 10),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'wet_tissue',      name: '除菌ウェットティッシュ', category: '衛生用品', unit: '個',   target: '全員',
    note: '断水時の手指・食卓の清拭に使用。3日で1パック（70〜80枚入り）を目安。アルコール含有のものは手指消毒にも使える。',
    calc: (p, d) => p.totalPeople * Math.ceil(d / 3),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'wet_body_towel',  name: 'ウェットボディタオル',   category: '衛生用品', unit: '枚',   target: '全員',
    note: '断水でシャワーが使えない場合の全身清拭に使用。1人1日1枚を目安。大判タイプを選ぶと体全体を拭ける。温めて使うとより快適。',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'mask',            name: 'マスク',                 category: '衛生用品', unit: '枚',   target: '全員',
    note: '感染予防・粉塵（土砂・煙）の吸入防止に使用。1人1日1枚を目安。不織布マスクが効果的。避難所では感染症対策として特に重要。',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'diapers',         name: 'おむつ',                 category: '衛生用品', unit: '日分', target: '乳幼児',
    note: '乳幼児1人の1日使用量を計上。月齢に合ったサイズを備蓄する。おしりふきも忘れずセットで用意する。',
    calc: (p, d) => p.infants * d,
    isNeeded: p => p.infants > 0 },

  // 月経対象年齢（子ども女性・成人女性）のみ。月経周期30日中5日、1周期20枚で算出。
  { id: 'sanitary_pads',   name: '生理用品',               category: '衛生用品', unit: '個',   target: '女性',
    note: '月経周期（約30日中5日）を考慮して算出。1周期20枚を目安に、日数に応じた数を計上。ナプキンのほかタンポン・月経カップも選択肢に。',
    calc: (p, d) => p.females_menstrual * Math.ceil(d / 5) * 20,
    isNeeded: p => p.females_menstrual > 0 },

  { id: 'alcohol_disinfectant', name: 'アルコール消毒液',  category: '衛生用品', unit: '本',   target: '全員',
    note: '手指消毒・衛生管理に使用。500ml入りで3人あたり1本を目安。濃度70〜80%のエタノール製品が有効。ポンプ式が使いやすい。',
    calc: p => Math.max(1, Math.ceil(p.totalPeople / 3)),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'vinyl_gloves',    name: 'ビニール手袋',            category: '衛生用品', unit: '枚',   target: '全員',
    note: '汚物処理・食料取り扱い時の衛生管理に使用。1人2枚（予備含む）を目安。使い捨てタイプを選ぶ。Mサイズを多めに備蓄しておくと汎用的。',
    calc: p => p.totalPeople * 2,
    isNeeded: p => p.totalPeople > 0 },

  // ── 医療・医薬 ──────────────────────────────────────────────────────
  { id: 'first_aid_kit',   name: '救急箱',                  category: '医療・医薬', unit: '箱',   target: '全員',
    note: '絆創膏・包帯・消毒液・三角巾・解熱鎮痛剤・胃腸薬などの基本セット。世帯に1箱。中身を定期的に確認し期限切れの薬は補充する。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // 常備薬は記録用として日分で計上（実際の種類・数量はユーザー管理）
  { id: 'regular_medicine', name: '常備薬・持病の薬',       category: '医療・医薬', unit: '日分', target: '全員',
    note: '持病の薬（血圧・糖尿病・精神科など）は災害時に最も入手困難になる。かかりつけ医に相談して多めに処方してもらう。お薬手帳のコピーも一緒に保管する。',
    calc: (p, d) => p.totalPeople * d,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'thermometer',      name: '体温計',                  category: '医療・医薬', unit: '本',   target: '全員',
    note: '発熱確認に必須。電池式は電池切れに注意し予備電池も用意する。避難所での感染症スクリーニングにも使用される。世帯に1本。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ── 生活用品 ──────────────────────────────────────────────────────
  { id: 'cassette_stove',   name: 'カセットコンロ',          category: '生活用品', unit: '台',    target: '全員',
    note: '停電・断ガス時の調理に使用。世帯に1台。カセットガスの残量を定期確認する。屋内使用は換気を十分に行うこと。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // 1本60分使用。1日2回の調理（計80分）で1.34本/日
  { id: 'cassette_gas',     name: 'カセットボンベ',          category: '生活用品', unit: '本',    target: '全員',
    note: '1本（250g）で約60分使用可能。1日2回の調理（計80分）で約1.34本を使用する計算。高温・直射日光を避けて保管。使用期限は約7年。',
    calc: (p, d) => Math.ceil(d * 1.34),
    isNeeded: p => p.totalPeople > 0 },

  { id: 'food_wrap',        name: '食品用ラップ',             category: '生活用品', unit: '本',    target: '全員',
    note: '食器に巻いて洗い物を省く使い方が特に有効。断水時に水の節約につながる。食品の保存・おにぎりを包む際にも活躍。世帯に1本（30cm幅50m程度）。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'poly_bag',         name: 'ポリ袋',                  category: '生活用品', unit: '箱',    target: '全員',
    note: 'ゴミ袋・携帯トイレの袋・雨具・防水収納など多用途に使用。大（45L）・小（10〜15L）を各1箱備蓄。袋炊飯（ポリ袋でご飯を炊く方法）にも使える。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ランタンは2人に1台（共有できる据え置き型）
  { id: 'flashlight',       name: '懐中電灯・ランタン',       category: '生活用品', unit: '個',    target: '全員',
    note: '停電時の照明。ランタンは部屋全体を照らせるため据え置きに向く。LED式が電池持ちが良くおすすめ。電池残量を定期確認する。2人に1台を目安。',
    calc: p => Math.max(1, Math.ceil(p.totalPeople / 2)),
    isNeeded: p => p.totalPeople > 0 },

  // ヘッドライトは1人1台（避難移動時に両手が使えるよう全員分）
  { id: 'headlight',        name: 'ヘッドライト',             category: '生活用品', unit: '個',    target: '全員',
    note: '避難移動時に両手が使えるよう1人1台推奨。乾電池式が安心。明るさ100〜300ルーメン程度のものを選ぶ。就寝時の手元照明としても使いやすい。',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'batteries',        name: '乾電池',                  category: '生活用品', unit: 'セット', target: '全員',
    note: '懐中電灯・ヘッドライト・ラジオなど多くの機器に必要。単1・単2・単3・単4をセットで備蓄。使用機器に合わせたサイズを確認する。アルカリ電池が長持ち。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'mobile_battery',   name: '携帯充電器',               category: '生活用品', unit: '個',    target: '全員',
    note: 'スマートフォンの充電用。容量10,000mAh以上を推奨（スマホ約2〜3回分充電可能）。1人1台が理想。満充電の状態で保管し、半年に1度は補充電する。',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // 停電時の情報収集に必須。手回し・ソーラー対応のものを推奨
  { id: 'disaster_radio',   name: '防災ラジオ（手回し対応）', category: '生活用品', unit: '台',    target: '全員',
    note: '停電時の情報収集に必須。電池切れを気にしない手回し発電・ソーラー充電対応のものを選ぶ。AM/FMに加えてワイドFM対応だと受信エリアが広がる。世帯に1台。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'duct_tape',        name: 'ガムテープ',               category: '生活用品', unit: '個',    target: '全員',
    note: '割れた窓の飛散防止・応急修理・荷物の固定・目印づけなど多用途。布テープ（強粘着タイプ）が汎用的。世帯に1個（50m巻き程度）。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'work_gloves',      name: '軍手',                    category: '生活用品', unit: '双',    target: '全員',
    note: '瓦礫の除去・作業時の手の保護に使用。厚手の革手袋や耐切創手袋が望ましい。1人1双。普段の軍手よりもやや厚手のものを選ぶ。',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // ── 防災装備 ──────────────────────────────────────────────────────
  { id: 'helmet',           name: '防災頭巾・ヘルメット',      category: '防災装備', unit: '個',    target: '全員',
    note: '地震時の落下物・飛散物から頭を守る。寝室や玄関に置いておくと素早く装着できる。防災頭巾は子ども向けに多い。成人はヘルメットが推奨。1人1個。',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'whistle',          name: 'ホイッスル',               category: '防災装備', unit: '個',    target: '全員',
    note: '建物内に閉じ込められた場合の救難信号用。大きな声が出せない状況や、体力が消耗した状況で有効。1人1個。笛のついたホイッスルは音が遠くまで届く。',
    calc: p => p.totalPeople,
    isNeeded: p => p.totalPeople > 0 },

  // ── 書類・現金 ──────────────────────────────────────────────────────
  // 数量1は「準備済みか否か」の確認用。実際の内容はユーザー管理。
  { id: 'important_docs',   name: '重要書類のコピー',          category: '書類・現金', unit: 'セット', target: '全員',
    note: '保険証・通帳・権利書・マイナンバーカード・パスポートなどのコピーを防水袋に入れて保管。データはクラウドやUSBにも保存。世帯に1セット。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  { id: 'cash',             name: '現金・小銭',               category: '書類・現金', unit: 'セット', target: '全員',
    note: '停電時は電子決済・ATMが使えない場合がある。1〜2万円を目安に、100円・10円・1円などの小銭も用意する。自販機や地域の支援物資でも小銭が役立つ。',
    calc: () => 1,
    isNeeded: p => p.totalPeople > 0 },

  // ── ペット用品 ──────────────────────────────────────────────────────
  { id: 'pet_food',         name: 'ペットフード',             category: 'ペット用品', unit: '日分', target: 'ペット',
    note: 'ペット1頭の1日分を計上。普段から食べ慣れたものを備蓄する（慣れていない食事は拒否することがある）。缶詰・ドライフードを組み合わせて保管。',
    calc: (p, d) => p.pets * d,
    isNeeded: p => p.pets > 0 },

  { id: 'pet_toilet',       name: 'ペット用トイレ用品',        category: 'ペット用品', unit: '日分', target: 'ペット',
    note: 'ペット1頭の1日使用量を計上。猫砂・ペットシーツなど種別に応じて選択。避難所ではペット同伴不可の場合もあるため、ペット可の避難場所も事前に確認する。',
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
      // 月経対象年齢：子ども(3〜17)・若年(18〜39)・中年(40〜64)の女性
      if (['子ども','若年','中年','成人'].includes(ageGroup)) p.females_menstrual++;
    }
    if (ageGroup === '乳幼児')                          p.infants++;
    else if (ageGroup === '子ども')                     p.children++;
    else if (ageGroup === '若年' || ageGroup === '中年' || ageGroup === '成人') p.adults++;
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
