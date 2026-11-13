"use strict";
(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const round = n => Math.round((Number(n)+Number.EPSILON)*100)/100;
const page = document.body.dataset.page;
const nav = [
  ["home","index.html","我的小窩"],
  ["ledger","ledger.html","收支手帳"],
  ["shopping","shopping.html","購物清單"],
  ["analytics","analytics.html","消費分析"],
  ["goals","goals.html","願望罐"],
  ["feed","feed.html","生活圈"],
  ["settings","settings.html","設定"]
];
const currencies = ["HKD","CNY","USD","EUR","GBP","JPY","KRW","TWD","SGD","AUD","CAD","CHF","NZD","THB","MYR","INR","AED"];
// 示範參考數值，並非即時市場報價。
const reference = {
  HKD:7.8,CNY:7.2,USD:1,EUR:.92,GBP:.79,JPY:150,KRW:1350,
  TWD:32,SGD:1.35,AUD:1.52,CAD:1.37,CHF:.9,NZD:1.65,
  THB:36,MYR:4.7,INR:83,AED:3.6725
};
const breeds = ["侏儒兔","垂耳兔","長毛垂耳兔","道奇兔"];
const coats = [
  {fur:"#ead6ba",accent:"#886047",soft:"#f5ebdf"},
  {fur:"#bba59f",accent:"#935c75",soft:"#fae9f0"},
  {fur:"#777173",accent:"#626780",soft:"#eeeff7"},
  {fur:"#fff8ec",accent:"#a64f70",soft:"#fae8ee"}
];
const expenseCats = ["餐飲","交通","購物","娛樂","學習","其他"];
const incomeCats = ["薪金","零用錢","兼職","禮金","其他"];
let S, db, queue = Promise.resolve();
let month = today().slice(0,7);
let filters = {q:"",type:"",category:""};
let feedFilter = "all";
let petDraft, onboardingName = "", gallery = [], photoIndex = 0;
let previewImages = [], previewToken = 0, toastTimer;
let channel;
try { channel = new BroadcastChannel("bunny-yanice"); } catch {}
const words = {
"我的小窩":["我的小窝","Home"],
"收支手帳":["收支手账","Journal"],
"購物清單":["购物清单","Shopping"],
"消費分析":["消费分析","Insights"],
"願望罐":["愿望罐","Wishes"],
"生活圈":["生活圈","Moments"],
"設定":["设置","Settings"],
"新增記帳":["新增记账","Add record"],
"本月收入":["本月收入","Monthly income"],
"本月支出":["本月支出","Monthly spending"],
"本月結餘":["本月结余","Monthly balance"],
"預算剩餘":["预算剩余","Budget left"],
"收入":["收入","Income"],"支出":["支出","Expense"],
"儲存":["保存","Save"],"取消":["取消","Cancel"],
"關閉":["关闭","Close"],"查看":["查看","View"],
"編輯":["编辑","Edit"],"刪除":["删除","Delete"],
"日期":["日期","Date"],"分類":["分类","Category"],
"備註":["备注","Note"],"金額":["金额","Amount"],
"貨幣":["货币","Currency"],"類型":["类型","Type"],
"照片":["照片","Photos"],"全部":["全部","All"],
"餐飲":["餐饮","Food"],"交通":["交通","Transport"],
"購物":["购物","Shopping"],"娛樂":["娱乐","Fun"],
"學習":["学习","Study"],"其他":["其他","Other"],
"薪金":["工资","Salary"],"零用錢":["零用钱","Allowance"],
"兼職":["兼职","Part-time"],"禮金":["礼金","Gift"],
"最近記錄":["最近记录","Recent records"],
"每日支出":["每日支出","Daily spending"],
"分類分布":["分类分布","Categories"],
"消費日曆":["消费日历","Spending calendar"],
"本月預算":["本月预算","Monthly budget"],
"分類預算":["分类预算","Category budgets"],
"調整預算":["调整预算","Edit budget"],
"新增願望":["新增愿望","New wish"],
"願望名稱":["愿望名称","Wish name"],
"目標金額":["目标金额","Target amount"],
"目標日期":["目标日期","Target date"],
"存一點":["存一点","Add savings"],
"已完成":["已完成","Completed"],
"分享達標":["分享达标","Share milestone"],
"隱藏金額":["隐藏金额","Hide amount"],
"發布動態":["发布动态","New moment"],
"內容":["内容","Text"],
"生活":["生活","Life"],"記帳":["记账","Money"],
"暱稱":["昵称","Nickname"],
"個人簡介":["个人简介","Bio"],
"頭像":["头像","Avatar"],
"主要貨幣":["主要货币","Reporting currency"],
"語言":["语言","Language"],
"兔兔名字":["兔兔名字","Bunny name"],
"侏儒兔":["侏儒兔","Netherland dwarf"],
"垂耳兔":["垂耳兔","Holland lop"],
"長毛垂耳兔":["长毛垂耳兔","Fuzzy lop"],
"道奇兔":["道奇兔","Dutch rabbit"],
"更換兔兔":["更换兔兔","Change bunny"],
"配飾":["配饰","Accessory"],
"沒有":["没有","None"],
"蝴蝶結":["蝴蝶结","Bow"],
"圍巾":["围巾","Scarf"],
"大額支出門檻":["大额支出门槛","Large expense"],
"大額收入門檻":["大额收入门槛","Large income"],
"參考匯率":["参考汇率","Reference rates"],
"匯出備份":["导出备份","Export backup"],
"恢復備份":["恢复备份","Restore backup"],
"匯出 CSV":["导出 CSV","Export CSV"],
"自訂商品":["自定义商品","Custom item"],
"商品名稱":["商品名称","Item name"],
"單價":["单价","Unit price"],
"數量":["数量","Quantity"],
"加入":["加入","Add"],
"咖啡":["咖啡","Coffee"],
"筆記本":["笔记本","Notebook"],
"三明治":["三明治","Sandwich"],
"折扣百分比":["折扣百分比","Discount %"],
"優惠金額":["优惠金额","Coupon"],
"購物預算":["购物预算","Shopping budget"],
"應付總額":["应付总额","Total"],
"小計":["小计","Subtotal"],
"確認購買並記帳":["确认购买并记账","Purchase & record"],
"搜尋":["搜索","Search"],
"自動折算":["自动折算","Converted"],
"移除原有照片":["移除原有照片","Remove old photos"],
"達標紀念":["达标纪念","Wish fulfilled"],
"下一步":["下一步","Next"],
"開始我的手帳":["开始我的手账","Open my journal"],
"確定刪除？":["确定删除？","Delete this item?"],
"已儲存":["已保存","Saved"],
"儲存失敗":["保存失败","Could not save"],
"暫無記錄":["暂无记录","No records yet"],
"最多三張照片，每張上限 8 MB。":["最多三张照片，每张上限 8 MB。","Up to three photos, 8 MB each."],
"請選擇有效圖片":["请选择有效图片","Choose valid images"],
"金額必須大於零":["金额必须大于零","Amount must be positive"],
"帳目及照片會自動同步至生活圈。":["账目和照片会自动同步到生活圈。","Records and photos automatically appear in Moments."],
"新照片會取代原有照片。":["新照片会替换原有照片。","New photos replace existing ones."],
"先打折，再扣優惠金額。":["先打折，再扣优惠金额。","Discount applies before coupon."],
"這是本機生活圈，沒有發布到網上。":["这是本机生活圈，没有发布到网上。","Moments are stored locally, not published online."],
"儲蓄投入不計入消費支出。":["储蓄投入不计入消费支出。","Savings are separate from expenses."],
"示範匯率並非即時報價，舊帳保留原有匯率。":["示范汇率不是实时报价，旧账保留原有汇率。","Illustrative rates, not live quotes. Existing records retain their rates."],
"有財務資料後，主要貨幣會鎖定。":["有财务数据后，主要货币会锁定。","Reporting currency is locked once financial data exists."],
"五筆記帳解鎖蝴蝶結；完成願望解鎖圍巾。":["五笔记账解锁蝴蝶结；完成愿望解锁围巾。","Five records unlock a bow; a fulfilled wish unlocks a scarf."],
"請先填寫內容或加入照片":["请先填写内容或加入照片","Add text or photos first"],
"備份格式錯誤":["备份格式错误","Invalid backup"],
"恢復會取代目前資料，繼續？":["恢复会替换当前数据，继续？","Restore replaces current data. Continue?"],
"請定期備份，清除瀏覽器資料可能令記錄遺失。":["请定期备份，清除浏览器数据可能导致记录丢失。","Back up regularly. Clearing browser data may erase records."]
};
function t(k) {
  return S?.lang==="en" ? words[k]?.[1]||k :
    S?.lang==="sc" ? words[k]?.[0]||k : k;
}
function say(tc,sc,en) { return S.lang==="en"?en:S.lang==="sc"?sc:tc; }
function money(n,c=S.base) {
  return c+" "+Number(n).toLocaleString(
    S.lang==="en"?"en-GB":S.lang==="sc"?"zh-CN":"zh-HK",
    {minimumFractionDigits:2,maximumFractionDigits:2}
  );
}
function initial() {
  return {
    version:5,lang:"tc",
    base:"HKD",
    rates:Object.fromEntries(currencies.map(c=>[c,Number((reference.HKD/reference[c]).toFixed(8))])),
    profile:{name:"",bio:"",avatar:""},
    pet:null,ready:false,
    limits:{expense:500,income:3000},
    entries:[],posts:[],goals:[],budgets:{},cart:[],
    shop:{discount:0,coupon:0,budget:0}
  };
}
const records = () => S.entries.filter(e=>e.date.startsWith(month));
const sum = (list,type) => round(list.filter(e=>e.type===type).reduce((n,e)=>n+e.converted,0));
const saved = g => round(g.contributions.reduce((n,c)=>n+c.amount,0));
const hasFinancial = s => s.entries.length||s.goals.length||s.cart.length||Object.keys(s.budgets).length;
/* ---------- Illustrations ---------- */
function ears(pet=S?.pet) {
  const lop=[1,2].includes(pet?.breed);
  return `<svg viewBox="0 0 24 26" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
  ${lop?'<path d="M6 11C0 9 2 23 5 18l3-5m10-2c6-2 4 12 1 7l-3-5"/>':'<path d="M8 12C2-2 10-2 10 11m4 0c0-13 8-13 2 1"/>'}
  <path d="M5 16c0-9 14-9 14 0s-14 9-14 0Z"/><path d="M9 16h.1M15 16h.1M11 19h2"/></svg>`;
}
function rabbit(mood="calm",pet=S?.pet) {
  pet=pet||{breed:0,coat:3,accessory:""};
  const b=pet.breed,c=coats[pet.coat].fur,s="#6d574f",w="#fffaf1";
  const lop=b===1||b===2,fuzzy=b===2,dutch=b===3;
  const happy=["happy","excited"].includes(mood);
  return `<svg class="rabbit" viewBox="0 0 240 220" role="img" aria-label="${esc(t(breeds[b]))}">
  <ellipse cx="126" cy="204" rx="72" ry="7" fill="#d9c9bd" opacity=".6"/>
  <circle cx="185" cy="164" r="${fuzzy?21:16}" fill="${w}" stroke="${s}" stroke-width="1.6"/>
  <ellipse cx="132" cy="160" rx="${b===0?55:65}" ry="43" fill="${c}" stroke="${s}" stroke-width="1.6"/>
  ${dutch?`<path d="M99 119q20-10 36-1l8 80q-27 7-44-5Z" fill="${w}"/>`:""}
  <ellipse cx="92" cy="194" rx="26" ry="9" fill="${dutch?w:c}" stroke="${s}" stroke-width="1.4"/>
  <ellipse cx="158" cy="194" rx="27" ry="9" fill="${c}" stroke="${s}" stroke-width="1.4"/>
  ${!lop?`<path d="M81 94Q60 23 77 17Q94 12 101 90M111 90Q113 19 132 20Q149 25 130 97" fill="${c}" stroke="${s}" stroke-width="1.6"/>
  <path d="M83 74Q73 32 79 30Q88 31 92 77M120 77Q125 33 132 33Q138 37 128 80" fill="#deb5b3"/>`:""}
  ${fuzzy?`<path d="m61 110-11 14 9 8-9 14 13 5-7 15 17 1-1 15 17-5 10 12 14-9 14 8 9-13 18 4 1-15 13-6-8-14 8-13-13-8 4-15-16 1-5-12-14 6-11-9-12 9-13-5-6 12Z" fill="${c}" stroke="${s}" stroke-width="1.3"/>`:""}
  <ellipse cx="101" cy="117" rx="${b===0?42:46}" ry="${b===0?38:41}" fill="${c}" stroke="${s}" stroke-width="1.6"/>
  ${dutch?`<path d="m101 77-14 38q-9 20-1 35 16 10 33-1 6-16-4-34Z" fill="${w}"/>`:""}
  ${lop?`<path d="M65 88Q39 85 40 121l4 33q5 17 16 5l16-50M136 87q25 3 22 37l-7 32q-6 14-15 1l-10-46" fill="${c}" stroke="${s}" stroke-width="1.6"/>
  <path d="M54 105q-7 21-1 43m91-42q7 21-1 42" stroke="#deb5b3" stroke-width="7" fill="none" stroke-linecap="round"/>`:""}
  ${fuzzy?`<path d="m69 93 8-12 8 6 10-11 8 8 12-7 5 11 12-3" fill="${c}" stroke="${s}" stroke-width="1.3"/>`:""}
  ${happy?'<path d="M77 116q6-10 12 0m25 0q6-10 12 0" fill="none" stroke="#382b26" stroke-width="2.6" stroke-linecap="round"/>':
  `<ellipse cx="83" cy="114" rx="${mood==="surprised"?5:3.7}" ry="${mood==="surprised"?6.5:4.8}" fill="#382b26"/><ellipse cx="120" cy="114" rx="${mood==="surprised"?5:3.7}" ry="${mood==="surprised"?6.5:4.8}" fill="#382b26"/><circle cx="84" cy="112" r="1.2" fill="white"/><circle cx="121" cy="112" r="1.2" fill="white"/>`}
  ${mood==="worried"?'<path d="m77 102 10 4m29 0 10-4" stroke="#6d574f" stroke-width="2" fill="none"/>':""}
  <ellipse cx="75" cy="128" rx="9" ry="5" fill="#e8a7ab" opacity=".65"/>
  <ellipse cx="129" cy="128" rx="9" ry="5" fill="#e8a7ab" opacity=".65"/>
  <ellipse cx="92" cy="133" rx="11" ry="8" fill="${w}" opacity=".65"/>
  <ellipse cx="111" cy="133" rx="11" ry="8" fill="${w}" opacity=".65"/>
  <path d="M97 127q5-4 10 0l-5 4Z" fill="#ad797a"/>
  ${happy?'<path d="M95 135q7 12 14 0" fill="#a96e7c" stroke="#6d574f"/>':
  mood==="surprised"?'<ellipse cx="102" cy="139" rx="3" ry="4" fill="#6d574f"/>':
  mood==="worried"?'<path d="M96 140q6-6 12 0" fill="none" stroke="#6d574f" stroke-width="1.4"/>':
  '<path d="M102 131v5m0 0q-5 5-9 0m9 0q5 5 9 0" fill="none" stroke="#6d574f" stroke-width="1.3"/>'}
  <path d="m75 134-18-4m19 10-20 3m72-9 18-4m-19 10 20 3" fill="none" stroke="${s}"/>
  ${pet.accessory==="bow"?'<path d="m100 160-16-9v21l16-8 16 8v-21Z" fill="var(--accent)"/><circle cx="100" cy="162" r="4" fill="#edbecb"/>':""}
  ${pet.accessory==="scarf"?'<path d="M66 150q36 20 72 0v12q-36 18-71 0Z" fill="var(--accent)"/><path d="m117 165 5 27 15-5-8-26" fill="var(--accent)"/>':""}
  ${mood==="excited"?'<path d="m176 54 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="var(--accent)"/>':""}
  </svg>`;
}
function jar() {
  return `<svg class="jar" viewBox="0 0 70 82" fill="none" aria-hidden="true">
  <path d="M24 18c-15-23-8-25-2-11l7 12m14-1c16-23 9-25 3-11l-7 12" fill="#f1c7d3" stroke="#a66b80" stroke-width="1.7"/>
  <rect x="15" y="17" width="40" height="10" rx="4" fill="#d8b296" stroke="#9b775f" stroke-width="1.5"/>
  <rect x="10" y="27" width="50" height="50" rx="15" fill="var(--soft)" stroke="var(--accent)" stroke-width="1.7"/>
  <path d="M22 40h26" stroke="var(--accent)" stroke-width="2"/>
  <circle cx="26" cy="53" r="2" fill="#76545b"/><circle cx="44" cy="53" r="2" fill="#76545b"/>
  <path d="M31 61q4 5 8 0" stroke="#76545b" stroke-width="1.5"/></svg>`;
}
function navIcon(i) {
  const paths=[
    '<path d="m3 10 9-7 9 7v11H3Z"/><path d="M9 21v-8h6v8"/>',
    '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8m-8 4h8m-8 4h5"/>',
    '<path d="M3 4h2l3 12h11l2-9H6"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/>',
    '<path d="M4 20V4m0 16h17M8 16v-5m5 5V7m5 9V3"/>',
    '<path d="M8 4h8v4l4 3v8H4v-8l4-3Z"/><path d="M9 13h6"/>',
    '<path d="M4 4h16v12H9l-5 4Z"/><path d="M8 8h8m-8 4h5"/>',
    '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>'
  ];
  return `<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[i]}</svg>`;
}
/* ---------- UI helpers ---------- */
function btn(label,action,key="",cls="") {
  return `<button type="button" class="${cls}" data-action="${action}" data-id="${esc(key)}">${cls.includes("primary")?ears():""}${t(label)}</button>`;
}
function submit(label="儲存") {
  return `<button type="submit" class="primary">${ears()}${t(label)}</button>`;
}
function field(label,html) {
  return `<label class="field">${t(label)}${html}</label>`;
}
function opts(list,value,translate=true) {
  return list.map(x=>`<option value="${esc(x)}" ${x===value?"selected":""}>${esc(translate?t(x):x)}</option>`).join("");
}
function head(label,description="",action="") {
  return `<div class="pagehead"><div><h1>${t(label)}</h1><p>${description}</p></div>${action}</div>`;
}
function empty() {
  return `<div class="empty">${ears()}<strong>${t("暫無記錄")}</strong><p>${esc(say("記低第一筆小日常啦～","记下第一笔小日常吧～","Start with one little moment."))}</p></div>`;
}
function modalHead(label) {
  return `<div class="dialog-head"><h2>${t(label)}</h2><button type="button" data-action="close" aria-label="Close">×</button></div>`;
}
function actions() {
  return `<div class="actions">${btn("取消","close")}${submit()}</div>`;
}
function show(html,wide=false) {
  const d=$("#modal");
  if(d.open)d.close();
  d.className=wide?"wide":"";
  d.innerHTML=html;
  d.showModal();
}
function notify(message) {
  clearTimeout(toastTimer);
  $("#toast").textContent=message;
  toastTimer=setTimeout(()=>$("#toast").textContent="",4500);
}
function avatar() {
  return S.profile.avatar?
    `<img class="avatar" src="${esc(S.profile.avatar)}" alt="${t("頭像")}">`:
    `<span class="avatar">${esc((S.profile.name||"B").slice(0,1))}</span>`;
}
function photos(images,kind,key,small=false) {
  if(!images.length)return "";
  return `<div class="${small?"thumbs":"post-photos "+(images.length===1?"one":"")}">${images.map((src,i)=>
    `<button type="button" class="photo" data-action="photo" data-kind="${kind}" data-id="${esc(key)}" data-index="${i}" aria-label="${t("查看")} ${t("照片")} ${i+1}">
    <img src="${esc(src)}" alt="${t("照片")} ${i+1}" loading="lazy"></button>`
  ).join("")}</div>`;
}
function table(list,limit=999) {
  if(!list.length)return empty();
  return `<div class="table-wrap"><table><thead><tr>${["日期","分類","備註","金額",""].map(k=>`<th>${t(k)}</th>`).join("")}</tr></thead><tbody>${
    [...list].sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created).slice(0,limit).map(e=>`
    <tr><td class="tiny">${esc(e.date)}</td><td><span class="tag">${t(e.category)}</span></td>
    <td class="record-note">${esc(e.note||"—")}${photos(e.images,"entry",e.id,true)}</td>
    <td class="money ${e.type}">${e.type==="income"?"+":"−"}${money(e.converted)}
    ${e.currency!==S.base?`<div class="tiny muted">${money(e.amount,e.currency)}</div>`:""}</td>
    <td><div class="row" style="justify-content:flex-end;gap:3px">${btn("查看","viewEntry",e.id)}${btn("編輯","editEntry",e.id)}${btn("刪除","deleteEntry",e.id,"quiet")}</div></td></tr>`
    ).join("")}</tbody></table></div>`;
}
function chart() {
  const n=new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate();
  const values=Array.from({length:n},(_,i)=>sum(records().filter(e=>Number(e.date.slice(8))===i+1),"expense"));
  const max=Math.max(...values,1);
  return `<div class="chart" role="img" aria-label="${t("每日支出")}">${values.map((v,i)=>
    `<i style="height:${v/max*150}px" title="${i+1}: ${money(v)}"></i>`).join("")}</div>
    <div class="chart-labels"><span>01</span><span>${month}</span><span>${n}</span></div>`;
}
/* ---------- Rabbit responses ---------- */
function reaction(type,amount,date,exclude="",done=false) {
  const prefix=done?say("記低咗喇！","记好啦！","All noted! "):"";
  if(!(amount>0))return {
    mood:"calm",
    message:say(
      "今日買咗啲咩呀？畀兔兔八卦下～我保證唔偷食你份甜品。",
      "今天买了什么呀？让兔兔八卦一下～我保证不偷吃你的甜点。",
      "What did you get today? Let your bunny be nosy. I promise not to nibble your dessert."
    )
  };
  if(type==="income")return amount>S.limits.income?{
    mood:"excited",
    message:prefix+say(
      "嘩！荷包食大餐喎！分少少畀願望罐，兔兔幫你睇實佢～",
      "哇！钱包吃大餐啦！分一点给愿望罐，兔兔替你看好它～",
      "Whoa! Your wallet had a feast. Pop a little in your wish jar—I’ll guard it!"
    )
  }:{
    mood:"happy",
    message:prefix+say(
      "有進帳！開心到耳仔都彈起咗～今日值得跳兩下！",
      "有进账！开心得耳朵都弹起来啦～今天值得蹦两下！",
      "Money in! My ears just perked up. That deserves a happy hop!"
    )
  };
  const key=date.slice(0,7),budget=S.budgets[key]?.total||0;
  const spent=sum(S.entries.filter(e=>e.id!==exclude&&e.date.startsWith(key)),"expense");
  if(budget&&spent+amount>budget)return {
    mood:"worried",
    message:prefix+say(
      `哎呀，今個月超咗 ${money(round(spent+amount-budget))}。唔使自責，必要嘅照記，我哋再慢慢調整。`,
      `哎呀，这个月超出 ${money(round(spent+amount-budget))}。别自责，必要的花费照实记，我们再慢慢调整。`,
      `Oops, ${money(round(spent+amount-budget))} over budget. No guilt—record what you need, then we’ll adjust.`
    )
  };
  if(amount>S.limits.expense)return {
    mood:"surprised",
    message:prefix+say(
      "咦，呢筆幾有份量喎！加張相啦，唔係我會以為你買咗成車紅蘿蔔。",
      "咦，这笔有点分量哦！加张照片吧，不然我会以为你买了一车胡萝卜。",
      "Ooh, a bigger purchase! Add a photo or I’ll assume you bought a truckload of carrots."
    )
  };
  if(budget&&spent+amount>=budget*.8)return {
    mood:"worried",
    message:prefix+say(
      "預算就快用晒喇～兔兔拉一拉你衫袖，提你留少少畀之後。",
      "预算快用完啦～兔兔拉拉你的衣角，提醒你给之后留一点。",
      "The budget’s getting snug! A tiny tug on your sleeve: leave some room for later."
    )
  };
  return {
    mood:"happy",
    message:prefix+say(
      "收到！小確幸你負責享受，啲數兔兔負責執整齊～",
      "收到！小确幸你负责享受，数字让兔兔整理～",
      "Got it! You enjoy the little joys; I’ll keep the numbers tidy."
    )
  };
}
function companion(r) {
  return `<div class="companion">${rabbit(r.mood)}<div><strong>${esc(S.pet?.name||"Bunny")}</strong><p>${esc(r.message)}</p></div>`;
}
/* ---------- First visit: name, then rabbit ---------- */
function onboarding(step=1) {
  if(step===1) {
    $("#content").innerHTML=`<section class="onboarding">
      ${rabbit("happy")}
      <div class="step-label">01 / 02 · NICE TO MEET YOU</div>
      <h1>${say("先認識你，好唔好？","先认识你，好不好？","First, what should I call you?")}</h1>
      <p class="muted">${say("留低你個名，兔兔先知點叫你嘛。","留下你的名字，兔兔才知道怎么叫你呀。","Your bunny would love to know your name.")}</p>
      <form id="nameForm" class="paper stack" style="max-width:430px;margin:25px auto;text-align:left">
      ${field("暱稱",`<input name="name" maxlength="30" required autocomplete="nickname" placeholder="${t("暱稱")}" value="${esc(onboardingName||S.profile.name)}">`)}
      ${field("語言",`<select name="lang">
      <option value="tc" ${S.lang==="tc"?"selected":""}>繁體中文 · 粵語</option>
      <option value="sc" ${S.lang==="sc"?"selected":""}>简体中文 · 普通话</option>
      <option value="en" ${S.lang==="en"?"selected":""}>English</option></select>`)}
      ${field("主要貨幣",`<select name="base">${opts(currencies,S.base,false)}</select>`)}
      ${submit("下一步")}</form></section>`;
    return;
  }
  petDraft=petDraft||{breed:0,coat:3,name:"Mochi",accessory:""};
  $("#content").innerHTML=`<section class="onboarding">
    <div class="step-label">02 / 02 · A LITTLE COMPANION</div>
    <h1>${esc(onboardingName)}${say("，揀個兔兔室友啦！","，选个兔兔室友吧！",", meet your little roommate!")}</h1>
    <p class="muted">${say("耳仔、毛色、名字，全部由你話事。","耳朵、毛色、名字，都由你决定。","Choose the ears, coat and name. This little one is yours.")}</p>
    <div class="paper" style="margin-top:25px">${petChoices(true)}</div></section>`;
}
function petChoices(first=false) {
  return `<div class="pet-grid">${breeds.map((b,i)=>`
    <button type="button" class="pet-choice ${petDraft.breed===i?"selected":""}" data-action="breed" data-id="${i}" data-first="${first}">
    ${rabbit("calm",{...petDraft,breed:i})}<strong>${t(b)}</strong></button>`).join("")}</div>
    <div class="swatches">${coats.map((c,i)=>`
    <button type="button" class="swatch ${petDraft.coat===i?"selected":""}" style="background:${c.fur}" data-action="coat" data-id="${i}" data-first="${first}" aria-label="Coat ${i+1}"></button>`).join("")}</div>
    <form id="petForm" data-first="${first}">
    ${field("兔兔名字",`<input name="name" id="petName" maxlength="24" required value="${esc(petDraft.name)}">`)}
    <div class="actions">${first?btn("取消","onboardingBack"):""}${submit(first?"開始我的手帳":"儲存")}</div></form>`;
}
function petDialog() {
  petDraft=structuredClone(S.pet);
  show(modalHead("更換兔兔")+petChoices(),true);
}
/* ---------- Page layouts ---------- */
function home() {
  const list=records(),inc=sum(list,"income"),out=sum(list,"expense"),budget=S.budgets[month]?.total||0;
  return `<section class="hero"><div><span class="tag">OUR LITTLE EVERYDAY</span>
    <h1>${esc(S.profile.name)}${say("，返嚟喇！","，回来啦！",", welcome home!")}</h1>
    <p>${esc(say(
      "兔兔幫你開好本手帳喇。記低今日嘅收支，順手留張相，之後翻睇就知嗰日做過啲咩。",
      "兔兔替你翻开手账啦。记下今天的收支，顺手留张照片，以后翻看就知道那天做了什么。",
      "Your journal is open. Record today’s money, tuck in a photo, and give this day a little place to stay."
    ))}</p><div class="hero-actions">${btn("新增記帳","newEntry","","primary")}<a href="feed.html">${t("生活圈")} →</a></div></div>${rabbit("happy")}</section>
    <div class="row between" style="margin-bottom:17px"><span class="small muted">${month}</span>${monthInput()}</div>
    <section class="metrics">${[["本月收入",inc],["本月支出",out],["本月結餘",round(inc-out)],["預算剩餘",budget?round(budget-out):null]].map(([k,v])=>`
    <div class="metric"><label>${t(k)}</label><strong>${v===null?"—":money(v)}</strong></div>`).join("")}</section>
    <div class="layout"><section class="paper"><div class="row between"><h2>${t("最近記錄")}</h2><a class="small" href="ledger.html">${t("查看")} →</a></div>${table(list,4)}</section>
    <div class="stack"><section class="paper"><h2>${t("每日支出")}</h2>${chart()}</section>
    <section class="paper"><a class="shortcut" href="goals.html">${jar()}<div><strong>${t("願望罐")}</strong><small>${S.goals.filter(g=>saved(g)>=g.target).length} / ${S.goals.length} ${t("已完成")}</small></div></a>
    <a class="shortcut" href="feed.html">${ears()}<div><strong>${t("生活圈")}</strong><small>${S.entries.length+S.posts.length} ${t("記帳")} / ${t("生活")}</small></div></a></section></div></div>`;
}
function monthInput() {
  return `<input class="month-input" id="monthInput" type="month" value="${month}" aria-label="Month">`;
}
function ledger() {
  const list=records().filter(e=>
    (!filters.type||e.type===filters.type)&&(!filters.category||e.category===filters.category)&&
    (e.note+" "+t(e.category)).toLowerCase().includes(filters.q.toLowerCase())
  );
  return head("收支手帳",t("帳目及照片會自動同步至生活圈。"),btn("新增記帳","newEntry","","primary"))+
    `<div class="filters"><input id="search" placeholder="${t("搜尋")}" value="${esc(filters.q)}">
    <select id="filterType"><option value="">${t("全部")}</option><option value="expense" ${filters.type==="expense"?"selected":""}>${t("支出")}</option><option value="income" ${filters.type==="income"?"selected":""}>${t("收入")}</option></select>
    <select id="filterCategory"><option value="">${t("全部")}</option>${opts([...new Set([...expenseCats,...incomeCats])],filters.category)}</select>
    ${monthInput()}${btn("匯出 CSV","csv")}</div><section class="paper">${table(list)}</section>`;
}
const products=[{name:"咖啡",price:30},{name:"筆記本",price:25},{name:"三明治",price:42}];
function productArt(i) {
  const drawings=[
    `<path d="M24 35h47v35q-23 20-47 0Z" fill="#fff9ef" stroke="#84634e" stroke-width="2"/><path d="M71 40h7q17 16-7 23" fill="none" stroke="#84634e" stroke-width="4"/><ellipse cx="47" cy="35" rx="23" ry="6" fill="#bd9477"/><path d="M39 27q-5-8 1-13m12 13q6-8 0-13" fill="none" stroke="#b79c8f" stroke-width="2"/><path d="M39 53q-6-17 0-16 6 0 5 16m7 0q-1-17 5-16 6 1 0 16" fill="#ecc1cd"/><ellipse cx="47" cy="61" rx="13" ry="10" fill="#ecc1cd"/><path d="M42 61h1m8 0h1m-6 5h3" stroke="#84634e" stroke-width="2"/>`,
    `<rect x="24" y="20" width="51" height="65" rx="7" fill="#dcb9ca" stroke="#896478" stroke-width="2"/><path d="M34 21v63M28 31h-9m9 13h-9m9 13h-9m9 13h-9" stroke="#896478" stroke-width="2"/><path d="M46 48q-8-21-1-20 7 1 7 20m5 0q1-21 8-20 6 1-1 20" fill="#fff8ef"/><ellipse cx="54" cy="57" rx="15" ry="12" fill="#fff8ef"/><path d="M49 56h1m8 0h1m-7 6h3" stroke="#896478" stroke-width="2"/>`,
    `<path d="M17 72 48 21q3-4 6 0l31 51Z" fill="#efd0a0" stroke="#94734e" stroke-width="2"/><path d="m22 69 30-42 27 42Z" fill="#fff4d7"/><path d="M19 74h64" stroke="#9bb785" stroke-width="8" stroke-linecap="round"/><path d="M23 81h57" stroke="#dea494" stroke-width="5" stroke-linecap="round"/><path d="M43 55h1m14 0h1m-10 8q4 4 8 0" fill="none" stroke="#94734e" stroke-width="2"/>`
  ];
  return `<svg viewBox="0 0 100 100" role="img" aria-label="${t(products[i].name)}"><rect x="3" y="3" width="94" height="94" rx="25" fill="var(--soft)"/>${drawings[i]}</svg>`;
}
function cartTotal(s=S) {
  const subtotal=round(s.cart.reduce((n,c)=>n+Math.round(c.price*100)*c.qty,0)/100);
  return {subtotal,total:Math.max(0,round(round(subtotal*(1-s.shop.discount/100))-s.shop.coupon))};
}
function shopping() {
  const v=cartTotal();
  return head("購物清單",S.base,btn("自訂商品","customProduct","","primary"))+
    `<div class="layout"><div class="stack"><section class="paper">${products.map((p,i)=>`
    <div class="product">${productArt(i)}<div class="detail"><strong>${t(p.name)}</strong><div class="small muted money">${money(Math.max(.01,round(p.price*S.rates.HKD)))}</div></div>${btn("加入","addProduct",i)}</div>`).join("")}</section>
    <section class="paper">${S.cart.length?S.cart.map(c=>`
    <div class="product"><div class="detail"><strong>${esc(c.name)}</strong><div class="small muted money">${money(c.price)}</div></div>
    <input type="number" data-qty="${c.id}" min="1" max="999" step="1" value="${c.qty}" aria-label="${t("數量")}">
    <span class="money">${money(round(c.price*c.qty))}</span>${btn("刪除","deleteCart",c.id,"quiet")}</div>`).join(""):empty()}</section></div>
    <div class="stack" style="align-self:start">${companion(reaction("expense",v.total,today()))}
    <section class="paper"><h2>${t("應付總額")}</h2><div class="total-price">${money(v.total)}</div><div class="stack">
    ${field("折扣百分比",`<input data-shop="discount" type="number" min="0" max="100" step=".01" value="${S.shop.discount}">`)}
    ${field("優惠金額",`<input data-shop="coupon" type="number" min="0" max="999999999" step=".01" value="${S.shop.coupon}">`)}
    ${field("購物預算",`<input data-shop="budget" type="number" min="0" max="999999999" step=".01" value="${S.shop.budget}">`)}</div>
    <hr><p class="small">${t("小計")}: ${money(v.subtotal)}</p>
    ${S.shop.budget?`<p class="small">${t("預算剩餘")}: ${money(round(S.shop.budget-v.total))}</p>`:""}
    <p class="tiny muted">${t("先打折，再扣優惠金額。")}</p>${btn("確認購買並記帳","purchase","","primary")}</section></div></div>`;
}
function analytics() {
  const list=records(),out=sum(list,"expense");
  const cats=expenseCats.map(k=>({k,v:sum(list.filter(e=>e.category===k),"expense")})).sort((a,b)=>b.v-a.v);
  const [y,m]=month.split("-").map(Number),days=new Date(y,m,0).getDate(),offset=(new Date(y,m-1,1).getDay()+6)%7;
  return head("消費分析",money(out),monthInput())+
    `<div class="layout"><div class="stack"><section class="paper"><h2>${t("每日支出")}</h2>${chart()}</section>
    <section class="paper"><h2>${t("消費日曆")}</h2><div class="heat">${Array(offset).fill("<span></span>").join("")}${Array.from({length:days},(_,i)=>{
      const v=sum(list.filter(e=>Number(e.date.slice(8))===i+1),"expense");
      return `<button data-action="day" data-id="${i+1}" style="background:${v?"var(--soft)":"white"}">${i+1}<small>${v?v.toFixed(0):"·"}</small></button>`;
    }).join("")}</div></section></div>
    <section class="paper" style="align-self:start"><h2>${t("分類分布")}</h2>${cats.map(c=>`
    <div class="category"><div class="row between"><span>${t(c.k)}</span><strong class="money">${money(c.v)}</strong></div>
    <div class="progress"><i style="width:${out?c.v/out*100:0}%"></i></div><span class="tiny muted">${out?(c.v/out*100).toFixed(1):0}%</span></div>`).join("")}</section></div>`;
}
function goals() {
  const b=S.budgets[month]||{total:0,categories:{}},out=sum(records(),"expense");
  return head("願望罐",t("儲蓄投入不計入消費支出。"),btn("新增願望","newGoal","","primary"))+
    `<div class="layout"><section class="paper" style="align-self:start"><div class="row between"><h2>${t("本月預算")}</h2>${monthInput()}</div>
    <div class="total-price">${money(b.total)}</div><div class="progress"><i style="width:${b.total?Math.min(100,out/b.total*100):0}%"></i></div>
    <p class="small">${t("預算剩餘")}: ${money(round(b.total-out))}</p>${btn("調整預算","budget")}
    <hr><h3>${t("分類預算")}</h3>${expenseCats.map(k=>{
      const v=sum(records().filter(e=>e.category===k),"expense"),limit=b.categories[k]||0;
      return `<div class="category"><div class="row between"><span>${t(k)}</span><span class="tiny money">${money(v)} / ${limit?money(limit):"—"}</span></div><div class="progress"><i style="width:${limit?Math.min(100,v/limit*100):0}%"></i></div></div>`;
    }).join("")}</section>
    <div class="stack" style="align-self:start">${S.goals.map(g=>{
      const v=saved(g);
      return `<section class="paper"><div class="row">${jar()}<div><h2 style="margin:0">${esc(g.name)}</h2><span class="tag">${v>=g.target?t("已完成"):esc(g.deadline)}</span></div></div>
      <div class="total-price" style="font-size:26px">${money(v)} <span class="tiny muted">/ ${money(g.target)}</span></div>
      <div class="progress"><i style="width:${Math.min(100,v/g.target*100)}%"></i></div>
      <div class="row">${btn("存一點","contribute",g.id,"primary")}${v>=g.target?btn("分享達標","shareGoal",g.id):""}${btn("刪除","deleteGoal",g.id,"quiet")}</div></section>`;
    }).join("")||`<section class="paper">${empty()}</section>`}</div></div>`;
}
function feed() {
  const items=[
    ...S.entries.map(e=>({kind:"entry",data:e})),
    ...S.posts.map(p=>({kind:"post",data:p}))
  ].filter(x=>feedFilter==="all"||(feedFilter==="entry"?x.kind==="entry":x.kind==="post"))
   .sort((a,b)=>b.data.created-a.data.created);
  return `<div class="feed-shell">
    <div class="feed-cover"><i class="cover-ear"></i><i class="cover-ear second"></i>
    <div class="cover-text"><strong>${say("把小日子<br>收進口袋。","把小日子<br>收进口袋。","Little days.<br>Lovely memories.")}</strong><small>OUR LITTLE MOMENTS</small></div>${rabbit("happy")}</div>
    <section class="feed-profile"><div>${avatar()}<h2>${esc(S.profile.name)}</h2><p>${esc(S.profile.bio||say("同兔兔一齊，記住生活嘅小事。","和兔兔一起，记住生活的小事。","Little memories, with my bunny."))}</p></div>${btn("發布動態","newPost","","primary")}</section>
    <div class="feed-tabs">${[["all","全部"],["entry","記帳"],["post","生活"]].map(([k,label])=>btn(label,"feedFilter",k,feedFilter===k?"selected":"")).join("")}</div>
    <section class="timeline">${items.map(item=>{
      const p=item.data,isEntry=item.kind==="entry";
      return `<article class="post">${avatar()}<div>
      <div class="row between"><strong class="post-name">${esc(S.profile.name)}</strong><span class="tag">${t(isEntry?p.category:"生活")}</span></div>
      ${isEntry?`<div class="post-amount ${p.type}">${p.type==="income"?"+":"−"}${money(p.converted)}</div>${p.currency!==S.base?`<span class="tiny muted">${money(p.amount,p.currency)}</span>`:""}`:""}
      <p>${esc(isEntry?p.note:p.text)}</p>
      ${p.milestone?`<div class="milestone">${jar()}<strong>${esc(p.milestone.name)}</strong>${p.milestone.show?money(p.milestone.amount,p.milestone.currency):t("已完成")}</div>`:""}
      ${photos(p.images,item.kind,p.id)}
      ${isEntry?`<div class="post-bunny">${esc(S.pet.name)} · ${esc(p.type==="income"?say("呢筆進帳，兔兔記得實一實！","这笔进账，兔兔记得牢牢的！","A little win, safely recorded!"):say("相同帳收好咗，之後慢慢翻睇啦～","照片和账收好啦，以后慢慢翻看～","Photos and numbers, tucked away together."))}</div>`:""}
      <div class="post-foot"><span class="tiny muted">${esc(p.date)}</span><div class="row" style="gap:2px">
      ${btn("編輯",isEntry?"editEntry":"editPost",p.id,"quiet")}${btn("刪除",isEntry?"deleteEntry":"deletePost",p.id,"quiet")}</div></div>
      </div></article>`;
    }).join("")||empty()}</section>
    <p class="tiny muted" style="text-align:center;margin-top:18px">${t("這是本機生活圈，沒有發布到網上。")}</p></div>`;
}
function settings() {
  const complete=S.goals.some(g=>saved(g)>=g.target);
  return head("設定")+
    `<div class="layout"><div class="stack"><section class="paper"><h2>${t("暱稱")} & ${t("個人簡介")}</h2>
    <form id="profileForm" class="stack">
    ${field("暱稱",`<input name="name" maxlength="30" required value="${esc(S.profile.name)}">`)}
    ${field("個人簡介",`<textarea name="bio" maxlength="300">${esc(S.profile.bio)}</textarea>`)}
    ${field("頭像",'<input name="avatar" type="file" accept="image/*">')}
    <div class="two">${field("語言",`<select name="lang"><option value="tc" ${S.lang==="tc"?"selected":""}>繁體中文 · 粵語</option><option value="sc" ${S.lang==="sc"?"selected":""}>简体中文 · 普通话</option><option value="en" ${S.lang==="en"?"selected":""}>English</option></select>`)}
    ${field("主要貨幣",`<select name="base" ${hasFinancial(S)?"disabled":""}>${opts(currencies,S.base,false)}</select>`)}</div>
    <p class="tiny muted">${t("有財務資料後，主要貨幣會鎖定。")}</p><div>${submit()}</div></form></section>
    <section class="paper"><h2>${t("參考匯率")}</h2><p class="small muted">${t("示範匯率並非即時報價，舊帳保留原有匯率。")}</p>
    <details><summary style="cursor:pointer">1 → ${S.base}</summary><form id="ratesForm" style="margin-top:20px"><div class="two">
    ${currencies.filter(c=>c!==S.base).map(c=>field(c,`<input name="${c}" type="number" min=".00000001" max="100000000" step="any" required value="${S.rates[c]}">`)).join("")}</div><div class="actions">${submit()}</div></form></details></section></div>
    <div class="stack" style="align-self:start"><section class="paper"><div class="row between"><h2>${esc(S.pet.name)}</h2>${btn("更換兔兔","pet","","quiet")}</div>${rabbit("happy")}
    <form id="petSettings" class="stack">
    ${field("配飾",`<select name="accessory"><option value="">${t("沒有")}</option><option value="bow" ${S.entries.length<5?"disabled":""} ${S.pet.accessory==="bow"?"selected":""}>${t("蝴蝶結")}</option><option value="scarf" ${!complete?"disabled":""} ${S.pet.accessory==="scarf"?"selected":""}>${t("圍巾")}</option></select>`)}
    <p class="tiny muted">${t("五筆記帳解鎖蝴蝶結；完成願望解鎖圍巾。")}</p>
    ${field("大額支出門檻",`<input name="expense" type="number" min=".01" max="999999999" step=".01" required value="${S.limits.expense}">`)}
    ${field("大額收入門檻",`<input name="income" type="number" min=".01" max="999999999" step=".01" required value="${S.limits.income}">`)}
    <span class="tiny muted">${S.base}</span><div>${submit()}</div></form></section>
    <section class="paper"><h2>${t("匯出備份")}</h2><p class="small muted">${t("請定期備份，清除瀏覽器資料可能令記錄遺失。")}</p>
    <div class="row">${btn("匯出備份","backup")}${btn("恢復備份","restore")}${btn("匯出 CSV","csv")}</div></section></div></div>`;
}
/* ---------- Storage ---------- */
function readState() {
  return new Promise((resolve,reject)=>{
    const tr=db.transaction("data","readonly"),r=tr.objectStore("data").get("main");
    tr.oncomplete=()=>resolve(r.result);
    tr.onerror=()=>reject(tr.error);
  });
}
function change(fn) {
  queue=queue.then(async()=>{
    const next=await new Promise((resolve,reject)=>{
      const tr=db.transaction("data","readwrite"),store=tr.objectStore("data"),r=store.get("main");
      let result;
      r.onsuccess=()=>{
        try {
          result=r.result||structuredClone(S);
          fn(result);
          if(!valid(result))throw Error("Invalid data");
          store.put(result,"main");
        } catch(e) {tr.abort();reject(e);}
      };
      tr.oncomplete=()=>resolve(result);
      tr.onerror=()=>reject(tr.error);
      tr.onabort=()=>reject(tr.error||Error("Aborted"));
    });
    S=next;render();channel?.postMessage("updated");return true;
  }).catch(e=>{console.error(e);notify(t("儲存失敗"));return false;});
  return queue;
}
function render() {
  const coat=coats[S.pet?.coat??3];
  document.documentElement.style.setProperty("--accent",coat.accent);
  document.documentElement.style.setProperty("--soft",coat.soft);
  document.documentElement.lang={tc:"zh-Hant",sc:"zh-Hans",en:"en"}[S.lang];
  $("#brandMark").innerHTML=ears();
  $("#nav").innerHTML=nav.map(([key,url,label],i)=>
    `<a href="${url}" class="${key===page?"active":""}" ${key===page?'aria-current="page"':""}>${navIcon(i)}${t(label)}</a>`
  ).join("");
  $("#headerAvatar").innerHTML=avatar();
  $("#footerNote").textContent=t("請定期備份，清除瀏覽器資料可能令記錄遺失。");
  $("#nav").hidden=!S.ready;
  if(!S.ready) {
    onboarding(1);
    return;
  }
  const views={home,ledger,shopping,analytics,goals,feed,settings};
  $("#content").innerHTML=(views[page]||home)();
}
async function refresh() {
  if(!db||$("#modal")?.open||$("#viewer")?.open||!S?.ready)return;
  const data=await readState();
  if(data&&valid(data)){S=data;render();}
}
if(channel)channel.onmessage=()=>refresh().catch(console.error);
window.addEventListener("focus",()=>refresh().catch(console.error));
/* ---------- Record and post editors ---------- */
function editEntry(key="") {
  const e=S.entries.find(x=>x.id===key),type=e?.type||"expense";
  previewImages=[];previewToken++;
  show(modalHead(e?"編輯":"新增記帳")+`<form id="entryForm" data-id="${esc(key)}">
    <div class="entry-layout"><div class="stack"><div class="two">
    ${field("類型",`<select name="type" id="entryType"><option value="expense" ${type==="expense"?"selected":""}>${t("支出")}</option><option value="income" ${type==="income"?"selected":""}>${t("收入")}</option></select>`)}
    ${field("日期",`<input name="date" type="date" required value="${e?.date||today()}">`)}
    ${field("金額",`<input name="amount" type="number" min=".01" max="999999999" step=".01" required inputmode="decimal" placeholder="0.00" value="${e?.amount||""}">`)}
    ${field("貨幣",`<select name="currency">${opts(currencies,e?.currency||S.base,false)}</select>`)}</div>
    <div class="tiny muted" id="conversion"></div>
    ${field("分類",`<select name="category" id="entryCategory">${opts(type==="income"?incomeCats:expenseCats,e?.category)}</select>`)}
    ${field("備註",`<input name="note" maxlength="200" value="${esc(e?.note||"")}">`)}
    ${field("照片",'<input name="images" type="file" accept="image/*" multiple>')}
    <span class="tiny muted">${t("最多三張照片，每張上限 8 MB。")}</span>
    ${e?.images.length?photos(e.images,"entry",e.id,true)+`<label class="small"><input name="remove" type="checkbox"> ${t("移除原有照片")}</label><span class="tiny muted">${t("新照片會取代原有照片。")}</span>`:""}
    <div id="uploadPreview" class="thumbs"></div>
    <div class="notice">${t("帳目及照片會自動同步至生活圈。")}</div></div>
    <div class="entry-pet"><div class="stage" id="liveRabbit"></div><div><strong class="small">${esc(S.pet.name)}</strong><p id="liveSpeech" role="status" aria-live="polite"></p></div></div>
    </div>${actions()}</form>`,true);
  updateReaction();
}
function entryRate(f) {
  const old=S.entries.find(e=>e.id===f.dataset.id),currency=f.elements.currency.value;
  return old?.currency===currency?old.rate:S.rates[currency];
}
function updateReaction() {
  const f=$("#entryForm");if(!f)return;
  const amount=round(Number(f.elements.amount.value||0)*entryRate(f));
  const r=reaction(f.elements.type.value,amount,f.elements.date.value||today(),f.dataset.id);
  $("#liveRabbit").innerHTML=rabbit(r.mood);
  $("#liveSpeech").textContent=r.message;
  $("#conversion").textContent=f.elements.currency.value===S.base?S.base:t("自動折算")+": "+money(amount);
}
function viewEntry(key) {
  const e=S.entries.find(x=>x.id===key);if(!e)return;
  show(modalHead("記帳")+`<span class="tag">${t(e.category)}</span><h2 style="margin-top:13px">${esc(e.note||t(e.category))}</h2>
    <p class="tiny muted">${esc(e.date)}</p><div class="total-price ${e.type}">${e.type==="income"?"+":"−"}${money(e.converted)}</div>
    <p class="small muted">${money(e.amount,e.currency)} · ${t("參考匯率")} ${e.rate}</p>
    ${e.items?e.items.map(i=>`<p class="small">${esc(i.name)} × ${i.qty} · ${money(i.price)}</p>`).join(""):""}
    ${photos(e.images,"entry",e.id)}<div class="actions">${btn("編輯","editEntry",e.id,"primary")}</div>`);
}
function editPost(key="") {
  const p=S.posts.find(x=>x.id===key);
  previewImages=[];previewToken++;
  show(modalHead(p?"編輯":"發布動態")+`<form id="postForm" data-id="${esc(key)}" class="stack">
    ${field("內容",`<textarea name="text" maxlength="2000">${esc(p?.text||"")}</textarea>`)}
    ${field("照片",'<input name="images" type="file" accept="image/*" multiple>')}
    <span class="tiny muted">${t("最多三張照片，每張上限 8 MB。")} ${t("新照片會取代原有照片。")}</span>
    ${p?.images.length?photos(p.images,"post",p.id,true)+`<label class="small"><input name="remove" type="checkbox"> ${t("移除原有照片")}</label>`:""}
    <div id="uploadPreview" class="thumbs"></div>
    ${p?.milestone?`<label class="small"><input name="hide" type="checkbox" ${!p.milestone.show?"checked":""}> ${t("隱藏金額")}</label>`:""}
    ${actions()}</form>`);
}
function budgetDialog() {
  const b=S.budgets[month]||{total:0,categories:{}};
  show(modalHead("調整預算")+`<form id="budgetForm"><p class="small muted">${month} · ${S.base}</p>
    ${field("本月預算",`<input name="total" type="number" min="0" max="999999999" step=".01" required value="${b.total}">`)}
    <hr><div class="two">${expenseCats.map(k=>field(k,`<input name="${k}" type="number" min="0" max="999999999" step=".01" required value="${b.categories[k]||0}">`)).join("")}</div>${actions()}</form>`);
}
function success(r) {
  show(modalHead("已儲存")+companion(r)+`<p class="small muted" style="margin-top:17px">${t("帳目及照片會自動同步至生活圈。")}</p>
    <div class="actions"><a href="feed.html">${t("生活圈")} →</a>${btn("關閉","close")}</div>`);
}
/* ---------- Photos ---------- */
async function readImages(files,max=3) {
  if(files.length>max)throw Error(t("最多三張照片，每張上限 8 MB。"));
  return Promise.all([...files].map(file=>new Promise((resolve,reject)=>{
    if(!file.type.startsWith("image/"))return reject(Error(t("請選擇有效圖片")));
    if(file.size>8*1024*1024)return reject(Error(t("最多三張照片，每張上限 8 MB。")));
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      try {
        const scale=Math.min(1,1600/Math.max(img.width,img.height)),canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.width*scale));
        canvas.height=Math.max(1,Math.round(img.height*scale));
        const ctx=canvas.getContext("2d");
        ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL("image/jpeg",.86));
      }catch(e){reject(e);}
      finally{URL.revokeObjectURL(url);}
    };
    img.onerror=()=>{URL.revokeObjectURL(url);reject(Error(t("請選擇有效圖片")));};
    img.src=url;
  })));
}
function drawGallery() {
  $("#viewer").innerHTML=`<div class="row between"><span>${photoIndex+1} / ${gallery.length}</span>${btn("關閉","viewerClose")}</div>
    <img src="${esc(gallery[photoIndex])}" alt="${t("照片")} ${photoIndex+1}">
    <div class="row between" style="margin-top:12px">
    <button type="button" data-action="prevPhoto" ${photoIndex===0?"disabled":""} aria-label="Previous photo">←</button>
    <span class="tiny">← / →</span>
    <button type="button" data-action="nextPhoto" ${photoIndex===gallery.length-1?"disabled":""} aria-label="Next photo">→</button></div>`;
}
function openGallery(images,index) {
  if(!images?.length)return;
  gallery=images;photoIndex=index;drawGallery();
  if(!$("#viewer").open)$("#viewer").showModal();
}
document.addEventListener("keydown",e=>{
  if(!$("#viewer")?.open)return;
  if(e.key==="ArrowLeft"&&photoIndex>0){photoIndex--;drawGallery();e.preventDefault();}
  if(e.key==="ArrowRight"&&photoIndex<gallery.length-1){photoIndex++;drawGallery();e.preventDefault();}
});
/* ---------- Actions ---------- */
document.addEventListener("click",async ev=>{
  const el=ev.target.closest("[data-action]");if(!el)return;
  const a=el.dataset.action,key=el.dataset.id;
  if(a==="close"){$("#modal").close();return;}
  if(a==="viewerClose"){$("#viewer").close();return;}
  if(a==="prevPhoto"&&photoIndex>0){photoIndex--;drawGallery();return;}
  if(a==="nextPhoto"&&photoIndex<gallery.length-1){photoIndex++;drawGallery();return;}
  if(a==="previewPhoto"){openGallery(previewImages,Number(el.dataset.index));return;}
  if(a==="photo"){
    const item=(el.dataset.kind==="entry"?S.entries:S.posts).find(x=>x.id===key);
    openGallery(item?.images,Number(el.dataset.index));return;
  }
  if(a==="onboardingBack"){onboarding(1);return;}
  if(a==="breed"||a==="coat"){
    if($("#petName"))petDraft.name=$("#petName").value;
    if(a==="breed")petDraft.breed=Number(key);else petDraft.coat=Number(key);
    if(el.dataset.first==="true")onboarding(2);
    else show(modalHead("更換兔兔")+petChoices(),true);
    return;
  }
  if(a==="pet"){petDialog();return;}
  if(a==="newEntry"||a==="editEntry"){editEntry(key);return;}
  if(a==="viewEntry"){viewEntry(key);return;}
  if(a==="newPost"||a==="editPost"){editPost(key);return;}
  if(a==="feedFilter"){feedFilter=key;render();return;}
  if(a==="budget"){budgetDialog();return;}
  if(["deleteEntry","deletePost","deleteGoal","deleteCart"].includes(a)){
    if(a!=="deleteCart"&&!confirm(t("確定刪除？")))return;
    const prop={deleteEntry:"entries",deletePost:"posts",deleteGoal:"goals",deleteCart:"cart"}[a];
    const ok=await change(s=>{s[prop]=s[prop].filter(x=>x.id!==key);});
    if(ok&&$("#modal").open)$("#modal").close();
    return;
  }
  if(a==="addProduct"){
    const p=products[Number(key)];
    const item={id:uid(),name:t(p.name),price:Math.max(.01,round(p.price*S.rates.HKD)),qty:1};
    await change(s=>{s.cart.push(item);});return;
  }
  if(a==="customProduct"){
    show(modalHead("自訂商品")+`<form id="productForm" class="stack">
      ${field("商品名稱",'<input name="name" maxlength="80" required>')}
      ${field("單價",'<input name="price" type="number" min=".01" max="99999999" step=".01" required>')}
      ${field("數量",'<input name="qty" type="number" min="1" max="999" step="1" value="1" required>')}
      ${actions()}</form>`);return;
  }
  if(a==="purchase"){
    if(!S.cart.length||cartTotal().total<=0){notify(t("金額必須大於零"));return;}
    el.disabled=true;
    let feedback;
    const ok=await change(s=>{
      if(!s.cart.length)throw Error("Empty cart");
      const amount=cartTotal(s).total;
      if(amount<=0)throw Error("Invalid total");
      feedback=reaction("expense",amount,today(),"",true);
      s.entries.push({
        id:uid(),created:Date.now(),date:today(),type:"expense",category:"購物",
        note:t("購物清單"),amount,currency:s.base,rate:1,converted:amount,
        images:[],items:structuredClone(s.cart)
      });
      s.cart=[];s.shop={discount:0,coupon:0,budget:0};
    });
    if(ok)success(feedback);else el.disabled=false;
    return;
  }
  if(a==="newGoal"){
    show(modalHead("新增願望")+`<form id="goalForm" class="stack">
      ${field("願望名稱",'<input name="name" maxlength="60" required>')}
      ${field("目標金額",'<input name="target" type="number" min=".01" max="999999999" step=".01" required>')}
      ${field("目標日期",`<input name="deadline" type="date" min="${today()}" required>`)}
      ${actions()}</form>`);return;
  }
  if(a==="contribute"){
    show(modalHead("存一點")+`<form id="contributionForm" data-id="${esc(key)}">
      ${field("金額",'<input name="amount" type="number" min=".01" max="999999999" step=".01" required>')}
      ${actions()}</form>`);return;
  }
  if(a==="shareGoal"){
    show(modalHead("分享達標")+`<form id="shareForm" data-id="${esc(key)}">
      <label class="small"><input name="hide" type="checkbox" checked> ${t("隱藏金額")}</label>${actions()}</form>`);return;
  }
  if(a==="day"){
    const date=month+"-"+String(key).padStart(2,"0");
    show(modalHead("收支手帳")+`<p class="small muted">${date}</p>${table(S.entries.filter(e=>e.date===date))}`,true);return;
  }
  if(a==="backup"){download(JSON.stringify(S,null,2),"bunny-backup-"+today()+".json","application/json");return;}
  if(a==="restore"){$("#restoreFile").click();return;}
  if(a==="csv"){exportCSV();return;}
});
document.addEventListener("input",ev=>{
  const el=ev.target;
  if(el.closest("#entryForm")&&["amount","date","type","currency"].includes(el.name))updateReaction();
  if(el.id==="search"){
    const pos=el.selectionStart;filters.q=el.value;render();
    $("#search").focus();$("#search").setSelectionRange(pos,pos);
  }
});
document.addEventListener("change",async ev=>{
  const el=ev.target;
  if(el.id==="monthInput"){month=el.value||today().slice(0,7);render();}
  if(el.id==="filterType"){filters.type=el.value;render();}
  if(el.id==="filterCategory"){filters.category=el.value;render();}
  if(el.id==="entryType"){
    $("#entryCategory").innerHTML=opts(el.value==="income"?incomeCats:expenseCats);
    updateReaction();
  }
  if(el.closest("#entryForm")&&["currency","date"].includes(el.name))updateReaction();
  if(el.name==="images"&&$("#uploadPreview")){
    const token=++previewToken;
    try {
      const images=await readImages(el.files);
      if(token!==previewToken||!el.isConnected)return;
      previewImages=images;
      $("#uploadPreview").innerHTML=images.map((src,i)=>`
        <button type="button" class="photo" data-action="previewPhoto" data-index="${i}" aria-label="${t("查看")} ${t("照片")} ${i+1}">
        <img src="${esc(src)}" alt="${t("照片")} ${i+1}"></button>`).join("");
    } catch(e) {
      notify(e.message);el.value="";previewImages=[];$("#uploadPreview").innerHTML="";
    }
  }
  if(el.dataset.qty){
    if(!el.checkValidity()){el.reportValidity();return;}
    const key=el.dataset.qty,qty=Number(el.value);
    await change(s=>{const c=s.cart.find(x=>x.id===key);if(c)c.qty=qty;});
  }
  if(el.dataset.shop){
    if(!el.checkValidity()){el.reportValidity();return;}
    const key=el.dataset.shop,value=round(el.value);
    await change(s=>{s.shop[key]=value;});
  }
});
document.addEventListener("submit",async ev=>{
  const f=ev.target;ev.preventDefault();
  const submitButton=f.querySelector('[type="submit"]');
  if(submitButton)submitButton.disabled=true;
  const fd=new FormData(f);
  let ok=false,feedback=null;
  try {
    if(f.id==="nameForm"){
      onboardingName=String(fd.get("name")).trim();
      if(!onboardingName)throw Error(t("暱稱"));
      S.lang=fd.get("lang");
      const base=fd.get("base");
      S.base=base;
      S.rates=Object.fromEntries(currencies.map(c=>[c,Number((reference[base]/reference[c]).toFixed(8))]));
      S.limits={
        expense:Math.max(.01,round(500*reference[base]/reference.HKD)),
        income:Math.max(.01,round(3000*reference[base]/reference.HKD))
      };
      onboarding(2);
      return;
    }
    if(f.id==="petForm"){
      const first=f.dataset.first==="true";
      const pet={...petDraft,name:String(fd.get("name")).trim()||"Mochi"};
      const profileName=onboardingName;
      ok=await change(s=>{
        s.pet=pet;
        if(first){
          s.profile.name=profileName;
          s.lang=S.lang;s.base=S.base;s.rates=structuredClone(S.rates);
          s.limits=structuredClone(S.limits);s.ready=true;
        }
      });
    }
    if(f.id==="entryForm"){
      const old=S.entries.find(e=>e.id===f.dataset.id);
      const amount=round(fd.get("amount")),rate=entryRate(f),converted=round(amount*rate);
      if(!(amount>0&&converted>0&&converted<1e12))throw Error(t("金額必須大於零"));
      const images=await readImages(f.elements.images.files);
      const entry={
        ...old,id:old?.id||uid(),created:old?.created||Date.now(),
        date:fd.get("date"),type:fd.get("type"),category:fd.get("category"),
        note:String(fd.get("note")).trim(),amount,currency:fd.get("currency"),rate,converted,
        images:images.length?images:fd.get("remove")?[]:old?.images||[]
      };
      feedback=reaction(entry.type,converted,entry.date,old?.id||"",true);
      ok=await change(s=>{
        const i=s.entries.findIndex(e=>e.id===entry.id);
        if(i<0)s.entries.push(entry);else s.entries[i]=entry;
      });
      if(ok){month=entry.date.slice(0,7);render();}
    }
    if(f.id==="postForm"){
      const old=S.posts.find(p=>p.id===f.dataset.id),images=await readImages(f.elements.images.files);
      const post={
        ...old,id:old?.id||uid(),created:old?.created||Date.now(),date:old?.date||today(),
        text:String(fd.get("text")).trim(),
        images:images.length?images:fd.get("remove")?[]:old?.images||[]
      };
      if(post.milestone)post.milestone={...post.milestone,show:!fd.get("hide")};
      if(!post.text&&!post.images.length&&!post.milestone)throw Error(t("請先填寫內容或加入照片"));
      ok=await change(s=>{
        const i=s.posts.findIndex(p=>p.id===post.id);
        if(i<0)s.posts.push(post);else s.posts[i]=post;
      });
    }
    if(f.id==="budgetForm"){
      const budget={total:round(fd.get("total")),categories:{}},key=month;
      expenseCats.forEach(k=>{budget.categories[k]=round(fd.get(k));});
      ok=await change(s=>{s.budgets[key]=budget;});
    }
    if(f.id==="productForm"){
      const item={id:uid(),name:String(fd.get("name")).trim(),price:round(fd.get("price")),qty:Number(fd.get("qty"))};
      ok=await change(s=>{s.cart.push(item);});
    }
    if(f.id==="goalForm"){
      const goal={id:uid(),name:String(fd.get("name")).trim(),target:round(fd.get("target")),deadline:fd.get("deadline"),contributions:[]};
      ok=await change(s=>{s.goals.push(goal);});
    }
    if(f.id==="contributionForm"){
      const key=f.dataset.id,amount=round(fd.get("amount"));
      ok=await change(s=>{
        const goal=s.goals.find(g=>g.id===key);
        if(!goal)throw Error("Missing goal");
        goal.contributions.push({id:uid(),date:today(),amount});
      });
      if(ok){
        const goal=S.goals.find(g=>g.id===key);
        feedback={
          mood:saved(goal)>=goal.target?"excited":"happy",
          message:saved(goal)>=goal.target?
          say("願望實現咗！兔兔轉咗三個圈，小圍巾都解鎖喇～","愿望实现啦！兔兔转了三个圈，小围巾也解锁啦～","Wish fulfilled! Three happy bunny spins—and your scarf is unlocked!"):
          say("又存多啲喇！兔兔幫你睇實，唔會拎去買紅蘿蔔㗎～","又存下一点啦！兔兔替你看好，不会拿去买胡萝卜～","Another little bit saved! I’ll guard it. No secret carrot shopping!")
        };
      }
    }
    if(f.id==="shareForm"){
      const goal=S.goals.find(g=>g.id===f.dataset.id);
      if(!goal||saved(goal)<goal.target)throw Error(t("暫無記錄"));
      const post={
        id:uid(),created:Date.now(),date:today(),text:"",images:[],
        milestone:{name:goal.name,amount:saved(goal),currency:S.base,show:!fd.get("hide")}
      };
      ok=await change(s=>{s.posts.push(post);});
    }
    if(f.id==="profileForm"){
      const images=await readImages(f.elements.avatar.files,1);
      const base=fd.get("base")||S.base;
      const profile={name:String(fd.get("name")).trim(),bio:String(fd.get("bio")).trim(),avatar:images[0]||S.profile.avatar};
      ok=await change(s=>{
        s.profile=profile;s.lang=fd.get("lang");
        if(base!==s.base){
          if(hasFinancial(s))throw Error("Currency locked");
          const ratio=s.rates[base];
          s.limits={
            expense:Math.max(.01,round(s.limits.expense/ratio)),
            income:Math.max(.01,round(s.limits.income/ratio))
          };
          s.rates=Object.fromEntries(currencies.map(c=>[c,Math.max(.00000001,Number((s.rates[c]/ratio).toFixed(8)))]));
          s.base=base;s.rates[base]=1;
          s.shop={discount:0,coupon:0,budget:0};
        }
      });
    }
    if(f.id==="petSettings"){
      const limits={expense:round(fd.get("expense")),income:round(fd.get("income"))};
      const accessory=fd.get("accessory")||"";
      ok=await change(s=>{s.limits=limits;s.pet.accessory=accessory;});
    }
    if(f.id==="ratesForm"){
      const rates={[S.base]:1};
      currencies.filter(c=>c!==S.base).forEach(c=>{rates[c]=Number(fd.get(c));});
      ok=await change(s=>{s.rates=rates;});
    }
    if(ok){
      if($("#modal").open)$("#modal").close();
      if(feedback)success(feedback);else notify(t("已儲存"));
    }
  }catch(e){notify(e.message||t("儲存失敗"));}
  finally{if(submitButton)submitButton.disabled=false;}
});
/* ---------- Backup and validation ---------- */
function download(content,name,type) {
  const url=URL.createObjectURL(new Blob([content],{type})),a=document.createElement("a");
  a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function exportCSV() {
  const cell=value=>{
    let s=String(value??"");
    if(/^[=+\-@\t\r]/.test(s))s="'"+s;
    return '"'+s.replaceAll('"','""')+'"';
  };
  const rows=[
    ["Date","Type","Category","Note","Currency","Original amount","Rate","Reporting currency","Converted amount"],
    ...S.entries.map(e=>[e.date,e.type,t(e.category),e.note,e.currency,e.amount,e.rate,S.base,e.converted])
  ];
  download("\uFEFF"+rows.map(r=>r.map(cell).join(",")).join("\r\n"),"bunny-transactions.csv","text/csv;charset=utf-8");
}
function valid(s) {
  const obj=x=>x&&typeof x==="object"&&!Array.isArray(x);
  const num=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<1e15;
  const str=x=>typeof x==="string";
  const image=x=>str(x)&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=\r\n]+$/.test(x);
  const pics=x=>Array.isArray(x)&&x.length<=3&&x.every(image);
  const date=x=>{
    if(!str(x)||!/^\d{4}-\d{2}-\d{2}$/.test(x))return false;
    const d=new Date(x+"T12:00:00Z");
    return !Number.isNaN(d.valueOf())&&d.toISOString().slice(0,10)===x;
  };
  const item=x=>obj(x)&&str(x.id)&&str(x.name)&&num(x.price)&&x.price>0&&Number.isInteger(x.qty)&&x.qty>0&&x.qty<=999;
  if(!obj(s)||s.version!==5||!["tc","sc","en"].includes(s.lang)||!currencies.includes(s.base)||typeof s.ready!=="boolean")return false;
  if(!obj(s.profile)||!str(s.profile.name)||!str(s.profile.bio)||!(s.profile.avatar===""||image(s.profile.avatar)))return false;
  if(!obj(s.rates)||s.rates[s.base]!==1||!currencies.every(c=>num(s.rates[c])&&s.rates[c]>0))return false;
  if(!obj(s.limits)||!num(s.limits.expense)||s.limits.expense<=0||!num(s.limits.income)||s.limits.income<=0)return false;
  if(s.pet!==null&&(!obj(s.pet)||!Number.isInteger(s.pet.breed)||s.pet.breed<0||s.pet.breed>3||!Number.isInteger(s.pet.coat)||s.pet.coat<0||s.pet.coat>3||!str(s.pet.name)||!["","bow","scarf"].includes(s.pet.accessory)))return false;
  if(s.ready&&(!s.pet||!s.profile.name.trim()))return false;
  if(!Array.isArray(s.entries)||!s.entries.every(e=>
    obj(e)&&str(e.id)&&num(e.created)&&date(e.date)&&["income","expense"].includes(e.type)&&
    (e.type==="income"?incomeCats:expenseCats).includes(e.category)&&str(e.note)&&currencies.includes(e.currency)&&
    num(e.amount)&&e.amount>0&&num(e.rate)&&e.rate>0&&num(e.converted)&&e.converted>0&&
    Math.abs(round(e.amount*e.rate)-e.converted)<.011&&pics(e.images)&&
    (!e.items||Array.isArray(e.items)&&e.items.every(item))))return false;
  if(!Array.isArray(s.posts)||!s.posts.every(p=>
    obj(p)&&str(p.id)&&num(p.created)&&date(p.date)&&str(p.text)&&pics(p.images)&&
    (!p.milestone||obj(p.milestone)&&str(p.milestone.name)&&num(p.milestone.amount)&&
    currencies.includes(p.milestone.currency)&&typeof p.milestone.show==="boolean")))return false;
  if(!Array.isArray(s.goals)||!s.goals.every(g=>
    obj(g)&&str(g.id)&&str(g.name)&&num(g.target)&&g.target>0&&date(g.deadline)&&
    Array.isArray(g.contributions)&&g.contributions.every(c=>obj(c)&&str(c.id)&&date(c.date)&&num(c.amount)&&c.amount>0)))return false;
  if(!obj(s.budgets)||!Object.entries(s.budgets).every(([key,b])=>
    /^\d{4}-(0[1-9]|1[0-2])$/.test(key)&&obj(b)&&num(b.total)&&obj(b.categories)&&
    Object.entries(b.categories).every(([k,v])=>expenseCats.includes(k)&&num(v))))return false;
  if(!Array.isArray(s.cart)||!s.cart.every(item)||!obj(s.shop)||!num(s.shop.discount)||s.shop.discount>100||!num(s.shop.coupon)||!num(s.shop.budget))return false;
  return [s.entries,s.posts,s.goals,s.cart].every(a=>new Set(a.map(x=>x.id)).size===a.length);
}
/* ---------- Start ---------- */
async function start() {
  $("#app").innerHTML=`
    <header class="site-header"><div class="header-inner">
    <a class="brand" href="index.html"><span id="brandMark"></span><span><strong>Bunny.</strong><small>MY LITTLE EVERYDAY</small></span></a>
    <nav id="nav" aria-label="Navigation"></nav>
    <a href="settings.html" id="headerAvatar" aria-label="Settings" style="text-decoration:none"></a>
    </div></header>
    <main id="content"></main>
    <footer><div id="footerNote"></div><div class="footer-credit">Made by Yanice Mai</div></footer>
    <dialog id="modal"></dialog><dialog id="viewer" aria-label="Photo viewer"></dialog>
    <div id="toast" role="status" aria-live="polite"></div>
    <input id="restoreFile" type="file" accept=".json,application/json" hidden>`;
  try {
    db=await new Promise((resolve,reject)=>{
      const r=indexedDB.open("bunny-yanice-v5",1);
      r.onupgradeneeded=()=>r.result.createObjectStore("data");
      r.onsuccess=()=>resolve(r.result);
      r.onerror=()=>reject(r.error);
    });
    const stored=await readState();
    if(stored&&!valid(stored))throw Error("Invalid stored data");
    S=stored||initial();
    render();
    $("#restoreFile").onchange=async ev=>{
      const file=ev.target.files[0];if(!file)return;
      try {
        if(file.size>100*1024*1024)throw Error(t("備份格式錯誤"));
        const data=JSON.parse(await file.text());
        if(!valid(data))throw Error(t("備份格式錯誤"));
        if(!confirm(t("恢復會取代目前資料，繼續？")))return;
        const ok=await change(s=>{
          Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,data);
        });
        if(ok)notify(t("已儲存"));
      }catch(e){notify(e.message||t("備份格式錯誤"));}
      finally{ev.target.value="";}
    };
  }catch(e){
    console.error(e);
    $("#content").innerHTML=`<section class="paper">
    <h1>暫時無法打開手帳</h1><p>請透過 VS Code 的 Live Server 開啟，並允許瀏覽器儲存網站資料。原有資料沒有被覆寫。</p>
    <p class="small muted">Could not open local storage. Existing data has not been overwritten.</p></section>`;
  }
}
start();
})();