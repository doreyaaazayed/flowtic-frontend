/**
 * FlowTic backend API client.
 * Dev on PC: Vite proxy (/api → localhost:5000).
 * Dev on phone (LAN IP): calls http://<same-host>:5000/api directly.
 */

import { Capacitor } from "@capacitor/core";
import type { VenueListItem, VenueListPage } from "../types/venue";
import { globalLoadingEnd, globalLoadingStart } from "./globalLoading";
import { isNativeApp, isNativeDevServer } from "./nativeApp";

export { globalLoadingStart, globalLoadingEnd, withGlobalLoading } from "./globalLoading";
export type { GlobalLoadingState } from "./globalLoading";

export function resolveApiBase(): string {
  if (import.meta.env.VITE_API_URL) {
    return String(import.meta.env.VITE_API_URL).replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    /** Capacitor live reload: same LAN host as Vite, API on :5000 */
    if (isNativeDevServer()) {
      if (host === "localhost" || host === "127.0.0.1") {
        return Capacitor.getPlatform() === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";
      }
      return `http://${host}:5000`;
    }

    /** Browser dev: same-origin /api via Vite proxy */
    if (import.meta.env.DEV) {
      return "";
    }
  }

  /** Bundled native build — emulator fallback; set VITE_API_URL for real devices */
  if (isNativeApp()) {
    return Capacitor.getPlatform() === "android" ? "http://10.0.2.2:5000" : "http://127.0.0.1:5000";
  }

  return "http://localhost:5000";
}

function apiRoot(): string {
  const base = resolveApiBase();
  return base ? `${base}/api` : "/api";
}

/** True when opened via LAN IP (browser dev) or Capacitor live reload on a device. */
export function isLanDevHost(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeDevServer()) return true;
  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1" && import.meta.env.DEV;
}

/** Direct health URL for Safari on iPhone (bypasses Vite proxy). */
export function getLanApiHealthUrl(): string | null {
  const base = resolveApiBase();
  return base ? `${base}/api/health` : null;
}

const getToken = (): string | null => localStorage.getItem("flowtic_token");

// Stats (admin + organizer dashboards)
export const stats = {
  admin: () =>
    request<{
      totalUsers: number;
      activeEvents: number;
      platformRevenue: number;
      fraudCount: number;
      pendingEvents?: number;
      pendingListings?: number;
      pendingRequests?: number;
    }>("/stats/admin"),
  adminChart: () =>
    request<
      Array<{ month: string; users: number; events: number; revenue: number }>
    >("/stats/admin/chart"),
  adminSecurity: () =>
    request<{
      alerts: Array<{
        id: string;
        kind?: string;
        type: string;
        severity: string;
        time: string;
        status: string;
        ticketId?: number | null;
        eventId?: number | null;
        eventMongoId?: string | null;
        eventName?: string | null;
        action?: string;
        reason?: string | null;
        reasonLabel?: string | null;
        gateIndex?: number | null;
        requestId?: string | null;
        buyerEmail?: string | null;
        buyerUsername?: string | null;
        duplicateTicketCount?: number;
        detail?: string | null;
        navigateTo?: string | null;
        occurredAtIso?: string;
        auditLogId?: string;
        meta?: Record<string, unknown>;
        faceMatch?: {
          similarityPercent: number;
          thresholdPercent: number;
          passed: boolean;
        } | null;
        participants?: Array<{
          role: string;
          roleLabel: string;
          id: string;
          username?: string | null;
          email?: string | null;
          display: string;
          faceIdEnrolled?: boolean;
          accountRole?: string | null;
        }>;
      }>;
      resale: {
        activeListings: number;
        completedTransfers: number;
        flaggedListings: number;
        pendingApproval: number;
        paymentPending: number;
        verificationRate: number;
        links?: Record<
          string,
          { navigateTo: string; focus?: string }
        >;
      };
    }>("/stats/admin/security"),
  adminActivity: () =>
    request<{
      items: Array<{
        id: string;
        type: string;
        action: string;
        detail: string;
        time: string;
      }>;
    }>("/stats/admin/activity"),
  organizer: () =>
    request<{
      eventCount: number;
      totalRevenue: number;
      totalTicketsSold: number;
      totalAttendees: number;
    }>("/stats/organizer"),
  organizerChart: () =>
    request<Array<{ month: string; sales: number }>>("/stats/organizer/chart"),
  organizerDemographics: () =>
    request<{
      attendeeCount: number;
      ageKnownCount: number;
      ageDistribution: Array<{ range: string; count: number; percent: number }>;
      topLocations: Array<{ city: string; count: number }>;
      ticketTypes: Array<{ type: string; count: number; percent: number }>;
    }>("/stats/organizer/demographics"),
};

