import { useState } from "react";
import { RecordCard } from "../../components/RecordCard";
import { StatusBadge } from "../../components/StatusBadge";
import { Phase0JudgementCard } from "./Phase0JudgementCard";
import { createPhase0Judgement } from "./phase0-heuristics";
import { Phase0JudgementEditor } from "./Phase0JudgementEditor";
import type { Phase0MessyRecord, Phase0JudgementDraft } from "./phase0-types";

type JudgementDrafts = Record<string, Phase0JudgementDraft>;

const defaultDrafts: JudgementDrafts = {
  "M-001": {
    messyRecordId: "M-001",
    possibleKind: "task_candidate",
    confidence: "low",
    evidence: ["原文提到『需要十幾個人清泥』", "涉及人力資源調度"],
    blockers: [
      "地址模糊（『老雜貨店後面』不是明確座標）",
      "未知道具體地點是否安全可進入",
      "未確認這十幾個人是真實需求還是估計",
    ],
    suggestedNextStep: "ask_for_more_info",
    unsafeToActDirectly: true,
    humanReviewNote: "需要詢問更精確的地點與確認人力需求量",
  },
  "M-002": {
    messyRecordId: "M-002",
    possibleKind: "site_status_candidate",
    confidence: "low",
    evidence: [
      "報告溪畔活動中心有雨鞋庫存",
      "時間點：早上（2026-07-20 09:25）",
    ],
    blockers: [
      "資訊已過時（『早上』，不知下午狀態）",
      "時間敏感：距現在可能已 5+ 小時",
      "庫存數量未知",
    ],
    suggestedNextStep: "do_not_use_yet",
    unsafeToActDirectly: true,
    humanReviewNote: "應改用 M-010 的 14:35 最新盤點資訊",
  },
  "M-003": {
    messyRecordId: "M-003",
    possibleKind: "site_status_candidate",
    confidence: "medium",
    evidence: ["現場回報水電需求變化", "『比較需要水電』顯示優先順序轉換"],
    blockers: ["『原本那張單可能沒更新』暗示資訊可能不完整或過時"],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: false,
    humanReviewNote: "這是對前期資訊的修正，需要與舊清單對比確認變化",
  },
  "M-006": {
    messyRecordId: "M-006",
    possibleKind: "unknown",
    confidence: "low",
    evidence: [
      "兩筆現場回報存在直接矛盾：『可以當集合點』vs『淹水不適合停留』",
    ],
    blockers: [
      "資訊衝突無法統一判斷",
      "不知道哪筆是更新的狀態",
      "不知道『淹水不適合』是完全封閉還是暫時積水",
    ],
    suggestedNextStep: "ask_for_more_info",
    unsafeToActDirectly: true,
    humanReviewNote: "需要現場確認學校側門目前狀態，並釐清兩筆回報的時間順序",
  },
  "M-009": {
    messyRecordId: "M-009",
    possibleKind: "announcement_candidate",
    confidence: "medium",
    evidence: [
      "詳細的時間戳：14:20",
      "來自現場志工的直接回報",
      "清楚的服務限制聲明（只接受已完成報到的志工）",
      "已知公告張貼位置（站前遮雨棚）",
    ],
    blockers: [
      "『尚未看到官方公告同步更新』表示官方通道可能滯後",
      "這是點狀資訊（14:20 的狀態），下一刻可能改變",
    ],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: false,
    humanReviewNote:
      "品質較高的現場回報，適合成為地點狀態更新，但需要留意『尚未同步』的問題",
  },
  "M-010": {
    messyRecordId: "M-010",
    possibleKind: "site_status_candidate",
    confidence: "high",
    evidence: [
      "非常詳細的盤點清單：雨鞋數量（12 雙）、尺寸（26-28）",
      "明確的收集狀態：飲用水不缺、不再收二手衣物、水電需求改到其他服務台",
      "清楚的時間戳與下一次盤點計畫（16:30）",
      "來自值守志工的官方確認",
    ],
    blockers: ["資訊時點：14:35，距下一次盤點還有 1.5+ 小時，期間可能有變化"],
    suggestedNextStep: "create_site_update_suggestion",
    unsafeToActDirectly: false,
    humanReviewNote: "Phase 0 中品質最高的地點狀態資訊，適合成為標準格式",
  },
};

