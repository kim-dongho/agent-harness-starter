---
description: 프론트엔드 성능 최적화 패턴을 적용한다. 렌더링, 번들 사이즈, 이미지, 네트워크 관련 작업에 자동 적용.
paths:
  - "src/**"
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
---

## 성능 최적화 체크리스트

### 렌더링
- 불필요한 리렌더링을 방지한다 — React DevTools/Vue DevTools로 확인.
- 리스트에 안정적인 `key`를 사용한다.
- 큰 리스트는 가상화(virtualization)를 사용한다 — `@tanstack/react-virtual`, `vue-virtual-scroller` 등.
- DOM 노드 수를 최소화한다 — 1,500개 이하 권장.

### 번들 사이즈
- 코드 스플리팅으로 초기 번들을 줄인다 — `React.lazy()`, `defineAsyncComponent()`, dynamic `import()`.
- tree-shaking이 작동하는지 확인한다 — barrel export(`index.ts`)가 방해할 수 있다.
- 큰 라이브러리는 경량 대안을 검토한다 — `date-fns` vs `moment`, `zustand` vs `redux`.
- 번들 분석 도구를 사용한다 — `@next/bundle-analyzer`, `rollup-plugin-visualizer`.

### 이미지 & 미디어
- 차세대 포맷을 사용한다 — WebP, AVIF.
- 뷰포트 밖 이미지는 lazy loading한다.
- 명시적 `width`/`height`를 설정하여 CLS를 방지한다.
- 프레임워크 내장 이미지 컴포넌트를 사용한다 — `next/image`, `nuxt-image`.

### 네트워크
- 데이터 fetching에 캐싱을 활용한다 — `stale-while-revalidate`, TanStack Query, SWR.
- API 응답은 필요한 필드만 요청한다.
- 크리티컬 리소스에 `preload`, 외부 도메인에 `preconnect`를 사용한다.
- 대용량 데이터는 페이지네이션 또는 무한 스크롤을 구현한다.

### Core Web Vitals
- **LCP** (Largest Contentful Paint) < 2.5s — 히어로 이미지 최적화, 서버 응답 시간 단축.
- **INP** (Interaction to Next Paint) < 200ms — 메인 스레드 블로킹 최소화.
- **CLS** (Cumulative Layout Shift) < 0.1 — 이미지/폰트/광고의 레이아웃 시프트 방지.