// Health check – use to verify backend is running
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${apiRoot()}/health`);
    return res.ok && (await res.json()).status === "ok";
  } catch {
    return false;
  }
}

type ApiRequestOptions = RequestInit & {
  body?: object;
  meta?: (h: Headers) => void;
  /**
   * Force the global loading overlay on or off.
   * Default: on for POST/PUT/PATCH/DELETE, off for GET/HEAD (background reads).
   */
  loading?: boolean;
  /** @deprecated Use `loading: false` — kept for older call sites */
  silent?: boolean;
};

function shouldShowGlobalLoading(
  method: string,
  options: Pick<ApiRequestOptions, "loading" | "silent">,
): boolean {
  if (options.silent === true || options.loading === false) return false;
  if (options.loading === true) return true;
  const m = method.toUpperCase();
  return m !== "GET" && m !== "HEAD";
}

async function request<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, meta, silent, loading, ...rest } = options;
  const method = String(rest.method ?? "GET");
  const showLoading = shouldShowGlobalLoading(method, { loading, silent });
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (showLoading) globalLoadingStart();
  let res: Response;
  try {
    res = await fetch(`${apiRoot()}${path}`, {
      ...rest,
      headers,
      body: body !== undefined ? JSON.stringify(body) : options.body,
    });
  } finally {
    if (showLoading) globalLoadingEnd();
  }

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      similarity?: number;
      threshold?: number;
      storedDim?: number;
      probeDim?: number;
    };
    let msg = data.message || res.statusText || "Request failed";
    if (typeof data.similarity === "number" && typeof data.threshold === "number") {
      msg += ` Match ${(data.similarity * 100).toFixed(1)}% (need ${(data.threshold * 100).toFixed(0)}%). Try brighter light or re-enroll Face ID.`;
    }
    if (typeof data.storedDim === "number" && typeof data.probeDim === "number") {
      msg += ` Template ${data.storedDim}D vs scan ${data.probeDim}D.`;
    }
    throw new Error(msg);
  }

  if (meta) meta(res.headers);
  if (res.status === 204) return undefined as T;
  return res.json();
}

/**
 * Small per-tab cache + in-flight dedupe + AbortController helpers.
 * Used by hot read paths (events listings) so the same query within a short
 * window doesn't hit the backend twice and so route changes can cancel pending
 * requests instead of starving the UI.
 */
const apiCache = new Map<string, { ts: number; value: unknown }>();
const inflight = new Map<string, Promise<unknown>>();
const CACHE_TTL_MS = 30_000;

function cachedGet<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<{ value: T; headers: Headers }>,
  signal?: AbortSignal,
): Promise<{ value: T; headers: Headers }> {
  const now = Date.now();
  const hit = apiCache.get(key);
  if (hit && now - hit.ts < CACHE_TTL_MS) {
    return Promise.resolve(hit.value as { value: T; headers: Headers });
  }
  const existing = inflight.get(key);
  if (existing) return existing as Promise<{ value: T; headers: Headers }>;
  const controller = new AbortController();
  if (signal) {
    signal.addEventListener(
      "abort",
      () => {
        controller.abort();
        inflight.delete(key);
      },
      { once: true },
    );
  }
  const promise = loader(controller.signal)
    .then((res) => {
      apiCache.set(key, { ts: Date.now(), value: res });
      return res;
    })
    .catch((err) => {
      if (controller.signal.aborted) {
        inflight.delete(key);
        return Promise.reject(err);
      }
      throw err;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export function invalidateEventsCache() {
  for (const key of apiCache.keys()) {
    if (key.startsWith("/events")) apiCache.delete(key);
  }
}

export function invalidateVenuesCache() {
  for (const key of apiCache.keys()) {
    if (key.startsWith("/venues")) apiCache.delete(key);
  }
}

// Auth
export type AuthUser = {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  nationalId?: string;
  dateOfBirth?: string;
  role: string;
  emailVerified?: boolean;
  roleId?: number;
  organizerType?: "individual" | "organization";
  /** false = organization organizer waiting for admin approval */
  organizerApproved?: boolean;
  organizationName?: string;
  organizationLocation?: string;
  loyaltyPointsBalance?: number;
  loyaltyLifetimePoints?: number;
  loyaltyTier?: string;
  profilePhotoUrl?: string;
  mustChangePassword?: boolean;
};

export type RegisterPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  nationalId: string;
  dateOfBirth: string;
  role?: string;
  organizerType?: "individual" | "organization";
  organizationName?: string;
  organizationLocation?: string;
  commercialRegistrationDoc?: string;
  taxCardDoc?: string;
};

export const auth = {
  oauthProviders: () =>
    request<{ google: boolean; apple: boolean }>("/auth/providers"),
  register: (data: RegisterPayload) =>
    request<{ token: string; user: AuthUser }>("/auth/register", {
      method: "POST",
      body: data,
    }),
  login: (data: { email: string; password: string }) =>
    request<{ token: string; user: AuthUser }>("/auth/login", {
      method: "POST",
      body: data,
    }),
  loginFace: (data: { embedding: number[]; email?: string }) =>
    request<{
      token: string;
      user: AuthUser;
      faceMatch?: { similarity: number; threshold: number };
    }>("/auth/login-face", {
      method: "POST",
      body: data,
    }),
  me: () =>
    request<{
      userId: string;
      role: string;
      username?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      nationalId?: string;
      dateOfBirth?: string;
      emailVerified?: boolean;
      organizerType?: string;
      organizerApproved?: boolean;
      organizationName?: string;
      organizationLocation?: string;
      loyaltyPointsBalance?: number;
      loyaltyLifetimePoints?: number;
      loyaltyTier?: string;
      profilePhotoUrl?: string;
    }>("/auth/me"),
  verifyEmail: (data: { email: string; otp: string }) =>
    request<{ message: string; user: AuthUser }>("/auth/verify-email", {
      method: "POST",
      body: data,
    }),
  resendOtp: (email: string) =>
    request<{ message: string }>("/auth/resend-otp", {
      method: "POST",
      body: { email },
    }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean; message: string }>("/auth/change-password", {
      method: "PATCH",
      body,
    }),
};

// Profile
export type UserProfileDetail = {
  username?: string;
  email?: string;
  role?: string;
  nationalId?: string;
  dateOfBirth?: string;
  emailVerified?: boolean;
  organizerType?: string;
  organizerApproved?: boolean;
  organizationName?: string;
  organizationLocation?: string;
  loyaltyPointsBalance?: number;
  loyaltyLifetimePoints?: number;
  loyaltyTier?: string;
  profilePhotoUrl?: string;
  memberSince?: string;
  FirstName?: string;
  LastName?: string;
  Phone?: string;
  Address?: string;
  City?: string;
  OrgName?: string;
  ContactInfo?: string;
  Description?: string;
  faceEnrolled?: boolean;
};

export const profile = {
  get: () => request<UserProfileDetail>("/profile"),
  update: (data: {
    username?: string;
    email?: string;
    FirstName?: string;
    LastName?: string;
    Phone?: string;
    Address?: string;
    City?: string;
    OrgName?: string;
    ContactInfo?: string;
    Description?: string;
  }) => request<UserProfileDetail>("/profile", { method: "PUT", body: data }),
  uploadPhoto: async (file: File) => {
    const form = new FormData();
    form.append("photo", file);
    const token = getToken();
    globalLoadingStart();
    try {
      const res = await fetch(`${apiRoot()}/profile/photo`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || res.statusText || "Upload failed");
      }
      return res.json() as Promise<{ profilePhotoUrl: string; profile: UserProfileDetail }>;
    } finally {
      globalLoadingEnd();
    }
  },
  removePhoto: () =>
    request<{ profile: UserProfileDetail }>("/profile/photo", { method: "DELETE" }),
  faceStatus: () => request<{ enrolled: boolean }>("/profile/face"),
  enrollFace: (payload: { embedding?: number[]; samples?: number[][] }) =>
    request<{ message: string; enrolled: boolean; gallerySize?: number }>(
      "/profile/face/enroll",
      {
        method: "POST",
        body: payload,
      },
    ),
  verifyFace: (embedding: number[]) =>
    request<{ match: boolean; similarity: number; threshold: number }>(
      "/profile/face/verify",
      {
        method: "POST",
        body: { embedding },
      },
    ),
  deleteFace: (embedding: number[]) =>
    request<{ message: string; enrolled: boolean }>("/profile/face", {
      method: "DELETE",
      body: { embedding },
    }),
  cards: {
    list: () =>
      request<
        Array<{
          _id: string;
          lastFour: string;
          brand: string;
          expiryMonth: number;
          expiryYear: number;
          cardholderName?: string;
          label?: string;
          createdAt?: string;
        }>
      >("/profile/cards"),
    add: (data: {
      cardNumber: string;
      expiryMonth: number;
      expiryYear: number;
      cardholderName?: string;
      label?: string;
    }) =>
      request<{
        _id: string;
        lastFour: string;
        brand: string;
        expiryMonth: number;
        expiryYear: number;
        cardholderName?: string;
        label?: string;
      }>("/profile/cards", { method: "POST", body: data }),
    remove: (id: string) =>
      request(`/profile/cards/${id}`, { method: "DELETE" }),
  },
};

// Users (admin)
export const users = {
  list: () =>
    request<
      Array<{
        _id: string;
        UserID?: number;
        Username?: string;
        Email?: string;
        role?: string;
        Created_At?: string;
        faceIdReference?: string | null;
        faceIdEnrolled?: boolean;
      }>
    >("/users"),
  pendingOrganizers: () =>
    request<
      Array<{
        _id: string;
        Username?: string;
        Email?: string;
        organizationName?: string;
        organizationLocation?: string;
        Created_At?: string;
      }>
    >("/users/pending-organizers"),
  approveOrganizer: (id: string) =>
    request<{ _id: string; role?: string; organizerApproved?: boolean }>(
      `/users/${id}/approve-organizer`,
      {
        method: "POST",
      },
    ),
  rejectOrganizer: (id: string) =>
    request<{ message: string }>(`/users/${id}/reject-organizer`, {
      method: "POST",
    }),
  get: (id: string) =>
    request<{
      _id: string;
      Username?: string;
      Email?: string;
      role?: string;
      organizationName?: string;
      organizationLocation?: string;
      commercialRegistrationDoc?: string;
      taxCardDoc?: string;
    }>(`/users/${id}`),
  update: (
    id: string,
    data: { username?: string; email?: string; role?: string },
  ) => request(`/users/${id}`, { method: "PUT", body: data }),
  delete: (id: string) => request(`/users/${id}`, { method: "DELETE" }),
  resetFaceId: (id: string) =>
    request<{ message: string; userId: string; email?: string }>(
      `/users/${id}/reset-face-id`,
      { method: "POST" },
    ),
};

// Venues
export type { VenueListItem, VenueListPage };

export const venues = {
  list: (options?: { signal?: AbortSignal }) => {
    const path = "/venues";
    return cachedGet<VenueListItem[]>(
      path,
      async (signal) => {
        const value = await request<VenueListItem[]>(path, { signal });
        return { value, headers: new Headers() };
      },
      options?.signal,
    ).then((r) => r.value);
  },
  listPage: (
    params?: { page?: number; limit?: number; search?: string },
    options?: { signal?: AbortSignal },
  ) => {
    const q = new URLSearchParams();
    if (params?.page != null) q.set("page", String(params.page));
    if (params?.limit != null) q.set("limit", String(params.limit));
    if (params?.search?.trim()) q.set("search", params.search.trim());
    const query = q.toString();
    return request<VenueListPage>(`/venues${query ? `?${query}` : ""}`, {
      signal: options?.signal,
    });
  },
  get: (id: string) => request<VenueListItem>(`/venues/${id}`),
  create: (data: {
    Name: string;
    Location: string;
    Capacity?: number;
    Type?: string;
    Description?: string;
    imageUrl?: string;
  }) =>
    request<VenueListItem>("/venues", { method: "POST", body: data }).then((v) => {
      invalidateVenuesCache();
      return v;
    }),
  update: (
    id: string,
    data: {
      Name?: string;
      Location?: string;
      Capacity?: number | null;
      Type?: string;
      Description?: string;
      imageUrl?: string | null;
    },
  ) =>
    request<VenueListItem>(`/venues/${id}`, { method: "PUT", body: data }).then((v) => {
      invalidateVenuesCache();
      return v;
    }),
  delete: (id: string) =>
    request<void>(`/venues/${id}`, { method: "DELETE" }).then((v) => {
      invalidateVenuesCache();
      return v;
    }),
};

// Categories (EventCategory)
export const categories = {
  list: (params?: { publicOnly?: boolean }, options?: { signal?: AbortSignal }) => {
    const query = params?.publicOnly ? "?publicOnly=true" : "";
    const path = `/categories${query}`;
    return cachedGet<Array<{ _id: string; CategoryID: number; Name: string }>>(
      path,
      async (signal) => {
        const value = await request<Array<{ _id: string; CategoryID: number; Name: string }>>(
          path,
          { signal },
        );
        return { value, headers: new Headers() };
      },
      options?.signal,
    ).then((r) => r.value);
  },
  get: (id: string) => request(`/categories/${id}`),
  create: (data: { Name: string; Description?: string }) =>
    request<{ _id: string; CategoryID: number; Name: string }>("/categories", {
      method: "POST",
      body: data,
    }),
};

// Events
export type EventHostingMode =
  | "ticketing_only"
  | "equipment_only"
  | "venue_only"
  | "full_setup";

export type ExternalVenuePayload = {
  name: string;
  location: string;
  address?: string;
  capacity?: number;
};

export type MegaStarPayload = {
  starId: string;
  starName: string;
  durationId: string;
  durationLabel: string;
  priceEgp: number;
  displayLabel: string;
};

export type EventListItem = {
  _id: string;
  EventID: number;
  Name: string;
  Description?: string;
  StartDate: string;
  EndDate: string;
  VenueID?: number;
  CategoryID: number;
  Status: string;
  capacity?: number;
  organizer?: string;
  imageUrl?: string;
  minPrice?: number;
  hostingMode?: EventHostingMode;
  externalVenue?: ExternalVenuePayload;
};

export type EventListPage = {
  data: EventListItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

function buildEventsQuery(params?: {
  CategoryID?: string;
  VenueID?: string;
  Status?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const q = new URLSearchParams();
  if (params?.CategoryID) q.set("CategoryID", params.CategoryID);
  if (params?.VenueID) q.set("VenueID", params.VenueID);
  if (params?.Status) q.set("Status", params.Status);
  if (params?.fromDate) q.set("fromDate", params.fromDate);
  if (params?.toDate) q.set("toDate", params.toDate);
  if (params?.search) q.set("search", params.search);
  if (params?.page != null) q.set("page", String(params.page));
  if (params?.limit != null) q.set("limit", String(params.limit));
  return q.toString();
}

export const events = {
  /**
   * Legacy list — same shape callers already expect. Behind the scenes this
   * is cached + de-duped for ~30 seconds and supports abort via `signal`.
   */
  list: (
    params?: {
      CategoryID?: string;
      VenueID?: string;
      Status?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
    options?: { signal?: AbortSignal },
  ) => {
    const query = buildEventsQuery(params);
    const path = `/events${query ? `?${query}` : ""}`;
    return cachedGet<EventListItem[]>(
      path,
      async (signal) => {
        let headers!: Headers;
        const value = await request<EventListItem[]>(path, {
          signal,
          meta: (h) => {
            headers = h;
          },
        });
        return { value, headers };
      },
      options?.signal,
    ).then((r) => r.value);
  },
  /**
   * Paginated variant that also surfaces the `X-Total-Count` / `X-Has-More`
   * headers so the UI can decide whether to fetch more.
   */
  listPage: (
    params: {
      CategoryID?: string;
      VenueID?: string;
      Status?: string;
      fromDate?: string;
      toDate?: string;
      search?: string;
      page: number;
      limit: number;
    },
    options?: { signal?: AbortSignal },
  ) => {
    const query = buildEventsQuery(params);
    const path = `/events?${query}`;
    return cachedGet<EventListItem[]>(
      path,
      async (signal) => {
        let headers!: Headers;
        const value = await request<EventListItem[]>(path, {
          signal,
          meta: (h) => {
            headers = h;
          },
        });
        return { value, headers };
      },
      options?.signal,
    ).then(({ value, headers }) => {
      const total = Number(headers.get("X-Total-Count") || value.length);
      const hasMore =
        (headers.get("X-Has-More") || "").toLowerCase() === "true" ||
        params.page * params.limit < total;
      return {
        data: value,
        page: params.page,
        limit: params.limit,
        total,
        hasMore,
      } satisfies EventListPage;
    });
  },
  get: (id: string, options?: { signal?: AbortSignal; invite?: string }) => {
    const qs = options?.invite ? `?invite=${encodeURIComponent(options.invite)}` : "";
    const path = `/events/${id}${qs}`;
    return cachedGet<{
      _id: string;
      EventID: number;
      Name: string;
      Description?: string;
      StartDate: string;
      EndDate: string;
      VenueID?: number;
      CategoryID: number;
      Status: string;
      capacity?: number;
      organizer?: string;
      imageUrl?: string;
      entryGatingEnabled?: boolean;
      isSeated?: boolean;
      seatMapFloorPlanUrl?: string;
      hostingMode?: EventHostingMode;
      externalVenue?: ExternalVenuePayload;
      selectedEquipment?: string[];
      venueDetailsRevealed?: boolean;
      invitationDetails?: {
        brideName?: string;
        groomName?: string;
        honoreeName?: string;
        hostNames?: string;
        customMessage?: string;
      };
    }>(
      path,
      async (signal) => {
        const value = await request<{
          _id: string;
          EventID: number;
          Name: string;
          Description?: string;
          StartDate: string;
          EndDate: string;
          VenueID?: number;
          CategoryID: number;
          Status: string;
          capacity?: number;
          organizer?: string;
          imageUrl?: string;
          entryGatingEnabled?: boolean;
          isSeated?: boolean;
          seatMapFloorPlanUrl?: string;
          hostingMode?: EventHostingMode;
          externalVenue?: ExternalVenuePayload;
          selectedEquipment?: string[];
          venueDetailsRevealed?: boolean;
          invitationDetails?: {
            brideName?: string;
            groomName?: string;
            honoreeName?: string;
            hostNames?: string;
            customMessage?: string;
          };
        }>(path, { signal });
        return { value, headers: new Headers() };
      },
      options?.signal,
    ).then((r) => r.value);
  },
  create: async (data: {
    hostingMode: EventHostingMode;
    VenueID?: number;
    externalVenue?: ExternalVenuePayload;
    CategoryID: number;
    Name: string;
    Description?: string;
    StartDate: string;
    EndDate: string;
    Status?: string;
    capacity?: number;
    isSeated?: boolean;
    imageUrl?: string;
    selectedEquipment?: string[];
    equipmentSelection?: Array<{ id: string; quantity?: number }>;
    megaStar?: MegaStarPayload;
    invitationDetails?: {
      brideName?: string;
      groomName?: string;
      honoreeName?: string;
      hostNames?: string;
      customMessage?: string;
    };
  }) => {
    const res = await request(`/events`, { method: "POST", body: data });
    invalidateEventsCache();
    return res;
  },
  update: async (id: string, data: Record<string, unknown>) => {
    const res = await request(`/events/${id}`, { method: "PUT", body: data });
    invalidateEventsCache();
    return res;
  },
  delete: async (id: string) => {
    const res = await request(`/events/${id}`, { method: "DELETE" });
    invalidateEventsCache();
    return res;
  },
  // Organizer: my events (with sold/capacity)
  my: () =>
    request<
      Array<{
        _id: string;
        EventID: number;
        Name: string;
        StartDate: string;
        EndDate: string;
        Status: string;
        CategoryID?: number;
        VenueID?: number;
        capacity: number;
        sold: number;
        entryGatingEnabled?: boolean;
        setupDeposit?: {
          totalEgp?: number;
          paymentStatus?: string;
        };
      }>
    >("/events/my"),
  // Admin: pending events for approval
  pending: () =>
    request<
      Array<{
        _id: string;
        Name: string;
        Description?: string;
        StartDate: string;
        EndDate: string;
        Status: string;
        organizer?: { Username?: string; Email?: string };
        selectedEquipment?: string[];
        hostingMode?: EventHostingMode;
        externalVenue?: ExternalVenuePayload;
        VenueID?: number;
        megaStar?: MegaStarPayload;
        setupDeposit?: {
          subtotalEgp?: number;
          platformFeePercent?: number;
          platformFeeEgp?: number;
          totalEgp?: number;
        };
      }>
    >("/events/pending"),
  approve: async (id: string) => {
    const res = await request(`/events/${id}/approve`, { method: "POST" });
    invalidateEventsCache();
    return res;
  },
  reject: async (id: string) => {
    const res = await request(`/events/${id}/reject`, { method: "POST" });
    invalidateEventsCache();
    return res;
  },
  getSetupDeposit: (eventId: string) =>
    request<{
      _id: string;
      Name: string;
      Status: string;
      setupDeposit?: {
        equipmentSubtotalEgp?: number;
        megaStarEgp?: number;
        subtotalEgp?: number;
        platformFeePercent?: number;
        platformFeeEgp?: number;
        totalEgp?: number;
        paymentStatus?: string;
        paidAt?: string;
      } | null;
    }>(`/events/${eventId}/setup-deposit`),
  paySetupDeposit: async (
    eventId: string,
    data: { paymentMethod: string; paymentCardId: string },
  ) => {
    const res = await request<{ message: string }>(`/events/${eventId}/setup-deposit/pay`, {
      method: "POST",
      body: data,
    });
    invalidateEventsCache();
    return res;
  },
};

// Ticket categories (by event)
export const ticketCategories = {
  listByEvent: (eventId: string) =>
    request<
      Array<{
        _id: string;
        TicketCatID: number;
        EventID: number;
        Name: string;
        Price: number;
        TotalQuantity: number;
        Description?: string;
      }>
    >(`/events/${eventId}/ticket-categories`),
  get: (eventId: string, ticketCategoryId: string) =>
    request(`/events/${eventId}/ticket-categories/${ticketCategoryId}`),
  create: (
    eventId: string,
    data: {
      Name: string;
      Price: number;
      TotalQuantity: number;
      Description?: string;
    },
  ) =>
    request(`/events/${eventId}/ticket-categories`, {
      method: "POST",
      body: data,
    }),
  update: (
    eventId: string,
    ticketCategoryId: string,
    data: Record<string, unknown>,
  ) =>
    request(`/events/${eventId}/ticket-categories/${ticketCategoryId}`, {
      method: "PUT",
      body: data,
    }),
  delete: (eventId: string, ticketCategoryId: string) =>
    request(`/events/${eventId}/ticket-categories/${ticketCategoryId}`, {
      method: "DELETE",
    }),
};

// Seat map (seated events)
export type SeatMapLayout = { x: number; y: number; w: number; h: number };
export type SeatMapPlacement = "grid" | "arc";
export type SeatMapStagePosition = "top" | "bottom" | "left" | "right" | "center" | "none";
export type SeatMapRowInput = {
  label: string;
  seatCount: number;
  rowFraction?: number;
};
export type SeatMapSection = {
  name: string;
  ticketCategoryId: string;
  rows: SeatMapRowInput[];
  layout?: SeatMapLayout;
  placement?: SeatMapPlacement;
};
/** AI analyze before event exists (creation form); ticketCategoryId added after categories exist. */
export type SeatMapPreviewSection = {
  name: string;
  rows: SeatMapRowInput[];
  layout?: SeatMapLayout;
  placement?: SeatMapPlacement;
};
export const seatMap = {
  get: (eventId: string) =>
    request<{
      isSeated: boolean;
      floorPlanUrl: string | null;
      stagePosition?: SeatMapStagePosition;
      sections: Array<{
        name: string;
        ticketCategoryId: string;
        ticketCategoryName: string;
        price: number;
        rows: Array<{
          label: string;
          seats: Array<{
            SeatID: number;
            SeatNumber: number;
            available: boolean;
            posX?: number;
            posY?: number;
          }>;
        }>;
      }>;
    }>(`/events/${eventId}/seat-map`),
  saveFloorPlan: (eventId: string, imageUrl: string) =>
    request<{ seatMapFloorPlanUrl: string }>(
      `/events/${eventId}/seat-map/floor-plan`,
      {
        method: "POST",
        body: { imageUrl },
      },
    ),
  analyzePreview: (imageUrl: string) =>
    request<{ sections: SeatMapPreviewSection[]; stagePosition?: SeatMapStagePosition }>(
      "/events/analyze-floor-plan-preview",
      {
        method: "POST",
        body: { imageUrl },
      },
    ),
  analyze: (eventId: string, imageUrl?: string) =>
    request<{ sections: SeatMapSection[]; stagePosition?: SeatMapStagePosition }>(
      `/events/${eventId}/seat-map/analyze`,
      {
        method: "POST",
        body: imageUrl ? { imageUrl } : {},
      },
    ),
  create: (
    eventId: string,
    data: { sections: SeatMapSection[]; stagePosition?: SeatMapStagePosition },
  ) =>
    request<{ message: string; seatCount: number; stagePosition?: SeatMapStagePosition }>(
      `/events/${eventId}/seat-map`,
      { method: "POST", body: data },
    ),
  deleteSeatMap: (eventId: string) =>
    request<{ deleted: boolean; seatCount: number }>(
      `/events/${eventId}/seat-map`,
      { method: "DELETE" },
    ),
};

// Seat holds (Redis TTL locks — prevents double-booking)
export const seatHold = {
  /** Lock seats for the current user. Returns { held, ttlSeconds } or throws 409 if taken. */
  hold: (eventId: string, seatIds: number[]) =>
    request<{ held: boolean; ttlSeconds: number; seatIds: number[] }>(
      `/events/${eventId}/seat-hold`,
      { method: "POST", body: { seatIds } },
    ),
  /** Release the user's hold on specific seats. */
  release: (eventId: string, seatIds: number[]) =>
    request<{ released: boolean }>(`/events/${eventId}/seat-hold`, {
      method: "DELETE",
      body: { seatIds },
    }),
  /** Get remaining TTL in seconds for the user's current hold. */
  ttl: (eventId: string, seatIds: number[]) =>
    request<{ ttlSeconds: number }>(
      `/events/${eventId}/seat-hold?seatIds=${seatIds.join(",")}`,
    ),
  /** Refresh TTL — call periodically while user is on payment step. */
  refresh: (eventId: string, seatIds: number[]) =>
    request<{ refreshed: boolean; ttlSeconds: number }>(
      `/events/${eventId}/seat-hold`,
      { method: "PATCH", body: { seatIds } },
    ),
};

// Bookings
export const bookings = {
  create: (
    data:
      | {
          eventId: string;
          ticketCategoryId: string;
          quantity: number;
          promoCode?: string;
          requestUpgrade?: boolean;
        }
      | { eventId: string; seatIds: number[]; promoCode?: string },
  ) =>
    request<{
      booking: {
        _id: string;
        BookingID: number;
        TotalAmount: number;
        Status: string;
      };
      ticketCount: number;
      totalAmount: number;
      discountAmount?: number;
      subtotalAmount?: number;
      loyaltyPointsEarned?: number;
      ticketIds: number[];
      seats?: Array<{
        seatId: number;
        label: string;
        section: string;
        row: string;
        seatNumber: number;
      }>;
    }>("/bookings", { method: "POST", body: data }),
  my: () =>
    request<
      Array<{
        _id: string;
        BookingID: number;
        userId: string;
        Date: string;
        TotalAmount: number;
        Status: string;
        ticketIds?: number[];
      }>
    >("/bookings/my"),
  mySummary: () =>
    request<
      Array<{
        _id: string;
        BookingID: number;
        TotalAmount: number;
        Status: string;
        Date: string;
        eventName?: string;
        eventStartDate?: string;
      }>
    >("/bookings/my/summary"),
  get: (id: string) =>
    request<{
      _id: string;
      BookingID: number;
      TotalAmount: number;
      Status: string;
      userId: string;
    }>("/bookings/" + id),
  update: (id: string, data: { Status?: string; TotalAmount?: number }) =>
    request("/bookings/" + id, { method: "PUT", body: data }),
  delete: (id: string) => request("/bookings/" + id, { method: "DELETE" }),
  listDetails: (bookingId: string) =>
    request<
      Array<{
        _id: string;
        BookingID: number;
        TicketID: number;
        PriceAtBooking: number;
      }>
    >("/bookings/" + bookingId + "/details"),
  getDetail: (bookingId: string, detailId: string) =>
    request("/bookings/" + bookingId + "/details/" + detailId),
  updateDetail: (
    bookingId: string,
    detailId: string,
    data: { PriceAtBooking?: number },
  ) =>
    request("/bookings/" + bookingId + "/details/" + detailId, {
      method: "PUT",
      body: data,
    }),
  deleteDetail: (bookingId: string, detailId: string) =>
    request("/bookings/" + bookingId + "/details/" + detailId, {
      method: "DELETE",
    }),
};

export type FeaturedResaleListing = {
  _id: string;
  price: number;
  TicketID?: number;
  EventID?: number;
  status: string;
  originalPurchasePrice?: number | null;
  categoryName?: string | null;
  seatLabel?: string | null;
  savingsPercent?: number;
  interestCount?: number;
  eventId?: { Name?: string; StartDate?: string; EndDate?: string };
  sellerId?: { Username?: string; Email?: string };
};

// Resale
export const resale = {
  featured: (mode: "nearest" | "best") =>
    request<{ listing: FeaturedResaleListing | null; mode: string }>(
      `/resale/listings/featured?mode=${mode}`,
    ),
  listings: () =>
    request<
      Array<{
        _id: string;
        sellerId: { Username?: string; Email?: string };
        eventId: { Name?: string; StartDate?: string };
        price: number;
        status: string;
        TicketID?: number;
        EventID?: number;
      }>
    >("/resale/listings"),
  pendingListings: () =>
    request<
      Array<{
        _id: string;
        sellerId: { Username?: string; Email?: string };
        eventId: { Name?: string; StartDate?: string };
        price: number;
        status: string;
        TicketID?: number;
        EventID?: number;
      }>
    >("/resale/listings/pending"),
  myListings: () =>
    request<
      Array<{
        _id: string;
        eventId?: { Name?: string; StartDate?: string };
        price: number;
        status: string;
      }>
    >("/resale/my-listings"),
  getListing: (id: string) =>
    request<{
      _id: string;
      price: number;
      status: string;
      eventId?: { Name?: string };
      sellerId?: { Username?: string };
    }>("/resale/listings/" + id),
  updateListing: (id: string, data: { price?: number; status?: string }) =>
    request("/resale/listings/" + id, { method: "PUT", body: data }),
  deleteListing: (id: string) =>
    request("/resale/listings/" + id, { method: "DELETE" }),
  approveListing: (id: string) =>
    request("/resale/listings/" + id + "/approve-listing", { method: "POST" }),
  rejectListing: (id: string) =>
    request("/resale/listings/" + id + "/reject-listing", { method: "POST" }),
  eligibleTickets: () =>
    request<
      Array<{
        ticketId: number;
        eventId?: string;
        eventName: string;
        eventStartDate?: string;
        maxResalePrice?: number | null;
        originalPurchasePrice?: number | null;
      }>
    >("/resale/eligible-tickets"),
  list: (data: { ticketId: number; price: number }) =>
    request("/resale/list", { method: "POST", body: data }),
  request: (data: { listingId: string }) =>
    request("/resale/request", { method: "POST", body: data }),
  pendingRequests: () => request("/resale/requests/pending"),
  paymentPendingRequests: () => request("/resale/requests/payment-pending"),
  myRequests: () =>
    request<
      Array<{
        _id: string;
        status: string;
        totalAmount?: number;
        platformFee?: number;
        listingId?: {
          price?: number;
          eventId?: { Name?: string; StartDate?: string };
        };
      }>
    >("/resale/my-requests"),
  getRequest: (requestId: string) => request("/resale/requests/" + requestId),
  getMyRequest: (requestId: string) =>
    request("/resale/requests/my/" + requestId),
  approve: (requestId: string) =>
    request("/resale/requests/" + requestId + "/approve", { method: "POST" }),
  confirmPayment: (requestId: string) =>
    request("/resale/requests/" + requestId + "/confirm-payment", {
      method: "POST",
    }),
  /** Buyer confirms payment and receives the ticket (no admin). */
  completeResalePurchase: (requestId: string) =>
    request<{ message: string; booking?: unknown }>(
      "/resale/requests/" + requestId + "/complete-purchase",
      {
        method: "POST",
      },
    ),
  /** Admin-only: primary purchase + white-market transfer chain for a numeric TicketID. */
  adminTicketTransferHistory: (ticketId: number) =>
    request<{
      ticketId: number;
      eventId: number;
      currentOwner?: { Username?: string; Email?: string; _id?: string };
      primaryPurchase: {
        kind: string;
        bookingId: number;
        purchasedAt: string;
        pricePaid: number;
        owner?: { Username?: string; Email?: string; _id?: string };
      } | null;
      resaleTransfers: Array<{
        ticketId: number;
        eventId: number;
        fromUserId?: { Username?: string; Email?: string; _id?: string };
        toUserId?: { Username?: string; Email?: string; _id?: string };
        ticketPrice: number;
        platformFee: number;
        totalPaidByBuyer: number;
        occurredAt: string;
        resaleRequestId?: string;
      }>;
    }>("/resale/admin/tickets/" + ticketId + "/transfer-history"),
  reject: (requestId: string) =>
    request("/resale/requests/" + requestId + "/reject", { method: "POST" }),
  deleteRequest: (requestId: string) =>
    request("/resale/requests/" + requestId, { method: "DELETE" }),
};

// Tickets
export const tickets = {
  list: (params?: {
    eventID?: number;
    eventId?: string;
    isAvailable?: boolean;
    ticketCatId?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.eventID != null) q.set("eventID", String(params.eventID));
    if (params?.eventId) q.set("eventId", params.eventId);
    if (params?.isAvailable !== undefined)
      q.set("isAvailable", String(params.isAvailable));
    if (params?.ticketCatId != null)
      q.set("ticketCatId", String(params.ticketCatId));
    const query = q.toString();
    return request<
      Array<{
        _id: string;
        TicketID: number;
        EventID: number;
        TicketCatID: number;
        IsAvailable: boolean;
        SeatID?: number | null;
        OwnerUserId?: string | null;
      }>
    >("/tickets" + (query ? "?" + query : ""));
  },
  get: (id: string) =>
    request<{
      _id: string;
      TicketID: number;
      EventID: number;
      TicketCatID: number;
      IsAvailable: boolean;
      SeatID?: number | null;
    }>("/tickets/" + id),
  create: (data: { EventID: number; TicketCatID: number; SeatID?: number }) =>
    request<{
      _id: string;
      TicketID: number;
      EventID: number;
      TicketCatID: number;
      IsAvailable: boolean;
    }>("/tickets", {
      method: "POST",
      body: data,
    }),
  update: (
    id: string,
    data: {
      IsAvailable?: boolean;
      OwnerUserId?: string | null;
      SeatID?: number | null;
    },
  ) => request("/tickets/" + id, { method: "PUT", body: data }),
  delete: (id: string) => request("/tickets/" + id, { method: "DELETE" }),
};

/** Multi-gate time-slot entry (organizer board + attendee assignments). */
export const entry = {
  myAssignments: () =>
    request<
      Array<{
        EventID: number;
        TicketID: number;
        gateIndex: number;
        slotIndex: number;
        windowStart: string;
        windowEnd: string;
        status: string;
        version?: number;
        event?: { Name?: string; StartDate?: string; Status?: string } | null;
        eventMongoId?: string;
        groupTicketIds?: number[];
        linkedTicketIds?: number[];
      }>
    >("/my-assignments"),
  myGatingPending: () =>
    request<{
      pending: Array<{
        eventMongoId: string | null;
        eventName: string;
        eventId: number;
        ticketIds: number[];
        reason: "awaiting_assignment" | "not_configured";
      }>;
    }>("/my-entry-pending"),
  syncMyEntry: (eventMongoId: string) =>
    request<{
      assigned: number;
      groups?: number;
      message?: string;
      ticketIds?: number[];
    }>(`/events/${eventMongoId}/entry/sync-my`, { method: "POST", body: {} }),
  board: (eventMongoId: string) =>
    request<{
      gates: Array<{
        gateIndex: number;
        label?: string;
        jamScore?: number;
        scansLast15m?: number;
      }>;
      slots: Array<{
        slotIndex: number;
        windowStart: string;
        windowEnd: string;
        maxPerGate?: number;
      }>;
      perGate: Record<string, { assigned: number; used: number }>;
      eventId: number;
    }>(`/events/${eventMongoId}/entry/board`),
  auditList: (eventMongoId: string, params?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return request<{
      eventId: number;
      items: Array<{
        _id: string;
        EventID: number;
        actorUserId: string;
        action: string;
        success: boolean;
        reason?: string | null;
        ticketId?: number | null;
        gateIndex?: number | null;
        meta?: Record<string, unknown>;
        createdAt?: string;
        updatedAt?: string;
      }>;
    }>(`/events/${eventMongoId}/entry/audit${s ? `?${s}` : ""}`);
  },
  setup: (
    eventMongoId: string,
    body?: {
      gateCount?: number;
      slotMinutes?: number;
      slotCount?: number;
      hoursBeforeStart?: number;
    },
  ) =>
    request<{ ok: boolean; meta: Record<string, unknown> }>(
      `/events/${eventMongoId}/entry/setup`,
      {
        method: "POST",
        body: body ?? {},
      },
    ),
  assign: (eventMongoId: string, body?: { replaceAll?: boolean }) =>
    request<{
      assigned: number;
      groups?: number;
      message?: string;
      ticketIds?: number[];
    }>(`/events/${eventMongoId}/entry/assign`, {
      method: "POST",
      body: body ?? {},
    }),
  lookupAttendee: (
    eventMongoId: string,
    body: {
      bookingCode?: string;
      ticketId?: number;
      phone?: string;
      firstName?: string;
      lastName?: string;
    },
  ) =>
    request<{
      eventName?: string;
      holders: Array<{
        userId: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        phone?: string;
        email?: string;
        faceEnrolled: boolean;
        tickets: Array<{
          ticketId: number;
          gateIndex: number | null;
          slotIndex: number | null;
          windowStart: string | null;
          windowEnd: string | null;
          status: string;
        }>;
      }>;
    }>(`/events/${eventMongoId}/entry/lookup-attendee`, {
      method: "POST",
      body,
    }),
  linkFriend: (
    eventMongoId: string,
    body: {
      myTicketId: number;
      friendTicketId?: number;
      friendTicketIds?: number[];
    },
  ) =>
    request<{
      ok: boolean;
      message?: string;
      linked?: number[];
      cluster?: number[];
      gateIndex?: number;
      slotIndex?: number;
      windowStart?: string;
      windowEnd?: string;
      realign?: {
        realigned?: number;
        gateIndex?: number;
        slotIndex?: number;
        windowStart?: string;
        windowEnd?: string;
        message?: string;
      };
    }>(
      `/events/${eventMongoId}/entry/link-friend`,
      {
        method: "POST",
        body,
      },
    ),
  regenerate: (eventMongoId: string, body: { ticketId: number }) =>
    request<{
      ok: boolean;
      cluster?: number[];
      gateIndex?: number;
      slotIndex?: number;
      windowStart?: string;
      windowEnd?: string;
      previousGateIndex?: number;
      previousSlotIndex?: number;
      changed?: boolean;
    }>(`/events/${eventMongoId}/entry/regenerate`, { method: "POST", body }),
  organizerRedirect: (
    eventMongoId: string,
    body: {
      ticketIds: number[];
      toGateIndex: number;
      toSlotIndex?: number | null;
    },
  ) =>
    request<{ updated: number }>(
      `/events/${eventMongoId}/entry/organizer-redirect`,
      { method: "POST", body },
    ),
  setJam: (
    eventMongoId: string,
    gateIndex: number,
    body: { jamScore: number },
  ) =>
    request<{ ok: boolean; gateIndex: number; jamScore: number }>(
      `/events/${eventMongoId}/entry/gates/${gateIndex}/jam`,
      { method: "POST", body },
    ),
  verify: (
    eventMongoId: string,
    gateIndex: number,
    body: { ticketId: number; strictFace?: boolean; nationalId?: string },
  ) =>
    request<{
      ok: boolean;
      ticketId: number;
      gateIndex: number;
      usedAt?: string;
      holderNationalIdSuffix?: string;
      alreadyEntered?: boolean;
    }>(`/events/${eventMongoId}/entry/gates/${gateIndex}/verify`, {
      method: "POST",
      body,
    }),
  verifyWithFace: (
    eventMongoId: string,
    gateIndex: number,
    body: { ticketId: number; embedding: number[]; nationalId?: string },
  ) =>
    request<{
      ok: boolean;
      ticketId: number;
      gateIndex: number;
      usedAt?: string;
      faceMatch?: boolean;
      similarity?: number;
      threshold?: number;
      holderNationalIdSuffix?: string;
      alreadyEntered?: boolean;
    }>(`/events/${eventMongoId}/entry/gates/${gateIndex}/verify-with-face`, {
      method: "POST",
      body,
    }),
};

export const notifications = {
  list: (params?: { limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.limit) q.set("limit", String(params.limit));
    const s = q.toString();
    return request<{
      notifications: Array<{
        _id: string;
        type: string;
        title: string;
        body: string;
        read: boolean;
        meta?: Record<string, unknown>;
        createdAt?: string;
      }>;
      unread: number;
    }>(`/notifications${s ? `?${s}` : ""}`);
  },
  markRead: (id: string) =>
    request<{ ok: boolean; unread: number }>(`/notifications/${id}/read`, {
      method: "PATCH",
    }),
  readAll: () =>
    request<{ ok: boolean; unread: number }>(`/notifications/read-all`, {
      method: "POST",
    }),
};

// Reviews (by event)
export const reviews = {
  listByEvent: (eventId: string) =>
    request<
      Array<{
        _id: string;
        userId?: string;
        rating?: number;
        comment?: string;
        createdAt?: string;
      }>
    >(`/events/${eventId}/reviews`),
  get: (eventId: string, reviewId: string) =>
    request(`/events/${eventId}/reviews/${reviewId}`),
  create: (eventId: string, data: { rating: number; comment?: string }) =>
    request(`/events/${eventId}/reviews`, { method: "POST", body: data }),
  update: (
    eventId: string,
    reviewId: string,
    data: { rating?: number; comment?: string },
  ) =>
    request(`/events/${eventId}/reviews/${reviewId}`, {
      method: "PUT",
      body: data,
    }),
  delete: (eventId: string, reviewId: string) =>
    request(`/events/${eventId}/reviews/${reviewId}`, { method: "DELETE" }),
};

// Food & beverage (ticket-gated per event)
export type FoodCartLine = {
  foodItemId: number;
  foodMongoId?: string;
  name: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availability?: boolean;
  stockQuantity?: number;
  preparationTimeMinutes?: number;
  categoryId?: number;
};

export type FoodCartResponse = {
  cart: { _id: string } | null;
  items: FoodCartLine[];
  subtotal: number;
  deliveryMethod?: DeliveryMethod | null;
  totals?: {
    subtotal: number;
    serviceFee: number;
    deliveryFee?: number;
    taxAmount: number;
    totalAmount: number;
    deliveryMethodCode?: string;
    estimatedDeliveryMinutes?: number;
  };
};

export type DeliveryMethod = {
  _id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  estimatedDeliveryMinutes: number;
  tier?: "standard" | "premium" | "express" | "pickup";
  icon?: string;
  sortOrder?: number;
  EventID?: number | null;
};

export type FoodPaymentMethod = "card" | "cod" | "apple_pay" | "google_pay";
export type FoodPaymentBrand =
  | "visa"
  | "mastercard"
  | "amex"
  | "apple_pay"
  | "google_pay"
  | "cod"
  | "other";

export type FoodRestaurant = {
  RestaurantID: number;
  VenueID: number;
  VendorID?: number | null;
  Name: string;
  Description?: string;
  imageUrl?: string;
  categoryType?: string;
  cuisineType?: string;
  ratingAvg?: number;
  ratingCount?: number;
  isFeatured?: boolean;
  active?: boolean;
};

export type FoodMenuItem = {
  FoodItemID: number;
  id: number;
  VenueID?: number | null;
  RestaurantID?: number | null;
  EventID?: number | null;
  CategoryID: number;
  Name: string;
  Description?: string;
  Price: number;
  imageUrl?: string;
  stockQuantity: number;
  stock?: number;
  availability: boolean;
  preparationTimeMinutes: number;
  ratingAvg: number;
  ratingCount: number;
  isPopular?: boolean;
  isFeatured?: boolean;
  isVenueExclusive?: boolean;
  isFavorite?: boolean;
  restaurantName?: string | null;
  restaurantImageUrl?: string | null;
  categoryName?: string | null;
};

export type FoodVenueInfo = {
  VenueID: number;
  Name: string;
  Location?: string;
  Type?: string;
};

export const food = {
  myTicketEvents: () =>
    request<{
      events: Array<{
        _id: string;
        EventID: number;
        Name: string;
        StartDate: string;
        EndDate?: string;
        Status: string;
        VenueID?: number | null;
        imageUrl?: string;
        hasFood: boolean;
        restaurantCount: number;
        itemCount: number;
        restaurants: Array<{
          RestaurantID: number;
          Name: string;
          Description?: string;
          imageUrl?: string;
          itemCount: number;
        }>;
      }>;
    }>("/food/my-events"),
  checkAccess: (eventId: string) =>
    request<{ hasAccess: boolean; message: string | null }>(
      `/food/event/${eventId}/access`,
    ),
  getMenu: (eventId: string, params?: Record<string, string>) => {
    const q = params
      ? `?${new URLSearchParams(params).toString()}`
      : "";
    return request<{
      hasAccess: boolean;
      event: { _id: string; EventID: number; Name: string; VenueID?: number | null };
      venue: FoodVenueInfo | null;
      restaurants: FoodRestaurant[];
      categories: Array<{ CategoryID: number; Name: string }>;
      items: FoodMenuItem[];
      popular: FoodMenuItem[];
      featured: FoodMenuItem[];
      venueExclusive: FoodMenuItem[];
      byCategory: Record<string, FoodMenuItem[]>;
      byRestaurant: Record<
        number,
        { restaurant: FoodRestaurant; items: FoodMenuItem[] }
      >;
      cart: FoodCartResponse;
    }>(`/food/event/${eventId}${q}`);
  },
  venueRestaurants: (venueId: string | number) =>
    request<{ venue: FoodVenueInfo; restaurants: FoodRestaurant[] }>(
      `/venue/${venueId}/restaurants`,
    ),
  venueMenu: (venueId: string | number, params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params).toString()}` : "";
    return request<{
      venue: FoodVenueInfo;
      restaurants: FoodRestaurant[];
      categories: Array<{ CategoryID: number; Name: string }>;
      items: FoodMenuItem[];
      popular: FoodMenuItem[];
      featured: FoodMenuItem[];
      venueExclusive: FoodMenuItem[];
    }>(`/venue/${venueId}/menu${q}`);
  },
  restaurantMenu: (restaurantId: string | number) =>
    request<{
      restaurant: FoodRestaurant;
      categories: Array<{ CategoryID: number; Name: string }>;
      items: FoodMenuItem[];
    }>(`/restaurant/${restaurantId}/menu`),
  getItem: (foodItemId: number | string) =>
    request<{ item: FoodMenuItem; reviews: unknown[] }>(`/food/${foodItemId}`),
  getCart: (eventId: string, deliveryMethod?: string) => {
    const q = new URLSearchParams({ eventId });
    if (deliveryMethod) q.set("deliveryMethod", deliveryMethod);
    return request<FoodCartResponse & { totals: FoodCartResponse["totals"] }>(
      `/food/cart?${q}`,
    );
  },
  addToCart: (body: {
    eventId: string;
    foodItemId: number;
    quantity?: number;
  }) => request<FoodCartResponse>("/food/cart/add", { method: "POST", body }),
  updateCart: (body: {
    eventId: string;
    foodItemId: number;
    quantity: number;
  }) => request<FoodCartResponse>("/food/cart/update", { method: "PUT", body }),
  removeFromCart: (body: { eventId: string; foodItemId: number }) =>
    request<FoodCartResponse>("/food/cart/remove", { method: "DELETE", body }),
  clearCart: (eventId: string) =>
    request<FoodCartResponse>("/food/cart/clear", {
      method: "DELETE",
      body: { eventId },
    }),
  deliveryMethods: (eventId?: string) => {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    return request<{
      methods: DeliveryMethod[];
      seatDelivery?: {
        eventIsSeated: boolean;
        canDeliverToSeat: boolean;
        seatLabel: string | null;
      };
    }>(`/food/delivery-methods${q}`);
  },
  checkout: (body: {
    eventId: string;
    deliveryMethodCode: string;
    paymentMethod: FoodPaymentMethod;
    paymentBrand?: FoodPaymentBrand;
    paymentCardId?: string;
    seatLabel?: string;
    notes?: string;
    idempotencyKey?: string;
  }) =>
    request<{
      order: {
        OrderID: number;
        Status: string;
        totalAmount: number;
        estimatedReadyAt?: string;
      };
      items: unknown[];
      orders?: Array<{
        order: { OrderID: number; Status: string; totalAmount: number };
        items: unknown[];
      }>;
      splitOrders?: boolean;
      totals: FoodCartResponse["totals"];
    }>("/food/checkout", { method: "POST", body }),
  editOrder: (
    orderId: number,
    body: {
      items: Array<{ foodItemId: number; quantity: number }>;
      deliveryMethodCode?: string;
      paymentMethod?: FoodPaymentMethod;
      paymentBrand?: FoodPaymentBrand;
      paymentCardId?: string;
      seatLabel?: string;
      notes?: string;
    },
  ) =>
    request<{
      order: {
        OrderID: number;
        Status: string;
        subtotal: number;
        serviceFee: number;
        deliveryFee?: number;
        taxAmount: number;
        totalAmount: number;
        deliveryMethodCode?: string;
        deliveryMethodName?: string;
        estimatedDeliveryMinutes?: number;
        paymentMethod: string;
        paymentBrand?: string;
        editCount?: number;
        lastEditedAt?: string;
      };
      items: Array<{
        Name: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        FoodItemID: number;
      }>;
      totals: FoodCartResponse["totals"];
    }>(`/food/orders/${orderId}/edit`, { method: "PUT", body }),
  myOrders: (eventId?: string) => {
    const q = eventId ? `?eventId=${encodeURIComponent(eventId)}` : "";
    return request<
      Array<{
        OrderID: number;
        Status: string;
        totalAmount: number;
        eventName?: string;
        eventImage?: string;
        itemCount: number;
        createdAt: string;
        EventID: number;
        eventMongoId?: string;
      }>
    >(`/food/orders/my${q}`);
  },
  getOrder: (orderId: number) =>
    request<{
      order: {
        OrderID: number;
        EventID: number;
        eventMongoId?: string;
        Status: string;
        subtotal: number;
        serviceFee: number;
        deliveryFee?: number;
        taxAmount: number;
        totalAmount: number;
        deliveryMethod: string;
        deliveryMethodCode?: string;
        deliveryMethodName?: string;
        estimatedDeliveryMinutes?: number;
        seatLabel?: string;
        notes?: string;
        paymentMethod: string;
        paymentBrand?: string;
        paymentStatus: string;
        paymentCardId?: string;
        estimatedReadyAt?: string;
        editCount?: number;
        lastEditedAt?: string;
        createdAt: string;
      };
      items: Array<{
        Name: string;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
        FoodItemID: number;
      }>;
      event?: { Name: string; imageUrl?: string };
    }>(`/food/orders/${orderId}`),
  reorder: (orderId: number) =>
    request<FoodCartResponse>(`/food/orders/${orderId}/reorder`, {
      method: "POST",
    }),
  toggleFavorite: (foodItemId: number) =>
    request<{ isFavorite: boolean }>("/food/favorites/toggle", {
      method: "POST",
      body: { foodItemId },
    }),
  addReview: (body: {
    foodItemId: number;
    rating: number;
    comment?: string;
  }) =>
    request<{ message: string }>("/food/reviews", { method: "POST", body }),
};

