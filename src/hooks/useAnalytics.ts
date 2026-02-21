import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackPageView,
  trackSessionStart,
  trackEngagement,
} from '../utils/analytics';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Todo List',
  '/visualizer': 'Markdown Visualizer',
};

/**
 * Hook to track page views on route changes
 */
export const usePageTracking = () => {
  const location = useLocation();
  const isFirstRender = useRef(true);

  useEffect(() => {
    const pageTitle = PAGE_TITLES[location.pathname] || 'Todo List';
    trackPageView(location.pathname, pageTitle);
  }, [location.pathname]);

  // Track session start on first render
  useEffect(() => {
    if (isFirstRender.current) {
      trackSessionStart();
      isFirstRender.current = false;
    }
  }, []);
};

/**
 * Hook to track time spent on a page/feature
 */
export const useEngagementTracking = (featureName: string) => {
  // eslint-disable-next-line react-hooks/purity
  const startTime = useRef(Date.now());

  useEffect(() => {
    startTime.current = Date.now();

    return () => {
      const timeSpent = Math.round((Date.now() - startTime.current) / 1000);
      if (timeSpent > 5) { // Only track if more than 5 seconds
        trackEngagement('time_on_page', {
          feature: featureName,
          time_seconds: timeSpent,
        });
      }
    };
  }, [featureName]);
};
