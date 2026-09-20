(() => {
"use strict";

const SEARCH="/api/next/v1/customer-identity-search.php";
const SCHEDULE="/api/next/v1/schedule.php";
const S=window.KohakuWorkNextSchedule;
const drawer=document.getElementById("nextScheduleDetailDrawer");
const body=document.getElementById("nextScheduleDetailBody");
const footer=drawer?.querySelector(".next-schedule-detail-footer");
const edit=footer?.querySelector("[data-next-schedule-edit-open]");

if(!S||!drawer||!body||!footer||!edit){
  console.error("NEXT customer identity link: UI missing.");
  return;
}

const STATUS={
  new:"新規",
  repeat:"リピ",
  other_store_repeat:"他店リピ",
  repeat_unknown_id:"リピ・ID不明",
};
const FEATURE={
  age_range:"年代",height:"身長",body_type:"体格",hair:"髪",
  facial_hair:"ヒゲ",glasses:"眼鏡",appearance:"見た目",
  lookalike:"似てる人",occupation:"職業",days_off:"休日",voice_speech:"声・話し方",
  area:"エリア",hobby_topic:"趣味・話題",other:"その他",
};

let groups=new Map();
let selectedId=null;
let searchToken=0;

const esc=v=>String(v??"")
  .replaceAll("&","&amp;").replaceAll("<","&lt;")
  .replaceAll(">","&gt;").replaceAll('"',"&quot;")
  .replaceAll("'","&#039;");

function current(){
  const id=Number(drawer.dataset.visitId||0);
  return id?S.state.visits.find(v=>Number(v.id)===id)||null:null;
}

function visitName(v){
  const names=Array.isArray(v?.customer_names)?v.customer_names:[];
  return String(
    v?.customer_name
    ||names.find(n=>Number(n.is_primary)===1)?.name
    ||names[0]?.name
    ||v?.customer_code
    ||(v?.customer_id?`顧客 #${v.customer_id}`:"未紐付け")
  );
}

function featureHtml(list){
  if(!Array.isArray(list)||!list.length){
    return `<span class="ncil-empty">構造化特徴なし</span>`;
  }
  return list.map(f=>`
    <span class="ncil-feature">
      <b>${esc(FEATURE[f.feature_type]||f.feature_type||"特徴")}</b>
      ${esc(f.feature_value||"")}
      ${f.note?`<small>${esc(f.note)}</small>`:""}
    </span>
  `).join("");
}

function groupVisits(visits){
  const map=new Map();
  for(const v of Array.isArray(visits)?visits:[]){
    const customerId=Number(v.customer_id||0);
    if(!customerId||Number(v.id)===Number(current()?.id||0))continue;
    if(!map.has(customerId)){
      map.set(customerId,{
        id:customerId,
        visits:[],
        customerFeatures:Array.isArray(v.customer_identity_features)
          ?v.customer_identity_features:[],
      });
    }
    const g=map.get(customerId);
    g.visits.push(v);
    if(!g.customerFeatures.length&&Array.isArray(v.customer_identity_features)){
      g.customerFeatures=v.customer_identity_features;
    }
  }
  for(const g of map.values()){
    g.visits.sort((a,b)=>
      String(b.started_at||"").localeCompare(String(a.started_at||""))
      ||Number(b.id||0)-Number(a.id||0)
    );
  }
  return map;
}

function candidateName(g){
  const v=g.visits[0]||{};
  const n=String(v.customer_name||"").trim();
  const k=String(v.customer_kashikoi_name||"").trim();
  if(n&&k&&n!==k)return `${n} / カ:${k}`;
  return n||k||`顧客 #${g.id}`;
}

function candidateCard(g){
  const now=current();
  const same=Number(now?.customer_id||0)===g.id;
  const selected=Number(selectedId||0)===g.id;
  const visits=g.visits.map(v=>`
    <span class="ncil-visit">
      <strong>${esc(v.started_at||"")}</strong>
      <small>
        ${esc(v.store_name||"")} /
        ${esc(STATUS[v.customer_status]||v.customer_status||"")}
        ${v.customer_features?` / ${esc(v.customer_features)}`:""}
      </small>
      <span class="ncil-features">${featureHtml(v.identity_features)}</span>
    </span>
  `).join("");

  return `
    <button type="button"
      class="ncil-candidate ${selected?"is-selected":""} ${same?"is-current":""}"
      data-ncil-candidate="${g.id}">
      <span class="ncil-candidate-head">
        <strong>${esc(candidateName(g))}</strong>
        <span>${same?"現在の紐付け":selected?"✓ 選択中":`customer #${g.id}`}</span>
      </span>
      <small>検索条件に一致した来店 ${g.visits.length}件</small>
      <span class="ncil-features">${featureHtml(g.customerFeatures)}</span>
      <span class="ncil-visits">${visits}</span>
    </button>
  `;
}

function renderCompare(){
  const host=document.getElementById("ncilCompare");
  if(!host)return;
  const now=current();
  const g=groups.get(Number(selectedId||0));
  if(!now||!g){host.innerHTML="";return;}

  const c=g.visits[0]||{};
  const beforeId=Number(now.customer_id||0);
  const same=beforeId===g.id;

  host.innerHTML=`
    <section class="ncil-compare">
      <p class="next-schedule-detail-section-label">IDENTITY COMPARISON</p>
      <div class="ncil-compare-grid">
        <article>
          <span>現在の予約</span>
          <strong>${esc(visitName(now))}</strong>
          <small>${beforeId?`customer #${beforeId}`:"未紐付け"}</small>
          <p>${esc(now.started_at||"")} / ${esc(now.store_name||"")}</p>
          <p>${esc(STATUS[now.customer_status]||now.customer_status||"")}</p>
          <p>特徴: ${esc(now.customer_features||"なし")}</p>
        </article>
        <article>
          <span>紐付け候補</span>
          <strong>${esc(candidateName(g))}</strong>
          <small>customer #${g.id}</small>
          <p>${esc(c.started_at||"")} / ${esc(c.store_name||"")}</p>
          <p>${esc(STATUS[c.customer_status]||c.customer_status||"")}</p>
          <p>特徴: ${esc(c.customer_features||"なし")}</p>
          <div class="ncil-features">${featureHtml(g.customerFeatures)}</div>
        </article>
      </div>
      <div class="ncil-link-box">
        <p>${
          same
            ?"この予約はすでに選択した顧客へ紐付いています。"
            :beforeId
              ?"現在の顧客紐付けを、この顧客へ付け替えます。履歴はDBに残ります。"
              :"この予約を選択した既存顧客へ紐付けます。履歴はDBに残ります。"
        }</p>
        <button type="button" data-ncil-link ${same?"disabled":""}>
          ${same?"現在の顧客":beforeId?"この顧客へ付け替える":"この顧客に紐付ける"}
        </button>
        <p id="ncilMessage" class="ncil-message"></p>
      </div>
    </section>
  `;
}

function renderResults(){
  const host=document.getElementById("ncilResults");
  if(!host)return;
  const list=[...groups.values()];
  host.innerHTML=list.length
    ?list.map(candidateCard).join("")
    :`<p class="ncil-state">紐付け可能な既存顧客は見つかりませんでした。</p>`;
  renderCompare();
}

async function search(){
  const host=document.getElementById("ncilResults");
  if(!host)return;

  const values={
    keyword:document.getElementById("ncilKeyword")?.value?.trim()||"",
    kashikoi_name:document.getElementById("ncilKashikoi")?.value?.trim()||"",
    visit_date:document.getElementById("ncilDate")?.value||"",
    customer_status:document.getElementById("ncilStatus")?.value||"",
    store_id:document.getElementById("ncilStore")?.value||"",
  };

  const params=new URLSearchParams();
  Object.entries(values).forEach(([k,v])=>{if(v)params.set(k,v)});

  if(![...params.keys()].length){
    host.innerHTML=`<p class="ncil-state is-error">名前・特徴・日付など、どれか1つ検索条件を入れてね。</p>`;
    return;
  }

  const token=++searchToken;
  selectedId=null;
  host.innerHTML=`<p class="ncil-state">顧客候補を検索中…</p>`;
  renderCompare();

  try{
    const res=await fetch(`${SEARCH}?${params}`,{
      method:"GET",credentials:"same-origin",cache:"no-store",
    });
    const data=await res.json();
    if(token!==searchToken)return;
    if(!res.ok||data?.success!==true){
      throw new Error(data?.error||"顧客候補を検索できませんでした。");
    }
    groups=groupVisits(data.data?.visits||[]);
    renderResults();
  }catch(error){
    if(token!==searchToken)return;
    groups=new Map();
    host.innerHTML=`<p class="ncil-state is-error">${esc(error.message||"検索失敗")}</p>`;
  }
}

async function link(){
  const now=current();
  const g=groups.get(Number(selectedId||0));
  if(!now||!g)return;

  const beforeId=Number(now.customer_id||0);
  const afterId=Number(g.id||0);
  if(!afterId||beforeId===afterId)return;

  const label=candidateName(g);
  const text=beforeId
    ?`customer #${beforeId} から\n${label} / customer #${afterId} へ付け替える？`
    :`${label} / customer #${afterId} に紐付ける？`;

  if(!window.confirm(`${text}\n\n顧客紐付け履歴にも記録されます。`))return;

  const button=document.querySelector("[data-ncil-link]");
  const message=document.getElementById("ncilMessage");
  if(button){button.disabled=true;button.textContent=beforeId?"付け替え中…":"紐付け中…";}
  if(message)message.textContent="本番DBへ保存しています…";

  try{
    const res=await fetch(SCHEDULE,{
      method:"PATCH",
      credentials:"same-origin",
      cache:"no-store",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({id:Number(now.id),customer_id:afterId}),
    });
    const data=await res.json();
    if(!res.ok||data?.success!==true||!data.visit){
      throw new Error(data?.error||"顧客を紐付けできませんでした。");
    }

    const index=S.state.visits.findIndex(v=>Number(v.id)===Number(data.visit.id));
    if(index>=0)S.state.visits[index]=data.visit;

    S.render({preserveScroll:true});
    S.openDetail(data.visit,null);

    window.alert(beforeId?"顧客の紐付けを付け替えました。":"既存顧客へ紐付けました。");
  }catch(error){
    if(button){button.disabled=false;button.textContent=beforeId?"この顧客へ付け替える":"この顧客に紐付ける";}
    if(message){message.textContent=error.message||"保存失敗";message.classList.add("is-error");}
  }
}

function openPanel(){
  const now=current();
  if(!now)return;

  const old=body.querySelector("[data-ncil-panel]");
  if(old){old.remove();return;}

  body.querySelector("[data-next-history-panel]")?.remove();
  body.querySelector("[data-next-cancel-panel]")?.remove();

  groups=new Map();
  selectedId=null;

  const panel=document.createElement("section");
  panel.className="ncil-panel";
  panel.dataset.ncilPanel="true";
  panel.innerHTML=`
    <div class="ncil-head">
      <div>
        <p class="next-schedule-detail-section-label">CUSTOMER IDENTITY</p>
        <strong>顧客照合・紐付け変更</strong>
      </div>
      <button type="button" data-ncil-close>×</button>
    </div>

    <p class="ncil-current">
      現在：<strong>${esc(visitName(now))}</strong>
      <span>${now.customer_id?`customer #${now.customer_id}`:"未紐付け"}</span>
    </p>

    <div class="ncil-search-grid">
      <label class="ncil-wide">
        <span>名前・特徴・エリアなど</span>
        <input id="ncilKeyword" type="search" placeholder="例：田中 / 眼鏡 / すすきの">
      </label>
      <label><span>カシコイ名</span><input id="ncilKashikoi" type="search"></label>
      <label><span>過去来店日</span><input id="ncilDate" type="date"></label>
      <label>
        <span>顧客区分</span>
        <select id="ncilStatus">
          <option value="">すべて</option>
          <option value="new">新規</option>
          <option value="repeat">リピ</option>
          <option value="other_store_repeat">他店リピ</option>
          <option value="repeat_unknown_id">リピ・ID不明</option>
        </select>
      </label>
      <label>
        <span>店舗</span>
        <select id="ncilStore">
          <option value="">すべて</option>
          <option value="1">札幌</option>
          <option value="2">千葉</option>
          <option value="3">東京</option>
          <option value="4">名古屋</option>
        </select>
      </label>
    </div>

    <button type="button" class="ncil-search-button" data-ncil-search>顧客候補を検索</button>
    <p class="ncil-help">候補カードを選ぶと、現在の予約と比較してから紐付け・付け替えできます。</p>
    <div id="ncilResults" class="ncil-results"></div>
    <div id="ncilCompare"></div>
  `;
  body.appendChild(panel);
  panel.scrollIntoView({block:"nearest",behavior:"smooth"});
  panel.querySelector("#ncilKeyword")?.focus({preventScroll:true});
}

function closePanel(){
  body.querySelector("[data-ncil-panel]")?.remove();
  groups=new Map();
  selectedId=null;
  searchToken+=1;
}

function mount(){
  if(footer.querySelector("[data-ncil-open]"))return;
  const button=document.createElement("button");
  button.type="button";
  button.className="ncil-open-button";
  button.dataset.ncilOpen="true";
  button.textContent="👤 顧客照合";

  const group=footer.querySelector("[data-next-history-cancel-actions]");
  if(group)group.appendChild(button);
  else (footer.querySelector("[data-next-schedule-delete]")||edit).before(button);
}

document.addEventListener("click",event=>{
  if(event.target.closest("[data-ncil-open]")){event.preventDefault();openPanel();return}
  if(event.target.closest("[data-ncil-close]")){event.preventDefault();closePanel();return}
  if(event.target.closest("[data-ncil-search]")){event.preventDefault();void search();return}
  const candidate=event.target.closest("[data-ncil-candidate]");
  if(candidate){
    event.preventDefault();
    selectedId=Number(candidate.dataset.ncilCandidate||0)||null;
    renderResults();
    return;
  }
  if(event.target.closest("[data-ncil-link]")){event.preventDefault();void link()}
});

document.addEventListener("keydown",event=>{
  if(event.key!=="Enter"||!event.target.closest("[data-ncil-panel]"))return;
  if(event.target.closest("[data-ncil-candidate],[data-ncil-link]"))return;
  event.preventDefault();
  void search();
});

new MutationObserver(()=>{
  if(!current())closePanel();
}).observe(drawer,{attributes:true,attributeFilter:["class","data-visit-id"]});

mount();

window.KohakuWorkNextCustomerIdentityLink={
  verificationReadEnabled:false,
  verificationWriteEnabled:false,
  productionWriteEnabled:true,
};
})();