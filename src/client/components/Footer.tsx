interface FooterProps {
  onOpenAbout?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAbout }) => {
  return (
    <footer className="w-full bg-white border-t border-surface-container-highest mt-12 py-6 px-4 lg:px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-2 flex-wrap justify-center md:justify-start">
          <span className="font-semibold text-primary">ClimaStack Weather Hub</span>
          <span>•</span>
          <span>Arquitetura de Container Único Docker</span>
          <span>•</span>
          <span className="font-mono text-[11px] text-emerald-600 font-medium">Hono + React + D1 + Redis</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
          {onOpenAbout && (
            <>
              <button
                type="button"
                onClick={onOpenAbout}
                className="text-primary hover:text-primary-container font-semibold flex items-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">info</span>
                <span>Sobre a Aplicação</span>
              </button>
              <span className="text-outline-variant">•</span>
            </>
          )}
          <span className="font-mono text-[11px]">ISO/IEC 27001 Ready</span>
          <span className="text-outline-variant">•</span>
          <span>Porta HTTP: 8080</span>
          <span className="text-outline-variant">•</span>
          <a
            href="/api/v1/health"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline font-mono"
          >
            /api/v1/health
          </a>
        </div>
      </div>
    </footer>
  );
};
