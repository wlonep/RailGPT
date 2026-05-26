import express, { Request, Response } from 'express';
import cors from 'cors';
import { parseUserMessage, ParsedCondition } from './gemini';
import { searchTrainsFromDB } from './trainService';
import { createReservation } from './reservationService';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 간단한 인메모리 세션 저장소 (대화 상태 유지용)
const sessionStore: Record<string, Partial<ParsedCondition>> = {};

// 헬스 체크 엔드포인트
app.get('/', (req: Request, res: Response) => {
    res.send('RailGPT Backend API is running!');
});

// 자연어 챗 입력 처리 컨트롤러 뼈대
app.post('/api/chat', async (req: Request, res: Response) => {
    try {
        const { text, sessionId } = req.body;
        console.log(`[Session: ${sessionId}] Received User Input:`, text);

        // 세션 데이터 초기화 및 로드
        if (!sessionStore[sessionId]) {
            sessionStore[sessionId] = {};
        }

        // 사용자가 명시적으로 초기화 힌트를 주거나, 처음부터 다시 검색하는 맥락이면 세션 데이터 날리기
        const isResetIntent = text.includes('처음부터') || text.includes('다시') || text.includes('취소');
        if (isResetIntent) {
            sessionStore[sessionId] = {};
        }

        const sessionData = sessionStore[sessionId];

        // 1. Gemini API를 호출하여 자연어를 파싱하고 검색 조건을 추출 (FR-01)
        const parsedConditions = await parseUserMessage(text);

        if (!parsedConditions) {
            res.json({ error: '말씀하신 내용을 이해하지 못했습니다. 다시 말씀해주세요.' });
            return;
        }

        console.log('Parsed conditions:', parsedConditions);

        // 2. 추출된 정보를 현재 세션에 병합(저장)하여 컨텍스트 유지 (기존에 있던 걸 덮어쓰기)
        if (parsedConditions.departure_station && String(parsedConditions.departure_station) !== 'null') sessionData.departure_station = parsedConditions.departure_station;
        if (parsedConditions.arrival_station && String(parsedConditions.arrival_station) !== 'null') sessionData.arrival_station = parsedConditions.arrival_station;
        if (parsedConditions.time && String(parsedConditions.time) !== 'null') sessionData.time = parsedConditions.time;
        if (parsedConditions.time_type && String(parsedConditions.time_type) !== 'null') sessionData.time_type = parsedConditions.time_type;
        if (parsedConditions.passenger_count && parsedConditions.passenger_count !== null && parsedConditions.passenger_count !== 0) sessionData.passenger_count = parsedConditions.passenger_count;
        if (parsedConditions.preferences && String(parsedConditions.preferences) !== 'null') sessionData.preferences = parsedConditions.preferences;

        // 3. 필수 정보(출발, 도착, 시간, 인원수) 누락 여부 검증
        const missing = [];
        if (!sessionData.departure_station || sessionData.departure_station === 'null') missing.push('출발역');
        if (!sessionData.arrival_station || sessionData.arrival_station === 'null') missing.push('도착역');
        if (!sessionData.time || sessionData.time === 'null') missing.push('출발시간');
        if (!sessionData.passenger_count || String(sessionData.passenger_count) === 'null' || sessionData.passenger_count === 0) missing.push('탑승인원');

        if (missing.length > 0) {
            res.json({
                reply: `아직 부족한 정보가 있습니다. [${missing.join(', ')}] 정보를 알려주세요.\n(현재 인식된 정보: 출발-${sessionData.departure_station || '미정'}, 도착-${sessionData.arrival_station || '미정'}, 시간-${sessionData.time || '미정'}, 인원-${sessionData.passenger_count ? sessionData.passenger_count + '명' : '미정'})`,
            });
            return;
        }

        const paxCount = sessionData.passenger_count || 1;

        // TODO 2: DB (train_info)에서 조건에 맞는 열차 검색 로직 구현 (FR-02, FR-05)
        const trains = await searchTrainsFromDB(sessionData as ParsedCondition);

        let replyMessage = '';
        if (trains.length > 0) {
            replyMessage = `'${sessionData.departure_station}'에서 '${sessionData.arrival_station}'(으)로 가는 ${paxCount}명 기차입니다. 원하시는 기차를 선택해주세요.`;

            // 검색된 기차들의 출발/도착역 정보를 세션에 임시 저장(예약 시 사용)
            sessionData._last_searched_departure = sessionData.departure_station;
            sessionData._last_searched_arrival = sessionData.arrival_station;
            sessionData._last_searched_paxCount = paxCount;
        } else {
            replyMessage = `요청하신 조건에 맞거나 가까운 기차를 찾을 수 없습니다.`;
        }

        const responseObj = {
            reply: replyMessage,
            trains: trains
        };

        res.json(responseObj);

    } catch (error) {
        console.error('Chat API Error:', error);
        res.status(500).json({ error: '서버 내부 오류가 발생했습니다.' });
    }
});

// 예약 처리 엔드포인트 뼈대
app.post('/api/reservation', async (req: Request, res: Response) => {
    try {
        const { trainId, sessionId } = req.body;

        const sessionData = sessionStore[sessionId] || {};
        const pCount = sessionData._last_searched_paxCount || 1;
        const dep = sessionData._last_searched_departure || sessionData.departure_station || '미정';
        const arr = sessionData._last_searched_arrival || sessionData.arrival_station || '미정';
        const prefs = sessionData.preferences || '';

        const reservationResult = await createReservation(trainId, pCount, dep, arr, prefs);

        res.json({
            success: true,
            message: reservationResult.message,
            seats: reservationResult.seats
        });
    } catch (error) {
        console.error('Reservation API Error:', error);
        res.status(500).json({ error: '예약 처리 중 오류가 발생했습니다.' });
    }
});


app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
