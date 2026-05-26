import React from 'react';
import type { Train } from './types';

interface TrainCardProps {
  train: Train;
  onSelect: (trainId: string) => void;
}

const TrainCard: React.FC<TrainCardProps> = ({ train, onSelect }) => {
  const isKTX = train.train_type.toUpperCase() === 'KTX';

  return (
    <div style={{
      border: '1px solid #e1e4e8',
      padding: '16px',
      borderRadius: '12px',
      backgroundColor: '#fff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      minWidth: '240px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '18px', color: isKTX ? '#003399' : '#5b1d47' }}>
          {train.train_type} <span style={{ fontSize: '14px', color: '#666' }}>({train.train_id})</span>
        </h3>
        <span style={{ fontWeight: 'bold', color: '#1d1d1f' }}>{train.price.toLocaleString()}원</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{train.station}</div>
          <div style={{ fontSize: '14px', color: '#555' }}>{train.departure_time}</div>
        </div>
        <div style={{ flex: 1, textAlign: 'center', color: '#999', margin: '0 10px' }}>
          ──➔
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{train.arrival_station}</div>
          <div style={{ fontSize: '14px', color: '#555' }}>{train.arrival_time}</div>
        </div>
      </div>

      <button
        onClick={() => onSelect(train.train_id)}
        style={{
          marginTop: '8px',
          padding: '12px 16px',
          backgroundColor: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          fontSize: '15px'
        }}
      >
        이 열차 선택하기
      </button>
    </div>
  );
};

export default TrainCard;
