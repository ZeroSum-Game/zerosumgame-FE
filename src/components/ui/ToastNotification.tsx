import { useEffect } from 'react';

export type NotificationType = 'purchase' | 'takeover' | 'worldcup' | 'war' | 'travel';

interface ToastNotificationProps {
    id: string;
    type: NotificationType;
    message: string;
    playerName: string;
    onDismiss: (id: string) => void;
}

const ICON_MAP: Record<NotificationType, string> = {
    purchase: '💰',
    takeover: '⚡',
    worldcup: '⚽',
    war: '💥',
    travel: '🚀',
};

const COLOR_MAP: Record<NotificationType, string> = {
    purchase: 'from-green-500/20 to-emerald-500/20 border-green-400/30',
    takeover: 'from-yellow-500/20 to-amber-500/20 border-yellow-400/30',
    worldcup: 'from-blue-500/20 to-sky-500/20 border-blue-400/30',
    war: 'from-red-500/20 to-rose-500/20 border-red-400/30',
    travel: 'from-purple-500/20 to-violet-500/20 border-purple-400/30',
};

const ToastNotification = ({ id, type, message, playerName, onDismiss }: ToastNotificationProps) => {
    useEffect(() => {
        const timer = setTimeout(() => onDismiss(id), 4000);
        return () => clearTimeout(timer);
    }, [id, onDismiss]);

    const icon = ICON_MAP[type];
    const colorClass = COLOR_MAP[type];

    return (
        <div className={`toast-notification bg-gradient-to-r ${colorClass} animate-slide-in-top`}>
            <span className="text-3xl">{icon}</span>
            <div className="flex-1">
                <p className="font-black text-white text-sm">{playerName}</p>
                <p className="text-white/80 text-xs mt-0.5">{message}</p>
            </div>
            <button
                onClick={() => onDismiss(id)}
                className="text-white/60 hover:text-white text-lg font-bold leading-none"
            >
                ✕
            </button>
        </div>
    );
};

export default ToastNotification;
