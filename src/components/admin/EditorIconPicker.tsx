"use client";

import React, { useState } from "react";
import {
  Popover,
  Button,
  Message,
  Tooltip,
} from "@arco-design/web-react";
import { ICON_LIST, type IconItem } from "@/lib/iconRegistry";
import { Sparkles } from "lucide-react";

export interface EditorIconPickerProps {
  onInsert: (command: string) => void;
  disabled?: boolean;
}

export default function EditorIconPicker({
  onInsert,
  disabled,
}: EditorIconPickerProps) {
  const [visible, setVisible] = useState(false);

  const handleSelectIcon = (item: IconItem) => {
    const command = `[icon:${item.id}]`;

    try {
      onInsert(command);
    } catch (err) {
      console.error("Failed to insert icon command:", err);
    }
    Message.success({
      content: `已插入: ${command}`,
      duration: 1500,
    });
    setVisible(false);
  };

  const popoverContent = (
    <div
      className="w-[308px] text-gray-800 bg-white select-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-1.5 font-semibold text-[#1d2129] text-[13px] whitespace-nowrap shrink-0">
          <Sparkles className="w-4 h-4 text-[#1d2129] shrink-0" />
          <span>内置图标库</span>
          <span className="text-[11px] font-normal text-[#86909c]">
            ({ICON_LIST.length}款)
          </span>
        </div>
        <span className="text-[10px] text-[#4e5969] bg-[#f2f3f5] px-1.5 py-0.5 rounded font-mono font-medium whitespace-nowrap shrink-0">
          [icon:id]
        </span>
      </div>

      {/* 2. Pure Icon Matrix (7 columns, pure icons without text) */}
      <div className="max-h-[280px] overflow-y-auto px-2.5 py-2.5">
        <div className="grid grid-cols-7 gap-1.5">
          {ICON_LIST.map((item) => {
            const IconCmp = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelectIcon(item);
                }}
                title={`${item.name} (${item.id})`}
                className="w-9 h-9 rounded-md flex items-center justify-center transition-all cursor-pointer hover:bg-[#f2f3f5] text-[#1d2129] hover:text-black hover:scale-110 focus:outline-none text-[18px]"
              >
                <IconCmp size={18} style={{ width: 18, height: 18, fontSize: 18 }} />
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Footer Info Bar */}
      <div className="px-3.5 py-2 border-t border-[#f2f3f5] bg-[#fafafa] flex items-center justify-between text-[11px] text-[#86909c]">
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="text-[#ff7d00]">💡</span>
          <span>点击直接插入光标处</span>
        </span>
        <span className="text-[#86909c] text-[11px] whitespace-nowrap">
          支持实时预览
        </span>
      </div>
    </div>
  );

  return (
    <Tooltip
      mini
      className="editor-icon-tooltip"
      content="插入图标指令 (50+ 内置图标实时预览)"
      disabled={visible}
    >
      <span className="editor-tool-tip-target inline-flex items-center">
        <Popover
          trigger="click"
          popupVisible={visible}
          onVisibleChange={(v) => setVisible(v)}
          content={popoverContent}
          position="bottom"
          className="workspace-icon-picker-popover"
          unmountOnExit={false}
        >
          <Button
            type="text"
            className="icon-button"
            aria-label="插入图标指令"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              setVisible((prev) => !prev);
            }}
          >
            <Sparkles size={16} className="text-[#1d2129]" />
          </Button>
        </Popover>
      </span>
    </Tooltip>
  );
}
