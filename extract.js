const PROMPT = `이 이미지는 Zoom 화상회의 종료 후 참가자 목록 화면입니다.
화면에 보이는 모든 실제 교육생(호스트/강사 계정은 제외)을 아래 JSON 형식으로만 응답하세요.
설명, 코드블록, 마크다운 없이 순수 JSON 객체 하나만 출력하세요.

같은 사람이 재접속 등으로 여러 번 나오면, 가장 정보가 온전한 한 줄로 합쳐서 한 명당 한 번만 포함하세요.
참가/나간 시간이나 접속시간(분)이 화면에 없으면 빈 문자열로 두세요.

화면에 표시된 이름이 "다울 본점 민유량"처럼 소속(지점/매장명)과 사람 이름이 붙어 있으면,
소속은 affiliation에, 사람 이름만 name에 분리해서 담으세요. 소속을 구분할 수 없으면 affiliation은 빈 문자열로 두세요.

화면 상단의 회의 주제/제목 텍스트에서 다음을 분리해서 읽어주세요. 확실하지 않으면 null로 두세요.
- courseName: 교육과정명
- session: 차수(숫자 문자열)
- schedule: 진행 일정/날짜

{
  "courseName": "교육과정명 (없으면 null)",
  "session": "차수 (없으면 null)",
  "schedule": "진행 일정/날짜 (없으면 null)",
  "students": [
    {"name": "이름", "affiliation": "소속(지점/매장명)", "joinTime": "", "leaveTime": "", "durationMin": ""}
  ]
}`;

export const maxDuration = 60;

function json(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function extractJsonObject(text) {
  const cleaned = String(text || '')
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) {
    throw new Error('응답에서 JSON 인식 결과를 찾지 못했습니다.');
  }
  return JSON.parse(cleaned.slice(start, end + 1));
}

function friendlyGatewayError(status, message) {
  const m = String(message || '');
  if (status === 401 || /unauth|oidc|authentication|token/i.test(m)) {
    return 'Vercel AI 인증에 실패했습니다. 프로젝트의 OIDC 설정을 확인한 뒤 다시 배포해주세요.';
  }
  if (status === 402 || /credit|billing|payment|spend/i.test(m)) {
    return 'Vercel AI Gateway 사용 한도 또는 결제 설정을 확인해주세요.';
  }
  if (status === 429 || /rate limit/i.test(m)) {
    return 'AI 요청이 잠시 많습니다. 잠시 후 다시 시도해주세요.';
  }
  if (status >= 500) {
    return 'AI 서버가 일시적으로 응답하지 않습니다. 잠시 후 다시 시도해주세요.';
  }
  return m || `AI 요청이 실패했습니다. (${status})`;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return json({ error: 'POST 요청만 지원합니다.' }, 405);
    }

    // Vercel 배포에서는 OIDC 토큰이 자동 제공됩니다.
    // AI_GATEWAY_API_KEY가 있으면 그 키를 우선 사용하고, 없으면 OIDC를 사용합니다.
    const gatewayToken = process.env.AI_GATEWAY_API_KEY || process.env.VERCEL_OIDC_TOKEN;
    if (!gatewayToken) {
      return json({
        error: 'Vercel AI 인증 정보가 없습니다. 프로젝트 설정에서 OIDC를 활성화한 뒤 재배포해주세요.'
      }, 503);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
    }

    const base64 = typeof body?.base64 === 'string' ? body.base64 : '';
    const mediaType = typeof body?.mediaType === 'string' ? body.mediaType : 'image/jpeg';

    if (!base64) {
      return json({ error: '이미지 데이터가 없습니다.' }, 400);
    }
    if (base64.length > 4_000_000) {
      return json({ error: '이미지가 너무 큽니다. 더 작은 캡처 이미지로 다시 시도해주세요.' }, 413);
    }
    if (!/^image\/(jpeg|png|webp|gif)$/.test(mediaType)) {
      return json({ error: '지원하지 않는 이미지 형식입니다.' }, 415);
    }

    const model = process.env.AI_MODEL || 'anthropic/claude-sonnet-5';

    let upstream;
    try {
      upstream = await fetch('https://ai-gateway.vercel.sh/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${gatewayToken}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 2200,
          thinking: { type: 'disabled' },
          messages: [{
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: base64,
                },
              },
              { type: 'text', text: PROMPT },
            ],
          }],
        }),
      });
    } catch (error) {
      console.error('AI Gateway network error:', error);
      return json({ error: 'Vercel AI Gateway에 연결하지 못했습니다.' }, 502);
    }

    let data;
    try {
      data = await upstream.json();
    } catch {
      return json({ error: 'AI 서버의 응답을 읽지 못했습니다.' }, 502);
    }

    if (!upstream.ok) {
      const raw = data?.error?.message || data?.message || `AI 요청 실패 (${upstream.status})`;
      console.error('AI Gateway error:', upstream.status, raw);
      return json({ error: friendlyGatewayError(upstream.status, raw), detail: raw }, upstream.status >= 500 ? 502 : 400);
    }

    const textBlock = (data.content || []).find((block) => block.type === 'text');
    if (!textBlock?.text) {
      return json({ error: 'AI가 빈 응답을 반환했습니다.' }, 502);
    }

    try {
      const parsed = extractJsonObject(textBlock.text);
      if (!Array.isArray(parsed.students)) parsed.students = [];
      parsed.students = parsed.students.filter(s => s && String(s.name || '').trim());
      return json(parsed, 200);
    } catch (error) {
      console.error('AI response parse error:', error, textBlock.text);
      return json({ error: 'AI 인식 결과를 정리하지 못했습니다. 같은 사진으로 한 번 더 시도해주세요.' }, 502);
    }
  },
};
