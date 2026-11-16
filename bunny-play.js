"use strict";

(() => {
  if (window.__bunnyOpenHero) return;
  window.__bunnyOpenHero = true;

  const $ = s => document.querySelector(s);
  const NS = "http://www.w3.org/2000/svg";
  const DB_NAME = "bunny-yanice-v5";

  let dbPromise;
  let scene = null;
  let latest = null;
  let busy = false;
  let scheduled = false;
  let polling = false;
  let raf = 0;
  let taps = [];
  let lastFeed = null;
  let eatUntil = 0;
  let faceUntil = 0;
  let mood = "calm";
  let poseX = 145;
  let poseY = 65;
  let facing = 1;
  let lastPet = 0;
  let messageTimer;
  let gesture = null;

  const reduce = matchMedia("(prefers-reduced-motion: reduce)");

  function say(tc, sc, en) {
    const lang = document.documentElement.lang.toLowerCase();
    return lang.startsWith("en") ? en :
      lang.includes("hans") || lang === "zh-cn" ? sc : tc;
  }

  function dateKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  function database() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const r = indexedDB.open(DB_NAME, 1);

        r.onupgradeneeded = () => {
          if (!r.result.objectStoreNames.contains("data")) {
            r.result.createObjectStore("data");
          }
        };

        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    }
    return dbPromise;
  }

  async function read() {
    const db = await database();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("data", "readonly");
      const r = tx.objectStore("data").get("main");
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || Error("Read aborted"));
    });
  }

  /*
   * 只更新互動資料，保留頭像、帳目、草和其他欄位。
   * 摸摸每天最多 +20，正向互動至少相隔 1.2 秒；
   * 梳毛每天首次 +2，連點生氣 -5。
   */
  async function saveAction(action) {
    const db = await database();

    return new Promise((resolve, reject) => {
      const tx = db.transaction("data", "readwrite");
      const store = tx.objectStore("data");
      const r = store.get("main");
      let result = null;
      let failure;

      r.onsuccess = () => {
        try {
          const s = r.result;
          if (!s?.ready) return;

          if (Number(s.rabbitLife?.restUntil) > Date.now()) {
            result = { state:s, delta:0, sleeping:true };
            return;
          }

          s.rabbitCare ||= {
            version:1, grass:0, affection:0, feedCount:0,
            seenEntryIds:[...new Set(s.entries.map(e => e.id))]
          };

          const care = s.rabbitCare;

          if (!Number.isInteger(care.affection) ||
              care.affection < 0 || care.affection > 100) {
            throw Error("Invalid affection");
          }

          s.rabbitPlay ||= { version:1, rewards:{}, calls:0 };
          s.rabbitPlay.rewards ||= {};

          const day = dateKey();
          if (s.rabbitPetting?.day !== day) {
            s.rabbitPetting = { day, gained:0 };
          }

          let requested = 0;

          if (action === "pet") {
            const last = Number(s.rabbitPetting.heroLastGain || 0);
            if (Date.now() - last >= 1200) {
              requested = Math.min(
                2,
                Math.max(0,20 - (Number(s.rabbitPetting.gained)||0))
              );
              s.rabbitPetting.heroLastGain = Date.now();
            }
          }

          if (action === "angry") requested = -5;

          if (action === "brush") {
            const key = day + ":brush";
            if (!s.rabbitPlay.rewards[key]) {
              requested = 2;
              s.rabbitPlay.rewards[key] = true;
            }
          }

          if (action === "call") {
            s.rabbitPlay.calls = (Number(s.rabbitPlay.calls)||0) + 1;
          }

          const before = care.affection;
          care.affection = Math.max(0,Math.min(100,before+requested));
          const delta = care.affection-before;

          if (action === "pet" && delta > 0) {
            s.rabbitPetting.gained =
              (Number(s.rabbitPetting.gained)||0)+delta;
          }

          s.rabbitLife = {
            ...s.rabbitLife,
            version:1,
            mood:action === "angry" ? "grumpy" : "happy",
            moodUntil:Date.now()+(action === "angry" ? 30000 : 60000)
          };

          result = { state:s, delta, sleeping:false };
          store.put(s,"main");
        } catch (error) {
          failure = error;
          tx.abort();
        }
      };

      tx.oncomplete = () => resolve(result);
      tx.onerror = () => reject(failure || tx.error);
      tx.onabort = () => reject(failure || tx.error || Error("Aborted"));
    });
  }

  const style = document.createElement("style");

  style.textContent = `
    /* 沒有內框：直接融入首頁原本的粉色背景。 */
    .hero.bh-open {
      grid-template-columns:minmax(0,1fr) minmax(340px,510px);
      padding:35px 30px 28px 38px;
      gap:12px 25px;
      overflow:hidden;
      align-items:center;
    }

    .bh-stage {
      width:100%;
      min-width:0;
      position:relative;
      align-self:center;
      background:none;
      border:0;
      box-shadow:none;
      padding:0;
    }

    .bh-world {
      display:block;
      width:100%;
      height:auto;
      overflow:visible;
      touch-action:pan-y;
    }

    .bh-pet {
      cursor:grab;
      touch-action:pan-y;
    }

    .bh-pet:active { cursor:grabbing; }

    .bh-actions {
      display:flex;
      justify-content:center;
      flex-wrap:wrap;
      gap:5px 13px;
      margin:-3px 0 0;
    }

    .bh-actions button {
      background:transparent;
      border:0;
      box-shadow:none;
      border-radius:18px;
      padding:7px 10px;
      min-height:39px;
      color:var(--accent,#a64f70);
      font:700 13px var(--font,sans-serif);
    }

    .bh-actions button:hover {
      background:#ffffff70;
    }

    .bh-actions button:disabled {
      opacity:.4;
    }

    .bh-line {
      text-align:center;
      max-width:390px;
      min-height:48px;
      margin:8px auto 0;
      color:var(--ink,#4a383d);
      font:14px/1.8 var(--font,sans-serif);
      padding:0 10px;
      overflow-wrap:anywhere;
    }

    .bh-meta {
      display:flex;
      justify-content:center;
      align-items:center;
      flex-wrap:wrap;
      gap:6px 15px;
      margin:7px 0 0;
      color:var(--accent,#a64f70);
      font-size:11px;
    }

    .bh-meta button {
      border:0;
      background:transparent;
      padding:3px 5px;
      min-height:28px;
      color:inherit;
      font-size:11px;
    }

    .bh-delta {
      position:absolute;
      left:55%;
      top:30%;
      color:#bf4e76;
      font:900 25px "Nunito",sans-serif;
      pointer-events:none;
      text-shadow:0 2px 0 #fff8;
      animation:bh-rise 1.4s ease-out forwards;
    }

    .bh-delta.down { color:#68718f; }

    @keyframes bh-rise {
      0% { opacity:0;transform:translateY(8px) scale(.8); }
      20% { opacity:1;transform:translateY(-5px) scale(1.15); }
      100% { opacity:0;transform:translateY(-65px) scale(1); }
    }

    @media(max-width:1050px) {
      .hero.bh-open {
        grid-template-columns:minmax(0,1fr) minmax(300px,420px);
        padding:28px;
        gap:12px;
      }
    }

    @media(max-width:760px) {
      .hero.bh-open {
        grid-template-columns:minmax(0,1fr);
        padding:24px 20px 20px;
        gap:8px;
      }

      .bh-stage {
        max-width:490px;
        justify-self:center;
        margin-top:-8px;
      }

      .bh-line { font-size:13px; }
      .bh-actions { gap:4px 8px; }
      .bh-actions button { min-height:43px; }
    }

    @media(prefers-reduced-motion:reduce) {
      .bh-delta { animation:none; }
    }
  `;

  document.head.append(style);

  function node(tag, attrs={}) {
    const el = document.createElementNS(NS,tag);
    Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));
    return el;
  }

  /*
   * 保留領養兔子的毛色、耳型、身體及配飾，
   * 由活動程式統一控制這隻兔子的表情。
   */
  function makeRabbit(source) {
    const copy = source.cloneNode(true);

    copy.removeAttribute("class");
    copy.removeAttribute("style");
    copy.removeAttribute("id");

    copy.setAttribute("class","bh-pet");
    copy.setAttribute("data-bh-pet","");
    copy.setAttribute("width","240");
    copy.setAttribute("height","220");
    copy.setAttribute("viewBox","0 0 240 220");
    copy.setAttribute("overflow","visible");

    [...copy.children].forEach(el=>{
      if(el.localName==="g") {
        el.remove();
        return;
      }

      el.removeAttribute("visibility");
      el.removeAttribute("class");
      el.removeAttribute("style");

      const x=Number(el.getAttribute("cx"));
      const y=Number(el.getAttribute("cy"));
      const d=(el.getAttribute("d")||"").trim();

      const eye=el.localName==="ellipse" &&
        [83,120].includes(x) && y===114;
      const shine=el.localName==="circle" &&
        [84,121].includes(x) && y===112;
      const mouth=el.localName==="ellipse" && x===102 && y===139;
      const path=el.localName==="path" &&
        /^(M77 116|M95 135|M96 140|M102 131|m77 102)/i.test(d);
      const shadow=el.localName==="ellipse" && y===204;

      if(eye||shine||mouth||path||shadow) el.remove();
    });

    // 耳形和內耳一起輕擺，避免只動外耳。
    const paths=[...copy.children].filter(e=>e.localName==="path");
    const outer=paths.find(e=>/^(M81 94|M65 88)/.test(e.getAttribute("d")||""));
    const inner=paths.find(e=>/^(M83 74|M54 105)/.test(e.getAttribute("d")||""));

    if(outer && inner) {
      const group=node("g",{"data-bh-ears":""});
      copy.insertBefore(group,outer);
      group.append(outer,inner);
    }

    copy.append(node("g",{
      "data-bh-face":"",
      "pointer-events":"none"
    }));

    return copy;
  }

  const eyes={
    calm:`<ellipse cx="83" cy="114" rx="3.8" ry="5" fill="#44302b"/>
      <ellipse cx="120" cy="114" rx="3.8" ry="5" fill="#44302b"/>
      <circle cx="84" cy="112" r="1.3" fill="white" stroke="none"/>
      <circle cx="121" cy="112" r="1.3" fill="white" stroke="none"/>`,
    happy:`<path d="M77 116q6-10 12 0m25 0q6-10 12 0"/>`,
    enjoy:`<path d="M77 115q6 6 12 0m25 0q6 6 12 0"/>`,
    surprise:`<ellipse cx="83" cy="114" rx="5" ry="7" fill="#44302b"/>
      <ellipse cx="120" cy="114" rx="5" ry="7" fill="#44302b"/>`,
    shy:`<path d="M77 114q6 5 12 0m25 0q6 5 12 0"/>`,
    wink:`<path d="M77 115q6-9 12 0"/>
      <ellipse cx="120" cy="114" rx="3.8" ry="5" fill="#44302b"/>`,
    angry:`<path d="m76 104 14 5m23 0 14-5" stroke-width="3"/>
      <path d="M78 116h10m27 0h10"/>`,
    sleep:`<path d="M77 116q6 3 12 0m25 0q6 3 12 0"/>`
  };

  function setFace(value="calm") {
    if(!scene?.isConnected) return;
    mood=value;

    let eye=eyes[value]||eyes.calm;
    let mouth=`<path d="M97 137q5 5 10 0"/>`;

    if(value==="happy") mouth=`<path d="M95 135q7 13 14 0Z" fill="#bd7c8e"/>`;
    if(value==="surprise") mouth=`<ellipse cx="102" cy="139" rx="3" ry="4" fill="#b77c87"/>`;
    if(value==="angry") mouth=`<path d="M97 141q5-6 10 0"/>`;
    if(value==="sleep") mouth=`<path d="M99 139h6"/>`;
    if(value==="eat"||value==="drink") {
      eye=eyes.enjoy;
      mouth=`<ellipse data-bh-mouth cx="102" cy="139" rx="4" ry="3"
        fill="#b77c87"/>`;
    }

    scene.querySelector("[data-bh-face]").innerHTML=`
      <g fill="none" stroke="#6d5048" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        ${eye}${mouth}
      </g>
      ${["happy","enjoy","shy","wink"].includes(value)?`
        <ellipse cx="74" cy="128" rx="11" ry="5"
          fill="#e894ab" opacity="${value==="shy"?.85:.55}"/>
        <ellipse cx="130" cy="128" rx="11" ry="5"
          fill="#e894ab" opacity="${value==="shy"?.85:.55}"/>
      `:""}
      ${value==="angry"?`
        <path d="M150 89v10m-5-5h10" stroke="#bd5273"
          stroke-width="2.5"/>
      `:""}
      ${value==="sleep"?`
        <text x="156" y="78" fill="var(--accent)"
          font-size="14" font-family="Nunito">z</text>
        <text x="174" y="59" fill="var(--accent)"
          font-size="19" font-family="Nunito">Z</text>
      `:""}
      ${value==="eat"?`
        <g data-bh-hay stroke="#8e9e60" stroke-width="2"
          stroke-linecap="round">
          <path d="m101 139-37 9m37-9-39-2m39 2-31 18"/>
        </g>
      `:""}
    `;
  }

  function line(value) {
    const el=scene?.querySelector(".bh-line");
    if(el) el.textContent=value;
  }

  function affectionLabel() {
    const label=scene?.querySelector("[data-bh-love]");
    if(!label) return;
    const value=latest?.rabbitCare?.affection;
    label.textContent=say("好感度","好感度","Affection")+
      " ♥ "+(Number.isInteger(value)?value:0)+"/100";
  }

  function position(x=145,y=65,scale=1,dir=1,tilt=0) {
    if(!scene?.isConnected) return;
    poseX=x;poseY=y;facing=dir;

    scene.querySelector("[data-bh-move]").setAttribute(
      "transform",`translate(${x} ${y})`
    );

    scene.querySelector("[data-bh-pose]").setAttribute(
      "transform",
      `translate(120 205) rotate(${tilt}) scale(${dir*scale} ${scale}) translate(-120 -205)`
    );

    const shadow=scene.querySelector("[data-bh-shadow]");
    shadow.setAttribute("cx",x+125);
    shadow.setAttribute("rx",Math.max(42,68-(65-y)*.45));
  }

  const ease=p=>p*p*(3-2*p);

  function animate(target,duration,draw) {
    return new Promise((resolve,reject)=>{
      let start;

      function frame(time) {
        if(!target.isConnected||scene!==target) {
          reject(Error("Scene replaced"));
          return;
        }

        start??=time;
        const p=Math.min(1,(time-start)/duration);
        draw(p);
        if(p<1) requestAnimationFrame(frame);
        else resolve();
      }

      requestAnimationFrame(frame);
    });
  }

  async function travel(target,from,to,duration=1000) {
    const dir=to>from?-1:1;
    await animate(target,duration,p=>{
      const bounce=Math.abs(Math.sin(p*Math.PI*3));
      position(
        from+(to-from)*ease(p),
        65-bounce*17,
        1-.025*Math.cos(p*Math.PI*6),
        dir,
        Math.sin(p*Math.PI*6)*2
      );
    });
  }

  function hearts(show=true) {
    scene?.querySelector("[data-bh-hearts]")
      .setAttribute("opacity",show?"1":"0");
  }

  function showDelta(delta) {
    if(!delta||!scene?.isConnected) return;
    const el=document.createElement("span");
    el.className="bh-delta"+(delta<0?" down":"");
    el.textContent=(delta>0?"+":"−")+Math.abs(delta)+" ♥";
    scene.append(el);
    setTimeout(()=>el.remove(),1500);
  }

  function resting() {
    return Number(latest?.rabbitLife?.restUntil)>Date.now();
  }

  function reset() {
    scene?.querySelector("[data-bh-ball]")?.setAttribute("opacity", "0");

    position();
    scene?.querySelector("[data-bh-ball]")
      .setAttribute("transform","translate(405 259)");
    scene?.querySelector("[data-bh-brush]").setAttribute("opacity","0");
    scene?.querySelector("[data-bh-ripple]").setAttribute("opacity","0");
    hearts(false);
  }

  function startIdle(target) {
    cancelAnimationFrame(raf);
    const began=performance.now();
    let lastFace="";

    function frame(time) {
      if(!target.isConnected||target!==scene) return;

      if(!busy) {
        const t=(time-began)/1000;
        const sleep=resting();
        const eating=!sleep&&Date.now()<eatUntil;

        let desired;
        if(sleep) desired="sleep";
        else if(eating) desired="eat";
        else if(Date.now()<faceUntil) desired=mood;
        else desired=t%5>4.78?"enjoy":"calm";

        if(desired!==lastFace||desired!==mood) {
          setFace(desired);
          lastFace=desired;
        }

        const breath=reduce.matches?1:1+Math.sin(t*2)*.009;
        position(145,sleep?69:65,breath,1,sleep?-3:0);

        const ears=target.querySelector("[data-bh-ears]");
        if(ears) ears.setAttribute(
          "transform",
          `rotate(${reduce.matches?0:Math.sin(t*2.6)*1.8} 106 93)`
        );

        const mouth=target.querySelector("[data-bh-mouth]");
        if(mouth) mouth.setAttribute(
          "ry",String(1.5+(Math.sin(t*19)+1)*1.4)
        );

        const hay=target.querySelector("[data-bh-hay]");
        if(hay) hay.setAttribute(
          "transform",`translate(${Math.sin(t*18)*1.5} 0)`
        );
      }

      raf=requestAnimationFrame(frame);
    }

    raf=requestAnimationFrame(frame);
  }

