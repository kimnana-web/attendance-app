@echo off
chcp 65001 > nul
echo.
echo ==============================================
echo  천하무적동부교육팀 교육생 만족도 체크 - Vercel 배포
echo ==============================================
echo.
echo Node.js가 설치되어 있어야 합니다.
echo 배포 후 Vercel Settings ^> Environment Variables에서
echo ANTHROPIC_API_KEY를 등록하고 Redeploy 해주세요.
echo.
npx vercel --prod
pause
