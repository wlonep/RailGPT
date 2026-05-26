export interface Train {
  train_id: string;
  train_type: 'KTX' | 'SRT';
  station: string;
  arrival_station: string;
  departure_time: string;
  arrival_time: string;
  price: number;
}

export interface Message {
  id: number;
  sender: 'bot' | 'user';
  text?: string;
  trains?: Train[];
}
