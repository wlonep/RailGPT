import { getDb } from './db';

function generateRandomSeats(count: number, preferences?: string): string[] {
    const seats: string[] = [];
    const carNum = Math.floor(Math.random() * 8) + 1; // 1~8호차
    // A, D는 창가 / B, C는 통로
    let seatCols = ['A', 'D'];
    if (preferences && preferences.includes('통로')) {
        seatCols = ['B', 'C'];
    } else if (preferences && preferences.includes('무관')) {
        seatCols = ['A', 'B', 'C', 'D'];
    }

    for (let i = 0; i < count; i++) {
        let rowNum = Math.floor(Math.random() * 15) + 1; // 1~15번 줄
        let col = seatCols[Math.floor(Math.random() * seatCols.length)];
        seats.push(`${carNum}호차 ${rowNum}${col}`);
    }
    return seats;
}

export async function createReservation(
    trainId: string,
    passengerCount: number,
    departureStation: string,
    arrivalStation: string,
    preferences?: string
) {
    const allocatedSeats = generateRandomSeats(passengerCount, preferences);
    const seatsString = allocatedSeats.join(', ');

    try {
        const db = await getDb();
        const result = await db.run(
            `INSERT INTO reservation (passenger_count, departure_station, arrival_station, selected_train_id, seat_ids)
             VALUES (?, ?, ?, ?, ?)`,
             [passengerCount, departureStation, arrivalStation, trainId, seatsString]
        );

        // 결제 단계 더미 연결 (MVP 범위: 가계약 결재 처리)
        const paymentId = 'PAY-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        return {
            success: true,
            reservation_id: result.lastID,
            payment_id: paymentId,
            seats: allocatedSeats,
            message: `가계약 결제가 승인되었습니다 (결제번호: ${paymentId}).\n성공적으로 예약되었습니다! (배정좌석: ${seatsString})`
        };
    } catch (error) {
        console.error('Error creating reservation:', error);
        throw error;
    }
}
