
import { useState, useEffect, useCallback } from 'react';
import { ViewType } from '../types';

export const useNavigation = (initialView: ViewType = 'dashboard') => {
  const [currentView, setCurrentView] = useState<ViewType>(initialView);

  const navigateTo = useCallback((view: ViewType) => {
    setCurrentView(view);
    window.history.pushState({ view }, '');
  }, []);

  const goBack = useCallback(() => {
    if (currentView !== 'dashboard') {
      navigateTo('dashboard');
    }
  }, [currentView, navigateTo]);

  useEffect(() => {
    window.history.replaceState({ view: 'dashboard' }, '');
    const handlePopState = (event: PopStateEvent) => {
      const view = event.state?.view || 'dashboard';
      setCurrentView(view as ViewType);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return { currentView, navigateTo, goBack };
};
