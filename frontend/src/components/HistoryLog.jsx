import React from 'react';
import { History, X, Activity } from 'lucide-react';
import { getHistory } from '../api';

export default function HistoryLog({ onClose, socket }) {
  const [history, setHistory] = React.useState([]);

  React.useEffect(() => {
    getHistory().then(data => setHistory(data));

    const handleUpdate = (newLog) => {
      setHistory(prev => [newLog, ...prev]);
    };

    socket.on('history_updated', handleUpdate);
    return () => socket.off('history_updated', handleUpdate);
  }, [socket]);

  return (
    <div className="history-modal" onClick={onClose}>
      <div className="history-content" onClick={e => e.stopPropagation()}>
        <div className="history-header">
          <h2><Activity size={20} /> Activity History</h2>
          <button className="close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="history-list">
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No activity yet.</div>
          ) : (
            history.map((log, idx) => (
              <div key={idx} className="history-item">
                <History size={16} className="history-icon" />
                <div className="history-details">
                  <div className="history-action">
                    {log.author} {log.details.toLowerCase()}
                  </div>
                  <div className="history-meta">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
