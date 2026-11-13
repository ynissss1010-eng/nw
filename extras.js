let database;
  let language = "tc";
  let currentState;
  let reportType = "month";
  let reportPeriod = "";
  let reportEntries = [];
  let numberTarget = null;
  let numberText = "";
  let originalReadOnly = false;
  let replaceOnDigit = false;
  const dictionary = {
    "月帳單": ["月账单", "Monthly statement"],
    "年帳單": ["年账单", "Annual statement"],
    "查看帳單": ["查看账单", "Statements"],
    "回顧每個月，也看看這一年。": [
      "回顾每个月，也看看这一年。",
      "Look back at a month or your whole year."
    ],
    "收入": ["收入", "Income"],
    "支出": ["支出", "Expenses"],
    "結餘": ["结余", "Balance"],
    "帳目數量": ["账目数量", "Records"],
    "分類統計": ["分类统计", "By category"],
    "每月收支": ["每月收支", "Monthly breakdown"],
    "帳目明細": ["账目明细", "Transactions"],
    "月份": ["月份", "Month"],
    "日期": ["日期", "Date"],
    "類型": ["类型", "Type"],
    "分類": ["分类", "Category"],
    "備註": ["备注", "Note"],
    "金額": ["金额", "Amount"],
    "占支出比例": ["占支出比例", "Share of expenses"],
    "本期沒有帳目": ["本期没有账目", "No records in this period"],
    "關閉": ["关闭", "Close"],
    "確認": ["确认", "Confirm"],
    "清空": ["清空", "Clear"],
    "刪除一位": ["删除一位", "Backspace"],
    "取消": ["取消", "Cancel"],
    "數字小鍵盤": ["数字小键盘", "Number pad"],
    "匯出帳單": ["导出账单", "Export statement"],
    "帳單讀取失敗，請重新開啟頁面。": [
      "账单读取失败，请重新打开页面。",
      "Could not load the statement. Reload the page."
    ],
    "請輸入有效數字": [
      "请输入有效数字",
      "Enter a valid number"
    ],
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
    "帳單使用每筆記帳時保存的換算金額。": [
      "账单使用每笔记账时保存的换算金额。",
      "Statements use the converted amount saved with each record."
    ]
  };
  function t(key) {
    if (language === "en") return dictionary[key]?.[1] || key;
    if (language === "sc") return dictionary[key]?.[0] || key;
    return key;
  }
  function round(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }
  function localMonth() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  function money(value) {
    return `${currentState?.base || "HKD"} ${Number(value).toLocaleString(
      language === "en" ? "en-GB" : language === "sc" ? "zh-CN" : "zh-HK",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    )}`;
  }
  function total(entries, type) {
    return round(
      entries
        .filter(entry => entry.type === type)
        .reduce((sum, entry) => sum + Number(entry.converted), 0)
    );
  }
  async function getDatabase() {
    if (database) return database;
    // 與上一版 app.js 使用相同資料庫。
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open("bunny-yanice-v5", 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("data")) {
          request.result.createObjectStore("data");
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return database;
  }
  async function readState() {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readonly");
      const request = transaction.objectStore("data").get("main");
      transaction.oncomplete = () => {
        const state = request.result;
        language = state?.lang || "tc";
        resolve(state);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }
  /* -------------------- Styles -------------------- */
  const stylesheet = document.createElement("style");
  stylesheet.textContent = `
    .extra-statement-bar {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:16px;
      padding:17px 20px;
      margin-bottom:24px;
      background:var(--soft, #fae8ee);
      border:1px solid var(--line, #ecdfdf);
      border-radius:16px;
    }
    .extra-statement-bar strong {
      display:block;
      font-size:16px;
    }
    .extra-statement-bar small {
      color:var(--muted, #806b72);
      font-size:12px;
    }
    .extra-statement-actions {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
    }
    #statementDialog {
      width:min(980px, calc(100% - 24px));
      max-height:92dvh;
    }
    .extra-dialog-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:15px;
      margin-bottom:20px;
    }
    .extra-dialog-header h2 {
      margin:0;
    }
    .extra-close {
      font-size:24px;
      border:0;
      padding:2px 10px;
      background:transparent;
    }
    .extra-period-row {
      display:flex;
      gap:10px;
      align-items:center;
      flex-wrap:wrap;
      margin-bottom:20px;
    }
    .extra-period-row input,
    .extra-period-row select {
      width:auto;
      min-width:150px;
    }
    .extra-report-metrics {
      display:grid;
      grid-template-columns:repeat(4, minmax(0,1fr));
      gap:15px;
      background:var(--soft, #fae8ee);
      border-radius:15px;
      padding:20px;
      margin-bottom:25px;
    }
    .extra-report-metrics span {
      display:block;
      font-size:12px;
      color:var(--muted, #806b72);
    }
    .extra-report-metrics strong {
      display:block;
      margin-top:6px;
      font-family:"Nunito", sans-serif;
      font-size:23px;
      overflow-wrap:anywhere;
    }
    .extra-report-section {
      margin:26px 0;
    }
    .extra-report-section h3 {
      margin-bottom:12px;
    }
    .extra-table-wrap {
      overflow:auto;
    }
    .extra-report-table {
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }
    .extra-report-table th,
    .extra-report-table td {
      padding:12px 9px;
      text-align:left;
      border-bottom:1px solid var(--line, #ecdfdf);
    }
    .extra-report-table th {
      font-size:11px;
      font-weight:400;
      color:var(--muted, #806b72);
    }
    .extra-report-table .extra-value {
      white-space:nowrap;
      font-family:"Nunito", sans-serif;
      font-variant-numeric:tabular-nums;
    }
    .extra-category {
      display:grid;
      grid-template-columns:80px minmax(0,1fr) auto;
      gap:12px;
      align-items:center;
      padding:12px 0;
      border-bottom:1px dashed var(--line, #ecdfdf);
      font-size:13px;
    }
    .extra-category-track {
      height:7px;
      border-radius:10px;
      overflow:hidden;
      background:#eee5e7;
    }
    .extra-category-track i {
      height:100%;
      display:block;
      background:var(--accent, #a64f70);
      border-radius:10px;
    }
    .extra-empty {
      padding:25px 10px;
      text-align:center;
      color:var(--muted, #806b72);
      font-size:13px;
    }
    #numberPadDialog {
      width:min(370px, calc(100% - 24px));
      padding:22px;
    }
    .extra-pad-title {
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:12px;
      font-size:13px;
      color:var(--muted, #806b72);
      margin-bottom:14px;
    }
    .extra-pad-display {
      background:var(--soft, #fae8ee);
      color:var(--ink, #4a383d);
      padding:17px;
      border-radius:14px;
      min-height:80px;
      font:800 32px/1.4 "Nunito", sans-serif;
      text-align:right;
      overflow-wrap:anywhere;
      margin-bottom:15px;
    }
    .extra-pad-grid {
      display:grid;
      grid-template-columns:repeat(3, 1fr);
      gap:9px;
    }
    .extra-pad-grid button {
      min-height:60px;
      font:700 24px "Nunito", sans-serif;
      border-radius:13px;
    }
    .extra-pad-tools {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:9px;
      margin:9px 0;
    }
    .extra-pad-tools button {
      font-size:13px;
      min-height:43px;
    }
    .extra-pad-confirm {
      width:100%;
      margin-top:3px;
      font-size:16px;
      min-height:49px;
    }
    #numberPadError {
      min-height:20px;
      font-size:12px;
      color:#a23f50;
      margin:8px 0 0;
    }
    @media(max-width:650px) {
      .extra-statement-bar {
        align-items:flex-start;
        flex-direction:column;
        padding:16px;
      }
      .extra-report-metrics {
        grid-template-columns:1fr 1fr;
        padding:17px;
        gap:18px;
      }
      .extra-report-metrics strong {
        font-size:21px;
      }
      .extra-report-table {
        min-width:520px;
      }
      .extra-category {
        grid-template-columns:62px minmax(0,1fr) auto;
        gap:8px;
        font-size:12px;
      }
    }
  `;
  document.head.append(stylesheet);
  /* -------------------- Statements -------------------- */
  function ensureDialogs() {
    if (!$("#statementDialog")) {
      const dialog = document.createElement("dialog");
      dialog.id = "statementDialog";
      dialog.setAttribute("aria-label", "Statement");
      document.body.append(dialog);
    }
    if (!$("#numberPadDialog")) {
      const dialog = document.createElement("dialog");
      dialog.id = "numberPadDialog";
      dialog.setAttribute("aria-label", "Number pad");
      dialog.addEventListener("cancel", event => {
        event.preventDefault();
        closeNumberPad(false);
      });
      document.body.append(dialog);
    }
  }
  async function mountStatementButtons() {
    const page = document.body.dataset.page;
    if (!["ledger", "analytics"].includes(page)) return;
    const content = $("#content");
    if (!content) return;
    const state = await readState();
    // 使用者完成「名字 → 領養兔子」後才顯示帳單。
    if (!state?.ready || !content.isConnected) return;
    if ($("#extraStatementBar")) return;
    const bar = document.createElement("section");
    bar.id = "extraStatementBar";
    bar.className = "extra-statement-bar";
    bar.innerHTML = `
      <div>
        <strong>${t("查看帳單")}</strong>
        <small>${t("回顧每個月，也看看這一年。")}</small>
      </div>
      <div class="extra-statement-actions">
        <button type="button" data-extra="monthly">${t("月帳單")}</button>
        <button type="button" data-extra="annual">${t("年帳單")}</button>
      </div>
    `;
    content.prepend(bar);
  }
  function yearOptions(selectedYear) {
    const now = new Date().getFullYear();
    const years = new Set([
      String(now),
      String(now - 1),
      String(now + 1),
      String(selectedYear)
    ]);
    currentState.entries.forEach(entry => {
      years.add(entry.date.slice(0, 4));
    });
    return [...years]
      .sort((a, b) => Number(b) - Number(a))
      .map(year => `
        <option value="${escapeHTML(year)}"
          ${String(selectedYear) === year ? "selected" : ""}>
          ${escapeHTML(year)}
        </option>
      `).join("");
  }
  function metric(label, value) {
    return `
      <div>
        <span>${t(label)}</span>
        <strong>${escapeHTML(value)}</strong>
      </div>
    `;
  }
  function categorySummary(entries) {
    const expenses = entries.filter(entry => entry.type === "expense");
    const spending = total(entries, "expense");
    const grouped = new Map();
    expenses.forEach(entry => {
      grouped.set(
        entry.category,
        (grouped.get(entry.category) || 0) + entry.converted
      );
    });
    const categories = [...grouped]
      .map(([category, value]) => ({category, value: round(value)}))
      .sort((a, b) => b.value - a.value);
    if (!categories.length) {
      return `<div class="extra-empty">${t("本期沒有帳目")}</div>`;
    }
    return categories.map(item => {
      const percentage = spending ? item.value / spending * 100 : 0;
      return `
        <div class="extra-category">
          <span>${escapeHTML(t(item.category))}</span>
          <div class="extra-category-track">
            <i style="width:${Math.min(100, percentage)}%"></i>
          </div>
          <span>
            ${escapeHTML(money(item.value))}
            <small style="color:var(--muted)">
              · ${percentage.toFixed(1)}%
            </small>
          </span>
        </div>
      `;
    }).join("");
  }
  function monthlyBreakdown(year) {
    return `
      <div class="extra-table-wrap">
        <table class="extra-report-table">
          <thead>
            <tr>
              <th>${t("月份")}</th>
              <th>${t("收入")}</th>
              <th>${t("支出")}</th>
              <th>${t("結餘")}</th>
              <th>${t("帳目數量")}</th>
            </tr>
          </thead>
          <tbody>
            ${Array.from({length: 12}, (_, index) => {
              const key = `${year}-${String(index + 1).padStart(2, "0")}`;
              const entries = currentState.entries.filter(entry =>
                entry.date.startsWith(key)
              );
              const income = total(entries, "income");
              const expense = total(entries, "expense");
              return `
                <tr>
                  <td>${key}</td>
                  <td class="extra-value income">${money(income)}</td>
                  <td class="extra-value expense">${money(expense)}</td>
                  <td class="extra-value">${money(round(income - expense))}</td>
                  <td>${entries.length}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  function detailTable(entries) {
    if (!entries.length) {
      return `<div class="extra-empty">${t("本期沒有帳目")}</div>`;
    }
    const sorted = [...entries].sort((a, b) =>
      b.date.localeCompare(a.date) || b.created - a.created
    );
    return `
      <div class="extra-table-wrap">
        <table class="extra-report-table">
          <thead>
            <tr>
              <th>${t("日期")}</th>
              <th>${t("類型")}</th>
              <th>${t("分類")}</th>
              <th>${t("備註")}</th>
              <th>${t("金額")}</th>
            </tr>
          </thead>
          <tbody>
            ${sorted.map(entry => `
              <tr>
                <td>${escapeHTML(entry.date)}</td>
                <td>${t(entry.type === "income" ? "收入" : "支出")}</td>
                <td>${escapeHTML(t(entry.category))}</td>
                <td>${escapeHTML(entry.note || "—")}</td>
                <td class="extra-value ${entry.type}">
                  ${entry.type === "income" ? "+" : "−"}${money(entry.converted)}
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }
  function renderStatement() {
    reportEntries = currentState.entries.filter(entry =>
      entry.date.startsWith(reportPeriod)
    );
    const income = total(reportEntries, "income");
    const expense = total(reportEntries, "expense");
    $("#statementDialog").innerHTML = `
      <div class="extra-dialog-header">
        <div>
          <h2>${t(reportType === "month" ? "月帳單" : "年帳單")}</h2>
          <small style="color:var(--muted)">
            ${escapeHTML(currentState.profile.name)} · ${escapeHTML(currentState.base)}
          </small>
        </div>
        <button type="button" class="extra-close"
          data-extra="closeStatement" aria-label="${t("關閉")}">×</button>
      </div>
      <div class="extra-period-row">
        ${reportType === "month" ? `
          <input id="statementPeriod" type="month"
            aria-label="${t("月份")}"
            value="${escapeHTML(reportPeriod)}">
        ` : `
          <select id="statementPeriod" aria-label="${t("年帳單")}">
            ${yearOptions(reportPeriod)}
          </select>
        `}
        <button type="button" data-extra="exportStatement">
          ${t("匯出帳單")}
        </button>
      </div>
      <section class="extra-report-metrics">
        ${metric("收入", money(income))}
        ${metric("支出", money(expense))}
        ${metric("結餘", money(round(income - expense)))}
        ${metric("帳目數量", reportEntries.length)}
      </section>
      ${reportType === "year" ? `
        <section class="extra-report-section">
          <h3>${t("每月收支")}</h3>
          ${monthlyBreakdown(reportPeriod)}
        </section>
      ` : ""}
      <section class="extra-report-section">
        <h3>${t("分類統計")}</h3>
        ${categorySummary(reportEntries)}
      </section>
      <section class="extra-report-section">
        <h3>${t("帳目明細")}</h3>
        ${detailTable(reportEntries)}
      </section>
      <p style="font-size:11px;color:var(--muted)">
        ${t("帳單使用每筆記帳時保存的換算金額。")}
      </p>
    `;
  }
  async function openStatement(type) {
    try {
      currentState = await readState();
      if (!currentState?.ready) return;
      reportType = type;
      const selectedMonth = $("#monthInput")?.value || localMonth();
      reportPeriod = type === "month"
        ? selectedMonth
        : selectedMonth.slice(0, 4);
      renderStatement();
      if (!$("#statementDialog").open) {
        $("#statementDialog").showModal();
      }
    } catch (error) {
      console.error(error);
      alert(t("帳單讀取失敗，請重新開啟頁面。"));
    }
  }
  function exportStatement() {
    const csvCell = value => {
      let text = String(value ?? "");
      // 避免備註被試算表當成公式執行。
      if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const income = total(reportEntries, "income");
    const expense = total(reportEntries, "expense");
    const rows = [
      [t(reportType === "month" ? "月帳單" : "年帳單"), reportPeriod],
      [currentState.profile.name, currentState.base],
      [],
      [t("收入"), income],
      [t("支出"), expense],
      [t("結餘"), round(income - expense)],
      [t("帳目數量"), reportEntries.length],
      [],
      [t("日期"), t("類型"), t("分類"), t("備註"), t("貨幣"), t("金額")]
    ];
    [...reportEntries]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach(entry => {
        rows.push([
          entry.date,
          t(entry.type === "income" ? "收入" : "支出"),
          t(entry.category),
          entry.note,
          currentState.base,
          entry.converted
        ]);
      });
    const content = "\uFEFF" +
      rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], {type: "text/csv;charset=utf-8"})
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bunny-${reportType}-${reportPeriod}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
  /* -------------------- Number pad -------------------- */
  function getInputLabel(input) {
    const label = input.closest("label");
    if (label) {
      const copy = label.cloneNode(true);
      copy.querySelectorAll("input,select,textarea,button").forEach(node => node.remove());
      const text = copy.textContent.trim();
      if (text) return text;
    }
    return input.getAttribute("aria-label") || t("數字小鍵盤");
  }
  function allowDecimal() {
    if (!numberTarget) return true;
    // 數量 step=1 不提供小數點。
    const step = numberTarget.getAttribute("step");
    return step === "any" || step !== "1";
  }
  function drawNumberPad() {
    const dialog = $("#numberPadDialog");
    dialog.innerHTML = `
      <div class="extra-pad-title">
        <strong>${escapeHTML(getInputLabel(numberTarget))}</strong>
        <span>${t("數字小鍵盤")}</span>
      </div>
      <div class="extra-pad-display"
        id="numberPadDisplay"
        role="status"
        aria-live="polite">${escapeHTML(numberText || "0")}</div>
      <div class="extra-pad-grid">
        ${["1","2","3","4","5","6","7","8","9","00","0","."].map(key => `
          <button type="button" data-pad-key="${key}"
            ${key === "." && !allowDecimal() ? "disabled" : ""}>
            ${key}
          </button>
        `).join("")}
      </div>
      <div class="extra-pad-tools">
        <button type="button" data-pad-action="clear">${t("清空")}</button>
        <button type="button" data-pad-action="backspace"
          aria-label="${t("刪除一位")}">⌫</button>
      </div>
      <div class="extra-pad-tools">
        <button type="button" data-pad-action="cancel">${t("取消")}</button>
        <button type="button" class="primary"
          data-pad-action="confirm">${t("確認")}</button>
      </div>
      <p id="numberPadError" role="alert"></p>
    `;
    // 開啟後預設選中第一個數字鍵，實體鍵盤仍然可以輸入。
    dialog.querySelector("[data-pad-key]")?.focus();
  }
  function openNumberPad(input) {
    if (input.disabled || input.readOnly) return;
    if ($("#numberPadDialog").open) return;
    numberTarget = input;
    numberText = input.value;
    originalReadOnly = input.readOnly;
    // 第一個數字會替換原有值，方便直接修改金額或數量。
    replaceOnDigit = true;
    input.readOnly = true;
    drawNumberPad();
    $("#numberPadDialog").showModal();
  }
  function previewNumber() {
    if (!numberTarget?.isConnected) return;
    // 輸入過程先更新原欄位，讓兔子表情、折算提示即時回應。
    numberTarget.value =
      numberText === "" || numberText === "."
        ? ""
        : numberText.endsWith(".")
          ? numberText.slice(0, -1)
          : numberText;
    numberTarget.dispatchEvent(new Event("input", {bubbles: true}));
    $("#numberPadDisplay").textContent = numberText || "0";
    $("#numberPadError").textContent = "";
  }
  function appendDigit(key) {
    if (!numberTarget) return;
    if (key === ".") {
      if (!allowDecimal()) return;
      // 按小數點會保留現有整數部分。
      replaceOnDigit = false;
      if (!numberText) numberText = "0";
      if (numberText.includes(".")) return;
      numberText += ".";
      previewNumber();
      return;
    }
    if (replaceOnDigit) {
      numberText = "";
      replaceOnDigit = false;
    }
    const next = (numberText + key).replace(/^0+(?=\d)/, "");
    // 以原欄位的 max 和 step 作最終驗證；此處限制極長字串。
    if (next.replace(".", "").length > 16) return;
    numberText = next;
    previewNumber();
  }
  function padBackspace() {
    replaceOnDigit = false;
    numberText = numberText.slice(0, -1);
    previewNumber();
  }
  function closeNumberPad(confirmValue) {
    if (!numberTarget) return;
    const target = numberTarget;
    if (confirmValue) {
      const value = numberText.endsWith(".")
        ? numberText.slice(0, -1)
        : numberText;
      target.value = value;
      target.readOnly = originalReadOnly;
      // 使用原有 min / max / step / required 驗證規則。
      if (!target.checkValidity()) {
        target.readOnly = true;
        $("#numberPadError").textContent =
          target.validationMessage || t("請輸入有效數字");
        return;
      }
    } else {
      // 取消時恢復開啟前的數值。
      target.value = target.dataset.padOriginalValue ?? "";
      target.readOnly = originalReadOnly;
    }
    delete target.dataset.padOriginalValue;
    $("#numberPadDialog").close();
    numberTarget = null;
    if (target.isConnected) {
      target.dispatchEvent(new Event("input", {bubbles: true}));
      // 確認後才通知購物清單等功能保存新值。
      if (confirmValue) {
        target.dispatchEvent(new Event("change", {bubbles: true}));
      }
      target.focus({preventScroll: true});
    }
  }
  /* -------------------- Events -------------------- */
  document.addEventListener("click", event => {
    const padKey = event.target.closest("[data-pad-key]");
    if (padKey) {
      appendDigit(padKey.dataset.padKey);
      return;
    }
    const padAction = event.target.closest("[data-pad-action]");
    if (padAction) {
      const action = padAction.dataset.padAction;
      if (action === "clear") {
        replaceOnDigit = false;
        numberText = "";
        previewNumber();
      }
      if (action === "backspace") padBackspace();
      if (action === "cancel") closeNumberPad(false);
      if (action === "confirm") closeNumberPad(true);
      return;
    }
    const extraButton = event.target.closest("[data-extra]");
    if (extraButton) {
      const action = extraButton.dataset.extra;
      if (action === "monthly") openStatement("month");
      if (action === "annual") openStatement("year");
      if (action === "closeStatement") $("#statementDialog").close();
      if (action === "exportStatement") exportStatement();
      return;
    }
    const input = event.target.closest('input[type="number"]');
    if (input && !input.closest("#numberPadDialog")) {
      if (!input.disabled && !input.readOnly) {
        input.dataset.padOriginalValue = input.value;
        openNumberPad(input);
      }
    }
  });
  document.addEventListener("change", event => {
    if (event.target.id !== "statementPeriod") return;
    const value = event.target.value;
    if (!value) return;
    reportPeriod = value;
    renderStatement();
  });
  document.addEventListener("keydown", event => {
    if (!$("#numberPadDialog")?.open) return;
    if (/^\d$/.test(event.key)) {
      event.preventDefault();
      appendDigit(event.key);
      return;
    }
    if (event.key === "." || event.key === ",") {
      event.preventDefault();
      appendDigit(".");
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      padBackspace();
      return;
    }
    if (event.key === "Delete") {
      event.preventDefault();
      replaceOnDigit = false;
      numberText = "";
      previewNumber();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      closeNumberPad(true);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      closeNumberPad(false);
    }
  }, true);
  /* app.js 每次儲存或篩選都會重畫頁面，因此需要重新放入帳單入口。 */
  let mountScheduled = false;
  const observer = new MutationObserver(() => {
    if (mountScheduled) return;
    const content = $("#content");
    if (!content || $("#extraStatementBar")) return;
    mountScheduled = true;
    requestAnimationFrame(async () => {
      try {
        await mountStatementButtons();
      } catch (error) {
        console.error(error);
      } finally {
        mountScheduled = false;
      }
    });
  });
  ensureDialogs();
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  mountStatementButtons().catch(console.error);
})();