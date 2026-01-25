import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { CHARACTER_INFO, CharacterType } from '../../store/useGameStore';
import { CHARACTER_THEME } from '../../utils/characterTheme';
import SpaceBackdrop from '../ui/SpaceBackdrop';
import { apiGetMe, apiLogout, apiSetCharacter } from '../../services/api';
import { connectSocket } from '../../services/socketio';
import { fromBackendCharacter, toBackendCharacter } from '../../utils/characterMapping';
import { isAuthenticated } from '../../services/auth';

const CHARACTERS: CharacterType[] = ['ELON', 'SAMSUNG', 'TRUMP', 'PUTIN'];

type LobbyPlayer = {
  userId: number;
  nickname: string;
  playerId: number;
  character: CharacterType | null;
  ready: boolean;
};

type LobbyState = {
  hostUserId: number | null;
  allReady: boolean;
  players: LobbyPlayer[];
};

const LobbyPage = () => {
  const setCurrentPage = useGameStore((s) => s.setCurrentPage);
  const maxPlayers = useGameStore((s) => s.maxPlayers);

  const [me, setMe] = useState<{ userId: number; playerId: number } | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>('WAITING');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);

  const socketRef = useRef<Awaited<ReturnType<typeof connectSocket>> | null>(null);

  const myUserId = me?.userId ?? null;
  const myLobbyPlayer = useMemo(() => {
    if (!myUserId || !lobby) return null;
    return lobby.players.find((p) => p.userId === myUserId) ?? null;
  }, [lobby, myUserId]);

  const isHost = !!myUserId && !!lobby?.hostUserId && lobby.hostUserId === myUserId;

  const canStartGame = !!lobby && lobby.players.length >= 2 && lobby.allReady && isHost;

  const isCharacterTaken = (character: CharacterType) => {
    if (!lobby) return false;
    return lobby.players.some((p) => p.character === character && p.userId !== myUserId);
  };

  useEffect(() => {
    let alive = true;

    const mapLobby = (payload: any): LobbyState => {
      const players: LobbyPlayer[] = (payload?.players ?? []).map((p: any) => ({
        userId: Number(p.userId),
        nickname: String(p.nickname ?? `Player${p.userId}`),
        playerId: Number(p.playerId),
        character: fromBackendCharacter(p.character),
        ready: Boolean(p.ready),
      }));
      return {
        hostUserId: payload?.hostUserId ? Number(payload.hostUserId) : null,
        allReady: Boolean(payload?.allReady),
        players,
      };
    };

    void (async () => {
      setConnecting(true);
      setError(null);

      // 토큰이 없으면 로그인 페이지로
      if (!isAuthenticated()) {
        setCurrentPage('login');
        return;
      }

      const meRes = await apiGetMe();
      if (!alive) return;
      if (!meRes) {
        setCurrentPage('login');
        return;
      }
      setMe({ userId: meRes.userId, playerId: meRes.playerId });

      try {
        const socket = await connectSocket();
        if (!alive) return;
        socketRef.current = socket;

        socket.on('connect', () => setConnecting(false));
        socket.on('connect_error', () => {
          setConnecting(false);
          setError('서버 연결에 실패했어요. (socket)');
        });

        socket.on('join_success', (payload: any) => {
          if (!alive) return;
          setRoomStatus(String(payload?.roomStatus ?? 'WAITING'));
          setLobby(mapLobby(payload?.lobby));
        });
        socket.on('join_error', (payload: any) => {
          if (!alive) return;
          setError(payload?.message || '방 참가에 실패했어요.');
        });
        socket.on('lobby_update', (payload: any) => {
          if (!alive) return;
          setLobby(mapLobby(payload));
        });
        socket.on('ready_error', (payload: any) => {
          if (!alive) return;
          setError(payload?.message || '준비 처리에 실패했어요.');
        });
        socket.on('start_error', (payload: any) => {
          if (!alive) return;
          setError(payload?.message || '게임 시작에 실패했어요.');
        });
        socket.on('character_update', (payload: any) => {
          if (!alive) return;
          setLobby((prev) => {
            if (!prev) return prev;
            const userId = Number(payload?.userId);
            const character = fromBackendCharacter(payload?.character);
            return {
              ...prev,
              players: prev.players.map((p) => (p.userId === userId ? { ...p, character } : p)),
            };
          });
        });
        socket.on('game_start', () => {
          if (!alive) return;
          setRoomStatus('PLAYING');
          setCurrentPage('game');
        });

        socket.emit('join_room', 1);
      } catch (e: any) {
        setConnecting(false);
        setError(e?.message || '서버 연결에 실패했어요.');
      }
    })();

    return () => {
      alive = false;
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [setCurrentPage]);

  return (
    <div className="ui-page p-6">
      <SpaceBackdrop />

      <div className="ui-bg-blobs" aria-hidden="true">
        <div className="ui-blob -left-40 top-1/4 bg-sky-500/10" />
        <div className="ui-blob -right-40 bottom-1/4 bg-fuchsia-500/10" />
        <div className="ui-blob left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-indigo-500/10" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-black text-white">캐릭터 선택</h1>
          <p className="text-white/70">
            플레이어: {lobby?.players.length ?? 0} / {maxPlayers} · {roomStatus}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <button type="button" className="ui-btn ui-btn-secondary" onClick={() => void apiLogout()}>
              로그아웃
            </button>
          </div>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-2">
          {/* Left: Character Selection */}
          <div className="ui-card">
            <h2 className="mb-6 text-xl font-bold text-white">캐릭터 목록</h2>

            <div className="grid grid-cols-2 gap-4">
              {CHARACTERS.map((char) => {
                const info = CHARACTER_INFO[char];
                const theme = CHARACTER_THEME[char];
                const taken = isCharacterTaken(char);
                const isMyCharacter = myLobbyPlayer?.character === char;
                const amIReady = myLobbyPlayer?.ready ?? false;
                // 준비 상태면 캐릭터 변경 불가, 다른 사람이 선택한 캐릭터도 선택 불가
                const canPick = !connecting && !!myUserId && !taken && roomStatus === 'WAITING' && !amIReady;

                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => {
                      if (!canPick) return;
                      setError(null);
                      void (async () => {
                        try {
                          await apiSetCharacter(toBackendCharacter(char));
                        } catch (e: any) {
                          setError(e?.message || '캐릭터 선택에 실패했어요.');
                        }
                      })();
                    }}
                    disabled={!canPick}
                    className={`relative overflow-hidden rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-sky-400/20 disabled:cursor-not-allowed disabled:opacity-60 ${
                      isMyCharacter
                        ? 'border-sky-400/40 bg-sky-500/[0.15] ring-2 ring-sky-400/30'
                        : taken
                        ? 'border-white/15 bg-white/[0.03]'
                        : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.06]'
                    }`}
                  >
                    {/* Character emoji */}
                    <div
                      className={`mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-white/10 shadow-lg shadow-black/40 ${theme.bgClass}`}
                    >
                      <img
                        src={info.avatar || '/assets/characters/default.png'}
                        alt={info.name}
                        className={`h-20 w-20 rounded-full object-cover ring-2 ${theme.ringClass}`}
                      />
                    </div>

                    {/* Character name */}
                    <h3 className="text-center text-lg font-bold text-white">{info.name}</h3>
                    <p className="mt-1 text-center text-xs text-white/70">{info.abilityShort}</p>

                    {/* Taken badge */}
                    {isMyCharacter ? (
                      <div className="ui-badge mt-2 w-full justify-center border-sky-400/30 bg-sky-500/[0.2] text-sky-100 font-bold">
                        내 캐릭터
                      </div>
                    ) : taken ? (
                      <div className="ui-badge mt-2 w-full justify-center border-white/10 bg-black/20 text-white/70">
                        선택됨
                      </div>
                    ) : amIReady ? (
                      <div className="ui-badge mt-2 w-full justify-center border-white/10 bg-black/20 text-white/50">
                        준비 해제 후 선택
                      </div>
                    ) : (
                      <div className="ui-badge mt-2 w-full justify-center border-sky-400/20 bg-sky-500/[0.12] text-sky-100">
                        선택하기
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Player List */}
          <div className="space-y-6">
            <div className="ui-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white">플레이어</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {connecting ? '서버 연결 중…' : '방에 접속한 유저들이 보여요.'}
                  </p>
                </div>
                {myLobbyPlayer && myLobbyPlayer.character && roomStatus === 'WAITING' && (
                  <button
                    type="button"
                    className={`ui-btn ${myLobbyPlayer.ready ? 'ui-btn-secondary' : 'ui-btn-success'}`}
                    onClick={() => {
                      const socket = socketRef.current;
                      if (!socket) return;
                      socket.emit('set_ready', { ready: !myLobbyPlayer.ready });
                    }}
                  >
                    {myLobbyPlayer.ready ? '준비 취소' : '준비 완료'}
                  </button>
                )}
              </div>

              {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">{error}</div>}

              <div className="mt-5 space-y-3">
                {(lobby?.players ?? []).map((p) => {
                  const isMe = p.userId === myUserId;
                  const isHostUser = p.userId === lobby?.hostUserId;
                  const charName = p.character ? CHARACTER_INFO[p.character].name : '캐릭터 미선택';
                  const avatar = p.character ? CHARACTER_INFO[p.character].avatar : '/assets/characters/default.png';
                  const ring = p.character ? CHARACTER_THEME[p.character].ringClass : 'ring-white/20';
                  const bg = p.character ? CHARACTER_THEME[p.character].bgClass : 'bg-white/[0.06]';
                  return (
                    <div
                      key={p.userId}
                      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                        isMe ? 'border-sky-400/30 bg-sky-500/[0.08]' : 'border-white/10 bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-full border border-white/10 p-[2px] ${bg}`}>
                          <img
                            src={avatar}
                            alt={p.nickname}
                            className={`h-full w-full rounded-full object-cover ring-2 ${ring}`}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-black text-white">{p.nickname}</div>
                            {isMe && <span className="ui-badge border-sky-400/20 bg-sky-500/[0.10] text-sky-100">나</span>}
                            {isHostUser && <span className="ui-badge ui-badge-warn">방장</span>}
                            {!isHostUser && p.ready && <span className="ui-badge ui-badge-success">준비</span>}
                          </div>
                          <div className="text-xs text-white/60">{charName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!lobby || lobby.players.length === 0) && (
                  <div className="text-sm text-white/60">플레이어 정보를 불러오는 중…</div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => socketRef.current?.emit('start_game')}
              disabled={!canStartGame}
              className={`ui-btn w-full rounded-2xl py-4 text-xl font-black transition ${
                canStartGame ? 'ui-btn-cta' : 'cursor-not-allowed border border-white/10 bg-white/[0.06] text-white/40'
              }`}
            >
              {!lobby || lobby.players.length < 2
                ? '최소 2명 필요'
                : !isHost
                ? '방장이 게임을 시작할 수 있어요'
                : !lobby.allReady
                ? '모든 플레이어 준비 필요'
                : '🎮 게임 시작!'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;
