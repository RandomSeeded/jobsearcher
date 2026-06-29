// Narrow vertical rail shown in place of a collapsed pipeline column.
export function CollapsedColumn({ label, color, count, dropping, onExpand, onDragStart, onDragOver, onDragLeave, onDrop }: {
  label: string; color: string; count: number; dropping: boolean; onExpand: () => void
  onDragStart: (e: React.DragEvent) => void; onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void; onDrop: (e: React.DragEvent) => void
}) {
  return (
    <button onClick={onExpand} title={`Expand ${label} (drag to reorder)`}
      draggable onDragStart={onDragStart} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
      style={{ width: 36, flexShrink: 0, alignSelf: 'stretch', minHeight: 120, background: '#f9fafb', borderRadius: 10, border: 0, borderTop: `3px solid ${color}`, cursor: 'grab', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '8px 0', outline: dropping ? '2px dashed #94a3b8' : 'none', outlineOffset: 2 }}>
      <span style={{ fontSize: 11, color: '#9ca3af' }}>{count}</span>
      <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 12, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{label}</span>
    </button>
  )
}
