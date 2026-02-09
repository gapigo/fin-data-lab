/**
 * Componente de seleção de visão do menu lateral
 * Permite ao usuário escolher entre:
 * - Fundos de Investimento (foco em fundos)
 * - Finanças Gerais (consolidado)
 * - Desenvolvedor (acesso completo)
 */

import { useState } from 'react';
import { Check, ChevronDown, Settings } from 'lucide-react';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { VIEW_MODES, ViewMode } from '@/config/menuConfig';

interface ViewModeSelectorProps {
    currentViewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
    collapsed?: boolean;
}

export const ViewModeSelector = ({
    currentViewMode,
    onViewModeChange,
    collapsed = false,
}: ViewModeSelectorProps) => {
    const [open, setOpen] = useState(false);

    const currentMode = VIEW_MODES.find(m => m.id === currentViewMode) || VIEW_MODES[0];
    const Icon = currentMode.icon;

    if (collapsed) {
        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Alterar modo de visualização"
                    >
                        <Settings className="w-5 h-5 text-slate-400" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    side="right"
                    align="start"
                    className="w-72 p-2 bg-slate-900 border-slate-800 shadow-xl"
                >
                    <ViewModeList
                        currentViewMode={currentViewMode}
                        onViewModeChange={(mode) => {
                            onViewModeChange(mode);
                            setOpen(false);
                        }}
                    />
                </PopoverContent>
            </Popover>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 transition-all group">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/30">
                        <Icon className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                        <p className="text-xs text-slate-500 mb-0.5">Modo de visualização</p>
                        <p className="text-sm font-medium text-white truncate">{currentMode.label}</p>
                    </div>
                    <ChevronDown className={cn(
                        "w-4 h-4 text-slate-500 transition-transform",
                        open && "rotate-180"
                    )} />
                </button>
            </PopoverTrigger>
            <PopoverContent
                side="top"
                align="start"
                className="w-[calc(100%-16px)] ml-2 p-2 bg-slate-900 border-slate-800 shadow-xl"
            >
                <ViewModeList
                    currentViewMode={currentViewMode}
                    onViewModeChange={(mode) => {
                        onViewModeChange(mode);
                        setOpen(false);
                    }}
                />
            </PopoverContent>
        </Popover>
    );
};

interface ViewModeListProps {
    currentViewMode: ViewMode;
    onViewModeChange: (viewMode: ViewMode) => void;
}

const ViewModeList = ({ currentViewMode, onViewModeChange }: ViewModeListProps) => {
    return (
        <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase font-semibold px-2 pb-2 border-b border-slate-800 mb-2">
                Selecione o modo
            </p>
            {VIEW_MODES.map((mode) => {
                const Icon = mode.icon;
                const isActive = currentViewMode === mode.id;

                return (
                    <button
                        key={mode.id}
                        onClick={() => onViewModeChange(mode.id)}
                        className={cn(
                            "w-full flex items-start gap-3 px-3 py-3 rounded-lg transition-all text-left",
                            isActive
                                ? "bg-emerald-500/10 border border-emerald-500/30"
                                : "hover:bg-slate-800 border border-transparent"
                        )}
                    >
                        <div className={cn(
                            "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5",
                            isActive
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-slate-800 text-slate-400"
                        )}>
                            <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                                <p className={cn(
                                    "text-sm font-medium",
                                    isActive ? "text-emerald-400" : "text-white"
                                )}>
                                    {mode.label}
                                </p>
                                {isActive && (
                                    <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{mode.description}</p>
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

export default ViewModeSelector;
