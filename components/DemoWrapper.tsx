/**
 * Generic Demo Wrapper Component
 * 
 * Renders an embedded demo via iframe, configurable by demo registry.
 * Handles base path setup for relative imports.
 */

import React, { useEffect, useRef } from 'react';
import { DemoConfig } from '../demos.config';

interface DemoWrapperProps {
  demo: DemoConfig;
}

const DemoWrapper: React.FC<DemoWrapperProps> = ({ demo }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Set iframe src when demo changes
    if (iframeRef.current) {
      const basePath = `${import.meta.env.BASE_URL}${demo.demoPath.replace(/^\//, '')}`;
      iframeRef.current.src = `${basePath}/index.html`;
    }
  }, [demo]);

  return (
    <div className="w-full h-full">
      <iframe
        ref={iframeRef}
        title={demo.name}
        className="w-full h-full border-0"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      />
    </div>
  );
};

export default DemoWrapper;
