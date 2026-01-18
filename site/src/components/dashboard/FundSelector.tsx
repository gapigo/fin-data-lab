import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useQuery } from "@tanstack/react-query"
import { FundingService } from "@/services/api"
import { useState } from "react"
import { useDebounce } from "@uidotdev/usehooks"

interface FundSelectorProps {
    onSelect: (cnpj: string) => void;
    selectedCnpj?: string;
}

export function FundSelector({ onSelect, selectedCnpj }: FundSelectorProps) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const debouncedQuery = useDebounce(query, 300)

    const { data: suggestions, isLoading } = useQuery({
        queryKey: ['fund-suggestions', debouncedQuery],
        queryFn: () => FundingService.suggestFunds(debouncedQuery),
        enabled: debouncedQuery.length >= 2,
        staleTime: 60 * 1000,
    })

    // Normalize CNPJ for display/checking
    const formatCnpj = (val: string) => {
        const v = val.replace(/\D/g, '');
        return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }

    const handleSelect = (cnpj: string) => {
        onSelect(cnpj.replace(/\D/g, ''))
        setOpen(false)
    }

    const handleSearchSubmit = () => {
        // If query looks like a part of CNPJ or just text, let parent handle or try to find
        // Since user wants to search by CNPJ without autocomplete sometimes
        if (query.length > 5) {
            onSelect(query.replace(/\D/g, ''))
            setOpen(false)
        }
    }

    return (
        <div className="w-full max-w-xl mx-auto">
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between bg-white/5 border-slate-700 text-slate-200 hover:bg-white/10 hover:text-white h-12"
                    >
                        {selectedCnpj
                            ? `Fundo selecionado: ${formatCnpj(selectedCnpj)}` // Ideally show name, but we might only have CNPJ in state
                            : "Selecione ou busque um fundo..."}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 bg-slate-900 border-slate-800 text-slate-100">
                    <Command className="bg-slate-900 text-slate-100">
                        <CommandInput
                            placeholder="Busque por nome ou CNPJ..."
                            value={query}
                            onValueChange={setQuery}
                            className="text-slate-100 placeholder:text-slate-500"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleSearchSubmit();
                                }
                            }}
                        />
                        <CommandList>
                            <CommandEmpty className="py-6 text-center text-sm text-slate-500">
                                {query.length < 2 ? "Digite pelo menos 2 caracteres" : "Nenhum fundo encontrado."}
                            </CommandEmpty>
                            <CommandGroup>
                                {suggestions?.map((fund) => (
                                    <CommandItem
                                        key={fund.cnpj_fundo}
                                        value={fund.denom_social}
                                        onSelect={() => handleSelect(fund.cnpj_fundo)}
                                        className="flex flex-col items-start gap-1 py-3 aria-selected:bg-slate-800 aria-selected:text-white cursor-pointer"
                                    >
                                        <span className="font-medium truncate w-full">{fund.denom_social}</span>
                                        <span className="text-xs text-slate-500 w-full flex justify-between">
                                            <span>CNPJ: {fund.cnpj_fundo}</span>
                                        </span>
                                        {selectedCnpj === fund.cnpj_fundo && (
                                            <Check className="h-4 w-4 absolute right-2 top-4 opacity-50" />
                                        )}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    )
}
