(() => {
"use strict";
const API="/api/next/v1/schedule.php";
const MASTER="/api/next/v1/sales-master.php";
const SEARCH="/api/next/v1/customer-identity-search.php";
const HISTORY="/api/next/v1/repeat-customer-history.php";
const S=window.KohakuWorkNextSchedule;
const V=document.getElementById("view-schedule");
if(!S||!V)return;
const stores=[[1,"札幌"],[2,"千葉"],[3,"東京"],[4,"名古屋"]];
let master=null,customerId=null,timer=null;

const esc=v=>String(v??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const money=v=>`¥${Number(v||0).toLocaleString("ja-JP")}`;
async function req(url,opt={}){const r=await fetch(url,{credentials:"same-origin",cache:"no-store",...opt});let d;try{d=await r.json()}catch{throw Error("API応答を読めませんでした。")}if(!r.ok||d?.success!==true)throw Error(d?.error||"処理に失敗しました。");return d}
function msg(t,e=false){const n=document.getElementById("nextCreateMsg");if(!n)return;n.textContent=t||"";n.classList.toggle("is-error",e)}
function nowParts(){const d=new Date();d.setMinutes(Math.ceil(d.getMinutes()/10)*10,0,0);return {date:`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`,time:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`}}
function modal(){
  if(document.getElementById("nextCreateModal"))return;
  const el=document.createElement("div");el.id="nextCreateModal";el.className="ncr-modal";
  el.innerHTML=`<div class="ncr-back" data-ncr-close></div><section class="ncr-panel">
  <header><div><small>PRODUCTION / CREATE</small><h2>新規予約</h2></div><button type="button" data-ncr-close>×</button></header>
  <p class="ncr-note">本番DBへ保存します。作成内容を確認してから登録してください。</p>
  <form id="nextCreateForm">
  <div class="ncr-grid">
  <label>予約日<input id="ncrDate" type="date" required></label><label>開始時間<input id="ncrTime" type="time" required></label>
  <label>予約受付日<input id="ncrBookedDate" type="date"></label><label>予約受付時刻<input id="ncrBookedTime" type="time"></label>
  <label>店舗<select id="ncrStore">${stores.map(([id,n])=>`<option value="${id}">${n}</option>`).join("")}</select></label>
  <label>顧客区分<select id="ncrStatus"><option value="new">新規</option><option value="repeat">リピ</option><option value="other_store_repeat">他店リピ</option><option value="repeat_unknown_id">リピ・ID不明</option></select></label>
  </div>
  <section class="ncr-sec" id="ncrCustomer"></section>
  <section class="ncr-sec"><b>コース</b><div id="ncrCourse">読込中…</div></section>
  <section class="ncr-sec"><b>延長</b><div id="ncrExtensions"></div></section>
  <section class="ncr-sec"><b>OP</b><div class="ncr-checks" id="ncrOptions"></div>
  <div class="ncr-grid gap"><label>その他OP名<input id="ncrCustomOption"></label><label>その他OP手取り<input id="ncrCustomAmount" type="number" min="0"></label></div></section>
  <section class="ncr-sec"><div class="ncr-grid"><label>チップ<input id="ncrTip" type="number" min="0" value="0"></label><label>調整分<input id="ncrAdjustment" type="number" value="0"></label></div></section>
  <p id="nextCreateMsg" class="ncr-msg"></p>
  <div class="ncr-actions"><button type="button" data-ncr-close>キャンセル</button><button id="ncrSave" type="submit">本番DBへ予約作成</button></div>
  </form></section>`;
  document.body.appendChild(el);
}
function customerUI(){
  const a=document.getElementById("ncrCustomer"),s=document.getElementById("ncrStatus")?.value;customerId=null;if(!a)return;
  if(s==="new"||s==="repeat_unknown_id"){a.innerHTML=`<b>${s==="new"?"新規顧客":"ID不明リピ顧客"}</b><div class="ncr-grid gap"><label>名前<input id="ncrNewName"></label><label>かしこい名<input id="ncrKashikoi"></label></div>`;return}
  a.innerHTML=`<b>${s==="repeat"?"リピ顧客を検索・選択":"既存顧客検索（任意）"}</b><input id="ncrSearch" class="ncr-wide" type="search" placeholder="名前・特徴・日付など"><div id="ncrResults"></div>`;
}
function labelCourse(c){const m=Number(c.course_minutes||0),f=c.pricing_category==="foreign"?"外国人 ":"",n=String(c.course_name||"").trim(),norm=n.replace(/\s+/g,""),red=new Set([`${m}分`,String(m),`外${m}分`,`外国人${m}分`,`外国人${m}`]);return `${f}${m}分${n&&!red.has(norm)?` / ${n}`:""} / 手取り ${money(c.take_home)}`}
async function loadMaster(){
  const st=+document.getElementById("ncrStore")?.value,d=document.getElementById("ncrDate")?.value,t=document.getElementById("ncrTime")?.value;if(!st||!d||!t)return;
  try{const q=new URLSearchParams({store_id:String(st),at:`${d} ${t}:00`});const x=await req(`${MASTER}?${q}`,{method:"GET"});master={courses:x.courses||[],options:x.options||[]};renderMaster()}catch(e){master=null;document.getElementById("ncrCourse").textContent=e.message;msg("料金マスタを取得できませんでした。",true)}
}
function renderMaster(){
  const reg=[...(master.courses||[])].filter(c=>c.course_type==="regular").sort((a,b)=>(a.pricing_category==="foreign")-(b.pricing_category==="foreign")||a.course_minutes-b.course_minutes);
  document.getElementById("ncrCourse").innerHTML=`<select id="ncrCourseSelect">${reg.map(c=>`<option value="${c.store_course_id}">${esc(labelCourse(c))}</option>`).join("")}<option value="custom">カスタム時間</option></select><label id="ncrCustomWrap" hidden>カスタム予約時間（分）<input id="ncrCustomMinutes" type="number" min="1" value="60"></label>`;
  const ex=(master.courses||[]).filter(c=>c.course_type==="extension");
  document.getElementById("ncrExtensions").innerHTML=ex.length?ex.map(c=>`<div class="ncr-ext"><label class="ncr-check"><input type="checkbox" data-ncr-ex value="${c.store_course_id}"><span>${esc(c.course_name||`延長 ${c.course_minutes}分`)}<small>手取り ${money(c.take_home)}</small></span></label><input type="number" min="1" value="1" disabled data-ncr-qty="${c.store_course_id}"></div>`).join(""):`<p class="ncr-msg">延長マスタなし</p>`;
  document.getElementById("ncrOptions").innerHTML=(master.options||[]).map(o=>`<label class="ncr-check"><input type="checkbox" data-ncr-op value="${esc(o.name)}"><span>${esc(o.name)}<small>手取り ${money(o.take_home)}</small></span></label>`).join("");
}
function repeatCustomerDisplayName(v){
  const parts=[];
  const normal=String(v.customer_name||"").trim();
  const kashikoi=String(v.customer_kashikoi_name||"").trim();

  if(normal)parts.push(normal);
  if(kashikoi&&kashikoi!==normal)parts.push(`カ:${kashikoi}`);

  return parts.length
    ? parts.join(" / ")
    : `顧客 #${Number(v.customer_id||0)}`;
}

function repeatPastHistory(visits){
  const now=new Date();
  const nowText=[
    now.getFullYear(),
    String(now.getMonth()+1).padStart(2,"0"),
    String(now.getDate()).padStart(2,"0"),
  ].join("-")
    +" "
    +String(now.getHours()).padStart(2,"0")
    +":"
    +String(now.getMinutes()).padStart(2,"0");

  return (Array.isArray(visits)?visits:[])
    .filter(v=>{
      const started=String(v.started_at||"");
      if(!started)return false;

      return v.status==="completed"
        ||(
          v.status==="scheduled"
          && started<=nowText
        );
    })
    .sort((a,b)=>
      String(b.started_at||"").localeCompare(
        String(a.started_at||"")
      )
      ||Number(b.id||0)-Number(a.id||0)
    );
}

function repeatHistoryHtml(visits){
  const past=repeatPastHistory(visits);

  if(!past.length){
    return `
      <span class="ncr-history-empty">
        過去予約なし
      </span>
    `;
  }

  return `
    <span class="ncr-history-list">
      ${past.map(v=>{
        const started=String(v.started_at||"");
        const date=started.slice(0,10).replaceAll("-","/");
        const time=started.slice(11,16);
        const course=
          `${v.pricing_category==="foreign"?"外":""}${Number(v.course_minutes||0)}分`;
        const optionNames=
          Array.isArray(v.options)
            ? v.options.filter(Boolean)
            : [];
        const optionText=
          optionNames.length
            ? optionNames.join("・")
            : "なし";
        const tip=
          money(v.tip_amount||0);

        return `
          <span class="ncr-history-row">
            <span class="ncr-history-main">
              <strong>${esc(`${date} ${time}`)}</strong>
              <span>${esc(course)}</span>
            </span>

            <small>
              OP ${esc(optionText)}
              <i>｜</i>
              チップ ${esc(tip)}
            </small>
          </span>
        `;
      }).join("")}
    </span>
  `;
}

async function search(k){
  const r=document.getElementById("ncrResults");

  if(!r)return;

  if(!k.trim()){
    r.innerHTML="";
    return;
  }

  r.innerHTML=`
    <p class="ncr-msg">
      検索中…
    </p>
  `;

  try{
    const q=new URLSearchParams({
      keyword:k.trim(),
    });

    const d=await req(
      `${SEARCH}?${q}`,
      {
        method:"GET",
      }
    );

    const customerMap=new Map();

    (d.data?.visits||[]).forEach(v=>{
      const id=Number(v.customer_id||0);

      if(!id)return;

      if(!customerMap.has(id)){
        customerMap.set(id,v);
      }
    });

    const customers=
      [...customerMap.values()]
        .slice(0,12);

    if(!customers.length){
      r.innerHTML=`
        <p class="ncr-msg">
          該当顧客なし
        </p>
      `;
      return;
    }

    const ids=
      customers.map(v=>
        Number(v.customer_id)
      );

    const hq=new URLSearchParams({
      customer_ids:ids.join(","),
    });

    const historyData=await req(
      `${HISTORY}?${hq}`,
      {
        method:"GET",
      }
    );

    const histories=
      historyData.histories||{};

    r.innerHTML=
      customers
        .map(v=>{
          const id=
            Number(v.customer_id);

          const history=
            histories[String(id)]
            ||histories[id]
            ||[];

          const pastCount=
            repeatPastHistory(
              history
            ).length;

          const selected=
            Number(customerId)
            ===id;

          return `
            <button
              type="button"
              class="ncr-customer ${selected?"is-selected":""}"
              data-ncr-customer="${id}"
            >
              <span class="ncr-customer-head">
                <strong>
                  ${esc(
                    repeatCustomerDisplayName(v)
                  )}
                </strong>

                <span class="ncr-selected-label">
                  ✓ 選択中
                </span>
              </span>

              <small>
                顧客 #${id}
                ・過去予約 ${pastCount}件
              </small>

              ${repeatHistoryHtml(history)}
            </button>
          `;
        })
        .join("");

  }catch(e){
    r.innerHTML=`
      <p class="ncr-msg is-error">
        ${esc(e.message)}
      </p>
    `;
  }
}
function intv(id,min=null,fb=0){const raw=document.getElementById(id)?.value?.trim()??"";if(raw==="")return fb;const v=Number(raw);if(!Number.isSafeInteger(v)||min!==null&&v<min)throw Error("金額・回数の入力を確認してね。");return v}
async function save(){
  if(!master)throw Error("料金マスタの読込が完了していません。");
  const date=document.getElementById("ncrDate").value,time=document.getElementById("ncrTime").value,store=+document.getElementById("ncrStore").value,status=document.getElementById("ncrStatus").value;
  if(status==="repeat"&&!customerId)throw Error("リピは既存顧客を選択してね。");
  const bd=document.getElementById("ncrBookedDate").value,bt=document.getElementById("ncrBookedTime").value;if((bd&&!bt)||(!bd&&bt))throw Error("予約受付日は日付と時刻を両方入れてね。");
  const sel=document.getElementById("ncrCourseSelect");let courseId=null,minutes=0;if(sel.value==="custom"){minutes=intv("ncrCustomMinutes",1,60)}else{courseId=+sel.value;const c=(master.courses||[]).find(x=>+x.store_course_id===courseId&&x.course_type==="regular");if(!c)throw Error("コースがマスタにありません。");minutes=+c.course_minutes}
  const extensions=[...document.querySelectorAll("[data-ncr-ex]:checked")].map(i=>{const id=+i.value,q=+document.querySelector(`[data-ncr-qty="${id}"]`)?.value;if(!Number.isSafeInteger(q)||q<=0)throw Error("延長回数を確認してね。");return {store_course_id:id,quantity:q}});
  const options=[...document.querySelectorAll("[data-ncr-op]:checked")].map(i=>i.value);
  const cn=document.getElementById("ncrCustomOption").value.trim(),car=document.getElementById("ncrCustomAmount").value.trim(),ca=car===""?null:Number(car);if(ca!==null&&(!Number.isSafeInteger(ca)||ca<0))throw Error("その他OP手取りを確認してね。");if(!cn&&ca!==null)throw Error("その他OP名も入力してね。");
  const p={store_id:store,started_at:`${date} ${time}`,booked_at:bd&&bt?`${bd} ${bt}`:null,course_minutes:minutes,store_course_id:courseId,customer_status:status,customer_id:(status==="repeat"||status==="other_store_repeat")?customerId:null,options,custom_option:cn,custom_option_amount:ca,extensions,tip_amount:intv("ncrTip",0,0),adjustment_amount:intv("ncrAdjustment",null,0)};
  if(status==="new"||status==="repeat_unknown_id"){p.new_customer_name=document.getElementById("ncrNewName")?.value.trim()||"";p.new_customer_kashikoi_name=document.getElementById("ncrKashikoi")?.value.trim()||""}
  const b=document.getElementById("ncrSave");b.disabled=true;b.textContent="作成中…";msg("本番DBへ新規予約を作成しています…");
  try{
    const d=await req(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(p)});
    const created=d.visit||null;
    msg(`予約 #${created?.id||""} を作成しました。`);
    if(created){
      const text=String(created.started_at||"");
      let businessDate=text.slice(0,10);
      const hour=Number(text.slice(11,13));
      if(hour>=0&&hour<3&&businessDate){
        const parts=businessDate.split("-").map(Number);
        const dateObject=new Date(parts[0],parts[1]-1,parts[2],12,0,0,0);
        dateObject.setDate(dateObject.getDate()-1);
        businessDate=[
          dateObject.getFullYear(),
          String(dateObject.getMonth()+1).padStart(2,"0"),
          String(dateObject.getDate()).padStart(2,"0"),
        ].join("-");
      }
      const visible=
        Array.isArray(S.state.period?.dates)
        && S.state.period.dates.includes(businessDate);
      if(visible){
        const existingIndex=S.state.visits.findIndex(x=>+x.id===+created.id);
        if(existingIndex>=0){
          S.state.visits[existingIndex]=created;
        }else{
          S.state.visits.push(created);
        }
        S.state.visits.sort((a,b)=>
          String(a.started_at||"").localeCompare(String(b.started_at||""))
          || Number(a.id||0)-Number(b.id||0)
        );
        S.render({preserveScroll:true});
      }
    }
    close();
    if(created)S.openDetail(created,null);
  }catch(e){
    msg(e.message,true);
  }finally{
    b.disabled=false;
    b.textContent="本番DBへ予約作成";
  }
}
function open(initial={}){
  modal();
  const n=nowParts();
  const requestedDate=String(initial?.date||"");
  const requestedTime=String(initial?.time||"");
  const date=/^\d{4}-\d{2}-\d{2}$/.test(requestedDate)?requestedDate:n.date;
  const time=/^\d{2}:\d{2}$/.test(requestedTime)?requestedTime:n.time;
  const m=document.getElementById("nextCreateModal");

  m.classList.add("is-open");
  document.body.style.overflow="hidden";

  document.getElementById("ncrDate").value=date;
  document.getElementById("ncrTime").value=time;
  document.getElementById("ncrBookedDate").value=n.date;
  document.getElementById("ncrBookedTime").value=n.time;

  const requestedStoreId=Number(initial?.storeId||0);

  document.getElementById("ncrStore").value=
    stores.some(([id])=>id===requestedStoreId)
      ? String(requestedStoreId)
      : "1";

  document.getElementById("ncrStatus").value="new";
  customerUI();
  loadMaster();
}

function openAt(date,time,storeId=null){
  open({date,time,storeId});
}
function close(){document.getElementById("nextCreateModal")?.classList.remove("is-open");document.body.style.overflow=""}
function mount(){
  if(document.querySelector("[data-ncr-open]"))return;
  const h=V.querySelector(".work-next-heading");
  if(!h)return;
  const b=document.createElement("button");
  b.type="button";
  b.className="ncr-launch";
  b.dataset.ncrOpen="1";
  b.textContent="＋ 新規";
  const status=h.querySelector(".next-schedule-read-status");
  h.insertBefore(b,status||null);
}
document.addEventListener("click",e=>{if(e.target.closest("[data-ncr-open]"))return open();if(e.target.closest("[data-ncr-close]"))return close();const c=e.target.closest("[data-ncr-customer]");if(c){customerId=+c.dataset.ncrCustomer;document.querySelectorAll("[data-ncr-customer]").forEach(x=>x.classList.toggle("is-selected",x===c))}});
document.addEventListener("change",e=>{if(!e.target.closest("#nextCreateModal"))return;if(e.target.matches("#ncrStatus"))return customerUI();if(e.target.matches("#ncrStore,#ncrDate,#ncrTime"))return void loadMaster();if(e.target.matches("#ncrCourseSelect")){document.getElementById("ncrCustomWrap").hidden=e.target.value!=="custom"}if(e.target.matches("[data-ncr-ex]")){const q=document.querySelector(`[data-ncr-qty="${e.target.value}"]`);if(q)q.disabled=!e.target.checked}});
document.addEventListener("input",e=>{if(!e.target.matches("#ncrSearch"))return;clearTimeout(timer);timer=setTimeout(()=>search(e.target.value),120)});
document.addEventListener("submit",e=>{if(e.target.id!=="nextCreateForm")return;e.preventDefault();void save()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("nextCreateModal")?.classList.contains("is-open"))close()});
mount();
window.KohakuWorkNextReservationCreate={open,openAt,close,verificationWriteEnabled:false,productionWriteEnabled:true};
})();