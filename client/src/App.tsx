import { Routes, Route } from 'react-router-dom'
import { Browser } from './Browser'
import { Triage } from './Triage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Browser />} />
      <Route path="/triage" element={<Triage />} />
    </Routes>
  )
}
