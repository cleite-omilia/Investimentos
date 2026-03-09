"use client";

import { useEffect } from "react";
import { Check, ChevronsUpDown, Wallet, Users } from "lucide-react";
import { usePortfolio } from "@/providers/portfolio-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PortfolioSwitcher() {
  const { portfolios, activePortfolio, setActivePortfolio, setPortfolios } =
    usePortfolio();

  useEffect(() => {
    async function fetchPortfolios() {
      try {
        const res = await fetch("/api/portfolios");
        if (!res.ok) return;
        const data = (await res.json()) as any;
        if (data.portfolios && data.portfolios.length > 0) {
          setPortfolios(data.portfolios);
        }
      } catch {
        // Silently fail - portfolio switcher is not critical
      }
    }

    fetchPortfolios();
  }, [setPortfolios]);

  const displayName = activePortfolio?.name || "Carteira Pessoal";
  const displayIcon =
    activePortfolio?.type === "family" ? (
      <Users className="size-4" />
    ) : (
      <Wallet className="size-4" />
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {displayIcon}
          <span className="hidden sm:inline">{displayName}</span>
          <ChevronsUpDown className="size-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {portfolios.length > 0 ? (
          portfolios.map((portfolio) => (
            <DropdownMenuItem
              key={portfolio.id}
              onClick={() => setActivePortfolio(portfolio)}
              className={
                activePortfolio?.id === portfolio.id ? "bg-accent" : ""
              }
            >
              {portfolio.type === "family" ? (
                <Users className="mr-2 size-4" />
              ) : (
                <Wallet className="mr-2 size-4" />
              )}
              <span className="flex-1">{portfolio.name}</span>
              {activePortfolio?.id === portfolio.id && (
                <Check className="ml-2 size-4" />
              )}
            </DropdownMenuItem>
          ))
        ) : (
          <DropdownMenuItem disabled>
            <Wallet className="mr-2 size-4" />
            <span>Carteira Pessoal</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
