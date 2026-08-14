# 천하무적동부교육팀 교육생 만족도 체크 — 공개 웹 배포용

이 버전은 기존 `file:///C:/.../index.html` 로컬 파일을 **Vercel에 배포해 PC/모바일 어디서든 동일한 HTTPS 주소로 접속**할 수 있도록 수정한 버전입니다.

## 이번 수정에서 바뀐 점

- 브라우저에 Anthropic API 키를 저장하던 구조 제거
- 사진 인식은 `/api/extract` Vercel 서버 함수가 처리
- API 키는 HTML에 노출하지 않고 Vercel 환경변수에 한 번만 저장
- Excel 생성도 `/api/export-xlsx`에서 처리하여 외부 CDN 의존 제거
- Excel 서버 연결에 문제가 있을 때 CSV 자동 폴백
- 화면 데이터는 각 기기의 브라우저 `localStorage`에 저장
- 모바일/PC 동일 URL 사용 가능

## Vercel 배포 순서

### 1. 이 폴더를 그대로 Vercel에 올리기

폴더 구성은 다음과 같습니다.

```text
index.html
package.json
vercel.json
api/
  extract.js
  export-xlsx.js
README.md
```

가장 쉬운 방법은 **GitHub 저장소에 이 폴더의 파일을 올린 뒤 Vercel에서 해당 저장소를 Import**하는 것입니다. Git 저장소를 연결하면 이후 수정본을 push할 때 자동 재배포할 수도 있습니다.

로컬 폴더에서 바로 배포하려면 Vercel CLI도 사용할 수 있습니다. 프로젝트 루트에서:

```bash
npx vercel --prod
```

을 실행하고 화면 안내에 따라 Vercel 계정/프로젝트를 연결하면 됩니다.

### 2. Anthropic API Key를 Vercel에 등록

Vercel 프로젝트에서:

**Settings → Environment Variables → Add New**

다음 값을 등록합니다.

- Name: `ANTHROPIC_API_KEY`
- Value: 본인의 Anthropic API Key

선택사항:

- Name: `ANTHROPIC_MODEL`
- Value: 사용할 Claude 모델 ID

`ANTHROPIC_MODEL`을 등록하지 않으면 현재 앱 기본값인 `claude-sonnet-4-6`을 사용합니다.

환경변수를 추가한 뒤 반드시 **Redeploy** 하세요.

### 3. 생성된 URL 공유

배포가 완료되면 예를 들어 아래와 같은 주소가 생성됩니다.

```text
https://dongbu-education-attendance.vercel.app
```

이제 이 URL은 `file:///C:/...` 주소와 달리 다른 PC와 휴대폰에서도 접속할 수 있습니다.

## 중요한 데이터 저장 방식

현재 버전에서 교육 기록은 **서버 공용 DB가 아니라 각 브라우저 localStorage에 저장**됩니다.

따라서:

- 강사 A의 PC에 입력한 기록은 강사 A의 PC 브라우저에 저장
- 강사 B의 휴대폰에 입력한 기록은 강사 B의 휴대폰 브라우저에 저장
- 같은 URL을 사용해도 서로의 과거 기록이 자동 공유되지는 않음
- 최종 결과는 Excel/이미지로 내려받아 취합 가능

팀 전체가 입력한 기록을 한 화면에서 같이 보고 싶다면 다음 단계로 **공용 데이터베이스**를 붙여야 합니다.

## 보안상 꼭 확인할 점

공개 URL로 배포하고 `ANTHROPIC_API_KEY`를 서버에 등록하면, URL을 아는 사람은 사진 인식 기능을 사용하면서 API 사용량을 발생시킬 수 있습니다.

팀 내부 사용이라면 다음 중 하나를 권장합니다.

- Vercel 접근 제한 기능 사용
- 별도 사내 인증 연결
- 간단한 팀 공용 비밀번호 기능 추가

또한 교육생 이름이 포함된 캡처 이미지는 사진 인식을 위해 Anthropic API로 전송됩니다. 회사 개인정보 및 AI 보안 정책을 확인한 뒤 사용하세요.

## 로컬 파일로 열 때

`index.html`을 `file:///...`로 직접 열면 화면 자체는 표시될 수 있지만 `/api/extract`, `/api/export-xlsx` 서버 기능은 동작하지 않습니다. **실사용은 Vercel의 HTTPS 배포 주소에서 하세요.**
