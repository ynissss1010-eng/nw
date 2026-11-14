"use strict";

(() => {
  if (window.__bunnyPettingV3) return;
  window.__bunnyPettingV3 = true;

  const NS = "http://www.w3.org/2000/svg";
  const DB_NAME = "bunny-yanice-v5";
  const DAILY_GAIN_LIMIT = 20;
  const GAIN_COOLDOWN = 1200;

  // 每種反應對好感度的影響
  const DELTA = {
    enjoy: 2, cuddle: 2, adore: 2, shy: 2, sleepy: 3,
    happy: 1, tickle: 1, surprised: 1, wary: 1,
    cheeky: 0, angry: -5
  };

  const LEVELS = [
    ["初次見面", "初次见面", "Getting acquainted"],
    ["開始熟絡", "开始熟络", "Getting closer"],
    ["好鍾意你", "好喜欢你", "Very fond of you"],
    ["超級黏你", "超级黏你", "Your little shadow"]
  ];

  const states = new WeakMap();
  const hintTargets = new WeakMap();
  const motionClasses = [
    "bp-soft", "bp-hop", "bp-boop", "bp-tickle", "bp-sleep", "bp-angry"
  ];

  let gesture = null;
  let scanPending = false;
  let bubbleTimer;
  let bubbleRabbit = null;
  let database = null;
  let affection = null;
  let lastGain = 0;
  let writing = Promise.resolve();

  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    if (lang.startsWith("en")) return en;
    if (lang.includes("hans") || lang === "zh-cn") return sc;
    return tc;
  }

  function today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const levelIndex = v => v >= 80 ? 3 : v >= 50 ? 2 : v >= 20 ? 1 : 0;
  const levelName = v => say(...LEVELS[levelIndex(v)]);

  /* ---------------- 對白 ---------------- */

  const messages = {
    enjoy: [
      ["啱喇～就係耳仔中間！舒服到想變成一粒麻糬。", "对啦～就是耳朵中间！舒服得想变成一颗麻薯。", "Right between my ears! I’m turning into a comfy little mochi."],
      ["呢個手勢得喎，兔兔批准你繼續～", "这个手法不错哦，兔兔批准你继续～", "Excellent technique. Bunny permission to continue!"]
    ],
    happy: [
      ["嘿嘿，今日份摸摸收到！開心到想跳兩下。", "嘿嘿，今天的摸摸收到！开心得想蹦两下。", "Today’s pets received! Time for a happy little hop."],
      ["你係咪偷偷學過摸兔兔㗎？咁叻嘅！", "你是不是偷偷学过摸兔兔呀？这么厉害！", "Have you secretly studied bunny petting?"]
    ],
    shy: [
      ["做咩突然咁錫我呀……耳仔都紅晒喇！", "怎么突然这么宠我呀……耳朵都红啦！", "Why so sweet all of a sudden? My ears are blushing!"],
      ["唔准笑我面紅！我只係……有少少熱啫。", "不许笑我脸红！我只是……有点热而已。", "Don’t laugh at my blush! I’m just… a little warm."]
    ],
    surprised: [
      ["啵！鼻鼻唔係儲存掣嚟㗎！", "啵！鼻子可不是保存按钮哦！", "Boop! My nose isn’t the save button!"],
      ["咦！你搵到兔兔個小鼻鼻喇！", "咦！你找到兔兔的小鼻子啦！", "Ooh! You found my little nose!"]
    ],
    cuddle: [
      ["再陪我一陣啦～最軟嗰撮毛留咗畀你。", "再陪我一会儿嘛～最软的那撮毛留给你。", "Stay a little longer. I saved my softest fluff for you."],
      ["今日做隻跟屁兔，你去邊我就跟去邊～", "今天当一只跟屁兔，你去哪我就跟去哪～", "I’m your bunny shadow today!"]
    ],
    tickle: [
      ["哈哈哈哈！唔好搔嗰度呀，啲毛都笑亂晒！", "哈哈哈哈！别挠那里呀，毛毛都笑乱啦！", "Hahaha! You’re tickling my fluff out of place!"],
      ["停、停一停！兔兔笑到數唔到紅蘿蔔喇！", "等、等一下！兔兔笑得数不清胡萝卜啦！", "W-wait! I can’t count my carrots like this!"]
    ],
    sleepy: [
      ["嗯……繼續摸……我只係合埋眼諗緊啲數……", "嗯……继续摸……我只是闭眼想一想账目……", "Mmm… keep going. Just doing maths with my eyes closed…"],
      ["瞓一陣先……紅蘿蔔記得留半條畀我……", "先睡一小会儿……胡萝卜记得给我留半根……", "Tiny nap… save half a carrot for me…"]
    ],
    cheeky: [
      ["摸咗咁多下，係咪應該交一條紅蘿蔔呢？", "摸了这么多下，是不是该交一根胡萝卜啦？", "That’s a lot of pets. Shall we discuss the carrot fee?"],
      ["好啦，今日最鍾意你！聽日？聽日再講～", "好啦，今天最喜欢你！明天？明天再说～", "Fine, you’re my favourite today. Tomorrow is negotiable."]
    ],
    angry: [
      ["喂喂喂！兔兔唔係門鐘呀，唔好不停撳我啦！", "喂喂喂！兔兔又不是门铃，不许一直戳啦！", "Hey! I’m a bunny, not a doorbell!"],
      ["哼！毛都戳亂晒！好感度扣分，輕輕摸返先原諒你。", "哼！毛都戳乱啦！好感度扣分，轻轻摸顺才原谅你。", "Hmph! Affection down. Smooth my fluff to make up!"]
    ],
    wary: [
      ["咦……我哋仲未太熟，輕輕摸就好……不過，唔討厭啦。", "咦……我们还不太熟，轻轻摸就好……不过，不讨厌啦。", "Um… we’re still getting to know each other. Gently… but I don’t mind."],
      ["我、我先觀察下你先……你隻手都幾暖喎。", "我、我先观察一下你……你的手还挺暖的。", "I’m still watching you… your hand is quite warm, though."]
    ],
    adore: [
      ["最鍾意你摸我喇！可唔可以每日都嚟呀？", "最喜欢你摸我啦！可不可以每天都来呀？", "I love your pets! Can you come every day?"],
      ["兔兔個心已經裝滿晒你喇～", "兔兔的心已经装满你啦～", "My little heart is full of you!"]
    ]
  };

  /* ---------------- 樣式 ---------------- */

  const style = document.createElement("style");
  style.id = "bunny-petting-style";
  style.textContent = `
    svg.rabbit.bp-enabled {
      cursor:grab; touch-action:pan-y;
      user-select:none; -webkit-user-select:none;
      transform-origin:50% 85%;
    }
    svg.rabbit.bp-enabled:active { cursor:grabbing; }
    @media(hover:hover) {
      svg.rabbit.bp-enabled:hover { filter:drop-shadow(0 0 7px #d88ba366); }
    }

    .bp-hint {
      position:relative; display:block; width:fit-content; max-width:100%;
      margin:12px auto; padding:10px 16px;
      border:2px solid var(--accent,#a64f70); border-radius:16px;
      background:var(--paper,#fffefd); color:var(--accent,#a64f70);
      text-align:center; cursor:pointer;
      box-shadow:0 3px 0 var(--soft,#fae8ee);
    }
    .bp-hint::before {
      content:""; position:absolute; top:-8px; left:calc(50% - 6px);
      width:11px; height:11px;
      border-top:2px solid var(--accent,#a64f70);
      border-left:2px solid var(--accent,#a64f70);
      background:var(--paper,#fffefd); transform:rotate(45deg);
    }
    .bp-hint strong { display:block; font:800 17px/1.5 var(--font,sans-serif); }
    .bp-hint small {
      display:block; margin-top:2px;
      font:12px/1.6 var(--font,sans-serif); color:var(--ink,#4a383d);
    }
    .bp-hint:focus-visible { outline:3px solid var(--accent,#a64f70); outline-offset:4px; }

    /* 好感度條 */
    .bp-meter { display:block; margin-top:8px; min-width:180px; }
    .bp-meter-label {
      display:flex; justify-content:center; align-items:baseline; gap:4px;
      font:700 12px/1.4 var(--font,sans-serif); color:var(--ink,#4a383d);
    }
    .bp-meter-label b {
      display:inline-block; font:900 15px "Nunito",sans-serif;
      color:var(--accent,#a64f70); transition:transform .25s ease;
    }
    .bp-meter-label em { font-style:normal; color:var(--muted,#806b72); }
    .bp-track {
      display:block; height:8px; margin-top:6px;
      background:#efe3e7; border-radius:9px; overflow:hidden;
    }
    .bp-track i {
      display:block; height:100%; width:0;
      background:var(--accent,#a64f70); border-radius:9px;
      transition:width .55s ease, background .3s ease;
    }
    .bp-hint.bp-up { animation:bp-glow-up .9s ease; }
    .bp-hint.bp-up b { transform:scale(1.4); }
    .bp-hint.bp-down { animation:bp-glow-down .7s ease; }
    .bp-hint.bp-down .bp-track i { background:#7f8fae; }
    .bp-hint.bp-down b { color:#5f6f8f; }

    .bp-chip {
      position:absolute; top:-13px; right:-10px; z-index:2;
      padding:2px 9px; border-radius:11px;
      font:900 13px/1.5 "Nunito",sans-serif; color:white;
      background:#d9577f; pointer-events:none;
      animation:bp-chip 1.3s ease-out forwards;
    }
    .bp-chip.down { background:#62728f; }

    .bp-delta {
      position:fixed; z-index:1002; pointer-events:none;
      font:900 28px/1 "Nunito",sans-serif; white-space:nowrap;
      text-shadow:0 2px 0 #fff, 0 0 8px #fff;
      animation:bp-delta 1.5s ease-out forwards;
    }
    .bp-delta.up { color:#d9577f; }
    .bp-delta.down { color:#5f6f8f; }
    .bp-delta.zero { color:var(--muted,#806b72); font-size:14px; }

    .hero > .bp-hint { grid-column:2; justify-self:center; margin:-12px 0 0; }
    .feed-cover.bp-cover { min-height:345px; }
    .feed-cover.bp-cover > svg.rabbit { bottom:112px; }
    .feed-cover.bp-cover > .bp-hint {
      position:absolute; right:22px; bottom:12px;
      width:245px; margin:0; z-index:2;
    }

    .bp-feedback {
      position:fixed; z-index:1000; width:max-content;
      max-width:min(290px,calc(100vw - 24px)); padding:13px 16px;
      border:1px solid var(--line,#ecdfdf); border-radius:17px 17px 6px 17px;
      background:var(--paper,#fffefd); color:var(--ink,#4a383d);
      font:14px/1.8 var(--font,sans-serif);
      box-shadow:0 5px 18px #50304015; pointer-events:none;
    }
    .bp-feedback[hidden] { display:none; }
    .bp-mark {
      position:fixed; z-index:1001; pointer-events:none;
      color:var(--accent,#a64f70); font:800 23px/1 "Nunito",sans-serif;
      animation:bp-float 1s ease-out forwards;
    }

    .bp-tier-heart {
      transform-box:fill-box; transform-origin:center;
      animation:bp-bob 2.4s ease-in-out infinite;
    }

    .bp-soft { animation:bp-soft .7s ease-in-out; }
    .bp-hop, .pet-motion-hop { animation:bp-hop .6s ease-in-out; }
    .bp-boop { animation:bp-boop .5s ease-in-out; }
    .bp-tickle { animation:bp-tickle .65s ease-in-out; }
    .bp-sleep { animation:bp-sleep 2s ease-in-out; }
    .bp-angry { animation:bp-angry .55s ease-in-out; }

    @keyframes bp-soft { 0%,100%{transform:rotate(0)} 35%{transform:rotate(-4deg)} 70%{transform:rotate(3deg)} }
    @keyframes bp-hop { 0%,100%{transform:translateY(0)} 40%{transform:translateY(-8px)} }
    @keyframes bp-boop { 0%,100%{transform:scale(1)} 40%{transform:scale(.95) rotate(-3deg)} }
    @keyframes bp-tickle { 0%,100%{transform:rotate(0)} 20%,60%{transform:rotate(-4deg)} 40%,80%{transform:rotate(4deg)} }
    @keyframes bp-sleep { 0%,100%{transform:translateY(0)} 50%{transform:translateY(3px) rotate(-2deg)} }
    @keyframes bp-angry { 0%,100%{transform:translateX(0)} 25%,65%{transform:translateX(-3px)} 45%,85%{transform:translateX(3px)} }
    @keyframes bp-float { from{opacity:1;transform:translate(-50%,0) scale(.8)} to{opacity:0;transform:translate(-50%,-55px) scale(1.15)} }
    @keyframes bp-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
    @keyframes bp-glow-up { 30%{box-shadow:0 0 0 5px #ffd3e2} }
    @keyframes bp-glow-down {
      20%,60%{transform:translateX(-4px)} 40%,80%{transform:translateX(4px)}
      30%{box-shadow:0 0 0 5px #cfd8e8}
    }
    @keyframes bp-chip { 0%{opacity:0;transform:translateY(6px)} 20%{opacity:1;transform:translateY(-3px)} 100%{opacity:0;transform:translateY(-16px)} }
    @keyframes bp-delta {
      0%{opacity:0;transform:translate(-50%,6px) scale(.7)}
      15%{opacity:1;transform:translate(-50%,-8px) scale(1.2)}
      100%{opacity:0;transform:translate(-50%,-75px) scale(1)}
    }

    @media(max-width:760px) {
      .hero > .bp-hint { grid-column:1/-1; margin:8px auto 0; }
      .feed-cover.bp-cover { min-height:320px; }
      .feed-cover.bp-cover > svg.rabbit { bottom:112px; }
      .feed-cover.bp-cover > .bp-hint { width:190px; right:10px; bottom:10px; padding:8px; }
      .bp-meter { min-width:150px; }
      .bp-hint strong { font-size:16px; }
      .bp-hint small { font-size:11px; }
    }

    @media(prefers-reduced-motion:reduce) {
      .bp-soft,.bp-hop,.pet-motion-hop,.bp-boop,.bp-tickle,.bp-sleep,.bp-angry,
      .bp-mark,.bp-delta,.bp-chip,.bp-tier-heart,.bp-hint.bp-up,.bp-hint.bp-down { animation:none; }
      .bp-track i { transition:none; }
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
        taps: [], lastTap: 0, lastReaction: 0, lastPet: 0,
        attention: 0, face: null, hint: null, lastMessage: {}
      });
    }
    return states.get(rabbit);
  }

  function eligible(rabbit) {
    return rabbit instanceof SVGElement &&
      rabbit.matches("svg.rabbit") &&
      !rabbit.closest("button,a,.pet-grid,.petgrid,.pet-choice,.onboarding");
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

  /* ---------------- 表情 ---------------- */

  const heartEye = (x, y) =>
    `<path d="M${x} ${y + 5}l-5.5-5.5a3.2 3.2 0 0 1 5.5-3.5a3.2 3.2 0 0 1 5.5 3.5Z" fill="#d9577f" stroke="none"/>`;

  const expressions = {
    enjoy: ['<path d="M77 115q6 6 12 0m25 0q6 6 12 0"/>', '<path d="M97 137q5 5 10 0"/>'],
    happy: ['<path d="M77 116q6-10 12 0m25 0q6-10 12 0"/>', '<path d="M96 136q6 12 12 0Z" fill="#bd7c8e"/>'],
    shy: ['<path d="M78 114q5 5 10 0m27 0q5 5 10 0"/>', '<path d="M98 138q4 4 8 0"/>'],
    surprised: [
      '<ellipse cx="83" cy="114" rx="5" ry="7" fill="#382b26"/><ellipse cx="120" cy="114" rx="5" ry="7" fill="#382b26"/>',
      '<ellipse cx="102" cy="139" rx="3.5" ry="4.5" fill="#805b61"/>'
    ],
    cuddle: [
      '<ellipse cx="83" cy="114" rx="4.5" ry="6" fill="#382b26"/><ellipse cx="120" cy="114" rx="4.5" ry="6" fill="#382b26"/><circle cx="84" cy="112" r="1.7" fill="white" stroke="none"/><circle cx="121" cy="112" r="1.7" fill="white" stroke="none"/>',
      '<path d="M96 137q6 7 12 0"/>'
    ],
    tickle: ['<path d="m78 109 9 6-9 5m47-11-9 6 9 5"/>', '<path d="M94 135q8 18 16 0Z" fill="#bd7c8e"/>'],
    sleepy: ['<path d="M77 116q6 3 12 0m25 0q6 3 12 0"/>', '<ellipse cx="102" cy="139" rx="3" ry="2" fill="#946b71"/>'],
    cheeky: [
      '<path d="M77 115q6-9 12 0"/><ellipse cx="120" cy="114" rx="3.7" ry="4.8" fill="#382b26"/>',
      '<path d="M96 137q6 7 12-1"/>'
    ],
    angry: [
      '<path d="m76 103 14 6m23 0 14-6" stroke-width="3"/><path d="M78 116h10m27 0h10" stroke-width="2.8"/>',
      '<ellipse cx="87" cy="137" rx="8" ry="6" fill="#efb0b9" stroke="none"/><ellipse cx="117" cy="137" rx="8" ry="6" fill="#efb0b9" stroke="none"/><path d="M97 141q5-6 10 0"/><path d="M144 89v9m-5-5h10" stroke="#ba5269" stroke-width="2.5"/>'
    ],
    // 怕生：眼睛斜望、嘴巴拉平、冒汗
    wary: [
      '<ellipse cx="80" cy="115" rx="3" ry="4" fill="#382b26"/><ellipse cx="117" cy="115" rx="3" ry="4" fill="#382b26"/><path d="m76 106 9-2m27 2 9-2"/>',
      '<path d="M98 139h8"/><path d="M143 96q6 9 0 13q-6-4 0-13Z" fill="#a8cdea" stroke="#6f9cc0" stroke-width="1"/>'
    ],
    // 超級黏你：愛心眼
    adore: [heartEye(83, 112) + heartEye(120, 112), '<path d="M95 135q7 13 14 0Z" fill="#bd7c8e"/>']
  };

  function restoreFace(rabbit) {
    const state = states.get(rabbit);
    if (!state?.face) return;
    clearTimeout(state.face.timer);
    state.face.hidden.forEach(({ element, value }) => {
      if (value === null) element.removeAttribute("visibility");
      else element.setAttribute("visibility", value);
    });
    state.face.overlay.remove();
    state.face = null;
    rabbit.classList.remove(...motionClasses);
  }

  function changeFace(rabbit, mood) {
    restoreFace(rabbit);
    const hidden = [];

    // 暫時隱藏原本的眼睛和嘴巴
    [...rabbit.children].forEach(element => {
      const tag = element.localName;
      const x = Number(element.getAttribute("cx"));
      const y = Number(element.getAttribute("cy"));
      const d = (element.getAttribute("d") || "").trim();

      const eye = tag === "ellipse" && [83, 120].includes(x) && [113, 114].includes(y);
      const shine = tag === "circle" && [84, 121].includes(x) && [111, 112].includes(y);
      const facePath = tag === "path" && /^(M77 116|M77 115|M95 135|M96 140|M102 131|m77 102)/i.test(d);
      const mouth = tag === "ellipse" && x === 102 && y === 139;

      if (eye || shine || facePath || mouth) {
        hidden.push({ element, value: element.getAttribute("visibility") });
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
      ${["shy", "cuddle", "tickle", "adore"].includes(mood) ? `
        <ellipse cx="74" cy="127" rx="10" ry="5" fill="#e998ad" opacity=".7"/>
        <ellipse cx="130" cy="127" rx="10" ry="5" fill="#e998ad" opacity=".7"/>` : ""}
    `;
    rabbit.append(overlay);

    getState(rabbit).face = {
      overlay,
      hidden,
      timer: setTimeout(() => restoreFace(rabbit), mood === "sleepy" ? 4500 : 3000)
    };
  }

  // 好感度等級的常駐小變化：汗滴、腮紅、頭頂愛心
  const tierArt = [
    '<path d="M143 96q6 9 0 13q-6-4 0-13Z" fill="#a8cdea" stroke="#6f9cc0" stroke-width="1"/>',
    "",
    '<ellipse cx="74" cy="128" rx="10" ry="5" fill="#ea8fa8" opacity=".45"/><ellipse cx="129" cy="128" rx="10" ry="5" fill="#ea8fa8" opacity=".45"/>',
    '<ellipse cx="74" cy="128" rx="10" ry="5" fill="#ea8fa8" opacity=".5"/><ellipse cx="129" cy="128" rx="10" ry="5" fill="#ea8fa8" opacity=".5"/><path class="bp-tier-heart" d="M166 72l-7-7a4.2 4.2 0 0 1 7-5a4.2 4.2 0 0 1 7 5Z" style="fill:var(--accent,#a64f70)"/>'
  ];

  function applyTier(rabbit) {
    const tier = affection === null ? "" : String(levelIndex(affection));
    const current = rabbit.querySelector(":scope > g[data-bp-tier]");
    if ((current?.getAttribute("data-bp-tier") ?? "") === tier) return;

    current?.remove();
    if (tier === "" || !tierArt[tier]) return;

    const group = document.createElementNS(NS, "g");
    group.setAttribute("data-bp-tier", tier);
    group.setAttribute("pointer-events", "none");
    group.innerHTML = tierArt[tier];
    rabbit.append(group);
  }

  /* ---------------- 回饋效果 ---------------- */

  const effectParent = rabbit => rabbit.closest("dialog") || document.body;

   function showBubble(rabbit, message, x, y) {
    // 兔兔在對話區內：直接換泡泡裡的文字，不另外浮出氣泡。
    const talk = rabbit.closest(".companion")?.querySelector(":scope > div");
    const line = talk?.querySelector("p");

    if (line) {
      bubble.hidden = true;
      talk.setAttribute("aria-live", "polite");

      if (!("bpOriginal" in line.dataset)) {
        line.dataset.bpOriginal = line.textContent;
      }

      line.textContent = message;
      talk.classList.remove("bp-said");
      void talk.offsetWidth;
      talk.classList.add("bp-said");

      clearTimeout(line._bpTimer);
      line._bpTimer = setTimeout(() => {
        if (!line.isConnected) return;
        line.textContent = line.dataset.bpOriginal;
        delete line.dataset.bpOriginal;
      }, 4500);
      return;
    }

    // 其他位置的兔兔沿用浮動氣泡。
    effectParent(rabbit).append(bubble);
    bubbleRabbit = rabbit;
    bubble.textContent = message;
    bubble.hidden = false;

    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    const above = y - height - 25;

    bubble.style.left = Math.max(12, Math.min(x - width / 2, innerWidth - width - 12)) + "px";
    bubble.style.top = Math.max(12, Math.min(above >= 12 ? above : y + 22, innerHeight - height - 12)) + "px";

    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => { bubble.hidden = true; }, 3600);
  }

  function particles(rabbit, mood, x, y) {
    const marks =
      mood === "angry" ? ["!", "💢", "!"] :
      mood === "sleepy" ? ["z", "z", "Z"] :
      mood === "surprised" ? ["!", "♡"] :
      mood === "wary" ? ["…"] :
      mood === "adore" ? ["♥", "♥", "♥", "♥"] :
      ["♡", "♥", "♡"];
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

  function showDelta(rabbit, result, x, y) {
    const parent = effectParent(rabbit);
    if (parent.localName === "dialog" && !parent.open) return;

    const element = document.createElement("span");
    element.setAttribute("aria-hidden", "true");

    if (result.applied > 0) {
      element.className = "bp-delta up";
      element.textContent = `+${result.applied} ♥`;
    } else if (result.applied < 0) {
      element.className = "bp-delta down";
      element.textContent = `−${Math.abs(result.applied)}`;
    } else {
      element.className = "bp-delta zero";
      element.textContent = result.after >= 100
        ? "♥ 100 MAX"
        : say("今日上限", "今日上限", "Daily limit");
    }

    element.style.left = x + 26 + "px";
    element.style.top = y - 34 + "px";
    parent.append(element);
    setTimeout(() => element.remove(), 1600);
  }

  /* ---------------- 好感度條 ---------------- */

  function setText(element, text) {
    if (element && element.textContent !== String(text)) element.textContent = text;
  }

  function buildHint() {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "bp-hint";
    hint.innerHTML = `
      <strong></strong><small></small>
      <span class="bp-meter">
        <span class="bp-meter-label">♥ <b class="bp-value">—</b>/100 · <em class="bp-level"></em></span>
        <span class="bp-track"><i></i></span>
      </span>`;
    return hint;
  }

  function updateMeter(hint, delta = 0) {
    setText(hint.querySelector("strong"), say("摸摸我呀！", "摸摸我呀！", "Pet me!"));
    setText(hint.querySelector("small"), say("撳一下 · 左右摸 · 按住", "点一下 · 左右摸 · 按住", "Tap · Stroke · Hold"));
    setText(hint.querySelector(".bp-value"), affection === null ? "—" : affection);
    setText(hint.querySelector(".bp-level"),
      affection === null ? say("準備中", "准备中", "Loading") : levelName(affection));

    const bar = hint.querySelector(".bp-track i");
    const width = (affection ?? 0) + "%";
    if (bar.style.width !== width) bar.style.width = width;

    if (!delta) return;

    hint.classList.remove("bp-up", "bp-down");
    void hint.offsetWidth;
    hint.classList.add(delta > 0 ? "bp-up" : "bp-down");
    clearTimeout(hint._bpTimer);
    hint._bpTimer = setTimeout(() => hint.classList.remove("bp-up", "bp-down"), 1000);

    const chip = document.createElement("span");
    chip.className = "bp-chip" + (delta < 0 ? " down" : "");
    chip.textContent = (delta > 0 ? "+" : "−") + Math.abs(delta);
    chip.setAttribute("aria-hidden", "true");
    hint.append(chip);
    setTimeout(() => chip.remove(), 1350);
  }

  // 首頁照顧手帳即時同步；care.js 之後會用資料庫數值再確認。
  function updateCarePanel() {
    const panel = document.querySelector("#rabbitCarePanel");
    if (!panel || affection === null) return;

    const track = panel.querySelector(".rabbit-care-track");
    track?.setAttribute("aria-valuenow", affection);
    const bar = track?.querySelector("i");
    if (bar) bar.style.width = affection + "%";

    setText(panel.querySelectorAll(".rabbit-care-numbers strong")[1], `${affection} / 100`);
    setText(panel.querySelector(".rabbit-care-level"), levelName(affection));
  }

  function updateAll() {
    document.querySelectorAll(".bp-hint").forEach(hint => {
      if (hintTargets.get(hint)?.isConnected) updateMeter(hint);
    });
    document.querySelectorAll("svg.rabbit").forEach(rabbit => {
      if (eligible(rabbit)) applyTier(rabbit);
    });
    updateCarePanel();
  }

  /* ---------------- 資料庫 ---------------- */

  function openDatabase() {
    if (database) return Promise.resolve(database);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains("data")) {
          request.result.createObjectStore("data");
        }
      };
      request.onsuccess = () => { database = request.result; resolve(database); };
      request.onerror = () => reject(request.error);
    });
  }

  async function readAffection() {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction("data", "readonly");
      const request = transaction.objectStore("data").get("main");
      transaction.oncomplete = () => {
        const state = request.result;
        resolve(state?.ready && Number.isInteger(state.rabbitCare?.affection)
          ? state.rabbitCare.affection
          : null);
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /*
   * 在同一個交易內讀取最新資料、計算好感度並寫回，
   * 不會覆蓋 app.js 的帳目或 care.js 的提摩西草。
   */
  function changeAffection(delta) {
    const job = writing.then(async () => {
      const db = await openDatabase();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction("data", "readwrite");
        const store = transaction.objectStore("data");
        const request = store.get("main");
        let result = null;

        request.onsuccess = () => {
          const state = request.result;
          if (!state?.ready || !Array.isArray(state.entries)) return;

          // care.js 尚未初始化時，用同一格式建立；舊帳不補發草。
          if (!state.rabbitCare) {
            state.rabbitCare = {
              version: 1, grass: 0, affection: 0, feedCount: 0,
              seenEntryIds: [...new Set(state.entries.map(entry => entry.id))]
            };
          }

          const care = state.rabbitCare;
          if (!Number.isInteger(care.affection)) return;

          const day = today();
          if (!state.rabbitPetting || state.rabbitPetting.day !== day) {
            state.rabbitPetting = { day, gained: 0 };
          }

          const before = care.affection;
          let applied;

          if (delta > 0) {
            const room = Math.max(0, DAILY_GAIN_LIMIT - state.rabbitPetting.gained);
            applied = Math.min(delta, room, 100 - before);
            state.rabbitPetting.gained += applied;
          } else {
            applied = Math.max(delta, -before);
          }

          care.affection = before + applied;
          result = { before, after: care.affection, applied };
          store.put(state, "main");
        };

        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error || Error("Affection update aborted"));
      });
    });

    writing = job.catch(() => null);
    return job;
  }

  async function refreshAffection() {
    try {
      const value = await readAffection();
      if (value !== affection) {
        affection = value;
        updateAll();
      }
    } catch (error) {
      console.error("Affection refresh:", error);
    }
  }

  async function handleAffection(rabbit, mood, x, y) {
    const delta = DELTA[mood] ?? 0;
    if (!delta) return;

    const now = Date.now();
    if (delta > 0) {
      if (now - lastGain < GAIN_COOLDOWN) return;
      lastGain = now;
    }

    try {
      const result = await changeAffection(delta);
      if (!result) return;

      const oldLevel = levelIndex(result.before);
      const newLevel = levelIndex(result.after);
      affection = result.after;

      showDelta(rabbit, result, x, y);
      updateAll();

      const hint = getState(rabbit).hint;
      if (hint?.isConnected && result.applied) updateMeter(hint, result.applied);

      if (newLevel !== oldLevel) {
        const name = levelName(result.after);

        setTimeout(() => {
          if (!rabbit.isConnected) return;

          if (newLevel > oldLevel) {
            changeFace(rabbit, newLevel === 3 ? "adore" : "happy");
            particles(rabbit, "adore", x, y);
            showBubble(rabbit, say(
              `好感度升級喇！我哋而家係「${name}」～`,
              `好感度升级啦！我们现在是「${name}」～`,
              `Affection level up! We’re now “${name}”!`
            ), x, y);
          } else {
            changeFace(rabbit, "wary");
            showBubble(rabbit, say(
              `好感度跌咗落「${name}」……輕輕摸返我啦。`,
              `好感度降到「${name}」了……轻轻摸摸我嘛。`,
              `Affection dropped to “${name}”… a gentle pet would help.`
            ), x, y);
          }
        }, 1100);
      }
    } catch (error) {
      console.error("Affection update:", error);
    }
  }

  /* ---------------- 反應 ---------------- */

  function respond(rabbit, mood, x, y, force = false) {
    if (!rabbit.isConnected) return false;

    const state = getState(rabbit);
    const now = Date.now();
    if (!force && now - state.lastReaction < 500) return false;

    if (now - state.lastPet > 15000) state.attention = 0;
    state.attention++;

    if (state.attention >= 8 && ["happy", "enjoy", "cuddle"].includes(mood)) {
      mood = "cheeky";
      state.attention = 0;
    }

    // 好感度決定兔兔的態度
    if (affection !== null) {
      if (affection < 20 && ["enjoy", "cuddle", "happy"].includes(mood)) mood = "wary";
      else if (affection >= 80 && mood === "cuddle") mood = "adore";
    }

    state.lastPet = now;
    state.lastReaction = now;

    changeFace(rabbit, mood);
    rabbit.classList.remove(...motionClasses);
    void rabbit.getBoundingClientRect();
    rabbit.classList.add({
      happy: "bp-hop", adore: "bp-hop", surprised: "bp-boop",
      tickle: "bp-tickle", sleepy: "bp-sleep", angry: "bp-angry"
    }[mood] || "bp-soft");

    particles(rabbit, mood, x, y);
    showBubble(rabbit, pickMessage(state, mood), x, y);
    handleAffection(rabbit, mood, x, y);
    return true;
  }

  function bodyPart(rabbit, clientX, clientY) {
    try {
      const matrix = rabbit.getScreenCTM();
      if (!matrix) return "body";

      const point = rabbit.createSVGPoint();
      point.x = clientX;
      point.y = clientY;
      const p = point.matrixTransform(matrix.inverse());

      if (Math.hypot((p.x - 102) / 18, (p.y - 130) / 16) <= 1) return "nose";
      return p.y < 145 && p.x < 165 ? "head" : "body";
    } catch {
      return "body";
    }
  }

  /* ---------------- 為畫面上的兔兔加上提示 ---------------- */

  function scanRabbits() {
    document.querySelectorAll("svg.rabbit").forEach(rabbit => {
      if (!eligible(rabbit)) return;

      const state = getState(rabbit);
      rabbit.classList.add("bp-enabled");

      if (!state.hint?.isConnected) {
        const hint = buildHint();
        hintTargets.set(hint, rabbit);
        state.hint = hint;
        rabbit.after(hint);
      }

      updateMeter(state.hint);
      applyTier(rabbit);

      if (rabbit.parentElement?.classList.contains("feed-cover")) {
        rabbit.parentElement.classList.add("bp-cover");
      }
    });

    document.querySelectorAll(".bp-hint").forEach(hint => {
      if (!hintTargets.get(hint)?.isConnected) hint.remove();
    });

    if (bubbleRabbit && !bubbleRabbit.isConnected) bubble.hidden = true;
  }

  function scheduleScan() {
    if (scanPending) return;
    scanPending = true;
    requestAnimationFrame(() => {
      scanPending = false;
      scanRabbits();
    });
  }

  /* ---------------- 手勢 ---------------- */

  function clearGesture() {
    if (!gesture) return;
    clearTimeout(gesture.holdTimer);
    gesture = null;
  }

  document.addEventListener("click", event => {
    // 餵草後重新讀取好感度
    if (event.target.closest?.("[data-care-feed]")) {
      setTimeout(refreshAffection, 1600);
      return;
    }

    const hint = event.target.closest?.(".bp-hint");
    if (!hint) return;

    const rabbit = hintTargets.get(hint);
    if (!rabbit?.isConnected) return;

    const rect = rabbit.getBoundingClientRect();
    respond(rabbit, "cuddle", rect.left + rect.width * .5, rect.top + rect.height * .55, true);
  });

  document.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;

    const rabbit = event.target.closest?.("svg.rabbit");
    if (!rabbit || !eligible(rabbit)) return;

    clearGesture();

    const current = {
      rabbit, pointerId: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      lastX: event.clientX, lastY: event.clientY,
      direction: 0, reversals: 0, strokeDistance: 0, totalDistance: 0,
      moved: false, held: false, holdTimer: null, tickledAt: 0
    };
    gesture = current;

    current.holdTimer = setTimeout(() => {
      if (gesture !== current || current.moved || !rabbit.isConnected) return;
      current.held = true;
      respond(rabbit, "sleepy", current.lastX, current.lastY, true);
    }, 850);
  });

  document.addEventListener("pointermove", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;

    const g = gesture;
    if (!g.rabbit.isConnected) { clearGesture(); return; }

    const horizontal = Math.abs(event.clientX - g.startX);
    const vertical = Math.abs(event.clientY - g.startY);

    // 上下拖動交給頁面捲動
    if (vertical > 28 && vertical > horizontal) { clearGesture(); return; }

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

    if (part === "body" && g.reversals >= 3 && g.totalDistance >= 55) {
      if (respond(g.rabbit, "tickle", event.clientX, event.clientY, true)) {
        g.reversals = 0;
        g.totalDistance = 0;
        g.strokeDistance = 0;
        g.tickledAt = now;
      }
      return;
    }

    if (g.strokeDistance >= 20 && now - g.tickledAt > 1000) {
      if (respond(g.rabbit, part === "body" ? "cuddle" : "enjoy", event.clientX, event.clientY)) {
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
    if (event.clientX < rect.left || event.clientX > rect.right ||
        event.clientY < rect.top || event.clientY > rect.bottom) return;

    const state = getState(g.rabbit);
    const now = Date.now();

    // 2 秒內連點 5 下會生氣扣分
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

  document.addEventListener("scroll", () => {
    bubble.hidden = true;
    clearGesture();
  }, { passive: true, capture: true });

  /* ---------------- 啟動 ---------------- */

  function start() {
    document.body.append(bubble);
    scanRabbits();
    refreshAffection();

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

    observer.observe(document.body, { childList: true, subtree: true });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

    // 餵草、其他分頁修改時保持同步
    window.addEventListener("focus", refreshAffection);
    setInterval(() => {
      if (!document.hidden) refreshAffection();
    }, 4000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
