import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { getCurrentUser, type User } from '@/lib/auth'

export function AuthCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      const success = searchParams.get('success')
      
      if (success === 'true') {
        // Wait a bit for session to be established
        setTimeout(async () => {
          const currentUser = await getCurrentUser()
          if (currentUser) {
            setUser(currentUser)
            setStatus('success')
            // Redirect to dashboard after 1 second
            setTimeout(() => {
              navigate('/')
            }, 1000)
          } else {
            setStatus('error')
          }
        }, 500)
      } else {
        setStatus('error')
      }
    }

    handleCallback()
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background/95">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Completing sign in...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">Sign in successful!</p>
            {user && (
              <p className="text-sm text-muted-foreground mb-4">
                Welcome, {user.displayName || user.email}!
              </p>
            )}
            <p className="text-sm text-muted-foreground">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-foreground font-medium mb-2">Sign in failed</p>
            <p className="text-sm text-muted-foreground mb-4">
              Please try again
            </p>
            <button
              onClick={() => navigate('/login')}
              className="text-primary hover:underline"
            >
              Go to login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

