import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';

import {
  AuthContext,
  AuthState,
  User,
  clearAuth,
  loadAuth,
  saveAuth,
} from '../store/authStore';

import { revalidateSession } from '../utils/api';

type Action =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN'; payload: { token: string; user: User } }
  | { type: 'LOGOUT' };

function reducer(state: AuthState, action: Action): AuthState {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'LOGIN':
      return {
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
      };

    case 'LOGOUT':
      return {
        user: null,
        token: null,
        isLoading: false,
      };

    default:
      return state;
  }
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(reducer, {
    user: null,
    token: null,
    isLoading: true,
  });

  // Bumped on every login/logout so a slow background revalidation can't
  // overwrite a session change the user made in the meantime.
  const sessionVersion = useRef(0);

  useEffect(() => {
    const initializeAuth = async () => {
      let stored: Awaited<ReturnType<typeof loadAuth>>;
      try {
        stored = await loadAuth();
      } catch {
        await clearAuth().catch(() => {});
        dispatch({ type: 'LOGOUT' });
        return;
      }

      const { token, refreshToken, user } = stored;
      if (!token || !refreshToken || !user) {
        await clearAuth().catch(() => {});
        dispatch({ type: 'LOGOUT' });
        return;
      }

      // Restore the stored session immediately so the app opens instantly and
      // works offline; the server check below runs in the background.
      dispatch({ type: 'LOGIN', payload: { token, user } });
      const version = sessionVersion.current;

      const result = await revalidateSession(token, refreshToken);
      if (version !== sessionVersion.current) return;

      if (result.status === 'valid') {
        await saveAuth(result.accessToken, result.user, result.refreshToken);
        dispatch({ type: 'LOGIN', payload: { token: result.accessToken, user: result.user } });
      } else if (result.status === 'expired') {
        await clearAuth();
        dispatch({ type: 'LOGOUT' });
      }
      // 'unreachable': offline or server down — keep the stored session.
    };

    initializeAuth();
  }, []);

  const login = useCallback(
    async (
      token: string,
      user: User,
      refreshToken: string,
    ) => {
      sessionVersion.current += 1;
      await saveAuth(token, user, refreshToken);

      dispatch({
        type: 'LOGIN',
        payload: { token, user },
      });
    },
    []
  );

  const logout = useCallback(async () => {
    sessionVersion.current += 1;
    await clearAuth();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const setLoading = useCallback((val: boolean) => {
    dispatch({
      type: 'SET_LOADING',
      payload: val,
    });
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      login,
      logout,
      setLoading,
    }),
    [state, login, logout, setLoading]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
