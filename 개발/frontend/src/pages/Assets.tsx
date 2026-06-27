import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProject } from "../context/ProjectContext";
import {
  useAssets, useUpdateStatus, useUpdateField, useSteps,
  useStatuses, useCreateEntity, useDeleteEntity,
  useBulkCreate, useBulkDelete,
} from "../api/hooks";
import { StatusSelect } from "../components/StatusSelect";
import { thumbStyle } from "../util/thumb";
import { PipelineStrip, pipelineWidth } from "../components/PipelineStrip";
import { EntityGrid, type GridColumn, type GroupOption, type AddField } from "../components/EntityGrid";
import type { Asset } from "../api/types";

export function Assets() {
  const { projectId } = useProject();
  const navigate = useNavigate();
  const { data: assets, isLoading } = useAssets(projectId);
  const { data: allSteps } = useSteps();
  const { data: statuses } = useStatuses();
  const updateStatus = useUpdateStatus("assets");
  const patchAsset = useUpdateField("assets");
  const createAsset = useCreateEntity("assets");
  const deleteAsset = useDeleteEntity("assets");
  const bulkCreateAsset = useBulkCreate("assets");
  const bulkDeleteAsset = useBulkDelete("assets");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  const assetSteps = useMemo(
    () => (allSteps ?? []).filter((s) => s.entity_type === "Asset").sort((a, b) => a.id - b.id),
    [allSteps]
  );

  const addFields: AddField[] = [
    { key: "code", label: "Asset Name", type: "text", required: true },
    { key: "asset_type", label: "Type", type: "select", required: true, default: "Character",
      options: ["Character", "Prop", "Environment", "Vehicle", "FX"].map((t) => ({ value: t, label: t })) },
    { key: "status", label: "Status", type: "select", default: "wtg", options: (statuses ?? []).map((s) => ({ value: s.code, label: s.name })) },
    { key: "description", label: "Description", type: "text" },
  ];

  if (projectId == null)
    return <div className="page empty">Select a project first.</div>;

  const columns: GridColumn<Asset>[] = [
    {
      key: "status",
      label: "Status",
      className: "col-status",
      width: 120,
      sortAccessor: (a) => a.status_name,
      filterAccessor: (a) => a.status_name,
      filterType: "select",
      render: (a) => (
        <StatusSelect
          variant="cell"
          status={a.status}
          statusName={a.status_name}
          statusColor={a.status_color}
          onChange={(status) => updateStatus.mutate({ id: a.id, status })}
        />
      ),
    },
    {
      key: "thumb",
      label: "Thumbnail",
      className: "col-thumb",
      width: 70,
      render: (a, w) => {
        const iw = Math.max(40, w - 12);
        return (
          <div
            className="grid-thumb clickable"
            style={{ width: iw, height: Math.round((iw * 9) / 16), ...thumbStyle(a.thumbnail) }}
            title="썸네일 클릭 → Versions/Review"
            onClick={(e) => { stop(e); navigate(`/detail/Asset/${a.id}?tab=versions`); }}
          />
        );
      },
    },
    {
      key: "code",
      label: "Asset Name",
      width: 150,
      sortAccessor: (a) => a.code,
      filterAccessor: (a) => a.code,
      filterType: "text",
      render: (a) => (
        <a
          className="entity-link mono"
          onClick={(e) => { stop(e); navigate(`/detail/Asset/${a.id}`); }}
        >
          {a.code}
        </a>
      ),
    },
    { key: "type", label: "Type", width: 120, sortAccessor: (a) => a.asset_type, filterAccessor: (a) => a.asset_type, filterType: "select", render: (a) => a.asset_type },
    {
      key: "desc",
      label: "Description",
      width: 260,
      sortAccessor: (a) => a.description ?? "",
      filterAccessor: (a) => a.description ?? "",
      filterType: "text",
      render: (a) => <span className="muted">{a.description}</span>,
      edit: { get: (a) => a.description ?? "", save: (a, v) => patchAsset.mutate({ id: a.id, data: { description: v } }), multiline: true },
    },
    {
      key: "pipeline",
      label: "Pipeline",
      width: pipelineWidth(assetSteps.length),
      render: (a) => <PipelineStrip pipeline={a.pipeline} steps={assetSteps} />,
    },
  ];

  const groupOptions: GroupOption<Asset>[] = [
    {
      key: "type",
      label: "Asset Type",
      accessor: (a) => ({ key: a.asset_type, label: a.asset_type }),
    },
    {
      key: "status",
      label: "Status",
      accessor: (a) => ({ key: a.status, label: a.status_name, color: a.status_color }),
    },
  ];

  return (
    <div className="page split">
      <div className="grid-wrap">
        <EntityGrid
          entityKey="assets"
          entityType="Asset"
          projectId={projectId}
          entityLabel="Asset"
          rows={assets}
          loading={isLoading}
          rowKey={(a) => a.id}
          columns={columns}
          groupOptions={groupOptions}
          defaultGroup="type"
          getCustomFields={(a) => a.custom_fields}
          selectedKey={selectedId}
          onSelect={(a) => setSelectedId(a.id)}
          onOpen={(a) => navigate(`/detail/Asset/${a.id}`)}
          addFields={addFields}
          primaryField="code"
          onCreate={(v) => createAsset.mutateAsync({ project_id: projectId, ...v })}
          onDelete={(id) => deleteAsset.mutateAsync(id)}
          onBulkCreate={(items) => bulkCreateAsset.mutateAsync(items.map((v) => ({ project_id: projectId, ...v })))}
          onBulkDelete={(ids) => bulkDeleteAsset.mutateAsync(ids)}
          renderCard={(a) => ({
            thumbnail: a.thumbnail,
            code: a.code,
            statusColor: a.status_color,
            statusName: a.status_name,
            pipeline: <PipelineStrip pipeline={a.pipeline} steps={assetSteps} size="sm" />,
          })}
        />
      </div>
    </div>
  );
}
