"use strict";

// имя функции ДОЛЖНО совпадать с shortName
function vpnviewer(parent) {
  var obj = {};
  obj.parent = parent;

  // экспортируем ДВА хука, чтобы наверняка
  obj.exports = ["onWebUIStartupEnd", "goPageEnd"];

  // добавляет плавающую кнопку (без привязки к разметке MeshCentral)
  function addFloatingButton() {
    if (typeof document === "undefined") return;
    if (document.getElementById("vpnviewer-fab")) return;

    var btn = document.createElement("button");
    btn.id = "vpnviewer-fab";
    btn.textContent = "VPN Viewer";
    btn.title = "Это тестовая кнопка из плагина";
    btn.style.position = "fixed";
    btn.style.bottom = "14px";
    btn.style.right = "14px";
    btn.style.zIndex = 99999;
    btn.style.padding = "8px 12px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function(){ alert("Кнопка работает"); };
    document.body.appendChild(btn);

    try { console.log("[vpnviewer] floating button injected"); } catch(e){}
  }

  obj.onWebUIStartupEnd = function () {
    if (typeof document === "undefined") return;
    try { console.log("[vpnviewer] onWebUIStartupEnd fired"); } catch(e){}
    try { alert("vpnviewer: hello from plugin"); } catch(e){}
    addFloatingButton();

    // на всякий случай повторяем попытку несколько секунд (SPA-навигация)
    var n = 0, iv = setInterval(function(){
      n++; addFloatingButton();
      if (n > 40) clearInterval(iv); // ~10 секунд
    }, 250);
  };

  obj.goPageEnd = function () {
    addFloatingButton();
  };

  return obj;
}

// совместимые экспорты
module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
