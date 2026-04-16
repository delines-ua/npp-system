import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import DepartmentsPage from './pages/DepartmentsPage'
import StaffPage from './pages/StaffPage'
import DisciplinesPage from './pages/DisciplinesPage'
import AssistantPage from './pages/AssistantPage'
import AssignmentsPage from "./pages/AssignmentsPage.tsx";

const queryClient = new QueryClient()

function App() {
  return (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="disciplines" element={<DisciplinesPage />} />
              <Route path="assistant" element={<AssistantPage />} />
                <Route path="assignments" element={<AssignmentsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
  )
}

export default App