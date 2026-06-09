import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SettingsProvider } from './contexts/SettingsContext'
import Layout from './components/Layout'
import DashboardPage from './pages/DashboardPage'
import DepartmentsPage from './pages/DepartmentsPage'
import StaffPage from './pages/StaffPage'
import DisciplinesPage from './pages/DisciplinesPage'
import ScientificWorksPage from './pages/ScientificWorksPage'
import AssistantPage from './pages/AssistantPage'
import ImportPage from './pages/ImportPage'
import GroupsPage from './pages/GroupsPage'
import SettingsPage from './pages/SettingsPage'
import WorkloadDistributionPage from './pages/WorkloadDistributionPage'

const queryClient = new QueryClient()

function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <SettingsProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Layout />}>
                        <Route index element={<Navigate to="/dashboard" replace />} />
                        <Route path="dashboard"       element={<DashboardPage />} />
                        <Route path="departments"     element={<DepartmentsPage />} />
                        <Route path="staff"           element={<StaffPage />} />
                        <Route path="disciplines"     element={<DisciplinesPage />} />
                        <Route path="groups"          element={<GroupsPage />} />
                        <Route path="scientific-works" element={<ScientificWorksPage />} />
                        <Route path="assistant"       element={<AssistantPage />} />
                        <Route path="import"          element={<ImportPage />} />
                        <Route path="workload"        element={<WorkloadDistributionPage />} />
                        <Route path="settings"        element={<SettingsPage />} />
                    </Route>
                </Routes>
            </BrowserRouter>
            </SettingsProvider>
        </QueryClientProvider>
    )
}

export default App
