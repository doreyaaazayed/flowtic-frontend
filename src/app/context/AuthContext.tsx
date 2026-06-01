import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SessionIdleMonitor } from '../components/SessionIdleMonitor';
import { auth as authApi, getToken, type AuthUser, type RegisterPayload } from '../lib/api';
import {
  clearSessionActivity,
  isSessionIdleExpired,
  touchSessionActivity,
} from '../lib/sessionIdle';

type User = AuthUser | null;

type AuthContextValue = {
  user: User;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  loginWithFace: (embedding: number[], emailHint?: string) => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  logout: () => void;
  setUser: (u: User) => void;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'flowtic_token';
const USER_KEY = 'flowtic_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u: User) => {
    setUserState(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
  }, []);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      setLoading(false);
      return;
    }
    if (isSessionIdleExpired()) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      clearSessionActivity();
      setToken(null);
      setUserState(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    authApi
      .me()
      .then((res) => {
        if (cancelled) return;
        const me = res as AuthUser & { userId: string };
        const cached = localStorage.getItem(USER_KEY);
        let u: User;
        if (cached) {
          try {
            u = JSON.parse(cached) as User;
            u = { ...u, id: me.userId, role: me.role, emailVerified: me.emailVerified ?? u?.emailVerified };
            if (me.username != null) u.username = me.username;
            if (me.email != null) u.email = me.email;
            if (me.firstName != null) u.firstName = me.firstName;
            if (me.lastName != null) u.lastName = me.lastName;
            if (me.phone != null) u.phone = me.phone;
            if (me.nationalId != null) u.nationalId = me.nationalId;
            if (me.dateOfBirth != null) u.dateOfBirth = me.dateOfBirth;
            if (me.organizerApproved != null) u.organizerApproved = me.organizerApproved;
            if (me.organizerType != null) u.organizerType = me.organizerType as AuthUser['organizerType'];
            if (me.organizationName != null) u.organizationName = me.organizationName;
            if (me.organizationLocation != null) u.organizationLocation = me.organizationLocation;
            if (me.loyaltyPointsBalance != null) u.loyaltyPointsBalance = me.loyaltyPointsBalance;
            if (me.loyaltyLifetimePoints != null) u.loyaltyLifetimePoints = me.loyaltyLifetimePoints;
            if (me.loyaltyTier != null) u.loyaltyTier = me.loyaltyTier;
            if (me.profilePhotoUrl !== undefined) u.profilePhotoUrl = me.profilePhotoUrl || undefined;
          } catch {
            u = {
              id: me.userId,
              username: me.username ?? '',
              email: me.email ?? '',
              role: me.role,
              emailVerified: me.emailVerified,
              firstName: me.firstName,
              lastName: me.lastName,
              phone: me.phone,
              nationalId: me.nationalId,
              dateOfBirth: me.dateOfBirth,
              organizerApproved: me.organizerApproved,
              organizerType: me.organizerType as AuthUser['organizerType'],
              organizationName: me.organizationName,
              organizationLocation: me.organizationLocation,
              loyaltyPointsBalance: me.loyaltyPointsBalance,
              loyaltyLifetimePoints: me.loyaltyLifetimePoints,
              loyaltyTier: me.loyaltyTier,
              profilePhotoUrl: me.profilePhotoUrl,
            };
          }
        } else {
          u = {
            id: me.userId,
            username: me.username ?? '',
            email: me.email ?? '',
            role: me.role,
            emailVerified: me.emailVerified,
            firstName: me.firstName,
            lastName: me.lastName,
            phone: me.phone,
            nationalId: me.nationalId,
            dateOfBirth: me.dateOfBirth,
            organizerApproved: me.organizerApproved,
            organizerType: me.organizerType as AuthUser['organizerType'],
            organizationName: me.organizationName,
            organizationLocation: me.organizationLocation,
            loyaltyPointsBalance: me.loyaltyPointsBalance,
            loyaltyLifetimePoints: me.loyaltyLifetimePoints,
            loyaltyTier: me.loyaltyTier,
            profilePhotoUrl: me.profilePhotoUrl,
          };
        }
        setUserState(u);
        if (u) {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          touchSessionActivity();
        }
      })
      .catch(() => {
        if (cancelled) return;
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUserState(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token: t, user: u } = await authApi.login({ email, password });
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    touchSessionActivity();
    setToken(t);
    setUserState(u);
    return u;
  }, []);

  const loginWithFace = useCallback(async (embedding: number[], emailHint?: string) => {
    const { token: t, user: u } = await authApi.loginFace({
      embedding,
      ...(emailHint?.trim() ? { email: emailHint.trim() } : {}),
    });
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    touchSessionActivity();
    setToken(t);
    setUserState(u);
  }, []);

  const register = useCallback(async (data: RegisterPayload) => {
    const { token: t, user: u } = await authApi.register(data);
    localStorage.setItem(TOKEN_KEY, t);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    touchSessionActivity();
    setToken(t);
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    clearSessionActivity();
    setToken(null);
    setUserState(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = getToken();
    if (!t) return;
    const res = await authApi.me();
    const me = res as AuthUser & { userId: string };
    const cached = localStorage.getItem(USER_KEY);
    let u: User;
    if (cached) {
      try {
        u = JSON.parse(cached) as User;
        u = { ...u, id: me.userId, role: me.role, emailVerified: me.emailVerified ?? u?.emailVerified };
        if (me.username != null) u.username = me.username;
        if (me.email != null) u.email = me.email;
        if (me.firstName != null) u.firstName = me.firstName;
        if (me.lastName != null) u.lastName = me.lastName;
        if (me.phone != null) u.phone = me.phone;
        if (me.nationalId != null) u.nationalId = me.nationalId;
        if (me.dateOfBirth != null) u.dateOfBirth = me.dateOfBirth;
        if (me.organizerApproved != null) u.organizerApproved = me.organizerApproved;
        if (me.organizerType != null) u.organizerType = me.organizerType as AuthUser['organizerType'];
        if (me.organizationName != null) u.organizationName = me.organizationName;
        if (me.organizationLocation != null) u.organizationLocation = me.organizationLocation;
        if (me.loyaltyPointsBalance != null) u.loyaltyPointsBalance = me.loyaltyPointsBalance;
        if (me.loyaltyLifetimePoints != null) u.loyaltyLifetimePoints = me.loyaltyLifetimePoints;
        if (me.loyaltyTier != null) u.loyaltyTier = me.loyaltyTier;
        if (me.profilePhotoUrl !== undefined) u.profilePhotoUrl = me.profilePhotoUrl || undefined;
      } catch {
        u = {
          id: me.userId,
          username: me.username ?? '',
          email: me.email ?? '',
          role: me.role,
          emailVerified: me.emailVerified,
          firstName: me.firstName,
          lastName: me.lastName,
          phone: me.phone,
          nationalId: me.nationalId,
          dateOfBirth: me.dateOfBirth,
          organizerApproved: me.organizerApproved,
          organizerType: me.organizerType as AuthUser['organizerType'],
          organizationName: me.organizationName,
          organizationLocation: me.organizationLocation,
        };
      }
    } else {
      u = {
        id: me.userId,
        username: me.username ?? '',
        email: me.email ?? '',
        role: me.role,
        emailVerified: me.emailVerified,
        firstName: me.firstName,
        lastName: me.lastName,
        phone: me.phone,
        nationalId: me.nationalId,
        dateOfBirth: me.dateOfBirth,
        organizerApproved: me.organizerApproved,
        organizerType: me.organizerType as AuthUser['organizerType'],
        organizationName: me.organizationName,
        organizationLocation: me.organizationLocation,
        loyaltyPointsBalance: me.loyaltyPointsBalance,
        loyaltyLifetimePoints: me.loyaltyLifetimePoints,
        loyaltyTier: me.loyaltyTier,
        profilePhotoUrl: me.profilePhotoUrl,
      };
    }
    setUserState(u);
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      loginWithFace,
      register,
      logout,
      setUser,
      refreshUser,
    }),
    [user, token, loading, login, loginWithFace, register, logout, setUser, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      <SessionIdleMonitor />
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
