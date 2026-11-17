"use strict";

(() => {
  if (window.__bunnyGamesEntry) return;
  window.__bunnyGamesEntry = true;

  if (document.body.dataset.page !== "home") return;

  function text(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    return lang.startsWith("en") ? en :
      lang.includes("hans") || lang === "zh-cn" ? sc : tc;
  }

  const style = document.createElement("style");

  style.textContent = `
    .bh-actions .games-call-group {
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
    }

    .bh-actions .games-entry {
      position:absolute;
      top:calc(100% + 5px);
      right:0;
      display:flex;
      align-items:center;
      justify-content:center;
      gap:5px;
      min-width:84px;
      min-height:35px;
      padding:5px 9px;
      border:1px solid #ffffffaa;
      border-radius:12px;
      background:var(--paper,#fffefd);
      color:var(--accent,#a64f70);
      text-decoration:none;
      white-space:nowrap;
      font:700 12px/1.4 var(--font,sans-serif);
      z-index:6;
    }

    .games-entry svg {
      width:24px;
      height:23px;
      flex-shrink:0;
    }

    .games-entry:focus-visible {
      outline:3px solid var(--accent,#a64f70);
      outline-offset:3px;
    }

    @media(max-width:760px) {
      body[data-page="home"]
      .hero.bh-open > div:first-child > h1 {
        margin-top:36px !important;
      }
    }
  `;

  document.head.append(style);

  function mount() {
  const actions = document.querySelector(".hero .bh-actions");
  const call = actions?.querySelector('[data-bh-action="call"]');

  if (!actions || !call) return;

  /*
   * 清除舊入口並拆開包裝。
   * 四個互動按鈕全部保留。
   */
  actions.querySelectorAll(".run-entry").forEach(link => {
    link.remove();
  });

  actions.querySelectorAll(
    ".run-call-group, .games-call-group"
  ).forEach(group => {
    group.replaceWith(...group.childNodes);
  });

  let link = actions.querySelector(".games-entry");

  if (!link) {
    link = document.createElement("a");
    link.className = "games-entry";
    link.href = "games.html";

    link.innerHTML = `
      <svg viewBox="0 0 44 40" aria-hidden="true">
        <path d="M16 14Q8-2 15 2q5 3 6 12
          M25 14Q26-2 33 2q4 5-2 13"
          fill="#fff9ef"
          stroke="#a07587"
          stroke-width="1.5"/>

        <path d="M12 15h20q6 0 8 12l1 5
          q0 7-6 4l-7-5H16l-7 5
          q-6 3-6-4l1-5q2-12 8-12Z"
          fill="#efc0d3"
          stroke="#a07587"
          stroke-width="1.6"/>

        <path d="M11 24h8m-4-4v8"
          stroke="#89526a"
          stroke-width="2"
          stroke-linecap="round"/>

        <circle cx="30" cy="22" r="2" fill="#fff7ed"/>
        <circle cx="34" cy="27" r="2" fill="#b97a97"/>
      </svg>
      <span></span>
    `;

    actions.append(link);
  }

  const label = text("遊戲區", "游戏区", "Games");

  if (link.querySelector("span").textContent !== label) {
    link.querySelector("span").textContent = label;
  }

  link.setAttribute("aria-label", label);
}


  /*
   * 從首頁進入遊戲區時保存兔兔外觀。
   * 跑酷仍使用原本的 sessionStorage 名稱。
   */
  document.addEventListener("click", event => {
    if (!event.target.closest(".games-entry")) return;

    try {
      sessionStorage.setItem(
        "bunny-games-language",
        document.documentElement.lang
      );
    } catch {}

    const original = document.querySelector(
      ".hero [data-bh-pet], .hero > svg.rabbit"
    );

    if (!original) return;

    try {
      const copy = original.cloneNode(true);

      copy.querySelectorAll(
        "[data-real-sleep],[data-bh-face],[data-bp-tier]," +
        "[data-pet-face],[data-run-face]"
      ).forEach(element => element.remove());

      copy.querySelectorAll("*").forEach(element => {
        element.removeAttribute("visibility");
        element.removeAttribute("class");
        element.removeAttribute("style");
      });

      copy.querySelectorAll("[data-bh-ears]").forEach(element => {
        element.removeAttribute("transform");
      });

      [...copy.children].forEach(element => {
        const tag = element.localName;
        const x = Number(element.getAttribute("cx"));
        const y = Number(element.getAttribute("cy"));
        const d = (element.getAttribute("d") || "").trim();

        const eye = tag === "ellipse" &&
          [83,120].includes(x) && [113,114].includes(y);

        const shine = tag === "circle" &&
          [84,121].includes(x) && [111,112].includes(y);

        const mouth = tag === "ellipse" && x === 102 && y === 139;

        const facePath = tag === "path" &&
          /^(M77 116|M95 135|M96 140|M102 131|m77 102)/i.test(d);

        const shadow = tag === "ellipse" && y === 204;

        if (eye || shine || mouth || facePath || shadow) {
          element.remove();
        }
      });

      ["class","style","id","visibility","transform"]
        .forEach(name => copy.removeAttribute(name));

      copy.setAttribute("xmlns","http://www.w3.org/2000/svg");
      copy.setAttribute("viewBox","0 0 240 220");
      copy.setAttribute("width","480");
      copy.setAttribute("height","440");

      const face = document.createElementNS(
        "http://www.w3.org/2000/svg","g"
      );
      face.setAttribute("data-run-face","");
      copy.append(face);

      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent").trim() || "#a64f70";

      const source = new XMLSerializer()
        .serializeToString(copy)
        .replace(/var\(--accent(?:,[^)]+)?\)/g,accent);

      sessionStorage.setItem("bunny-run-home-appearance",source);
    } catch (error) {
      console.error("保存遊戲兔兔外觀：",error);
    }
  },true);

  let scheduled = false;

  const observer = new MutationObserver(changes => {
    const relevant = changes.some(change =>
      [...change.addedNodes].some(node =>
        node.nodeType === 1 && (
          node.matches?.(".bh-stage,.bh-actions") ||
          node.querySelector?.(".bh-stage,.bh-actions")
        )
      )
    );

    if (!relevant || scheduled) return;

    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      mount();
    });
  });

  observer.observe(document.body,{childList:true,subtree:true});
  mount();
})();
