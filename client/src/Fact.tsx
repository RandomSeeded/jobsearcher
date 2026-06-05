export function Fact({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div>
      <div style={{ color: '#9ca3af', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ color: dim ? '#d1d5db' : '#374151', fontWeight: 500 }}>{value}</div>
    </div>
  )
}
