# Solana — CPI & 크로스 프로그램
- Cross-Program Invocation(CPI) 시 호출 대상 프로그램 ID를 하드코딩하거나 검증한다.
- CPI에 필요한 모든 계정을 명시적으로 전달한다. 누락된 계정은 런타임 에러를 발생시킨다.
- `invoke_signed`로 PDA 권한을 위임할 때 seeds와 bump를 정확히 전달한다.
