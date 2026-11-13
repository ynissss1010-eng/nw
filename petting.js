"use strict";
(() => {
  const NS = "http://www.w3.org/2000/svg";
  let gesture = null;
  let previousTap = null;
  let rapidTaps = [];
  let affection = 0;
  let lastPetTime = 0;
  let lastReactionTime = 0;
  let bubbleTimer;
  const faces = new WeakMap();
  function say(tc, sc, en) {
    const language = document.documentElement.lang.toLowerCase();
    if (language.startsWith("en")) return en;
    if (language === "zh-hans" || language === "zh-cn") return sc;
    return tc;
  }
  const dialogue = {
    enjoy: [
      [
        "啱喇啱喇～就係耳仔中間嗰度，唔好停呀。",
        "对啦对啦～就是耳朵中间那里，不要停呀。",
        "Right there, between my ears. Don’t stop!"
      ],
      [
        "舒服到隻耳仔都想放假喇～",
        "舒服得连耳朵都想放假啦～",
        "So comfy. Even my ears want a little holiday."
      ]
    ],
    angry: [
  [
    "喂喂喂！兔兔唔係門鐘呀，唔好不停撳我啦！",
    "喂喂喂！兔兔又不是门铃，不许一直戳啦！",
    "Hey! I’m a bunny, not a doorbell. Stop poking!"
  ],
  [
    "哼！毛都畀你戳亂晒！摸返順先原諒你！",
    "哼！毛都被你戳乱了！摸顺了才原谅你！",
    "Hmph! You’ve ruffled my fluff. Smooth it out first!"
  ],
  [
    "兔兔宣布：暫停營業三秒！紅蘿蔔可以優先處理。",
    "兔兔宣布：暂停营业三秒！胡萝卜可以优先处理。",
    "Bunny service is closed for three seconds! Carrots get priority."
  ]
],
    happy: [
      [
        "嘿嘿，今日份摸摸收到！兔兔批准你再摸兩下。",
        "嘿嘿，今天的摸摸收到！兔兔批准你再摸两下。",
        "Today’s pets received! You may have two more."
      ],
      [
        "你隻手係咪識魔法㗎？點解咁舒服嘅～",
        "你的手是不是会魔法呀？怎么这么舒服～",
        "Are your hands magic? How are they this comfy?"
      ]
    ],
    shy: [
      [
        "做咩突然咁錫我呀……耳仔都紅晒喇！",
        "怎么突然这么宠我呀……耳朵都红啦！",
        "Why are you being so sweet? My ears are blushing!"
      ],
      [
        "唔准笑我面紅呀，我只係……有少少熱啫。",
        "不许笑我脸红，我只是……有一点热而已。",
        "No laughing at my blush. I’m just… a little warm."
      ]
    ],
    surprised: [
      [
        "啵！你撳到兔兔個鼻鼻喇！",
        "啵！你碰到兔兔的小鼻子啦！",
        "Boop! You found my little nose!"
      ],
      [
        "咦！鼻鼻唔係記帳個確認掣嚟㗎！",
        "咦！鼻子可不是记账的确认按钮哦！",
        "Hey! My nose isn’t the save button!"
      ]
    ],
    cuddle: [
      [
        "再陪我一陣啦～我留咗最軟嗰撮毛畀你摸。",
        "再陪我一会儿嘛～最软的那撮毛留给你摸。",
        "Stay a little longer. I saved my softest fluff for you."
      ],
      [
        "黐住你一陣先，今日做隻跟屁兔。",
        "先黏着你一会儿，今天当一只跟屁兔。",
        "I’m sticking with you today. Your little bunny shadow."
      ]
    ],
    tickle: [
      [
        "哈哈哈哈，唔好搔嗰度呀！兔兔頂唔順喇！",
        "哈哈哈哈，别挠那里呀！兔兔受不了啦！",
        "Hahaha! Not there! My fluff is far too ticklish!"
      ],
      [
        "救命呀～啲毛都笑到亂晒喇！",
        "救命呀～毛毛都笑乱啦！",
        "Help! You’re laughing all my fluff out of place!"
      ]
    ],
    sleepy: [
      [
        "嗯……你繼續摸……我只係合埋眼諗緊啲數……",
        "嗯……你继续摸……我只是闭眼想一想账目……",
        "Mmm… keep going. I’m just doing the maths with my eyes closed…"
      ],
      [
        "摸到想瞓喇……紅蘿蔔記得幫我留半條……",
        "摸得想睡啦……胡萝卜记得给我留半根……",
        "Getting sleepy… save half a carrot for me…"
      ]
    ],
    cheeky: [
      [
        "摸咗咁多下，係咪應該交一條紅蘿蔔先呢？",
        "摸了这么多下，是不是该交一根胡萝卜啦？",
        "That’s a lot of pets. Shall we discuss the carrot fee?"
      ],
      [
        "好啦，今日最鍾意你。只限今日……聽日再講！",
        "好啦，今天最喜欢你。只限今天……明天再说！",
        "Fine, you’re my favourite today. Tomorrow is negotiable!"
      ]
    ]
  };
  const style = document.createElement("style");
  style.textContent = `
    svg.rabbit {
      cursor:grab;
      touch-action:pan-y;
      user-select:none;
      -webkit-user-select:none;
      transform-origin:50% 85%;
    }
    svg.rabbit:active {
      cursor:grabbing;
    }
    .pet-motion-soft {
      animation:pet-soft .8s ease-in-out;
    }
    .pet-motion-hop {
      animation:pet-hop .65s ease-in-out;
    }
    .pet-motion-boop {
      animation:pet-boop .55s ease-in-out;
    }
    .pet-motion-tickle {
      animation:pet-tickle .7s ease-in-out;
    }
    .pet-motion-sleep {
      animation:pet-sleep 2s ease-in-out;
    }
    @keyframes pet-soft {
      0%,100% { transform:rotate(0); }
      30% { transform:rotate(-4deg); }
      70% { transform:rotate(3deg); }
    }
    @keyframes pet-hop {
      0%,100% { transform:translateY(0); }
      35% { transform:translateY(-9px) rotate(-2deg); }
      65% { transform:translateY(-3px) rotate(2deg); }
    }
    @keyframes pet-boop {
      0%,100% { transform:scale(1); }
      35% { transform:scale(.95) rotate(-3deg); }
      70% { transform:scale(1.02); }
    }
    @keyframes pet-tickle {
      0%,100% { transform:rotate(0); }
      20%,60% { transform:rotate(-4deg); }
      40%,80% { transform:rotate(4deg); }
    }
    @keyframes pet-sleep {
      0%,100% { transform:translateY(0); }
      50% { transform:translateY(3px) rotate(-2deg); }
    }
    #petFeedbackBubble {
      position:fixed;
      z-index:150;
      width:max-content;
      max-width:min(290px, calc(100vw - 24px));
      padding:13px 16px;
      border:1px solid var(--line, #ecdfdf);
      border-radius:17px 17px 6px 17px;
      background:var(--paper, #fffefd);
      color:var(--ink, #4a383d);
      font:14px/1.8 var(--font, sans-serif);
      box-shadow:0 5px 18px #50304012;
      pointer-events:none;
    }
    #petFeedbackBubble[hidden] {
      display:none;
    }
    .pet-floating-mark {
      position:fixed;
      z-index:151;
      pointer-events:none;
      color:var(--accent, #a64f70);
      font:700 23px/1 "Nunito", sans-serif;
      animation:pet-float 1.15s ease-out forwards;
    }
    @keyframes pet-float {
      from {
        opacity:1;
        transform:translate(-50%,0) scale(.8);
      }
      to {
        opacity:0;
        transform:translate(-50%,-65px) scale(1.15);
      }
    }
    @media(prefers-reduced-motion:reduce) {
      .pet-motion-soft,
      .pet-motion-hop,
      .pet-motion-boop,
      .pet-motion-tickle,
      .pet-motion-sleep {
        animation:none;
      }
      .pet-floating-mark {
        animation:none;
      }
    }
  `;
  document.head.append(style);
  const bubble = document.createElement("div");
  bubble.id = "petFeedbackBubble";
  bubble.hidden = true;
  bubble.setAttribute("role", "status");
  bubble.setAttribute("aria-live", "polite");
  document.body.append(bubble);
  const motions = [
    "pet-motion-soft",
    "pet-motion-hop",
    "pet-motion-boop",
    "pet-motion-tickle",
    "pet-motion-sleep"
  ];
  function pickMessage(mood) {
    const list = dialogue[mood];
    return say(...list[Math.floor(Math.random() * list.length)]);
  }
  /*
   * 以 SVG 座標判斷部位。
   * 包含 preserveAspectRatio 產生的留白修正。
   */
  function rabbitPoint(rabbit, clientX, clientY) {
    const rect = rabbit.getBoundingClientRect();
    const scale = Math.min(rect.width / 240, rect.height / 220);
    if (!scale) return null;
    const offsetX = (rect.width - 240 * scale) / 2;
    const offsetY = (rect.height - 220 * scale) / 2;
    return {
      x:(clientX - rect.left - offsetX) / scale,
      y:(clientY - rect.top - offsetY) / scale
    };
  }
  function bodyPart(rabbit, x, y) {
    const point = rabbitPoint(rabbit, x, y);
    if (!point) return null;
    const {x:px, y:py} = point;
    // 不讓點到插畫外面的空白也觸發摸摸。
    if (px < 37 || px > 205 || py < 17 || py > 203) return null;
    if (Math.hypot((px - 102) / 16, (py - 130) / 14) <= 1) {
      return "nose";
    }
    if (py < 145 && px < 163) return "head";
    if (py >= 140 && px > 58) return "body";
    return null;
  }
  /*
   * 保留原本的記帳表情。
   * 摸摸結束後移除臨時表情，恢復原狀。
   */
  function restoreFace(rabbit) {
    const previous = faces.get(rabbit);
    if (!previous) return;
    clearTimeout(previous.timer);
    previous.hidden.forEach(item => {
      if (item.value === null) {
        item.element.removeAttribute("visibility");
      } else {
        item.element.setAttribute("visibility", item.value);
      }
    });
    previous.overlay.remove();
    rabbit.classList.remove(...motions);
    faces.delete(rabbit);
  }
  function changeFace(rabbit, mood) {
    restoreFace(rabbit);
    const hidden = [];
    const hide = element => {
      hidden.push({
        element,
        value:element.getAttribute("visibility")
      });
      element.setAttribute("visibility", "hidden");
    };
    // 暫時隱藏原有眼睛、高光和嘴巴。
    [...rabbit.children].forEach(element => {
      const tag = element.tagName.toLowerCase();
      const x = Number(element.getAttribute("cx"));
      const y = Number(element.getAttribute("cy"));
      const d = element.getAttribute("d") || "";
      const originalEye =
        tag === "ellipse" &&
        [83,120].includes(x) &&
        y === 114;
      const highlight =
        tag === "circle" &&
        [84,121].includes(x) &&
        y === 112;
      const curvedEyes =
        tag === "path" &&
        /^M77 116/.test(d);
      const mouthPath =
        tag === "path" &&
        /^(M95 135|M96 140|M102 131)/.test(d);
      const roundMouth =
        tag === "ellipse" &&
        x === 102 &&
        y === 139;
      if (
        originalEye ||
        highlight ||
        curvedEyes ||
        mouthPath ||
        roundMouth
      ) {
        hide(element);
      }
    });
    const expressions = {
      enjoy: {
        eyes:'<path d="M77 115q6 6 12 0m25 0q6 6 12 0"/>',
        mouth:'<path d="M97 137q5 5 10 0"/>'
      },
      happy: {
        eyes:'<path d="M77 116q6-10 12 0m25 0q6-10 12 0"/>',
        mouth:'<path d="M96 136q6 12 12 0Z" fill="#bd7c8e"/>'
      },
      angry: {
  eyes: `
    <path d="m76 103 14 6m23 0 14-6"
      stroke-width="3"/>
    <path d="M78 116h10m27 0h10"
      stroke-width="2.8"/>
  `,
  mouth: `
    <ellipse cx="87" cy="137" rx="8" ry="6"
      fill="#efb0b9" stroke="none" opacity=".8"/>
    <ellipse cx="117" cy="137" rx="8" ry="6"
      fill="#efb0b9" stroke="none" opacity=".8"/>
    <path d="M97 141q5-6 10 0"/>
    <path d="M144 89v9m-5-5h10m-7-9 5 5"
      stroke="#ba5269" stroke-width="2"/>
  `
},
      shy: {
        eyes:'<path d="M78 114q5 5 10 0m27 0q5 5 10 0"/>',
        mouth:'<path d="M98 138q4 4 8 0"/>'
      },
      surprised: {
        eyes:`
          <ellipse cx="83" cy="114" rx="5" ry="7" fill="#382b26"/>
          <ellipse cx="120" cy="114" rx="5" ry="7" fill="#382b26"/>
          <circle cx="84" cy="112" r="1.6" fill="white" stroke="none"/>
          <circle cx="121" cy="112" r="1.6" fill="white" stroke="none"/>
        `,
        mouth:'<ellipse cx="102" cy="139" rx="3.5" ry="4.5" fill="#805b61"/>'
      },
      cuddle: {
        eyes:`
          <ellipse cx="83" cy="114" rx="4.5" ry="6" fill="#382b26"/>
          <ellipse cx="120" cy="114" rx="4.5" ry="6" fill="#382b26"/>
          <circle cx="84" cy="112" r="1.7" fill="white" stroke="none"/>
          <circle cx="121" cy="112" r="1.7" fill="white" stroke="none"/>
        `,
        mouth:'<path d="M96 137q6 7 12 0"/>'
      },
      tickle: {
        eyes:'<path d="m78 109 9 6-9 5m47-11-9 6 9 5"/>',
        mouth:'<path d="M94 135q8 18 16 0Z" fill="#bd7c8e"/>'
      },
      sleepy: {
        eyes:'<path d="M77 116q6 3 12 0m25 0q6 3 12 0"/>',
        mouth:'<ellipse cx="102" cy="139" rx="3" ry="2" fill="#946b71"/>'
      },
      cheeky: {
        eyes:`
          <path d="M77 115q6-9 12 0"/>
          <ellipse cx="120" cy="114" rx="3.7" ry="4.8" fill="#382b26"/>
          <circle cx="121" cy="112" r="1.2" fill="white" stroke="none"/>
        `,
        mouth:'<path d="M96 137q6 7 12-1"/>'
      }
    };
    const expression = expressions[mood];
    const overlay = document.createElementNS(NS, "g");
    overlay.setAttribute("data-pet-face", "");
    overlay.setAttribute("pointer-events", "none");
    overlay.innerHTML = `
      <g fill="none"
        stroke="#654c48"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
        ${expression.eyes}
        ${expression.mouth}
      </g>
      ${["shy","cuddle","tickle"].includes(mood) ? `
        <ellipse cx="74" cy="127" rx="10" ry="5"
          fill="#e998ad" opacity=".7"/>
        <ellipse cx="130" cy="127" rx="10" ry="5"
          fill="#e998ad" opacity=".7"/>
      ` : ""}
    `;
    rabbit.append(overlay);
    const duration = mood === "sleepy" ? 4500 : 3000;
    faces.set(rabbit, {
      hidden,
      overlay,
      timer:setTimeout(() => restoreFace(rabbit), duration)
    });
  }
  function floatingMarks(rabbit, mood, x, y) {
    const parent = rabbit.closest("dialog") || document.body;
    const marks = mood === "angry"
  ? ["💢", "!", "💢"]
  : mood === "sleepy"
    ? ["z", "z", "Z"]
    : mood === "surprised"
      ? ["!", "♡"]
      : ["♥", "♡", "♥"];
    marks.forEach((mark, index) => {
      setTimeout(() => {
        if (!rabbit.isConnected) return;
        if (parent instanceof HTMLDialogElement && !parent.open) return;
        const element = document.createElement("span");
        element.className = "pet-floating-mark";
        element.textContent = mark;
        element.setAttribute("aria-hidden", "true");
        element.style.left = `${x + (index - 1) * 17}px`;
        element.style.top = `${y - 8 - index * 5}px`;
        parent.append(element);
        setTimeout(() => element.remove(), 1200);
      }, index * 130);
    });
  }
  function showBubble(rabbit, message, x, y) {
    const parent = rabbit.closest("dialog") || document.body;
    parent.append(bubble);
    bubble.textContent = message;
    bubble.hidden = false;
    const width = bubble.offsetWidth;
    const height = bubble.offsetHeight;
    bubble.style.left = `${
      Math.max(12, Math.min(
        x - width / 2,
        window.innerWidth - width - 12
      ))
    }px`;
    // 上方放不下時，移到手指下方。
    const preferredTop = y - height - 28;
    bubble.style.top = `${
      Math.max(12, Math.min(
        preferredTop >= 12 ? preferredTop : y + 25,
        window.innerHeight - height - 12
      ))
    }px`;
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.hidden = true;
    }, 3800);
  }
  function respond(rabbit, mood, x, y, force=false) {
    const now = Date.now();
    if (!force && now - lastReactionTime < 650) return;
    if (now - lastPetTime > 15000) affection = 0;
    affection++;
    lastPetTime = now;
    lastReactionTime = now;
    // 摸久一點才出現傲嬌，不覆蓋鼻子和搔癢等明確動作。
    if (
      affection >= 7 &&
      ["happy","enjoy","cuddle"].includes(mood)
    ) {
      mood = "cheeky";
      affection = 0;
    }
    changeFace(rabbit, mood);
    rabbit.classList.remove(...motions);
    void rabbit.getBoundingClientRect();
    const motion =
      mood === "tickle" ? "pet-motion-tickle" :
      mood === "surprised" ? "pet-motion-boop" :
      mood === "sleepy" ? "pet-motion-sleep" :
      mood === "happy" ? "pet-motion-hop" :
      "pet-motion-soft";
    rabbit.classList.add(motion);
    floatingMarks(rabbit, mood, x, y);
    showBubble(rabbit, pickMessage(mood), x, y);
  }
  function clearGesture() {
    if (gesture) clearTimeout(gesture.holdTimer);
    gesture = null;
  }
  document.addEventListener("pointerdown", event => {
    if (!event.isPrimary || event.button !== 0) return;
    const rabbit = event.target.closest("svg.rabbit");
    if (!rabbit) return;
    // 不干擾首次領養和品種選擇。
    if (rabbit.closest(
      "button, a, .pet-grid, .petgrid, .onboarding"
    )) return;
    const part = bodyPart(
      rabbit,
      event.clientX,
      event.clientY
    );
    if (!part) return;
    clearGesture();
    gesture = {
      rabbit,
      pointerId:event.pointerId,
      part,
      startX:event.clientX,
      startY:event.clientY,
      lastX:event.clientX,
      lastY:event.clientY,
      direction:0,
      reversals:0,
      distance:0,
      moved:false,
      held:false,
      lastXForHold:event.clientX,
      lastYForHold:event.clientY,
      holdTimer:null
    };
    const current = gesture;
    current.holdTimer = setTimeout(() => {
      if (gesture !== current || current.moved) return;
      current.held = true;
      respond(
        rabbit,
        "sleepy",
        current.lastX,
        current.lastY,
        true
      );
    }, 900);
  });
  document.addEventListener("pointermove", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = gesture;
    if (!current.rabbit.isConnected) {
      clearGesture();
      return;
    }
    const dx = event.clientX - current.lastX;
    const dy = event.clientY - current.startY;
    // 保留手機垂直捲動。
    if (Math.abs(dy) > 30) {
      clearGesture();
      return;
    }
    const movement = Math.hypot(
      event.clientX - current.startX,
      event.clientY - current.startY
    );
    if (movement > 9) {
      current.moved = true;
      clearTimeout(current.holdTimer);
    }
    if (Math.abs(dx) >= 3) {
      const direction = Math.sign(dx);
      if (
        current.direction &&
        current.direction !== direction
      ) {
        current.reversals++;
      }
      current.direction = direction;
      current.distance += Math.abs(dx);
    }
    current.lastX = event.clientX;
    current.lastY = event.clientY;
    const part = bodyPart(
      current.rabbit,
      event.clientX,
      event.clientY
    );
    if (!part) return;
    if (
      part === "body" &&
      current.reversals >= 3 &&
      current.distance >= 45
    ) {
      respond(
        current.rabbit,
        "tickle",
        event.clientX,
        event.clientY
      );
      current.reversals = 0;
      current.distance = 0;
      return;
    }
    if (current.distance >= 28) {
      respond(
        current.rabbit,
        part === "head" ? "enjoy" : "cuddle",
        event.clientX,
        event.clientY
      );
      current.distance = 0;
    }
  });
  document.addEventListener("pointerup", event => {
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    const current = gesture;
    clearGesture();
    if (current.held || current.moved) return;
    const part = bodyPart(
      current.rabbit,
      event.clientX,
      event.clientY
    );
    if (!part) return;
    const now = Date.now();
    // 同一隻兔子，兩秒內輕點五次就會炸毛。
// 左右撫摸和長按不計入。
rapidTaps = rapidTaps.filter(tap =>
  tap.rabbit === current.rabbit &&
  now - tap.time < 2000
);
rapidTaps.push({
  rabbit: current.rabbit,
  time: now
});
if (rapidTaps.length >= 5) {
  rapidTaps = [];
  previousTap = null;
  respond(
    current.rabbit,
    "angry",
    event.clientX,
    event.clientY,
    true
  );
  return;
}
    const doubleTap =
      previousTap &&
      previousTap.rabbit === current.rabbit &&
      now - previousTap.time < 420;
    previousTap = {
      rabbit:current.rabbit,
      time:now
    };
    const mood = doubleTap
      ? "shy"
      : part === "nose"
        ? "surprised"
        : part === "head"
          ? "enjoy"
          : "happy";
    respond(
      current.rabbit,
      mood,
      event.clientX,
      event.clientY,
      doubleTap
    );
    if (doubleTap) previousTap = null;
  });
  document.addEventListener("pointercancel", clearGesture);
  window.addEventListener("blur", clearGesture);
  window.addEventListener("scroll", () => {
    bubble.hidden = true;
    clearGesture();
  }, {passive:true});
})();