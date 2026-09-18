# 모바일 캘린더

휴대폰 브라우저와 홈 화면에서 앱처럼 사용할 수 있는 캘린더 웹앱입니다. Supabase를 연결하면 두 사람이 같은 일정을 실시간으로 공유할 수 있습니다.

## 바로 사용하기

[GitHub Pages에서 캘린더 열기](https://suhk2018.github.io/mobile-calendar-draft/)

휴대폰 브라우저에서 위 주소를 연 뒤 **홈 화면에 추가**하면 전체 화면에 가까운 설치형 웹앱(PWA)으로 사용할 수 있습니다.

홈 화면 추가가 계속 진행 중인 상태로 멈추면 기존 캘린더 아이콘을 먼저 삭제하고 브라우저를 완전히 종료한 뒤 다시 열어 추가해 주세요. 홈 화면 아이콘만 삭제해도 설치 정보가 남는 기기에서는 기기 설정의 앱 목록에서 기존 캘린더 웹앱을 제거해야 합니다.

## 주요 기능

- 월간 캘린더와 날짜별 일정 확인
- 휴대폰의 남은 화면 높이를 채우는 월간 캘린더
- 해당 월에 필요한 주 수만 표시해 불필요한 다음 달 한 줄 제거
- 짧은 좌우 스와이프로 이전 달·다음 달 이동
- 날짜를 눌러 일정 확인
- 날짜를 누르거나 달력을 위로 밀면 월 전체를 세로로 요약하고 선택 날짜의 일정을 바로 아래에 표시
- 요약된 달력을 아래로 밀거나 닫기 버튼을 누르면 화면을 채우는 달력으로 복귀
- 축소 달력이나 일정 패널을 아래로 밀면 화면을 채우는 달력으로 복귀
- 날짜를 길게 누른 뒤 마지막 날짜까지 끌어서 기간을 선택하면 일정 패널 자동 열기
- 달력의 일정 막대를 길게 누른 뒤 다른 날짜로 끌어서 기간과 시간을 유지한 채 이동
- 선택한 날짜 아래의 버튼으로 일정 추가
- 여러 날 일정은 주 단위의 이어진 막대로, 하루 일정은 날짜 칸에서 제목 확인
- 여러 날 일정의 같은 색 날짜 카드는 주 단위로 연결해 하나의 기간처럼 표시
- 기간 일정은 한 줄로 연결하고, 하루짜리 시간 일정만 제목과 시간을 두 줄로 표시
- 같은 날짜에 겹치는 일정만 높이에 반영해 기간 막대 사이의 불필요한 간격 제거
- 시간 입력 아래에 `오전 9시 30분` 형식의 읽기 쉬운 시간 표시
- 종일 일정을 먼저, 시간 일정은 이른 시간순으로 자동 정렬
- 한 날짜의 일정을 최대 5개까지 표시하고 이후 항목은 `+N` 배지로 안내
- 공유 일정 작성자를 달력의 `나`·`상` 배지와 일정 목록의 `나`·`상대방`으로 구분
- 등록한 일정 수정과 삭제
- 일정 항목을 눌러 수정하고 같은 화면에서 삭제
- 일정별 최대 500자 메모 작성 및 공유
- 개인 일정과 함께하는 일정 분리
- 왼쪽 목록에서 여러 공유 캘린더 생성·참여·전환
- 공유 캘린더 관리 화면에서 선택, 초대 코드 복사, 이름·만난 날 변경을 한눈에 처리
- 공유 캘린더별 처음 만난 날을 달력에서 특별 표시
- 공유 캘린더의 날짜를 눌러 만난 날을 체크하고 달력에 작은 하트로 표시
- 만난 날마다 여러 방문 장소를 순서대로 기록하고 두 사람이 함께 확인
- 장소 이름·주소·메모를 저장하고 네이버 지도에서 위치 또는 현재 위치 선택
- 가게 검색 결과를 선택하면 별도 이름을 입력하지 않아도 실제 가게명을 장소 이름으로 자동 사용
- 장소 선택 지도를 전체 화면으로 확대해 정확한 위치를 터치로 선택
- 전체 화면 지도의 `축소` 버튼 또는 휴대폰 뒤로가기로 원래 크기로 복귀
- 가게명·도로명·지번을 검색해 결과를 누르면 장소 이름, 주소와 지도 마커를 자동 입력
- 하단 `캘린더 / 지도` 탭으로 전환하고 방문 장소를 날짜별 묶음으로 확인
- 지도 탭의 날짜 제목을 누르면 그날 방문한 모든 위치를 지도에 한 번에 표시
- 방문 지도를 전체 화면으로 확대하고 주소를 검색하거나 지도에서 선택한 위치의 주소 확인
- 저장된 방문 장소 마커를 눌러 장소 이름·주소·방문일 확인
- 상단과 캘린더 목록에서 매일 자동 갱신되는 D-day 확인
- 100일·1년 단위 기념일을 분홍색 종일 일정으로 달력에 자동 표시
- 상단 D-day를 눌러 다가오는 기념일과 두 사람의 생일을 날짜순으로 함께 확인
- 공유 캘린더에서 각자 자신의 생일을 저장하고 달력에서 분홍색 종일 일정으로 확인
- 공유 캘린더 생성·참여 직후 해당 캘린더로 자동 전환
- 화면 위에서 현재 선택한 캘린더 이름 확인
- 새로고침하거나 다시 열어도 마지막으로 선택한 캘린더 유지
- 공유 캘린더 소유자의 삭제와 참여자의 나가기
- 공유 캘린더 소유자의 이름 변경
- 대한민국 공휴일 자동 표시
- 공휴일을 날짜 칸을 밀어내지 않는 빨간색 종일 일정 막대로 표시
- 10가지 일정 색상
- 라이트 모드와 다크 모드
- 휴대폰 홈 화면 설치 및 오프라인 실행
- 일정 데이터의 기기 내 저장
- 이메일 로그인과 커플 초대 코드
- 두 휴대폰 사이의 실시간 일정 동기화
- 휴대폰 뒤로가기로 지도 확대, 장소·일정 입력, 날짜 일정 화면을 차례로 닫고 첫 달력에서 한 번 더 누르면 앱 종료

## 사용 방법

1. 왼쪽 위 목록 버튼에서 **나의 일정** 또는 공유 캘린더를 선택합니다.
2. 날짜를 한 번 누르거나 달력을 위로 밀면 월 전체가 요약되고, 선택한 날짜의 일정이 달력 바로 아래에 나타납니다. 아래로 밀거나 닫기 버튼을 누르면 다시 펼쳐집니다.
3. 시작 날짜를 약 0.5초간 누른 뒤 마지막 날짜까지 끌면 기간 전체가 선택되고 일정 패널이 열립니다.
4. 선택한 날짜 아래의 **일정 추가** 버튼을 누르면 입력창이 열립니다. 일정 이름 칸을 누를 때만 키보드가 표시됩니다.
5. 이미 등록된 일정은 달력의 일정 막대를 약 0.5초간 누른 뒤 원하는 날짜로 끌어서 옮길 수 있습니다.
6. 공유 캘린더의 하루를 선택한 뒤 **만난 날로 기록**을 누르면 일정 막대 대신 날짜에 하트가 남습니다.
7. 체크한 만난 날의 **장소 추가**에서 장소 이름·주소·메모를 남깁니다. 네이버 지도 키가 연결되어 있으면 지도 또는 현재 위치로 좌표를 선택할 수 있습니다.
8. 화면 아래의 **지도** 탭을 누르면 선택한 공유 캘린더의 모든 방문 장소가 마커와 목록으로 표시됩니다.
9. 공유 설정에서 여러 공유 캘린더를 만들거나 초대 코드로 참여할 수 있습니다. 완료되면 해당 캘린더가 바로 열립니다.
10. 왼쪽 목록 아래의 다크 모드 스위치로 화면 테마를 변경합니다.

## 프로젝트 구조

```text
index.html            화면 구조
styles.css            반응형 디자인과 다크 모드
app.js                캘린더, 일정, 스와이프 기능
manifest.webmanifest  홈 화면 설치 설정
sw.js                 오프라인 캐시와 업데이트 처리
icon.svg              앱 아이콘
apple-touch-icon.png  iPhone 홈 화면용 180px 아이콘
icon-192.png          Android 일반 아이콘
icon-512.png          Android 고해상도 일반 아이콘
icon-maskable-512.png Android 적응형(마스커블) 아이콘
supabase-config.js     Supabase 프로젝트 연결 정보
map-config.js          네이버 지도 Client ID 설정
shared-calendar.js     로그인, 커플 연결, 공유 동기화
supabase/functions/naver-place-search/index.ts  가게명 검색용 보안 프록시
supabase-schema.sql    데이터베이스 테이블과 보안 정책
supabase-multi-calendar-migration.sql  기존 DB의 다중 캘린더 마이그레이션
supabase-delete-calendar-migration.sql 공유 캘린더 삭제/나가기 마이그레이션
supabase-rename-calendar-migration.sql 공유 캘린더 이름 변경 마이그레이션
supabase-anniversary-migration.sql 처음 만난 날과 D-day 마이그레이션
supabase-birthday-migration.sql 공유 캘린더 구성원의 생일 마이그레이션
supabase-event-memo-migration.sql 공유 일정 메모 마이그레이션
supabase-meeting-places-migration.sql 만난 날과 방문 장소 마이그레이션
```

별도의 빌드 과정 없이 정적 파일을 GitHub Pages로 배포합니다. Supabase가 연결되지 않은 동안에는 일정이 브라우저의 `localStorage`에 저장됩니다.

## 공유 기능 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
3. Project Settings의 API 화면에서 Project URL과 anon public key를 확인합니다.
4. `supabase-config.js`의 `url`, `anonKey`에 두 값을 입력합니다.
5. 변경 내용을 GitHub에 푸시한 뒤 각자 회원가입합니다.
6. 한 명이 공유 캘린더를 만들고, 표시된 초대 코드를 상대방에게 전달합니다.

기존 Supabase 프로젝트를 사용 중이라면 SQL Editor에서 `supabase-multi-calendar-migration.sql`, `supabase-delete-calendar-migration.sql`, `supabase-rename-calendar-migration.sql`, `supabase-anniversary-migration.sql`, `supabase-birthday-migration.sql`, `supabase-event-memo-migration.sql`, `supabase-meeting-places-migration.sql`을 한 번씩 실행해야 다중 공유 캘린더, 추가 색상, 삭제·나가기, 이름 변경, D-day, 생일, 일정 메모와 방문 장소 기능을 사용할 수 있습니다. 장소 마이그레이션은 기존 하트 기록을 새 만난 날 테이블로 자동 이전합니다.

## 네이버 지도 연결

1. NAVER Cloud Platform의 **Application Services > Maps > Application**에서 애플리케이션을 만듭니다.
2. 애플리케이션의 API에서 **Dynamic Map**을 반드시 선택하고, 주소 자동 입력을 위해 **Geocoding**과 **Reverse Geocoding**도 선택합니다.
3. Web 서비스 URL에 배포 오리진 `https://suhk2018.github.io`와 로컬 확인용 `http://127.0.0.1:8765`를 등록합니다.
4. 발급된 Client ID를 `map-config.js`의 `clientId`에 입력합니다.
5. Client Secret은 브라우저 파일이나 공개 GitHub 저장소에 입력하지 않습니다.

### 가게 이름 검색 연결

가게명 검색은 NAVER Cloud Platform의 **NAVER API HUB > 검색 > 지역** API를 사용하며 지도용 Client ID와는 별도입니다. 2026년 7월 31일부터 NAVER Developers에서는 검색 API 신규 신청을 받지 않습니다.

1. NAVER Cloud 콘솔에서 **All Services > Application Services > NAVER API HUB > Subscription**으로 이동해 서비스 이용을 신청합니다.
2. **NAVER API HUB > Application > Application 등록**에서 **검색 > 지역**을 선택해 애플리케이션을 만듭니다.
3. Supabase Edge Function Secrets에 `NAVER_API_HUB_CLIENT_ID`, `NAVER_API_HUB_CLIENT_SECRET`을 저장합니다.
4. `supabase functions deploy naver-place-search --project-ref lkwnftupcknlyxodslyu`로 함수를 배포합니다.
5. Secret은 `map-config.js`, `supabase-config.js` 또는 GitHub 저장소에 넣지 않습니다.

배포된 `naver-place-search` 함수가 NAVER API HUB와 연결되어 일정의 장소 추가 지도와 하단 방문 지도에서 상호명으로 최대 5개의 업체·기관을 검색할 수 있습니다. 연결에 문제가 있으면 도로명·지번 주소 검색으로 자동 전환됩니다.

Client ID가 없어도 장소 이름·주소·메모는 저장할 수 있으며, 지도 위치 선택만 비활성화됩니다.

공개 저장소에는 `service_role` 키를 절대로 넣지 마세요. 브라우저에는 anon public key만 사용하고, 데이터 접근은 `supabase-schema.sql`의 RLS 정책으로 제한합니다.
