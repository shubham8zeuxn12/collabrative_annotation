const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('./db');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Setup multer for text file uploads
const upload = multer({ dest: 'uploads/' });

// Ensure uploads directory exists
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Helper to log history
function logHistory(action, documentId, author, details) {
  const stmt = db.prepare('INSERT INTO history_logs (action, documentId, author, details) VALUES (?, ?, ?, ?)');
  stmt.run(action, documentId, author, details);
  
  // Broadcast history update
  io.emit('history_updated', { action, documentId, author, details, timestamp: new Date().toISOString() });
}

// API: Upload a document
app.post('/api/upload', upload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { originalname, path: tempPath } = req.file;
    const author = req.body.author || 'System';
    const content = fs.readFileSync(tempPath, 'utf-8');
    
    const id = uuidv4();
    const stmt = db.prepare('INSERT INTO documents (id, filename, content) VALUES (?, ?, ?)');
    stmt.run(id, originalname, content);
    
    // Clean up temp file
    fs.unlinkSync(tempPath);

    logHistory('DOCUMENT_UPLOADED', id, author, `Uploaded document: ${originalname}`);
    
    res.json({ id, filename: originalname, content });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// API: Get all documents
app.get('/api/documents', (req, res) => {
  const docs = db.prepare('SELECT id, filename, uploadedAt FROM documents ORDER BY uploadedAt DESC').all();
  res.json(docs);
});

// API: Get a single document with its annotations
app.get('/api/documents/:id', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }

  const annotations = db.prepare('SELECT * FROM annotations WHERE documentId = ? ORDER BY startOffset ASC').all(doc.id);
  
  const annotationsWithComments = annotations.map(ann => {
    const comments = db.prepare('SELECT * FROM comments WHERE annotationId = ? ORDER BY createdAt ASC').all(ann.id);
    return { ...ann, comments };
  });

  res.json({ document: doc, annotations: annotationsWithComments });
});

// API: Get History
app.get('/api/history', (req, res) => {
  const history = db.prepare('SELECT * FROM history_logs ORDER BY timestamp DESC LIMIT 100').all();
  res.json(history);
});

// WebSockets for Real-time Collaboration
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_document', (documentId) => {
    socket.join(documentId);
    console.log(`Socket ${socket.id} joined document ${documentId}`);
  });

  socket.on('add_annotation', (data) => {
    try {
      const annotationId = uuidv4();
      const commentId = uuidv4();
      
      db.prepare('INSERT INTO annotations (id, documentId, startOffset, endOffset, selectedText, author) VALUES (?, ?, ?, ?, ?, ?)')
        .run(annotationId, data.documentId, data.startOffset, data.endOffset, data.selectedText, data.author);
        
      db.prepare('INSERT INTO comments (id, annotationId, text, author) VALUES (?, ?, ?, ?)')
        .run(commentId, annotationId, data.text, data.author);

      const newAnnotation = {
        id: annotationId,
        documentId: data.documentId,
        startOffset: data.startOffset,
        endOffset: data.endOffset,
        selectedText: data.selectedText,
        author: data.author,
        createdAt: new Date().toISOString(),
        comments: [{
          id: commentId,
          annotationId,
          text: data.text,
          author: data.author,
          createdAt: new Date().toISOString()
        }]
      };

      io.to(data.documentId).emit('annotation_added', newAnnotation);
      logHistory('ANNOTATION_ADDED', data.documentId, data.author, `Added annotation to "${data.selectedText.substring(0, 20)}..."`);
    } catch (err) {
      console.error("Error adding annotation:", err);
    }
  });

  socket.on('add_reply', (data) => {
    try {
      const commentId = uuidv4();
      
      db.prepare('INSERT INTO comments (id, annotationId, text, author) VALUES (?, ?, ?, ?)')
        .run(commentId, data.annotationId, data.text, data.author);

      const newComment = {
        id: commentId,
        annotationId: data.annotationId,
        text: data.text,
        author: data.author,
        createdAt: new Date().toISOString()
      };

      io.to(data.documentId).emit('reply_added', { annotationId: data.annotationId, comment: newComment });
      logHistory('REPLY_ADDED', data.documentId, data.author, `Replied to an annotation`);
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
