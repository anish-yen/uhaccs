// Authentication utilities
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'

export interface User {
  id: number
  username: string
  email: string
  displayName: string
  avatarUrl: string | null
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      credentials: 'include',
    })
    
    if (!response.ok) {
      // 401 means not authenticated (normal), 503 means OAuth not configured
      if (response.status === 503) {
        console.warn('OAuth not configured on backend')
      }
      return null
    }
    
    const user = await response.json()
    return user
  } catch (error) {
    // Network errors (ECONNRESET, etc.) - backend might not be running
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Cannot connect to backend. Is the server running?')
    } else {
      console.error('Error fetching user:', error)
    }
    return null
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Error logging out:', error)
  }
}

export function getGoogleAuthUrl(): string {
  return `${API_BASE_URL}/auth/google`
}


