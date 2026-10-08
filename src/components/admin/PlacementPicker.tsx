"use client";

import { useState, useEffect } from "react";
import { Button, Select, Tag, Grid } from "@arco-design/web-react";
import { IconPlus, IconLink } from "@arco-design/web-react/icon";
import type { DocPlacement, Project } from "@/lib/dataStore";
import {
  categoryOptions,
  placementKey,
  placementLabel,
} from "@/lib/projectModel";

export default function PlacementPicker({
  projects,
  value,
  onChange,
  disabled = false,
}: {
  projects: Project[];
  value: DocPlacement[];
  onChange: (value: DocPlacement[]) => void;
  disabled?: boolean;
}) {
  const firstProject = projects[0];
  const firstProduct = firstProject?.products?.[0];

  // Primary placement values (from value[0] if present)
  const currentPrimary = value[0];
  const primaryProjectId = currentPrimary?.projectId || firstProject?.id || "";
  const primaryProject = projects.find((p) => p.id === primaryProjectId);
  const primaryProductId =
    currentPrimary?.productId || primaryProject?.products?.[0]?.id || "";
  const primaryProduct =
    primaryProject?.products?.find((p) => p.id === primaryProductId) || null;
  const primaryCategoryId = currentPrimary?.categoryId || "";

  // Multi-directory expansion state
  const [showAddExtra, setShowAddExtra] = useState(false);
  const [extraProjectId, setExtraProjectId] = useState(firstProject?.id || "");
  const extraProject = projects.find((p) => p.id === extraProjectId);
  const [extraProductId, setExtraProductId] = useState(
    extraProject?.products?.[0]?.id || "",
  );
  const extraProduct =
    extraProject?.products?.find((p) => p.id === extraProductId) || null;
  const [extraCategoryId, setExtraCategoryId] = useState("");

  // Ensure value has at least 1 default placement if empty and projects exist
  useEffect(() => {
    if (value.length === 0 && firstProject && firstProduct) {
      onChange([
        {
          projectId: firstProject.id,
          productId: firstProduct.id,
          categoryId: null,
        },
      ]);
    }
  }, [value.length, firstProject, firstProduct, onChange]);

  // Synchronize primary placement updates
  const updatePrimary = (
    newProjId: string,
    newProdId: string,
    newCatId: string,
  ) => {
    const primary: DocPlacement = {
      projectId: newProjId,
      productId: newProdId,
      categoryId: newCatId || null,
    };
    // Keep extra placements that don't collide with the new primary
    const extras = value
      .slice(1)
      .filter((p) => placementKey(p) !== placementKey(primary));
    onChange([primary, ...extras]);
  };

  const handlePrimaryProjectChange = (id: string) => {
    const nextProj = projects.find((p) => p.id === id);
    const nextProd = nextProj?.products?.[0]?.id || "";
    updatePrimary(id, nextProd, "");
  };

  const handlePrimaryProductChange = (prodId: string) => {
    updatePrimary(primaryProjectId, prodId, "");
  };

  const handlePrimaryCategoryChange = (catId: string) => {
    updatePrimary(primaryProjectId, primaryProductId, catId);
  };

  // Additional placements (indices 1..n)
  const extraPlacements = value.slice(1);

  const extraCandidate: DocPlacement = {
    projectId: extraProjectId,
    productId: extraProductId,
    categoryId: extraCategoryId || null,
  };

  const isExtraDuplicate = value.some(
    (p) => placementKey(p) === placementKey(extraCandidate),
  );

  const handleAddExtra = () => {
    if (!extraProduct || isExtraDuplicate) return;
    onChange([...value, extraCandidate]);
    setShowAddExtra(false);
    setExtraCategoryId("");
  };

  const handleRemovePlacement = (targetKey: string) => {
    if (disabled || value.length <= 1) return;
    const next = value.filter((p) => placementKey(p) !== targetKey);
    onChange(next);
  };

  return (
    <div className="placement-picker arco-placement">
      {/* 3 Selects in a balanced grid */}
      <Grid.Row gutter={12}>
        <Grid.Col span={8}>
          <div className="text-xs text-gray-500 mb-1.5 font-medium">项目</div>
          <Select
            aria-label="绑定项目"
            disabled={disabled}
            showSearch
            value={primaryProjectId || undefined}
            placeholder="选择项目"
            getPopupContainer={() => document.body}
            triggerProps={{ autoAlignPopupWidth: true }}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
            onChange={handlePrimaryProjectChange}
          />
        </Grid.Col>

        <Grid.Col span={8}>
          <div className="text-xs text-gray-500 mb-1.5 font-medium">产品</div>
          <Select
            aria-label="绑定产品"
            disabled={disabled || !primaryProject?.products?.length}
            showSearch
            value={primaryProductId || undefined}
            placeholder="选择产品"
            getPopupContainer={() => document.body}
            triggerProps={{ autoAlignPopupWidth: true }}
            options={
              primaryProject?.products?.map((p) => ({
                value: p.id,
                label: p.name,
              })) || []
            }
            onChange={handlePrimaryProductChange}
          />
        </Grid.Col>

        <Grid.Col span={8}>
          <div className="text-xs text-gray-500 mb-1.5 font-medium">文档分类</div>
          <Select
            aria-label="绑定分类"
            disabled={disabled || !primaryProduct}
            value={primaryCategoryId}
            getPopupContainer={() => document.body}
            triggerProps={{ autoAlignPopupWidth: true }}
            options={[
              { value: "", label: "未分类" },
              ...(primaryProduct
                ? categoryOptions(primaryProduct.categories).map((c) => ({
                    value: c.id,
                    label: "　".repeat(c.depth) + c.name,
                  }))
                : []),
            ]}
            onChange={handlePrimaryCategoryChange}
          />
        </Grid.Col>
      </Grid.Row>

      {/* Shared Placements list if multiple placements exist */}
      {extraPlacements.length > 0 && (
        <div className="mt-3 p-2.5 bg-gray-50 rounded-md border border-gray-200/70">
          <div className="text-xs text-gray-500 mb-2 font-medium flex items-center justify-between">
            <span>同时关联到其他目录 ({extraPlacements.length})</span>
            <span className="text-gray-400 text-xs">跨产品共享发布</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {extraPlacements.map((p) => {
              const key = placementKey(p);
              return (
                <Tag
                  key={key}
                  color="arcoblue"
                  closable={!disabled}
                  onClose={() => handleRemovePlacement(key)}
                  icon={<IconLink />}
                  className="py-0.5 px-2 text-xs"
                >
                  {placementLabel(projects, p)}
                </Tag>
              );
            })}
          </div>
        </div>
      )}

      {/* Action / Helper bar */}
      <div className="mt-2.5 flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {!primaryProject?.products?.length ? (
            <span className="text-red-500">
              当前项目暂无产品，请先在项目管理中创建产品。
            </span>
          ) : (
            <span>文档将归属于上述选中的项目与产品分类</span>
          )}
        </div>

        {!showAddExtra && primaryProduct && (
          <Button
            type="text"
            size="small"
            icon={<IconPlus />}
            disabled={disabled}
            className="text-blue-600 hover:text-blue-700"
            onClick={() => setShowAddExtra(true)}
          >
            添加更多目录
          </Button>
        )}
      </div>

      {/* Expandable Extra Placement Picker */}
      {showAddExtra && (
        <div className="mt-3 p-3 bg-blue-50/40 rounded-lg border border-blue-100">
          <div className="text-xs font-medium text-blue-900 mb-2.5 flex items-center justify-between">
            <span>选择额外关联的目录</span>
            <Button
              type="text"
              size="mini"
              className="text-gray-500"
              onClick={() => setShowAddExtra(false)}
            >
              取消
            </Button>
          </div>
          <Grid.Row gutter={10}>
            <Grid.Col span={8}>
              <div className="text-xs text-gray-500 mb-1">项目</div>
              <Select
                aria-label="额外绑定项目"
                size="small"
                value={extraProjectId || undefined}
                getPopupContainer={() => document.body}
                triggerProps={{ autoAlignPopupWidth: true }}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                onChange={(id) => {
                  setExtraProjectId(id);
                  const p = projects.find((proj) => proj.id === id);
                  setExtraProductId(p?.products?.[0]?.id || "");
                  setExtraCategoryId("");
                }}
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <div className="text-xs text-gray-500 mb-1">产品</div>
              <Select
                aria-label="额外绑定产品"
                size="small"
                disabled={!extraProject?.products?.length}
                value={extraProductId || undefined}
                getPopupContainer={() => document.body}
                triggerProps={{ autoAlignPopupWidth: true }}
                options={
                  extraProject?.products?.map((p) => ({
                    value: p.id,
                    label: p.name,
                  })) || []
                }
                onChange={(prodId) => {
                  setExtraProductId(prodId);
                  setExtraCategoryId("");
                }}
              />
            </Grid.Col>
            <Grid.Col span={8}>
              <div className="text-xs text-gray-500 mb-1">分类</div>
              <Select
                aria-label="额外绑定分类"
                size="small"
                disabled={!extraProduct}
                value={extraCategoryId}
                getPopupContainer={() => document.body}
                triggerProps={{ autoAlignPopupWidth: true }}
                options={[
                  { value: "", label: "未分类" },
                  ...(extraProduct
                    ? categoryOptions(extraProduct.categories).map((c) => ({
                        value: c.id,
                        label: "　".repeat(c.depth) + c.name,
                      }))
                    : []),
                ]}
                onChange={setExtraCategoryId}
              />
            </Grid.Col>
          </Grid.Row>
          <div className="flex justify-end mt-2.5">
            <Button
              type="primary"
              size="small"
              icon={<IconPlus />}
              disabled={!extraProduct || isExtraDuplicate}
              onClick={handleAddExtra}
            >
              {isExtraDuplicate ? "已在目录列表中" : "确认添加关联"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