export const adminFood = {
  listVenues: () =>
    request<{
      venues: Array<VenueListItem & { foodItemCount: number }>;
    }>("/admin/food/venues"),
  getVenueSummary: (venueId: string | number) =>
    request<{
      venue: FoodVenueInfo;
      restaurants: FoodRestaurant[];
      itemCount: number;
      categoryCount: number;
    }>(`/admin/food/venues/${venueId}`),
  createRestaurant: (
    venueId: string | number,
    body: {
      Name: string;
      Description?: string;
      imageUrl?: string;
      categoryType?: string;
      cuisineType?: string;
      VendorID?: number;
      isFeatured?: boolean;
    },
  ) =>
    request<FoodRestaurant>(`/admin/food/venues/${venueId}/restaurants`, {
      method: "POST",
      body,
    }),
  createFoodItem: (
    restaurantId: number,
    body: {
      Name: string;
      Price: number;
      Description?: string;
      imageUrl?: string;
      categoryName?: string;
      CategoryID?: number;
      stockQuantity?: number;
      isPopular?: boolean;
      isVenueExclusive?: boolean;
      isFeatured?: boolean;
    },
  ) =>
    request<FoodMenuItem>(`/admin/food/restaurants/${restaurantId}/items`, {
      method: "POST",
      body,
    }),
  provisionVendor: (body: {
    Name: string;
    Email: string;
    Phone?: string;
    EventID: number;
    restaurantName?: string;
    sendCredentialsEmail?: boolean;
  }) =>
    request<{
      vendor: { VendorID: number; Name: string; EventID: number };
      restaurant: FoodRestaurant;
      credentials: { email: string; username: string; temporaryPassword: string } | null;
      createdNewAccount?: boolean;
      emailSent?: boolean;
      event: { EventID: number; Name: string; VenueID: number };
    }>("/admin/food/vendors/provision", { method: "POST", body }),
  listVendors: () =>
    request<{
      vendors: Array<{
        VendorID: number;
        Name: string;
        Email: string;
        EventID?: number;
        eventName?: string;
      }>;
    }>("/admin/food/vendors"),
};

