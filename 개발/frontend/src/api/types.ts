export interface Status {
  code: string;
  name: string;
  color: string;
  sort_order: number;
}

export interface Step {
  id: number;
  code: string;
  name: string;
  color: string;
  entity_type: string;
}

export interface User {
  id: number;
  name: string;
  login: string;
  email: string;
  department: string;
  role: string;
  color: string;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  status: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
}

export interface ProjectStats {
  project_id: number;
  counts: {
    sequences: number;
    shots: number;
    assets: number;
    tasks: number;
    versions: number;
  };
  shot_status: Record<string, number>;
  asset_status: Record<string, number>;
  task_status: Record<string, number>;
}

export interface Sequence {
  id: number;
  project_id: number;
  code: string;
  description: string;
  shot_count: number;
  created_at: string;
}

export interface ActivityEvent {
  id: number;
  project_id: number;
  entity_type: string;
  entity_id: number;
  event_type: string;
  attribute: string | null;
  old_value: string | null;
  new_value: string | null;
  message: string;
  user: { id: number; name: string; color: string } | null;
  created_at: string;
}

// 전역 Inbox 용으로 project/entity 표시명이 enrich 된 활동 이벤트
export interface InboxEvent extends ActivityEvent {
  project: { id: number; code: string; name: string } | null;
  entity_label: string;
}

export interface CustomFieldDef {
  id: number;
  project_id: number;
  entity_type: string;
  field_id: string;
  label: string;
  type: "text" | "number" | "checkbox" | "date" | "user" | "entity";
}

export interface PipelineItem {
  task_id: number;
  step_id: number;
  step_code: string;
  step_name: string;
  step_color: string;
  status: string;
  status_name: string;
  status_color: string;
}

export interface Shot {
  id: number;
  type: "Shot";
  project_id: number;
  sequence_id: number;
  sequence_code: string;
  code: string;
  description: string;
  status: string;
  status_name: string;
  status_color: string;
  cut_in: number;
  cut_out: number;
  cut_duration: number;
  thumbnail: string;
  task_count: number;
  pipeline: PipelineItem[];
  asset_ids: number[];
  custom_fields: Record<string, string | number | boolean>;
  created_at: string;
}

export interface Asset {
  id: number;
  type: "Asset";
  project_id: number;
  code: string;
  asset_type: string;
  description: string;
  status: string;
  status_name: string;
  status_color: string;
  thumbnail: string;
  task_count: number;
  pipeline: PipelineItem[];
  shot_ids: number[];
  custom_fields: Record<string, string | number | boolean>;
  created_at: string;
}

export interface Task {
  id: number;
  type: "Task";
  project_id: number;
  content: string;
  step_id: number;
  step_code: string;
  step_name: string;
  step_color: string;
  status: string;
  status_name: string;
  status_color: string;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  start_date: string | null;
  due_date: string | null;
  assignees: User[];
  created_at: string;
}

export interface Version {
  id: number;
  type: "Version";
  project_id: number;
  code: string;
  description: string;
  task_id: number | null;
  entity_type: string;
  entity_id: number;
  entity_name: string;
  user: User | null;
  thumbnail: string;
  media_url: string;
  frame_count: number;
  version_number: number;
  status: string;
  status_name: string;
  status_color: string;
  note_count: number;
  created_at: string;
}

export interface Note {
  id: number;
  project_id: number;
  subject: string | null;
  body: string;
  user: User | null;
  link_entity_type: string;
  link_entity_id: number;
  parent_id: number | null;
  created_at: string;
}

export interface Playlist {
  id: number;
  project_id: number;
  code: string;
  description: string;
  version_count: number;
  versions: Version[];
  created_at: string;
}
