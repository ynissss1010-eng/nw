"use strict";

(() => {
  if (window.__bunnyLife) return;
  window.__bunnyLife = true;

  const NS = "http://www.w3.org/2000/svg";
  const DB_NAME = "bunny-yanice-v5";
  const REST_TIME = 60 * 1000;

  const rabbits = new WeakMap();
  const controls = new WeakMap();

  let dbPromise;
  let currentLife = {};
  let lastFeedCount = null;
  let started = false;
  let polling = false;
  let scanPending = false;

  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    if (lang.startsWith("en")) return en;
    if (lang.includes("hans") || lang === "zh-cn") return sc;
    return tc;
  }

  function openDatabase() {
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

  async function readState() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readonly");
      const request = transaction.objectStore("data").get("main");

      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(
        transaction.error || Error("Read aborted")
      );
    });
  }

  /*
   * 只更新 rabbitLife，保留帳目、草、好感度和其他欄位。
   * 不要求 app.js 重畫整頁，以免中斷正在輸入的內容。
   */
  async function saveLife(update) {
    const db = await openDatabase();

    const result = await new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readwrite");
      const store = transaction.objectStore("data");
      const request = store.get("main");

      let life = null;
      let failure;

      request.onsuccess = () => {
        try {
          const state = request.result;
          if (!state?.ready) return;

          life = {
            version: 1,
            ...state.rabbitLife,
            ...update
          };

          state.rabbitLife = life;
          store.put(state, "main");
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };

      transaction.oncomplete = () => resolve(life);
      transaction.onerror = () => reject(
        failure || transaction.error
      );
      transaction.onabort = () => reject(
        failure || transaction.error || Error("Save aborted")
      );
    });

    if (result) {
      currentLife = result;
      scan();
    }

    return result;
  }

  const style = document.createElement("style");

  style.textContent = `
    .bl-controls {
      display:flex;
      align-items:center;
      justify-content:center;
      gap:8px 12px;
      flex-wrap:wrap;
      width:100%;
      padding:7px 0;
      margin:4px auto 10px;
    }

    .bl-mood {
      display:inline-flex;
      align-items:center;
      gap:6px;
      color:var(--accent,#a64f70);
      font:700 12px/1.6 var(--font,sans-serif);
    }

    .bl-mood::before {
      content:"";
      width:7px;
      height:7px;
      background:currentColor;
      border-radius:50%;
    }

    .bl-controls button {
      min-height:34px;
      padding:5px 10px;
      font-size:12px;
      border-radius:10px;
    }

    .hero > .bl-controls {
      grid-column:2;
    }

    .companion > .bl-controls {
      grid-column:1 / -1;
    }

    .feed-cover > .bl-controls {
      position:absolute;
      right:15px;
      bottom:8px;
      width:250px;
      z-index:3;
      margin:0;
    }

    .feed-cover.bl-has-controls {
      min-height:400px;
    }

    .feed-cover.bl-has-controls > svg.rabbit {
      bottom:165px;
    }

    .feed-cover.bl-has-controls > .bp-hint {
      bottom:58px;
    }

    svg.rabbit.bl-eating {
      animation:bl-eat-body .65s ease-in-out infinite !important;
      transform-origin:50% 85%;
    }

    svg.rabbit.bl-resting {
      animation:bl-breathe 3s ease-in-out infinite !important;
      transform-origin:50% 90%;
    }

    .bl-chew {
      animation:bl-chew .38s ease-in-out infinite;
      transform-box:fill-box;
      transform-origin:center;
    }

    .bl-hay {
      animation:bl-hay .6s ease-in-out infinite;
      transform-box:fill-box;
      transform-origin:right center;
    }

    .bl-zzz {
      fill:var(--accent,#a64f70);
      font:bold 15px "Nunito",sans-serif;
      animation:bl-zzz 2.4s ease-in-out infinite;
    }

    @keyframes bl-eat-body {
      0%,100% { transform:rotate(0); }
      50% { transform:rotate(-1.2deg) translateY(1px); }
    }

    @keyframes bl-chew {
      0%,100% { transform:scaleY(.45); }
      50% { transform:scaleY(1.15); }
    }

    @keyframes bl-hay {
      0%,100% { transform:rotate(-3deg); }
      50% { transform:rotate(4deg) translateX(2px); }
    }

    @keyframes bl-breathe {
      0%,100% { transform:translateY(2px) scale(1,.98); }
      50% { transform:translateY(0) scale(1.015,1.015); }
    }

    @keyframes bl-zzz {
      0%,100% { opacity:.3; }
      50% { opacity:1; }
    }

    @media(max-width:760px) {
      .hero > .bl-controls {
        grid-column:1 / -1;
      }

      .feed-cover > .bl-controls {
        right:5px;
        width:200px;
      }

      .feed-cover.bl-has-controls {
        min-height:380px;
      }

      .feed-cover.bl-has-controls > svg.rabbit {
        bottom:165px;
      }

      .feed-cover.bl-has-controls > .bp-hint {
        bottom:57px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      svg.rabbit.bl-eating,
      svg.rabbit.bl-resting,
      .bl-chew,
      .bl-hay,
      .bl-zzz {
        animation:none !important;
      }
    }
  `;

  document.head.append(style);

  function eligible(rabbit) {
    return rabbit.matches("svg.rabbit") &&
      !rabbit.closest(
        "button,a,.onboarding,.pet-grid,.petgrid,.pet-choice"
      );
  }

  function getRabbitState(rabbit) {
    if (!rabbits.has(rabbit)) {
      rabbits.set(rabbit, {
        mode: "",
        hidden: [],
        overlay: null,
        eatUntil: 0,
        taps: [],
        timer: null,
        control: null
      });
    }

    return rabbits.get(rabbit);
  }

  function isResting() {
    return Number(currentLife.restUntil || 0) > Date.now();
  }

  function moodText() {
    if (isResting()) {
      return say("休息中", "休息中", "Resting");
    }

    const active = Number(currentLife.moodUntil || 0) > Date.now();

    if (active && currentLife.mood === "grumpy") {
      return say(
        "有啲唔耐煩，輕啲呀",
        "有点不耐烦，轻一点",
        "A little grumpy—gently!"
      );
    }

    if (active && currentLife.mood === "full") {
      return say(
        "食得好滿足",
        "吃得好满足",
        "Happy after hay"
      );
    }

    if (active && currentLife.mood === "happy") {
      return say(
        "開心，有你陪",
        "开心，有你陪",
        "Happy with you"
      );
    }

    return say("想你陪下我", "想你陪陪我", "Ready for company");
  }

  function restoreAnimation(rabbit) {
    const state = getRabbitState(rabbit);

    clearTimeout(state.timer);

    state.hidden.forEach(({ element, visibility }) => {
      if (visibility === null) element.removeAttribute("visibility");
      else element.setAttribute("visibility", visibility);
    });

    state.hidden = [];
    state.overlay?.remove();
    state.overlay = null;
    state.mode = "";

    rabbit.classList.remove("bl-eating", "bl-resting");
  }

  function animate(rabbit, mode) {
    const state = getRabbitState(rabbit);
    if (state.mode === mode) return;

    restoreAnimation(rabbit);

    /*
     * 只隱藏原圖的眼睛和嘴巴，不修改兔子的毛色、耳朵或配飾。
     * 原本 petting.js 的臨時表情不刪除。
     */
    [...rabbit.children].forEach(element => {
      const tag = element.localName;
      const x = Number(element.getAttribute("cx"));
      const y = Number(element.getAttribute("cy"));
      const path = (element.getAttribute("d") || "").trim();

      const eyes = mode === "sleep" && (
        tag === "ellipse" && [83,120].includes(x) && y === 114 ||
        tag === "circle" && [84,121].includes(x) && y === 112 ||
        tag === "path" && /^M77 116/i.test(path)
      );

      const mouth =
        tag === "path" &&
        /^(M95 135|M96 140|M102 131)/i.test(path) ||
        tag === "ellipse" && x === 102 && y === 139;

      if (eyes || mouth) {
        state.hidden.push({
          element,
          visibility: element.getAttribute("visibility")
        });
        element.setAttribute("visibility", "hidden");
      }
    });

    const overlay = document.createElementNS(NS, "g");
    overlay.setAttribute("pointer-events", "none");

    if (mode === "eat") {
      overlay.innerHTML = `
        <g class="bl-hay" fill="none" stroke-linecap="round">
          <path d="M103 139 58 153 M103 139 54 143
                   M103 139 61 161 M99 139 65 132"
            stroke="#8fa263" stroke-width="2.3"/>
          <path d="m65 151-5-8m10 3-2 9m-6-12-4-8"
            stroke="#b1b77c" stroke-width="2"/>
        </g>
        <ellipse class="bl-chew" cx="102" cy="139"
          rx="4" ry="3.5"
          fill="#b77c87" stroke="#70534e" stroke-width="1"/>
      `;
      rabbit.classList.add("bl-eating");
    } else {
      overlay.innerHTML = `
        <g fill="none" stroke="#70534e"
          stroke-width="2" stroke-linecap="round">
          <path d="M77 116q6 5 12 0m25 0q6 5 12 0"/>
          <path d="M98 139q4 3 8 0"/>
        </g>
        <text class="bl-zzz" x="158" y="94">z</text>
        <text class="bl-zzz" x="173" y="77"
          style="animation-delay:.5s">z</text>
        <text class="bl-zzz" x="187" y="58"
          style="animation-delay:1s">Z</text>
      `;
      rabbit.classList.add("bl-resting");
    }

    state.overlay = overlay;
    state.mode = mode;
    rabbit.append(overlay);
  }

  function updateControls(rabbit) {
    const state = getRabbitState(rabbit);

    // 小型對話區不放額外按鈕，避免再次擠在一起。
    if (rabbit.closest(".companion,.entry-pet")) return;

    if (!state.control?.isConnected) {
      const control = document.createElement("div");
      control.className = "bl-controls";

      const mood = document.createElement("span");
      mood.className = "bl-mood";
      mood.setAttribute("role", "status");

      const button = document.createElement("button");
      button.type = "button";
      button.dataset.bunnyRest = "";

      control.append(mood, button);
      controls.set(button, rabbit);
      state.control = control;

      const hint = rabbit.nextElementSibling;
      if (hint?.classList.contains("bp-hint")) hint.after(control);
      else rabbit.after(control);
    }

    const label = state.control.querySelector(".bl-mood");
    const button = state.control.querySelector("button");

    if (label.textContent !== moodText()) {
      label.textContent = moodText();
    }

    const remaining = Math.max(
      0,
      Math.ceil((Number(currentLife.restUntil || 0) - Date.now()) / 1000)
    );

    const text = isResting()
      ? say(`輕輕叫醒 · ${remaining}s`, `轻轻叫醒 · ${remaining}s`, `Wake gently · ${remaining}s`)
      : say("陪兔兔休息", "陪兔兔休息", "Let bunny rest");

    if (button.textContent !== text) button.textContent = text;

    rabbit.closest(".feed-cover")?.classList.add("bl-has-controls");
  }

  function scan() {
    document.querySelectorAll("svg.rabbit").forEach(rabbit => {
      if (!eligible(rabbit)) return;

      const state = getRabbitState(rabbit);
      updateControls(rabbit);

      if (isResting()) {
        animate(rabbit, "sleep");
      } else if (state.eatUntil > Date.now()) {
        animate(rabbit, "eat");
      } else if (state.mode) {
        restoreAnimation(rabbit);
      }
    });
  }

  function scheduleScan() {
    if (scanPending) return;
    scanPending = true;

    requestAnimationFrame(() => {
      scanPending = false;
      scan();
    });
  }

  function startEating() {
    document.querySelectorAll("svg.rabbit").forEach(rabbit => {
      if (!eligible(rabbit)) return;

      const state = getRabbitState(rabbit);
      state.eatUntil = Date.now() + 5500;
    });

    scan();
  }

  async function poll() {
    if (polling || document.hidden) return;
    polling = true;

    try {
      const state = await readState();
      if (!state?.ready) return;

      currentLife = state.rabbitLife || {};

      const count = state.rabbitCare?.feedCount;
      const validCount = Number.isSafeInteger(count);

      if (validCount) {
        // 首次載入只建立基準，不重播以前吃過的草。
        if (lastFeedCount !== null && count > lastFeedCount) {
          currentLife = await saveLife({
            mood: "full",
            moodUntil: Date.now() + 2 * 60 * 1000,
            restUntil: 0
          }) || currentLife;

          startEating();
        }

        lastFeedCount = count;
      }

      scan();
    } catch (error) {
      console.error("Bunny life:", error);
    } finally {
      polling = false;
    }
  }

  /* ---------- 休息按鈕 ---------- */

  document.addEventListener("click", async event => {
    const button = event.target.closest("[data-bunny-rest]");
    if (!button || button.disabled) return;

    button.disabled = true;

    try {
      const latest = await readState();
      currentLife = latest?.rabbitLife || {};

      if (isResting()) {
        await saveLife({
          restUntil: 0,
          mood: "happy",
          moodUntil: Date.now() + 60000
        });
      } else {
        await saveLife({
          restUntil: Date.now() + REST_TIME,
          mood: "sleepy",
          moodUntil: Date.now() + REST_TIME
        });
      }
    } catch (error) {
      console.error(error);
      alert(say(
        "今次未能儲存休息狀態，請再試一次。",
        "这次未能保存休息状态，请重试。",
        "Could not save the rest state. Please try again."
      ));
    } finally {
      if (button.isConnected) button.disabled = false;
    }
  });

  /*
   * 摸之前先結束吃草／休息的臨時表情，
   * 然後交還原本 petting.js 處理。
   */
  function prepareForTouch(rabbit) {
    const state = getRabbitState(rabbit);

    if (state.mode) {
      state.eatUntil = 0;
      restoreAnimation(rabbit);
    }

    if (isResting()) {
      currentLife.restUntil = 0;

      saveLife({
        restUntil: 0,
        mood: "happy",
        moodUntil: Date.now() + 60000
      }).catch(console.error);
    }
  }

  document.addEventListener("pointerdown", event => {
    const rabbit = event.target.closest?.("svg.rabbit");
    if (rabbit && eligible(rabbit)) prepareForTouch(rabbit);

    // 點「摸摸我呀」提示，也要先解除休息動畫。
    const hint = event.target.closest?.(".bp-hint");
    const previous = hint?.previousElementSibling;

    if (previous?.matches("svg.rabbit") && eligible(previous)) {
      prepareForTouch(previous);
    }
  }, true);

  let touch = null;

  document.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;

    const rabbit = event.target.closest?.("svg.rabbit");
    if (!rabbit || !eligible(rabbit)) return;

    touch = {
      rabbit,
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      moved: false
    };
  });

  document.addEventListener("pointermove", event => {
    if (!touch || touch.id !== event.pointerId) return;

    const dx = Math.abs(event.clientX - touch.x);
    const dy = Math.abs(event.clientY - touch.y);

    if (dy > 28 && dy > dx) {
      touch = null;
      return;
    }

    if (dx > 15) touch.moved = true;
  });

  document.addEventListener("pointerup", event => {
    if (!touch || touch.id !== event.pointerId) return;

    const current = touch;
    touch = null;

    const state = getRabbitState(current.rabbit);
    const now = Date.now();

    if (current.moved) {
      state.taps = [];
    } else {
      state.taps = state.taps.filter(time => now - time < 2000);
      state.taps.push(now);
    }

    const angry = state.taps.length >= 5;
    if (angry) state.taps = [];

    // 心情與永久好感度分開；此處不加減好感度。
    saveLife({
      mood: angry ? "grumpy" : "happy",
      moodUntil: now + (angry ? 30000 : 60000),
      restUntil: 0
    }).catch(console.error);
  });

  document.addEventListener("pointercancel", () => {
    touch = null;
  });

  function start() {
    if (started) return;
    started = true;

    const observer = new MutationObserver(records => {
      const relevant = records.some(record =>
        [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (
            node.matches?.("svg.rabbit,.bp-hint") ||
            node.querySelector?.("svg.rabbit")
          )
        )
      );

      if (relevant) scheduleScan();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) poll();
    });

    window.addEventListener("focus", poll);

    poll();
    setInterval(poll, 1000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
