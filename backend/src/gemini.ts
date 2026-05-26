import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

// Gemini API Key 설정
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export interface ParsedCondition {
  departure_station?: string;
  arrival_station?: string;
  date?: string;
  time?: string;
  time_type?: 'before' | 'after'; // 시간 조건 (이전, 이후)
  passenger_count?: number;
  preferences?: string;

  [key: string]: any; // 인덱스 시그니처 추가하여 세션 부가 정보 저장 허용
}

export async function parseUserMessage(text: string): Promise<ParsedCondition | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const prompt = `
사용자의 열차 예매 관련 자연어 입력에서 다음 정보를 추출하여 JSON 형태로 반환해주세요.
만약 사용자의 입력에 아래 중 특정 정보가 "명시적으로" 존재하지 않는다면, 절대 임의로 지어내거나 기본값을 넣지 말고 반드시 null로 처리하세요.

[추출 속성]
- departure_station: 출발역 이름 (예: 서울, 부산, 수서 등)
- arrival_station: 도착역 이름
- date: YYYY-MM-DD 형태 (오늘 날짜 정보: ${today})
- time: HH:mm 형태 (명시되지 않았으면 null)
- time_type: 특정한 시간 기준의 이전/이후 여부 (오후 2시 '이전' -> "before", '이후' 또는 대략적인 시간 -> "after", 명시되지 않았으면 null)
- passenger_count: 명시된 숫자형 인원수 (명시되지 않았으면 null)
- preferences: 좌석 선호도 (예: 창가, 통로 등, 명시되지 않았으면 null)

사용자 입력: "${text}"

주의: 오직 JSON 객체 형태만 응답하세요. 백틱(\`\`\`)이나 추가 설명을 포함하지 마세요.
`;

    const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash"
    });

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("Raw Gemini Response:", responseText);

    if (!responseText) return null;

    // 혹시 모를 마크다운 블록이나 앞뒤 공백 제거
    const cleanText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText) as ParsedCondition;
  } catch (error: any) {
    console.error("Gemini Parsing Error:", error);
    return null;
  }
}
