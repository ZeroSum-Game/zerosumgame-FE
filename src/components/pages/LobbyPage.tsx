import { useEffect, useMemo, useRef, useState } from 'react';
import useGameStore, { CHARACTER_INFO, CharacterType, GAME_RULES, SAMSUNG_START_SHARES, STOCK_INFO } from '../../store/useGameStore';
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

type OrderPickResult = {
  userId: number;
  playerId: number;
  cardNumber: number;
  turnOrder: number;
  nickname: string;
};

type OrderPickingState = {
  isPickingOrder: boolean;
  availableCards: number[];
  pickedCards: number[];
  myPickedCard: number | null;
  revealedCards: Record<number, number>;
  orderResults: OrderPickResult[] | null;
};

const LobbyPage = () => {
  const setCurrentPage = useGameStore((s) => s.setCurrentPage);
  const maxPlayers = useGameStore((s) => s.maxPlayers);

  const [me, setMe] = useState<{ userId: number; playerId: number } | null>(null);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [roomStatus, setRoomStatus] = useState<string>('WAITING');
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(true);
  const [orderPicking, setOrderPicking] = useState<OrderPickingState>({
    isPickingOrder: false,
    availableCards: [],
    pickedCards: [],
    myPickedCard: null,
    revealedCards: {},
    orderResults: null,
  });

  const socketRef = useRef<Awaited<ReturnType<typeof connectSocket>> | null>(null);
  const preserveSocketRef = useRef(false);
  const myUserIdRef = useRef<number | null>(null);
  const lobbyRef = useRef<LobbyState | null>(null);

  const myUserId = me?.userId ?? null;
  myUserIdRef.current = myUserId;
  lobbyRef.current = lobby;

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
    const MAX_ME_RETRIES = 5;
    const RETRY_DELAY_MS = 600;

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

    const handlers = {
      connect: () => setConnecting(false),
      connectError: () => {
        setConnecting(false);
        setError("서버 연결에 실패했어요! (socket)");
      },
      joinSuccess: (payload: any) => {
        if (!alive) return;
        setConnecting(false);
        setRoomStatus(String(payload?.roomStatus ?? 'WAITING'));
        setLobby(mapLobby(payload?.lobby));
      },
      joinError: (payload: any) => {
        if (!alive) return;
        setError(payload?.message || "방 참가에 실패했어요!");
      },
      lobbyUpdate: (payload: any) => {
        if (!alive) return;
        setLobby((prev) => {
          const next = mapLobby(payload);
          if (!prev) return next;
          const prevByUserId = new Map(prev.players.map((p) => [p.userId, p]));
          const mergedPlayers = next.players.map((p) => {
            const previous = prevByUserId.get(p.userId);
            return {
              ...p,
              character: p.character ?? previous?.character ?? null,
              ready: p.ready,
            };
          });
          return {
            ...next,
            players: mergedPlayers,
          };
        });
      },
      readyUpdate: (payload: any) => {
        if (!alive) return;
        const userId = Number(payload?.userId);
        const ready = Boolean(payload?.ready);
        setLobby((prev) => {
          if (!prev) return prev;
          const players = prev.players.map((p) => (p.userId === userId ? { ...p, ready } : p));
          const allReady = players.length >= 2 && players.every((p) => p.ready);
          return {
            ...prev,
            players,
            allReady,
          };
        });
      },
      readyError: (payload: any) => {
        if (!alive) return;
        setError(payload?.message || '준비 상태 업데이트에 실패했어요!');
      },
      startError: (payload: any) => {
        if (!alive) return;
        setError(payload?.message || '게임 시작에 실패했어요!');
      },
      characterUpdate: (payload: any) => {
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
      },
      orderPickingStart: (payload: any) => {
        if (!alive) return;
        console.log('[Lobby] order_picking_start:', payload);
        setOrderPicking({
          isPickingOrder: true,
          availableCards: payload.availableCards || [],
          pickedCards: [],
          myPickedCard: null,
          revealedCards: {},
          orderResults: null,
        });
      },
      orderCardPicked: (payload: any) => {
        if (!alive) return;
        console.log('[Lobby] order_card_picked:', payload);
        const pickedUserId = Number(payload?.userId);
        const cardId = Number(payload?.cardId);
        const cardNumber = Number(payload?.cardNumber);
        const currentMyUserId = myUserIdRef.current;
        setOrderPicking((prev) => ({
          ...prev,
          pickedCards: payload.pickedCards || [],
          revealedCards: Number.isFinite(cardId) && Number.isFinite(cardNumber)
            ? { ...prev.revealedCards, [cardId]: cardNumber }
            : prev.revealedCards,
          myPickedCard: pickedUserId === currentMyUserId ? cardId : prev.myPickedCard,
        }));
      },
      orderPickingComplete: (payload: any) => {
        if (!alive) return;
        console.log('[Lobby] order_picking_complete:', payload);
        setOrderPicking((prev) => ({
          ...prev,
          orderResults: payload.orderResults || [],
        }));
      },
      pickError: (payload: any) => {
        if (!alive) return;
        setError(payload?.message || '카드 선택에 실패했어요!');
      },
      gameStart: (payload: any) => {
        if (!alive) return;
        const playersPayload = Array.isArray(payload?.players) ? payload.players : [];
        const lobbySnapshot = lobbyRef.current;
        const currentMyUserId = myUserIdRef.current;
        const myLobbyPlayerSnapshot =
          currentMyUserId && lobbySnapshot
            ? lobbySnapshot.players.find((p) => p.userId === currentMyUserId) ?? null
            : null;
        const myPayloadPlayer =
          currentMyUserId && playersPayload.length > 0
            ? playersPayload.find((p: any) => Number(p?.userId) === currentMyUserId) ?? null
            : null;
        const myCharacter = myLobbyPlayerSnapshot?.character ?? fromBackendCharacter(myPayloadPlayer?.character);
        const canEnterGame =
          playersPayload.length >= 2 &&
          !!myCharacter &&
          Boolean(myLobbyPlayerSnapshot?.ready) &&
          Boolean(lobbySnapshot?.allReady);
        if (!canEnterGame) {
          setError('게임 참가에 실패했어요! (준비 상태가 올바르지 않거나, 방장이 아닙니다)');
          setRoomStatus('WAITING');
          return;
        }
        if (playersPayload.length > 0) {
          const players = playersPayload.map((p: any, idx: number) => {
            const character = fromBackendCharacter(p?.character);
            const baseCash = GAME_RULES.START_CASH;
            const bonusCash = character === 'ELON' ? 1000000 : 0;
            const cash = baseCash + bonusCash;
            const holdings = character === 'SAMSUNG' ? { SAMSUNG: SAMSUNG_START_SHARES } : {};
            const holdingsValue = (holdings.SAMSUNG ?? 0) * STOCK_INFO.SAMSUNG.basePrice;
            const totalAsset = cash + holdingsValue;
            return {
              id: Number(p?.playerId ?? p?.id ?? idx + 1),
              userId: Number(p?.userId ?? 0),
              name: String(p?.nickname ?? `Player ${p?.userId ?? idx + 1}`),
              avatar: character ? CHARACTER_INFO[character].avatar : '/assets/characters/default.png',
              character,
              position: typeof p?.location === 'number' ? p.location : 0,
              cash,
              totalAsset,
              isReady: true,
              isBankrupt: false,
              stockHoldings: holdings,
              tollRateMultiplier: character === 'TRUMP' ? 1.05 : 1.0,
              warWinChanceBonus: character === 'PUTIN' ? 0.1 : 0,
            };
          });

          const currentTurnUserId = Number(payload?.currentTurn ?? 0);
          const turnPlayerId = Number(payload?.turnPlayerId ?? 0);
          const currentPlayerIndex =
            turnPlayerId > 0
              ? players.findIndex((p: any) => p.id === turnPlayerId)
              : players.findIndex((p: any) => p.userId === currentTurnUserId);

          useGameStore.setState({
            players,
            currentPlayerIndex: currentPlayerIndex >= 0 ? currentPlayerIndex : 0,
            phase: 'IDLE',
            round: 1,
            hasRolledThisTurn: false,
            extraRolls: 0,
            dice: [1, 1],
            activeModal: null,
            queuedModal: null,
          });
        }
        preserveSocketRef.current = true;
        setRoomStatus('PLAYING');
        setCurrentPage('game');
      },
    };

    void (async () => {
      setConnecting(true);
      setError(null);

      // Check if the user is authenticated
      if (!isAuthenticated()) {
        setCurrentPage('login');
        return;
      }

      const fetchMe = async (attempt: number) => {
        const meRes = await apiGetMe();
        if (!alive) return;
        if (!meRes) {
          if (attempt < MAX_ME_RETRIES) {
            window.setTimeout(() => {
              void fetchMe(attempt + 1);
            }, RETRY_DELAY_MS);
            return;
          }
          setCurrentPage('login');
          return;
        }
        setMe({ userId: meRes.userId, playerId: meRes.playerId });

        try {
          const socket = await connectSocket();
          if (!alive) return;
          socketRef.current = socket;
          if (socket.connected) {
            setConnecting(false);
          }

          socket.on('connect', handlers.connect);
          socket.on('connect_error', handlers.connectError);
          socket.on('join_success', handlers.joinSuccess);
          socket.on('join_error', handlers.joinError);
          socket.on('lobby_update', handlers.lobbyUpdate);
          socket.on('ready_update', handlers.readyUpdate);
          socket.on('ready_error', handlers.readyError);
          socket.on('start_error', handlers.startError);
          socket.on('character_update', handlers.characterUpdate);
          socket.on('order_picking_start', handlers.orderPickingStart);
          socket.on('order_card_picked', handlers.orderCardPicked);
          socket.on('order_picking_complete', handlers.orderPickingComplete);
          socket.on('pick_error', handlers.pickError);
          socket.on('game_start', handlers.gameStart);

          socket.emit('join_room', 1);
        } catch (e: any) {
          setConnecting(false);
          setError(e?.message || "서버 연결에 실패했어요! (socket)");
        }
      };

      void fetchMe(0);
    })();

    return () => {
      alive = false;
      if (socketRef.current) {
        socketRef.current.off('connect', handlers.connect);
        socketRef.current.off('connect_error', handlers.connectError);
        socketRef.current.off('join_success', handlers.joinSuccess);
        socketRef.current.off('join_error', handlers.joinError);
        socketRef.current.off('lobby_update', handlers.lobbyUpdate);
        socketRef.current.off('ready_update', handlers.readyUpdate);
        socketRef.current.off('ready_error', handlers.readyError);
        socketRef.current.off('start_error', handlers.startError);
        socketRef.current.off('character_update', handlers.characterUpdate);
        socketRef.current.off('order_picking_start', handlers.orderPickingStart);
        socketRef.current.off('order_card_picked', handlers.orderCardPicked);
        socketRef.current.off('order_picking_complete', handlers.orderPickingComplete);
        socketRef.current.off('pick_error', handlers.pickError);
        socketRef.current.off('game_start', handlers.gameStart);
      }
      if (!preserveSocketRef.current) {
        socketRef.current?.disconnect();
      }
      socketRef.current = null;
    };
  }, [setCurrentPage]);

  const handlePickCard = (cardId: number) => {
    if (!socketRef.current || orderPicking.myPickedCard !== null) return;
    if (orderPicking.pickedCards.includes(cardId)) return;
    socketRef.current.emit('pick_order_card', cardId);
  };

  if (orderPicking.isPickingOrder) {
    return (
      <div className="ui-page p-6">
        <SpaceBackdrop />
        <div className="ui-bg-blobs" aria-hidden="true">
          <div className="ui-blob -left-40 top-1/4 bg-amber-500/10" />
          <div className="ui-blob -right-40 bottom-1/4 bg-emerald-500/10" />
        </div>

        <div className="relative z-10 flex min-h-screen flex-col items-center justify-center">
          <div className="ui-card-lg w-full max-w-2xl text-center">
            <h1 className="mb-2 text-3xl font-black text-white">순서 뽑기</h1>
            <p className="mb-8 text-white/70">
              {orderPicking.orderResults
                ? "순서가 결정되었습니다!"
                : orderPicking.myPickedCard
                  ? "당신이 선택한 카드입니다."
                  : "카드를 선택하여 순서를 정해주세요."}
            </p>

            {/* 순서 결과 표시 */}
            {orderPicking.orderResults ? (
              <div className="space-y-4">
                <div className="text-lg font-bold text-amber-300">
                  게임 순서
                </div>
                <div className="flex flex-wrap justify-center gap-4">
                  {orderPicking.orderResults.map((result) => {
                    const player = lobby?.players.find(
                      (p) => p.userId === result.userId,
                    );
                    const character = player?.character;
                    const avatar = character
                      ? CHARACTER_INFO[character].avatar
                      : "/assets/characters/default.png";
                    return (
                      <div
                        key={result.userId}
                        className="flex h-44 w-40 flex-col items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] p-4 text-center"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-xl font-black text-amber-300">
                          {result.turnOrder}
                        </div>
                        <img src={avatar} alt={result.nickname} className="h-12 w-12 rounded-full object-cover" />
                        <div className="w-full truncate text-sm font-bold text-white">{result.nickname}</div>
                        <div className="text-xs text-white/60">카드: {result.cardNumber}</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 text-white/60">
                  게임을 시작합니다...
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {orderPicking.availableCards.map((cardId) => {
                  const isPicked = orderPicking.pickedCards.includes(cardId);
                  const isMyPick = orderPicking.myPickedCard === cardId;
                  const canPick = orderPicking.myPickedCard === null && !isPicked;
                  const revealedNumber = orderPicking.revealedCards[cardId];

                  return (
                    <button
                      key={cardId}
                      type="button"
                      onClick={() => handlePickCard(cardId)}
                      disabled={!canPick}
                      className={`relative h-32 w-24 rounded-xl border-2 text-4xl font-black transition-all ${
                        isMyPick
                          ? "border-emerald-400 bg-emerald-500/20 text-emerald-300 ring-4 ring-emerald-400/30"
                          : isPicked
                            ? "cursor-not-allowed border-white/20 bg-white/[0.02] text-white/30"
                            : canPick
                              ? "border-white/30 bg-white/[0.06] text-white hover:border-amber-400/50 hover:bg-amber-500/10 hover:text-amber-300"
                              : "cursor-not-allowed border-white/10 bg-white/[0.02] text-white/50"
                      }`}
                    >
                      {isPicked && !isMyPick ? (
                        <span className="text-2xl">✓</span>
                      ) : isPicked && Number.isFinite(revealedNumber) ? (
                        revealedNumber
                      ) : (
                        cardId
                      )}
                      {isMyPick && (
                        <div className="absolute -top-2 -right-2 rounded-full bg-emerald-500 px-2 py-1 text-xs text-white">
                          Picked!
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Pick progress */}
            {!orderPicking.orderResults && (
              <div className="mt-8 text-sm text-white/60">
                Picked: {orderPicking.pickedCards.length} /{" "}
                {orderPicking.availableCards.length}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

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
            Players: {lobby?.players.length ?? 0} / {maxPlayers} · {roomStatus}
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
            <h2 className="mb-6 text-xl font-bold text-white">캐릭터</h2>

            <div className="grid grid-cols-2 gap-4">
              {CHARACTERS.map((char) => {
                const info = CHARACTER_INFO[char];
                const theme = CHARACTER_THEME[char];
                const taken = isCharacterTaken(char);
                const isMyCharacter = myLobbyPlayer?.character === char;
                const amIReady = myLobbyPlayer?.ready ?? false;
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
                          setError(e?.message || '캐릭터 선택에 실패했습니다.');
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
                        Taken
                      </div>
                    ) : amIReady ? (
                      <div className="ui-badge mt-2 w-full justify-center border-white/10 bg-black/20 text-white/50">
                        준비 - locked
                      </div>
                    ) : (
                      <div className="ui-badge mt-2 w-full justify-center border-sky-400/20 bg-sky-500/[0.12] text-sky-100">
                        선택
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
                  <h2 className="text-xl font-bold text-white">Players</h2>
                  <p className="mt-1 text-sm text-white/60">
                    {connecting ? 'Connecting to server...' : 'Players in the room'}
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
                    {myLobbyPlayer.ready ? 'Cancel ready' : 'Ready'}
                  </button>
                )}
              </div>

              {error && <div className="mt-4 rounded-xl border border-red-400/20 bg-red-500/[0.10] p-3 text-sm text-red-100">{error}</div>}

              <div className="mt-5 space-y-3">
                {(lobby?.players ?? []).map((p) => {
                  const isMe = p.userId === myUserId;
                  const isHostUser = p.userId === lobby?.hostUserId;
                  const charName = p.character ? CHARACTER_INFO[p.character].name : 'No character';
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
                            {isHostUser && <span className="ui-badge ui-badge-warn">호스트</span>}
                            {!isHostUser && p.ready && <span className="ui-badge ui-badge-success">준비</span>}
                          </div>
                          <div className="text-xs text-white/60">{charName}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {(!lobby || lobby.players.length === 0) && (
                  <div className="text-sm text-white/60">Loading players...</div>
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
                ? 'At least 2 players required'
                : !isHost
                ? 'Only the host can start'
                : !lobby.allReady
                ? 'All players must be ready'
                : 'Start Game'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyPage;

