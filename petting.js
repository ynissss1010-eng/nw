"use strict";
(() => {
  // 防止同一頁重複載入。
  if (window.__bunnyPettingV2) return;
  window.__bunnyPettingV2 = true;
  const NS = "http://www.w3.org/2000/svg";
  const states = new WeakMap();
  const hintTargets = new WeakMap();
  let gesture = null;
  let scanPending = false;
  let bubbleTimer;
  let bubbleRabbit = null;
  const motionClasses = [
    "bp-soft", "bp-hop", "bp-boop",
    "bp-tickle", "bp-sleep", "bp-angry"
  ];
  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    if (lang.startsWith("en")) return en;
    if (lang.includes("hans") || lang === "zh-cn") return sc;
    return tc;
  }
  const messages = {
    enjoy: [
      [
        "啱喇～就係耳仔中間！舒服到想變成一粒麻糬。",
        "对啦～就是耳朵中间！舒服得想变成一颗麻薯。",
        "Right between my ears! I’m turning into a comfy little mochi."
      ],
      [
        "呢個手勢得喎，兔兔批准你繼續～",
        "这个手法不错哦，兔兔批准你继续～",
        "Excellent technique. Bunny permission to continue!"
      ]
    ],
    happy: [
      [
        "嘿嘿，今日份摸摸收到！開心到想跳兩下。",
        "嘿嘿，今天的摸摸收到！开心得想蹦两下。",
        "Today’s pets received! Time for a happy little hop."
      ],
      [
        "你係咪偷偷學過摸兔兔㗎？咁叻嘅！",
        "你是不是偷偷学过摸兔兔呀？这么厉害！",
        "Have you secretly studied bunny petting? You’re good at this!"
      ]
    ],
    shy: [
      [
        "做咩突然咁錫我呀……耳仔都紅晒喇！",
        "怎么突然这么宠我呀……耳朵都红啦！",
        "Why so sweet all of a sudden? My ears are blushing!"
      ],
      [
        "唔准笑我面紅！我只係……有少少熱啫。",
        "不许笑我脸红！我只是……有点热而已。",
        "Don’t laugh at my blush! I’m just… a little warm."
      ]
    ],
    surprised: [
      [
        "啵！鼻鼻唔係儲存掣嚟㗎！",
        "啵！鼻子可不是保存按钮哦！",
        "Boop! My nose isn’t the save button!"
      ],
      [
        "咦！你搵到兔兔個小鼻鼻喇！",
        "咦！你找到兔兔的小鼻子啦！",
        "Ooh! You found my little nose!"
      ]
    ],
    cuddle: [
      [
        "再陪我一陣啦～最軟嗰撮毛留咗畀你。",
        "再陪我一会儿嘛～最软的那撮毛留给你。",
        "Stay a little longer. I saved my softest fluff for you."
      ],
      [
        "今日做隻跟屁兔，你去邊我就跟去邊～",
        "今天当一只跟屁兔，你去哪我就跟去哪～",
        "I’m your bunny shadow today. Wherever you go, I go!"
      ]
    ],
    tickle: [
      [
        "哈哈哈哈！唔好搔嗰度呀，啲毛都笑亂晒！",
        "哈哈哈哈！别挠那里呀，毛毛都笑乱啦！",
        "Hahaha! Not there! You’re tickling all my fluff out of place!"
      ],
      [
        "停、停一停！兔兔笑到數唔到紅蘿蔔喇！",
        "等、等一下！兔兔笑得数不清胡萝卜啦！",
        "W-wait! I’m laughing too hard to count my carrots!"
      ]
    ],
    sleepy: [
      [
        "嗯……繼續摸……我只係合埋眼諗緊啲數……",
        "嗯……继续摸……我只是闭眼想一想账目……",
        "Mmm… keep going. Just doing the maths with my eyes closed…"
      ],
      [
        "瞓一陣先……紅蘿蔔記得留半條畀我……",
        "先睡一小会儿……胡萝卜记得给我留半根……",
        "Just a tiny nap… save half a carrot for me…"
      ]
    ],
    cheeky: [
      [
        "摸咗咁多下，係咪應該交一條紅蘿蔔呢？",
        "摸了这么多下，是不是该交一根胡萝卜啦？",
        "That’s a lot of pets. Shall we discuss the carrot fee?"
      ],
      [
        "好啦，今日最鍾意你！聽日？聽日再講～",
        "好啦，今天最喜欢你！明天？明天再说～",
        "Fine, you’re my favourite today! Tomorrow is negotiable."
      ]
    ],
    angry: [
      [
        "喂喂喂！兔兔唔係門鐘呀，唔好不停撳我啦！",
        "喂喂喂！兔兔又不是门铃，不许一直戳啦！",
        "Hey! I’m a bunny, not a doorbell. Stop poking!"
      ],
      [
        "哼！毛都戳亂晒！輕輕摸返順先原諒你。",
        "哼！毛都戳乱啦！轻轻摸顺才原谅你。",
        "Hmph! You’ve ruffled my fluff. Smooth it out first!"
      ]
    ]
  };
  const style = document.createElement("style");
  style.id = "bunny-petting-style";
  style.textContent = `
    svg.rabbit.bp-enabled {
      cursor:grab;
      touch-action:pan-y;
      user-select:none;
      -webkit-user-select:none;
      transform-origin:50% 85%;
    }
    svg.rabbit.bp-enabled:active { cursor:grabbing; }
    @media(hover:hover) {
      svg.rabbit.bp-enabled:hover {
        filter:drop-shadow(0 0 7px #d88ba366);
      }
    }
    .bp-hint {
      position:relative;
      display:block;
      width:fit-content;
      max-width:100%;
      min-height:48px;
      margin:12px auto;
      padding:9px 15px;
      border:2px solid var(--accent,#a64f70);
      border-radius:16px;
      background:var(--paper,#fffefd);
      color:var(--accent,#a64f70);
      text-align:center;
      cursor:pointer;
      box-shadow:0 3px 0 var(--soft,#fae8ee);
    }
    .bp-hint::before {
      content:"";
      position:absolute;
      top:-8px;
      left:calc(50% - 6px);
      width:11px;
      height:11px;
      border-top:2px solid var(--accent,#a64f70);
      border-left:2px solid var(--accent,#a64f70);
      background:var(--paper,#fffefd);
      transform:rotate(45deg);
    }
    .bp-hint strong {
      display:block;
      font:800 17px/1.5 var(--font,sans-serif);
    }
    .bp-hint small {
      display:block;
      margin-top:3px;
      font:12px/1.6 var(--font,sans-serif);
      color:var(--ink,#4a383d);
    }
    .bp-hint:focus-visible {
      outline:3px solid var(--accent,#a64f70);
      outline-offset:4px;
    }
    .hero > .bp-hint {
      grid-column:2;
      justify-self:center;
      margin:-12px 0 0;
    }
    /* 動態封面留出提示位置，避免遮住兔兔。 */
    .feed-cover.bp-cover {
      min-height:320px;
    }
    .feed-cover.bp-cover > svg.rabbit {
      bottom:88px;
    }
    .feed-cover.bp-cover > .bp-hint {
      position:absolute;
      right:25px;
      bottom:13px;
      width:235px;
      margin:0;
      z-index:2;
    }
    .bp-feedback {
      position:fixed;
      z-index:1000;
      width:max-content;
      max-width:min(290px,calc(100vw - 24px));
      padding:13px 16px;
      border:1px solid var(--line,#ecdfdf);
      border-radius:17px 17px 6px 17px;
      background:var(--paper,#fffefd);
      color:var(--ink,#4a383d);
      font:14px/1.8 var(--font,sans-serif);
      box-shadow:0 5px 18px #50304015;
      pointer-events:none;
    }
    .bp-feedback[hidden] { display:none; }
    .bp-mark {
      position:fixed;
      z-index:1001;
      color:var(--accent,#a64f70);
      pointer-events:none;
      font:800 23px/1 "Nunito",sans-serif;
      animation:bp-float 1s ease-out forwards;
    }
    .bp-soft { animation:bp-soft .7s ease-in-out; }
    .bp-hop { animation:bp-hop .6s ease-in-out; }
    .bp-boop { animation:bp-boop .5s ease-in-out; }
    .bp-tickle { animation:bp-tickle .65s ease-in-out; }
    .bp-sleep { animation:bp-sleep 2s ease-in-out; }
    .bp-angry { animation:bp-angry .55s ease-in-out; }
    @keyframes bp-soft {
      0%,100% { transform:rotate(0); }
      35% { transform:rotate(-4deg); }
      70% { transform:rotate(3deg); }
    }
    @keyframes bp-hop {
      0%,100% { transform:translateY(0); }
      40% { transform:translateY(-8px); }
    }
    @keyframes bp-boop {
      0%,100% { transform:scale(1); }
      40% { transform:scale(.95) rotate(-3deg); }
    }
    @keyframes bp-tickle {
      0%,100% { transform:rotate(0); }
      20%,60% { transform:rotate(-4deg); }
      40%,80% { transform:rotate(4deg); }
    }
    @keyframes bp-sleep {
      0%,100% { transform:translateY(0); }
      50% { transform:translateY(3px) rotate(-2deg); }
    }
    @keyframes bp-angry {
      0%,100% { transform:translateX(0); }
      25%,65% { transform:translateX(-3px); }
      45%,85% { transform:translateX(3px); }
    }
    @keyframes bp-float {
      from { opacity:1; transform:translate(-50%,0) scale(.8); }
      to { opacity:0; transform:translate(-50%,-55px) scale(1.15); }
    }
    @media(max-width:760px) {
      .hero > .bp-hint {
        grid-column:1/-1;
        margin:8px auto 0;
      }
      .feed-cover.bp-cover { min-height:290px; }
      .feed-cover.bp-cover > .bp-hint {
        width:175px;
        right:10px;
        bottom:12px;
        padding:8px;
      }
      .feed-cover.bp-cover > svg.rabbit { bottom:85px; }
      .bp-hint strong { font-size:16px; }
      .bp-hint small { font-size:11px; }
    }
    @media(prefers-reduced-motion:reduce) {
      .bp-soft,.bp-hop,.bp-boop,.bp-tickle,.bp-sleep,.bp-angry,
      .bp-mark { animation:none; }
    }
  `;
  document.head.append(style);
  const bubble = document.createElement("div");
  bubble.className = "bp-feedback";
  bubble.hidden = true;
  bubble.setAttribute("role", "status");
  bubble.setAttribute("aria-live", "polite");
  function getState(rabbit) {
    if (!states.has(rabbit)) {
      states.set(rabbit, {
        taps:[],
        lastTap:0,
        lastReaction:0,
        lastMood:"",
        lastPet:0,
        attention:0,
        face:null,
        hint:null,
        lastMessage:{}
      });
    }
    return states.get(rabbit);
  }
  function eligible(rabbit) {
    return rabbit instanceof SVGElement &&
      rabbit.matches("svg.rabbit") &&
      !rabbit.closest(
        "button,a,.pet-grid,.petgrid,.pet-choice,.onboarding"
      );
  }
  function pickMessage(state, mood) {
    const list = messages[mood];
    let index = Math.floor(Math.random() * list.length);
    if (list.length > 1 && index === state.lastMessage[mood]) {
      index = (index + 1) % list.length;
    }
    state.lastMessage[mood] = index;
    return say(...list[index]);
  }
  /* 保留原本記帳表情，摸完再恢復。 */
  function restoreFace(rabbit) {
    const state = states.get(rabbit);
    if (!state?.face) return;
    clearTimeout(state.face.timer);
    state.face.hidden.forEach(({element, value}) => {
      if (value === null) element.removeAttribute("visibility");
      else element.setAttribute("visibility", value);
    });
    state.face.overlay.remove();
    state.face = null;
    rabbit.classList.remove(...motionClasses);
  }
  const expressions = {
    enjoy: [
      '<path d="M77 115q6 6 12 0m25 0q6 6 12 0"/>',
      '<path d="M97 137q5 5 10 0"/>'
    ],
    happy: [
      '<path d="M77 116q6-10 12 0m25 0q6-10 12 0"/>',
      '<path d="M96 136q6 12 12 0Z" fill="#bd7c8e"/>'
    ],
    shy: [
      '<path d="M78 114q5 5 10 0m27 0q5 5 10 0"/>',
      '<path d="M98 138q4 4 8 0"/>'
    ],
    surprised: [
      '<ellipse cx="83" cy="114" rx="5" ry="7" fill="#382b26"/><ellipse cx="120" cy="114" rx="5" ry="7" fill="#382b26"/>',
      '<ellipse cx="102" cy="139" rx="3.5" ry="4.5" fill="#805b61"/>'
    ],
    cuddle: [
      '<ellipse cx="83" cy="114" rx="4.5" ry="6" fill="#382b26"/><ellipse cx="120" cy="114" rx="4.5" ry="6" fill="#382b26"/><circle cx="84" cy="112" r="1.7" fill="white" stroke="none"/><circle cx="121" cy="112" r="1.7" fill="white" stroke="none"/>',
      '<path d="M96 137q6 7 12 0"/>'
    ],
    tickle: [
      '<path d="m78 109 9 6-9 5m47-11-9 6 9 5"/>',
      '<path d="M94 135q8 18 16 0Z" fill="#bd7c8e"/>'
    ],
    sleepy: [
      '<path d="M77 116q6 3 12 0m25 0q6 3 12 0"/>',
      '<ellipse cx="102" cy="139" rx="3" ry="2" fill="#946b71"/>'
    ],
    cheeky: [
      '<path d="M77 115q6-9 12 0"/><ellipse cx="120" cy="114" rx="3.7" ry="4.8" fill="#382b26"/>',
      '<path d="M96 137q6 7 12-1"/>'
    ],
    angry: [
      '<path d="m76 103 14 6m23 0 14-6" stroke-width="3"/><path d="M78 116h10m27 0h10" stroke-width="2.8"/>',
      '<ellipse cx="87" cy="137" rx="8" ry="6" fill="#efb0b9" stroke="none"/><ellipse cx="117" cy="137" rx="8" ry="6" fill="#efb0b9" stroke="none"/><path d="M97 141q5-6 10 0"/><path d="M144 89v9m-5-5h10" stroke="#ba5269" stroke-width="2.5"/>'
    ]
  };
  function changeFace(rabbit, mood) {
    restoreFace(rabbit);
    const hidden = [];
    [...rabbit.children].forEach(element => {
      const tag = element.localName;
      const x = Number(element.getAttribute("cx"));
      const y = Number(element.getAttribute("cy"));
      const d = (element.getAttribute("d") || "").trim();
      const eye = tag === "ellipse" &&
        [83,120].includes(x) && [113,114].includes(y);
      const highlight = tag === "circle" &&
        [84,121].includes(x) && [111,112].includes(y);
      const facePath = tag === "path" &&
        /^(M77 116|M77 115|M95 135|M96 140|M102 131|m77 102)/i.test(d);
      const mouth = tag === "ellipse" && x === 102 && y === 139;
      if (eye || highlight || facePath || mouth) {
        hidden.push({
          element,
          value:element.getAttribute("visibility")
        });
        element.setAttribute("visibility", "hidden");
      }
    });
    const overlay = document.createElementNS(NS, "g");
    overlay.setAttribute("pointer-events", "none");
    overlay.innerHTML = `
      <g fill="none" stroke="#654c48" stroke-width="2"
         stroke-linecap="round" stroke-linejoin="round">
        ${expressions[mood].join("")}
      </g>
      ${["shy","cuddle","tickle"].includes(mood) ? `
        <ellipse cx="74" cy="127" rx="10" ry="5"
          fill="#e998ad" opacity=".7"/>
        <ellipse cx="130" cy="127" rx="10" ry="5"
          fill="#e998ad" opacity=".7"/>
      ` : ""}
    `;
    rabbit.append(overlay);
    getState(rabbit).face = {
      overlay,
      hidden,
      timer:setTimeout(
        () => restoreFace(rabbit),
        mood === "sleepy" ? 4500 : 3000
      )
    };
  }
  function effectParent(rabbit) {
    return rabbit.closest("dialog") || document.body;
  }
  function showBubble(rabbit, message, x, y) {
    effectParent(rabbit).append(bubble);
    bubbleRabbit = rabbit;
    bubble.textContent = message;
    bubble.hidden = false;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const left = Math.max(
      12, Math.min(x - width / 2, innerWidth - width - 12)
    );
    const above = y - height - 25;
    const top = Math.max(
      12,
      Math.min(above >= 12 ? above : y + 22, innerHeight - height - 12)
    );
    bubble.style.left = left + "px";
    bubble.style.top = top + "px";
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true;
    }, 3600);
  }
  function particles(rabbit, mood, x, y) {
    const marks = mood === "angry" ? ["!", "💢", "!"] :
      mood === "sleepy" ? ["z", "z", "Z"] :
      mood === "surprised" ? ["!", "♡"] : ["♡", "♥", "♡"];
    const parent = effectParent(rabbit);
    marks.forEach((mark, index) => {
      setTimeout(() => {
        if (!rabbit.isConnected) return;
        if (parent.localName === "dialog" && !parent.open) return;
        const element = document.createElement("span");
        element.className = "bp-mark";
        element.textContent = mark;
        element.setAttribute("aria-hidden", "true");
        element.style.left = x + (index - 1) * 18 + "px";
        element.style.top = y - 10 + "px";
        parent.append(element);
        setTimeout(() => element.remove(), 1050);
      }, index * 110);
    });
  }
  function respond(rabbit, mood, x, y, force=false) {
    if (!rabbit.isConnected) return false;
    const state = getState(rabbit);
    const now = Date.now();
    if (!force && now - state.lastReaction < 500) return false;
    if (now - state.lastPet > 15000) state.attention = 0;
    state.attention++;
    if (
      state.attention >= 8 &&
      ["happy","enjoy","cuddle"].includes(mood)
    ) {
      mood = "cheeky";
      state.attention = 0;
    }
    state.lastPet = now;
    state.lastReaction = now;
    state.lastMood = mood;
    changeFace(rabbit, mood);
    rabbit.classList.remove(...motionClasses);
    void rabbit.getBoundingClientRect();
    const motion = {
      happy:"bp-hop",
      surprised:"bp-boop",
      tickle:"bp-tickle",
      sleepy:"bp-sleep",
      angry:"bp-angry"
    }[mood] || "bp-soft";
    rabbit.classList.add(motion);
    particles(rabbit, mood, x, y);
    showBubble(rabbit, pickMessage(state, mood), x, y);
    return true;
  }
  /*
   * 使用 SVG 自己的座標轉換，
   * 修正縮放、留白和動畫時點擊位置偏移。
   */
  function bodyPart(rabbit, clientX, clientY) {
    try {
      const matrix = rabbit.getScreenCTM();
      if (!matrix) return "body";
      const point = rabbit.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const p = point.matrixTransform(matrix.inverse());
      if (Math.hypot((p.x - 102) / 18, (p.y - 130) / 16) <= 1) {
        return "nose";
      }
      return p.y < 145 && p.x < 165 ? "head" : "body";
    } catch {
      return "body";
    }
  }
  /* ---------- 提示：新兔兔出現後自動補上 ---------- */
  function scanRabbits() {
    document.querySelectorAll("svg.rabbit").forEach(rabbit => {
      if (!eligible(rabbit)) return;
      const state = getState(rabbit);
      rabbit.classList.add("bp-enabled");
      if (!state.hint?.isConnected) {
        const hint = document.createElement("button");
        hint.type = "button";
        hint.className = "bp-hint";
        const strong = document.createElement("strong");
        const small = document.createElement("small");
        hint.append(strong, small);
        hintTargets.set(hint, rabbit);
        state.hint = hint;
        rabbit.after(hint);
      }
      const title = say("摸摸我呀！", "摸摸我呀！", "Pet me!");
      const detail = say(
        "撳一下 · 左右摸 · 按住",
        "点一下 · 左右摸 · 按住",
        "Tap · Stroke · Hold"
      );
      if (state.hint.firstElementChild.textContent !== title) {
        state.hint.firstElementChild.textContent = title;
      }
      if (state.hint.lastElementChild.textContent !== detail) {
        state.hint.lastElementChild.textContent = detail;
      }
      if (rabbit.parentElement?.classList.contains("feed-cover")) {
        rabbit.parentElement.classList.add("bp-cover");
      }
    });
    document.querySelectorAll(".bp-hint").forEach(hint => {
      if (!hintTargets.get(hint)?.isConnected) hint.remove();
    });
    if (bubbleRabbit && !bubbleRabbit.isConnected) {
      bubble.hidden = true;
    }
  }
  function scheduleScan() {
    if (scanPending) return;
    scanPending = true;
    requestAnimationFrame(() => {
      scanPending = false;
      scanRabbits();
    });
  }
  function clearGesture() {
    if (!gesture) return;
    clearTimeout(gesture.holdTimer);
    gesture = null;
  }
  document.addEventListener("click", event => {
    const hint = event.target.closest?.(".bp-hint");
    if (!hint) return;
    const rabbit = hintTargets.get(hint);
    if (!rabbit?.isConnected) return;
    const rect = rabbit.getBoundingClientRect();
    respond(
      rabbit, "cuddle",
      rect.left + rect.width * .5,
      rect.top + rect.height * .55,
      true
    );
  });
  document.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    const rabbit = event.target.closest?.("svg.rabbit");
    if (!rabbit || !eligible(rabbit)) return;
    clearGesture();
    const current = {
      rabbit,
      pointerId:event.pointerId,
      startX:event.clientX,
      startY:event.clientY,
      lastX:event.clientX,
      lastY:event.clientY,
      direction:0,
      reversals:0,
      strokeDistance:0,
      totalDistance:0,
      moved:false,
      held:false,
      holdTimer:null,
      tickledAt:0
    };
    gesture = current;
    current.holdTimer = setTimeout(() => {
      if (
        gesture !== current ||
        current.moved ||
        !rabbit.isConnected
      ) return;
      current.held = true;
      respond(rabbit, "sleepy", current.lastX, current.lastY, true);
    }, 850);
  });
  document.addEventListener("pointermove", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const g = gesture;
    if (!g.rabbit.isConnected) {
      clearGesture();
      return;
    }
    const horizontal = Math.abs(event.clientX - g.startX);
    const vertical = Math.abs(event.clientY - g.startY);
    // 上下拖動仍然可以捲動手機頁面。
    if (vertical > 28 && vertical > horizontal) {
      clearGesture();
      return;
    }
    if (Math.hypot(horizontal, vertical) > 9) {
      g.moved = true;
      clearTimeout(g.holdTimer);
    }
    const dx = event.clientX - g.lastX;
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    if (Math.abs(dx) < 2) return;
    const direction = Math.sign(dx);
    if (g.direction && direction !== g.direction) g.reversals++;
    g.direction = direction;
    g.strokeDistance += Math.abs(dx);
    g.totalDistance += Math.abs(dx);
    const part = bodyPart(g.rabbit, event.clientX, event.clientY);
    const now = Date.now();
    // 累積距離獨立計算，普通摸摸不會把搔癢進度清掉。
    if (
      part === "body" &&
      g.reversals >= 3 &&
      g.totalDistance >= 55
    ) {
      if (respond(g.rabbit, "tickle", event.clientX, event.clientY, true)) {
        g.reversals = 0;
        g.totalDistance = 0;
        g.strokeDistance = 0;
        g.tickledAt = now;
      }
      return;
    }
    if (g.strokeDistance >= 20 && now - g.tickledAt > 1000) {
      if (respond(
        g.rabbit,
        part === "body" ? "cuddle" : "enjoy",
        event.clientX,
        event.clientY
      )) {
        g.strokeDistance = 0;
      }
    }
  });
  document.addEventListener("pointerup", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const g = gesture;
    clearGesture();
    if (g.held || g.moved || !g.rabbit.isConnected) return;
    const rect = g.rabbit.getBoundingClientRect();
    if (
      event.clientX < rect.left || event.clientX > rect.right ||
      event.clientY < rect.top || event.clientY > rect.bottom
    ) return;
    const state = getState(g.rabbit);
    const now = Date.now();
    state.taps = state.taps.filter(time => now - time < 2000);
    state.taps.push(now);
    if (state.taps.length >= 5) {
      state.taps = [];
      state.lastTap = 0;
      respond(g.rabbit, "angry", event.clientX, event.clientY, true);
      return;
    }
    const doubleTap = state.lastTap && now - state.lastTap < 420;
    state.lastTap = doubleTap ? 0 : now;
    const part = bodyPart(g.rabbit, event.clientX, event.clientY);
    const mood = doubleTap ? "shy" :
      part === "nose" ? "surprised" :
      part === "head" ? "enjoy" : "happy";
    respond(g.rabbit, mood, event.clientX, event.clientY, true);
  });
  document.addEventListener("pointercancel", clearGesture);
  window.addEventListener("blur", clearGesture);
  function hideOnScroll() {
    bubble.hidden = true;
    clearGesture();
  }
  // 包括記帳視窗內的捲動。
  document.addEventListener("scroll", hideOnScroll, {
    passive:true,
    capture:true
  });
  function start() {
    document.body.append(bubble);
    scanRabbits();
    const observer = new MutationObserver(records => {
      const relevant = records.some(record => {
        if (record.type === "attributes") return true;
        return [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && (
            node.matches?.("svg.rabbit,.bp-hint") ||
            node.querySelector?.("svg.rabbit")
          )
        );
      });
      if (relevant) scheduleScan();
    });
    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
    observer.observe(document.documentElement, {
      attributes:true,
      attributeFilter:["lang"]
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, {once:true});
  } else {
    start();
  }
})();