export type OrganizerVendorRow = {
  VendorID: number;
  Name: string;
  Email: string;
  Phone?: string;
  EventID?: number;
  eventName?: string | null;
  eventStatus?: string | null;
  active: boolean;
  grossRevenue: number;
  orderCount: number;
  activeOrders: number;
  createdAt?: string;
};

export type OrganizerUsherRow = {
  UsherID: number;
  Name: string;
  Email: string;
  Phone: string;
  Age: number | null;
  userId: string;
  assignments: Array<{
    EventID: number;
    eventMongoId: string | null;
    eventName: string | null;
    gateIndexes: number[];
    shifts?: Array<{ gateIndex: number; shiftStart: string | null; shiftEnd: string | null }>;
  }>;
};

export type UsherActivityItem = {
  id: string;
  EventID: number;
  eventName: string | null;
  usherName: string | null;
  usherEmail: string | null;
  action: string;
  success: boolean;
  reason: string | null;
  ticketId: number | null;
  gateIndex: number | null;
  createdAt: string;
};

export const organizerUsher = {
  list: () => request<{ ushers: OrganizerUsherRow[] }>("/organizer/ushers"),
  activity: (params?: { eventId?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.eventId != null) q.set("eventId", String(params.eventId));
    if (params?.limit != null) q.set("limit", String(params.limit));
    const qs = q.toString();
    return request<{ items: UsherActivityItem[] }>(
      `/organizer/ushers/activity${qs ? `?${qs}` : ""}`,
    );
  },
  provision: (body: {
    Name: string;
    Email: string;
    Phone?: string;
    Age?: number;
    sendCredentialsEmail?: boolean;
  }) =>
    request<{
      usher: { UsherID: number; Name: string; Email: string; userId: string };
      credentials: { email: string; username: string; temporaryPassword: string } | null;
      createdNewAccount?: boolean;
      linkedExisting?: boolean;
      emailSent?: boolean;
    }>("/organizer/ushers/provision", { method: "POST", body }),
  bulkProvision: (body: { csv?: string; rows?: unknown[]; sendCredentialsEmail?: boolean }) =>
    request<{ results: Array<{ ok: boolean; email?: string; error?: string }>; created: number; failed: number }>(
      "/organizer/ushers/bulk",
      { method: "POST", body },
    ),
  sendCredentials: (usherUserId: string) =>
    request<{ ok: boolean; credentials: { email: string; username: string; temporaryPassword: string }; emailSent: boolean }>(
      `/organizer/ushers/${encodeURIComponent(usherUserId)}/send-credentials`,
      { method: "POST" },
    ),
  deactivate: (usherUserId: string) =>
    request<{ ok: boolean; usherUserId: string }>(
      `/organizer/ushers/${encodeURIComponent(usherUserId)}`,
      { method: "DELETE" },
    ),
  assignGates: (
    usherUserId: string,
    body: {
      EventID: number;
      gateIndexes?: number[];
      shiftStart?: string;
      shiftEnd?: string;
      gateAssignments?: Array<{ gateIndex: number; shiftStart?: string; shiftEnd?: string }>;
    },
  ) =>
    request<{ ok: boolean; EventID: number; gateIndexes: number[] }>(
      `/organizer/ushers/${encodeURIComponent(usherUserId)}/gates`,
      { method: "PUT", body },
    ),
  eventGates: (eventMongoId: string) =>
    request<{
      EventID: number;
      eventMongoId: string;
      eventName: string;
      entryGatingEnabled: boolean;
      usherManualFallbackEnabled?: boolean;
      usherPinConfigured?: boolean;
      gates: Array<{ gateIndex: number; label: string; jamScore?: number }>;
    }>(`/organizer/ushers/events/${encodeURIComponent(eventMongoId)}/gates`),
  updateEventUsherSettings: (
    eventMongoId: string,
    body: { usherManualFallbackEnabled?: boolean; usherGateOverridePin?: string },
  ) =>
    request<{
      ok: boolean;
      EventID: number;
      usherManualFallbackEnabled: boolean;
      usherPinConfigured: boolean;
    }>(`/organizer/ushers/events/${encodeURIComponent(eventMongoId)}/usher-settings`, {
      method: "PATCH",
      body,
    }),
};

