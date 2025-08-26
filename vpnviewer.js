"use strict";

// имя функции = shortName
function vpnviewer(parent) {
  var api = {};
  api.parent = parent;
  api.exports = ["onWebUIStartupEnd", "goPageEnd", "onDeviceRefreshEnd"];

  // === утилиты кладём на window (без замыканий) ===
  window.vpnviewerGetDoc = window.vpnviewerGetDoc || function () {
    try {
      var f = document.getElementById("p14frame") ||
              document.querySelector('iframe#p14frame, iframe[name="p14frame"], iframe[src*="commander"]');
      if (f && f.contentWindow && f.contentWindow.document) return f.contentWindow.document;
    } catch (e) {}
    return document;
  };

  // 1) Плавающая кнопка СВЕРХУ справа (внутри iframe)
  window.vpnviewerAddTopFloatingButton = window.vpnviewerAddTopFloatingButton || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc || !doc.body || doc.getElementById("vpnviewer-topfab")) return;

    var btn = doc.createElement("button");
    btn.id = "vpnviewer-topfab";
    btn.textContent = "VPN Viewer";
    btn.title = "Тестовая кнопка из плагина";
    btn.style.position = "fixed";
    btn.style.top = "8px";
    btn.style.right = "12px";
    btn.style.zIndex = 2147483647;
    btn.style.padding = "6px 10px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function(){ alert("VPN Viewer (top)"); };
    doc.body.appendChild(btn);

    try { console.log("[vpnviewer] top floating button injected"); } catch(e){}
  };

  // найти контейнер верхних вкладок (Сводка / Рабочий стол / …)
  window.vpnviewerFindTopTabs = window.vpnviewerFindTopTabs || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc) return null;

    // известные селекторы разных тем
    var known = ["#p10Tabs", "#dp_Menu", ".h2 .left", ".h2", ".tabArea", ".devicetabs", ".MHeader"];
    for (var i = 0; i < known.length; i++) {
      var el = doc.querySelector(known[i]);
      if (el && el.querySelectorAll("a").length >= 3) return el;
    }

    // fallback: ищем родителя множества ссылок с подписями RU/EN
    var labels = ["Сводка","Рабочий стол","Терминал","Файлы","События","Детали","Консоль",
                  "Overview","Desktop","Terminal","Files","Events","Details","Console"];
    var anchors = Array.from(doc.querySelectorAll("a"));
    var best = null, bestScore = 0;

    anchors.forEach(function(a){
      var txt = (a.textContent || "").trim();
      if (labels.indexOf(txt) === -1) return;
      var p = a.parentElement, depth = 0;
      while (p && depth < 3) {
        var score = 0;
        var as = p.querySelectorAll("a");
        for (var k = 0; k < as.length; k++) {
          var t = (as[k].textContent || "").trim();
          if (labels.indexOf(t) !== -1) score++;
        }
        if (score > bestScore) { best = p; bestScore = score; }
        p = p.parentElement; depth++;
      }
    });
    return best;
  };

  // 2) Кнопка «VPN» в ряд вкладок сверху (внутри iframe)
  window.vpnviewerAddTopTabButton = window.vpnviewerAddTopTabButton || function () {
    var doc = window.vpnviewerGetDoc();
    if (!doc || doc.getElementById("vpnviewer-topbtn")) return;

    var tabs = window.vpnviewerFindTopTabs();
    if (!tabs) { try { console.log("[vpnviewer] top tabs not found yet"); } catch(e){}; return; }

    // возьмём первую ссылку как образец классов
    var sample = tabs.querySelector("a");
    var btn = doc.createElement("a");
    btn.id = "vpnviewer-topbtn";
    btn.href = "javascript:void(0)";
    btn.textContent = "VPN";
    if (sample && sample.className) btn.className = sample.className;
    btn.style.marginLeft = "8px";
    btn.onclick = function(e){ e.preventDefault(); alert("VPN (tab)"); };

    // попробуем поместить справа: оборачиваем в span с float:right, чтобы не ломать сетку
    var wrap = doc.createElement("span");
    wrap.style.cssText = "float:right; display:inline-block;";
    wrap.appendChild(btn);
    tabs.appendChild(wrap);

    try { console.log("[vpnviewer] top tab button injected"); } catch(e){}
  };

  function boot() {
    window.vpnviewerAddTopFloatingButton();
    window.vpnviewerAddTopTabButton();

    if (!window.__vpnviewerRetry) {
      var n = 0;
      window.__vpnviewerRetry = setInterval(function(){
        window.vpnviewerAddTopFloatingButton();
        window.vpnviewerAddTopTabButton();
        if (++n > 60) { clearInterval(window.__vpnviewerRetry); window.__vpnviewerRetry = null; }
      }, 250); // до ~15 секунд, пока iframe и вкладки дорендерятся
    }
  }

  api.onWebUIStartupEnd = function () { boot(); };
  api.goPageEnd = function () { boot(); };
  api.onDeviceRefreshEnd = function () { boot(); };

  return api;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
