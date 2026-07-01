import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Home from './routes/Home'
import AttractionPage from './routes/AttractionPage'
import AdminDashboard from './routes/AdminDashboard'
import AdminLogin from './routes/AdminLogin'
import PointEditor from './routes/PointEditor'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/attractions/:id" element={<AttractionPage />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path="/admin/points/new"
          element={<ProtectedRoute><PointEditor mode="create" /></ProtectedRoute>}
        />
        <Route
          path="/admin/points/:id/edit"
          element={<ProtectedRoute><PointEditor mode="edit" /></ProtectedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
