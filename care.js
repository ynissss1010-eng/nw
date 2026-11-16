"use strict";

(() => {
  if (window.__bunnyFoodCareV2) return;
  window.__bunnyFoodCareV2 = true;

  const $ = s => document.querySelector(s);
  const DB_NAME = "bunny-yanice-v5";

  const foods = {
    grass: {
      tc: "提摩西草",
      sc: "提摩西草",
      en: "Timothy hay",
      count: 1,
      income: 10,
      points: 5
    },
    pellets: {
      tc: "兔糧",
      sc: "兔粮",
      en: "Pellets",
      count: 3,
      income: 50,
      points: 8
    },
    apple: {
      tc: "蘋果乾",
      sc: "苹果干",
      en: "Dried apple",
      count: 5,
      income: 100,
      points: 12
    }
  };

  let dbPromise;
  let state;
  let queue = Promise.resolve();
  let syncing = false;
  let scheduled = false;
  let feeding = false;
  let message = "";
  let messageUntil = 0;
  let channel;

  try {
    channel = new BroadcastChannel("bunny-yanice");
  } catch {}

  function text(tc, sc, en) {
    return state?.lang === "en" ? en :
      state?.lang === "sc" ? sc : tc;
  }

  function foodName(food) {
    return food[state?.lang || "tc"];
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[c]));
  }

  function level(value) {
    if (value >= 80) {
      return text("超級黏你", "超级黏你", "Your little shadow");
    }
    if (value >= 50) {
      return text("好鍾意你", "好喜欢你", "Very fond of you");
    }
    if (value >= 20) {
      return text("開始熟絡", "开始熟络", "Getting closer");
    }
    return text("初次見面", "初次见面", "Getting acquainted");
  }

  function money(cents) {
    return `${state.base} ${(cents / 100).toLocaleString(
      state.lang === "en" ? "en-GB" :
        state.lang === "sc" ? "zh-CN" : "zh-HK",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      }
    )}`;
  }

  function database() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);

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

  function validCare(care) {
    return care &&
      care.version === 1 &&
      Number.isSafeInteger(care.grass) &&
      care.grass >= 0 &&
      Number.isInteger(care.affection) &&
      care.affection >= 0 &&
      care.affection <= 100 &&
      Number.isSafeInteger(care.feedCount) &&
      care.feedCount >= 0 &&
      Array.isArray(care.seenEntryIds) &&
      care.seenEntryIds.every(id => typeof id === "string");
  }

  /*
   * 保留 rabbitCare.version = 1：
   * 與 app.js、petting.js、bunny-life.js 的既有資料相容。
   * 新獎勵系統另外存在 foodRewards。
   */
  function prepareCare(latest) {
    latest.rabbitCare ||= {
      version: 1,
      grass: 0,
      affection: 0,
      feedCount: 0,
      seenEntryIds: []
    };

    const care = latest.rabbitCare;

    if (!validCare(care)) {
      throw Error("Invalid care data");
    }

    if (!care.foodRewards) {
      care.pellets = 0;
      care.apple = 0;

      care.foodRewards = {
        version: 1,
        count: 0,
        incomeCents: 0,
        claimed: {
          grass: 0,
          pellets: 0,
          apple: 0
        },
        // 升級前的帳目只建立基準。
        seenIds: [...new Set(latest.entries.map(entry => entry.id))]
      };
    }

    const rewards = care.foodRewards;

    if (
      rewards.version !== 1 ||
      !Number.isSafeInteger(rewards.count) ||
      rewards.count < 0 ||
      !Number.isSafeInteger(rewards.incomeCents) ||
      rewards.incomeCents < 0 ||
      !Array.isArray(rewards.seenIds) ||
      !rewards.seenIds.every(id => typeof id === "string") ||
      !rewards.claimed
    ) {
      throw Error("Invalid food reward data");
    }

    for (const key of Object.keys(foods)) {
      if (
        !Number.isSafeInteger(care[key]) ||
        care[key] < 0 ||
        !Number.isSafeInteger(rewards.claimed[key]) ||
        rewards.claimed[key] < 0
      ) {
        throw Error("Invalid food inventory");
      }
    }

    return care;
  }

  function transaction(action = "sync", foodKey = "") {
    const job = queue.then(async () => {
      const db = await database();

      return new Promise((resolve, reject) => {
        const tx = db.transaction("data", "readwrite");
        const store = tx.objectStore("data");
        const request = store.get("main");

        let result = null;
        let failure;

        request.onsuccess = () => {
          try {
            const latest = request.result;

            if (!latest?.ready || !Array.isArray(latest.entries)) {
              return;
            }

            const before = JSON.stringify(latest.rabbitCare);
            const care = prepareCare(latest);
            const rewards = care.foodRewards;
            const seen = new Set(rewards.seenIds);

            result = {
              state: latest,
              earned: { grass: 0, pellets: 0, apple: 0 },
              fed: false,
              delta: 0,
              error: ""
            };

            /*
             * 新帳目只累計一次。
             * 收入使用第一次看到該帳目時的 converted 金額。
             */
            latest.entries.forEach(entry => {
              if (
                typeof entry.id !== "string" ||
                seen.has(entry.id)
              ) return;

              seen.add(entry.id);
              rewards.count++;

              if (entry.type === "income") {
                const cents = Math.round(Number(entry.converted) * 100);

                if (!Number.isSafeInteger(cents) || cents < 0) {
                  throw Error("Invalid income amount");
                }

                rewards.incomeCents += cents;
              }
            });

            if (
              !Number.isSafeInteger(rewards.count) ||
              !Number.isSafeInteger(rewards.incomeCents)
            ) {
              throw Error("Reward totals too large");
            }

            rewards.seenIds = [...seen];

            // 保留舊觸摸程式使用的欄位。
            care.seenEntryIds = [...new Set([
              ...care.seenEntryIds,
              ...rewards.seenIds
            ])];

            for (const [key, food] of Object.entries(foods)) {
              const byCount = Math.floor(
                rewards.count / food.count
              );

              const byIncome = Math.floor(
                rewards.incomeCents / (food.income * 100)
              );

              // OR：取較高進度，同一級不發兩次。
              const entitled = Math.max(byCount, byIncome);
              const earned = Math.max(
                0,
                entitled - rewards.claimed[key]
              );

              care[key] += earned;
              rewards.claimed[key] += earned;
              result.earned[key] = earned;

              if (!Number.isSafeInteger(care[key])) {
                throw Error("Inventory too large");
              }
            }

            if (action === "feed") {
              const food = foods[foodKey];

              if (!food) throw Error("Unknown food");

              if (care.affection >= 100) {
                result.error = "full";
              } else if (care[foodKey] < 1) {
                result.error = "empty";
              } else {
                const old = care.affection;

                care[foodKey]--;
                care.affection = Math.min(
                  100,
                  care.affection + food.points
                );

                care.feedCount++;
                care.lastFood = foodKey;

                result.fed = true;
                result.delta = care.affection - old;
              }
            }

            result.changed =
              before !== JSON.stringify(latest.rabbitCare);

            if (result.changed) store.put(latest, "main");
          } catch (error) {
            failure = error;
            tx.abort();
          }
        };

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(failure || tx.error);
        tx.onabort = () => reject(
          failure || tx.error || Error("Care update aborted")
        );
      });
    });

    queue = job.catch(() => null);
    return job;
  }

  /* ---------- 直接融入粉色卡片左下方 ---------- */

  const style = document.createElement("style");

  style.textContent = `
    .hero > .rabbit-care,
    .hero > div > .rabbit-care {
      min-width:0;
    }

    .hero .rabbit-care {
      margin:23px 0 0;
      padding:18px 0 0;
      border:0;
      border-top:1px dashed #b8819655;
      border-radius:0;
      background:transparent;
      box-shadow:none;
      text-align:left;
    }

    .rabbit-care-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      flex-wrap:wrap;
      gap:8px;
      margin-bottom:11px;
    }

    .rabbit-care-header h2 {
      margin:0;
      font-size:15px;
    }

    .rabbit-care-level {
      color:var(--accent,#a64f70);
      font-size:11px;
    }

    .rabbit-care-numbers {
      font-size:12px;
      display:flex;
      justify-content:space-between;
      gap:10px;
    }

    .rabbit-care-track {
      height:7px;
      margin:9px 0 13px;
      border-radius:12px;
      overflow:hidden;
      background:#ffffff99;
    }

    .rabbit-care-track i {
      display:block;
      height:100%;
      background:var(--accent,#a64f70);
      border-radius:12px;
      transition:width .4s ease;
    }

    .rc-foods {
      display:grid;
      grid-template-columns:repeat(3,minmax(0,1fr));
      gap:8px;
    }

    .rc-food {
      min-width:0;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:3px;
      padding:8px 3px;
      border:1px solid #ffffffaa;
      border-radius:13px;
      background:#ffffff45;
      color:var(--ink,#4a383d);
      text-align:center;
    }

    .rc-food:hover {
      background:#ffffff85;
    }

    .rc-food svg {
      display:block;
      width:45px;
      height:45px;
    }

    .rc-food strong {
      font-size:12px;
    }

    .rc-food small {
      font-size:10px;
      color:var(--muted,#806b72);
    }

    .rabbit-care-message {
      margin:11px 0 0 !important;
      font-size:12px !important;
      line-height:1.7 !important;
      color:var(--accent,#a64f70);
    }

    .rc-rules {
      margin-top:11px;
      font-size:11px;
      color:var(--muted,#806b72);
    }

    .rc-rules summary {
      cursor:pointer;
      width:fit-content;
    }

    .rc-rule-row {
      margin-top:8px;
      line-height:1.7;
    }

    .rc-feedback {
      display:inline-block;
      margin-left:6px;
      font-weight:800;
      color:var(--accent,#a64f70);
    }

    #content > .rabbit-care {
      padding:20px;
      margin:24px 0 0;
      border:1px solid var(--line,#ecdfdf);
      border-radius:16px;
      background:var(--paper,#fffefd);
      max-width:560px;
    }

    @media(max-width:760px) {
      .hero .rabbit-care {
        margin-top:18px;
        padding-top:15px;
      }

      .rc-food {
        min-height:105px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      .rabbit-care-track i {
        transition:none;
      }
    }
  `;

  document.head.append(style);

  function foodIcon(key) {
    const art = {
      grass: `
        <path d="M23 42Q12 26 11 8M25 42Q23 22 25 4
          M27 42Q35 23 39 10"
          fill="none" stroke="#8c9d61" stroke-width="3"
          stroke-linecap="round"/>
        <path d="m13 22-7-6m17 8-7-8m16 7 7-5"
          fill="none" stroke="#a8b379" stroke-width="2.5"/>
        <ellipse cx="11" cy="9" rx="3" ry="7"
          fill="#b7bd86" transform="rotate(-12 11 9)"/>
        <ellipse cx="25" cy="6" rx="3" ry="7"
          fill="#b7bd86"/>
        <ellipse cx="39" cy="11" rx="3" ry="7"
          fill="#b7bd86" transform="rotate(20 39 11)"/>
        <path d="M14 34q11 5 22 0l-2 9H17Z"
          fill="#dcb68e" stroke="#a48161" stroke-width="1.3"/>
      `,
      pellets: `
        <path d="M8 25h34q-2 18-17 18T8 25Z"
          fill="#e9c5d4" stroke="#a56d85" stroke-width="1.5"/>
        <ellipse cx="25" cy="25" rx="17" ry="5"
          fill="#b58b66" stroke="#a56d85" stroke-width="1.3"/>
        <g fill="#ccb18a" stroke="#947454" stroke-width="1">
          <rect x="12" y="21" width="8" height="4" rx="2"
            transform="rotate(-22 12 21)"/>
          <rect x="24" y="22" width="8" height="4" rx="2"/>
          <rect x="29" y="17" width="8" height="4" rx="2"
            transform="rotate(25 29 17)"/>
          <rect x="18" y="15" width="8" height="4" rx="2"/>
        </g>
        <path d="M21 34q4 4 8 0"
          fill="none" stroke="#a56d85" stroke-width="1.5"/>
      `,
      apple: `
        <path d="M9 18q15-15 32 0
          q-1 22-16 25Q10 39 9 18Z"
          fill="#d98983" stroke="#aa655f" stroke-width="1.5"/>
        <path d="M13 19q12-10 24 0
          q-2 16-12 20Q15 35 13 19Z"
          fill="#f3d49d"/>
        <path d="M25 19v15"
          stroke="#e5bc83" stroke-width="2"/>
        <ellipse cx="22" cy="27" rx="1.5" ry="3"
          fill="#966951" transform="rotate(-20 22 27)"/>
        <ellipse cx="28" cy="27" rx="1.5" ry="3"
          fill="#966951" transform="rotate(20 28 27)"/>
        <path d="M25 13q0-6 5-8"
          fill="none" stroke="#947454" stroke-width="2"/>
        <path d="M29 8q7-7 11-1-5 6-11 1Z"
          fill="#9ead79"/>
      `
    };

    return `<svg viewBox="0 0 50 50" aria-hidden="true">
      ${art[key]}
    </svg>`;
  }

  function draw() {
    if (!state?.ready || !validCare(state.rabbitCare)) return;

    const page = document.body.dataset.page;
    const content = $("#content");
    if (!content) return;

    let host;

    if (page === "home") {
      // 原本粉色卡片左側的歡迎文字區。
      host = content.querySelector(".hero > div:first-child");
    } else if (page === "settings") {
      host = content;
    } else {
      return;
    }

    if (!host) return;

    let panel = $("#rabbitCarePanel");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "rabbitCarePanel";
      panel.className = "rabbit-care";
    }

    if (panel.parentElement !== host) host.append(panel);

    const care = state.rabbitCare;
    const rewards = care.foodRewards;
    const sleeping =
      Number(state.rabbitLife?.restUntil || 0) > Date.now();

    const disabled = feeding || sleeping || care.affection >= 100;

    const defaultMessage = sleeping
      ? text(
          "兔兔瞓緊覺，等佢瞓醒再食啦～",
          "兔兔正在睡觉，等它睡醒再吃吧～",
          "Bunny is resting. Feed after the nap."
        )
      : text(
          "揀份食物餵我呀～我已經聞到香味喇！",
          "选份食物喂我吧～我已经闻到香味啦！",
          "Pick a little snack for me. I can smell it already!"
        );

    const shownMessage = Date.now() < messageUntil
      ? message
      : defaultMessage;

    const html = `
      <div class="rabbit-care-header">
        <h2>${text("兔兔照顧手帳", "兔兔照顾手账", "Bunny care")}</h2>
        <span class="rabbit-care-level">${level(care.affection)}</span>
      </div>

      <div class="rabbit-care-numbers">
        <span>${text("提摩西草", "提摩西草", "Hay")}
          <strong>× ${care.grass}</strong>
        </span>
        <span>${text("好感度", "好感度", "Affection")}
          <strong>${care.affection} / 100</strong>
        </span>
      </div>

      <div class="rabbit-care-track"
        role="progressbar"
        aria-label="${text("好感度", "好感度", "Affection")}"
        aria-valuemin="0"
        aria-valuemax="100"
        aria-valuenow="${care.affection}">
        <i style="width:${care.affection}%"></i>
      </div>

      <div class="rc-foods">
        ${Object.entries(foods).map(([key, food]) => `
          <button type="button"
            class="rc-food"
            data-food-feed="${key}"
            ${key === "grass" ? "data-care-feed" : ""}
            ${disabled || care[key] < 1 ? "disabled" : ""}
            aria-label="${escapeHTML(foodName(food))} × ${care[key]}">
            ${foodIcon(key)}
            <strong>${foodName(food)} × ${care[key]}</strong>
            <small>♥ +${food.points}</small>
          </button>
        `).join("")}
      </div>

      <p class="rabbit-care-message" role="status" aria-live="polite">
        ${escapeHTML(shownMessage)}
      </p>

      <details class="rc-rules">
        <summary>${text("食物點樣拎？", "食物怎么获得？", "How to earn food")}</summary>
        <div class="rc-rule-row">
          ${text("升級後累計", "升级后累计", "Since this upgrade")}：
          ${rewards.count} ${text("筆帳", "笔账", "records")}
          · ${text("收入", "收入", "income")}
          ${money(rewards.incomeCents)}
        </div>

        ${Object.entries(foods).map(([, food]) => `
          <div class="rc-rule-row">
            ${foodName(food)}：
            ${text("每", "每", "Every")}
            ${food.count}
            ${text("筆帳，或收入", "笔账，或收入", "records, or income of")}
            ${money(food.income * 100)}
          </div>
        `).join("")}

        <div class="rc-rule-row">
          ${text(
            "兩條進度取較高者，同一級不重複發放。蘋果乾是遊戲中的少量零食獎勵。",
            "两条进度取较高者，同一级不重复发放。苹果干是游戏中的少量零食奖励。",
            "Uses the higher of the two progress totals. Each milestone pays once. Apple is an occasional in-game treat."
          )}
        </div>
      </details>
    `;

    // 不反覆重畫，保留使用者正在展開的規則說明。
    if (panel._foodHTML !== html) {
      const wasOpen = panel.querySelector("details")?.open;
      panel.innerHTML = html;
      if (wasOpen) panel.querySelector("details").open = true;
      panel._foodHTML = html;
    }
  }

  function tell(value) {
    message = value;
    messageUntil = Date.now() + 6500;
    draw();
  }

  function publish(result) {
    state = result.state;

    // 同頁擴充程式可讀取；不要求 app.js 重畫整個首頁。
    document.dispatchEvent(new CustomEvent("bunny-care-updated", {
      detail: {
        affection: state.rabbitCare.affection,
        feedCount: state.rabbitCare.feedCount,
        lastFood: state.rabbitCare.lastFood || ""
      }
    }));

    if (result.changed) channel?.postMessage("updated");
  }

  async function sync() {
    if (syncing || feeding || document.hidden) return;
    syncing = true;

    try {
      const result = await transaction();
      if (!result?.state) return;

      publish(result);

      const earned = Object.entries(result.earned)
        .filter(([, amount]) => amount > 0)
        .map(([key, amount]) => `${foodName(foods[key])} +${amount}`);

      if (earned.length) {
        tell(text(
          "記帳獎勵到喇！",
          "记账奖励到啦！",
          "New rewards! "
        ) + earned.join("、"));
      } else {
        draw();
      }
    } catch (error) {
      console.error("Food care:", error);
    } finally {
      syncing = false;
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    setTimeout(() => {
      scheduled = false;
      sync();
    }, 150);
  }

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-food-feed]");
    if (!button || feeding || button.disabled) return;

    const key = button.dataset.foodFeed;
    feeding = true;
    draw();

    try {
      // 先讀寫最新資料，再決定是否真的扣食物。
      const result = await transaction("feed", key);
      if (!result?.state) return;

      publish(result);

      if (result.fed) {
        const lines = {
          grass: [
            "嚼嚼嚼～提摩西草好香，兔兔食得好滿足！",
            "嚼嚼嚼～提摩西草好香，兔兔吃得好满足！",
            "Munch munch! Lovely Timothy hay!"
          ],
          pellets: [
            "粒粒脆卜卜！兔兔慢慢食，唔會一啖吞晒㗎～",
            "粒粒脆脆的！兔兔慢慢吃，不会一口吞掉哦～",
            "Crunchy pellets! Slowly, one little bite at a time."
          ],
          apple: [
            "蘋果香呀！少少就夠喇，兔兔留返個肚食草～",
            "苹果好香！一点点就够啦，兔兔留着肚子吃草～",
            "Apple! Just a little treat—saving room for hay."
          ]
        };

        tell(text(...lines[key]) + `　♥ +${result.delta}`);

        const messageElement = $("#rabbitCarePanel .rabbit-care-message");
        if (messageElement) {
          const badge = document.createElement("span");
          badge.className = "rc-feedback";
          badge.textContent = `+${result.delta}`;
          messageElement.append(badge);
        }

        // 既有首頁動畫會偵測 feedCount，播放進食。
        await new Promise(resolve => setTimeout(resolve, 1100));
      } else {
        tell(result.error === "full"
          ? text(
              "好感度滿晒喇！啲食物幫你留返喺度～",
              "好感度满啦！食物替你留着～",
              "Affection is full. Your food is kept for later!"
            )
          : text(
              "呢款食物食晒喇，記帳累積返啲先～",
              "这款食物吃完啦，先记账积攒一些吧～",
              "None left. Earn more with your journal!"
            ));
      }
    } catch (error) {
      console.error("Feed:", error);
      tell(text(
        "今次未餵到，食物未確認扣除，請重新整理查看。",
        "这次未喂成功，请刷新查看食物数量。",
        "Feeding failed. Refresh to check your inventory."
      ));
    } finally {
      feeding = false;
      draw();
      schedule();
    }
  });

  const observer = new MutationObserver(changes => {
    const relevant = changes.some(change => {
      const target = change.target;

      if (!(target instanceof Element)) return false;
      if (target.closest("#rabbitCarePanel")) return false;

      return target.id === "content" ||
        [...change.addedNodes].some(node =>
          node.nodeType === 1 && (
            node.matches?.(".hero") ||
            node.querySelector?.(".hero")
          )
        );
    });

    if (relevant) schedule();
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  if (channel) channel.onmessage = schedule;
  window.addEventListener("focus", schedule);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) schedule();
  });

  setInterval(schedule, 2500);
  schedule();
})();
