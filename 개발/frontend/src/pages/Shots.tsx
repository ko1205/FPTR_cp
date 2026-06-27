import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import {
  useShots, useUpdateStatus, useUpdateField, useSteps,
  useSequences, useStatuses, useCreateEntity, useDeleteEntity,
} from "../api/hooks";
import { StatusSelect } from "../components/StatusSelect";
import { thumbStyle } from "../util/thumb";
import { PipelineStrip, pipelineWidth } from "../components/PipelineStrip";
import { EntityGrid, type GridColumn, type GroupOption, type AddField } from "../components/EntityGrid";
import type { Shot } from "../api/types";

export function Shots() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const { data: shots, isLoading } = useShots(projectId);
  const { data: allSteps } = useSteps();
  const { data: sequences } = useSequences(projectId);
  const { data: statuses } = useStatuses();
  const updateStatus = useUpdateStatus("shots");
  const patchShot = useUpdateField("shots");
  const createShot = useCreateEntity("shots");
  const deleteShot = useDeleteEntity("shots");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  // 표준 Shot 파이프라인 스텝 순서 (step 정렬용)
  const shotSteps = useMemo(
    () => (allSteps ?? []).filter((s) => s.entity_type === "Shot").sort((a, b) => a.id - b.id),
    [allSteps]
  );

  const addFields: AddField[] = [
    { key: "code", label: "Shot Code", type: "text", required: true },
    { key: "sequence_id", label: "Sequence", type: "select", options: (sequences ?? []).map((s) => ({ value: String(s.id), label: s.code })) },
    { key: "status", label: "Status", type: "select", default: "wtg", options: (statuses ?? []).map((s) => ({ value: s.code, label: s.name })) },
    { key: "description", label: "Description", type: "text" },
    { key: "cut_in", label: "Cut In", type: "number" },
    { key: "cut_out", label: "Cut Out", type: "number" },
  ];

  if (projectId == null)
    return <div className="page empty">Select a project first.</div>;

  const columns: GridColumn<Shot>[] = [
    {
      key: "status",
      label: "Status",
      className: "col-status",
      width: 120,
      sortAccessor: (s) => s.status_name,
      filterAccessor: (s) => s.status_name,
      filterType: "select",
      render: (s) => (
        <StatusSelect
          variant="cell"
          status={s.status}
          statusName={s.status_name}
          statusColor={s.status_color}
          onChange={(status) => updateStatus.mutate({ id: s.id, status })}
        />
      ),
    },
    {
      key: "thumb",
      label: "Thumbnail",
      className: "col-thumb",
      width: 70,
      render: (s, w) => {
        const iw = Math.max(40, w - 12);
        return (
          <div
            className="grid-thumb clickable"
            style={{ width: iw, height: Math.round((iw * 9) / 16), ...thumbStyle(s.thumbnail) }}
            title="썸네일 클릭 → Versions/Review"
            onClick={(e) => { stop(e); navigate(`/detail/Shot/${s.id}?tab=versions`); }}
          />
        );
      },
    },
    {
      key: "code",
      label: "Shot Code",
      width: 150,
      sortAccessor: (s) => s.code,
      filterAccessor: (s) => s.code,
      filterType: "text",
      render: (s) => (
        <a
          className="entity-link mono"
          onClick={(e) => { stop(e); navigate(`/detail/Shot/${s.id}`); }}
        >
          {s.code}
        </a>
      ),
    },
    { key: "seq", label: "Sequence", width: 110, sortAccessor: (s) => s.sequence_code ?? "", filterAccessor: (s) => s.sequence_code ?? "", filterType: "select", render: (s) => <span className="col-link">{s.sequence_code ?? "—"}</span> },
    {
      key: "desc",
      label: "Description",
      width: 260,
      sortAccessor: (s) => s.description ?? "",
      filterAccessor: (s) => s.description ?? "",
      filterType: "text",
      render: (s) => <span className="muted">{s.description}</span>,
      edit: { get: (s) => s.description ?? "", save: (s, v) => patchShot.mutate({ id: s.id, data: { description: v } }), multiline: true },
    },
    {
      key: "pipeline",
      label: "Pipeline",
      width: pipelineWidth(shotSteps.length),
      render: (s) => <PipelineStrip pipeline={s.pipeline} steps={shotSteps} />,
    },
    { key: "cin", label: "Cut In", className: "num", width: 80, sortAccessor: (s) => s.cut_in ?? 0, render: (s) => <span className="mono">{s.cut_in}</span> },
    { key: "cout", label: "Cut Out", className: "num", width: 80, sortAccessor: (s) => s.cut_out ?? 0, render: (s) => <span className="mono">{s.cut_out}</span> },
    { key: "dur", label: "Cut Dur", className: "num", width: 80, sortAccessor: (s) => s.cut_duration ?? 0, render: (s) => <span className="mono">{s.cut_duration}</span> },
  ];

  const groupOptions: GroupOption<Shot>[] = [
    {
      key: "sequence",
      label: "Sequence",
      accessor: (s) => ({ key: String(s.sequence_id ?? 0), label: s.sequence_code ?? "(none)" }),
    },
    {
      key: "status",
      label: "Status",
      accessor: (s) => ({ key: s.status, label: s.status_name, color: s.status_color }),
    },
  ];

  return (
    <div className="page split">
      <div className="grid-wrap">
        <EntityGrid
          entityKey="shots"
          entityType="Shot"
          projectId={projectId}
          entityLabel="Shot"
          rows={shots}
          loading={isLoading}
          rowKey={(s) => s.id}
          columns={columns}
          groupOptions={groupOptions}
          defaultGroup="sequence"
          getCustomFields={(s) => s.custom_fields}
          selectedKey={selectedId}
          onSelect={(s) => setSelectedId(s.id)}
          onOpen={(s) => navigate(`/detail/Shot/${s.id}`)}
          addFields={addFields}
          primaryField="code"
          onCreate={(v) => createShot.mutateAsync({ project_id: projectId, ...v })}
          onDelete={(id) => deleteShot.mutateAsync(id)}
          renderCard={(s) => ({
            thumbnail: s.thumbnail,
            code: s.code,
            statusColor: s.status_color,
            statusName: s.status_name,
            pipeline: <PipelineStrip pipeline={s.pipeline} steps={shotSteps} size="sm" />,
          })}
        />
      </div>
    </div>
  );
}
