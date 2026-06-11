---
description: 하네스 메트릭을 집계하여 보여준다. 차단율, self-heal 성공률, first-pass 성공률, 에러 코드 빈도를 확인한다.
---

## /metrics 워크플로우

`/metrics`로 호출한다. `.harness/metrics.jsonl`을 읽어서 최근 7일간 메트릭을 집계한다.

### 실행

```bash
cat .harness/metrics.jsonl
```

파일이 없으면 "메트릭 데이터가 없습니다"를 출력하고 종료한다.

### 집계 항목

1. **차단 횟수**: `scope-guard`, `scaffold-guard`의 `block` 이벤트 수
2. **에러 감지**: `post-write`의 `error` 이벤트 수
3. **first-pass 성공률**: 파일별 첫 `post-write` 이벤트가 `clean`인 비율
4. **self-heal 성공률**: 같은 파일에서 `error` → `clean` 순서로 나온 비율
5. **에러 코드 Top 5**: `codes` 배열에서 가장 빈번한 에러 코드

### 출력 형식

```
📊 Harness Metrics (최근 7일)
─────────────────────────
scope-guard 차단:    N회
scaffold-guard 차단:  N회
post-write 에러 감지: N회
self-heal 성공:      N/N (N%)
first-pass 성공:     N/N (N%)

🔥 가장 많은 에러:
  TS2322 (타입 불일치): N회
  TS7006 (암시적 any):  N회
```

### metrics.jsonl 형식

```jsonl
{"ts":"...","hook":"scope-guard","event":"block","file":"..."}
{"ts":"...","hook":"post-write","event":"error","file":"...","codes":["TS2322"]}
{"ts":"...","hook":"post-write","event":"clean","file":"...","codes":[]}
```

### 판정 로직

- **first-pass**: 파일의 첫 이벤트가 `clean`이면 성공
- **self-heal**: 같은 파일에 `error` 다음 `clean`이면 성공, `error` 다음 `error`면 실패
