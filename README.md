# 모바일 캘린더

휴대폰 브라우저와 홈 화면에서 앱처럼 사용할 수 있는 캘린더 웹앱입니다. Supabase를 연결하면 두 사람이 같은 일정을 실시간으로 공유할 수 있습니다.

## 바로 사용하기

[GitHub Pages에서 캘린더 열기](https://suhk2018.github.io/mobile-calendar-draft/)

휴대폰 브라우저에서 위 주소를 연 뒤 **홈 화면에 추가**하면 전체 화면에 가까운 설치형 웹앱(PWA)으로 사용할 수 있습니다.

## 주요 기능

- 월간 캘린더와 날짜별 일정 확인
- 짧은 좌우 스와이프로 이전 달·다음 달 이동
- 날짜를 눌러 바로 일정 추가
- 날짜를 길게 누른 뒤 마지막 날짜까지 끌어서 기간 일정 추가
- 날짜 칸에서 일정 제목 바로 확인
- 개인 일정과 함께하는 일정 분리
- 왼쪽 목록에서 여러 공유 캘린더 생성·참여·전환
- 공유 캘린더 소유자의 삭제와 참여자의 나가기
- 대한민국 공휴일 자동 표시
- 10가지 일정 색상
- 라이트 모드와 다크 모드
- 휴대폰 홈 화면 설치 및 오프라인 실행
- 일정 데이터의 기기 내 저장
- 이메일 로그인과 커플 초대 코드
- 두 휴대폰 사이의 실시간 일정 동기화

## 사용 방법

1. 왼쪽 위 목록 버튼에서 **나의 일정** 또는 공유 캘린더를 선택합니다.
2. 날짜를 한 번 누르면 해당 날짜의 일정 추가 창이 열립니다.
3. 시작 날짜를 약 0.5초간 누른 뒤 마지막 날짜까지 끌면 기간 전체가 선택되고 일정 추가 창이 열립니다.
4. 공유 설정에서 여러 공유 캘린더를 만들거나 초대 코드로 참여할 수 있습니다.
5. 왼쪽 목록 아래의 다크 모드 스위치로 화면 테마를 변경합니다.

## 프로젝트 구조

```text
index.html            화면 구조
styles.css            반응형 디자인과 다크 모드
app.js                캘린더, 일정, 스와이프 기능
manifest.webmanifest  홈 화면 설치 설정
sw.js                 오프라인 캐시와 업데이트 처리
icon.svg              앱 아이콘
supabase-config.js     Supabase 프로젝트 연결 정보
shared-calendar.js     로그인, 커플 연결, 공유 동기화
supabase-schema.sql    데이터베이스 테이블과 보안 정책
supabase-multi-calendar-migration.sql  기존 DB의 다중 캘린더 마이그레이션
supabase-delete-calendar-migration.sql 공유 캘린더 삭제/나가기 마이그레이션
```

별도의 빌드 과정 없이 정적 파일을 GitHub Pages로 배포합니다. Supabase가 연결되지 않은 동안에는 일정이 브라우저의 `localStorage`에 저장됩니다.

## 공유 기능 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
3. Project Settings의 API 화면에서 Project URL과 anon public key를 확인합니다.
4. `supabase-config.js`의 `url`, `anonKey`에 두 값을 입력합니다.
5. 변경 내용을 GitHub에 푸시한 뒤 각자 회원가입합니다.
6. 한 명이 공유 캘린더를 만들고, 표시된 초대 코드를 상대방에게 전달합니다.

기존 Supabase 프로젝트를 사용 중이라면 SQL Editor에서 `supabase-multi-calendar-migration.sql`과 `supabase-delete-calendar-migration.sql`을 한 번씩 실행해야 다중 공유 캘린더, 추가 색상, 삭제·나가기 기능을 사용할 수 있습니다.

공개 저장소에는 `service_role` 키를 절대로 넣지 마세요. 브라우저에는 anon public key만 사용하고, 데이터 접근은 `supabase-schema.sql`의 RLS 정책으로 제한합니다.
