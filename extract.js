const PROMPT = `이 이미지는 기업 교육 운영 시스템의 '차수별 학습자 정보' 화면 또는 교육 참가자 명단 화면입니다.
화면에 실제로 표시된 정보를 정확히 읽어 아래 JSON 형식으로만 응답하세요.
설명, 마크다운, 코드블록은 절대 출력하지 말고 JSON 객체 하나만 출력하세요.

[가장 중요한 정확성 원칙]
- 한글 이름과 매장명은 한 글자만 달라도 다른 정보입니다.
- 비슷하게 생긴 자음/모음을 임의로 바꾸지 마세요.
- 각 이름과 매장명을 화면과 글자 단위로 두 번 대조한 뒤 출력하세요.
- 화면에 보이지 않는 내용을 추측해서 만들지 마세요.
- 특히 김태현을 김타현처럼, 동성로직영점을 비슷한 다른 글자로 바꾸지 않도록 주의하세요.
- 매장명은 축약/의역/교정하지 말고 '매장명' 열에 표시된 전체 글자를 그대로 옮기세요.

[차수별 학습자 정보 표가 있는 경우]
오직 아래 표의 실제 학습자 데이터 행만 students에 넣으세요.
- 소속명
- 매장명
- 이름

아래는 학생 데이터가 아니므로 students에 절대 넣지 마세요.
- 학습자 승인 현황
- 신청/승인/취소·반려 인원
- 출석현황
- 출석인원/등록학습자/미등록학습자
- 학습자직접등록/학습자엑셀등록/차수변경/승인/반려/삭제 버튼
- NO/소속명/매장명/이름 같은 표 머리글

[소속 affiliation]
예:
대구마케팅담당 > 동대구마케팅팀 > 상상대리점 → "동대구"
대구마케팅담당 > 서대구마케팅팀 > 더블유대리점 → "서대구"
대구마케팅담당 > 경북마케팅팀 > 중앙SK대리점 → "경북"

규칙:
1. '○○마케팅담당' 상위 조직은 버립니다.
2. '○○마케팅팀'에서 '마케팅팀'만 제거한 지역명만 affiliation에 넣습니다.
3. 뒤의 대리점명은 affiliation에 넣지 않습니다.
4. 확실하지 않으면 빈 문자열로 둡니다.

[매장명 storeName]
- 표에 '매장명' 열이 있으면 반드시 그 셀의 문자열을 사용합니다.
- 소속명 열 마지막에 나오는 대리점명을 매장명 대신 쓰지 마세요.
- 예: 매장명 열에 '더블유대리점 동성로직영점'이면 storeName도 정확히 '더블유대리점 동성로직영점'입니다.
- 화면에 보이는 글자와 띄어쓰기를 최대한 그대로 유지합니다.

[이름 name]
- 반드시 '이름' 열의 실제 사람 이름을 사용합니다.
- 한글 이름을 글자 단위로 두 번 확인합니다.
- 다른 열이나 현황 영역의 글자를 이름으로 넣지 않습니다.

[교육과정 정보]
화면에서 보이는 경우에만 추출하고 불확실하면 null:
- courseName: 과정명
- session: 차수 숫자만. 예: 32차수 → "32"
- schedule: 날짜. '2026.08.20 ~ 2026.08.20'이면 "2026.08.20"; 범위이면 시작일
- instructor: 담당 강사 이름. 화면에 없으면 null

[참여 시간]
- durationMin은 자동으로 추출하지 말고 항상 "".
- joinTime과 leaveTime도 항상 "".

[중복]
- affiliation + storeName + name이 같은 동일 교육생은 한 번만 포함합니다.

반드시 아래 JSON 구조만 출력하세요.
{
  "courseName": null,
  "session": null,
  "schedule": null,
  "instructor": null,
  "students": [
    {
      "affiliation": "동대구",
      "storeName": "화면의 매장명 그대로",
      "name": "화면의 이름 그대로",
      "joinTime": "",
      "leaveTime": "",
      "durationMin": ""
    }
  ]
}`;

function jsonResponse(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return jsonResponse(405, {
        code: 'METHOD_NOT_ALLOWED',
        message: 'POST 요청만 사용할 수 있습니다.'
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return jsonResponse(503, {
        code: 'SERVER_API_KEY_MISSING',
        message: 'Vercel 환경 변수 ANTHROPIC_API_KEY가 등록되지 않았습니다.'
      });
    }

    try {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse(400, {
          code: 'INVALID_JSON',
          message: '요청 데이터를 읽지 못했습니다.'
        });
      }

      const base64 = body?.base64;
      const mediaType = body?.mediaType || 'image/jpeg';

      if (!base64) {
        return jsonResponse(400, {
          code: 'IMAGE_MISSING',
          message: '이미지 데이터가 없습니다.'
        });
      }

      const anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          max_tokens: 3500,
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64
                }
              },
              {
                type: 'text',
                text: PROMPT
              }
            ]
          }]
        })
      });

      let raw;
      try {
        raw = await anthropicResp.json();
      } catch {
        return jsonResponse(502, {
          code: 'AI_BAD_RESPONSE',
          message: 'AI 응답을 읽지 못했습니다.'
        });
      }

      if (!anthropicResp.ok) {
        return jsonResponse(anthropicResp.status, {
          code: 'AI_ERROR',
          message: raw?.error?.message || `AI 요청 실패 (${anthropicResp.status})`
        });
      }

      const textBlock = (raw.content || []).find(x => x.type === 'text');
      const text = textBlock?.text || '';

      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');

      if (start < 0 || end < start) {
        return jsonResponse(502, {
          code: 'JSON_NOT_FOUND',
          message: 'AI 응답에서 학습자 정보를 찾지 못했습니다.'
        });
      }

      let parsed;
      try {
        parsed = JSON.parse(text.slice(start, end + 1));
      } catch {
        return jsonResponse(502, {
          code: 'JSON_PARSE_ERROR',
          message: 'AI가 반환한 학습자 정보 형식을 읽지 못했습니다.'
        });
      }

      const seen = new Set();
      const students = [];

      for (const s of (parsed.students || [])) {
        const affiliation = String(s.affiliation || '').trim();
        const storeName = String(s.storeName || '').trim();
        const name = String(s.name || '').trim();

        if (!name) continue;

        const combined = `${affiliation} ${storeName} ${name}`;

        if (/학습자\s*승인|출석현황|신청\s*:|승인\s*:|취소|반려|등록학습자|미등록학습자|학습자직접등록|학습자엑셀등록|차수변경/.test(combined)) {
          continue;
        }

        const key = `${affiliation}|${storeName}|${name}`.replace(/\s+/g, '');

        if (seen.has(key)) continue;
        seen.add(key);

        students.push({
          affiliation,
          storeName,
          name,
          joinTime: '',
          leaveTime: '',
          durationMin: ''
        });
      }

      return jsonResponse(200, {
        courseName: parsed.courseName ?? null,
        session: parsed.session ?? null,
        schedule: parsed.schedule ?? null,
        instructor: parsed.instructor ?? null,
        students
      });

    } catch (err) {
      console.error(err);

      return jsonResponse(500, {
        code: 'SERVER_ERROR',
        message: err?.message || '사진 인식 중 서버 오류가 발생했습니다.'
      });
    }
  }
};
