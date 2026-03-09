"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface Portfolio {
  id: string;
  name: string;
  type: "personal" | "family";
}

interface PortfolioContextType {
  portfolios: Portfolio[];
  activePortfolio: Portfolio | null;
  setActivePortfolio: (portfolio: Portfolio) => void;
  setPortfolios: (portfolios: Portfolio[]) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(
  undefined
);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfoliosState] = useState<Portfolio[]>([]);
  const [activePortfolio, setActivePortfolioState] =
    useState<Portfolio | null>(null);

  const setActivePortfolio = useCallback((portfolio: Portfolio) => {
    setActivePortfolioState(portfolio);
  }, []);

  const setPortfolios = useCallback(
    (newPortfolios: Portfolio[]) => {
      setPortfoliosState(newPortfolios);
      if (newPortfolios.length > 0 && !activePortfolio) {
        setActivePortfolioState(newPortfolios[0]);
      }
    },
    [activePortfolio]
  );

  return (
    <PortfolioContext.Provider
      value={{
        portfolios,
        activePortfolio,
        setActivePortfolio,
        setPortfolios,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within a PortfolioProvider");
  }
  return context;
}
