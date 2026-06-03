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

  const contentType = response.headers.get('content-type') || '';
  const rawBody = await response.text();

  let payload = null;
  if (rawBody) {
    if (contentType.includes('application/json')) {
      try {
        payload = JSON.parse(rawBody);
      } catch {
        payload = null;
      }
    } else {
      payload = rawBody;
    }
  }

  if (!response.ok) {
    let message = 'Unexpected server error.';
    if (payload && typeof payload === 'object' && payload.message) {
      message = payload.message;
    } else if (typeof payload === 'string' && payload.trim()) {
      message = payload.slice(0, 180);
    }
    throw new Error(message);
  }

  if (!rawBody) {
    return {};
  }

  if (payload && typeof payload === 'object') {
    return payload;
  }

  throw new Error('Server returned a non-JSON response. Check VITE_API_URL and backend health.');
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
