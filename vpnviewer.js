"use strict";

function vpnviewer(parent) {
  const api = {};
  api.parent = parent;
  api.exports = ["onWebUIStartupEnd"];

  api.onWebUIStartupEnd = function () {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // внутри iframe
    const f = document.getElementById("p14frame");
    if (!f || !f.contentWindow || !f.contentWindow.document) return;
    const doc = f.contentWindow.document;

    // уже есть?
    if (doc.getElementById("vpnviewer-topfab")) return;

    // создаём кнопку
    const btn = doc.createElement("button");
    btn.id = "vpnviewer-topfab";
    btn.textContent = "VPN Viewer";
    btn.title = "Тестовая кнопка сверху";
    btn.style.position = "fixed";
    btn.style.top = "10px";
    btn.style.right = "12px";
    btn.style.zIndex = "99999";
    btn.style.padding = "6px 10px";
    btn.style.border = "1px solid #888";
    btn.style.borderRadius = "6px";
    btn.style.background = "#fff";
    btn.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
    btn.onclick = function () {
      alert("VPN Viewer Top Click");
    };

    doc.body.appendChild(btn);
    try { console.log("[vpnviewer] top floating button injected"); } catch (_) {}
  };

  return api;
}

module.exports = vpnviewer;
module.exports.vpnviewer = vpnviewer;