export type EventInvitationRow = {
  _id: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  status: string;
  sentAt?: string;
  emailError?: string;
  openedAt?: string;
  createdAt?: string;
  inviteUrl: string;
};

export const organizerInvitations = {
  list: (eventMongoId: string) =>
    request<{ emailConfigured: boolean; invitations: EventInvitationRow[] }>(
      `/organizer/invitations?eventMongoId=${encodeURIComponent(eventMongoId)}`,
    ),
  send: (body: {
    eventMongoId: string;
    guestName: string;
    guestEmail: string;
    guestPhone?: string;
    sendEmail?: boolean;
  }) =>
    request<{
      invitation: EventInvitationRow;
      emailSent: boolean;
      emailError?: string | null;
    }>("/organizer/invitations", { method: "POST", body }),
  resend: (invitationId: string) =>
    request<{ emailSent: boolean; emailError?: string }>(
      `/organizer/invitations/${encodeURIComponent(invitationId)}/resend`,
      { method: "POST" },
    ),
  remove: (invitationId: string) =>
    request<{ success: boolean }>(`/organizer/invitations/${encodeURIComponent(invitationId)}`, {
      method: "DELETE",
    }),
};

export const usherPortal = {
  assignments: () =>
    request<{
      usher: { Name: string; Email: string };
      mustChangePassword?: boolean;
      assignments: Array<{
        EventID: number;
        eventMongoId: string | null;
        eventName: string;
        gateIndex: number;
        gateLabel: string;
        entryGatingEnabled: boolean;
        manualFallbackEnabled?: boolean;
        shiftStart?: string | null;
        shiftEnd?: string | null;
      }>;
    }>("/usher/assignments"),
  gateBoard: (eventMongoId: string, gateIndex: number) =>
    request<{
      eventName: string;
      eventStatus: string;
      entryGatingEnabled: boolean;
      gateIndex: number;
      gateLabel: string;
      jamScore: number;
      scansLast15m: number;
      shiftStart: string | null;
      shiftEnd: string | null;
      manualFallbackEnabled: boolean;
      myScansToday: number;
      recentActivity: Array<{
        success: boolean;
        ticketId: number | null;
        reason: string | null;
        createdAt: string;
        action: string;
      }>;
    }>(`/usher/events/${eventMongoId}/entry/gates/${gateIndex}/board`),
  lookupAttendee: (
    eventMongoId: string,
    gateIndex: number,
    body: {
      bookingCode?: string;
      ticketId?: number;
      phone?: string;
      firstName?: string;
      lastName?: string;
    },
  ) =>
    request<{
      holders: Array<{
        userId: string;
        firstName?: string;
        lastName?: string;
        username?: string;
        phone?: string;
        email?: string;
        faceEnrolled: boolean;
        tickets: Array<{
          ticketId: number;
          gateIndex: number | null;
          slotIndex: number | null;
          windowStart: string | null;
          windowEnd: string | null;
          status: string;
        }>;
      }>;
      eventName?: string;
      gateIndex: number;
    }>(`/usher/events/${eventMongoId}/entry/gates/${gateIndex}/lookup-attendee`, {
      method: "POST",
      body,
    }),
  verifyWithFace: (
    eventMongoId: string,
    gateIndex: number,
    body: { ticketId: number; embedding: number[] },
  ) =>
    request<{
      ok: boolean;
      ticketId: number;
      gateIndex: number;
      usedAt?: string;
      alreadyEntered?: boolean;
      admitted?: boolean;
      wrongGate?: boolean;
      message?: string;
    }>(`/usher/events/${eventMongoId}/entry/gates/${gateIndex}/verify-with-face`, {
      method: "POST",
      body,
    }),
  verifyManual: (
    eventMongoId: string,
    gateIndex: number,
    body: { ticketId: number; reason: string; pin?: string },
  ) =>
    request<{
      ok: boolean;
      ticketId: number;
      gateIndex: number;
      usedAt?: string;
      alreadyEntered?: boolean;
      admitted?: boolean;
      wrongGate?: boolean;
      message?: string;
      manual?: boolean;
    }>(`/usher/events/${eventMongoId}/entry/gates/${gateIndex}/verify-manual`, {
      method: "POST",
      body,
    }),
};

