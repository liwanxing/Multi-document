"use client";

import React, { useState } from "react";
import { Popover, Tooltip } from "@arco-design/web-react";
import { ICON_LIST, getIconItem, type IconItem } from "@/lib/iconRegistry";
import { Sparkles } from "lucide-react";

export interface CustomIconSelectorProps {
  value: string;
  onChange: (iconId: string) => void;
  disabled?: boolean;
}

/** 紧凑图标选择器：触发器只显示当前图标，弹窗为纯图标网格（无搜索/分类）。 */
export default function CustomIconSelector({
  value,
  onChange,
  disabled,
}: CustomIconSelectorProps) {
  const [popoverVisible, setPopoverVisible] = useState(false);
  const CurrentIcon = getIconItem(value)?.icon || Sparkles;

  return (
    <Popover
      trigger="click"
      popupVisible={popoverVisible}
      onVisibleChange={setPopoverVisible}
      position="bottom"
      content={
        <div
          className="w-[276px] p-2 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-h-[246px] overflow-y-auto grid grid-cols-7 gap-1.5">
            {ICON_LIST.map((item: IconItem) => {
              const ItemIcon = item.icon;
              const isSelected = item.id === value;
              return (
                <Tooltip key={item.id} content={item.name}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(item.id);
                      setPopoverVisible(false);
                    }}
                    className={`w-8 h-8 rounded flex items-center justify-center transition cursor-pointer ${
                      isSelected
                        ? "bg-blue-100 text-[#165dff] ring-2 ring-[#165dff]"
                        : "hover:bg-gray-100 text-gray-700 hover:scale-105"
                    }`}
                  >
                    <ItemIcon size={17} />
                  </button>
                </Tooltip>
              );
            })}
          </div>
        </div>
      }
    >
      <button
        type="button"
        disabled={disabled}
        title="选择图标"
        aria-label="选择图标"
        className="w-10 h-10 rounded-md bg-gray-50 border border-gray-200 hover:border-blue-400 flex items-center justify-center text-[#165dff] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        <CurrentIcon size={20} />
      </button>
    </Popover>
  );
}
