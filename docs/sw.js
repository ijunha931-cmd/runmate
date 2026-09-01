// RunMate 서비스 워커
// 지금은 최소한의 캐싱만 해요 (PWA 설치 조건 충족 + 반복 방문 시 로딩 속도 개선용).
// 나중에 오프라인 기능을 본격적으로 넣고 싶으면 여기서 캐싱 전략을 확장하면 돼요.

const CACHE_NAME = 'runmate-cache-v2';
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
    // 우리 사이트 자체 파일만 처리해요.
    const url = new URL(event.request.url);
    if (url.origin !== self.location.origin) {
        return;
    }

    const isHtml = event.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');

    if (isHtml) {
        // HTML은 "최신 버전 먼저" - 항상 서버에서 새로 받아오고,
        // 인터넷이 안 될 때만 저장해둔 옛날 버전을 보여줘요.
        // (이렇게 해야 코드 업데이트가 캐시 때문에 늦게 반영되는 문제가 안 생겨요)
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 아이콘/매니페스트 같은 정적 파일은 캐시 우선(속도 우선)으로 유지
    event.respondWith(
        caches.match(event.request).then((cached) => {
            return cached || fetch(event.request).catch(() => cached);
        })
    );
});
