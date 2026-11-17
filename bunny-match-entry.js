"use strict";

(() => {
  if (window.__bunnyMatchEntry) return;
  window.__bunnyMatchEntry = true;

  if (document.body.dataset.page !== "home") return;

  const style = document.createElement("style");

  style.textContent = `
    .run-call-group .run-entry.match-entry {
      top:calc(100% + 43px);
    }

    .match-entry .match-mini {
      display:grid;
      grid-template-columns:repeat(2,8px);
      gap:2px;
      width:19px;
      flex-shrink:0;
    }

    .match-mini i {
      width:8px;
      height:8px;
      border-radius:3px;
      background:#dfa7bc;
      border:1px solid #ba819a;
    }

    .match-mini i:nth-child(2),
    .match-mini i:nth-child(3) {
      background:#ead4ac;
      border-color:#bba07c;
    }

    /* 兩個遊戲入口需要的空間只留在頂部操作區。 */
    @media(max-width:760px) {
      body[data-page="home"]
      .hero.bh-open > div:first-child > h1 {
        margin-top:72px !important;
      }
    }
  `;

  document.head.append(style);

  function mount() {
    const group = document.querySelector(".run-call-group");
    if (!group || group.querySelector(".match-entry")) return;

    const link = document.createElement("a");
    link.className = "run-entry match-entry";
    link.href = "bunny-match.html";
    link.setAttribute("aria-label", "消消兔，五十關兔兔三消遊戲");

    link.innerHTML = `
      <span class="match-mini" aria-hidden="true">
        <i></i><i></i><i></i><i></i>
      </span>
      <span>消消兔</span>
    `;

    group.append(link);
  }

  let scheduled = false;

  const observer = new MutationObserver(changes => {
    const relevant = changes.some(change =>
      [...change.addedNodes].some(node =>
        node.nodeType === 1 && (
          node.matches?.(".run-call-group,.bh-stage,.bh-actions") ||
          node.querySelector?.(".run-call-group,.bh-stage,.bh-actions")
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

  observer.observe(document.body, {
    childList:true,
    subtree:true
  });

  mount();
})();
