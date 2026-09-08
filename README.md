# 모바일 캘린더

휴대폰 브라우저와 홈 화면에서 앱처럼 사용할 수 있는 캘린더 웹앱입니다. Supabase를 연결하면 두 사람이 같은 일정을 실시간으로 공유할 수 있습니다.

## 바로 사용하기

[GitHub Pages에서 캘린더 열기](https://suhk2018.github.io/mobile-calendar-draft/)

휴대폰 브라우저에서 위 주소를 연 뒤 **홈 화면에 추가**하면 전체 화면에 가까운 설치형 웹앱(PWA)으로 사용할 수 있습니다.

## 주요 기능

- 월간 캘린더와 날짜별 일정 확인
- 좌우 스와이프로 이전 달·다음 달 이동
- 날짜를 길게 눌러 시작하는 기간 선택과 기간 일정
- 라이트 모드와 다크 모드
- 휴대폰 홈 화면 설치 및 오프라인 실행
- 일정 데이터의 기기 내 저장
- 이메일 로그인과 커플 초대 코드
- 두 휴대폰 사이의 실시간 일정 동기화

## 사용 방법

1. 날짜를 누르면 해당 날짜의 일정을 확인합니다.
2. 시작 날짜를 길게 누른 뒤 마지막 날짜를 한 번 누르면 여러 날을 선택할 수 있습니다.
3. 오른쪽 아래 **+** 버튼으로 일정을 추가합니다.
4. 오른쪽 위 달 모양 버튼으로 화면 테마를 변경합니다.

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
```

별도의 빌드 과정 없이 정적 파일을 GitHub Pages로 배포합니다. Supabase가 연결되지 않은 동안에는 일정이 브라우저의 `localStorage`에 저장됩니다.

## 공유 기능 연결

1. Supabase에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase-schema.sql` 전체를 실행합니다.
3. Project Settings의 API 화면에서 Project URL과 anon public key를 확인합니다.
4. `supabase-config.js`의 `url`, `anonKey`에 두 값을 입력합니다.
5. 변경 내용을 GitHub에 푸시한 뒤 각자 회원가입합니다.
6. 한 명이 공유 캘린더를 만들고, 표시된 초대 코드를 상대방에게 전달합니다.

공개 저장소에는 `service_role` 키를 절대로 넣지 마세요. 브라우저에는 anon public key만 사용하고, 데이터 접근은 `supabase-schema.sql`의 RLS 정책으로 제한합니다.