export const organizerVendor = {
  list: () =>
    request<{ vendors: OrganizerVendorRow[] }>("/organizer/vendors"),
  provision: (body: {
    Name: string;
    Email: string;
    Phone?: string;
    EventID: number;
    restaurantName?: string;
    sendCredentialsEmail?: boolean;
  }) =>
    request<{
      vendor: { VendorID: number; Name: string; EventID: number };
      restaurant: FoodRestaurant;
      credentials: { email: string; username: string; temporaryPassword: string } | null;
      createdNewAccount?: boolean;
      emailSent?: boolean;
      event: { EventID: number; Name: string; VenueID: number };
    }>("/organizer/vendors/provision", { method: "POST", body }),
  summary: (vendorId: number) =>
    request<{
      vendor: OrganizerVendorRow;
      summary: {
        eventId: number | null;
        orderCount: number;
        activeOrders: number;
        itemCount: number;
        grossRevenue: number;
      };
    }>(`/organizer/vendors/${vendorId}/summary`),
};

export type VendorFoodOrder = {
  OrderID: number;
  Status: string;
  deliveryMethodCode?: string;
  deliveryMethodName?: string;
  seatLabel?: string;
  subtotal: number;
  totalAmount: number;
  paymentStatus?: string;
  createdAt?: string;
  vendorSubtotal?: number;
  isSeatDelivery?: boolean;
  isPickup?: boolean;
  isPosOrder?: boolean;
  items?: Array<{
    DetailID: number;
    Name: string;
    quantity: number;
    lineTotal: number;
    RestaurantID?: number;
  }>;
};

