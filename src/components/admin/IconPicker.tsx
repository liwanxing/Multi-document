"use client";

import React, { useState, useMemo } from "react";
import { Popover, Button } from "@arco-design/web-react";
import { ICON_LIST, getIconItem } from "@/lib/iconRegistry";
import { categoryIcons } from "@/components/CategoryIcon";
import { FolderOpen } from "lucide-react";

export interface IconPickerProps {
  value?: string;
  onChange?: (icon: string) => void;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
}

export default function IconPicker({
  value,
  onChange,
  disabled,
  compact = false,
  className,
}: IconPickerProps) {
  const [visible, setVisible] = useState(false);

  const currentItem = useMemo(() => {
    return value ? getIconItem(value) : undefined;
  }, [value]);

  const popoverContent = (
    <div
      className="w-[280px] max-w-[calc(100vw-32px)] text-gray-800 -m-2 bg-white select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 顶部：标题与清除 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 bg-white">
        <span className="font-semibold text-[#1d2129] text-[13px]">
          选择图标
        </span>
        {value && (
          <Button
            type="text"
            size="mini"
            className="text-[11px] h-6 px-1.5"
            onClick={() => {
              onChange?.("");
              setVisible(false);
            }}
          >
            清除图标
          </Button>
        )}
      </div>

      {/* 纯黑白图标 7 列矩阵，只显示图标本身 */}
      <div className="max-h-[280px] overflow-y-auto px-2.5 py-2">
        <div className="grid grid-cols-7 gap-1">
          {ICON_LIST.map((item) => {
            const IconCmp = item.icon;
            const isSelected =
              value === item.id ||
              value === item.name ||
              currentItem?.id === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onChange?.(item.name);
                  setVisible(false);
                }}
                className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors cursor-pointer focus:outline-none ${
                  isSelected
                    ? "bg-gray-900 text-white"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <IconCmp size={18} />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  const CurrentIconCmp = currentItem
    ? currentItem.icon
    : value && categoryIcons[value.toLowerCase()]
      ? categoryIcons[value.toLowerCase()]
      : FolderOpen;

  return (
    <Popover
      trigger="click"
      popupVisible={visible}
      onVisibleChange={setVisible}
      content={popoverContent}
      position="bottom"
      unmountOnExit={false}
    >
      <button
        type="button"
        disabled={disabled}
        title="选择图标"
        className={`${compact ? "w-8 h-8" : "w-9 h-9"} rounded-lg border border-gray-200 bg-white hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center transition-colors cursor-pointer shadow-xs shrink-0 text-gray-700 disabled:text-gray-300 disabled:cursor-not-allowed ${className || ""}`}
      >
        <CurrentIconCmp size={compact ? 16 : 17} />
      </button>
    </Popover>
  );
}
