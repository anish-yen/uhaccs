// API utilities for backend communication
// In dev, Vite proxies /api → http://localhost:3001 (see vite.config.ts)
// so we use a relative path. In production, set VITE_API_URL to the real backend.
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

// Note: userId is now automatically determined from session on backend

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
      credentials: 'include', // Include cookies for session
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      return { error: error.error || error.message || 'Request failed' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Network error' }
  }
}

// Exercise API functions (userId is now from session)
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

// User stats API functions (userId is now from session)
export const userApi = {
  getStats: () => apiRequest('/user/stats'),
  updateStats: (stats: unknown) => apiRequest('/user/stats', {
    method: 'PUT',
    body: JSON.stringify(stats),
  }),
}

// Detection API functions (userId is now from session)
export const detectionApi = {
  getStatus: () => apiRequest('/detection'),
  setDetected: (detected: boolean, exerciseType?: string) => apiRequest('/detection', {
    method: 'POST',
    body: JSON.stringify({ 
      detected, 
      exerciseType
    }),
  }),
}

// Pose detection API functions
export interface PoseData {
  landmarks: Array<{ x: number; y: number; z: number; visibility?: number }>
  exerciseType?: string
  confidence?: number
  timestamp?: string
  formScore?: number
  repCount?: number
}

export interface PoseAnalysis {
  exerciseType: string
  formScore: number
  repCount: number
  duration: number
  quality: string
  feedback: string[]
  landmarks: Array<{ x: number; y: number; z: number }>
}

export const poseApi = {
  // Store pose detection data
  storePoseData: (data: PoseData) => apiRequest('/pose/data', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  
  // Store pose analysis results
  storeAnalysis: (analysis: PoseAnalysis) => apiRequest('/pose/analysis', {
    method: 'POST',
    body: JSON.stringify(analysis),
  }),
  
  // Get current pose data
  getCurrentPose: () => apiRequest<{ detected: boolean; data: PoseData | null }>('/pose/data'),
  
  // Get pose history
  getHistory: (limit?: number) => apiRequest<PoseData[]>(`/pose/history${limit ? `?limit=${limit}` : ''}`),
  
  // Get pose analysis results
  getAnalysis: (limit?: number) => apiRequest<PoseAnalysis[]>(`/pose/analysis${limit ? `?limit=${limit}` : ''}`),
}

// Water detection API functions
export interface WaterDetectionData {
  detected: boolean
  confidence: number
  timestamp: string
  manual?: boolean
}

export const waterApi = {
  // Detect water drinking (with optional confidence)
  detect: (detected: boolean, confidence?: number) => apiRequest<{ success: boolean; message: string; pointsAwarded?: number; data: WaterDetectionData }>('/water/detect', {
    method: 'POST',
    body: JSON.stringify({
      detected,
      confidence: confidence || (detected ? 1.0 : 0),
      timestamp: new Date().toISOString(),
    }),
  }),
  
  // Get current water detection status
  getStatus: () => apiRequest<WaterDetectionData>('/water/status'),
  
  // Get water drinking history
  getHistory: (limit?: number) => apiRequest<WaterDetectionData[]>(`/water/history${limit ? `?limit=${limit}` : ''}`),
  
  // Manually log water drinking
  logManual: () => apiRequest<{ success: boolean; message: string; pointsAwarded: number; data: WaterDetectionData }>('/water/manual', {
    method: 'POST',
  }),
}

// Verification API - for CV detections and activity verification
export interface VerificationRequest {
  user_id?: number
  reminder_id?: number
  type: 'water' | 'exercise'
  verified: boolean
}

export interface VerificationResponse {
  success: boolean
  points_awarded: number
  base_points: number
  streak_bonus: number
  total_points: number
  current_streak: number
}

export const verificationApi = {
  // Verify an activity (water or exercise) and award points
  verify: (payload: VerificationRequest) => apiRequest<VerificationResponse>('/verification', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}

// Reminder API - manage scheduled reminders
export interface Reminder {
  id: number
  user_id: number
  type: 'water' | 'exercise'
  interval_minutes: number
  is_active: number
  created_at?: string
}

export const reminderApi = {
  // Get all reminders for a user
  getAll: (userId: number = 1) => apiRequest<Reminder[]>(`/reminders/${userId}`),

  // Create a new reminder
  create: (payload: { user_id?: number; type: 'water' | 'exercise'; interval_minutes: number }) =>
    apiRequest<Reminder>('/reminders', {
      method: 'POST',
      body: JSON.stringify({ user_id: payload.user_id || 1, ...payload }),
    }),

  // Update a reminder (interval or active state)
  update: (id: number, payload: { interval_minutes?: number; is_active?: boolean }) =>
    apiRequest<Reminder>(`/reminders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  // Delete a reminder
  delete: (id: number) =>
    apiRequest<{ success: boolean }>(`/reminders/${id}`, {
      method: 'DELETE',
    }),
}


