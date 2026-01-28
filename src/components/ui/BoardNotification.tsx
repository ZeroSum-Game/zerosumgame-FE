import { useEffect, useState } from 'react';
import './BoardNotification.css';

export type NotificationType = 'purchase' | 'takeover' | 'worldcup' | 'war' | 'tax' | 'space' | 'stock' | 'minigame' | 'goldenkey';

interface BoardNotificationProps {
    type: NotificationType;
    message: string;
    subMessage?: string;
    active: boolean;
    onComplete?: () => void;
}

const COLOR_MAP: Record<NotificationType, string> = {
    purchase: '#4ade80',  // green-400
    takeover: '#facc15',  // yellow-400
    worldcup: '#3b82f6',  // blue-500
    war: '#ef4444',       // red-500
    tax: '#ef4444',       // red-500 (bad event)
    space: '#a855f7',     // purple-500
    stock: '#f472b6',     // pink-400
    minigame: '#22d3ee',  // cyan-400
    goldenkey: '#fbbf24', // amber-400
};

const BoardNotification = ({ type, message, subMessage, active, onComplete }: BoardNotificationProps) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (active) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                if (onComplete) onComplete();
            }, 3000); // 3초 후 사라짐
            return () => clearTimeout(timer);
        }
    }, [active, onComplete]);

    if (!show) return null;

    const color = COLOR_MAP[type];

    return (
        <div className="board-notification-container">
            <div className="board-notification-content" style={{ borderColor: color }}>
                <div className="board-notification-title" style={{ color: color }}>
                    {message}
                </div>
                {subMessage && (
                    <div className="board-notification-subtitle">
                        {subMessage}
                    </div>
                )}
            </div>
            <div className="board-notification-bg-flash" style={{ backgroundColor: color }} />
        </div>
    );
};

export default BoardNotification;
