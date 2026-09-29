

const API_URL = `http://${window.location.hostname}:3001/api`;

export const uploadDocument = async (file, author) => {
  const formData = new FormData();
  formData.append('document', file);
  formData.append('author', author);
  
  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData,
  });
  return response.json();
};

export const getDocuments = async () => {
  const response = await fetch(`${API_URL}/documents`);
  return response.json();
};

export const getDocument = async (id) => {
  const response = await fetch(`${API_URL}/documents/${id}`);
  return response.json();
};

export const getHistory = async () => {
  const response = await fetch(`${API_URL}/history`);
  return response.json();
};
