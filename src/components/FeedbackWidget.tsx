"use client";

import React, { useState, useEffect } from "react";
import {
  BackTop,
  Modal,
  Form,
  Radio,
  Input,
  Button,
  Message,
  Tooltip,
} from "@arco-design/web-react";
import {
  IconMessage,
  IconToTop,
  IconClose,
  IconCheck,
  IconBulb,
} from "@arco-design/web-react/icon";

const feedbackTypes = [
  "内容有误/错别字",
  "代码示例报错",
  "说明不够清晰",
  "缺少想要的内容",
  "格式排版问题",
];

export default function FeedbackWidget() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackType, setFeedbackType] = useState(feedbackTypes[0]);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Selection popup states
  const [selectedText, setSelectedText] = useState("");
  const [selectionPopupPos, setSelectionPopupPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [tipDismissed, setTipDismissed] = useState(false);

  // Text selection listener for "划词反馈"
  useEffect(() => {
    const handleMouseUp = () => {
      try {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;
        const text = selection.toString().trim();
        if (text && text.length > 3 && !showFeedbackModal) {
          const range = selection.getRangeAt(0);
          const rect = range?.getBoundingClientRect();
          if (rect && rect.width > 0) {
            setSelectedText(text);
            setSelectionPopupPos({
              x: rect.left + rect.width / 2,
              y: rect.top + window.scrollY - 10,
            });
          }
        }
      } catch {
        // Suppress DOM selection error
      }
    };

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [showFeedbackModal]);

  const handleSubmit = () => {
    if (!feedbackText.trim()) {
      Message.warning("请填写详细描述后提交");
      return;
    }

    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setShowFeedbackModal(false);
      setFeedbackText("");
      setSelectedText("");
      setSelectionPopupPos(null);
      Message.success("感谢您的宝贵建议，运营团队已收到反馈。");
    }, 600);
  };

  return (
    <>
      {/* 1. Selection Tooltip (划词浮动气泡) */}
      {selectionPopupPos && selectedText && !showFeedbackModal && (
        <div
          style={{
            left: `${selectionPopupPos.x}px`,
            top: `${selectionPopupPos.y}px`,
          }}
          className="fixed -translate-x-1/2 -translate-y-full z-50 bg-gray-900 text-white text-xs px-3 py-1.5 rounded-md shadow-xl flex items-center gap-2 cursor-pointer hover:bg-black"
          onClick={() => {
            setShowFeedbackModal(true);
            setSelectionPopupPos(null);
          }}
        >
          <IconBulb className="text-blue-400" />
          <span>针对选中内容反馈问题</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setSelectionPopupPos(null);
            }}
            className="ml-1 text-gray-400 hover:text-white"
          >
            <IconClose />
          </button>
        </div>
      )}

      {/* 2. Floating Buttons at Bottom Right */}
      <div className="fixed right-6 bottom-8 z-40 flex flex-col items-center gap-2">
        {/* Floating tooltip preview */}
        {!tipDismissed && (
          <div className="hidden lg:flex items-center gap-2 bg-white border border-blue-100 shadow-lg px-3 py-2 rounded-lg text-xs text-gray-600 mb-1 max-w-[200px] relative">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <div>
              <div className="font-medium text-gray-800">鼠标选中内容</div>
              <div className="text-[11px] text-gray-500">可快速反馈问题</div>
            </div>
            <button
              type="button"
              onClick={() => setTipDismissed(true)}
              className="text-gray-400 hover:text-gray-600 ml-auto"
            >
              <IconClose />
            </button>
          </div>
        )}

        {/* Feedback Button */}
        <Tooltip content="文档意见反馈" position="left">
          <Button
            type="primary"
            shape="circle"
            size="large"
            className="shadow-lg hover:shadow-xl"
            icon={<IconMessage style={{ fontSize: 18 }} />}
            onClick={() => setShowFeedbackModal(true)}
            aria-label="文档反馈"
          />
        </Tooltip>

        {/* BackTop (Arco Official Component) */}
        <BackTop
          visibleHeight={300}
          style={{ position: "static" }}
        >
          <Tooltip content="回到顶部" position="left">
            <Button
              shape="circle"
              size="large"
              className="shadow-md text-gray-600 border border-gray-200"
              icon={<IconToTop style={{ fontSize: 18 }} />}
              aria-label="回到顶部"
            />
          </Tooltip>
        </BackTop>
      </div>

      {/* 3. Feedback Modal (Arco Official Modal + Form) */}
      <Modal
        title={
          <div className="flex items-center gap-2 font-semibold">
            <IconMessage className="text-blue-600" />
            <span>文档意见反馈</span>
          </div>
        }
        visible={showFeedbackModal}
        onCancel={() => setShowFeedbackModal(false)}
        onOk={handleSubmit}
        okText="提交反馈"
        cancelText="取消"
        okButtonProps={{ disabled: !feedbackText.trim() }}
        confirmLoading={submitting}
        unmountOnExit
        className="workspace-arco-modal"
        style={{ width: 480, maxWidth: "calc(100vw - 32px)" }}
      >
        <Form layout="vertical">
          {selectedText && (
            <Form.Item label="关联段落内容">
              <div className="p-3 bg-gray-50 rounded-md border-l-2 border-blue-500 text-xs text-gray-600">
                <p className="line-clamp-2 m-0 italic text-gray-500">
                  &ldquo;{selectedText}&rdquo;
                </p>
              </div>
            </Form.Item>
          )}

          <Form.Item label="反馈类型" required>
            <Radio.Group
              type="button"
              value={feedbackType}
              onChange={setFeedbackType}
              options={feedbackTypes}
              size="small"
            />
          </Form.Item>

          <Form.Item label="详细描述" required>
            <Input.TextArea
              rows={4}
              maxLength={500}
              showWordLimit
              value={feedbackText}
              onChange={setFeedbackText}
              placeholder="请详细描述您遇到的问题或改进建议，帮助运营同学快速排查..."
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
