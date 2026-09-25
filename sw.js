/* 吃了么 Service Worker —— 让应用能离线打开 */
var CACHE = 'chifan-v7';
var SHELL = [
  './', './index.html', './manifest.json',
  './assets/app-icon-192.png', './assets/app-icon-512.png',
  './assets/app-icon-maskable-512.png', './assets/app-icon-180.png', './assets/favicon.png'
];

self.addEventListener('install', function(e){
  e.waitUntil(
    caches.open(CACHE)
      // 逐个缓存：单个文件失败不影响整体安装
      .then(function(c){ return Promise.all(SHELL.map(function(u){ return c.add(u).catch(function(){}); })); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys()
      .then(function(keys){ return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); })); })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch(err) { return; }
  if(url.origin !== self.location.origin) return;

  // 页面：先用缓存秒开，同时在后台更新
  // （原来是"先要网络"，弱网下会干等网络超时——实测能卡 8 秒以上）
  if(req.mode === 'navigate'){
    e.respondWith(
      caches.match(req).then(function(hit){
        if(hit){
          refresh(req);                 // 后台更新，下次打开就是新版
          return hit;
        }
        return fetch(req).then(function(res){
          if(res && res.ok){ var c = res.clone(); caches.open(CACHE).then(function(ca){ ca.put(req, c); }); }
          return res;
        }).catch(function(){
          return caches.match('./index.html');
        });
      })
    );
    return;
  }

  // 静态资源：先给缓存（快），同时后台更新
  e.respondWith(
    caches.match(req).then(function(hit){
      var net = refresh(req);
      return hit || net;
    })
  );
});

// 后台拉新版并写回缓存；失败就算了，不影响已经返回的缓存内容
function refresh(req){
  return fetch(req).then(function(res){
    if(res && res.ok){
      var copy = res.clone();
      caches.open(CACHE).then(function(c){ c.put(req, copy); });
    }
    return res;
  }).catch(function(){ return null; });
}
