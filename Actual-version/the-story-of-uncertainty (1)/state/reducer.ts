import { AppState } from '../types';
import { INITIAL_STATE } from '../constants';

export type AppAction =
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GOTO_STEP'; payload: number }
  | { type: 'SET_ALPHA'; payload: number }
  | { type: 'SET_TEST_TYPE'; payload: 'one-tailed' | 'two-tailed' }
  | { type: 'NEW_SAMPLE'; payload: number }
  | { type: 'RESET' }
  | { type: 'BACK_TO_START' };

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'NEXT_STEP':
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, 10) // Adjust max based on STORY_STEPS length
      };
    
    case 'PREV_STEP':
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 0)
      };
    
    case 'GOTO_STEP':
      return {
        ...state,
        currentStep: action.payload
      };
    
    case 'SET_ALPHA':
      return {
        ...state,
        alpha: action.payload
      };
    
    case 'SET_TEST_TYPE':
      return {
        ...state,
        testType: action.payload
      };
    
    case 'NEW_SAMPLE':
      return {
        ...state,
        sampleMean: action.payload
      };
    
    case 'RESET':
      return INITIAL_STATE;
    
    case 'BACK_TO_START':
      return {
        ...state,
        currentStep: 0
      };
    
    default:
      return state;
  }
}
