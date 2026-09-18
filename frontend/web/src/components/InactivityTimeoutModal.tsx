import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, Clock, LogOut, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useAlertStore } from '../store/alertStore';

const INACTIVITY_TIMEOUT_MS = 14 * 60 * 1000; // 14 Minutes idle before showing warning
const COUNTDOWN_SECONDS = 60; // 60 Seconds warning countdown

export const InactivityTimeoutModal: React.FC = () => {
  const { isAuthenticated, logout } = useAuthStore();
  const { showToast } = useAlertStore();

  const [showModal, setShowModal] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(COUNTDOWN_SECONDS);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetIdleTimer = () => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    if (showModal) {
      setShowModal(false);
      setSecondsRemaining(COUNTDOWN_SECONDS);
    }

    if (isAuthenticated) {
      idleTimerRef.current = setTimeout(() => {
        triggerWarningModal();
      }, INACTIVITY_TIMEOUT_MS);
    }
  };

  const triggerWarningModal = () => {
    setShowModal(true);
    setSecondsRemaining(COUNTDOWN_SECONDS);

    countdownTimerRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current!);
          handleForceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleForceLogout = () => {
    setShowModal(false);
    logout();
    showToast('warning', 'Session Timeout', 'Logged out automatically due to 15 minutes of inactivity for register security.');
  };

  const handleKeepAlive = () => {
    resetIdleTimer();
    showToast('success', 'Session Active', 'Inactivity timer reset. You can continue working.');
  };

  useEffect(() => {
    if (!isAuthenticated) {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
      setShowModal(false);
      return;
    }

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    const handleUserActivity = () => {
      if (!showModal) {
        resetIdleTimer();
      }
    };

    activityEvents.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      activityEvents.forEach((evt) => window.removeEventListener(evt, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isAuthenticated, showModal]);

  if (!showModal || !isAuthenticated) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-amber-500/40 dark:border-amber-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-5 text-center relative overflow-hidden">
        
        {/* Animated Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-9 h-9 animate-pulse" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">
            Inactivity Session Timeout Warning
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            You have been inactive for 14 minutes. For retail store register security, your session will automatically lock in:
          </p>
        </div>

        {/* Countdown Timer Display */}
        <div className="py-3 px-6 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700/80 inline-flex items-center space-x-3">
          <Clock className="w-5 h-5 text-amber-500 animate-spin" />
          <span className="font-mono font-extrabold text-2xl text-amber-600 dark:text-amber-400">
            {secondsRemaining}s
          </span>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          (Note: Your active cashier shift & open float remain saved securely in the database)
        </p>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={handleForceLogout}
            className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out Now</span>
          </button>

          <button
            onClick={handleKeepAlive}
            className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-teal-600/30 transition flex items-center justify-center space-x-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>I'm Still Working</span>
          </button>
        </div>
      </div>
    </div>
  );
};
