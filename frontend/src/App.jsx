import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { Upload, FileText, Activity } from 'lucide-react';
import { uploadDocument, getDocuments, getDocument } from './api';
import DocumentViewer from './components/DocumentViewer';
import AnnotationSidebar from './components/AnnotationSidebar';
import HistoryLog from './components/HistoryLog';

// Connect to socket on Render
const SOCKET_URL = 'https://projectongithub.onrender.com';

function App() {
  const [socket, setSocket] = useState(null);
  const [username, setUsername] = useState('');
  const [isAuthOpen, setIsAuthOpen] = useState(true);
  
  const [documents, setDocuments] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [annotations, setAnnotations] = useState([]);
  const [activeAnnotationId, setActiveAnnotationId] = useState(null);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const fileInputRef = useRef(null);

  // Initialize Socket
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  // Fetch document list on load
  useEffect(() => {
    getDocuments().then(setDocuments).catch(console.error);
  }, []);

  // Handle Socket Events
  useEffect(() => {
    if (!socket || !currentDocId) return;

    socket.emit('join_document', currentDocId);

    const handleAnnotationAdded = (newAnnotation) => {
      setAnnotations(prev => [...prev, newAnnotation]);
    };

    const handleReplyAdded = ({ annotationId, comment }) => {
      setAnnotations(prev => prev.map(ann => {
        if (ann.id === annotationId) {
          return { ...ann, comments: [...(ann.comments || []), comment] };
        }
        return ann;
      }));
    };

    socket.on('annotation_added', handleAnnotationAdded);
    socket.on('reply_added', handleReplyAdded);

    return () => {
      socket.off('annotation_added', handleAnnotationAdded);
      socket.off('reply_added', handleReplyAdded);
    };
  }, [socket, currentDocId]);

  // Handle Login
  const handleLogin = (e) => {
    e.preventDefault();
    if (username.trim()) setIsAuthOpen(false);
  };

  // Load a document
  const handleSelectDocument = async (id) => {
    setCurrentDocId(id);
    setActiveAnnotationId(null);
    try {
      const data = await getDocument(id);
      setCurrentDocument(data.document);
      setAnnotations(data.annotations);
    } catch (error) {
      console.error('Failed to load document', error);
    }
  };

  // Upload document
  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const res = await uploadDocument(file, username);
      const newDocs = await getDocuments();
      setDocuments(newDocs);
      handleSelectDocument(res.id);
    } catch (error) {
      console.error('Upload failed', error);
    }
  };

  // Add Annotation
  const handleAddAnnotation = ({ startOffset, endOffset, selectedText, text }) => {
    if (!socket) return;
    socket.emit('add_annotation', {
      documentId: currentDocId,
      startOffset,
      endOffset,
      selectedText,
      author: username,
      text
    });
  };

  // Add Reply
  const handleReply = (annotationId, text) => {
    if (!socket) return;
    socket.emit('add_reply', {
      documentId: currentDocId,
      annotationId,
      author: username,
      text
    });
  };

  return (
    <div className="app-container">
      {/* Auth Modal */}
      {isAuthOpen && (
        <div className="auth-overlay">
          <div className="auth-card">
            <h2>Welcome to AnnotateHub</h2>
            <form onSubmit={handleLogin}>
              <input
                type="text"
                className="input-field"
                placeholder="Enter your name to collaborate"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
              />
              <button type="submit" className="btn btn-full">Enter Workspace</button>
            </form>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">
          <FileText size={24} /> AnnotateHub
        </div>
        {!isAuthOpen && (
          <div className="nav-controls">
            <span className="username-display">{username}</span>
            <button className="btn btn-secondary" onClick={() => setIsHistoryOpen(true)}>
              <Activity size={18} /> History
            </button>
            <input 
              type="file" 
              accept=".txt" 
              style={{ display: 'none' }} 
              ref={fileInputRef}
              onChange={handleUpload}
            />
            <button className="btn" onClick={() => fileInputRef.current.click()}>
              <Upload size={18} /> Upload Document
            </button>
          </div>
        )}
      </nav>

      {/* Main Workspace */}
      {!isAuthOpen && (
        <div className="main-workspace">
          {/* Left: Document List */}
          <div className="document-list">
            <div className="document-list-header">
              <h3>Documents</h3>
            </div>
            <div className="document-items">
              {documents.length === 0 && (
                <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>
                  No documents found.
                </div>
              )}
              {documents.map(doc => (
                <div 
                  key={doc.id} 
                  className={`doc-item ${currentDocId === doc.id ? 'active' : ''}`}
                  onClick={() => handleSelectDocument(doc.id)}
                >
                  <div className="doc-item-title"><FileText size={16} /> {doc.filename}</div>
                  <div className="doc-item-date">{new Date(doc.uploadedAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Center: Document Viewer */}
          <DocumentViewer 
            document={currentDocument} 
            annotations={annotations}
            onAddAnnotation={handleAddAnnotation}
            activeAnnotationId={activeAnnotationId}
            setActiveAnnotationId={setActiveAnnotationId}
          />

          {/* Right: Sidebar */}
          {currentDocument && (
            <AnnotationSidebar 
              annotations={annotations}
              activeAnnotationId={activeAnnotationId}
              setActiveAnnotationId={setActiveAnnotationId}
              onReply={handleReply}
            />
          )}
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && socket && (
        <HistoryLog onClose={() => setIsHistoryOpen(false)} socket={socket} />
      )}
    </div>
  );
}

export default App;
