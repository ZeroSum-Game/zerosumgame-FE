
// [Merge Note] 2026-01-27: New component for 3D-like Character pieces (Paper doll style)
import { type FC } from 'react';

type Props = {
    name: string;
    avatar: string;
    color: string;
    isMe: boolean;
};

const CharacterPiece: FC<Props> = ({ name, avatar, color, isMe }) => {
    return (
        <div className="character-piece-container pl-1 pb-2">
            <div
                className="character-piece-body relative transition-transform hover:scale-110 will-change-transform"
                style={{
                    filter: `drop-shadow(0px 8px 4px rgba(0,0,0,0.4))`
                }}
            >
                {/* Border / Halo */}
                <div
                    className="absolute inset-0 rounded-full border-2"
                    style={{ borderColor: color, opacity: 0.8 }}
                />

                {/* Avatar Image */}
                <div
                    className="relative h-12 w-12 overflow-hidden rounded-full border-4 bg-gray-900"
                    style={{ borderColor: 'white' }}
                >
                    <img src={avatar} alt={name} className="h-full w-full object-cover" />
                </div>

                {/* Name Tag */}
                <div
                    className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold text-white shadow-md"
                    style={{ backgroundColor: color }}
                >
                    {name}
                </div>

                {/* "ME" indicator */}
                {isMe && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 animate-bounce">
                        <div
                            className="h-2 w-2 rotate-45 border-b-2 border-r-2"
                            style={{ borderColor: color }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

export default CharacterPiece;
