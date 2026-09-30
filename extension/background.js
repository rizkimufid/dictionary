"use strict"

chrome.runtime.onMessage.addListener(function (msg, sender, sendResponse) {
  if (!msg || msg.type !== "exec-main") return
  if (!sender || !sender.tab) return
  var code = String(msg.code || "")
  if (!code) return

  chrome.scripting
    .executeScript({
      target: { tabId: sender.tab.id, frameIds: [sender.frameId] },
      world: "MAIN",
      args: [code],
      func: function (src) {
        ;(0, eval)(src)
      },
    })
    .then(function () {
      sendResponse({ ok: true })
    })
    .catch(function (e) {
      console.error("[Dictionary Search] exec-main gagal:", e)
      sendResponse({ ok: false })
    })
  return true
})