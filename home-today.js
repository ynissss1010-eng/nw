"use strict";

(() => {
  if (window.__bunnyTodaySummary) return;
  window.__bunnyTodaySummary = true;

  if (document.body.dataset.page !== "home") return;

  let dbPromise;
  let reading = false;
  let scheduled = false;
  let latest = null;
  let channel;

  try {
    channel = new BroadcastChannel("bunny-yanice");
  } catch {}

  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();

    return lang.startsWith("en") ? en :
      lang.includes("hans") || lang === "zh-cn" ? sc : tc;
  }

  function today() {
    const now = new Date();

    return [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0")
    ].join("-");
  }

  function money(amount) {
    const locale = latest?.lang === "en" ? "en-GB" :
      latest?.lang === "sc" ? "zh-CN" : "zh-HK";

    return `${latest.base} ${amount.toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  }

  function database() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open("bunny-yanice-v5", 1);

        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains("data")) {
            request.result.createObjectStore("data");
          }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    return dbPromise;
  }

  async function read() {
    const db = await database();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("data", "readonly");
      const request = tx.objectStore("data").get("main");

      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(
        tx.error || new Error("Read aborted")
      );
    });
  }

  const style = document.createElement("style");

  style.textContent = `
    /* 直接放在粉色卡片左上角，不加另一層卡片。 */
    .hero.bh-open .ht-summary {
      position:absolute;
      top:18px;
      left:38px;
      display:flex;
      align-items:flex-start;
      gap:25px;
      max-width:calc(100% - 300px);
      z-index:2;
    }

    .ht-item {
      min-width:0;
    }

    .ht-item span {
      display:block;
      color:var(--ink,#4a383d);
      font:12px/1.5 var(--font,sans-serif);
    }

    .ht-item strong {
      display:block;
      margin-top:3px;
      font:800 21px/1.35 "Nunito",sans-serif;
      font-variant-numeric:tabular-nums;
      letter-spacing:-.4px;
      overflow-wrap:anywhere;
    }

    .ht-expense strong {
      color:var(--accent,#a64f70);
    }

    .ht-income strong {
      color:var(--green,#47765d);
    }

    /* 收支數字比原本頂欄高，留足空間給歡迎文字。 */
    .hero.bh-open:has(.ht-summary) {
      padding-top:100px;
    }

    @media(max-width:1050px) {
      .hero.bh-open .ht-summary {
        left:28px;
        gap:18px;
      }

      .ht-item strong {
        font-size:19px;
      }
    }

    @media(max-width:760px) {
      /* 手機：圖標第一行，今日收支第二行，避免互相壓住。 */
      .hero.bh-open .ht-summary {
        top:77px;
        left:22px;
        right:22px;
        max-width:none;
        gap:25px;
      }

      .hero.bh-open:has(.ht-summary) {
        padding-top:152px;
      }

      .ht-item {
        flex:1;
      }

      .ht-item strong {
        font-size:21px;
      }
    }
  `;

  document.head.append(style);

  function draw() {
    const hero = document.querySelector("#content .hero.bh-open");
    if (!hero || !latest?.ready) return;

    let summary = hero.querySelector(".ht-summary");

    if (!summary) {
      summary = document.createElement("div");
      summary.className = "ht-summary";

      const expense = document.createElement("div");
      expense.className = "ht-item ht-expense";

      const income = document.createElement("div");
      income.className = "ht-item ht-income";

      [expense, income].forEach(item => {
        item.append(
          document.createElement("span"),
          document.createElement("strong")
        );
      });

      summary.append(expense, income);
      hero.append(summary);
    }

    const entries = latest.entries.filter(entry =>
      entry.date === today()
    );

    const sum = type => {
      const cents = entries
        .filter(entry => entry.type === type)
        .reduce((total, entry) =>
          total + Math.round(entry.converted * 100), 0);

      return cents / 100;
    };

    const values = [
      [
        ".ht-expense",
        say("今日支出", "今日支出", "Spent today"),
        money(sum("expense"))
      ],
      [
        ".ht-income",
        say("今日入賬", "今日入账", "Income today"),
        money(sum("income"))
      ]
    ];

    values.forEach(([selector, label, amount]) => {
      const item = summary.querySelector(selector);

      if (item.querySelector("span").textContent !== label) {
        item.querySelector("span").textContent = label;
      }

      if (item.querySelector("strong").textContent !== amount) {
        item.querySelector("strong").textContent = amount;
      }
    });
  }

  async function refresh() {
    if (reading || document.hidden) return;
    reading = true;

    try {
      latest = await read();
      draw();
    } catch (error) {
      console.error("Today summary:", error);
    } finally {
      reading = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      draw();

      if (!latest) refresh();
    });
  }

  const observer = new MutationObserver(changes => {
    // 只在首頁被重畫，或動畫場景剛建立時補回今日收支。
    const relevant = changes.some(change => {
      if (change.target instanceof Element &&
          change.target.id === "content") {
        return true;
      }

      return [...change.addedNodes].some(node =>
        node.nodeType === 1 &&
        (
          node.matches?.(".bh-stage,.hero") ||
          node.querySelector?.(".bh-stage,.hero")
        )
      );
    });

    if (relevant) {
      schedule();
      refresh();
    }
  });

  observer.observe(document.body, {
    childList:true,
    subtree:true
  });

  if (channel) {
    channel.onmessage = () => refresh();
  }

  window.addEventListener("focus", refresh);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) refresh();
  });

  // 同步本頁新增的帳目，也會在跨過午夜後更新日期。
  setInterval(refresh, 3000);

  refresh();
})();
