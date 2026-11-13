"use strict";

(() => {
  const $ = selector => document.querySelector(selector);

  const esc = value => String(value ?? "").replace(
    /[&<>"']/g,
    character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character])
  );

  const uid = () =>
    Date.now().toString(36) + Math.random().toString(36).slice(2);

  const round = value =>
    Math.round((Number(value) + Number.EPSILON) * 100) / 100;

  function today() {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  const page = document.body.dataset.page || "home";
  const DATABASE_NAME = "bunny-yanice-v5";

  const navigation = [
    ["home", "index.html", "我的小窩"],
    ["ledger", "ledger.html", "收支手帳"],
    ["shopping", "shopping.html", "購物清單"],
    ["analytics", "analytics.html", "消費分析"],
    ["goals", "goals.html", "願望罐"],
    ["feed", "feed.html", "生活圈"],
    ["settings", "settings.html", "設定"]
  ];

  const currencies = [
    "HKD", "CNY", "USD", "EUR", "GBP", "JPY", "KRW", "TWD",
    "SGD", "AUD", "CAD", "CHF", "NZD", "THB", "MYR", "INR", "AED"
  ];

  // 示範參考值，並非即時市場匯率。
  const reference = {
    HKD: 7.8, CNY: 7.2, USD: 1, EUR: 0.92, GBP: 0.79,
    JPY: 150, KRW: 1350, TWD: 32, SGD: 1.35, AUD: 1.52,
    CAD: 1.37, CHF: 0.9, NZD: 1.65, THB: 36,
    MYR: 4.7, INR: 83, AED: 3.6725
  };

  const breeds = ["侏儒兔", "垂耳兔", "長毛垂耳兔", "道奇兔"];

  const coats = [
    { fur: "#ead6ba", accent: "#886047", soft: "#f5ebdf" },
    { fur: "#bba59f", accent: "#935c75", soft: "#fae9f0" },
    { fur: "#777173", accent: "#626780", soft: "#eeeff7" },
    { fur: "#fff8ec", accent: "#a64f70", soft: "#fae8ee" }
  ];

  const expenseCats = ["餐飲", "交通", "購物", "娛樂", "學習", "其他"];
  const incomeCats = ["薪金", "零用錢", "兼職", "禮金", "其他"];

  let S;
  let db;
  let queue = Promise.resolve();
  let month = today().slice(0, 7);
  let filters = { q: "", type: "", category: "" };
  let feedFilter = "all";
  let petDraft;
  let onboardingDraft = null;
  let onboardingStep = 1;

  let gallery = [];
  let photoIndex = 0;
  let previewImages = [];
  let previewToken = 0;

  let toastTimer;
  let avatarToken = 0;
  let avatarSaving = false;
  let avatarTask = Promise.resolve(true);
  let refreshGeneration = 0;
  let channel;

  try {
    channel = new BroadcastChannel("bunny-yanice");
  } catch {}

  const words = {
    "我的小窩": ["我的小窝", "Home"],
    "收支手帳": ["收支手账", "Journal"],
    "購物清單": ["购物清单", "Shopping"],
    "消費分析": ["消费分析", "Insights"],
    "願望罐": ["愿望罐", "Wishes"],
    "生活圈": ["生活圈", "Moments"],
    "設定": ["设置", "Settings"],
    "新增記帳": ["新增记账", "Add record"],
    "本月收入": ["本月收入", "Monthly income"],
    "本月支出": ["本月支出", "Monthly spending"],
    "本月結餘": ["本月结余", "Monthly balance"],
    "預算剩餘": ["预算剩余", "Budget left"],
    "收入": ["收入", "Income"],
    "支出": ["支出", "Expense"],
    "儲存": ["保存", "Save"],
    "取消": ["取消", "Cancel"],
    "關閉": ["关闭", "Close"],
    "查看": ["查看", "View"],
    "編輯": ["编辑", "Edit"],
    "刪除": ["删除", "Delete"],
    "日期": ["日期", "Date"],
    "分類": ["分类", "Category"],
    "備註": ["备注", "Note"],
    "金額": ["金额", "Amount"],
    "貨幣": ["货币", "Currency"],
    "類型": ["类型", "Type"],
    "照片": ["照片", "Photos"],
    "全部": ["全部", "All"],
    "餐飲": ["餐饮", "Food"],
    "交通": ["交通", "Transport"],
    "購物": ["购物", "Shopping"],
    "娛樂": ["娱乐", "Fun"],
    "學習": ["学习", "Study"],
    "其他": ["其他", "Other"],
    "薪金": ["工资", "Salary"],
    "零用錢": ["零用钱", "Allowance"],
    "兼職": ["兼职", "Part-time"],
    "禮金": ["礼金", "Gift"],
    "最近記錄": ["最近记录", "Recent records"],
    "每日支出": ["每日支出", "Daily spending"],
    "分類分布": ["分类分布", "Categories"],
    "消費日曆": ["消费日历", "Spending calendar"],
    "本月預算": ["本月预算", "Monthly budget"],
    "分類預算": ["分类预算", "Category budgets"],
    "調整預算": ["调整预算", "Edit budget"],
    "新增願望": ["新增愿望", "New wish"],
    "願望名稱": ["愿望名称", "Wish name"],
    "目標金額": ["目标金额", "Target amount"],
    "目標日期": ["目标日期", "Target date"],
    "存一點": ["存一点", "Add savings"],
    "已完成": ["已完成", "Completed"],
    "分享達標": ["分享达标", "Share milestone"],
    "隱藏金額": ["隐藏金额", "Hide amount"],
    "發布動態": ["发布动态", "New moment"],
    "內容": ["内容", "Text"],
    "生活": ["生活", "Life"],
    "記帳": ["记账", "Money"],
    "暱稱": ["昵称", "Nickname"],
    "個人簡介": ["个人简介", "Bio"],
    "頭像": ["头像", "Avatar"],
    "選擇頭像": ["选择头像", "Choose avatar"],
    "移除頭像": ["移除头像", "Remove avatar"],
    "主要貨幣": ["主要货币", "Reporting currency"],
    "語言": ["语言", "Language"],
    "兔兔名字": ["兔兔名字", "Bunny name"],
    "侏儒兔": ["侏儒兔", "Netherland dwarf"],
    "垂耳兔": ["垂耳兔", "Holland lop"],
    "長毛垂耳兔": ["长毛垂耳兔", "Fuzzy lop"],
    "道奇兔": ["道奇兔", "Dutch rabbit"],
    "更換兔兔": ["更换兔兔", "Change bunny"],
    "配飾": ["配饰", "Accessory"],
    "沒有": ["没有", "None"],
    "蝴蝶結": ["蝴蝶结", "Bow"],
    "圍巾": ["围巾", "Scarf"],
    "大額支出門檻": ["大额支出门槛", "Large expense"],
    "大額收入門檻": ["大额收入门槛", "Large income"],
    "參考匯率": ["参考汇率", "Reference rates"],
    "匯出備份": ["导出备份", "Export backup"],
    "恢復備份": ["恢复备份", "Restore backup"],
    "匯出 CSV": ["导出 CSV", "Export CSV"],
    "自訂商品": ["自定义商品", "Custom item"],
    "商品名稱": ["商品名称", "Item name"],
    "單價": ["单价", "Unit price"],
    "數量": ["数量", "Quantity"],
    "加入": ["加入", "Add"],
    "咖啡": ["咖啡", "Coffee"],
    "筆記本": ["笔记本", "Notebook"],
    "三明治": ["三明治", "Sandwich"],
    "折扣百分比": ["折扣百分比", "Discount %"],
    "優惠金額": ["优惠金额", "Coupon"],
    "購物預算": ["购物预算", "Shopping budget"],
    "應付總額": ["应付总额", "Total"],
    "小計": ["小计", "Subtotal"],
    "確認購買並記帳": ["确认购买并记账", "Purchase & record"],
    "搜尋": ["搜索", "Search"],
    "自動折算": ["自动折算", "Converted"],
    "移除原有照片": ["移除原有照片", "Remove old photos"],
    "達標紀念": ["达标纪念", "Wish fulfilled"],
    "下一步": ["下一步", "Next"],
    "開始我的手帳": ["开始我的手账", "Open my journal"],
    "確定刪除？": ["确定删除？", "Delete this item?"],
    "已儲存": ["已保存", "Saved"],
    "儲存失敗": ["保存失败", "Could not save"],
    "暫無記錄": ["暂无记录", "No records yet"],
    "最多三張照片，每張上限 8 MB。": [
      "最多三张照片，每张上限 8 MB。",
      "Up to three photos, 8 MB each."
    ],
    "金額必須大於零": ["金额必须大于零", "Amount must be positive"],
    "帳目及照片會自動同步至生活圈。": [
      "账目和照片会自动同步到生活圈。",
      "Records and photos automatically appear in Moments."
    ],
    "新照片會取代原有照片。": [
      "新照片会替换原有照片。",
      "New photos replace existing ones."
    ],
    "先打折，再扣優惠金額。": [
      "先打折，再扣优惠金额。",
      "Discount applies before coupon."
    ],
    "這是本機生活圈，沒有發布到網上。": [
      "这是本机生活圈，没有发布到网上。",
      "Moments are stored locally, not published online."
    ],
    "儲蓄投入不計入消費支出。": [
      "储蓄投入不计入消费支出。",
      "Savings are separate from expenses."
    ],
    "示範匯率並非即時報價，舊帳保留原有匯率。": [
      "示范汇率不是实时报价，旧账保留原有汇率。",
      "Illustrative rates, not live quotes. Existing records retain their rates."
    ],
    "有財務資料後，主要貨幣會鎖定。": [
      "有财务数据后，主要货币会锁定。",
      "Reporting currency is locked once financial data exists."
    ],
    "五筆記帳解鎖蝴蝶結；完成願望解鎖圍巾。": [
      "五笔记账解锁蝴蝶结；完成愿望解锁围巾。",
      "Five records unlock a bow; a fulfilled wish unlocks a scarf."
    ],
    "請先填寫內容或加入照片": [
      "请先填写内容或加入照片",
      "Add text or photos first"
    ],
    "備份格式錯誤": ["备份格式错误", "Invalid backup"],
    "恢復會取代目前資料，繼續？": [
      "恢复会替换当前数据，继续？",
      "Restore replaces current data. Continue?"
    ],
    "請定期備份，清除瀏覽器資料可能令記錄遺失。": [
      "请定期备份，清除浏览器数据可能导致记录丢失。",
      "Back up regularly. Clearing browser data may erase records."
    ]
  };

  function t(key) {
    return S?.lang === "en" ? words[key]?.[1] || key :
      S?.lang === "sc" ? words[key]?.[0] || key : key;
  }

  function say(tc, sc, en) {
    return S?.lang === "en" ? en : S?.lang === "sc" ? sc : tc;
  }

  function money(value, currency = S.base) {
    return currency + " " + Number(value).toLocaleString(
      S.lang === "en" ? "en-GB" : S.lang === "sc" ? "zh-CN" : "zh-HK",
      { minimumFractionDigits: 2, maximumFractionDigits: 2 }
    );
  }

  function ratesFor(base) {
    return Object.fromEntries(currencies.map(currency => [
      currency,
      Number((reference[base] / reference[currency]).toFixed(8))
    ]));
  }

  function initial() {
    return {
      version: 5,
      lang: "tc",
      base: "HKD",
      rates: ratesFor("HKD"),
      profile: { name: "", bio: "", avatar: "" },
      pet: null,
      ready: false,
      limits: { expense: 500, income: 3000 },
      entries: [],
      posts: [],
      goals: [],
      budgets: {},
      cart: [],
      shop: { discount: 0, coupon: 0, budget: 0 }
    };
  }

  const records = () => S.entries.filter(entry => entry.date.startsWith(month));

  const sum = (list, type) => round(list
    .filter(entry => entry.type === type)
    .reduce((total, entry) => total + entry.converted, 0));

  const saved = goal => round(
    goal.contributions.reduce((total, item) => total + item.amount, 0)
  );

  const hasFinancial = state =>
    state.entries.length ||
    state.goals.length ||
    state.cart.length ||
    Object.keys(state.budgets).length;

  /* ---------------- Illustrations ---------------- */

  function ears(pet = S?.pet) {
    const lop = [1, 2].includes(pet?.breed);

    return `<svg viewBox="0 0 24 26" fill="none"
      stroke="currentColor" stroke-width="1.5" aria-hidden="true">
      ${lop
        ? '<path d="M6 11C0 9 2 23 5 18l3-5m10-2c6-2 4 12 1 7l-3-5"/>'
        : '<path d="M8 12C2-2 10-2 10 11m4 0c0-13 8-13 2 1"/>'}
      <path d="M5 16c0-9 14-9 14 0s-14 9-14 0Z"/>
      <path d="M9 16h.1M15 16h.1M11 19h2"/>
    </svg>`;
  }

  function rabbit(mood = "calm", pet = S?.pet) {
    pet = pet || { breed: 0, coat: 3, accessory: "" };

    const breed = pet.breed;
    const fur = coats[pet.coat].fur;
    const stroke = "#6d574f";
    const white = "#fffaf1";
    const lop = breed === 1 || breed === 2;
    const fuzzy = breed === 2;
    const dutch = breed === 3;
    const happy = ["happy", "excited"].includes(mood);

    return `<svg class="rabbit" viewBox="0 0 240 220"
      role="img" aria-label="${esc(t(breeds[breed]))}">
      <ellipse cx="126" cy="204" rx="72" ry="7"
        fill="#d9c9bd" opacity=".6"/>
      <circle cx="185" cy="164" r="${fuzzy ? 21 : 16}"
        fill="${white}" stroke="${stroke}" stroke-width="1.6"/>
      <ellipse cx="132" cy="160" rx="${breed === 0 ? 55 : 65}" ry="43"
        fill="${fur}" stroke="${stroke}" stroke-width="1.6"/>

      ${dutch ? `<path d="M99 119q20-10 36-1l8 80q-27 7-44-5Z"
        fill="${white}"/>` : ""}

      <ellipse cx="92" cy="194" rx="26" ry="9"
        fill="${dutch ? white : fur}" stroke="${stroke}" stroke-width="1.4"/>
      <ellipse cx="158" cy="194" rx="27" ry="9"
        fill="${fur}" stroke="${stroke}" stroke-width="1.4"/>

      ${!lop ? `
        <path d="M81 94Q60 23 77 17Q94 12 101 90M111 90Q113 19 132 20Q149 25 130 97"
          fill="${fur}" stroke="${stroke}" stroke-width="1.6"/>
        <path d="M83 74Q73 32 79 30Q88 31 92 77M120 77Q125 33 132 33Q138 37 128 80"
          fill="#deb5b3"/>
      ` : ""}

      ${fuzzy ? `<path d="m61 110-11 14 9 8-9 14 13 5-7 15 17 1-1 15 17-5 10 12 14-9 14 8 9-13 18 4 1-15 13-6-8-14 8-13-13-8 4-15-16 1-5-12-14 6-11-9-12 9-13-5-6 12Z"
        fill="${fur}" stroke="${stroke}" stroke-width="1.3"/>` : ""}

      <ellipse cx="101" cy="117" rx="${breed === 0 ? 42 : 46}"
        ry="${breed === 0 ? 38 : 41}"
        fill="${fur}" stroke="${stroke}" stroke-width="1.6"/>

      ${dutch ? `<path d="m101 77-14 38q-9 20-1 35 16 10 33-1 6-16-4-34Z"
        fill="${white}"/>` : ""}

      ${lop ? `
        <path d="M65 88Q39 85 40 121l4 33q5 17 16 5l16-50M136 87q25 3 22 37l-7 32q-6 14-15 1l-10-46"
          fill="${fur}" stroke="${stroke}" stroke-width="1.6"/>
        <path d="M54 105q-7 21-1 43m91-42q7 21-1 42"
          stroke="#deb5b3" stroke-width="7" fill="none" stroke-linecap="round"/>
      ` : ""}

      ${fuzzy ? `<path d="m69 93 8-12 8 6 10-11 8 8 12-7 5 11 12-3"
        fill="${fur}" stroke="${stroke}" stroke-width="1.3"/>` : ""}

      ${happy
        ? '<path d="M77 116q6-10 12 0m25 0q6-10 12 0" fill="none" stroke="#382b26" stroke-width="2.6" stroke-linecap="round"/>'
        : `<ellipse cx="83" cy="114" rx="${mood === "surprised" ? 5 : 3.7}"
            ry="${mood === "surprised" ? 6.5 : 4.8}" fill="#382b26"/>
           <ellipse cx="120" cy="114" rx="${mood === "surprised" ? 5 : 3.7}"
            ry="${mood === "surprised" ? 6.5 : 4.8}" fill="#382b26"/>
           <circle cx="84" cy="112" r="1.2" fill="white"/>
           <circle cx="121" cy="112" r="1.2" fill="white"/>`}

      ${mood === "worried"
        ? '<path d="m77 102 10 4m29 0 10-4" stroke="#6d574f" stroke-width="2" fill="none"/>'
        : ""}

      <ellipse cx="75" cy="128" rx="9" ry="5" fill="#e8a7ab" opacity=".65"/>
      <ellipse cx="129" cy="128" rx="9" ry="5" fill="#e8a7ab" opacity=".65"/>
      <ellipse cx="92" cy="133" rx="11" ry="8" fill="${white}" opacity=".65"/>
      <ellipse cx="111" cy="133" rx="11" ry="8" fill="${white}" opacity=".65"/>
      <path d="M97 127q5-4 10 0l-5 4Z" fill="#ad797a"/>

      ${happy
        ? '<path d="M95 135q7 12 14 0" fill="#a96e7c" stroke="#6d574f"/>'
        : mood === "surprised"
          ? '<ellipse cx="102" cy="139" rx="3" ry="4" fill="#6d574f"/>'
          : mood === "worried"
            ? '<path d="M96 140q6-6 12 0" fill="none" stroke="#6d574f" stroke-width="1.4"/>'
            : '<path d="M102 131v5m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="#6d574f" stroke-width="1.3"/>'}

      <path d="m75 134-18-4m19 10-20 3m72-9 18-4m-19 10 20 3"
        fill="none" stroke="${stroke}"/>

      ${pet.accessory === "bow"
        ? '<path d="m100 160-16-9v21l16-8 16 8v-21Z" fill="var(--accent)"/><circle cx="100" cy="162" r="4" fill="#edbecb"/>'
        : ""}

      ${pet.accessory === "scarf"
        ? '<path d="M66 150q36 20 72 0v12q-36 18-71 0Z" fill="var(--accent)"/><path d="m117 165 5 27 15-5-8-26" fill="var(--accent)"/>'
        : ""}

      ${mood === "excited"
        ? '<path d="m176 54 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="var(--accent)"/>'
        : ""}
    </svg>`;
  }

  function jar() {
    return `<svg class="jar" viewBox="0 0 70 82" fill="none" aria-hidden="true">
      <path d="M24 18c-15-23-8-25-2-11l7 12m14-1c16-23 9-25 3-11l-7 12"
        fill="#f1c7d3" stroke="#a66b80" stroke-width="1.7"/>
      <rect x="15" y="17" width="40" height="10" rx="4"
        fill="#d8b296" stroke="#9b775f" stroke-width="1.5"/>
      <rect x="10" y="27" width="50" height="50" rx="15"
        fill="var(--soft)" stroke="var(--accent)" stroke-width="1.7"/>
      <path d="M22 40h26" stroke="var(--accent)" stroke-width="2"/>
      <circle cx="26" cy="53" r="2" fill="#76545b"/>
      <circle cx="44" cy="53" r="2" fill="#76545b"/>
      <path d="M31 61q4 5 8 0" stroke="#76545b" stroke-width="1.5"/>
    </svg>`;
  }

  function navIcon(index) {
    const paths = [
      '<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',
      '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
      '<path d="M3 4h2l3 12h11l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
      '<path d="M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3"/>',
      '<path d="M8 4h8v4l4 3v8H4v-8l4-3Z"/><path d="M9 13h6"/>',
      '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8m-8 4h5"/>',
      '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
    ];

    return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.7"
      stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${paths[index]}
    </svg>`;
  }

  /* ---------------- UI ---------------- */

  function btn(label, action, key = "", cls = "") {
    return `<button type="button" class="${cls}"
      data-action="${action}" data-id="${esc(key)}">
      ${cls.includes("primary") ? ears() : ""}${t(label)}
    </button>`;
  }

  function submit(label = "儲存") {
    return `<button type="submit" class="primary">${ears()}${t(label)}</button>`;
  }

  function field(label, html) {
    return `<label class="field">${t(label)}${html}</label>`;
  }

  function opts(list, value, translate = true) {
    return list.map(item =>
      `<option value="${esc(item)}" ${item === value ? "selected" : ""}>
        ${esc(translate ? t(item) : item)}
      </option>`
    ).join("");
  }

  function head(label, description = "", action = "") {
    return `<div class="pagehead">
      <div><h1>${t(label)}</h1><p>${description}</p></div>${action}
    </div>`;
  }

  function empty() {
    return `<div class="empty">${ears()}
      <strong>${t("暫無記錄")}</strong>
      <p>${esc(say(
        "記低第一筆小日常啦～",
        "记下第一笔小日常吧～",
        "Start with one little moment."
      ))}</p>
    </div>`;
  }

  function modalHead(label) {
    return `<div class="dialog-head"><h2>${t(label)}</h2>
      <button type="button" data-action="close" aria-label="Close">×</button>
    </div>`;
  }

  function actions() {
    return `<div class="actions">${btn("取消", "close")}${submit()}</div>`;
  }

  function show(html, wide = false) {
    const dialog = $("#modal");
    if (dialog.open) dialog.close();

    dialog.className = wide ? "wide" : "";
    dialog.innerHTML = html;
    dialog.showModal();
  }

  function notify(message) {
    const toast = $("#toast");
    if (!toast) return;

    clearTimeout(toastTimer);
    toast.textContent = message;
    toastTimer = setTimeout(() => {
      if (toast.textContent === message) toast.textContent = "";
    }, 5000);
  }

  function avatar(source = S.profile.avatar) {
    return source
      ? `<img class="avatar" src="${esc(source)}" alt="${t("頭像")}">`
      : `<span class="avatar">${esc((S.profile.name || "B").slice(0, 1))}</span>`;
  }

  function photos(images, kind, key, small = false) {
    if (!images.length) return "";

    return `<div class="${small
      ? "thumbs"
      : "post-photos " + (images.length === 1 ? "one" : "")}">
      ${images.map((source, index) =>
        `<button type="button" class="photo" data-action="photo"
          data-kind="${kind}" data-id="${esc(key)}" data-index="${index}"
          aria-label="${t("查看")} ${t("照片")} ${index + 1}">
          <img src="${esc(source)}" alt="${t("照片")} ${index + 1}" loading="lazy">
        </button>`
      ).join("")}
    </div>`;
  }

  function table(list, limit = 999) {
    if (!list.length) return empty();

    return `<div class="table-wrap"><table>
      <thead><tr>${["日期", "分類", "備註", "金額", ""]
        .map(key => `<th>${t(key)}</th>`).join("")}</tr></thead>
      <tbody>${[...list]
        .sort((a, b) => b.date.localeCompare(a.date) || b.created - a.created)
        .slice(0, limit)
        .map(entry => `
          <tr>
            <td class="tiny">${esc(entry.date)}</td>
            <td><span class="tag">${t(entry.category)}</span></td>
            <td class="record-note">
              ${esc(entry.note || "—")}${photos(entry.images, "entry", entry.id, true)}
            </td>
            <td class="money ${entry.type}">
              ${entry.type === "income" ? "+" : "−"}${money(entry.converted)}
              ${entry.currency !== S.base
                ? `<div class="tiny muted">${money(entry.amount, entry.currency)}</div>`
                : ""}
            </td>
            <td><div class="row" style="justify-content:flex-end;gap:3px">
              ${btn("查看", "viewEntry", entry.id)}
              ${btn("編輯", "editEntry", entry.id)}
              ${btn("刪除", "deleteEntry", entry.id, "quiet")}
            </div></td>
          </tr>`).join("")}
      </tbody>
    </table></div>`;
  }

  function monthInput() {
    return `<input class="month-input" id="monthInput" type="month"
      value="${month}" aria-label="Month">`;
  }

  function chart() {
    const days = new Date(
      Number(month.slice(0, 4)), Number(month.slice(5)), 0
    ).getDate();

    const values = Array.from({ length: days }, (_, index) =>
      sum(records().filter(entry => Number(entry.date.slice(8)) === index + 1), "expense")
    );

    const max = Math.max(...values, 1);

    return `<div class="chart" role="img" aria-label="${t("每日支出")}">
      ${values.map((value, index) =>
        `<i style="height:${value / max * 150}px"
          title="${index + 1}: ${money(value)}"></i>`
      ).join("")}
      </div><div class="chart-labels">
        <span>01</span><span>${month}</span><span>${days}</span>
      </div>`;
  }

  /* ---------------- Rabbit responses ---------------- */

  function reaction(type, amount, date, exclude = "", done = false) {
    const prefix = done ? say("記低咗喇！", "记好啦！", "All noted! ") : "";

    if (!(amount > 0)) return {
      mood: "calm",
      message: say(
        "今日買咗啲咩呀？畀兔兔八卦下～我保證唔偷食你份甜品。",
        "今天买了什么呀？让兔兔八卦一下～我保证不偷吃你的甜点。",
        "What did you get today? I promise not to nibble your dessert."
      )
    };

    if (type === "income") return amount > S.limits.income
      ? {
          mood: "excited",
          message: prefix + say(
            "嘩！荷包食大餐喎！分少少畀願望罐，兔兔幫你睇實佢～",
            "哇！钱包吃大餐啦！分一点给愿望罐，兔兔替你看好它～",
            "Whoa! Your wallet had a feast. Save a little for your wish jar!"
          )
        }
      : {
          mood: "happy",
          message: prefix + say(
            "有進帳！開心到耳仔都彈起咗～",
            "有进账！开心得耳朵都弹起来啦～",
            "Money in! My ears just perked up!"
          )
        };

    const key = date.slice(0, 7);
    const budget = S.budgets[key]?.total || 0;
    const spent = sum(S.entries.filter(entry =>
      entry.id !== exclude && entry.date.startsWith(key)
    ), "expense");

    if (budget && spent + amount > budget) return {
      mood: "worried",
      message: prefix + say(
        `今個月超咗 ${money(round(spent + amount - budget))}。唔使自責，我哋再慢慢調整。`,
        `这个月超出 ${money(round(spent + amount - budget))}。别自责，我们再慢慢调整。`,
        `${money(round(spent + amount - budget))} over budget. No guilt—we can adjust.`
      )
    };

    if (amount > S.limits.expense) return {
      mood: "surprised",
      message: prefix + say(
        "呢筆幾有份量喎！加張相啦，唔係我會以為你買咗成車紅蘿蔔。",
        "这笔有点分量哦！加张照片吧，不然我会以为你买了一车胡萝卜。",
        "A bigger purchase! Add a photo or I’ll assume it was a truckload of carrots."
      )
    };

    if (budget && spent + amount >= budget * 0.8) return {
      mood: "worried",
      message: prefix + say(
        "預算就快用晒喇～兔兔拉一拉你衫袖，提你留少少畀之後。",
        "预算快用完啦～兔兔拉拉你的衣角，提醒你给之后留一点。",
        "The budget’s getting snug. Leave a little room for later!"
      )
    };

    return {
      mood: "happy",
      message: prefix + say(
        "收到！小確幸你負責享受，啲數兔兔負責執整齊～",
        "收到！小确幸你负责享受，数字让兔兔整理～",
        "You enjoy the little joys; I’ll keep the numbers tidy."
      )
    };
  }

  function companion(response) {
    return `<div class="companion">${rabbit(response.mood)}
      <div><strong>${esc(S.pet?.name || "Bunny")}</strong>
      <p>${esc(response.message)}</p></div>
    </div>`;
  }

  /* ---------------- Onboarding ---------------- */

  function onboarding(step = 1) {
    onboardingStep = step;

    if (step === 1) {
      const draft = onboardingDraft || {
        name: S.profile.name,
        lang: S.lang,
        base: S.base
      };

      $("#content").innerHTML = `<section class="onboarding">
        ${rabbit("happy")}
        <div class="step-label">01 / 02 · NICE TO MEET YOU</div>
        <h1>${say(
          "先認識你，好唔好？",
          "先认识你，好不好？",
          "What should I call you?"
        )}</h1>
        <form id="nameForm" class="paper stack"
          style="max-width:430px;margin:25px auto;text-align:left">
          ${field("暱稱", `<input name="nickname" maxlength="30" required
            autocomplete="nickname" value="${esc(draft.name)}">`)}
          ${field("語言", `<select name="lang">
            <option value="tc" ${draft.lang === "tc" ? "selected" : ""}>繁體中文 · 粵語</option>
            <option value="sc" ${draft.lang === "sc" ? "selected" : ""}>简体中文 · 普通话</option>
            <option value="en" ${draft.lang === "en" ? "selected" : ""}>English</option>
          </select>`)}
          ${field("主要貨幣", `<select name="base">${opts(currencies, draft.base, false)}</select>`)}
          ${submit("下一步")}
        </form>
      </section>`;
      return;
    }

    petDraft ||= { breed: 0, coat: 3, name: "Mochi", accessory: "" };

    $("#content").innerHTML = `<section class="onboarding">
      <div class="step-label">02 / 02 · A LITTLE COMPANION</div>
      <h1>${esc(onboardingDraft.name)}${say(
        "，揀個兔兔室友啦！",
        "，选个兔兔室友吧！",
        ", meet your roommate!"
      )}</h1>
      <p class="muted">${say(
        "耳仔、毛色、名字，全部由你話事。",
        "耳朵、毛色、名字，都由你决定。",
        "Choose the ears, coat and name."
      )}</p>
      <div class="paper" style="margin-top:25px">${petChoices(true)}</div>
    </section>`;
  }

  function petChoices(first = false) {
    return `<div class="pet-grid">${breeds.map((breed, index) =>
      `<button type="button" class="pet-choice ${petDraft.breed === index ? "selected" : ""}"
        data-action="breed" data-id="${index}" data-first="${first}">
        ${rabbit("calm", { ...petDraft, breed: index })}
        <strong>${t(breed)}</strong>
      </button>`
    ).join("")}</div>
    <div class="swatches">${coats.map((coat, index) =>
      `<button type="button" class="swatch ${petDraft.coat === index ? "selected" : ""}"
        style="background:${coat.fur}" data-action="coat" data-id="${index}"
        data-first="${first}" aria-label="Coat ${index + 1}"></button>`
    ).join("")}</div>
    <form id="petForm" data-first="${first}">
      ${field("兔兔名字", `<input name="petName" id="petName"
        maxlength="24" required value="${esc(petDraft.name)}">`)}
      <div class="actions">
        ${first ? btn("取消", "onboardingBack") : ""}
        ${submit(first ? "開始我的手帳" : "儲存")}
      </div>
    </form>`;
  }

  /* ---------------- Pages ---------------- */

  function home() {
    const list = records();
    const income = sum(list, "income");
    const expense = sum(list, "expense");
    const budget = S.budgets[month]?.total || 0;

    return `<section class="hero">
      <div><span class="tag">OUR LITTLE EVERYDAY</span>
      <h1>${esc(S.profile.name)}${say("，返嚟喇！", "，回来啦！", ", welcome home!")}</h1>
      <p>${esc(say(
        "記低今日嘅收支，順手留張相。兔兔幫你收好，每一日都值得記住。",
        "记下今天的收支，顺手留张照片。兔兔替你收好，每一天都值得记住。",
        "Record today’s money and tuck in a photo. Every little day deserves a place."
      ))}</p>
      <div class="hero-actions">${btn("新增記帳", "newEntry", "", "primary")}
        <a href="feed.html">${t("生活圈")} →</a>
      </div></div>${rabbit("happy")}
    </section>
    <div class="row between" style="margin-bottom:17px">
      <span class="small muted">${month}</span>${monthInput()}
    </div>
    <section class="metrics">${[
      ["本月收入", income], ["本月支出", expense],
      ["本月結餘", round(income - expense)],
      ["預算剩餘", budget ? round(budget - expense) : null]
    ].map(([label, value]) =>
      `<div class="metric"><label>${t(label)}</label>
      <strong>${value === null ? "—" : money(value)}</strong></div>`
    ).join("")}</section>
    <div class="layout">
      <section class="paper">
        <div class="row between"><h2>${t("最近記錄")}</h2>
          <a class="small" href="ledger.html">${t("查看")} →</a>
        </div>${table(list, 4)}
      </section>
      <div class="stack">
        <section class="paper"><h2>${t("每日支出")}</h2>${chart()}</section>
        <section class="paper">
          <a class="shortcut" href="goals.html">${jar()}
            <div><strong>${t("願望罐")}</strong>
              <small>${S.goals.filter(goal => saved(goal) >= goal.target).length}
              / ${S.goals.length} ${t("已完成")}</small>
            </div>
          </a>
          <a class="shortcut" href="feed.html">${ears()}
            <div><strong>${t("生活圈")}</strong>
              <small>${S.entries.length + S.posts.length} · ${t("記帳")} / ${t("生活")}</small>
            </div>
          </a>
        </section>
      </div>
    </div>`;
  }

  function ledger() {
    const list = records().filter(entry =>
      (!filters.type || entry.type === filters.type) &&
      (!filters.category || entry.category === filters.category) &&
      (entry.note + " " + t(entry.category)).toLowerCase()
        .includes(filters.q.toLowerCase())
    );

    return head(
      "收支手帳",
      t("帳目及照片會自動同步至生活圈。"),
      btn("新增記帳", "newEntry", "", "primary")
    ) + `<div class="filters">
      <input id="search" placeholder="${t("搜尋")}" value="${esc(filters.q)}">
      <select id="filterType">
        <option value="">${t("全部")}</option>
        <option value="expense" ${filters.type === "expense" ? "selected" : ""}>${t("支出")}</option>
        <option value="income" ${filters.type === "income" ? "selected" : ""}>${t("收入")}</option>
      </select>
      <select id="filterCategory"><option value="">${t("全部")}</option>
        ${opts([...new Set([...expenseCats, ...incomeCats])], filters.category)}
      </select>
      ${monthInput()}${btn("匯出 CSV", "csv")}
    </div><section class="paper">${table(list)}</section>`;
  }

  const products = [
    { name: "咖啡", price: 30 },
    { name: "筆記本", price: 25 },
    { name: "三明治", price: 42 }
  ];

  function productArt(index) {
    const drawings = [
      `<path d="M24 35h47v35q-23 20-47 0Z" fill="#fff9ef" stroke="#84634e" stroke-width="2"/>
       <path d="M71 40h7q17 16-7 23" fill="none" stroke="#84634e" stroke-width="4"/>
       <ellipse cx="47" cy="35" rx="23" ry="6" fill="#bd9477"/>
       <path d="M39 27q-5-8 1-13m12 13q6-8 0-13" fill="none" stroke="#b79c8f" stroke-width="2"/>
       <path d="M39 53q-6-17 0-16 6 0 5 16m7 0q-1-17 5-16 6 1 0 16" fill="#ecc1cd"/>
       <ellipse cx="47" cy="61" rx="13" ry="10" fill="#ecc1cd"/>
       <path d="M42 61h1m8 0h1m-6 5h3" stroke="#84634e" stroke-width="2"/>`,
      `<rect x="24" y="20" width="51" height="65" rx="7" fill="#dcb9ca" stroke="#896478" stroke-width="2"/>
       <path d="M34 21v63M28 31h-9m9 13h-9m9 13h-9m9 13h-9" stroke="#896478" stroke-width="2"/>
       <path d="M46 48q-8-21-1-20 7 1 7 20m5 0q1-21 8-20 6 1-1 20" fill="#fff8ef"/>
       <ellipse cx="54" cy="57" rx="15" ry="12" fill="#fff8ef"/>
       <path d="M49 56h1m8 0h1m-7 6h3" stroke="#896478" stroke-width="2"/>`,
      `<path d="M17 72 48 21q3-4 6 0l31 51Z" fill="#efd0a0" stroke="#94734e" stroke-width="2"/>
       <path d="m22 69 30-42 27 42Z" fill="#fff4d7"/>
       <path d="M19 74h64" stroke="#9bb785" stroke-width="8" stroke-linecap="round"/>
       <path d="M23 81h57" stroke="#dea494" stroke-width="5" stroke-linecap="round"/>
       <path d="M43 55h1m14 0h1m-10 8q4 4 8 0" fill="none" stroke="#94734e" stroke-width="2"/>`
    ];

    return `<svg viewBox="0 0 100 100" role="img"
      aria-label="${t(products[index].name)}">
      <rect x="3" y="3" width="94" height="94" rx="25" fill="var(--soft)"/>
      ${drawings[index]}
    </svg>`;
  }

  function cartTotal(state = S) {
    const subtotal = round(state.cart.reduce(
      (total, item) => total + Math.round(item.price * 100) * item.qty, 0
    ) / 100);

    return {
      subtotal,
      total: Math.max(0, round(
        round(subtotal * (1 - state.shop.discount / 100)) - state.shop.coupon
      ))
    };
  }

  function shopping() {
    const totals = cartTotal();

    return head("購物清單", S.base, btn("自訂商品", "customProduct", "", "primary")) +
      `<div class="layout"><div class="stack">
        <section class="paper">${products.map((product, index) =>
          `<div class="product">${productArt(index)}
            <div class="detail"><strong>${t(product.name)}</strong>
              <div class="small muted money">
                ${money(Math.max(0.01, round(product.price * S.rates.HKD)))}
              </div>
            </div>${btn("加入", "addProduct", index)}
          </div>`
        ).join("")}</section>
        <section class="paper">${S.cart.length ? S.cart.map(item =>
          `<div class="product">
            <div class="detail"><strong>${esc(item.name)}</strong>
              <div class="small muted money">${money(item.price)}</div>
            </div>
            <input type="number" data-qty="${item.id}" min="1" max="999"
              step="1" value="${item.qty}" aria-label="${t("數量")}">
            <span class="money">${money(round(item.price * item.qty))}</span>
            ${btn("刪除", "deleteCart", item.id, "quiet")}
          </div>`
        ).join("") : empty()}</section>
      </div>
      <div class="stack" style="align-self:start">
        ${companion(reaction("expense", totals.total, today()))}
        <section class="paper"><h2>${t("應付總額")}</h2>
          <div class="total-price">${money(totals.total)}</div>
          <div class="stack">
            ${field("折扣百分比", `<input data-shop="discount" type="number"
              min="0" max="100" step=".01" value="${S.shop.discount}">`)}
            ${field("優惠金額", `<input data-shop="coupon" type="number"
              min="0" max="999999999" step=".01" value="${S.shop.coupon}">`)}
            ${field("購物預算", `<input data-shop="budget" type="number"
              min="0" max="999999999" step=".01" value="${S.shop.budget}">`)}
          </div><hr>
          <p class="small">${t("小計")}: ${money(totals.subtotal)}</p>
          ${S.shop.budget
            ? `<p class="small">${t("預算剩餘")}: ${money(round(S.shop.budget - totals.total))}</p>`
            : ""}
          <p class="tiny muted">${t("先打折，再扣優惠金額。")}</p>
          ${btn("確認購買並記帳", "purchase", "", "primary")}
        </section>
      </div></div>`;
  }

  function analytics() {
    const list = records();
    const out = sum(list, "expense");
    const categories = expenseCats.map(category => ({
      category,
      value: sum(list.filter(entry => entry.category === category), "expense")
    })).sort((a, b) => b.value - a.value);

    const [year, selectedMonth] = month.split("-").map(Number);
    const days = new Date(year, selectedMonth, 0).getDate();
    const offset = (new Date(year, selectedMonth - 1, 1).getDay() + 6) % 7;

    return head("消費分析", money(out), monthInput()) +
      `<div class="layout"><div class="stack">
        <section class="paper"><h2>${t("每日支出")}</h2>${chart()}</section>
        <section class="paper"><h2>${t("消費日曆")}</h2>
          <div class="heat">${Array(offset).fill("<span></span>").join("")}
          ${Array.from({ length: days }, (_, index) => {
            const value = sum(list.filter(entry =>
              Number(entry.date.slice(8)) === index + 1
            ), "expense");

            return `<button data-action="day" data-id="${index + 1}"
              style="background:${value ? "var(--soft)" : "white"}">
              ${index + 1}<small>${value ? value.toFixed(0) : "·"}</small>
            </button>`;
          }).join("")}
          </div>
        </section>
      </div>
      <section class="paper" style="align-self:start">
        <h2>${t("分類分布")}</h2>
        ${categories.map(item =>
          `<div class="category"><div class="row between">
            <span>${t(item.category)}</span>
            <strong class="money">${money(item.value)}</strong>
          </div><div class="progress">
            <i style="width:${out ? item.value / out * 100 : 0}%"></i>
          </div><span class="tiny muted">
            ${out ? (item.value / out * 100).toFixed(1) : 0}%
          </span></div>`
        ).join("")}
      </section></div>`;
  }

  function goals() {
    const budget = S.budgets[month] || { total: 0, categories: {} };
    const out = sum(records(), "expense");

    return head(
      "願望罐",
      t("儲蓄投入不計入消費支出。"),
      btn("新增願望", "newGoal", "", "primary")
    ) + `<div class="layout">
      <section class="paper" style="align-self:start">
        <div class="row between"><h2>${t("本月預算")}</h2>${monthInput()}</div>
        <div class="total-price">${money(budget.total)}</div>
        <div class="progress">
          <i style="width:${budget.total ? Math.min(100, out / budget.total * 100) : 0}%"></i>
        </div>
        <p class="small">${t("預算剩餘")}: ${money(round(budget.total - out))}</p>
        ${btn("調整預算", "budget")}<hr><h3>${t("分類預算")}</h3>
        ${expenseCats.map(category => {
          const value = sum(records().filter(entry =>
            entry.category === category
          ), "expense");
          const limit = budget.categories[category] || 0;

          return `<div class="category">
            <div class="row between"><span>${t(category)}</span>
              <span class="tiny money">${money(value)} / ${limit ? money(limit) : "—"}</span>
            </div><div class="progress">
              <i style="width:${limit ? Math.min(100, value / limit * 100) : 0}%"></i>
            </div>
          </div>`;
        }).join("")}
      </section>
      <div class="stack" style="align-self:start">
        ${S.goals.map(goal => {
          const value = saved(goal);

          return `<section class="paper">
            <div class="row">${jar()}<div>
              <h2 style="margin:0">${esc(goal.name)}</h2>
              <span class="tag">${value >= goal.target ? t("已完成") : esc(goal.deadline)}</span>
            </div></div>
            <div class="total-price" style="font-size:26px">
              ${money(value)} <span class="tiny muted">/ ${money(goal.target)}</span>
            </div>
            <div class="progress">
              <i style="width:${Math.min(100, value / goal.target * 100)}%"></i>
            </div>
            <div class="row">
              ${btn("存一點", "contribute", goal.id, "primary")}
              ${value >= goal.target ? btn("分享達標", "shareGoal", goal.id) : ""}
              ${btn("刪除", "deleteGoal", goal.id, "quiet")}
            </div>
          </section>`;
        }).join("") || `<section class="paper">${empty()}</section>`}
      </div>
    </div>`;
  }

  function feed() {
    const items = [
      ...S.entries.map(entry => ({ kind: "entry", data: entry })),
      ...S.posts.map(post => ({ kind: "post", data: post }))
    ].filter(item =>
      feedFilter === "all" ||
      (feedFilter === "entry" ? item.kind === "entry" : item.kind === "post")
    ).sort((a, b) => b.data.created - a.data.created);

    return `<div class="feed-shell">
      <div class="feed-cover">
        <i class="cover-ear"></i><i class="cover-ear second"></i>
        <div class="cover-text"><strong>${say(
          "把小日子<br>收進口袋。",
          "把小日子<br>收进口袋。",
          "Little days.<br>Lovely memories."
        )}</strong><small>OUR LITTLE MOMENTS</small></div>
        ${rabbit("happy")}
      </div>
      <section class="feed-profile">
        <div>${avatar()}<h2>${esc(S.profile.name)}</h2>
          <p>${esc(S.profile.bio || say(
            "同兔兔一齊，記住生活嘅小事。",
            "和兔兔一起，记住生活的小事。",
            "Little memories, with my bunny."
          ))}</p>
        </div>${btn("發布動態", "newPost", "", "primary")}
      </section>
      <div class="feed-tabs">${[
        ["all", "全部"], ["entry", "記帳"], ["post", "生活"]
      ].map(([key, label]) =>
        btn(label, "feedFilter", key, feedFilter === key ? "selected" : "")
      ).join("")}</div>
      <section class="timeline">${items.map(item => {
        const record = item.data;
        const isEntry = item.kind === "entry";

        return `<article class="post">${avatar()}<div>
          <div class="row between">
            <strong class="post-name">${esc(S.profile.name)}</strong>
            <span class="tag">${t(isEntry ? record.category : "生活")}</span>
          </div>
          ${isEntry ? `<div class="post-amount ${record.type}">
            ${record.type === "income" ? "+" : "−"}${money(record.converted)}
          </div>${record.currency !== S.base
            ? `<span class="tiny muted">${money(record.amount, record.currency)}</span>`
            : ""}` : ""}
          <p>${esc(isEntry ? record.note : record.text)}</p>
          ${record.milestone ? `<div class="milestone">${jar()}
            <strong>${esc(record.milestone.name)}</strong>
            ${record.milestone.show
              ? money(record.milestone.amount, record.milestone.currency)
              : t("已完成")}
          </div>` : ""}
          ${photos(record.images, item.kind, record.id)}
          ${isEntry ? `<div class="post-bunny">
            ${esc(S.pet.name)} · ${esc(say(
              "相同帳收好咗，之後慢慢翻睇啦～",
              "照片和账收好啦，以后慢慢翻看～",
              "Photos and numbers, tucked away together."
            ))}
          </div>` : ""}
          <div class="post-foot"><span class="tiny muted">${esc(record.date)}</span>
            <div class="row" style="gap:2px">
              ${btn("編輯", isEntry ? "editEntry" : "editPost", record.id, "quiet")}
              ${btn("刪除", isEntry ? "deleteEntry" : "deletePost", record.id, "quiet")}
            </div>
          </div>
        </div></article>`;
      }).join("") || empty()}</section>
      <p class="tiny muted" style="text-align:center;margin-top:18px">
        ${t("這是本機生活圈，沒有發布到網上。")}
      </p>
    </div>`;
  }

  function settings() {
    const complete = S.goals.some(goal => saved(goal) >= goal.target);

    return head("設定") + `<div class="layout">
      <div class="stack">
        <section class="paper">
          <h2>${t("暱稱")} & ${t("個人簡介")}</h2>
          <form id="profileForm" class="stack">
            <div class="avatar-editor">
              <div id="avatarPreview">${avatar()}</div>
              <div class="stack" style="gap:9px;flex:1">
                <strong>${t("頭像")}</strong>
                <input id="avatarFile" name="avatar" type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp">
                <span id="avatarStatus" class="tiny muted" role="status" aria-live="polite">
                  ${say(
                    "揀好圖片就會自動儲存，支援 JPG、PNG、WebP，最多 8 MB。",
                    "选好图片会自动保存，支持 JPG、PNG、WebP，最大 8 MB。",
                    "Choose JPG, PNG or WebP, up to 8 MB. Your avatar saves automatically."
                  )}
                </span>
                <div>${btn("移除頭像", "removeAvatar", "", "quiet")}</div>
              </div>
            </div>
            ${field("暱稱", `<input name="nickname" maxlength="30"
              required value="${esc(S.profile.name)}">`)}
            ${field("個人簡介", `<textarea name="bio"
              maxlength="300">${esc(S.profile.bio)}</textarea>`)}
            <div class="two">
              ${field("語言", `<select name="lang">
                <option value="tc" ${S.lang === "tc" ? "selected" : ""}>繁體中文 · 粵語</option>
                <option value="sc" ${S.lang === "sc" ? "selected" : ""}>简体中文 · 普通话</option>
                <option value="en" ${S.lang === "en" ? "selected" : ""}>English</option>
              </select>`)}
              ${field("主要貨幣", `<select name="base" ${hasFinancial(S) ? "disabled" : ""}>
                ${opts(currencies, S.base, false)}
              </select>`)}
            </div>
            <p class="tiny muted">${t("有財務資料後，主要貨幣會鎖定。")}</p>
            <div>${submit()}</div>
          </form>
        </section>
        <section class="paper">
          <h2>${t("參考匯率")}</h2>
          <p class="small muted">${t("示範匯率並非即時報價，舊帳保留原有匯率。")}</p>
          <details><summary style="cursor:pointer">1 → ${S.base}</summary>
            <form id="ratesForm" style="margin-top:20px">
              <div class="two">${currencies.filter(currency => currency !== S.base)
                .map(currency => field(currency, `<input name="${currency}"
                  type="number" min=".00000001" max="100000000"
                  step="any" required value="${S.rates[currency]}">`)).join("")}
              </div><div class="actions">${submit()}</div>
            </form>
          </details>
        </section>
      </div>
      <div class="stack" style="align-self:start">
        <section class="paper">
          <div class="row between"><h2>${esc(S.pet.name)}</h2>
            ${btn("更換兔兔", "pet", "", "quiet")}
          </div>${rabbit("happy")}
          <form id="petSettings" class="stack">
            ${field("配飾", `<select name="accessory">
              <option value="">${t("沒有")}</option>
              <option value="bow" ${S.entries.length < 5 ? "disabled" : ""}
                ${S.pet.accessory === "bow" ? "selected" : ""}>${t("蝴蝶結")}</option>
              <option value="scarf" ${!complete ? "disabled" : ""}
                ${S.pet.accessory === "scarf" ? "selected" : ""}>${t("圍巾")}</option>
            </select>`)}
            <p class="tiny muted">${t("五筆記帳解鎖蝴蝶結；完成願望解鎖圍巾。")}</p>
            ${field("大額支出門檻", `<input name="expense" type="number"
              min=".01" max="999999999" step=".01" required value="${S.limits.expense}">`)}
            ${field("大額收入門檻", `<input name="income" type="number"
              min=".01" max="999999999" step=".01" required value="${S.limits.income}">`)}
            <span class="tiny muted">${S.base}</span><div>${submit()}</div>
          </form>
        </section>
        <section class="paper">
          <h2>${t("匯出備份")}</h2>
          <p class="small muted">${t("請定期備份，清除瀏覽器資料可能令記錄遺失。")}</p>
          <div class="row">${btn("匯出備份", "backup")}
            ${btn("恢復備份", "restore")}${btn("匯出 CSV", "csv")}
          </div>
        </section>
      </div>
    </div>`;
  }

  /* ---------------- Storage / refresh ---------------- */

  function readState() {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readonly");
      const request = transaction.objectStore("data").get("main");
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || Error("Read aborted"));
    });
  }

  function change(fn, options = {}) {
    refreshGeneration++;

    queue = queue.then(async () => {
      const next = await new Promise((resolve, reject) => {
        const transaction = db.transaction("data", "readwrite");
        const store = transaction.objectStore("data");
        const request = store.get("main");
        let result;
        let failure;

        request.onsuccess = () => {
          try {
            // 從資料庫讀最新版本，保留 care.js 寫入的好感度等欄位。
            result = request.result || structuredClone(S);
            fn(result);
            if (!valid(result)) throw Error("Invalid data");
            store.put(result, "main");
          } catch (error) {
            failure = error;
            transaction.abort();
          }
        };

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(failure || transaction.error);
        transaction.onabort = () =>
          reject(failure || transaction.error || Error("Save aborted"));
      });

      S = next;
      refreshGeneration++;

      if (options.render !== false) {
        render({ resetProfile: options.resetProfile === true });
      } else {
        updateHeader();
      }

      channel?.postMessage("updated");
      return true;
    }).catch(error => {
      console.error("Save failed:", error);

      notify(error?.name === "QuotaExceededError"
        ? say(
            "儲存空間不足，請先匯出備份，再整理不需要的照片。",
            "存储空间不足，请先导出备份，再整理不需要的照片。",
            "Storage is full. Export a backup before removing unneeded photos."
          )
        : error?.message === "Currency locked"
          ? t("有財務資料後，主要貨幣會鎖定。")
          : t("儲存失敗"));

      return false;
    });

    return queue;
  }

  function updateHeader() {
    if (!S || !$("#brandMark")) return;

    const coat = coats[S.pet?.coat ?? 3];
    document.documentElement.style.setProperty("--accent", coat.accent);
    document.documentElement.style.setProperty("--soft", coat.soft);
    document.documentElement.lang = {
      tc: "zh-Hant", sc: "zh-Hans", en: "en"
    }[S.lang];

    $("#brandMark").innerHTML = ears();
    $("#nav").innerHTML = navigation.map(([key, url, label], index) =>
      `<a href="${url}" class="${key === page ? "active" : ""}"
        ${key === page ? 'aria-current="page"' : ""}>
        ${navIcon(index)}${t(label)}
      </a>`
    ).join("");

    $("#nav").hidden = !S.ready;
    $("#headerAvatar").innerHTML = avatar();
    $("#footerNote").textContent = t("請定期備份，清除瀏覽器資料可能令記錄遺失。");
  }

  function render({ resetProfile = false } = {}) {
    /*
     * 保留整個正在編輯的個人資料表單：
     * 包含輸入內容、已選檔案和預覽，避免其他功能重畫時消失。
     */
    const retainedForm = page === "settings" && !resetProfile
      ? $("#profileForm")
      : null;

    updateHeader();

    if (!S.ready) {
      onboarding(onboardingDraft ? onboardingStep : 1);
      return;
    }

    const views = { home, ledger, shopping, analytics, goals, feed, settings };
    $("#content").innerHTML = (views[page] || home)();

    if (retainedForm) {
      $("#profileForm")?.replaceWith(retainedForm);

      // 其他分頁新增財務資料後，同步鎖定主要貨幣，
      // 但不丟棄目前表單內容。
      if (hasFinancial(S)) {
        const base = retainedForm.elements.namedItem("base");
        base.value = S.base;
        base.disabled = true;
      }
    }
  }

  async function refresh() {
    if (!db || !S?.ready || avatarSaving) return;

    // 設定頁不因 focus 或廣播而重畫，保留選圖及未儲存內容。
    if ($("#profileForm")) return;

    if (
      $("#modal")?.open ||
      $("#viewer")?.open ||
      $("#numberPadDialog")?.open ||
      $("#statementDialog")?.open
    ) return;

    const generation = refreshGeneration;
    const data = await readState();

    if (
      generation !== refreshGeneration ||
      avatarSaving ||
      $("#profileForm") ||
      $("#modal")?.open ||
      $("#viewer")?.open ||
      $("#numberPadDialog")?.open ||
      $("#statementDialog")?.open
    ) return;

    if (data && valid(data)) {
      S = data;
      render();
    }
  }

  if (channel) {
    channel.onmessage = () => refresh().catch(console.error);
  }

  window.addEventListener("focus", () => refresh().catch(console.error));

  /* ---------------- Image decoding ---------------- */

  function decodeImage(file, { avatar: isAvatar = false } = {}) {
    return new Promise((resolve, reject) => {
      if (!file || file.size === 0) {
        reject(Error(say(
          "圖片檔案是空的，請重新選擇。",
          "图片文件为空，请重新选择。",
          "The file is empty. Choose another image."
        )));
        return;
      }

      if (file.size > 8 * 1024 * 1024) {
        reject(Error(say(
          "圖片超過 8 MB，請先縮小。",
          "图片超过 8 MB，请先缩小。",
          "The image exceeds 8 MB. Resize it first."
        )));
        return;
      }

      const extension = file.name.split(".").pop().toLowerCase();
      const type = (file.type || "").toLowerCase();

      const allowedType = ["image/jpeg", "image/png", "image/webp"].includes(type);
      const allowedExtension = ["jpg", "jpeg", "png", "webp"].includes(extension);

      if (!allowedType && !(
        (!type || type === "application/octet-stream") && allowedExtension
      )) {
        reject(Error(say(
          "請選 JPG、PNG 或 WebP。HEIC／HEIF 請先轉成 JPG，不能只改副檔名。",
          "请选择 JPG、PNG 或 WebP。HEIC／HEIF 请先转换成 JPG，不能只改扩展名。",
          "Use JPG, PNG or WebP. Convert HEIC/HEIF to JPG; renaming the file is not enough."
        )));
        return;
      }

      let image;
      let timer;
      let url;
      let finished = false;

      function finish(error, result) {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (image) {
          image.onload = null;
          image.onerror = null;
        }

        if (url) URL.revokeObjectURL(url);
        if (error) reject(error);
        else resolve(result);
      }

      try {
        url = URL.createObjectURL(file);
        image = new Image();

        timer = setTimeout(() => finish(Error(say(
          "圖片讀取逾時。雲端相片請先下載到裝置再選擇。",
          "图片读取超时。云端照片请先下载到设备再选择。",
          "Loading timed out. Download cloud photos to your device first."
        ))), 20000);

        image.onload = () => {
          if (finished) return;

          try {
            const width = image.naturalWidth;
            const height = image.naturalHeight;
            if (!width || !height) throw Error("Invalid dimensions");

            const canvas = document.createElement("canvas");

            if (isAvatar) {
              // 頭像裁成正方形，輸出最多 512 × 512。
              const side = Math.min(width, height);
              const output = Math.max(1, Math.min(512, side));
              canvas.width = output;
              canvas.height = output;

              const context = canvas.getContext("2d");
              if (!context) throw Error("Canvas unavailable");

              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, output, output);
              context.drawImage(
                image,
                (width - side) / 2, (height - side) / 2,
                side, side,
                0, 0, output, output
              );
            } else {
              const scale = Math.min(1, 1600 / Math.max(width, height));
              canvas.width = Math.max(1, Math.round(width * scale));
              canvas.height = Math.max(1, Math.round(height * scale));

              const context = canvas.getContext("2d");
              if (!context) throw Error("Canvas unavailable");

              context.fillStyle = "#ffffff";
              context.fillRect(0, 0, canvas.width, canvas.height);
              context.drawImage(image, 0, 0, canvas.width, canvas.height);
            }

            const result = canvas.toDataURL("image/jpeg", 0.86);
            if (!result.startsWith("data:image/jpeg;base64,")) {
              throw Error("JPEG conversion failed");
            }

            finish(null, result);
          } catch (error) {
            console.error("Image conversion:", error);
            finish(Error(say(
              "圖片轉換失敗，請試另一張 JPG 或 PNG。",
              "图片转换失败，请尝试另一张 JPG 或 PNG。",
              "Could not convert this image. Try another JPG or PNG."
            )));
          }
        };

        image.onerror = () => finish(Error(say(
          "瀏覽器讀不到這張圖片。請確認檔案完整，並試用 JPG 或 PNG。",
          "浏览器无法读取这张图片。请确认文件完整，并尝试 JPG 或 PNG。",
          "The browser could not decode this image. Try a valid JPG or PNG."
        )));

        image.src = url;
      } catch (error) {
        finish(error);
      }
    });
  }

  async function readImages(files, max = 3) {
    const selected = Array.from(files || []);

    if (selected.length > max) {
      throw Error(say(
        `最多選擇 ${max} 張照片。`,
        `最多选择 ${max} 张照片。`,
        `Choose up to ${max} photos.`
      ));
    }

    return Promise.all(selected.map(file => decodeImage(file)));
  }

  /* ---------------- Avatar: immediate preview and save ---------------- */

  function avatarStatus(message, error = false) {
    const element = $("#avatarStatus");
    if (!element) return;

    element.textContent = message;
    element.style.color = error ? "#a23f50" : "";
  }

  function updateAvatarPreview(source) {
    const preview = $("#avatarPreview");
    if (preview) preview.innerHTML = avatar(source);
  }

  async function uploadAvatar(file, token) {
    if (!file) return false;

    avatarSaving = true;
    const input = $("#avatarFile");
    if (input) input.disabled = true;

    document.querySelectorAll('[data-action="removeAvatar"]')
      .forEach(button => button.disabled = true);

    avatarStatus(say(
      "正在處理頭像……",
      "正在处理头像……",
      "Preparing your avatar…"
    ));

    let ok = false;

    try {
      const image = await decodeImage(file, { avatar: true });
      if (token !== avatarToken) return false;

      updateAvatarPreview(image);

      avatarStatus(say(
        "圖片已讀取，正在儲存……",
        "图片已读取，正在保存……",
        "Image loaded. Saving…"
      ));

      ok = await change(state => {
        state.profile.avatar = image;
      }, { render: false });

      if (token !== avatarToken) return false;

      if (!ok) {
        updateAvatarPreview(S.profile.avatar);
        avatarStatus(say(
          "頭像未能儲存，請重新選擇。",
          "头像未能保存，请重新选择。",
          "Could not save your avatar. Choose the image again."
        ), true);
        return false;
      }

      updateAvatarPreview(S.profile.avatar);
      avatarStatus(say(
        "新頭像已自動儲存！其他個人資料改完再按「儲存」。",
        "新头像已自动保存！其他个人资料修改后再按“保存”。",
        "Avatar saved automatically! Save other profile changes separately."
      ));

      notify(say("頭像換好喇！", "头像换好啦！", "New avatar saved!"));
      return true;
    } catch (error) {
      console.error("Avatar upload:", error);

      if (token === avatarToken) {
        updateAvatarPreview(S.profile.avatar);
        avatarStatus(error.message || t("儲存失敗"), true);
        notify(error.message || t("儲存失敗"));
      }

      return false;
    } finally {
      if (token === avatarToken) {
        avatarSaving = false;

        const activeInput = $("#avatarFile");
        if (activeInput) {
          activeInput.disabled = false;
          activeInput.value = "";
        }

        document.querySelectorAll('[data-action="removeAvatar"]')
          .forEach(button => button.disabled = false);
      }
    }
  }

  /* ---------------- Editors ---------------- */

  function editEntry(key = "") {
    const entry = S.entries.find(item => item.id === key);
    const type = entry?.type || "expense";

    previewImages = [];
    previewToken++;

    show(modalHead(entry ? "編輯" : "新增記帳") +
      `<form id="entryForm" data-id="${esc(key)}">
        <div class="entry-layout"><div class="stack"><div class="two">
          ${field("類型", `<select name="type" id="entryType">
            <option value="expense" ${type === "expense" ? "selected" : ""}>${t("支出")}</option>
            <option value="income" ${type === "income" ? "selected" : ""}>${t("收入")}</option>
          </select>`)}
          ${field("日期", `<input name="date" type="date" required value="${entry?.date || today()}">`)}
          ${field("金額", `<input name="amount" type="number" min=".01"
            max="999999999" step=".01" required inputmode="decimal"
            placeholder="0.00" value="${entry?.amount || ""}">`)}
          ${field("貨幣", `<select name="currency">${opts(currencies, entry?.currency || S.base, false)}</select>`)}
        </div>
        <div class="tiny muted" id="conversion"></div>
        ${field("分類", `<select name="category" id="entryCategory">
          ${opts(type === "income" ? incomeCats : expenseCats, entry?.category)}
        </select>`)}
        ${field("備註", `<input name="note" maxlength="200" value="${esc(entry?.note || "")}">`)}
        ${field("照片", `<input name="images" type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple>`)}
        <span class="tiny muted">${t("最多三張照片，每張上限 8 MB。")}</span>
        ${entry?.images.length
          ? photos(entry.images, "entry", entry.id, true) +
            `<label class="small"><input name="remove" type="checkbox">
              ${t("移除原有照片")}</label>
            <span class="tiny muted">${t("新照片會取代原有照片。")}</span>`
          : ""}
        <div id="uploadPreview" class="thumbs"></div>
        <div class="notice">${t("帳目及照片會自動同步至生活圈。")}</div>
        </div>
        <div class="entry-pet">
          <div class="stage" id="liveRabbit"></div>
          <div><strong class="small">${esc(S.pet.name)}</strong>
            <p id="liveSpeech" role="status" aria-live="polite"></p>
          </div>
        </div></div>${actions()}
      </form>`, true);

    updateReaction();
  }

  function entryRate(form) {
    const old = S.entries.find(entry => entry.id === form.dataset.id);
    const currency = form.elements.namedItem("currency").value;
    return old?.currency === currency ? old.rate : S.rates[currency];
  }

  function updateReaction() {
    const form = $("#entryForm");
    if (!form) return;

    const amount = round(
      Number(form.elements.namedItem("amount").value || 0) * entryRate(form)
    );

    const response = reaction(
      form.elements.namedItem("type").value,
      amount,
      form.elements.namedItem("date").value || today(),
      form.dataset.id
    );

    $("#liveRabbit").innerHTML = rabbit(response.mood);
    $("#liveSpeech").textContent = response.message;
    $("#conversion").textContent =
      form.elements.namedItem("currency").value === S.base
        ? S.base
        : t("自動折算") + ": " + money(amount);
  }

  function viewEntry(key) {
    const entry = S.entries.find(item => item.id === key);
    if (!entry) return;

    show(modalHead("記帳") +
      `<span class="tag">${t(entry.category)}</span>
      <h2 style="margin-top:13px">${esc(entry.note || t(entry.category))}</h2>
      <p class="tiny muted">${esc(entry.date)}</p>
      <div class="total-price ${entry.type}">
        ${entry.type === "income" ? "+" : "−"}${money(entry.converted)}
      </div>
      <p class="small muted">${money(entry.amount, entry.currency)}
        · ${t("參考匯率")} ${entry.rate}</p>
      ${entry.items ? entry.items.map(item =>
        `<p class="small">${esc(item.name)} × ${item.qty} · ${money(item.price)}</p>`
      ).join("") : ""}
      ${photos(entry.images, "entry", entry.id)}
      <div class="actions">${btn("編輯", "editEntry", entry.id, "primary")}</div>`);
  }

  function editPost(key = "") {
    const post = S.posts.find(item => item.id === key);
    previewImages = [];
    previewToken++;

    show(modalHead(post ? "編輯" : "發布動態") +
      `<form id="postForm" data-id="${esc(key)}" class="stack">
        ${field("內容", `<textarea name="text" maxlength="2000">${esc(post?.text || "")}</textarea>`)}
        ${field("照片", `<input name="images" type="file"
          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" multiple>`)}
        <span class="tiny muted">${t("最多三張照片，每張上限 8 MB。")}
          ${t("新照片會取代原有照片。")}</span>
        ${post?.images.length
          ? photos(post.images, "post", post.id, true) +
            `<label class="small"><input name="remove" type="checkbox">
              ${t("移除原有照片")}</label>`
          : ""}
        <div id="uploadPreview" class="thumbs"></div>
        ${post?.milestone
          ? `<label class="small"><input name="hide" type="checkbox"
            ${!post.milestone.show ? "checked" : ""}> ${t("隱藏金額")}</label>`
          : ""}
        ${actions()}
      </form>`);
  }

  function budgetDialog() {
    const budget = S.budgets[month] || { total: 0, categories: {} };

    show(modalHead("調整預算") +
      `<form id="budgetForm">
        <p class="small muted">${month} · ${S.base}</p>
        ${field("本月預算", `<input name="total" type="number" min="0"
          max="999999999" step=".01" required value="${budget.total}">`)}
        <hr><div class="two">${expenseCats.map(category =>
          field(category, `<input name="${category}" type="number" min="0"
            max="999999999" step=".01" required value="${budget.categories[category] || 0}">`)
        ).join("")}</div>${actions()}
      </form>`);
  }

  function success(response) {
    show(modalHead("已儲存") + companion(response) +
      `<p class="small muted" style="margin-top:17px">
        ${t("帳目及照片會自動同步至生活圈。")}
      </p><div class="actions">
        <a href="feed.html">${t("生活圈")} →</a>${btn("關閉", "close")}
      </div>`);
  }

  /* ---------------- Photo viewer ---------------- */

  function drawGallery() {
    $("#viewer").innerHTML = `<div class="row between">
      <span>${photoIndex + 1} / ${gallery.length}</span>${btn("關閉", "viewerClose")}
      </div>
      <img src="${esc(gallery[photoIndex])}" alt="${t("照片")} ${photoIndex + 1}">
      <div class="row between" style="margin-top:12px">
        <button type="button" data-action="prevPhoto"
          ${photoIndex === 0 ? "disabled" : ""} aria-label="Previous photo">←</button>
        <span class="tiny">← / →</span>
        <button type="button" data-action="nextPhoto"
          ${photoIndex === gallery.length - 1 ? "disabled" : ""}
          aria-label="Next photo">→</button>
      </div>`;
  }

  function openGallery(images, index = 0) {
    if (!images?.length) return;
    gallery = images;
    photoIndex = Math.max(0, Math.min(index, images.length - 1));
    drawGallery();
    if (!$("#viewer").open) $("#viewer").showModal();
  }

  document.addEventListener("keydown", event => {
    if (!$("#viewer")?.open) return;

    if (event.key === "ArrowLeft" && photoIndex > 0) {
      photoIndex--;
      drawGallery();
      event.preventDefault();
    }

    if (event.key === "ArrowRight" && photoIndex < gallery.length - 1) {
      photoIndex++;
      drawGallery();
      event.preventDefault();
    }
  });

  /* ---------------- Click actions ---------------- */

  document.addEventListener("click", async event => {
    const element = event.target.closest("[data-action]");
    if (!element || !S) return;

    const action = element.dataset.action;
    const key = element.dataset.id;

    if (action === "close") { $("#modal").close(); return; }
    if (action === "viewerClose") { $("#viewer").close(); return; }

    if (action === "prevPhoto" && photoIndex > 0) {
      photoIndex--; drawGallery(); return;
    }

    if (action === "nextPhoto" && photoIndex < gallery.length - 1) {
      photoIndex++; drawGallery(); return;
    }

    if (action === "previewPhoto") {
      openGallery(previewImages, Number(element.dataset.index));
      return;
    }

    if (action === "photo") {
      const item = (element.dataset.kind === "entry" ? S.entries : S.posts)
        .find(record => record.id === key);
      openGallery(item?.images, Number(element.dataset.index));
      return;
    }

    if (action === "onboardingBack") { onboarding(1); return; }

    if (action === "breed" || action === "coat") {
      if ($("#petName")) petDraft.name = $("#petName").value;
      if (action === "breed") petDraft.breed = Number(key);
      else petDraft.coat = Number(key);

      if (element.dataset.first === "true") onboarding(2);
      else show(modalHead("更換兔兔") + petChoices(), true);
      return;
    }

    if (action === "pet") {
      petDraft = structuredClone(S.pet);
      show(modalHead("更換兔兔") + petChoices(), true);
      return;
    }

    if (action === "newEntry" || action === "editEntry") { editEntry(key); return; }
    if (action === "viewEntry") { viewEntry(key); return; }
    if (action === "newPost" || action === "editPost") { editPost(key); return; }
    if (action === "feedFilter") { feedFilter = key; render(); return; }
    if (action === "budget") { budgetDialog(); return; }

    if (action === "removeAvatar") {
      if (avatarSaving) return;

      element.disabled = true;
      const ok = await change(state => {
        state.profile.avatar = "";
      }, { render: false });

      if (ok) {
        updateAvatarPreview("");
        avatarStatus(say(
          "頭像已移除。",
          "头像已移除。",
          "Avatar removed."
        ));
      }

      if (element.isConnected) element.disabled = false;
      return;
    }

    if (["deleteEntry", "deletePost", "deleteGoal", "deleteCart"].includes(action)) {
      if (action !== "deleteCart" && !confirm(t("確定刪除？"))) return;

      const property = {
        deleteEntry: "entries", deletePost: "posts",
        deleteGoal: "goals", deleteCart: "cart"
      }[action];

      const ok = await change(state => {
        state[property] = state[property].filter(item => item.id !== key);
      });

      if (ok && $("#modal").open) $("#modal").close();
      return;
    }

    if (action === "addProduct") {
      const product = products[Number(key)];

      await change(state => {
        state.cart.push({
          id: uid(),
          name: t(product.name),
          price: Math.max(0.01, round(product.price * state.rates.HKD)),
          qty: 1
        });
      });
      return;
    }

    if (action === "customProduct") {
      show(modalHead("自訂商品") + `<form id="productForm" class="stack">
        ${field("商品名稱", '<input name="productName" maxlength="80" required>')}
        ${field("單價", '<input name="price" type="number" min=".01" max="99999999" step=".01" required>')}
        ${field("數量", '<input name="qty" type="number" min="1" max="999" step="1" value="1" required>')}
        ${actions()}
      </form>`);
      return;
    }

    if (action === "purchase") {
      if (!S.cart.length || cartTotal().total <= 0) {
        notify(t("金額必須大於零"));
        return;
      }

      element.disabled = true;
      let response;

      const ok = await change(state => {
        if (!state.cart.length) throw Error("Empty cart");

        const amount = cartTotal(state).total;
        if (amount <= 0) throw Error("Invalid total");

        response = reaction("expense", amount, today(), "", true);

        state.entries.push({
          id: uid(), created: Date.now(), date: today(),
          type: "expense", category: "購物", note: t("購物清單"),
          amount, currency: state.base, rate: 1, converted: amount,
          images: [], items: structuredClone(state.cart)
        });

        state.cart = [];
        state.shop = { discount: 0, coupon: 0, budget: 0 };
      });

      if (ok) success(response);
      else if (element.isConnected) element.disabled = false;
      return;
    }

    if (action === "newGoal") {
      show(modalHead("新增願望") + `<form id="goalForm" class="stack">
        ${field("願望名稱", '<input name="goalName" maxlength="60" required>')}
        ${field("目標金額", '<input name="target" type="number" min=".01" max="999999999" step=".01" required>')}
        ${field("目標日期", `<input name="deadline" type="date" min="${today()}" required>`)}
        ${actions()}
      </form>`);
      return;
    }

    if (action === "contribute") {
      show(modalHead("存一點") + `<form id="contributionForm" data-id="${esc(key)}">
        ${field("金額", '<input name="amount" type="number" min=".01" max="999999999" step=".01" required>')}
        ${actions()}
      </form>`);
      return;
    }

    if (action === "shareGoal") {
      show(modalHead("分享達標") + `<form id="shareForm" data-id="${esc(key)}">
        <label class="small"><input name="hide" type="checkbox" checked>
          ${t("隱藏金額")}</label>${actions()}
      </form>`);
      return;
    }

    if (action === "day") {
      const date = month + "-" + String(key).padStart(2, "0");
      show(modalHead("收支手帳") +
        `<p class="small muted">${date}</p>${table(S.entries.filter(entry => entry.date === date))}`,
        true);
      return;
    }

    if (action === "backup") {
      await queue;
      const latest = await readState();
      download(JSON.stringify(latest || S, null, 2),
        "bunny-backup-" + today() + ".json", "application/json");
      return;
    }

    if (action === "restore") { $("#restoreFile").click(); return; }
    if (action === "csv") { exportCSV(); }
  });

  /* ---------------- Input / file changes ---------------- */

  document.addEventListener("input", event => {
    const element = event.target;

    if (element.closest("#entryForm") &&
      ["amount", "date", "type", "currency"].includes(element.name)) {
      updateReaction();
    }

    if (element.id === "search") {
      const position = element.selectionStart;
      filters.q = element.value;
      render();
      $("#search").focus();
      $("#search").setSelectionRange(position, position);
    }
  });

  document.addEventListener("change", async event => {
    const element = event.target;

    if (element.id === "avatarFile") {
      const file = element.files?.[0];
      if (!file) return;

      const token = ++avatarToken;
      avatarTask = uploadAvatar(file, token);
      await avatarTask;
      return;
    }

    if (element.id === "monthInput") {
      month = element.value || today().slice(0, 7);
      render();
    }

    if (element.id === "filterType") {
      filters.type = element.value;
      render();
    }

    if (element.id === "filterCategory") {
      filters.category = element.value;
      render();
    }

    if (element.id === "entryType") {
      $("#entryCategory").innerHTML = opts(
        element.value === "income" ? incomeCats : expenseCats
      );
      updateReaction();
    }

    if (element.closest("#entryForm") &&
      ["currency", "date"].includes(element.name)) {
      updateReaction();
    }

    if (element.name === "images" && $("#uploadPreview")) {
      const token = ++previewToken;

      try {
        const images = await readImages(element.files);
        if (token !== previewToken || !element.isConnected) return;

        previewImages = images;
        $("#uploadPreview").innerHTML = images.map((source, index) =>
          `<button type="button" class="photo" data-action="previewPhoto"
            data-index="${index}" aria-label="${t("查看")} ${t("照片")} ${index + 1}">
            <img src="${esc(source)}" alt="${t("照片")} ${index + 1}">
          </button>`
        ).join("");
      } catch (error) {
        if (token !== previewToken || !element.isConnected) return;
        notify(error.message);
        element.value = "";
        previewImages = [];
        $("#uploadPreview").innerHTML = "";
      }
    }

    if (element.dataset.qty) {
      if (!element.checkValidity()) {
        element.reportValidity();
        return;
      }

      const key = element.dataset.qty;
      const qty = Number(element.value);

      await change(state => {
        const item = state.cart.find(record => record.id === key);
        if (item) item.qty = qty;
      });
    }

    if (element.dataset.shop) {
      if (!element.checkValidity()) {
        element.reportValidity();
        return;
      }

      const key = element.dataset.shop;
      const value = round(element.value);
      await change(state => { state.shop[key] = value; });
    }
  });

  /* ---------------- Form submission ---------------- */

  document.addEventListener("submit", async event => {
    const form = event.target;

    const supportedForms = [
      "nameForm", "petForm", "entryForm", "postForm", "budgetForm",
      "productForm", "goalForm", "contributionForm", "shareForm",
      "profileForm", "petSettings", "ratesForm"
    ];

    if (!supportedForms.includes(form.id)) return;

    event.preventDefault();

    if (form.dataset.saving === "true") return;
    form.dataset.saving = "true";

    const submitButton = form.querySelector('[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    const data = new FormData(form);
    let ok = false;
    let response = null;

    try {
      if (form.id === "nameForm") {
        const name = String(data.get("nickname")).trim();
        if (!name) throw Error(t("暱稱"));

        const base = data.get("base");

        onboardingDraft = {
          name,
          lang: data.get("lang"),
          base,
          rates: ratesFor(base),
          limits: {
            expense: Math.max(0.01, round(500 * reference[base] / reference.HKD)),
            income: Math.max(0.01, round(3000 * reference[base] / reference.HKD))
          }
        };

        S.lang = onboardingDraft.lang;
        document.documentElement.lang = {
          tc: "zh-Hant", sc: "zh-Hans", en: "en"
        }[S.lang];

        onboarding(2);
        return;
      }

      if (form.id === "petForm") {
        const first = form.dataset.first === "true";
        const pet = {
          ...petDraft,
          name: String(data.get("petName")).trim() || "Mochi"
        };
        const draft = first ? structuredClone(onboardingDraft) : null;

        ok = await change(state => {
          state.pet = pet;

          if (first) {
            state.profile.name = draft.name;
            state.lang = draft.lang;
            state.base = draft.base;
            state.rates = draft.rates;
            state.limits = draft.limits;
            state.ready = true;
          }
        });

        if (ok) onboardingDraft = null;
      }

      if (form.id === "entryForm") {
        const old = S.entries.find(entry => entry.id === form.dataset.id);
        const amount = round(data.get("amount"));
        const rate = entryRate(form);
        const converted = round(amount * rate);

        if (!(amount > 0 && converted > 0 && converted < 1e12)) {
          throw Error(t("金額必須大於零"));
        }

        const images = await readImages(form.elements.namedItem("images").files);

        const entry = {
          ...old,
          id: old?.id || uid(),
          created: old?.created || Date.now(),
          date: data.get("date"),
          type: data.get("type"),
          category: data.get("category"),
          note: String(data.get("note")).trim(),
          amount,
          currency: data.get("currency"),
          rate,
          converted,
          images: images.length ? images : data.get("remove") ? [] : old?.images || []
        };

        response = reaction(entry.type, converted, entry.date, old?.id || "", true);

        ok = await change(state => {
          const index = state.entries.findIndex(item => item.id === entry.id);

          if (old && index < 0) throw Error("This record was deleted");
          if (index < 0) state.entries.push(entry);
          else state.entries[index] = entry;
        });

        if (ok) {
          month = entry.date.slice(0, 7);
          render();
        }
      }

      if (form.id === "postForm") {
        const old = S.posts.find(post => post.id === form.dataset.id);
        const images = await readImages(form.elements.namedItem("images").files);

        const post = {
          ...old,
          id: old?.id || uid(),
          created: old?.created || Date.now(),
          date: old?.date || today(),
          text: String(data.get("text")).trim(),
          images: images.length ? images : data.get("remove") ? [] : old?.images || []
        };

        if (post.milestone) {
          post.milestone = { ...post.milestone, show: !data.get("hide") };
        }

        if (!post.text && !post.images.length && !post.milestone) {
          throw Error(t("請先填寫內容或加入照片"));
        }

        ok = await change(state => {
          const index = state.posts.findIndex(item => item.id === post.id);

          if (old && index < 0) throw Error("This post was deleted");
          if (index < 0) state.posts.push(post);
          else state.posts[index] = post;
        });
      }

      if (form.id === "budgetForm") {
        const budget = { total: round(data.get("total")), categories: {} };
        const key = month;

        expenseCats.forEach(category => {
          budget.categories[category] = round(data.get(category));
        });

        ok = await change(state => { state.budgets[key] = budget; });
      }

      if (form.id === "productForm") {
        const item = {
          id: uid(),
          name: String(data.get("productName")).trim(),
          price: round(data.get("price")),
          qty: Number(data.get("qty"))
        };

        ok = await change(state => { state.cart.push(item); });
      }

      if (form.id === "goalForm") {
        const goal = {
          id: uid(),
          name: String(data.get("goalName")).trim(),
          target: round(data.get("target")),
          deadline: data.get("deadline"),
          contributions: []
        };

        ok = await change(state => { state.goals.push(goal); });
      }

      if (form.id === "contributionForm") {
        const key = form.dataset.id;
        const amount = round(data.get("amount"));

        if (!(amount > 0)) throw Error(t("金額必須大於零"));

        ok = await change(state => {
          const goal = state.goals.find(item => item.id === key);
          if (!goal) throw Error("Missing goal");

          goal.contributions.push({ id: uid(), date: today(), amount });
        });

        if (ok) {
          const goal = S.goals.find(item => item.id === key);

          response = {
            mood: saved(goal) >= goal.target ? "excited" : "happy",
            message: saved(goal) >= goal.target
              ? say(
                  "願望實現咗！兔兔轉咗三個圈，小圍巾都解鎖喇～",
                  "愿望实现啦！兔兔转了三个圈，小围巾也解锁啦～",
                  "Wish fulfilled! Three happy spins—and your scarf is unlocked!"
                )
              : say(
                  "又存多啲喇！兔兔幫你睇實，唔會拎去買紅蘿蔔㗎～",
                  "又存下一点啦！兔兔替你看好，不会拿去买胡萝卜～",
                  "Another little bit saved. No secret carrot shopping, promise!"
                )
          };
        }
      }

      if (form.id === "shareForm") {
        const goal = S.goals.find(item => item.id === form.dataset.id);
        if (!goal || saved(goal) < goal.target) throw Error(t("暫無記錄"));

        const post = {
          id: uid(), created: Date.now(), date: today(), text: "", images: [],
          milestone: {
            name: goal.name,
            amount: saved(goal),
            currency: S.base,
            show: !data.get("hide")
          }
        };

        ok = await change(state => { state.posts.push(post); });
      }

      if (form.id === "profileForm") {
        // 若頭像仍在處理，等它完成；不會以空檔案覆蓋已儲存頭像。
        await avatarTask;

        const name = String(data.get("nickname")).trim();
        const bio = String(data.get("bio")).trim();
        const lang = data.get("lang");
        const base = data.get("base") || S.base;

        if (!name) throw Error(t("暱稱"));

        ok = await change(state => {
          // 只更新文字欄位，保留資料庫中最新的頭像。
          state.profile.name = name;
          state.profile.bio = bio;
          state.lang = lang;

          if (base !== state.base) {
            if (hasFinancial(state)) throw Error("Currency locked");

            const ratio = state.rates[base];
            state.limits = {
              expense: Math.max(0.01, round(state.limits.expense / ratio)),
              income: Math.max(0.01, round(state.limits.income / ratio))
            };

            state.rates = Object.fromEntries(currencies.map(currency => [
              currency,
              Math.max(0.00000001, Number((state.rates[currency] / ratio).toFixed(8)))
            ]));

            state.base = base;
            state.rates[base] = 1;
            state.shop = { discount: 0, coupon: 0, budget: 0 };
          }
        }, { resetProfile: true });
      }

      if (form.id === "petSettings") {
        const limits = {
          expense: round(data.get("expense")),
          income: round(data.get("income"))
        };
        const accessory = data.get("accessory") || "";

        ok = await change(state => {
          state.limits = limits;
          state.pet.accessory = accessory;
        });
      }

      if (form.id === "ratesForm") {
        const base = S.base;
        const rates = { [base]: 1 };

        currencies.filter(currency => currency !== base).forEach(currency => {
          rates[currency] = Number(data.get(currency));
        });

        ok = await change(state => {
          if (state.base !== base) throw Error("Currency changed");
          state.rates = rates;
        });
      }

      if (ok) {
        if ($("#modal").open) $("#modal").close();

        if (response) {
          if (form.id === "contributionForm") {
            show(modalHead("願望罐") + companion(response) +
              `<div class="actions">${btn("關閉", "close")}</div>`);
          } else {
            success(response);
          }
        } else {
          notify(t("已儲存"));
        }
      }
    } catch (error) {
      console.error("Form submission:", error);
      notify(error.message || t("儲存失敗"));
    } finally {
      delete form.dataset.saving;
      if (submitButton) submitButton.disabled = false;
    }
  });

  /* ---------------- Export / validation ---------------- */

  function download(content, name, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  function exportCSV() {
    const cell = value => {
      let text = String(value ?? "");
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return '"' + text.replaceAll('"', '""') + '"';
    };

    const rows = [
      ["Date", "Type", "Category", "Note", "Currency", "Original amount",
        "Rate", "Reporting currency", "Converted amount"],
      ...S.entries.map(entry => [
        entry.date, entry.type, t(entry.category), entry.note,
        entry.currency, entry.amount, entry.rate, S.base, entry.converted
      ])
    ];

    download(
      "\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n"),
      "bunny-transactions.csv",
      "text/csv;charset=utf-8"
    );
  }

  function valid(state) {
    const object = value =>
      value && typeof value === "object" && !Array.isArray(value);

    const number = value =>
      typeof value === "number" && Number.isFinite(value) &&
      value >= 0 && value < 1e15;

    const string = value => typeof value === "string";

    const image = value =>
      string(value) &&
      /^data:image\/jpeg;base64,[A-Za-z0-9+/=\r\n]+$/.test(value);

    const images = value =>
      Array.isArray(value) && value.length <= 3 && value.every(image);

    const date = value => {
      if (!string(value) || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      const parsed = new Date(value + "T12:00:00Z");

      return !Number.isNaN(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === value;
    };

    const item = value =>
      object(value) && string(value.id) && string(value.name) &&
      number(value.price) && value.price > 0 &&
      Number.isInteger(value.qty) && value.qty > 0 && value.qty <= 999;

    if (!object(state) || state.version !== 5 ||
      !["tc", "sc", "en"].includes(state.lang) ||
      !currencies.includes(state.base) ||
      typeof state.ready !== "boolean") return false;

    if (!object(state.profile) ||
      !string(state.profile.name) || !string(state.profile.bio) ||
      !(state.profile.avatar === "" || image(state.profile.avatar))) return false;

    if (!object(state.rates) || state.rates[state.base] !== 1 ||
      !currencies.every(currency =>
        number(state.rates[currency]) && state.rates[currency] > 0
      )) return false;

    if (!object(state.limits) ||
      !number(state.limits.expense) || state.limits.expense <= 0 ||
      !number(state.limits.income) || state.limits.income <= 0) return false;

    if (state.pet !== null && (
      !object(state.pet) ||
      !Number.isInteger(state.pet.breed) ||
      state.pet.breed < 0 || state.pet.breed > 3 ||
      !Number.isInteger(state.pet.coat) ||
      state.pet.coat < 0 || state.pet.coat > 3 ||
      !string(state.pet.name) ||
      !["", "bow", "scarf"].includes(state.pet.accessory)
    )) return false;

    if (state.ready && (!state.pet || !state.profile.name.trim())) return false;

    if (!Array.isArray(state.entries) || !state.entries.every(entry =>
      object(entry) && string(entry.id) && number(entry.created) &&
      date(entry.date) && ["income", "expense"].includes(entry.type) &&
      (entry.type === "income" ? incomeCats : expenseCats).includes(entry.category) &&
      string(entry.note) && currencies.includes(entry.currency) &&
      number(entry.amount) && entry.amount > 0 &&
      number(entry.rate) && entry.rate > 0 &&
      number(entry.converted) && entry.converted > 0 &&
      Math.abs(round(entry.amount * entry.rate) - entry.converted) < 0.011 &&
      images(entry.images) &&
      (!entry.items || Array.isArray(entry.items) && entry.items.every(item))
    )) return false;

    if (!Array.isArray(state.posts) || !state.posts.every(post =>
      object(post) && string(post.id) && number(post.created) &&
      date(post.date) && string(post.text) && images(post.images) &&
      (!post.milestone || (
        object(post.milestone) && string(post.milestone.name) &&
        number(post.milestone.amount) &&
        currencies.includes(post.milestone.currency) &&
        typeof post.milestone.show === "boolean"
      ))
    )) return false;

    if (!Array.isArray(state.goals) || !state.goals.every(goal =>
      object(goal) && string(goal.id) && string(goal.name) &&
      number(goal.target) && goal.target > 0 && date(goal.deadline) &&
      Array.isArray(goal.contributions) &&
      goal.contributions.every(contribution =>
        object(contribution) && string(contribution.id) &&
        date(contribution.date) && number(contribution.amount) &&
        contribution.amount > 0
      )
    )) return false;

    if (!object(state.budgets) ||
      !Object.entries(state.budgets).every(([key, budget]) =>
        /^\d{4}-(0[1-9]|1[0-2])$/.test(key) &&
        object(budget) && number(budget.total) && object(budget.categories) &&
        Object.entries(budget.categories).every(([category, value]) =>
          expenseCats.includes(category) && number(value)
        )
      )) return false;

    if (!Array.isArray(state.cart) || !state.cart.every(item) ||
      !object(state.shop) || !number(state.shop.discount) ||
      state.shop.discount > 100 || !number(state.shop.coupon) ||
      !number(state.shop.budget)) return false;

    // care.js 的擴充欄位會原樣保留。
    return [state.entries, state.posts, state.goals, state.cart]
      .every(list => new Set(list.map(record => record.id)).size === list.length);
  }

  /* ---------------- Start ---------------- */

  async function start() {
    const extraStyle = document.createElement("style");
    extraStyle.textContent = `
      [hidden] { display:none !important; }
      .avatar-editor {
        display:flex;
        align-items:flex-start;
        gap:18px;
        padding:17px;
        background:var(--soft,#fae8ee);
        border-radius:15px;
      }
      #avatarPreview .avatar {
        width:90px;
        height:90px;
        border-radius:23px;
        border:3px solid white;
        object-fit:cover;
        font-size:30px;
      }
      #avatarFile {
        font-size:12px;
        background:var(--paper,#fffefd);
        max-width:100%;
      }
      @media(max-width:600px) {
        .avatar-editor { flex-direction:column; }
        .avatar-editor > div { width:100%;min-width:0; }
      }
    `;
    document.head.append(extraStyle);

    $("#app").innerHTML = `
      <header class="site-header"><div class="header-inner">
        <a class="brand" href="index.html">
          <span id="brandMark"></span>
          <span><strong>Bunny.</strong><small>MY LITTLE EVERYDAY</small></span>
        </a>
        <nav id="nav" aria-label="Navigation"></nav>
        <a href="settings.html" id="headerAvatar"
          aria-label="Settings" style="text-decoration:none"></a>
      </div></header>
      <main id="content"></main>
      <footer><div id="footerNote"></div>
        <div class="footer-credit">Made by Yanice Mai</div>
      </footer>
      <dialog id="modal"></dialog>
      <dialog id="viewer" aria-label="Photo viewer"></dialog>
      <div id="toast" role="status" aria-live="polite"></div>
      <input id="restoreFile" type="file" accept=".json,application/json" hidden>
    `;

    try {
      db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE_NAME, 1);

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("data")) {
            request.result.createObjectStore("data");
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      const stored = await readState();
      if (stored && !valid(stored)) throw Error("Invalid stored data");

      S = stored || initial();
      render();

      $("#restoreFile").onchange = async event => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
          if (avatarSaving) {
            notify(say(
              "請等頭像儲存完成再恢復備份。",
              "请等头像保存完成再恢复备份。",
              "Wait for your avatar to finish saving before restoring."
            ));
            return;
          }

          if (file.size > 100 * 1024 * 1024) throw Error(t("備份格式錯誤"));
          const data = JSON.parse(await file.text());

          if (!valid(data)) throw Error(t("備份格式錯誤"));
          if (!confirm(t("恢復會取代目前資料，繼續？"))) return;

          onboardingDraft = null;
          onboardingStep = 1;

          const ok = await change(state => {
            Object.keys(state).forEach(key => delete state[key]);
            Object.assign(state, data);
          }, { resetProfile: true });

          if (ok) {
            if ($("#modal").open) $("#modal").close();
            if ($("#viewer").open) $("#viewer").close();
            notify(t("已儲存"));
          }
        } catch (error) {
          console.error("Restore:", error);
          notify(error.message || t("備份格式錯誤"));
        } finally {
          event.target.value = "";
        }
      };
    } catch (error) {
      console.error("Startup:", error);

      $("#content").innerHTML = `<section class="paper">
        <h1>暫時無法打開手帳</h1>
        <p>請透過 VS Code 的 Live Server 開啟，
        並允許瀏覽器儲存網站資料。原有資料沒有被覆寫。</p>
        <p class="small muted">
          Could not open the journal. Existing data has not been overwritten.
        </p>
      </section>`;
    }
  }

  start();
})();
