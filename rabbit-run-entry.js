"use strict";

(() => {
  if(window.__bunnyRunEntry) return;
  window.__bunnyRunEntry=true;

  if(document.body.dataset.page!=="home") return;

  const style=document.createElement("style");

  style.textContent=`
    .bh-actions .run-call-group {
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      overflow:visible;
    }

    .bh-actions .run-entry {
      position:absolute;
      top:calc(100% + 4px);
      right:0;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:4px;
      min-width:76px;
      min-height:32px;
      padding:4px 7px;
      border-radius:10px;
      text-decoration:none;
      background:var(--paper,#fffefd);
      color:var(--accent,#a64f70);
      font:700 11px/1.4 var(--font,sans-serif);
      white-space:nowrap;
      z-index:6;
    }

    .run-entry svg {
      width:23px;
      height:23px;
      flex-shrink:0;
    }

    .run-entry:hover {
      background:var(--soft,#fae8ee);
    }

    .run-entry:focus-visible {
      outline:3px solid var(--accent,#a64f70);
      outline-offset:3px;
    }

    /* 入口放在圖標下方，避免壓住上方操作。 */
    @media(max-width:760px) {
      body[data-page="home"]
      .hero.bh-open > div:first-child > h1 {
        margin-top:34px !important;
      }

      .bh-actions .run-entry {
        right:-1px;
      }
    }
  `;

  document.head.append(style);

  function mount() {
    const call=document.querySelector(
      '.bh-actions [data-bh-action="call"]'
    );

    if(!call||call.closest(".run-call-group")) return;

    const group=document.createElement("div");
    group.className="run-call-group";

    call.before(group);
    group.append(call);

    const link=document.createElement("a");
    link.className="run-entry";
    link.href="rabbit-run.html";
    link.setAttribute("aria-label","兔兔快跑，進入跑酷遊戲");

    link.innerHTML=`
      <svg viewBox="0 0 40 35" aria-hidden="true">
        <path d="M22 17Q13 0 20 2q5 3 6 13
          M28 16Q28 0 34 3q4 5-1 15"
          fill="#fff8ed" stroke="#986e78" stroke-width="1.4"/>
        <ellipse cx="20" cy="24" rx="13" ry="8"
          fill="#fff8ed" stroke="#986e78" stroke-width="1.4"/>
        <ellipse cx="29" cy="20" rx="8" ry="7"
          fill="#fff8ed" stroke="#986e78" stroke-width="1.4"/>
        <circle cx="31" cy="19" r="1.3" fill="#79545d"/>
        <path d="M5 19H1m5 6H2m9 6 6-3m10 3 5-3"
          stroke="#bd7995" stroke-width="1.8"
          stroke-linecap="round"/>
      </svg>
      <span>兔兔快跑</span>
    `;

    group.append(link);
  }

  let scheduled=false;

  const observer=new MutationObserver(changes=>{
    if(!changes.some(change=>
      [...change.addedNodes].some(node=>
        node.nodeType===1&&(
          node.matches?.(".bh-stage,.bh-actions")||
          node.querySelector?.(".bh-stage,.bh-actions")
        )
      )
    )) return;

    if(scheduled) return;
    scheduled=true;

    requestAnimationFrame(()=>{
      scheduled=false;
      mount();
    });
  });

  observer.observe(document.body,{childList:true,subtree:true});
  mount();
})();
/* 將首頁兔兔原圖帶進跑酷遊戲 */
(() => {
  const NS = "http://www.w3.org/2000/svg";

  document.addEventListener("click", event => {
    const link = event.target.closest('a[href="rabbit-run.html"]');
    if (!link) return;

    const original = document.querySelector(
      ".hero [data-bh-pet], .hero > svg.rabbit"
    );

    if (!original) {
      event.preventDefault();
      alert("兔兔仲未準備好，請等首頁載入完成再試。");
      return;
    }

    try {
      const copy = original.cloneNode(true);

      // 移除睡姿和互動特效，保留原本身體、耳朵、毛色、配飾。
      copy.querySelectorAll(
        "[data-real-sleep], [data-bh-face], " +
        "[data-bp-tier], [data-pet-face]"
      ).forEach(element => element.remove());

      // 首頁睡覺時會隱藏站姿，帶入遊戲前恢復。
      copy.querySelectorAll("[visibility]").forEach(element => {
        element.removeAttribute("visibility");
      });

      // 清除首頁動畫加入的樣式與旋轉。
      copy.querySelectorAll("*").forEach(element => {
        element.removeAttribute("class");
        element.removeAttribute("style");
      });

      copy.querySelectorAll("[data-bh-ears]").forEach(element => {
        element.removeAttribute("transform");
      });

      // 如果來源是未轉換的首頁原圖，移除舊眼睛和嘴巴。
      [...copy.children].forEach(element => {
        const tag = element.localName;
        const x = Number(element.getAttribute("cx"));
        const y = Number(element.getAttribute("cy"));
        const d = (element.getAttribute("d") || "").trim();

        const eye = tag === "ellipse" &&
          [83, 120].includes(x) && [113, 114].includes(y);

        const shine = tag === "circle" &&
          [84, 121].includes(x) && [111, 112].includes(y);

        const mouth = tag === "ellipse" &&
          x === 102 && y === 139;

        const facePath = tag === "path" &&
          /^(M77 116|M95 135|M96 140|M102 131|m77 102)/i.test(d);

        // 遊戲自己畫地面影子。
        const shadow = tag === "ellipse" && y === 204;

        if (eye || shine || mouth || facePath || shadow) {
          element.remove();
        }
      });

      copy.removeAttribute("class");
      copy.removeAttribute("style");
      copy.removeAttribute("id");
      copy.removeAttribute("visibility");
      copy.removeAttribute("transform");

      copy.setAttribute("xmlns", NS);
      copy.setAttribute("viewBox", "0 0 240 220");
      copy.setAttribute("width", "480");
      copy.setAttribute("height", "440");

      // 遊戲會替這個圖層加入不同表情。
      const face = document.createElementNS(NS, "g");
      face.setAttribute("data-run-face", "");
      copy.append(face);

      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent").trim() || "#a64f70";

      let svg = new XMLSerializer().serializeToString(copy);

      // 獨立圖片不能讀首頁 CSS 變數，因此保存實際配飾顏色。
      svg = svg.replace(
        /var\(--accent(?:,[^)]+)?\)/g,
        accent
      );

      sessionStorage.setItem("bunny-run-home-appearance", svg);
    } catch (error) {
      console.error("保存首頁兔兔外觀失敗：", error);
      event.preventDefault();
      alert("未能帶上兔兔，請重新整理首頁再試。");
    }
  }, true);
})();
