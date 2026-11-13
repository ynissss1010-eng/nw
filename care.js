"use strict";
(() => {
  const $ = selector => document.querySelector(selector);
  const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[character]));
  const DATABASE_NAME = "bunny-yanice-v5";
  const POINTS_PER_FEED = 5;
  let database;
  let currentState;
  let busy = false;
  let scheduled = false;
  let feeding = false;
  let lastMessage = "";
  let messageUntil = 0;
  let channel;
  try {
    channel = new BroadcastChannel("bunny-yanice");
  } catch {}
  function language() {
    return currentState?.lang || "tc";
  }
  function text(tc, sc, en) {
    return language() === "en"
      ? en
      : language() === "sc"
        ? sc
        : tc;
  }
  function getLevel(affection) {
    if (affection >= 80) {
      return text("超級黏你", "超级黏你", "Your little shadow");
    }
    if (affection >= 50) {
      return text("好鍾意你", "好喜欢你", "Very fond of you");
    }
    if (affection >= 20) {
      return text("開始熟絡", "开始熟络", "Getting closer");
    }
    return text("初次見面", "初次见面", "Getting acquainted");
  }
  function defaultMessage(care) {
    if (care.affection >= 100) {
      return text(
        "最鍾意你喇！今日都要陪住你記帳～",
        "最喜欢你啦！今天也要陪你记账～",
        "You’re my favourite! Let’s keep your journal together."
      );
    }
    if (care.grass > 0) {
      return text(
        "聞到提摩西草香喇！係咪有我份㗎？",
        "闻到提摩西草的香味啦！有我的份吗？",
        "I smell Timothy hay! Is some of it for me?"
      );
    }
    return text(
      "記一筆小帳，就有一份提摩西草。兔兔喺度等你呀～",
      "记一笔小账，就有一份提摩西草。兔兔在这里等你～",
      "One new record earns a serving of Timothy hay. I’ll be right here!"
    );
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
  async function getDatabase() {
    if (database) return database;
    database = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE_NAME, 1);
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
  /*
   * 在同一個資料庫交易內：
   * 讀取最新帳目 → 計算新獎勵 → 儲存照顧資料。
   * 避免不同分頁重複領取。
   */
  async function updateCare(action = "sync") {
    const db = await getDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readwrite");
      const store = transaction.objectStore("data");
      const request = store.get("main");
      let result = {
        state: null,
        rewarded: 0,
        fed: false,
        changed: false,
        error: ""
      };
      request.onsuccess = () => {
        try {
          const state = request.result;
          if (!state?.ready || !Array.isArray(state.entries)) {
            return;
          }
          result.state = state;
          if (!state.rabbitCare) {
            // 安裝當下的舊帳只作基準，不補發獎勵。
            state.rabbitCare = {
              version: 1,
              grass: 0,
              affection: 0,
              feedCount: 0,
              seenEntryIds: [
                ...new Set(state.entries.map(entry => entry.id))
              ]
            };
            result.changed = true;
          }
          if (!validCare(state.rabbitCare)) {
            throw new Error("Invalid rabbit care data");
          }
          const care = state.rabbitCare;
          const knownIds = new Set(care.seenEntryIds);
          state.entries.forEach(entry => {
            if (typeof entry.id !== "string" || knownIds.has(entry.id)) {
              return;
            }
            knownIds.add(entry.id);
            care.grass++;
            result.rewarded++;
            result.changed = true;
          });
          care.seenEntryIds = [...knownIds];
          if (action === "feed") {
            if (care.grass < 1) {
              result.error = "empty";
            } else if (care.affection >= 100) {
              // 已滿好感時不浪費草。
              result.error = "full";
            } else {
              care.grass--;
              care.affection = Math.min(
                100,
                care.affection + POINTS_PER_FEED
              );
              care.feedCount++;
              result.fed = true;
              result.changed = true;
            }
          }
          if (result.changed) {
            store.put(state, "main");
          }
        } catch (error) {
          transaction.abort();
          reject(error);
        }
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () =>
        reject(transaction.error || new Error("Care update aborted"));
    });
  }
  /* ---------- Appearance ---------- */
  const style = document.createElement("style");
  style.textContent = `
    .rabbit-care {
      margin:0 0 25px;
      padding:23px;
      border:1px solid var(--line, #ecdfdf);
      border-radius:19px;
      background:var(--paper, #fffefd);
    }
    .rabbit-care-header {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      margin-bottom:17px;
    }
    .rabbit-care-header h2 {
      margin:0;
      font-size:20px;
    }
    .rabbit-care-level {
      background:var(--soft, #fae8ee);
      color:var(--accent, #a64f70);
      padding:4px 10px;
      border-radius:9px;
      font-size:12px;
    }
    .rabbit-care-main {
      display:grid;
      grid-template-columns:100px minmax(0,1fr) auto;
      gap:20px;
      align-items:center;
    }
    .rabbit-care-hay {
      width:96px;
      height:96px;
      display:block;
      padding:10px;
      border-radius:18px;
      background:#f3f2e4;
    }
    .rabbit-care-numbers {
      display:flex;
      justify-content:space-between;
      gap:12px;
      font-size:13px;
    }
    .rabbit-care-numbers strong {
      font-family:"Nunito",sans-serif;
      color:var(--accent, #a64f70);
    }
    .rabbit-care-track {
      height:10px;
      margin:11px 0;
      border-radius:20px;
      overflow:hidden;
      background:#eee5e8;
    }
    .rabbit-care-track i {
      display:block;
      height:100%;
      border-radius:20px;
      background:var(--accent, #a64f70);
      transition:width .4s ease;
    }
    .rabbit-care-message {
      font-size:13px;
      line-height:1.8;
      margin:0;
      color:var(--muted, #806b72);
    }
    .rabbit-care-actions {
      text-align:center;
    }
    .rabbit-care-actions small {
      display:block;
      margin-top:7px;
      color:var(--muted, #806b72);
      font-size:11px;
    }
    .rabbit-care-rule {
      margin:15px 0 0;
      padding-top:13px;
      border-top:1px dashed var(--line, #ecdfdf);
      color:var(--muted, #806b72);
      font-size:11px;
    }
    .rabbit-care.is-feeding .rabbit-care-hay {
      animation:rabbit-hay-nibble .55s ease-in-out 2;
    }
    @keyframes rabbit-hay-nibble {
      0%,100% { transform:rotate(0) scale(1); }
      35% { transform:rotate(-7deg) scale(.94); }
      70% { transform:rotate(5deg) scale(1.03); }
    }
    @media(max-width:650px) {
      .rabbit-care {
        padding:19px;
      }
      .rabbit-care-main {
        grid-template-columns:72px minmax(0,1fr);
        gap:13px;
      }
      .rabbit-care-hay {
        width:72px;
        height:80px;
        padding:7px;
      }
      .rabbit-care-actions {
        grid-column:1/-1;
        text-align:left;
      }
      .rabbit-care-actions small {
        display:inline-block;
        margin:0 0 0 9px;
      }
      .rabbit-care-numbers {
        font-size:12px;
      }
    }
    @media(prefers-reduced-motion:reduce) {
      .rabbit-care-track i {
        transition:none;
      }
      .rabbit-care.is-feeding .rabbit-care-hay {
        animation:none;
      }
    }
  `;
  document.head.append(style);
  function hayPicture() {
    return `
      <svg class="rabbit-care-hay"
        viewBox="0 0 100 100"
        role="img"
        aria-label="${text("提摩西草", "提摩西草", "Timothy hay")}">
        <path d="M20 80 Q49 92 80 80 L74 91 H27Z"
          fill="#d6b091" stroke="#92725a" stroke-width="2"/>
        <g fill="none" stroke-linecap="round">
          <path d="M46 82 Q28 57 25 27"
            stroke="#82945d" stroke-width="3"/>
          <path d="M48 83 Q40 52 44 15"
            stroke="#94a46c" stroke-width="3"/>
          <path d="M51 83 Q58 49 64 20"
            stroke="#82945d" stroke-width="3"/>
          <path d="M55 83 Q74 56 79 32"
            stroke="#a8b27c" stroke-width="3"/>
          <path d="M38 82 Q23 69 14 50"
            stroke="#a4ad72" stroke-width="3"/>
          <path d="M60 83 Q77 72 88 52"
            stroke="#8d9e62" stroke-width="3"/>
          <path d="m25 43-10-7m12 17 10-10
                   m17-8-10-8m9 18 11-8
                   m8-1-7-9m4 22 12-8"
            stroke="#a2ae72" stroke-width="3"/>
        </g>
        <g fill="#b7bc86">
          <ellipse cx="24" cy="25" rx="4" ry="12"
            transform="rotate(-13 24 25)"/>
          <ellipse cx="44" cy="17" rx="4" ry="12"
            transform="rotate(4 44 17)"/>
          <ellipse cx="65" cy="20" rx="4" ry="12"
            transform="rotate(15 65 20)"/>
          <ellipse cx="79" cy="32" rx="4" ry="11"
            transform="rotate(20 79 32)"/>
        </g>
        <path d="M30 76 Q50 82 71 76 L73 84
                 Q50 92 28 84Z"
          fill="#e1bc92" stroke="#92725a" stroke-width="1.5"/>
      </svg>
    `;
  }
  function renderPanel() {
    const page = document.body.dataset.page;
    const content = $("#content");
    if (!content ||
        !currentState?.ready ||
        !validCare(currentState.rabbitCare) ||
        !["home", "settings"].includes(page)) {
      return;
    }
    let panel = $("#rabbitCarePanel");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "rabbitCarePanel";
      panel.className = "rabbit-care";
      if (page === "home") {
        // 首頁放在歡迎區下面。
        const hero = content.querySelector(".hero");
        if (hero) hero.after(panel);
        else content.prepend(panel);
      } else {
        content.append(panel);
      }
    }
    const care = currentState.rabbitCare;
    const name = currentState.pet?.name || "Bunny";
    const message = Date.now() < messageUntil && lastMessage
      ? lastMessage
      : defaultMessage(care);
    const disabled = feeding ||
      care.grass < 1 ||
      care.affection >= 100;
    panel.classList.toggle("is-feeding", feeding);
    panel.innerHTML = `
      <div class="rabbit-care-header">
        <h2>
          ${escapeHTML(name)}
          ${text("的照顧手帳", "的照顾手账", "’s care journal")}
        </h2>
        <span class="rabbit-care-level">
          ${getLevel(care.affection)}
        </span>
      </div>
      <div class="rabbit-care-main">
        ${hayPicture()}
        <div>
          <div class="rabbit-care-numbers">
            <span>
              ${text("提摩西草", "提摩西草", "Timothy hay")}
              <strong>× ${care.grass}</strong>
            </span>
            <span>
              ${text("好感度", "好感度", "Affection")}
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
          <p class="rabbit-care-message"
            role="status"
            aria-live="polite">
            ${escapeHTML(message)}
          </p>
        </div>
        <div class="rabbit-care-actions">
          <button type="button"
            class="primary"
            data-care-feed
            ${disabled ? "disabled" : ""}>
            ${care.affection >= 100
              ? text("好感度已滿", "好感度已满", "Affection full")
              : text("餵兔兔", "喂兔兔", "Feed bunny")}
          </button>
          <small>
            ${text(
              "1 份草 · 好感度 +5",
              "1 份草 · 好感度 +5",
              "1 hay · +5 affection"
            )}
          </small>
        </div>
      </div>
      <p class="rabbit-care-rule">
        ${text(
          "新增一筆帳目可獲得 1 份草；修改舊帳不重複發放。好感度滿了便保留草，不會繼續扣除。",
          "新增一笔账目可获得 1 份草；修改旧账不重复发放。好感度满后保留草，不再扣除。",
          "Each new record earns 1 hay. Editing records does not earn more. Hay is kept when affection is full."
        )}
      </p>
    `;
  }
  function announce(message) {
    const toast = $("#toast");
    if (!toast) return;
    toast.textContent = message;
    setTimeout(() => {
      // 不蓋掉其他功能稍後顯示的訊息。
      if (toast.textContent === message) {
        toast.textContent = "";
      }
    }, 4200);
  }
  async function sync() {
    if (busy || feeding) return;
    busy = true;
    try {
      const result = await updateCare();
      if (!result.state) return;
      currentState = result.state;
      if (result.rewarded > 0) {
        lastMessage = text(
          `記帳獎勵收到！多咗 ${result.rewarded} 份提摩西草，兔兔望到眼都光埋～`,
          `记账奖励收到！多了 ${result.rewarded} 份提摩西草，兔兔眼睛都亮啦～`,
          `${result.rewarded} hay earned! Your bunny’s eyes just lit up.`
        );
        messageUntil = Date.now() + 6000;
        announce(lastMessage);
      }
      renderPanel();
      if (result.changed) {
        channel?.postMessage("updated");
      }
    } catch (error) {
      console.error("Rabbit care:", error);
    } finally {
      busy = false;
    }
  }
  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    setTimeout(() => {
      scheduled = false;
      sync();
    }, 120);
  }
  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-care-feed]");
    if (!button || feeding || busy) return;
    feeding = true;
    renderPanel();
    try {
      const result = await updateCare("feed");
      if (!result.state) return;
      currentState = result.state;
      if (result.fed) {
        const care = currentState.rabbitCare;
        lastMessage = care.affection >= 100
          ? text(
              "食飽飽，最鍾意你！好感度滿晒喇，兔兔要黐住你～",
              "吃饱饱，最喜欢你！好感度满啦，兔兔要黏着你～",
              "Happy tummy, happy bunny! Affection is full. I’m sticking with you!"
            )
          : text(
              "嚼嚼嚼……呢份草好香呀！又鍾意你多啲喇～",
              "嚼嚼嚼……这份草好香呀！又更喜欢你一点啦～",
              "Munch munch… lovely hay! I like you a little more already."
            );
        messageUntil = Date.now() + 6000;
        renderPanel();
        announce(lastMessage);
        if (result.changed) {
          channel?.postMessage("updated");
        }
        // 配合你目前的 petting.js，讓畫面上的兔兔輕輕跳一下。
        document.querySelectorAll(
          ".hero svg.rabbit, #content > .layout svg.rabbit"
        ).forEach(rabbit => {
          rabbit.classList.add("pet-motion-hop");
          setTimeout(() => {
            rabbit.classList.remove("pet-motion-hop");
          }, 800);
        });
        await new Promise(resolve => setTimeout(resolve, 1100));
      } else {
        lastMessage = result.error === "full"
          ? text(
              "兔兔已經超級鍾意你喇！啲草留返下次先～",
              "兔兔已经超级喜欢你啦！草先留着～",
              "Your bunny already adores you. Keep that hay for later!"
            )
          : text(
              "草草用晒喇，記一筆帳再返嚟啦～",
              "草草用完啦，记一笔账再回来吧～",
              "No hay left. Add a record and come back!"
            );
        messageUntil = Date.now() + 5000;
        announce(lastMessage);
      }
    } catch (error) {
      console.error(error);
      announce(text(
        "今次未餵到，請再試一次。",
        "这次没喂成功，请再试一次。",
        "Couldn’t feed your bunny. Please try again."
      ));
    } finally {
      feeding = false;
      renderPanel();
      scheduleSync();
    }
  });
  /*
   * app.js 記帳後會重新繪製 #content。
   * 監察主畫面更新；忽略照顧區自己的更新，避免無限循環。
   */
  const observer = new MutationObserver(records => {
    const relevant = records.some(record => {
      const target = record.target;
      return target instanceof Element &&
        !target.closest("#rabbitCarePanel") &&
        (
          target.id === "content" ||
          target.closest("#content") ||
          !$("#rabbitCarePanel")
        );
    });
    if (relevant) scheduleSync();
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  if (channel) {
    channel.onmessage = () => scheduleSync();
  }
  window.addEventListener("focus", scheduleSync);
  // 背景分頁恢復時及少數畫面未重新繪製時也能補上獎勵。
  setInterval(() => {
    if (!document.hidden) scheduleSync();
  }, 5000);
  scheduleSync();
})();