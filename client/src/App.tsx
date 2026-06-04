import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './Dashboard'
import { Triage } from './Triage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/triage" element={<Triage />} />
    </Routes>
  )
}
