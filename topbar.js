/* SLOTSENSE top status: presentation only; never writes storage or changes estimates. */
(function(){"use strict";
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function size(){var h=document.querySelector("header");if(h)document.documentElement.style.setProperty("--ss-header-height",h.offsetHeight+"px");}
function mount(){var h=document.querySelector("header");h.classList.add("ss-header");if(!h.dataset.ssObserved){h.dataset.ssObserved="1";if(window.ResizeObserver)new ResizeObserver(size).observe(h);window.addEventListener("resize",size);}return h;}
function notice(h,text){var el=document.getElementById("ssWarning");if(!el){el=document.createElement("div");el.id="ssWarning";el.setAttribute("role","alert");h.insertBefore(el,h.firstChild);}el.hidden=!text;el.textContent=text||"";}
function row(name,r){if(!r||!r.post)return "";var hi=r.post.slice(3).reduce(function(a,b){return a+b;},0),high=Math.round(hi*100),low=100-high;return '<div class="ss-prow" data-kind="'+name+'"><span>'+name+'</span><b>'+high+'%</b><span class="ss-track" aria-hidden="true"><i style="width:'+Math.max(0,Math.min(100,hi*100)).toFixed(1)+'%"></i></span><b>'+low+'%</b></div>';}
function render(o){var h=mount();notice(h,o.warning);var el=document.getElementById("ssEstimate");if(!el){el=document.createElement("a");el.id="ssEstimate";el.href="#est";el.setAttribute("aria-label","現在の設定推測。詳細へ");h.appendChild(el);}var a=o.numeric,b=o.hints,active=b&&b.post?b:a,html='<div class="ss-meta">'+esc(o.meta)+'</div>';
if(active&&active.post){var p=active.post,best=p.indexOf(Math.max.apply(null,p))+1;html+='<div class="ss-best">最有力 設定'+best+'</div><div class="ss-head"><span>高設定域4〜6</span><span>低設定域1〜3</span></div>'+row("数字のみ",a)+row("示唆込み",b);}else html+='<div class="ss-empty">'+(o.warning?'推測は保留しています':'推測材料がありません')+'</div>';
if(o.masks&&!o.warning)html+='<div class="ss-note ss-applied">濃厚・否定の条件を反映</div>';
if(o.pending!=null)html+='<div class="ss-note">条件確認待ち'+o.pending+'件</div>';
if(o.low)html+='<div class="ss-note">データランプ：信頼度低め</div>';
el.innerHTML=html;size();}
function jumpLink(el){el.setAttribute("role","link");el.setAttribute("tabindex","0");el.setAttribute("aria-label","現在の設定推測。詳細へ");if(!el.dataset.ssBound){el.dataset.ssBound="1";el.addEventListener("click",function(){location.hash="est";});el.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();location.hash="est";}});}}
function legacy(r,low){var h=mount();notice(h,r&&r.conflict?'示唆が矛盾しています。詳細の計算上の扱いを確認してください。':"");var el=document.getElementById("hlbar");if(!el.innerHTML.trim())el.innerHTML='<div class="ss-empty">推測材料がありません</div>';jumpLink(el);var stats=document.getElementById("statbar");if(stats)jumpLink(stats);var old=document.getElementById("ssLow");if(old)old.remove();if(low){var n=document.createElement("div");n.id="ssLow";n.className="ss-note";n.textContent="データランプ：信頼度低め";el.appendChild(n);}if(r&&r.conflict){el.querySelectorAll(".hlc").forEach(function(n){n.textContent="示唆の矛盾あり・詳細を確認";n.classList.remove("conf");});}size();}
function hyena(j,sit,g){var h=mount(),el=document.getElementById("ssHyena");if(!el){el=document.createElement("a");el.id="ssHyena";el.href="#chk";h.appendChild(el);}var t=j.st==="none"?'G数を入力してください':j.st==="in"?'狙い目内':j.st==="over"?'天井G数以上・要確認':'対象外';if(j.st==="near")t+='（あと'+j.rest+'G）';if(g!=null&&Number.isFinite(g))t+=' ／ 天井まで'+Math.max(0,sit.ceil-g)+'G';el.textContent=t;size();}
window.SSTop={render:render,legacy:legacy,hyena:hyena};
})();
