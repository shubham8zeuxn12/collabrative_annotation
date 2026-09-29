import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';

export default function AnnotationSidebar({ 
  annotations, 
  activeAnnotationId, 
  onReply,
  setActiveAnnotationId
}) {
  const [replyTexts, setReplyTexts] = useState({});
  const sidebarRef = useRef(null);
  
  // Scroll to active annotation thread
  useEffect(() => {
    if (activeAnnotationId && sidebarRef.current) {
      const el = sidebarRef.current.querySelector(`[data-id="${activeAnnotationId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [activeAnnotationId]);

  const handleReplySubmit = (e, annotationId) => {
    e.preventDefault();
    const text = replyTexts[annotationId];
    if (!text?.trim()) return;
    
    onReply(annotationId, text);
    setReplyTexts(prev => ({ ...prev, [annotationId]: '' }));
  };

  if (!annotations || annotations.length === 0) {
    return (
      <div className="annotation-sidebar">
        <div className="sidebar-header">
          <MessageSquare size={20} />
          Comments
        </div>
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          No comments on this document yet. Select some text to add one.
        </div>
      </div>
    );
  }

  return (
    <div className="annotation-sidebar">
      <div className="sidebar-header">
        <MessageSquare size={20} />
        Comments ({annotations.length})
      </div>
      
      <div className="thread-list" ref={sidebarRef}>
        {annotations.map(ann => (
          <div 
            key={ann.id} 
            data-id={ann.id}
            className={`thread-card ${activeAnnotationId === ann.id ? 'active' : ''}`}
            onClick={() => setActiveAnnotationId(ann.id)}
          >
            <div className="thread-quote">
              "{ann.selectedText}"
            </div>
            
            <div className="comment-list">
              {ann.comments?.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="avatar">
                    {comment.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="comment-content">
                    <div className="comment-header">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">{new Date(comment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    <div className="comment-text">
                      {comment.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <form 
              className="reply-box" 
              onSubmit={(e) => handleReplySubmit(e, ann.id)}
              onClick={e => e.stopPropagation()}
            >
              <input 
                type="text" 
                placeholder="Reply..." 
                value={replyTexts[ann.id] || ''}
                onChange={e => setReplyTexts(prev => ({ ...prev, [ann.id]: e.target.value }))}
              />
              <button type="submit" className="reply-btn">
                <Send size={16} />
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
