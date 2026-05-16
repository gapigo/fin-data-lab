import { useState, useEffect } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import Index from './pages/Index';
import FundDetails from './pages/FundDetails';
import FundLab from './pages/FundLab';
import FundPortfolio from './pages/FundPortfolio';
import NotFound from './pages/NotFound';
import AllocatorsIntelligence from './pages/AllocatorsIntelligence';
import Ingestion from './pages/Ingestion';
import SqlConsole from './pages/workspace/SqlConsole';
import NotebooksPlaceholder from './pages/workspace/NotebooksPlaceholder';
import Radar from './pages/cvm/Radar';
import { AiPanel } from './components/ai/AiPanel';

const queryClient = new QueryClient();

const FundLabRouteWrapper = () => {
  const { cnpj } = useParams<{ cnpj: string }>();
  return <FundLab initialCnpj={cnpj || null} />;
};

const AppContent = () => {
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const openHandler = () => setAiOpen(true);
    const toggleHandler = () => setAiOpen(prev => !prev);
    window.addEventListener('fdl-ai-open', openHandler);
    window.addEventListener('fdl-ai-toggle', toggleHandler);
    return () => {
      window.removeEventListener('fdl-ai-open', openHandler);
      window.removeEventListener('fdl-ai-toggle', toggleHandler);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'a') {
        e.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/fund/:cnpj" element={<FundDetails />} />
          <Route path="/allocators" element={<AllocatorsIntelligence />} />
          <Route path="/lab" element={<FundLab />} />
          <Route path="/fundo/:cnpj" element={<FundDetails />} />
          <Route path="/carteira_fundo/:cnpj" element={<FundPortfolio />} />
          <Route path="/ingestion" element={<Ingestion />} />
          <Route path="/workspace/sql" element={<SqlConsole />} />
          <Route path="/workspace/notebooks" element={<NotebooksPlaceholder />} />
          <Route path="/cvm/lab/:cnpj" element={<FundLabRouteWrapper />} />
          <Route path="/cvm/radar" element={<Radar />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      <AiPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
