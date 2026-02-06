// API utilities for backend communication
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      return { error: error.message || 'Request failed' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Exercise API functions
export const exerciseApi = {
  getAll: () => apiRequest('/exercises'),
  getById: (id: string) => apiRequest(`/exercises/${id}`),
  create: (exercise: unknown) => apiRequest('/exercises', {
    method: 'POST',
    body: JSON.stringify(exercise),
  }),
  update: (id: string, exercise: unknown) => apiRequest(`/exercises/${id}`, {
    method: 'PUT',
    body: JSON.stringify(exercise),
  }),
  delete: (id: string) => apiRequest(`/exercises/${id}`, {
    method: 'DELETE',
  }),
}

// User stats API functions
export const userApi = {
  getStats: () => apiRequest('/user/stats'),
  updateStats: (stats: unknown) => apiRequest('/user/stats', {
    method: 'PUT',
    body: JSON.stringify(stats),
  }),
}

