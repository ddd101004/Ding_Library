import { useState, useCallback } from "react";
import { SearchResult } from "../types/types";
import CitationModal from "../components/academicsearch/tabs/CitationModal";

interface CitationState {
  selectedPaper: SearchResult | null;
  isModalOpen: boolean;
  clickPosition: { x: number; y: number } | undefined;
}

interface UseCitationResult {
  selectedPaper: SearchResult | null;
  isModalOpen: boolean;
  clickPosition: { x: number; y: number } | undefined;
  handleQuoteClick: (paper: SearchResult, event: React.MouseEvent) => void;
  handleCloseModal: () => void;
  CitationModalComponent: React.ReactElement | null;
}

export function useCitation(): UseCitationResult {
  const [citationState, setCitationState] = useState<CitationState>({
    selectedPaper: null,
    isModalOpen: false,
    clickPosition: undefined
  });

  // 处理引用按钮点击
  const handleQuoteClick = useCallback((paper: SearchResult, event: React.MouseEvent) => {
    setCitationState({
      selectedPaper: paper,
      isModalOpen: true,
      clickPosition: {
        x: event.clientX,
        y: event.clientY
      }
    });
  }, []);

  // 关闭引用弹窗
  const handleCloseModal = useCallback(() => {
    setCitationState({
      selectedPaper: null,
      isModalOpen: false,
      clickPosition: undefined
    });
  }, []);

  // 引用弹窗组件
  const CitationModalComponent = citationState.selectedPaper ? (
    <CitationModal
      isOpen={citationState.isModalOpen}
      onClose={handleCloseModal}
      paperTitle={citationState.selectedPaper.title_zh || citationState.selectedPaper.title || ''}
      authors={citationState.selectedPaper.authors || []}
      year={citationState.selectedPaper.year}
      publicationName={
        (citationState.selectedPaper as any)?.publication_name ||
        citationState.selectedPaper.venue?.raw ||
        citationState.selectedPaper.venue?.raw_zh
      }
      paperId={citationState.selectedPaper.id}
    />
  ) : null;

  return {
    selectedPaper: citationState.selectedPaper,
    isModalOpen: citationState.isModalOpen,
    clickPosition: citationState.clickPosition,
    handleQuoteClick,
    handleCloseModal,
    CitationModalComponent
  };
}