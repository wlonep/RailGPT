import React, { useState, useRef, useEffect } from 'react';
import type { Message } from './types';
import TrainCard from './TrainCard';
import './App.css';

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, sender: 'bot', text: '안녕하세요! RailGPT입니다. 원하시는 기차 여정을 자연스럽게 말씀해주세요. 🚄\n(예: "서울에서 부산까지 가장 빠른 기차 2명")' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const newUserMsg: Message = { id: Date.now(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, newUserMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          sessionId: 'user_123'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} 에러가 발생했습니다.`);
      }

      const data = await response.json();

      if (data.error) {
        setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'bot', text: `오류가 발생했습니다: ${data.error}` }]);
        setIsLoading(false);
        return;
      }

      const botResponse: Message = {
        id: Date.now() + 1,
        sender: 'bot',
        text: data.reply,
        trains: data.trains
      };

      setMessages(prev => [...prev, botResponse]);
    } catch (error) {
      console.error('서버 연결 오류:', error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '서버와 연결할 수 없습니다.\n네트워크 상태나 서버가 켜져 있는지 확인해주세요.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReservation = async (trainId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:3000/api/reservation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainId: trainId,
          sessionId: 'user_123' // 채팅과 동일한 세션 ID 사용
        })
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: `예매 오류: ${data.error || '알 수 없는 오류가 발생했습니다.'}` }]);
        return;
      }

      const confirmMsg: Message = {
        id: Date.now(),
        sender: 'bot',
        text: `✅ [${trainId}] ${data.message}`
      };
      setMessages(prev => [...prev, confirmMsg]);

    } catch (error) {
      console.error('예매 서버 연결 오류:', error);
      setMessages(prev => [...prev, { id: Date.now(), sender: 'bot', text: '예매 서버와 연결할 수 없습니다.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: '"Pretendard", sans-serif', backgroundColor: '#f4f5f7', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#333', marginBottom: '20px' }}>🚄 RailGPT</h2>

      <div style={{ height: '60vh', minHeight: '400px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #e1e4e8', padding: '20px', marginBottom: '16px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
            <div style={{
              display: 'inline-block',
              padding: '12px 16px',
              borderRadius: '16px',
              backgroundColor: msg.sender === 'user' ? '#007bff' : '#f0f2f5',
              color: msg.sender === 'user' ? '#fff' : '#1d1d1f',
              whiteSpace: 'pre-wrap',
              wordBreak: 'keep-all',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              {msg.text && <div style={{textAlign: 'left'}}>{msg.text}</div>}
            </div>

            {msg.trains && (
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {msg.trains.map(train => (
                  <TrainCard key={train.train_id} train={train} onSelect={handleReservation} />
                ))}
              </div>
            )}
          </div>
        ))}
        {isLoading && (
          <div style={{ alignSelf: 'flex-start', padding: '12px 16px', borderRadius: '16px', backgroundColor: '#f0f2f5', color: '#666' }}>
            <div className="typing-indicator">
              <span></span><span></span><span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="목적지와 일정을 자유롭게 말씀해주세요."
          style={{ flex: 1, padding: '14px 16px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '15px' }}
        />
        <button
          type="submit"
          style={{ padding: '0 24px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 'bold', transition: 'background-color 0.2s' }}
          disabled={isLoading || !inputText.trim()}
        >
          전송
        </button>
      </form>
    </div>
  );
};

export default App;
