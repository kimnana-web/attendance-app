[이미지 인식 오류 수정본]

이 버전은 기존 ANTHROPIC_API_KEY 방식 대신 Vercel AI Gateway + OIDC를 사용합니다.
Vercel에 새로 만든 프로젝트라면 OIDC 토큰이 배포 환경에 자동 제공되므로,
별도의 Anthropic API Key를 HTML이나 Vercel 환경변수에 넣을 필요가 없습니다.

가장 쉬운 반영 방법
1) GitHub에서 기존 attendance-app 저장소를 엽니다.
2) 기존 파일을 새 수정본 파일로 교체합니다.
   - index.html
   - api/extract.js
   - api/health.js (새 파일)
3) GitHub에서 변경사항을 커밋합니다.
4) Vercel은 GitHub main 브랜치 변경을 감지해 자동으로 다시 배포합니다.
5) 배포 완료 후 기존 공유 URL로 접속하여 사진 인식을 테스트합니다.

확인용 주소
https://내프로젝트.vercel.app/api/health

정상이라면 대략 다음처럼 표시됩니다.
{"ok":true,"oidc":true,"gatewayKey":false,"model":"anthropic/claude-sonnet-5"}

만약 oidc:false라면
Vercel 프로젝트 > 설정(Settings) > 보안(Security) 또는 OIDC 관련 설정에서
OIDC가 활성화되어 있는지 확인한 뒤 재배포합니다.

만약 이미지 인식 시 '사용 한도 또는 결제 설정' 오류가 뜨면
Vercel AI Gateway의 사용량/결제 설정을 확인해야 합니다.
