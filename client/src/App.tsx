import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './Dashboard/Dashboard'
import { Triage } from './Triage/Triage'
import { Kanban } from './Kanban/Kanban'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/triage" element={<Triage />} />
      <Route path="/kanban" element={<Kanban />} />
    </Routes>
  )
}
