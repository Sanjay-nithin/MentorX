// Lightweight API service for MentorX frontend
// Uses Vite env var VITE_API_BASE or defaults to localhost

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000/api';

async function handleResponse(res) {
  let data;
  try {
    data = await res.json();
  } catch (_) {
    data = null;
  }
  if (!res.ok) {
    const error = new Error(data?.detail || data?.message || `Request failed (${res.status})`);
    // Attach raw payload for debugging
    error.payload = data;
    error.status = res.status;
    throw error;
  }
  return data;
}

// Token management
export function getAccessToken() {
  return localStorage.getItem('mx_access_token');
}

export function getRefreshToken() {
  return localStorage.getItem('mx_refresh_token');
}

export function setTokens(accessToken, refreshToken) {
  localStorage.setItem('mx_access_token', accessToken);
  localStorage.setItem('mx_refresh_token', refreshToken);
}

export function clearTokens() {
  localStorage.removeItem('mx_access_token');
  localStorage.removeItem('mx_refresh_token');
  // Also clear old token for backward compatibility
  localStorage.removeItem('mx_token');
}

// Refresh access token using refresh token
export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }

  const res = await fetch(`${API_BASE}/users/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await handleResponse(res);
  
  if (data?.access_token && data?.refresh_token) {
    setTokens(data.access_token, data.refresh_token);
  }
  
  return data;
}

// Make authenticated API calls with automatic token refresh
export async function authenticatedFetch(url, options = {}) {
  let accessToken = getAccessToken();
  
  // Add authorization header
  const headers = {
    ...options.headers,
    'Authorization': `Bearer ${accessToken}`,
  };

  let res = await fetch(url, { ...options, headers });

  // If 401, try to refresh token and retry once
  if (res.status === 401) {
    try {
      await refreshAccessToken();
      accessToken = getAccessToken();
      headers['Authorization'] = `Bearer ${accessToken}`;
      res = await fetch(url, { ...options, headers });
    } catch (refreshError) {
      // Refresh failed, clear tokens and throw
      clearTokens();
      throw new Error('Session expired. Please log in again.');
    }
  }

  return handleResponse(res);
}

// Get current user using access token
export async function getCurrentUser() {
  return authenticatedFetch(`${API_BASE}/users/me`, {
    method: 'GET',
  });
}

export async function registerUser(payload) {
  const res = await fetch(`${API_BASE}/users/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function loginUser(payload) {
  const res = await fetch(`${API_BASE}/users/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

export async function verifyGoogle(payload) {
  const res = await fetch(`${API_BASE}/users/google-verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Generate KG-like subtopics list (no descriptions) via backend
export async function generateKG(payload) {
  const res = await fetch(`${API_BASE}/kg/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

// Evaluate user's explanation against subtopics
export async function evaluateExplanation(payload) {
  const res = await fetch(`${API_BASE}/kg/evaluate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  try {
    // Persist evaluation file path to localStorage (per requirements)
    const normTopic = (payload.topic || '').trim().toLowerCase();
    if (data?.file_path) {
      localStorage.setItem('mx_eval_file_path', data.file_path);
      if (normTopic) {
        localStorage.setItem(`mx_eval_file_path:${normTopic}`, data.file_path);
      }
    }
  } catch (_) {
    // ignore storage errors
  }
  return data;
}

// Quiz APIs
export async function startQuiz(payload) {
  const res = await fetch(`${API_BASE}/quiz/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await handleResponse(res);
  try {
    if (data?.session_file_path) {
      localStorage.setItem('mx_quiz_session_path', data.session_file_path);
    }
  } catch (_) {}
  return data;
}

export async function nextQuestion(sessionFilePath) {
  const res = await fetch(`${API_BASE}/quiz/next`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_file_path: sessionFilePath }),
  });
  return handleResponse(res);
}

export async function prevQuestion(sessionFilePath) {
  const res = await fetch(`${API_BASE}/quiz/prev`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_file_path: sessionFilePath }),
  });
  return handleResponse(res);
}

export async function answerQuestion(sessionFilePath, questionIndex, answerIndex) {
  const res = await fetch(`${API_BASE}/quiz/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      session_file_path: sessionFilePath, 
      question_index: questionIndex,
      answer_index: answerIndex 
    }),
  });
  return handleResponse(res);
}

export async function finishQuiz(sessionFilePath) {
  const data = await authenticatedFetch(`${API_BASE}/quiz/finish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_file_path: sessionFilePath }),
  });
  
  // DEBUG: Automatically generate PDF notes after quiz completion (score check disabled)
  // Always attempt PDF generation for debugging purposes
  try {
    await generatePDFNotes(sessionFilePath, data);
    console.log('PDF notes generated successfully');
  } catch (error) {
    console.warn('Failed to generate PDF notes:', error);
    // Don't fail the quiz finish if PDF generation fails
  }
  
  return data;
}

// Generate PDF notes from quiz results
export async function generatePDFNotes(sessionFilePath, resultsData) {
  return authenticatedFetch(`${API_BASE}/resources/generate-notes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      session_file_path: sessionFilePath,
      results_data: resultsData
    }),
  });
}

// Get all resources for current user
export async function getMyResources() {
  return authenticatedFetch(`${API_BASE}/resources/my-resources`, {
    method: 'GET',
  });
}

// Delete a resource
export async function deleteResource(resourceId) {
  return authenticatedFetch(`${API_BASE}/resources/${resourceId}`, {
    method: 'DELETE',
  });
}

// Update profile (username, phone, gender, profile_image)
export async function updateProfile(payload) {
  return authenticatedFetch(`${API_BASE}/users/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

// Update personalization (focus_areas, struggling_topics, goal, expected_difficulty)
export async function updatePersonalization(payload) {
  return authenticatedFetch(`${API_BASE}/users/personalization`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export default {
  registerUser,
  loginUser,
  verifyGoogle,
  getCurrentUser,
  updateProfile,
  updatePersonalization,
  generateKG,
  evaluateExplanation,
  startQuiz,
  nextQuestion,
  prevQuestion,
  answerQuestion,
  finishQuiz,
  generatePDFNotes,
  getMyResources,
  deleteResource,
};
