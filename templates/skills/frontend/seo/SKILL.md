---
description: SEO 최적화 패턴을 적용한다. 메타태그, 구조화된 데이터, 페이지 구조 관련 작업에 자동 적용.
paths:
  - "src/app/**/page.*"
  - "src/app/**/layout.*"
  - "src/pages/**"
---

## SEO 체크리스트

### 메타 태그
- 모든 페이지에 고유한 `<title>`과 `<meta name="description">`을 설정한다.
- `title`은 60자 이하, `description`은 160자 이하로 작성한다.
- Open Graph(`og:title`, `og:description`, `og:image`)와 Twitter Card를 설정한다.
- `canonical` URL을 설정하여 중복 콘텐츠를 방지한다.

### 페이지 구조
- `<h1>`은 페이지당 하나만 사용한다.
- 제목 태그(`h1`~`h6`)는 순서대로 사용한다.
- 의미 있는 이미지에 `alt` 텍스트를 제공한다.
- 내부 링크에 설명적인 anchor text를 사용한다.

### 기술적 SEO
- `robots.txt`와 `sitemap.xml`을 생성한다.
- 서버 사이드 렌더링(SSR) 또는 정적 생성(SSG)을 활용한다.
- 페이지 로드 속도를 최적화한다 (Core Web Vitals).
- 모바일 반응형을 보장한다.

### 구조화된 데이터
- JSON-LD 형식으로 Schema.org 마크업을 추가한다.
- 페이지 유형에 맞는 스키마를 사용한다 (Article, Product, FAQ 등).