export const vendorPortal = {
  me: () =>
    request<{
      vendor: { VendorID: number; Name: string; EventID?: number };
      event: { EventID: number; Name: string } | null;
      events: Array<{ EventID: number; Name: string }>;
      eventIds: number[];
      restaurants: FoodRestaurant[];
    }>("/vendor/me"),
  orders: (params?: { status?: string; eventId?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.eventId != null) q.set("eventId", String(params.eventId));
    const s = q.toString();
    return request<{ orders: VendorFoodOrder[] }>(`/vendor/orders${s ? `?${s}` : ""}`);
  },
  createPosOrder: (body: {
    EventID: number;
    items: Array<{ foodItemId: number; quantity: number }>;
    deliveryMethodCode?: string;
    seatLabel?: string;
    notes?: string;
    customerLabel?: string;
    paymentMethod?: string;
  }) =>
    request<{ order: VendorFoodOrder; items: unknown[] }>("/vendor/orders", {
      method: "POST",
      body,
    }),
  earnings: (eventId?: number) => {
    const q = eventId != null ? `?eventId=${eventId}` : "";
    return request<{
      eventId: number | null;
      orderCount: number;
      activeOrders: number;
      itemCount: number;
      grossRevenue: number;
    }>(`/vendor/earnings${q}`);
  },
  updateOrderStatus: (orderId: number, status: string) =>
    request<{ order: VendorFoodOrder; items: unknown[] }>(
      `/vendor/orders/${orderId}/status`,
      { method: "PATCH", body: { status } },
    ),
  listMenuItems: () =>
    request<{ items: FoodMenuItem[] }>("/vendor/menu/items"),
  createMenuItem: (body: {
    Name: string;
    Price: number;
    EventID?: number;
    Description?: string;
    categoryName?: string;
    stockQuantity?: number;
    availability?: boolean;
  }) =>
    request<FoodMenuItem>("/vendor/menu/items", { method: "POST", body }),
  updateMenuItem: (
    foodItemId: number,
    body: Partial<{
      Name: string;
      Price: number;
      Description: string;
      stockQuantity: number;
      availability: boolean;
    }>,
  ) =>
    request<FoodMenuItem>(`/vendor/menu/items/${foodItemId}`, {
      method: "PUT",
      body,
    }),
};

