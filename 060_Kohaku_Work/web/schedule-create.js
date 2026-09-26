(() => {
"use strict";
const API="/api/v1/schedule.php";
const MASTER="/api/v1/sales-master.php";
const SEARCH="/api/v1/customer-identity-search.php";
const HISTORY="/api/v1/repeat-customer-history.php";
const S=window.KohakuWorkNextSchedule;
const V=document.getElementById("view-schedule");
if(!S||!V)return;
const stores=[[1,"札幌"],[2,"千葉"],[3,"東京"],[4,"名古屋"]];
let master=null,customerId=null,timer=null,searchToken=0;

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
  const a=
    document.getElementById(
      "ncrCustomer"
    );

  const s=
    document.getElementById(
      "ncrStatus"
    )?.value;

  customerId=null;
  searchToken+=1;

  if(!a)return;

  if(
    s==="new"
    ||s==="repeat_unknown_id"
  ){
    a.innerHTML=`
      <b>${
        s==="new"
          ?"新規顧客"
          :"ID不明リピ顧客"
      }</b>

      <div class="ncr-grid gap">
        <label>
          名前
          <input id="ncrNewName">
        </label>

        <label>
          かしこい名
          <input id="ncrKashikoi">
        </label>
      </div>
    `;

    return;
  }

  a.innerHTML=`
    <b>${
      s==="repeat"
        ?"リピ顧客を検索・選択"
        :"既存顧客検索（任意）"
    }</b>

    <div class="ncr-repeat-search-grid">
      <label>
        名前

        <input
          id="ncrSearch"
          type="search"
          placeholder="名前を入力"
          autocomplete="off"
        >
      </label>

      <label>
        過去の来店日

        <input
          id="ncrSearchDate"
          type="date"
        >
      </label>
    </div>

    <small class="ncr-repeat-search-hint">
      名前だけ・日付だけでも検索できます。
      名前＋日付では完全一致を緑、前後1日を赤で表示します。
    </small>

    <div id="ncrResults"></div>
  `;
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
  const seen=new Set();

  const names=
    Array.isArray(v.customer_names)
      ?v.customer_names
      :[];

  names.forEach(item=>{
    const name=
      String(
        item?.name||""
      ).trim();

    const type=
      String(
        item?.name_type||""
      ).trim();

    if(
      !name
      ||seen.has(name)
    ){
      return;
    }

    seen.add(name);

    parts.push(
      type==="kashikoi"
        ?`カ:${name}`
        :name
    );
  });

  /*
   * 旧レスポンスとの互換用 fallback。
   * customer_names が未提供でも
   * 従来どおり表示できる。
   */
  if(!parts.length){
    const normal=
      String(
        v.customer_name||""
      ).trim();

    const kashikoi=
      String(
        v.customer_kashikoi_name||""
      ).trim();

    if(normal){
      parts.push(normal);
      seen.add(normal);
    }

    if(
      kashikoi
      &&!seen.has(kashikoi)
    ){
      parts.push(
        `カ:${kashikoi}`
      );
    }
  }

  return parts.length
    ?parts.join(" / ")
    :`顧客 #${Number(v.customer_id||0)}`;
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

function parseSearchDate(value){
  const parts=
    String(value||"")
      .split("-")
      .map(Number);

  if(
    parts.length!==3
    ||parts.some(
      value=>!Number.isInteger(value)
    )
  ){
    return null;
  }

  const date=
    new Date(
      parts[0],
      parts[1]-1,
      parts[2],
      12,
      0,
      0,
      0
    );

  if(
    Number.isNaN(
      date.getTime()
    )
  ){
    return null;
  }

  return date;
}


function searchDateText(date){
  return [
    date.getFullYear(),
    String(
      date.getMonth()+1
    ).padStart(2,"0"),
    String(
      date.getDate()
    ).padStart(2,"0"),
  ].join("-");
}


function addSearchDays(
  value,
  offset
){
  const date=
    parseSearchDate(
      value
    );

  if(!date)return "";

  date.setDate(
    date.getDate()
    +offset
  );

  return searchDateText(
    date
  );
}


function visitBusinessDateForSearch(
  value
){
  const text=
    String(value||"");

  const date=
    parseSearchDate(
      text.slice(0,10)
    );

  if(!date)return "";

  const hour=
    Number(
      text.slice(11,13)
    );

  if(
    Number.isFinite(hour)
    &&hour>=0
    &&hour<3
  ){
    date.setDate(
      date.getDate()-1
    );
  }

  return searchDateText(
    date
  );
}


function searchDayDistance(
  requested,
  actual
){
  const requestedDate=
    parseSearchDate(
      requested
    );

  const actualDate=
    parseSearchDate(
      actual
    );

  if(
    !requestedDate
    ||!actualDate
  ){
    return null;
  }

  return Math.round(
    (
      actualDate.getTime()
      -requestedDate.getTime()
    )
    /86400000
  );
}


async function identitySearch(
  params
){
  const query=
    new URLSearchParams(
      params
    );

  return req(
    `${SEARCH}?${query}`,
    {
      method:"GET",
    }
  );
}


function searchDateHitHtml(
  distance,
  date
){
  if(
    !Number.isInteger(
      distance
    )
  ){
    return "";
  }

  const exact=
    distance===0;

  const label=
    exact
      ?"指定日一致"
      :(
        distance<0
          ?"前日一致"
          :"翌日一致"
      );

  return `
    <span
      class="ncr-date-match ${
        exact
          ?"is-exact"
          :"is-near"
      }"
    >
      ${esc(label)}
      ${esc(
        String(date||"")
          .replaceAll("-","/")
      )}
    </span>
  `;
}


async function search(){
  const r=
    document.getElementById(
      "ncrResults"
    );

  if(!r)return;

  const name=
    document.getElementById(
      "ncrSearch"
    )?.value?.trim()
    ||"";

  const requestedDate=
    document.getElementById(
      "ncrSearchDate"
    )?.value
    ||"";

  const token=
    ++searchToken;

  if(
    !name
    &&!requestedDate
  ){
    r.innerHTML="";
    return;
  }

  r.innerHTML=`
    <p class="ncr-msg">
      検索中…
    </p>
  `;

  try{
    let hits=[];

    if(
      requestedDate
      &&name
    ){
      /*
       * 0〜2時台の予約は前営業日扱いなので、
       * 生の日付を -1〜+2 日まで取得してから
       * 営業日ベースで ±1 日へ絞る。
       */
      const rawDates=
        [-1,0,1,2]
          .map(offset=>
            addSearchDays(
              requestedDate,
              offset
            )
          );

      const responses=
        await Promise.all(
          rawDates.map(
            visitDate=>
              identitySearch({
                customer_name:name,
                visit_date:visitDate,
              })
          )
        );

      if(
        token!==searchToken
      ){
        return;
      }

      const visitMap=
        new Map();

      responses
        .flatMap(
          data=>
            Array.isArray(
              data.data?.visits
            )
              ?data.data.visits
              :[]
        )
        .forEach(visit=>{
          const id=
            Number(
              visit.id||0
            );

          if(
            id
            &&!visitMap.has(id)
          ){
            visitMap.set(
              id,
              visit
            );
          }
        });

      hits=
        [...visitMap.values()]
          .map(visit=>{
            const businessDate=
              visitBusinessDateForSearch(
                visit.started_at
              );

            const distance=
              searchDayDistance(
                requestedDate,
                businessDate
              );

            return {
              visit,
              distance,
              businessDate,
            };
          })
          .filter(item=>
            Number.isInteger(
              item.distance
            )
            &&Math.abs(
              item.distance
            )<=1
          )
          .sort((a,b)=>
            Math.abs(a.distance)
            -Math.abs(b.distance)
            ||String(
              b.visit.started_at||""
            ).localeCompare(
              String(
                a.visit.started_at||""
              )
            )
          );

    }else if(requestedDate){
      /*
       * 日付だけ検索では、
       * 選択した営業日の顧客を表示する。
       *
       * 0〜2時台は前営業日扱いなので、
       * 指定日と翌暦日を取得してから
       * 営業日が指定日と一致する予約だけ残す。
       */
      const rawDates=
        [0,1]
          .map(offset=>
            addSearchDays(
              requestedDate,
              offset
            )
          );

      const responses=
        await Promise.all(
          rawDates.map(
            visitDate=>
              identitySearch({
                visit_date:visitDate,
              })
          )
        );

      if(
        token!==searchToken
      ){
        return;
      }

      const visitMap=
        new Map();

      responses
        .flatMap(
          data=>
            Array.isArray(
              data.data?.visits
            )
              ?data.data.visits
              :[]
        )
        .forEach(visit=>{
          const id=
            Number(
              visit.id||0
            );

          if(
            id
            &&!visitMap.has(id)
          ){
            visitMap.set(
              id,
              visit
            );
          }
        });

      hits=
        [...visitMap.values()]
          .map(visit=>{
            const businessDate=
              visitBusinessDateForSearch(
                visit.started_at
              );

            const distance=
              searchDayDistance(
                requestedDate,
                businessDate
              );

            return {
              visit,
              distance,
              businessDate,
            };
          })
          .filter(item=>
            item.distance===0
          )
          .sort((a,b)=>
            String(
              a.visit.started_at||""
            ).localeCompare(
              String(
                b.visit.started_at||""
              )
            )
          );

    }else{
      const data=
        await identitySearch({
          keyword:name,
        });

      if(
        token!==searchToken
      ){
        return;
      }

      hits=
        (
          Array.isArray(
            data.data?.visits
          )
            ?data.data.visits
            :[]
        )
          .map(visit=>({
            visit,
            distance:null,
            businessDate:"",
          }));
    }

    const customerMap=
      new Map();

    hits.forEach(item=>{
      const id=
        Number(
          item.visit
            ?.customer_id
          ||0
        );

      if(!id)return;

      /*
       * hits は
       * exact → ±1日 → 新しい予約
       * の順なので、
       * 顧客ごとの最良候補を残す。
       */
      if(
        !customerMap.has(id)
      ){
        customerMap.set(
          id,
          item
        );
      }
    });

    const customers=
      [...customerMap.values()]
        .slice(0,12);

    if(!customers.length){
      r.innerHTML=`
        <p class="ncr-msg">
          ${
            requestedDate
              ?(
                name
                  ?"名前＋指定日（前後1日を含む）で該当なし"
                  :"指定日に該当顧客なし"
              )
              :"該当顧客なし"
          }
        </p>
      `;

      return;
    }

    const ids=
      customers.map(
        item=>
          Number(
            item.visit.customer_id
          )
      );

    const historyQuery=
      new URLSearchParams({
        customer_ids:
          ids.join(","),
      });

    const historyData=
      await req(
        `${HISTORY}?${historyQuery}`,
        {
          method:"GET",
        }
      );

    if(
      token!==searchToken
    ){
      return;
    }

    const histories=
      historyData.histories
      ||{};

    r.innerHTML=
      customers
        .map(item=>{
          const v=
            item.visit;

          const id=
            Number(
              v.customer_id
            );

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

          const hitClass=
            item.distance===0
              ?" is-date-exact"
              :(
                Number.isInteger(
                  item.distance
                )
                  ?" is-date-near"
                  :""
              );

          return `
            <button
              type="button"
              class="ncr-customer ${
                selected
                  ?"is-selected"
                  :""
              }${hitClass}"
              data-ncr-customer="${id}"
            >
              <span class="ncr-customer-head">
                <strong>
                  ${esc(
                    repeatCustomerDisplayName(
                      v
                    )
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

              ${searchDateHitHtml(
                item.distance,
                item.businessDate
              )}

              ${repeatHistoryHtml(
                history
              )}
            </button>
          `;
        })
        .join("");

  }catch(e){
    if(
      token!==searchToken
    ){
      return;
    }

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
document.addEventListener("input",e=>{
  if(
    !e.target.matches(
      "#ncrSearch,#ncrSearchDate"
    )
  ){
    return;
  }

  clearTimeout(timer);

  timer=setTimeout(
    ()=>search(),
    120
  );
});
document.addEventListener("submit",e=>{if(e.target.id!=="nextCreateForm")return;e.preventDefault();void save()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&document.getElementById("nextCreateModal")?.classList.contains("is-open"))close()});
mount();
window.KohakuWorkNextReservationCreate={open,openAt,close,verificationWriteEnabled:false,productionWriteEnabled:true};
})();