async function ball(target) {
  const toy = target.querySelector("[data-bh-ball]");
  const spin = target.querySelector("[data-bh-ball-spin]");

  const showBall = (x, y, angle = 0) => {
    toy.setAttribute("transform", `translate(${x} ${y})`);
    spin.setAttribute("transform", `rotate(${angle})`);
  };

  toy.setAttribute("opacity", "1");
  showBall(430, -25);

  setFace("surprise");

  line(say(
    "咦？有波波跌落嚟！畀兔兔接住佢～",
    "咦？有球球掉下来！让兔兔接住它～",
    "Ooh! A falling ball! Let me catch it!"
  ));

  try {
    // 從上方落下：先慢後快。
    await animate(target, 650, p => {
      showBall(430, -25 + 284 * p * p, p * 130);
    });

    // 第一次彈起。
    await animate(target, 520, p => {
      showBall(
        430 - 10 * p,
        259 - Math.sin(p * Math.PI) * 67,
        130 + p * 95
      );
    });

    // 第二次較小的彈跳。
    await animate(target, 360, p => {
      showBall(
        420 - 5 * p,
        259 - Math.sin(p * Math.PI) * 27,
        225 + p * 60
      );
    });

    setFace("happy");

    line(say(
      "等埋我呀！兔兔隻短腳已經開動喇～",
      "等等我呀！兔兔的小短腿已经开动啦～",
      "Wait for me! Little bunny legs are on the move!"
    ));

    // 球稍微滾遠，兔兔同時跳過去。
    await Promise.all([
      travel(target, 145, 230, 1050),

      animate(target, 1050, p => {
        showBall(
          415 + 55 * ease(p),
          259,
          285 + p * 180
        );
      })
    ]);

    // 朝右時鼻子位置約在 x + 138。
    // 接近球後，輕輕把球推回左邊。
    setFace("wink");

    await animate(target, 500, p => {
      const lift = Math.sin(p * Math.PI);
      position(230, 65 - lift * 5, 1, -1, -lift * 3);
    });

    // 球滾到左邊，兔兔轉身追。
    setFace("surprise");

    await Promise.all([
      animate(target, 1250, p => {
        showBall(
          470 - 340 * ease(p),
          259 - Math.abs(Math.sin(p * Math.PI * 2)) * 7,
          465 - p * 650
        );
      }),

      travel(target, 230, 20, 1250)
    ]);

    // 左側停下，用鼻鼻碰一下球。
    setFace("happy");

    await animate(target, 450, p => {
      position(
        20 + Math.sin(p * Math.PI) * 5,
        65,
        1,
        1,
        Math.sin(p * Math.PI) * 3
      );
    });

    // 推一下，球再彈回中間。
    await animate(target, 650, p => {
      showBall(
        130 + 145 * ease(p),
        259 - Math.sin(p * Math.PI) * 42,
        -185 + p * 280
      );
    });

    await travel(target, 20, 145, 850);

    position();
    setFace("happy");
    hearts(true);

    line(say(
      "嘿嘿，玩夠先收埋！下次再撳波波陪我玩呀～",
      "嘿嘿，玩够先收好！下次再点球球陪我玩呀～",
      "Hehe, let’s put it away. Tap the ball when you want to play again!"
    ));

    // 球縮小消失，平時不留在兔兔旁邊。
    await animate(target, 450, p => {
      toy.setAttribute(
        "transform",
        `translate(275 259) scale(${1 - p})`
      );
      toy.setAttribute("opacity", String(1 - p));
    });
  } finally {
    toy.setAttribute("opacity", "0");
    toy.setAttribute("transform", "translate(405 259)");
    spin.setAttribute("transform", "");
  }
}

  async function brush(target) {
    setFace("enjoy");
    line(say(
      "係呢度喇～梳順少少，兔兔要靚靚見人呀。",
      "就是这里～梳顺一点，兔兔要漂漂亮亮的。",
      "Right there! Make my fluff extra lovely."
    ));

    const comb=target.querySelector("[data-bh-brush]");
    comb.setAttribute("opacity","1");

    await animate(target,3000,p=>{
      const wave=Math.sin(p*Math.PI*8);
      comb.setAttribute(
        "transform",`translate(${288+wave*35} 206) rotate(-13)`
      );
      position(145,65+wave*1.5,1,1,wave*1.5);
      if(p>.65&&mood!=="shy") {
        setFace("shy");
        hearts();
      }
    });

    comb.setAttribute("opacity","0");
    line(say(
      "舒服到想攤平喇……唔准偷偷整亂我啲毛呀！",
      "舒服得想摊平啦……不许偷偷弄乱我的毛哦！",
      "I’m melting… no messing up this lovely fluff!"
    ));
  }

  async function water(target) {
    setFace("happy");
    line(say("飲兩啖先～","先喝两口～","A little sip first!"));
    await travel(target,145,8,1000);
    setFace("drink");

    await animate(target,2400,p=>{
      const sip=(Math.sin(p*Math.PI*12)+1)/2;
      position(8,69+sip*2,1,1,-6-sip*4);

      const ripple=target.querySelector("[data-bh-ripple]");
      ripple.setAttribute("opacity",String(.85-sip*.6));
      ripple.setAttribute("rx",String(10+sip*18));

      const mouth=target.querySelector("[data-bh-mouth]");
      if(mouth) mouth.setAttribute("ry",String(1+sip*2));
    });

    await travel(target,8,145,1000);
    setFace("happy");
    line(say(
      "飲完！清水都要日日換，兔兔好講究㗎～",
      "喝好啦！清水也要每天换，兔兔很讲究的～",
      "Refreshed! Fresh water every day, please."
    ));
  }

  async function call(target) {
    setFace("surprise");
    line(say(
      `${latest.pet.name}？係咪叫我呀？`,
      `${latest.pet.name}？是在叫我吗？`,
      `${latest.pet.name}? Did you call me?`
    ));

    await animate(target,450,p=>{
      position(145,65-Math.sin(p*Math.PI)*5);
    });

    setFace("happy");

    await animate(target,1200,p=>{
      const hop=Math.abs(Math.sin(p*Math.PI*3))*14;
      position(145+15*ease(p),65-hop,1+.12*ease(p));
    });

    setFace("shy");
    hearts();

    await animate(target,900,p=>{
      position(160,65-Math.abs(Math.sin(p*Math.PI*2))*8,1.12);
    });

    await animate(target,600,p=>{
      position(160-15*ease(p),65,1.12-.12*ease(p));
    });

    line(say(
      "嚟喇！叫我係咪想錫我呀？",
      "来啦！叫我是想宠宠我吗？",
      "Here I am! Did you call me for cuddles?"
    ));
  }

  async function activity(action) {
    if(busy||!scene?.isConnected) return;
    const target=scene;
    busy=true;

    target.querySelectorAll("button").forEach(b=>b.disabled=true);

    try {
      latest=await read();
      if(!latest?.ready) return;

      if(resting()) {
        setFace("sleep");
        line(say(
          "兔兔瞓緊覺呀～休息完再玩啦。",
          "兔兔正在睡觉呀～休息好再玩吧。",
          "Bunny is sleeping. Play after the nap."
        ));
        return;
      }

reset();

// 動畫開始前清除上一次的臨時表情時間。
faceUntil = 0;

if(reduce.matches) {

        setFace("happy");
        line(say(
          "兔兔陪你玩好喇～已跟隨裝置設定減少動態。",
          "兔兔陪你玩好啦～已按设备设置减少动态。",
          "Playtime complete. Your device’s reduced-motion setting is on."
        ));
      } else {
        await ({ball,brush,water,call})[action](target);
      }

      const result=await saveAction(action);
      if(result) {
        latest=result.state;
        if(!result.sleeping) showDelta(result.delta);
        affectionLabel();
      }

      faceUntil=Date.now()+4000;
    } catch(error) {
      console.error("Bunny play:",error);
      if(target.isConnected) line(say(
        "兔兔絆咗一下，再試一次呀～",
        "兔兔绊了一下，再试一次吧～",
        "A little bunny stumble. Try again!"
      ));
    } finally {
      busy=false;
      if(target===scene&&target.isConnected) {
        position();
        target.querySelector("[data-bh-brush]").setAttribute("opacity","0");
        target.querySelector("[data-bh-ripple]").setAttribute("opacity","0");
        target.querySelectorAll("button").forEach(b=>b.disabled=false);
      }
      schedule();
    }
  }

  async function pet(part="head",double=false) {
    if(busy||!scene?.isConnected) return;
    const now=Date.now();

    try {
      latest=await read();
      if(!latest?.ready) return;

      if(resting()) {
        line(say(
          "噓～兔兔瞓緊覺，等佢休息下先。",
          "嘘～兔兔正在睡觉，让它休息一会儿。",
          "Shh… let your bunny finish the nap."
        ));
        return;
      }

      taps=taps.filter(t=>now-t<2000);
      taps.push(now);
      const angry=taps.length>=5;
      if(angry) taps=[];

      const expression=angry?"angry":
        double?"shy":part==="nose"?"surprise":"enjoy";

      setFace(expression);
      faceUntil=Date.now()+3000;
      hearts(!angry);

      line(angry?say(
        "喂！兔兔唔係門鐘呀！輕輕摸先原諒你。",
        "喂！兔兔又不是门铃！轻轻摸才原谅你。",
        "Hey! I’m not a doorbell. Gentle pets, please!"
      ):double?say(
        "突然咁錫我……耳仔都紅晒喇！",
        "突然这么宠我……耳朵都红啦！",
        "So sweet all of a sudden… my ears are blushing!"
      ):part==="nose"?say(
        "啵！鼻鼻唔係確認掣嚟㗎～",
        "啵！鼻子可不是确认按钮哦～",
        "Boop! My nose isn’t the confirm button!"
      ):say(
        "嗯～就係呢度喇，唔好咁快停呀。",
        "嗯～就是这里，不要这么快停呀。",
        "Mmm… right there. Don’t stop just yet."
      ));

      const result=await saveAction(angry?"angry":"pet");
      if(result) {
        latest=result.state;
        showDelta(result.delta);
        affectionLabel();
      }

      clearTimeout(messageTimer);
      const target=scene;
      messageTimer=setTimeout(()=>{
        if(target===scene&&target.isConnected) hearts(false);
      },3000);
    } catch(error) {
      console.error("Bunny pet:",error);
    }
  }

  function petPart(event) {
    try {
      const svg=event.target.closest("[data-bh-pet]");
      if(!svg) return "head";
      const point=svg.createSVGPoint();
      point.x=event.clientX;point.y=event.clientY;
      const p=point.matrixTransform(svg.getScreenCTM().inverse());
      return Math.hypot((p.x-102)/18,(p.y-130)/16)<=1?
        "nose":p.y<145?"head":"body";
    } catch { return "head"; }
  }

  function mount() {
    if(document.body.dataset.page!=="home"||busy) return;

    const hero=$("#content .hero");
    if(!hero) return;

    document.querySelectorAll("#visibleBunnyPlay,#bunnyPlayPanel")
      .forEach(el=>el.remove());

    if(hero.querySelector(".bh-stage")) {
      scene=hero.querySelector(".bh-stage");
      affectionLabel();
      return;
    }

    const source=[...hero.children].find(el=>el.matches?.("svg.rabbit"));
    if(!source) return;

    const actor=makeRabbit(source);

    [...hero.children].forEach(el=>{
      if(el.matches?.(
        "svg.rabbit,.bp-hint,.bl-controls,.bunny-touch-hint,.hp-room"
      )) el.remove();
    });

    hero.classList.remove("hp-integrated");
    hero.classList.add("bh-open");

    const stage=document.createElement("section");
    stage.className="bh-stage";
    stage.setAttribute("aria-label",say("兔兔陪伴區","兔兔陪伴区","Bunny companion"));

    stage.innerHTML=`
      <svg class="bh-world" viewBox="0 0 530 310"
        role="img" aria-label="Interactive bunny">
        <!-- 只有淡淡的影子，沒有房間或內框。 -->
        <ellipse data-bh-shadow cx="270" cy="270" rx="68" ry="8"
          fill="#926777" opacity=".12"/>

        <g data-bh-move transform="translate(145 65)">
          <g data-bh-pose></g>
        </g>

        <g>
          <path d="M43 260q5 21 35 21t35-21"
            fill="#d5e9eb" stroke="#96b6bd" stroke-width="1.7"/>
          <ellipse cx="78" cy="259" rx="35" ry="8"
            fill="#badfe8" stroke="#96b6bd" stroke-width="1.7"/>
          <ellipse data-bh-ripple cx="78" cy="259" rx="13" ry="3"
            fill="none" stroke="white" stroke-width="2" opacity="0"/>
        </g>

<g data-bh-ball opacity="0" transform="translate(405 259)">
          <g data-bh-ball-spin>
            <circle r="17" fill="#e6a3bc"
              stroke="#ad6d85" stroke-width="1.8"/>
            <path d="M-16 0h32M0-16v32"
              stroke="#fff8ed" stroke-width="5"/>
          </g>
        </g>

        <g data-bh-brush opacity="0">
          <rect x="-25" y="-10" width="50" height="23" rx="9"
            fill="#c39bb5" stroke="#89677e" stroke-width="1.5"/>
          <path d="M-18 12v10m9-10v11m9-11v11m9-11v11m9-11v10"
            stroke="#89677e" stroke-width="2"/>
          <path d="M25 1h25" stroke="#89677e"
            stroke-width="9" stroke-linecap="round"/>
        </g>

        <g data-bh-hearts opacity="0" fill="#cd7294">
          <path d="M344 93l-8-8a5 5 0 0 1 8-6a5 5 0 0 1 8 6Z"/>
          <path d="M173 116l-5-5a3.2 3.2 0 0 1 5-4a3.2 3.2 0 0 1 5 4Z"
            opacity=".65"/>
          <path d="M363 124l-4-4a2.8 2.8 0 0 1 4-3a2.8 2.8 0 0 1 4 3Z"
            opacity=".5"/>
        </g>
      </svg>

      <div class="bh-actions"></div>
      <div class="bh-line" role="status" aria-live="polite"></div>
      <div class="bh-meta">
        <button type="button" data-bh-touch></button>
        <span data-bh-love></span>
      </div>
    `;

    stage.querySelector("[data-bh-pose]").append(actor);

    const labels={
      ball:say("追波波","追球球","Play ball"),
      brush:say("梳毛毛","梳毛毛","Groom"),
      water:say("飲啖水","喝口水","Water"),
      call:say("叫兔兔","叫兔兔","Call me")
    };

    Object.entries(labels).forEach(([key,label])=>{
      const button=document.createElement("button");
      button.type="button";
      button.dataset.bhAction=key;
      button.textContent=label;
      stage.querySelector(".bh-actions").append(button);
    });

    stage.querySelector("[data-bh-touch]").textContent=say(
      "♡ 可以摸我㗎，輕輕呀",
      "♡ 可以摸摸我哦，轻轻的",
      "♡ Pet me gently"
    );

    hero.append(stage);
    scene=stage;
    setFace("calm");
    affectionLabel();

    line(say(
      "我喺度呀～記帳定陪我玩一陣先？",
      "我在这里呀～先记账还是陪我玩一会儿？",
      "Here I am! Journal first, or a little playtime?"
    ));

    startIdle(stage);
  }

  document.addEventListener("click",event=>{
    const action=event.target.closest("[data-bh-action]");
    if(action) {
      activity(action.dataset.bhAction);
      return;
    }

    if(event.target.closest("[data-bh-touch]")) {
      pet("head");
    }
  });

  document.addEventListener("pointerdown",event=>{
    if(!event.isPrimary||event.button!==0||busy) return;
    if(!event.target.closest("[data-bh-pet]")) return;

    gesture={
      id:event.pointerId,
      x:event.clientX,y:event.clientY,
      lastX:event.clientX,
      moved:false,
      part:petPart(event),
      distance:0
    };
  });

  document.addEventListener("pointermove",event=>{
    if(!gesture||gesture.id!==event.pointerId) return;

    const g=gesture;
    if(Math.abs(event.clientY-g.y)>28) {
      gesture=null;
      return;
    }

    const dx=Math.abs(event.clientX-g.lastX);
    g.lastX=event.clientX;
    g.distance+=dx;

    if(g.distance>16) g.moved=true;

    if(g.distance>35&&Date.now()-lastPet>1300) {
      lastPet=Date.now();
      g.distance=0;
      pet("head");
    }
  });

  document.addEventListener("pointerup",event=>{
    if(!gesture||gesture.id!==event.pointerId) return;
    const g=gesture;gesture=null;

    if(g.moved) return;
    if(Math.hypot(event.clientX-g.x,event.clientY-g.y)>12) return;

    const now=Date.now();
    const double=now-lastPet<400;
    lastPet=now;
    pet(g.part,double);
  });

  document.addEventListener("pointercancel",()=>gesture=null);
  window.addEventListener("blur",()=>gesture=null);

  async function poll() {
    if(polling||document.hidden) return;
    polling=true;

    try {
      const state=await read();
      if(!state?.ready) return;

      latest=state;
      const count=state.rabbitCare?.feedCount;

      if(Number.isSafeInteger(count)) {
        if(lastFeed!==null&&count>lastFeed) {
          eatUntil=Date.now()+5500;
          if(!busy) line(say(
            "嚼嚼嚼……呢份草好香呀！",
            "嚼嚼嚼……这份草好香呀！",
            "Munch munch… lovely hay!"
          ));
        }
        lastFeed=count;
      }

      mount();
      affectionLabel();
    } catch(error) {
      console.error("Bunny home:",error);
    } finally {
      polling=false;
    }
  }

  function schedule() {
    if(scheduled||document.body.dataset.page!=="home") return;
    scheduled=true;
    setTimeout(()=>{
      scheduled=false;
      poll();
    },150);
  }

  function start() {
    if(document.body.dataset.page!=="home") return;

    const observer=new MutationObserver(records=>{
      if(records.some(record=>
        record.target instanceof Element&&record.target.id==="content"
      )) schedule();
    });

    observer.observe(document.body,{childList:true,subtree:true});
    window.addEventListener("focus",schedule);
    document.addEventListener("visibilitychange",()=>{
      if(!document.hidden) schedule();
    });

    schedule();
    setInterval(poll,1200);
  }

  if(document.readyState==="loading") {
    document.addEventListener("DOMContentLoaded",start,{once:true});
  } else {
    start();
  }
})();
