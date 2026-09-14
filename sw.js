const CACHE='masil-v15-dropdown-stability-20260914-1';
const CORE=['./','./index.html','./admin.html','./manifest.webmanifest','./app-icon-192.png','./app-icon-512.png','./brand-logo.png','./export-logo.png'];
const DB='masil_local_big_v1',VER=1;
function mediaFromIdb(id){return new Promise(resolve=>{try{const r=indexedDB.open(DB,VER);r.onsuccess=()=>{const db=r.result;try{const tx=db.transaction('media','readonly'),g=tx.objectStore('media').get(id);g.onsuccess=()=>{const row=g.result;db.close();if(!row?.blob)return resolve(null);resolve(new Response(row.blob,{status:200,headers:{'Content-Type':row.type||row.blob.type||'image/webp','Cache-Control':'private, max-age=31536000'}}))};g.onerror=()=>{db.close();resolve(null)}}catch{db.close();resolve(null)}};r.onerror=()=>resolve(null)}catch{resolve(null)}})}
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',event=>{
  const req=event.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
  const mediaMatch=url.pathname.match(/\/__media\/([^/?#]+)/);
  if(mediaMatch){event.respondWith(mediaFromIdb(mediaMatch[1]).then(r=>r||new Response('',{status:404})));return;}
  if(req.mode==='navigate'){
    event.respondWith(caches.match(req).then(cached=>fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>cached||caches.match(url.pathname.endsWith('admin.html')?'./admin.html':'./index.html'))));return;
  }
  event.respondWith(caches.match(req).then(cached=>{const network=fetch(req).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy)).catch(()=>{});return res;}).catch(()=>cached);return cached||network;}));
});
