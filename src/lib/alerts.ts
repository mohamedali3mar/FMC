import { DashboardAlert } from './types';

const ALERTS_KEY = 'fayrouz_dashboard_alerts';

export const alertsApi = {
    getAlerts: (): DashboardAlert[] => {
        if (typeof window === 'undefined') return [];
        const stored = localStorage.getItem(ALERTS_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    addAlert: (alert: Omit<DashboardAlert, 'id' | 'createdAt' | 'isRead'>) => {
        const alerts = alertsApi.getAlerts();

        // Avoid duplicate alerts for the same missing doctor code
        if (alert.type === 'missing_doctor' && alerts.some(a => a.relatedId === alert.relatedId)) {
            return;
        }

        // Avoid duplicate system or conflict alerts for the same message and doctor/related entity
        if ((alert.type === 'system' || alert.type === 'conflict') &&
            alerts.some(a => a.relatedId === alert.relatedId && a.message === alert.message)) {
            return;
        }

        const newAlert: DashboardAlert = {
            ...alert,
            id: Math.random().toString(36).substr(2, 9),
            createdAt: new Date().toISOString(),
            isRead: false
        };
        localStorage.setItem(ALERTS_KEY, JSON.stringify([newAlert, ...alerts]));
    },

    markAsRead: (id: string) => {
        const alerts = alertsApi.getAlerts().map(a =>
            a.id === id ? { ...a, isRead: true } : a
        );
        localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    },

    markAsReadByRelatedId: (relatedId: string) => {
        const alerts = alertsApi.getAlerts().map(a =>
            a.relatedId === relatedId ? { ...a, isRead: true } : a
        );
        localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts));
    },

    clearAlerts: () => {
        localStorage.removeItem(ALERTS_KEY);
    }
};
