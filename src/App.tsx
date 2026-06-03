import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import DepartmentsPage from './pages/DepartmentsPage'
import StaffPage from './pages/StaffPage'
import DisciplinesPage from './pages/DisciplinesPage'
import ScientificWorksPage from './pages/ScientificWorksPage'
import AssistantPage from './pages/AssistantPage'
import ImportPage from './pages/ImportPage'
import WorkloadDistributionPage from './pages/WorkloadDistributionPage'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard"       element={<DashboardPage />} />
                        <Route path="departments"     element={<DepartmentsPage />} />
                        <Route path="staff"           element={<StaffPage />} />
                        <Route path="disciplines"     element={<DisciplinesPage />} />
                        <Route path="scientific-works" element={<ScientificWorksPage />} />
                        <Route path="assistant"       element={<AssistantPage />} />
                        <Route path="import"          element={<ImportPage />} />
                        <Route path="workload"        element={<WorkloadDistributionPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </QueryClientProvider>
    )
}

export default App
