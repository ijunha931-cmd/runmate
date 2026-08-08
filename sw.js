// RunMate 서비스 워커
// 지금은 최소한의 캐싱만 해요 (PWA 설치 조건 충족 + 반복 방문 시 로딩 속도 개선용).
// 나중에 오프라인 기능을 본격적으로 넣고 싶으면 여기서 캐싱 전략을 확장하면 돼요.

const CACHE_NAME = 'runmate-cache-v1';
const CORE_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // 외부 요청(Firebase, Unsplash 이미지 등)은 그대로 네트워크로 보내고,
    // 우리 사이트 자체 파일만 캐시 우선으로 처리해요.
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).catch(() => cached);
        })
    );
});
