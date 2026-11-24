self.addEventListener('install',e=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('push',e=>{let d={};try{d=e.data?e.data.json():{}}catch(x){}
e.waitUntil(self.registration.showNotification(d.title||'شفا',{body:d.body||'حان موعد الدواء',tag:d.tag||'shefa',icon:'icon-192.png',badge:'icon-192.png',vibrate:[200,100,200],requireInteraction:true,data:{url:'./'}}))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:'window'}).then(l=>l.length?l[0].focus():self.clients.openWindow('./')))});
