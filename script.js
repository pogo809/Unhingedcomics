const REPO="pogo809/Unhingedcomics";
const API=`https://api.github.com/repos/${REPO}/contents`;
const RAW=`https://raw.githubusercontent.com/${REPO}/main`;
const $=s=>document.querySelector(s);
const pretty=s=>decodeURIComponent(s).replace(/[-_]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());

function setTheme(t){document.documentElement.classList.toggle("light",t==="light");localStorage.setItem("uc-theme",t);$("#theme").textContent=t==="light"?"☀":"☾"}
setTheme(localStorage.getItem("uc-theme")||(matchMedia("(prefers-color-scheme:light)").matches?"light":"dark"));
$("#theme").onclick=()=>setTheme(document.documentElement.classList.contains("light")?"dark":"light");
$("#year").textContent=new Date().getFullYear();

function progress(){try{return JSON.parse(localStorage.getItem("uc-progress")||"{}")}catch{return{}}}
function rawUrl(c,ch,p){return `${RAW}/${encodeURI(`comics/${c.name}/${ch.name}/${p.name}`)}`}
async function api(path){const r=await fetch(`${API}/${path}`);if(!r.ok)throw Error(r.status);return r.json()}

async function discover(){
 const dirs=(await api("comics")).filter(x=>x.type==="dir"); const out=[];
 for(const d of dirs){
  const chdirs=(await api(encodeURIComponent(`comics/${d.name}`))).filter(x=>x.type==="dir"); const chapters=[];
  for(const ch of chdirs){
   const fs=await api(encodeURIComponent(`comics/${d.name}/${ch.name}`));
   const pages=fs.filter(x=>x.type==="file"&&/\.(webp|jpg|jpeg|png)$/i.test(x.name)).sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true}));
   if(pages.length)chapters.push({name:ch.name,pages});
  }
  if(chapters.length)out.push({name:d.name,chapters});
 }
 return out;
}
function card(c,ch,badge=""){const p=ch.pages[0];return `<article class="card"><a href="reader.html?comic=${encodeURIComponent(c.name)}&chapter=${encodeURIComponent(ch.name)}"><div class="thumb"><img loading="lazy" src="${rawUrl(c,ch,p)}" alt="${pretty(c.name)}"><span class="badge">${badge||pretty(ch.name)}</span></div><div class="body"><h3>${pretty(c.name)}</h3><div class="meta">${pretty(ch.name)} · ${ch.pages.length} pages</div><span class="action">Read latest →</span></div></a></article>`}
function renderContinue(comics){
 const all=progress(), choices=[];
 comics.forEach(c=>c.chapters.forEach(ch=>{const x=all[`${c.name}/${ch.name}`];if(x&&x.page>0&&x.page<ch.pages.length)choices.push({c,ch,x})}));
 choices.sort((a,b)=>b.x.updatedAt-a.x.updatedAt);if(!choices.length)return;
 const {c,ch,x}=choices[0],p=ch.pages[Math.min(x.page-1,ch.pages.length-1)];
 $("#continueSection").hidden=false;$("#continueCard").innerHTML=`<a class="continueImg" href="reader.html?comic=${encodeURIComponent(c.name)}&chapter=${encodeURIComponent(ch.name)}&page=${x.page}"><img src="${rawUrl(c,ch,p)}" alt="Last page"></a><div class="continueInfo"><p>PAGE ${x.page} OF ${ch.pages.length}</p><h3>${pretty(c.name)}</h3><div class="meta">${pretty(ch.name)}</div><div class="track"><div class="fill" style="width:${x.page/ch.pages.length*100}%"></div></div><a class="action" href="reader.html?comic=${encodeURIComponent(c.name)}&chapter=${encodeURIComponent(ch.name)}&page=${x.page}">Continue reading →</a></div>`;
}
async function load(){
 try{
  const comics=await discover();$("#status").textContent=`${comics.length} comic${comics.length===1?"":"s"}`;renderContinue(comics);
  $("#grid").innerHTML=comics.map(c=>card(c,c.chapters[c.chapters.length-1])).join("");
  const newest=[...comics].reverse().slice(0,4);if(newest.length){$("#newSection").hidden=false;$("#newGrid").innerHTML=newest.map(x=>card(x.c||x,x.c?x.ch:latest(x))).join("")}
  if(!comics.length)$("#empty").hidden=false;
 }catch(e){console.error(e);$("#status").textContent="Load failed";$("#empty").hidden=false}
}
function latest(c){return c.chapters[c.chapters.length-1]} load();