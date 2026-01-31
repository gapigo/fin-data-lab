import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Index from './pages/Index';
import FundDetails from './pages/FundDetails';
import FundLab from './pages/FundLab';
import FundPortfolio from './pages/FundPortfolio';
import NotFound from './pages/NotFound';
import AllocatorsIntelligence from './pages/AllocatorsIntelligence';

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/fund/:cnpj" element={<FundDetails />} />
          <Route path="/allocators" element={<AllocatorsIntelligence />} />
          <Route path="/lab" element={<FundLab />} />
          <Route path="/fundo/:cnpj" element={<FundDetails />} /> {/* Using FundDetails for now or new component? User asked for NEW pages. I'll point to new components */}
          <Route path="/carteira_fundo/:cnpj" element={<FundPortfolio />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
