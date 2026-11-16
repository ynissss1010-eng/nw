"use strict";

(() => {
  if (window.__bunnyPolish) return;
  window.__bunnyPolish = true;

  const NS = "http://www.w3.org/2000/svg";
  const records = new WeakMap();
  const initialized = new WeakSet();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  let drag = null;
  let scheduled = false;

  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    return lang.startsWith("en") ? en :
      lang.includes("hans") || lang === "zh-cn" ? sc : tc;
  }

  function svgNode(name, attributes = {}) {
    const node = document.createElementNS(NS, name);
    Object.entries(attributes).forEach(([key, value]) => {
      node.setAttribute(key, String(value));
    });
    return node;
  }

  const style = document.createElement("style");

  style.textContent = `
    /* 互動圖標直接放在原本粉色卡片右上方。 */
    .hero.bh-open {
      position:relative;
      padding-top:79px;
    }

    .hero.bh-open .bh-actions {
      position:absolute;
      top:17px;
      right:22px;
      display:flex;
      align-items:center;
      gap:9px;
      margin:0;
      z-index:4;
    }

    .hero.bh-open .bh-actions button {
      position:relative;
      display:grid;
      place-items:center;
      width:49px;
      height:49px;
      min-height:49px;
      padding:4px;
      border:0;
      border-radius:50%;
      background:transparent;
      transition:background .15s ease, transform .15s ease;
    }

    .hero.bh-open .bh-actions button:hover,
    .hero.bh-open .bh-actions button:focus-visible {
      background:#fff9;
      transform:translateY(-3px) rotate(-5deg);
    }

    .hero.bh-open .bh-actions button svg {
      width:40px;
      height:40px;
      display:block;
    }

    .hero.bh-open .bh-actions button::after {
      content:attr(data-caption);
      position:absolute;
      top:calc(100% + 5px);
      left:50%;
      transform:translateX(-50%);
      padding:4px 9px;
      border-radius:8px;
      background:var(--paper,#fffefd);
      color:var(--ink,#4a383d);
      font:12px/1.5 var(--font,sans-serif);
      white-space:nowrap;
      opacity:0;
      visibility:hidden;
      pointer-events:none;
    }

    .hero.bh-open .bh-actions button:hover::after,
    .hero.bh-open .bh-actions button:focus-visible::after {
      opacity:1;
      visibility:visible;
    }

    .hero.bh-open .bh-stage {
      position:static;
    }

    .hero.bh-open .bh-world {
      overflow:visible;
      touch-action:none;
    }

    .hero.bh-open [data-bh-pet] {
      touch-action:none;
      cursor:grab;
    }

    .hero.bh-open [data-bh-pet]:active {
      cursor:grabbing;
    }

    .bpolish-trails,
    .bpolish-hand {
      pointer-events:none;
    }

    .bpolish-trail {
      fill:none;
      stroke:#d76695;
      stroke-width:5;
      stroke-linecap:round;
      stroke-linejoin:round;
      opacity:.55;
    }

    .bpolish-trail-light {
      fill:none;
      stroke:#fff9f0;
      stroke-width:1.5;
      stroke-linecap:round;
      stroke-linejoin:round;
      opacity:.85;
    }

    .bpolish-heart {
      fill:#ca5d89;
      stroke:#fff4f7;
      stroke-width:1;
    }

    .bpolish-ear {
      transform-box:view-box;
      transform-origin:106px 93px;
      animation:bpolish-ear 3.6s ease-in-out infinite;
    }

    .bpolish-nose {
      transform-box:fill-box;
      transform-origin:center;
      animation:bpolish-nose 2.8s ease-in-out infinite;
    }

    @keyframes bpolish-ear {
      0%,65%,100% { transform:rotate(0); }
      72% { transform:rotate(-3deg); }
      79% { transform:rotate(2deg); }
      86% { transform:rotate(-1deg); }
    }

    @keyframes bpolish-nose {
      0%,75%,100% { transform:scale(1); }
      80%,90% { transform:scale(1.14,.88); }
      85%,95% { transform:scale(.94,1.05); }
    }

    @media(max-width:760px) {
      .hero.bh-open {
        padding-top:78px;
      }

      .hero.bh-open .bh-actions {
        top:14px;
        right:14px;
        gap:7px;
      }

      .hero.bh-open .bh-actions button {
        width:46px;
        height:46px;
        min-height:46px;
      }

      .hero.bh-open .bh-actions button svg {
        width:38px;
        height:38px;
      }

      .hero.bh-open .bh-line {
        margin-top:-2px;
      }
    }

    @media(prefers-reduced-motion:reduce) {
      .bpolish-ear,
      .bpolish-nose {
        animation:none;
      }

      .hero.bh-open .bh-actions button {
        transition:none;
      }
    }
  `;

  document.head.append(style);

  /* 全部使用同一套卡通線條，不使用 emoji 字體。 */
  const icons = {
    ball: `
      <circle cx="24" cy="25" r="16"
        fill="#e9a6bf" stroke="#9e617c" stroke-width="1.7"/>
      <path d="M9 25h30M24 10v30"
        stroke="#fff8ef" stroke-width="6"/>
      <path d="M14 14q10 7 20 20M14 35q10-7 20-20"
        fill="none" stroke="#bf7e9c" stroke-width="1.2"/>
      <ellipse cx="18" cy="16" rx="4" ry="2"
        fill="white" opacity=".6" transform="rotate(-30 18 16)"/>
    `,
    brush: `
      <g transform="rotate(-28 24 24)">
        <rect x="12" y="9" width="24" height="22" rx="9"
          fill="#d0acc8" stroke="#89627f" stroke-width="1.7"/>
        <path d="M17 29v7m5-7v9m5-9v9m5-9v7"
          stroke="#89627f" stroke-width="2" stroke-linecap="round"/>
        <path d="M24 10V3"
          stroke="#89627f" stroke-width="7" stroke-linecap="round"/>
        <path d="M19 17h1m8 0h1m-7 6q2 2 4 0"
          fill="none" stroke="#89627f" stroke-width="1.5"
          stroke-linecap="round"/>
      </g>
    `,
    water: `
      <path d="M7 25q2 16 17 16t17-16"
        fill="#cbe6ed" stroke="#7fabb8" stroke-width="1.7"/>
      <ellipse cx="24" cy="25" rx="17" ry="6"
        fill="#a9d8e7" stroke="#7fabb8" stroke-width="1.7"/>
      <path d="M14 25q10 4 20 0"
        fill="none" stroke="#f7ffff" stroke-width="1.8"/>
      <path d="M24 5q-9 10 0 13q9-3 0-13Z"
        fill="#b8dfe9" stroke="#7fabb8" stroke-width="1.3"/>
      <path d="M19 34h1m8 0h1"
        stroke="#7195a0" stroke-width="2" stroke-linecap="round"/>
    `,
    call: `
      <path d="M17 22Q9 2 15 3q7 0 8 17
        M27 20Q29 2 35 4q5 3-3 19"
        fill="#fff9ef" stroke="#a4777b" stroke-width="1.5"/>
      <ellipse cx="24" cy="30" rx="15" ry="12"
        fill="#fff9ef" stroke="#a4777b" stroke-width="1.5"/>
      <path d="M17 29q2-3 4 0m6 0q2-3 4 0m-10 6q3 3 6 0"
        fill="none" stroke="#79545d" stroke-width="1.6"
        stroke-linecap="round"/>
      <ellipse cx="14" cy="33" rx="3" ry="1.8" fill="#eab2bf"/>
      <ellipse cx="34" cy="33" rx="3" ry="1.8" fill="#eab2bf"/>
      <path d="m40 16 4-3m-3 10h5"
        stroke="#bf7994" stroke-width="2" stroke-linecap="round"/>
    `
  };

  function setIcons(stage) {
    const captions = {
      ball:say("追波波","追球球","Play ball"),
      brush:say("梳毛毛","梳毛毛","Groom"),
      water:say("飲啖水","喝口水","Water"),
      call:say("叫兔兔","叫兔兔","Call bunny")
    };

    stage.querySelectorAll("[data-bh-action]").forEach(button => {
      const key = button.dataset.bhAction;
      if (!icons[key]) return;

      const caption = captions[key];

      if (button.dataset.polishIcon !== key) {
        button.innerHTML = `
          <svg viewBox="0 0 48 48" aria-hidden="true">
            ${icons[key]}
          </svg>`;
        button.dataset.polishIcon = key;
      }

      button.dataset.caption = caption;
      button.setAttribute("aria-label",caption);
      button.title = caption;
    });

    const touch = stage.querySelector("[data-bh-touch]");

    if (touch) {
      const caption = say(
        "♡ 按住拖動，輕輕摸我呀",
        "♡ 按住拖动，轻轻摸摸我",
        "♡ Hold and drag to pet me"
      );

      if (touch.textContent !== caption) {
        touch.textContent = caption;
      }
    }
  }

  function initializeStage(stage) {
    setIcons(stage);

    if (initialized.has(stage)) return;

    const actor = stage.querySelector("[data-bh-pet]");
    const world = stage.querySelector(".bh-world");
    if (!actor || !world) return;

    initialized.add(stage);

    /*
     * 放大兔子本身，腳底位置維持不變。
     * 外層移動和轉身動畫仍由 bunny-play.js 控制。
     */
    const large = svgNode("g", {
      transform:"translate(-30 -51.25) scale(1.25)",
      "data-polish-large":""
    });

    actor.parentNode.insertBefore(large,actor);
    large.append(actor);

    // 用額外一層包住耳朵，與原本耳朵動畫疊加。
    const ears = actor.querySelector("[data-bh-ears]");
    if (ears) {
      const group = svgNode("g", {class:"bpolish-ear"});
      ears.parentNode.insertBefore(group,ears);
      group.append(ears);
    }

    [...actor.children].forEach(element => {
      const path = element.getAttribute("d") || "";
      if (/^M97 127/.test(path)) {
        element.classList.add("bpolish-nose");
      }
    });

    const trails = svgNode("g", {
      class:"bpolish-trails",
      "pointer-events":"none",
      "aria-hidden":"true"
    });

    const hand = svgNode("g", {
      class:"bpolish-hand",
      opacity:"0",
      "pointer-events":"none",
      "aria-hidden":"true"
    });

    hand.innerHTML = `
      <g transform="translate(-10 -4) scale(.8)">
        <path d="M9 23V8q0-5 4-5t4 5v10
          V5q0-5 4-5t4 5v13
          V7q0-4 4-4t4 4v13
          V12q0-4 4-4t4 4v17
          q0 15-14 15h-3q-8 0-13-8L3 27
          q-3-5 1-7q3-1 5 3Z"
          fill="#fff5e8" stroke="#a47b70"
          stroke-width="1.7" stroke-linejoin="round"/>
        <path d="M16 29q8 5 15 0"
          fill="none" stroke="#e3b7ae"
          stroke-width="2" stroke-linecap="round"/>
      </g>`;

    world.append(trails,hand);
    records.set(stage,{world,trails,hand});
  }

  function scan() {
    document.querySelectorAll(".hero.bh-open .bh-stage")
      .forEach(initializeStage);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  function localPoint(world,event) {
    try {
      const matrix = world.getScreenCTM();
      if (!matrix) return null;

      const point = world.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;

      return point.matrixTransform(matrix.inverse());
    } catch {
      return null;
    }
  }

  function fade(element,duration=650) {
    if (!element?.isConnected) return;

    if (typeof element.animate !== "function" || reduced.matches) {
      setTimeout(() => element.remove(),duration);
      return;
    }

    const animation = element.animate(
      [{opacity:1},{opacity:0}],
      {duration,easing:"ease-out",fill:"forwards"}
    );

    animation.onfinish = () => element.remove();
  }

  function addHeart(current,point) {
    const heart = svgNode("path", {
      class:"bpolish-heart",
      d:"M0 5l-5-5a3 3 0 0 1 5-4a3 3 0 0 1 5 4Z",
      transform:`translate(${point.x+12} ${point.y-15})`,
      "pointer-events":"none"
    });

    current.data.trails.append(heart);

    if (typeof heart.animate === "function" && !reduced.matches) {
      const animation = heart.animate(
        [
          {opacity:1,transform:"translateY(0)"},
          {opacity:0,transform:"translateY(-25px)"}
        ],
        {duration:900,easing:"ease-out",fill:"forwards"}
      );
      animation.onfinish = () => heart.remove();
    } else {
      setTimeout(() => heart.remove(),700);
    }
  }

  function beginSegment(current,point) {
    const group = svgNode("g");
    const path = svgNode("path",{class:"bpolish-trail"});
    const light = svgNode("path",{class:"bpolish-trail-light"});

    group.append(path,light);
    current.data.trails.append(group);

    current.segment = {
      group,path,light,
      points:[point],
      born:performance.now()
    };
  }

  function updateSegment(current,point) {
    const segment = current.segment;
    const previous = segment.points[segment.points.length-1];

    if (Math.hypot(point.x-previous.x,point.y-previous.y)<2) return;

    segment.points.push(point);

    let d = `M${segment.points[0].x} ${segment.points[0].y}`;

    for (let i=1;i<segment.points.length;i++) {
      const a=segment.points[i-1];
      const b=segment.points[i];
      const mx=(a.x+b.x)/2;
      const my=(a.y+b.y)/2;
      d+=` Q${a.x} ${a.y} ${mx} ${my}`;
    }

    d+=` L${point.x} ${point.y}`;

    segment.path.setAttribute("d",d);
    segment.light.setAttribute("d",d);

    // 長時間撫摸分成短軌跡，避免線條越畫越多。
    if (
      performance.now()-segment.born>350 ||
      segment.points.length>30
    ) {
      fade(segment.group,650);
      beginSegment(current,point);
    }
  }

  function finishDrag() {
    if (!drag) return;

    const current=drag;
    drag=null;

    current.data.hand.setAttribute("opacity","0");

    if (current.segment) {
      fade(current.segment.group,700);
    }

    try {
      if (current.data.world.hasPointerCapture(current.id)) {
        current.data.world.releasePointerCapture(current.id);
      }
    } catch {}
  }

  document.addEventListener("pointerdown",event => {
    if (!event.isPrimary || event.button!==0) return;

    const actor=event.target.closest?.("[data-bh-pet]");
    const stage=actor?.closest(".bh-stage");
    const data=stage && records.get(stage);

    if (!data) return;

    const actions=stage.querySelector("[data-bh-action]");
    if (actions?.disabled) return;

    const point=localPoint(data.world,event);
    if (!point) return;

    finishDrag();

    drag={
      id:event.pointerId,
      stage,
      data,
      segment:null,
      lastHeart:0
    };

    beginSegment(drag,point);
    data.hand.setAttribute("opacity","1");
    data.hand.setAttribute("transform",`translate(${point.x} ${point.y})`);

    /*
     * Capture 階段不改事件目標；
     * 等原本 bunny-play.js 記下 pointerdown 後再捕捉指標。
     */
    queueMicrotask(() => {
      if (drag?.id!==event.pointerId) return;
      try {
        data.world.setPointerCapture(event.pointerId);
      } catch {}
    });
  },true);

  document.addEventListener("pointermove",event => {
    if (!drag || drag.id!==event.pointerId) return;

    if (!drag.stage.isConnected) {
      finishDrag();
      return;
    }

    const point=localPoint(drag.data.world,event);
    if (!point) return;

    if (event.cancelable) event.preventDefault();

    drag.data.hand.setAttribute(
      "transform",`translate(${point.x} ${point.y})`
    );

    updateSegment(drag,point);

    const now=performance.now();

    if (now-drag.lastHeart>320) {
      addHeart(drag,point);
      drag.lastHeart=now;
    }
  },{capture:true,passive:false});

  document.addEventListener("pointerup",event => {
    if (drag?.id===event.pointerId) finishDrag();
  });

  document.addEventListener("pointercancel",finishDrag);
  window.addEventListener("blur",finishDrag);

  function start() {
    if (document.body.dataset.page!=="home") return;

    const observer=new MutationObserver(changes => {
      const relevant=changes.some(change => {
        if (change.type==="attributes") return true;

        return [...change.addedNodes].some(node =>
          node.nodeType===1 && (
            node.matches?.(".bh-stage,[data-bh-pet]") ||
            node.querySelector?.(".bh-stage,[data-bh-pet]")
          )
        );
      });

      if (relevant) schedule();
    });

    observer.observe(document.body,{
      childList:true,
      subtree:true
    });

    observer.observe(document.documentElement,{
      attributes:true,
      attributeFilter:["lang"]
    });

    scan();
  }

  if (document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded",start,{once:true});
  } else {
    start();
  }
})();
