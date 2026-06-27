import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api, qs } from "./client";
import type {
  Status,
  Step,
  User,
  Project,
  ProjectStats,
  Sequence,
  Shot,
  Asset,
  Task,
  Version,
  Note,
  Playlist,
  CustomFieldDef,
  ActivityEvent,
  InboxEvent,
} from "./types";

// ---- Reference data ----
export const useStatuses = () =>
  useQuery({
    queryKey: ["statuses"],
    queryFn: () => api.get<Status[]>("/statuses"),
    staleTime: Infinity,
  });

export const useSteps = () =>
  useQuery({
    queryKey: ["steps"],
    queryFn: () => api.get<Step[]>("/steps"),
    staleTime: Infinity,
  });

export const useUsers = () =>
  useQuery({
    queryKey: ["users"],
    queryFn: () => api.get<User[]>("/users"),
    staleTime: Infinity,
  });

// ---- Projects ----
export const useProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => api.get<Project[]>("/projects"),
  });

export const useProjectStats = (projectId: number | null) =>
  useQuery({
    queryKey: ["projectStats", projectId],
    queryFn: () => api.get<ProjectStats>(`/projects/${projectId}/stats`),
    enabled: projectId != null,
  });

export const useSequences = (projectId: number | null) =>
  useQuery({
    queryKey: ["sequences", projectId],
    queryFn: () => api.get<Sequence[]>(`/sequences${qs({ project_id: projectId })}`),
    enabled: projectId != null,
  });

// ---- Shots ----
export const useShots = (projectId: number | null, sort?: string) =>
  useQuery({
    queryKey: ["shots", projectId, sort],
    queryFn: () => api.get<Shot[]>(`/shots${qs({ project_id: projectId, sort })}`),
    enabled: projectId != null,
  });

export const useShot = (id: number | null) =>
  useQuery({
    queryKey: ["shot", id],
    queryFn: () => api.get<Shot>(`/shots/${id}`),
    enabled: id != null,
  });

// ---- Assets ----
export const useAssets = (projectId: number | null) =>
  useQuery({
    queryKey: ["assets", projectId],
    queryFn: () => api.get<Asset[]>(`/assets${qs({ project_id: projectId })}`),
    enabled: projectId != null,
  });

export const useAsset = (id: number | null) =>
  useQuery({
    queryKey: ["asset", id],
    queryFn: () => api.get<Asset>(`/assets/${id}`),
    enabled: id != null,
  });

// ---- Tasks ----
export const useTasks = (params: {
  project_id?: number | null;
  entity_type?: string;
  entity_id?: number;
}) =>
  useQuery({
    queryKey: ["tasks", params],
    queryFn: () => api.get<Task[]>(`/tasks${qs(params)}`),
    enabled: params.project_id != null || params.entity_id != null,
  });

export const useMyTasks = (userId: number | null) =>
  useQuery({
    queryKey: ["myTasks", userId],
    queryFn: () => api.get<Task[]>(`/tasks/my${qs({ user_id: userId })}`),
    enabled: userId != null,
  });

// ---- Versions ----
export const useVersions = (params: {
  project_id?: number | null;
  entity_type?: string;
  entity_id?: number;
  task_id?: number;
}) =>
  useQuery({
    queryKey: ["versions", params],
    queryFn: () => api.get<Version[]>(`/versions${qs(params)}`),
    enabled: params.project_id != null || params.entity_id != null,
  });

// ---- Notes ----
export const useNotes = (linkEntityType: string, linkEntityId: number | null) =>
  useQuery({
    queryKey: ["notes", linkEntityType, linkEntityId],
    queryFn: () =>
      api.get<Note[]>(
        `/notes${qs({ link_entity_type: linkEntityType, link_entity_id: linkEntityId })}`
      ),
    enabled: linkEntityId != null,
  });

// ---- Activity ----
export const useEntityActivity = (entityType: string, entityId: number | null) =>
  useQuery({
    queryKey: ["activity", entityType, entityId],
    queryFn: () => api.get<ActivityEvent[]>(`/activity/entity/${entityType}/${entityId}`),
    enabled: entityId != null,
  });

export const useProjectActivity = (projectId: number | null, limit = 50) =>
  useQuery({
    queryKey: ["activityProj", projectId, limit],
    queryFn: () => api.get<ActivityEvent[]>(`/activity${qs({ project_id: projectId, limit })}`),
    enabled: projectId != null,
  });

// 전역 Inbox: 전 프로젝트 활동 피드 (project/entity 표시명 enrich)
export const useGlobalActivity = (limit = 100) =>
  useQuery({
    queryKey: ["activityGlobal", limit],
    queryFn: () => api.get<InboxEvent[]>(`/activity/global${qs({ limit })}`),
  });

// ---- Playlists ----
export const usePlaylists = (projectId: number | null) =>
  useQuery({
    queryKey: ["playlists", projectId],
    queryFn: () => api.get<Playlist[]>(`/playlists${qs({ project_id: projectId })}`),
    enabled: projectId != null,
  });

// ---- Mutations ----
export function useUpdateStatus(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      api.patch(`/${entity}/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shots"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["myTasks"] });
      qc.invalidateQueries({ queryKey: ["versions"] });
      qc.invalidateQueries({ queryKey: ["projectStats"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
      qc.invalidateQueries({ queryKey: ["activityProj"] });
    },
  });
}

// ---- Custom Fields (정의 = DB, 값 = 엔티티 custom_fields) ----
export const useCustomFieldDefs = (projectId: number | null, entityType: string) =>
  useQuery({
    queryKey: ["customFieldDefs", projectId, entityType],
    queryFn: () =>
      api.get<CustomFieldDef[]>(
        `/custom_fields${qs({ project_id: projectId, entity_type: entityType })}`
      ),
    enabled: projectId != null,
  });

export function useCreateCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      project_id: number;
      entity_type: string;
      label: string;
      type: string;
    }) => api.post<CustomFieldDef>("/custom_fields", body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customFieldDefs"] }),
  });
}

export function useDeleteCustomField() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (defId: number) => api.del(`/custom_fields/${defId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customFieldDefs"] }),
  });
}

/** 엔티티의 custom_fields 값 병합 업데이트 */
export function useUpdateCustomValue(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: number; fields: Record<string, unknown> }) =>
      api.patch(`/${entity}/${id}`, { custom_fields: fields }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shots"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

/** 엔티티 임의 필드 PATCH (예: description 인라인 편집) */
export function useUpdateField(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      api.patch(`/${entity}/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shots"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
    },
  });
}

/** 엔티티 생성 (POST /{entity}) */
export function useCreateEntity(entity: string) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["shots"] });
    qc.invalidateQueries({ queryKey: ["assets"] });
    qc.invalidateQueries({ queryKey: ["versions"] });
    qc.invalidateQueries({ queryKey: ["projectStats"] });
  };
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => api.post(`/${entity}`, body),
    onSuccess: invalidate,
  });
}

/** 엔티티 삭제 (DELETE /{entity}/{id}) */
export function useDeleteEntity(entity: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.del(`/${entity}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["shots"] });
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["versions"] });
      qc.invalidateQueries({ queryKey: ["projectStats"] });
    },
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      project_id: number;
      body: string;
      user_id: number;
      link_entity_type: string;
      link_entity_id: number;
      parent_id?: number | null;
    }) => api.post<Note>("/notes", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notes"] });
      qc.invalidateQueries({ queryKey: ["versions"] });
      qc.invalidateQueries({ queryKey: ["activity"] });
    },
  });
}
