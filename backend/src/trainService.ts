import { ParsedCondition } from './gemini';
import { getDb } from './db';

interface RouteStop {
  station: string;
  arrival_time: string;
  departure_time: string;
}

interface TrainRow {
  train_id: string;
  train_type: string;
  price: number;
  operating_days: string;
  train_route_json: string; // or any depending on mysql2 return type, usually object if json
}

export async function searchTrainsFromDB(condition: ParsedCondition) {
  const { departure_station, arrival_station, time, time_type, passenger_count } = condition;

  if (!departure_station || !arrival_station) return [];

  const paxCount = passenger_count || 1;

  try {
    const db = await getDb();
    const rows = await db.all('SELECT * FROM train_info');
    const trains = rows as TrainRow[];

    let matchedTrains = trains.map(train => {
      // In mysql2, json columns might be parsed automatically, but let's be safe
      const route: RouteStop[] = typeof train.train_route_json === 'string'
        ? JSON.parse(train.train_route_json)
        : train.train_route_json;

      if (!Array.isArray(route)) return null;

      const depIndex = route.findIndex(r => r.station === departure_station);
      const arrIndex = route.findIndex(r => r.station === arrival_station);

      if (depIndex !== -1 && arrIndex !== -1 && depIndex < arrIndex) {
        const depRoute = route[depIndex];
        const arrRoute = route[arrIndex];

        if (!depRoute || !arrRoute) return null;

        const depTime = depRoute.departure_time;
        const arrTime = arrRoute.arrival_time;

        return {
          train_id: train.train_id,
          train_type: train.train_type,
          station: departure_station,
          arrival_station: arrival_station,
          departure_time: depTime,
          arrival_time: arrTime,
          price: train.price * paxCount,
          _depTimeMinutes: timeToMinutes(depTime)
        };
      }
      return null;
    }).filter(t => t !== null);

    // 사용자가 요청한 시간이 있으면 입력된 시간 기준 계산
    const targetMinutes = time ? timeToMinutes(time) : 0;

    // 요청 시간에 따른 이전/이후 기차 필터링
    if (time) {
       if (time_type === 'before') {
           // '이전'인 경우: 요청 시간보다 같거나 이전에 출발하는 기차
           let beforeTrains = matchedTrains.filter(t => t!._depTimeMinutes <= targetMinutes);
           if (beforeTrains.length > 0) {
               matchedTrains = beforeTrains;
               // 사용자가 요청한 시간에 가장 가까운 순서대로 정렬 (내림차순, 예를 들어 14:00 이전이면 13:50이 12:00보다 먼저 오도록)
               matchedTrains.sort((a, b) => b!._depTimeMinutes - a!._depTimeMinutes);
           } else {
               // 이전 기차가 없으면 가장 가까운 기차 순 정렬
               matchedTrains.sort((a, b) => Math.abs(a!._depTimeMinutes - targetMinutes) - Math.abs(b!._depTimeMinutes - targetMinutes));
           }
       } else {
           // 기본값 ('after'): 요청 시간보다 같거나 이후에 출발하는 기차
           let afterTrains = matchedTrains.filter(t => t!._depTimeMinutes >= targetMinutes);
           if (afterTrains.length > 0) {
               matchedTrains = afterTrains;
               matchedTrains.sort((a, b) => a!._depTimeMinutes - b!._depTimeMinutes);
           } else {
               matchedTrains.sort((a, b) => Math.abs(a!._depTimeMinutes - targetMinutes) - Math.abs(b!._depTimeMinutes - targetMinutes));
           }
       }
    } else {
       matchedTrains.sort((a, b) => a!._depTimeMinutes - b!._depTimeMinutes);
    }

    return matchedTrains.slice(0, 3).map(t => {
      const { _depTimeMinutes, ...rest } = t!;
      return rest;
    });

  } catch (error) {
    console.error('Error in searchTrainsFromDB:', error);
    return [];
  }
}

function timeToMinutes(t: string | undefined): number {
  if (!t) return 0;
  // expects "HH:mm" or "HH:mm:ss"
  const parts = t.split(':');
  let mins = 0;
  if (parts.length >= 2) {
    mins = parseInt(parts[0] || '0', 10) * 60 + parseInt(parts[1] || '0', 10);
  }
  return mins;
}