export type LoyaltySummary = {
  balance: number;
  lifetimePoints: number;
  tierId: string;
  tierName: string;
  earnMultiplier: number;
  earlyAccessHours: number;
  ticketUpgrade: boolean;
  prioritySupport: boolean;
  nextTier: { id: string; name: string; pointsNeeded: number } | null;
  tiers: Array<{
    id: string;
    name: string;
    minLifetime: number;
    earlyAccessHours: number;
    ticketUpgrade: boolean;
    prioritySupport: boolean;
  }>;
  redeemOptions: Array<{
    id: string;
    label: string;
    pointsCost: number;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
    minOrderAmount?: number;
  }>;
  recentTransactions: Array<{
    type: string;
    points: number;
    balanceAfter: number;
    description?: string;
    createdAt: string;
  }>;
  activePromoCodes: Array<{
    code: string;
    discountType: string;
    discountValue: number;
    maxDiscountAmount?: number;
    minOrderAmount?: number;
    expiresAt: string;
  }>;
};

export const loyalty = {
  me: () => request<LoyaltySummary>("/loyalty/me"),
  redeem: (optionId: string) =>
    request<{
      message: string;
      promoCode: string;
      expiresAt: string;
      loyalty: { balance: number; tierId: string };
    }>("/loyalty/redeem", { method: "POST", body: { optionId } }),
  validatePromo: (body: { code: string; eventId: string; subtotal: number }) =>
    request<{
      valid: boolean;
      code: string;
      discountAmount: number;
      totalAfter: number;
    }>("/loyalty/validate-promo", { method: "POST", body }),
  promos: () =>
    request<{
      promoCodes: LoyaltySummary["activePromoCodes"];
    }>("/loyalty/promos"),
};

export { getToken };
