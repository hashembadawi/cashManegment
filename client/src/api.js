const API_BASE = import.meta.env.VITE_API_URL || '/api';

let authToken = localStorage.getItem('cash_token') || '';

export function setAuthToken(token) {
  authToken = token || '';
  if (authToken) {
    localStorage.setItem('cash_token', authToken);
  } else {
    localStorage.removeItem('cash_token');
  }
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    headers,
    ...options,
  });

  if (!response.ok) {
    let message = 'Unexpected server error.';
    try {
      const payload = await response.json();
      message = payload.message || message;
    } catch {
      message = 'Unexpected server error.';
    }
    throw new Error(message);
  }

  return response.json();
}

export const api = {
  login(payload) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getUsers() {
    return request('/auth/users');
  },
  createUser(payload) {
    return request('/auth/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  getBoxes(search = '') {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request(`/boxes${query}`);
  },
  createBox(payload) {
    return request('/boxes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateBox(id, payload) {
    return request(`/boxes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteBox(id) {
    return request(`/boxes/${id}`, {
      method: 'DELETE',
    });
  },
  getTransactions(boxId) {
    return request(`/boxes/${boxId}/transactions`);
  },
  createTransaction(boxId, payload) {
    return request(`/boxes/${boxId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },
  updateTransaction(id, payload) {
    return request(`/transactions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  deleteTransaction(id) {
    return request(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },
};
