import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Login } from './components/Login'
import { AuthCallback } from './components/AuthCallback'
import { Dashboard } from './components/Dashboard'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/*" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
