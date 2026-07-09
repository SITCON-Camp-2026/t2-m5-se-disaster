import { useState } from "react";
import type { Phase0JudgementDraft, Phase0MessyRecord } from "./phase0-types";

const kindOptions: Array<{
  value: Phase0JudgementDraft["possibleKind"];
  label: string;
}> = [
  { value: "unknown", label: "候選類型待判斷" },
  { value: "help_request_candidate", label: "求助候選" },
  { value: "site_status_candidate", label: "地點狀態候選" },
  { value: "task_candidate", label: "任務候選" },
  { value: "assignment_candidate", label: "人員指派候選" },
  { value: "announcement_candidate", label: "公告候選" },
];

const confidenceOptions: Array<{
  value: Phase0JudgementDraft["confidence"];
  label: string;
}> = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const nextStepOptions: Array<{
  value: Phase0JudgementDraft["suggestedNextStep"];
  label: string;
}> = [
  { value: "keep_raw", label: "先保留原始資訊" },
  { value: "ask_for_more_info", label: "補問來源或現場資訊" },
  { value: "send_to_human_review", label: "交給人工確認" },
  { value: "create_candidate_report", label: "建立候選通報" },
  { value: "create_site_update_suggestion", label: "建立地點更新建議" },
  { value: "do_not_use_yet", label: "暫時不要使用" },
];

export function Phase0JudgementEditor({
  judgement,
  record,
  onSave,
  onDelete,
  onReset,
}: {
  judgement: Phase0JudgementDraft;
  record: Phase0MessyRecord;
  onSave: (updated: Phase0JudgementDraft) => void;
  onDelete: () => void;
  onReset: () => void;
}) {
  const [kind, setKind] = useState(judgement.possibleKind);
  const [confidence, setConfidence] = useState(judgement.confidence);
  const [nextStep, setNextStep] = useState(judgement.suggestedNextStep);
  const [evidence, setEvidence] = useState(judgement.evidence.join("\n"));
  const [blockers, setBlockers] = useState(judgement.blockers.join("\n"));
  const [humanNote, setHumanNote] = useState(judgement.humanReviewNote ?? "");
  const [unsafeToAct, setUnsafeToAct] = useState(judgement.unsafeToActDirectly);

  const handleSave = () => {
    const updated: Phase0JudgementDraft = {
      messyRecordId: judgement.messyRecordId,
      possibleKind: kind,
      confidence,
      evidence: evidence
        .split("\n")
        .map((e) => e.trim())
        .filter((e) => e.length > 0),
      blockers: blockers
        .split("\n")
        .map((b) => b.trim())
        .filter((b) => b.length > 0),
      suggestedNextStep: nextStep,
      unsafeToActDirectly: unsafeToAct,
      humanReviewNote: humanNote.trim() || undefined,
    };
    onSave(updated);
  };

  return (
    <article className="judgement-editor">
      <div className="judgement-editor__header">
        <h3>編輯 {record.id} 的整理草稿</h3>
      </div>

      <form className="judgement-editor__form">
        <fieldset>
          <legend>基本判斷</legend>
          <div className="form-group">
            <label htmlFor={`kind-${record.id}`}>候選類型</label>
            <select
              id={`kind-${record.id}`}
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as Phase0JudgementDraft["possibleKind"])
              }
            >
              {kindOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor={`confidence-${record.id}`}>信心程度</label>
            <select
              id={`confidence-${record.id}`}
              value={confidence}
              onChange={(e) =>
                setConfidence(
                  e.target.value as Phase0JudgementDraft["confidence"],
                )
              }
            >
              {confidenceOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor={`next-step-${record.id}`}>下一步行動</label>
            <select
              id={`next-step-${record.id}`}
              value={nextStep}
              onChange={(e) =>
                setNextStep(
                  e.target.value as Phase0JudgementDraft["suggestedNextStep"],
                )
              }
            >
              {nextStepOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor={`unsafe-${record.id}`}>
              <input
                id={`unsafe-${record.id}`}
                type="checkbox"
                checked={unsafeToAct}
                onChange={(e) => setUnsafeToAct(e.target.checked)}
              />
              不可直接行動
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>分析細節</legend>
          <div className="form-group">
            <label htmlFor={`evidence-${record.id}`}>
              判斷依據（每行一項）
            </label>
            <textarea
              id={`evidence-${record.id}`}
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={4}
              placeholder="例：原文提到…&#10;數據顯示…"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`blockers-${record.id}`}>
              卡住的地方（每行一項）
            </label>
            <textarea
              id={`blockers-${record.id}`}
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              rows={4}
              placeholder="例：地址不清楚…&#10;時間敏感…"
            />
          </div>

          <div className="form-group">
            <label htmlFor={`note-${record.id}`}>人工審查備註</label>
            <textarea
              id={`note-${record.id}`}
              value={humanNote}
              onChange={(e) => setHumanNote(e.target.value)}
              rows={3}
              placeholder="記錄質疑、修正或後續判斷"
            />
          </div>
        </fieldset>

        <div className="judgement-editor__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={handleSave}
          >
            保存草稿
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={onReset}
          >
            重設為預設
          </button>
          <button type="button" className="btn btn--danger" onClick={onDelete}>
            刪除草稿
          </button>
        </div>
      </form>
    </article>
  );
}
