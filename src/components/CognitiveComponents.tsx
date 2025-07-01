import React from 'react';
import { COGNITIVE_PALETTES } from '../types';
import { StorageService } from '../services/storageService';

// Cognitive optimization utilities
export class CognitiveUtils {
  // Get current cognitive color palette based on circadian rhythm
  static getCurrentPalette() {
    const mode = StorageService.getCurrentCircadianMode();
    return COGNITIVE_PALETTES[mode];
  }

  // Calculate card opacity based on mastery level for spaced repetition
  static getCardOpacity(masteryLevel: number): number {
    // Cards with low mastery are more prominent (higher opacity)
    // Cards with high mastery dim out (lower opacity)
    return Math.max(0.4, 1 - (masteryLevel / 100) * 0.6);
  }

  // Get confidence color indicator
  static getConfidenceColor(confidenceLevel: number): string {
    const palette = this.getCurrentPalette();
    if (confidenceLevel >= 80) return palette.confidence;
    if (confidenceLevel >= 60) return palette.calm;
    if (confidenceLevel >= 40) return palette.accent;
    return palette.warning;
  }

  // Get mastery glow effect
  static getMasteryGlow(masteryLevel: number): string {
    if (masteryLevel >= 90) return 'drop-shadow-lg drop-shadow-emerald-500/30';
    if (masteryLevel >= 70) return 'drop-shadow-md drop-shadow-blue-500/20';
    if (masteryLevel >= 50) return 'drop-shadow-sm drop-shadow-amber-500/15';
    return '';
  }

  // Generate CSS custom properties for current palette
  static getCSSVariables() {
    const palette = this.getCurrentPalette();
    return {
      '--color-primary': palette.primary,
      '--color-secondary': palette.secondary,
      '--color-accent': palette.accent,
      '--color-success': palette.success,
      '--color-warning': palette.warning,
      '--color-error': palette.error,
      '--color-focus': palette.focus,
      '--color-calm': palette.calm,
      '--color-energy': palette.energy,
      '--color-confidence': palette.confidence,
    };
  }
}

// Progress Ring Component for visual progress indication
export const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  showText?: boolean;
  animated?: boolean;
}> = ({ 
  progress, 
  size = 60, 
  strokeWidth = 4, 
  color,
  backgroundColor = '#e5e7eb',
  showText = true,
  animated = true 
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  const palette = CognitiveUtils.getCurrentPalette();
  const ringColor = color || palette.primary;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className={`transform -rotate-90 ${animated ? 'transition-all duration-500' : ''}`}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className={animated ? 'transition-all duration-700 ease-out' : ''}
        />
      </svg>
      {showText && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
};

// Confidence Indicator Component
export const ConfidenceIndicator: React.FC<{
  level: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}> = ({ level, size = 'md', showLabel = true }) => {
  const sizes = {
    sm: { width: 'w-16', height: 'h-1.5', text: 'text-xs' },
    md: { width: 'w-20', height: 'h-2', text: 'text-sm' },
    lg: { width: 'w-24', height: 'h-2.5', text: 'text-base' }
  };
  
  const config = sizes[size];
  const color = CognitiveUtils.getConfidenceColor(level);
  
  const getConfidenceLabel = (level: number): string => {
    if (level >= 80) return 'High';
    if (level >= 60) return 'Good';
    if (level >= 40) return 'Fair';
    return 'Low';
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`${config.width} ${config.height} bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
        <div 
          className={`h-full rounded-full transition-all duration-500 ease-out`}
          style={{ 
            width: `${level}%`,
            backgroundColor: color
          }}
        />
      </div>
      {showLabel && (
        <span className={`${config.text} font-medium`} style={{ color }}>
          {getConfidenceLabel(level)}
        </span>
      )}
    </div>
  );
};

// Achievement Toast Component
export const AchievementToast: React.FC<{
  achievement: { title: string; description: string; icon: string };
  isVisible: boolean;
  onClose: () => void;
}> = ({ achievement, isVisible, onClose }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-bounce-in">
      <div className="bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-lg shadow-2xl p-4 max-w-sm">
        <div className="flex items-start gap-3">
          <div className="text-2xl">{achievement.icon}</div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">{achievement.title}</h3>
            <p className="text-sm opacity-90">{achievement.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

// Micro-interaction success celebration
export const SuccessCelebration: React.FC<{
  isVisible: boolean;
  onComplete: () => void;
}> = ({ isVisible, onComplete }) => {
  React.useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-40">
      <div className="animate-ping">
        <div className="w-16 h-16 bg-emerald-500 rounded-full opacity-75"></div>
      </div>
      <div className="absolute text-4xl animate-bounce">✨</div>
    </div>
  );
};

// Focus breathing indicator
export const FocusBreathingIndicator: React.FC<{
  isActive: boolean;
  onComplete?: () => void;
}> = ({ isActive, onComplete }) => {
  const [phase, setPhase] = React.useState<'inhale' | 'hold' | 'exhale'>('inhale');
  
  React.useEffect(() => {
    if (!isActive) return;
    
    const cycle = () => {
      setPhase('inhale');
      setTimeout(() => setPhase('hold'), 4000);
      setTimeout(() => setPhase('exhale'), 6000);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 10000);
    };
    
    cycle();
  }, [isActive, onComplete]);

  if (!isActive) return null;

  const getScaleClass = () => {
    switch (phase) {
      case 'inhale': return 'scale-150';
      case 'hold': return 'scale-150';
      case 'exhale': return 'scale-100';
      default: return 'scale-100';
    }
  };

  const getInstructionText = () => {
    switch (phase) {
      case 'inhale': return 'Breathe in...';
      case 'hold': return 'Hold...';
      case 'exhale': return 'Breathe out...';
      default: return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="text-center">
        <div 
          className={`w-32 h-32 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full mx-auto mb-4 transition-transform duration-4000 ease-in-out ${getScaleClass()}`}
        />
        <p className="text-white text-xl font-medium">{getInstructionText()}</p>
        <p className="text-white/70 text-sm mt-2">Focus on your breathing</p>
      </div>
    </div>
  );
};