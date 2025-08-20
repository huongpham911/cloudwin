/**
 * Session management utilities for WinCloud Builder
 * Provides secure session handling with automatic timeout and activity tracking
 */

import { useState, useEffect, useCallback } from 'react';

export interface SessionInfo {
  user_id: string;
  username: string;
  email: string;
  role: string;
  expires_at: string;
  last_activity: string;
  session_id: string;
}

export interface SessionConfig {
  timeoutMinutes: number;
  warningMinutes: number;
  checkIntervalSeconds: number;
}

/**
 * Session management hook
 */
export const useSessionManager = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [minutesUntilExpiry, setMinutesUntilExpiry] = useState(0);
  const [isExpired, setIsExpired] = useState(false);

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // 5 minutes before expiry

  const refreshSession = useCallback(() => {
    localStorage.setItem('lastActivity', Date.now().toString());
    setShowWarning(false);
    setIsExpired(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('lastActivity');
    localStorage.removeItem('token');
    setIsExpired(true);
    // You can add additional logout logic here
  }, []);

  const checkSession = useCallback(() => {
    const lastActivity = localStorage.getItem('lastActivity');
    if (!lastActivity) {
      refreshSession();
      return;
    }

    const timeSinceActivity = Date.now() - parseInt(lastActivity);
    const timeUntilExpiry = SESSION_TIMEOUT - timeSinceActivity;
    const minutesUntilExpiry = Math.floor(timeUntilExpiry / (60 * 1000));

    if (timeUntilExpiry <= 0) {
      setIsExpired(true);
      logout();
    } else if (timeUntilExpiry <= WARNING_TIME) {
      setShowWarning(true);
      setMinutesUntilExpiry(minutesUntilExpiry);
    } else {
      setShowWarning(false);
      setMinutesUntilExpiry(minutesUntilExpiry);
    }
  }, [refreshSession, logout]);

  useEffect(() => {
    // Initial check
    checkSession();

    // Set up interval to check session
    const interval = setInterval(checkSession, 60000); // Check every minute

    // Track user activity
    const updateActivity = () => refreshSession();

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      clearInterval(interval);
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [checkSession, refreshSession]);

  return {
    showWarning,
    minutesUntilExpiry,
    isExpired,
    refreshSession,
    logout
  };
};

/**
 * Session timeout warning component props
 */
export interface SessionTimeoutWarningProps {
  show: boolean;
  minutesUntilExpiry: number;
  onRefresh: () => void;
  onLogout: () => void;
}

/**
 * Simple session manager class for non-React usage
 */
export class SessionManager {
  private config: SessionConfig;
  private lastActivity: number = 0;
  private warningShown: boolean = false;

  constructor(config: SessionConfig = {
    timeoutMinutes: 30,
    warningMinutes: 5,
    checkIntervalSeconds: 60
  }) {
    this.config = config;
    this.lastActivity = Date.now();
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
    this.warningShown = false;
  }

  isSessionValid(): boolean {
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    return (Date.now() - this.lastActivity) < timeoutMs;
  }

  getMinutesUntilExpiry(): number {
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000;
    const timeLeft = timeoutMs - (Date.now() - this.lastActivity);
    return Math.max(0, Math.floor(timeLeft / (60 * 1000)));
  }

  shouldShowWarning(): boolean {
    const warningMs = this.config.warningMinutes * 60 * 1000;
    const timeLeft = (this.config.timeoutMinutes * 60 * 1000) - (Date.now() - this.lastActivity);
    return timeLeft <= warningMs && timeLeft > 0 && !this.warningShown;
  }

  markWarningShown(): void {
    this.warningShown = true;
  }
}

/**
 * Session timeout warning component
 * Note: This should be implemented as a proper React component in a .tsx file
 */
export const SessionTimeoutWarning = (_props: SessionTimeoutWarningProps) => {
  // This is a placeholder - actual JSX should be in a .tsx file
  return null;
};

export default SessionManager;
