import React, { useState, useRef, useEffect } from 'react';
import { FileText, Plus } from 'lucide-react';

export default function DocumentViewer({ 
  document, 
  annotations, 
  onAddAnnotation, 
  activeAnnotationId, 
  setActiveAnnotationId 
}) {
  const [popover, setPopover] = useState(null);
  const [commentText, setCommentText] = useState('');
  const contentRef = useRef(null);

  // Handle text selection
  useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection.rangeCount || selection.isCollapsed) {
        setPopover(null);
        return;
      }

      const range = selection.getRangeAt(0);
      
      // Ensure selection is inside the document content
      if (!contentRef.current.contains(range.commonAncestorContainer)) {
        return;
      }

      const preSelectionRange = range.cloneRange();
      preSelectionRange.selectNodeContents(contentRef.current);
      preSelectionRange.setEnd(range.startContainer, range.startOffset);
      const startOffset = preSelectionRange.toString().length;
      const selectedText = selection.toString();
      const endOffset = startOffset + selectedText.length;

      if (selectedText.trim().length === 0) return;

      const rect = range.getBoundingClientRect();
      const containerRect = contentRef.current.parentElement.getBoundingClientRect();

      setPopover({
        startOffset,
        endOffset,
        selectedText,
        top: rect.bottom - containerRect.top + contentRef.current.parentElement.scrollTop + 10,
        left: rect.left - containerRect.left + (rect.width / 2) - 150
      });
    };

    const container = contentRef.current?.parentElement;
    if (container) {
      container.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      if (container) {
        container.removeEventListener('mouseup', handleMouseUp);
      }
    };
  }, [document]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    
    onAddAnnotation({
      startOffset: popover.startOffset,
      endOffset: popover.endOffset,
      selectedText: popover.selectedText,
      text: commentText
    });
    
    setCommentText('');
    setPopover(null);
    window.getSelection().removeAllRanges();
  };

  // Render text with highlighted annotations
  const renderContent = () => {
    if (!document) return null;

    let elements = [];
    let currentIndex = 0;
    const text = document.content;

    // Sort annotations by startOffset
    const sortedAnns = [...annotations].sort((a, b) => a.startOffset - b.startOffset);

    sortedAnns.forEach((ann, idx) => {
      if (ann.startOffset > currentIndex) {
        elements.push(
          <span key={`text-${currentIndex}`}>
            {text.substring(currentIndex, ann.startOffset)}
          </span>
        );
      }

      elements.push(
        <mark
          key={ann.id}
          className={`annotation-mark ${activeAnnotationId === ann.id ? 'active' : ''}`}
          onClick={() => setActiveAnnotationId(ann.id)}
        >
          {text.substring(Math.max(currentIndex, ann.startOffset), ann.endOffset)}
        </mark>
      );
      
      currentIndex = Math.max(currentIndex, ann.endOffset);
    });

    if (currentIndex < text.length) {
      elements.push(
        <span key={`text-${currentIndex}`}>
          {text.substring(currentIndex)}
        </span>
      );
    }

    return elements;
  };

  if (!document) {
    return (
      <div className="document-viewer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <h3>No Document Selected</h3>
          <p>Select a document from the list or upload a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer">
      <div className="document-content" ref={contentRef}>
        {renderContent()}
      </div>

      {popover && (
        <div 
          className="add-annotation-popover"
          style={{ top: popover.top, left: popover.left }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <textarea
              className="input-field"
              style={{ minHeight: '80px', marginBottom: '0', resize: 'vertical' }}
              placeholder="Add a comment..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              autoFocus
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
                onClick={() => setPopover(null)}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn"
                style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem' }}
              >
                Comment
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
