/**
 * Demo Registry Configuration
 * 
 * Central registry for all embedded demos/presentations.
 * Add new demos here to auto-generate menu items and wrapper components.
 * 
 * To add a new demo:
 * 1. Build your demo app and copy dist/ to public/demos/{demo-id}/
 * 2. Add an entry to this registry
 * 3. Rebuild and deploy
 * 
 * That's it! Menu items are auto-generated from this config.
 */

import { BookOpen } from 'lucide-react';
import { ToolType } from './types';

export interface DemoConfig {
  id: string;                    // Unique identifier, matches folder in public/demos/
  name: string;                  // Display name in menu
  description: string;           // Submenu description
  icon: typeof BookOpen;         // Lucide icon
  parentToolId: ToolType;        // Which submenu to appear under
  parentToolName: string;        // Parent menu name (for display)
  demoPath: string;              // URL path to demo (e.g., '/demos/story-of-uncertainty')
  version: string;               // Demo version
  build: string;                 // Demo build number
  enabled?: boolean;             // Enable/disable without deleting config
}

export const DEMOS_REGISTRY: DemoConfig[] = [
  {
    id: 'story-of-uncertainty',
    name: 'Story of Uncertainty',
    description: 'A concept-first walkthrough of why we test hypotheses and what uncertainty means in practice.',
    icon: BookOpen,
    parentToolId: ToolType.HYPOTHESIS_TESTING_HUB,
    parentToolName: 'Hypothesis Testing',
    demoPath: '/demos/story-of-uncertainty',
    version: '2.1.0',
    build: '20260208.1',
    enabled: true
  },
  // Template for next demo:
  // {
  //   id: 'new-demo-id',
  //   name: 'New Demo Name',
  //   description: 'Brief description of what this demo teaches.',
  //   icon: SomeIcon,
  //   parentToolId: ToolType.SOME_TOOL,
  //   parentToolName: 'Parent Menu Name',
  //   demoPath: '/demos/new-demo-id',
  //   version: '1.0.0',
  //   build: 'YYYYMMDD.X',
  //   enabled: true
  // },
];

/**
 * Get all enabled demos
 */
export const getEnabledDemos = (): DemoConfig[] => 
  DEMOS_REGISTRY.filter(d => d.enabled !== false);

/**
 * Get demos for a specific parent tool
 */
export const getDemosForParent = (parentToolId: ToolType): DemoConfig[] =>
  getEnabledDemos().filter(d => d.parentToolId === parentToolId);

/**
 * Get a specific demo by ID
 */
export const getDemo = (id: string): DemoConfig | undefined =>
  getEnabledDemos().find(d => d.id === id);