export function Phase0Workbench({
  records,
  selectedRecordId,
  onSelect,
}: {
  records: Phase0MessyRecord[];
  selectedRecordId: string;
  onSelect: (recordId: string) => void;
}) {
  const [drafts, setDrafts] = useState<JudgementDrafts>(defaultDrafts);
  const selectedRecord =
    records.find((record) => record.id === selectedRecordId) ?? records[0];
  const userDraft = drafts[selectedRecord.id];
  const safetyBoundary = userDraft ?? createPhase0Judgement(selectedRecord);

  const handleSaveDraft = (updated: Phase0JudgementDraft) => {
    setDrafts((prev) => ({
      ...prev,
      [selectedRecord.id]: updated,
    }));
  };

  const handleDeleteDraft = () => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[selectedRecord.id];
      return next;
    });
  };

  const handleResetDraft = () => {
    if (defaultDrafts[selectedRecord.id]) {
      setDrafts((prev) => ({
        ...prev,
        [selectedRecord.id]: defaultDrafts[selectedRecord.id],
      }));
    } else {
      handleDeleteDraft();
    }
  };

  const draftCount = Object.keys(drafts).length;

  return (
    <div className="workbench">
      <div className="workbench__intro">
        <p className="eyebrow">整理工作台</p>
        <h2>第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。</h2>
        <p>
          Starter 已建立 {draftCount}{" "}
          筆整理草稿，包括候選類型、信心程度、判斷依據與卡住的地方。你可以編輯、刪除或重設每筆草稿。
        </p>
      </div>

      <div className="workbench__layout">
        <aside className="workbench__queue" aria-label="選擇原始資訊">
          {records.map((record) => {
            const hasDraft = !!drafts[record.id];
            return (
              <button
                className={`${record.id === selectedRecord.id ? "active" : ""} ${hasDraft ? "has-draft" : ""}`}
                key={record.id}
                type="button"
                onClick={() => onSelect(record.id)}
              >
                <span>{record.id}</span>
                <StatusBadge status={record.verificationStatus} />
                {hasDraft && <span className="draft-indicator">✎</span>}
              </button>
            );
          })}
        </aside>

        <div className="workbench__main">
          <RecordCard record={selectedRecord} />

          {userDraft ? (
            <Phase0JudgementEditor
              judgement={userDraft}
              record={selectedRecord}
              onSave={handleSaveDraft}
              onDelete={handleDeleteDraft}
              onReset={handleResetDraft}
            />
          ) : (
            <Phase0JudgementCard
              judgement={safetyBoundary}
              record={selectedRecord}
            />
          )}
        </div>

        <aside className="workbench__checklist">
          <h3>第一階段完成檢查</h3>
          <ul>
            <li>✓ Starter 已載入 {records.length} 筆原始資訊</li>
            <li
              className={draftCount >= 6 ? "done" : ""}
              title={`已完成 ${draftCount}/6`}
            >
              ✓ 整理草稿：{draftCount}/6
            </li>
            <li>✓ 可建立、編輯、刪除或重設整理草稿</li>
            <li title="至少應質疑或修正 agent 的 2 個判斷">
              至少 2 個判斷由人類質疑或修正（須記入 humanReviewNote）
            </li>
            <li title="應標示為：needs_review、unverified、do_not_use_yet 等">
              至少 3 筆不能直接變成任務
            </li>
            <li>把資料品質問題寫進 observations</li>
            <li>記錄 agent 判斷與人類修正進 ai-log</li>
          </ul>
        </aside>
      </div>
    </div>
  );
}
