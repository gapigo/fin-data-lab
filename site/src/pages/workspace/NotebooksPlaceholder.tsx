export default function NotebooksPlaceholder() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))] text-[var(--text-muted)]">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Notebooks</h2>
        <p className="text-sm">Em breve: Jupyter notebooks integrados.</p>
      </div>
    </div>
  );
}
