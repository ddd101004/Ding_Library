"use client";
import React, { createContext, useContext, useState, useCallback } from "react";

interface AvatarPopupContextType {
  isOpen: boolean;
  activePage: string;
  openAvatarPopup: (page?: string) => void;
  closeAvatarPopup: () => void;
}

const AvatarPopupContext = createContext<AvatarPopupContextType | undefined>(
  undefined
);

export function AvatarPopupProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activePage, setActivePage] = useState("personal");

  const openAvatarPopup = useCallback((page: string = "personal") => {
    setActivePage(page);
    setIsOpen(true);
  }, []);

  const closeAvatarPopup = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <AvatarPopupContext.Provider
      value={{
        isOpen,
        activePage,
        openAvatarPopup,
        closeAvatarPopup,
      }}
    >
      {children}
    </AvatarPopupContext.Provider>
  );
}

export function useAvatarPopup() {
  const context = useContext(AvatarPopupContext);
  if (!context) {
    throw new Error("useAvatarPopup must be used within AvatarPopupProvider");
  }
  return context;
}
