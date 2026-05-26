import { getDb } from './db';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';

interface CsvRow {
  train_id: string;
  train_type: string;
  price: string;
  operating_days: string;
  station: string;
  arrival_time: string;
  departure_time: string;
  stop_order: string;
}

async function readCsv(filePath: string): Promise<CsvRow[]> {
  return new Promise((resolve, reject) => {
    const results: CsvRow[] = [];
    fs.createReadStream(filePath)
      .pipe(parse({ columns: true, trim: true }))
      .on('data', (data) => results.push(data))
      .on('error', (err) => reject(err))
      .on('end', () => resolve(results));
  });
}

function groupTrainRoutes(rows: CsvRow[]) {
  const trainMap = new Map<string, any>();

  for (const row of rows) {
    if (!trainMap.has(row.train_id)) {
      trainMap.set(row.train_id, {
        train_id: row.train_id,
        train_type: row.train_type,
        price: parseInt(row.price, 10),
        operating_days: row.operating_days,
        routeJson: []
      });
    }

    const train = trainMap.get(row.train_id);
    train.routeJson.push({
      station: row.station,
      arrival_time: row.arrival_time,
      departure_time: row.departure_time,
      order: parseInt(row.stop_order, 10)
    });
  }

  const result = Array.from(trainMap.values());
  for (const train of result) {
    train.routeJson.sort((a: any, b: any) => a.order - b.order);
  }

  return result;
}

async function seed() {
  try {
    const db = await getDb();
    // 1. 필요한 테이블 강제 생성
    await db.exec(`
      CREATE TABLE IF NOT EXISTS train_info (
          train_id VARCHAR(50) PRIMARY KEY,
          train_type VARCHAR(20) NOT NULL,
          price INT NOT NULL,
          operating_days VARCHAR(50),
          train_route_json TEXT NOT NULL
      );
    `);

    await db.exec(`
      CREATE TABLE IF NOT EXISTS reservation (
          reservation_id INTEGER PRIMARY KEY AUTOINCREMENT,
          passenger_count INT NOT NULL,
          departure_station VARCHAR(50) NOT NULL,
          arrival_station VARCHAR(50) NOT NULL,
          selected_train_id VARCHAR(50) NOT NULL,
          seat_ids VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 기존 데이터 삭제
    await db.run(`DELETE FROM train_info`);
    // id 초기화
    await db.run(`DELETE FROM sqlite_sequence WHERE name='train_info'`).catch(() => {});

    // CSV 데이터 읽기 및 변환 (프롬프트 5번 준수)
    const csvPath = path.join(__dirname, '..', 'data', 'train_schedule.csv');
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV file not found at ${csvPath}`);
    }

    const rows = await readCsv(csvPath);
    const trains = groupTrainRoutes(rows);

    console.log(`Inserting ${trains.length} real train schedules parsed from CSV...`);

    for (const train of trains) {
        await db.run(
          `INSERT INTO train_info (train_id, train_type, price, operating_days, train_route_json) VALUES (?, ?, ?, ?, ?)`,
          [train.train_id, train.train_type, train.price, train.operating_days, JSON.stringify(train.routeJson)]
        );
    }
    console.log('✅ Successfully seeded real trains into the database! (CSV Migration Complete)');
    process.exit(0);
  } catch(err) {
    console.error('❌ Error seeding data: ', err);
    process.exit(1);
  }
}

seed();
