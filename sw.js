/* 昼中華3連単 通知を受け取る仕組み（service worker）
 * 通知を受け取って出すだけ。ファイルを覚える（キャッシュ）仕組みは持たせない
 * 本番（/hiru-chuka-sanrentan/）とテスト（/hiru-chuka-sanrentan/test/）で同じファイルを、それぞれの場所に置く */
const TEST = /\/test\/$/.test(self.registration.scope);
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', e => {
  e.waitUntil(self.registration.showNotification((TEST ? '［テスト］' : '') + '今週の出馬表が公開されました。', {
    tag: 'shutsuba', icon: 'assets/pwa/icons/default-192.png',
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    const mine = list.find(c => c.url.startsWith(self.registration.scope));
    return mine ? mine.focus() : self.clients.openWindow(self.registration.scope);
  }));
});
