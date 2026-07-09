import { useEffect, useState, type CSSProperties } from "react";
import { SourceLabel } from "../../components/SourceLabel";
import { StatusBadge } from "../../components/StatusBadge";
import messyReports from "../../fixtures/phase-0/messy-reports.json";
import type { Phase0MessyRecord } from "../phase-0/phase0-types";

const practiceRecords = (messyReports as Phase0MessyRecord[]).slice(0, 10);

const flowSteps = [
  {
    id: "01",
    title: "原始資訊進入",
    detail: "資訊整理者先閱讀原文、資訊取得方式和目前查核狀態。",
  },
  {
    id: "02",
    title: "檢查是否足夠理解",
    detail:
      "若缺少時間、地點、來源、數量、當事人確認或重要脈絡，先標示為需要人工確認。",
  },
  {
    id: "03",
    title: "檢查衝突與高風險",
    detail:
      "若涉及個資、安全風險、地點不明、來源衝突或 AI 猜測，不能直接處理。",
  },
  {
    id: "04",
    title: "只建立候選資料",
    detail: "資訊足夠整理時，也只能成為候選資料，不能顯示成已確認事實。",
  },
  {
    id: "05",
    title: "留下人工判斷紀錄",
    detail: "每次採用、拒絕或修正 AI 建議，都要留下理由和仍不確定的地方。",
  },
];

const reviewPoints = [
  "原始資訊是否缺少時間、地點、來源、數量或重要脈絡。",
  "資訊取得方式和原文內容是否互相矛盾。",
  "AI 整理出的候選資料是否有補原文沒有說的內容。",
  "這筆資訊能不能整理成候選資料，還是只能保留為待確認線索。",
];

const blockedBranches = [
  "不能讓 AI 自動判斷一筆資訊是真的或假的。",
  "不能讓 AI 自動決定救災、派工或行動優先順序。",
  "不能把來源不同、時間不同的資訊自動合併成同一個現況。",
  "不能把含糊地點、二手轉述、可能有個資或安全風險的內容直接變成任務。",
];

const logItems = [
  "誰把一筆資訊標成需要人工確認。",
  "誰決定一筆資訊不能直接處理。",
  "誰建立候選資料，以及候選資料根據哪一段原文。",
  "AI 建議被採用或拒絕的理由。",
  "目前仍不確定、需要下一位協作者確認的問題。",
];

const openQuestions = [
  "候選資料要整理到多詳細，才不會讓資訊整理者負擔太重。",
  "「不能直接處理」和「需要人工確認」在畫面上要不要分成兩種很明顯的標籤。",
  "下一位協作者看到候選資料時，會不會誤以為它已經可以行動。",
];

const exampleChecks = [
  {
    label: "資料是否足夠理解",
    result: "不足",
    detail: "原文只有「老雜貨店後面」，不能當成明確地點。",
  },
  {
    label: "是否有高風險",
    result: "有",
    detail: "看起來像人力需求，但地點與安全狀態不清楚。",
  },
  {
    label: "能不能直接變成任務",
    result: "不能",
    detail: "需要先補問精確地點、現場安全狀態和需求是否仍存在。",
  },
];

type PracticeChoice = "missing" | "risk" | "candidate";

const practiceChoices: Array<{
  key: PracticeChoice;
  label: string;
  result: string;
  detail: string;
  stepId: string;
  nextStep: string;
}> = [
  {
    key: "missing",
    label: "資料缺少關鍵資訊",
    result: "需要人工確認",
    detail:
      "這筆資訊缺少明確地點與現場安全狀態，下一步應該先補問，而不是直接建立任務。",
    stepId: "02",
    nextStep: "補問精確地點、回報時間與現場安全狀態。",
  },
  {
    key: "risk",
    label: "看起來有行動風險",
    result: "不能直接變成任務",
    detail: "雖然原文提到需要人力，但地點模糊，不能讓志工依這段文字直接前往。",
    stepId: "03",
    nextStep: "先擋下行動用途，交由人工確認是否仍有需求。",
  },
  {
    key: "candidate",
    label: "先整理成候選資料",
    result: "候選資料，尚未確認",
    detail:
      "可以保留「可能需要清泥人力」這個線索，但畫面必須清楚標示尚未確認。",
    stepId: "04",
    nextStep: "只建立候選線索，附上原文依據與缺漏提醒。",
  },
];

const baseRiskByChoice: Record<PracticeChoice, number> = {
  missing: 30,
  risk: 45,
  candidate: 22,
};

const riskSignals: Array<{
  label: string;
  pattern: RegExp;
  weight: number;
}> = [
  {
    label: "原文出現不知道、未確認或沒有說清楚",
    pattern: /不知道|不確定|可能|疑似|未確認|尚未|沒有說|沒說/,
    weight: 14,
  },
  {
    label: "有時間敏感或可能過期的描述",
    pattern: /早上|下午|昨天|今天|剛剛|中午|下次|預計|目前|現在/,
    weight: 8,
  },
  {
    label: "看起來會影響志工行動",
    pattern: /直接|過去|前往|派人|任務|志工|人力|支援|集合點|清泥|清淤/,
    weight: 10,
  },
  {
    label: "有轉折、衝突或不同來源說法",
    pattern: /但|另一位|留言有人說|原本|同步|衝突|不適合|沒更新/,
    weight: 12,
  },
  {
    label: "地點描述仍然模糊",
    pattern: /那邊|附近|後面|某|A 區|老街口|側門|往.*方向|第二排/,
    weight: 10,
  },
  {
    label: "可能涉及個資、當事人同意或第三方轉述",
    pattern: /長者|地址|電話|家屬|親友|同意|代.*轉述|不方便/,
    weight: 14,
  },
  {
    label: "數量或資源狀態需要再確認",
    pattern: /約|十幾|很多|數量|剩|缺|不缺|不再收|尺寸/,
    weight: 6,
  },
];

const mazeTemplates = [
  [
    "#################",
    "#.......#.......#",
    "#.###.#.#.#.###.#",
    "#...#.#...#...#.#",
    "#.#.#.###.#.#.#.#",
    "#.#...#.!...#...#",
    "#.###.#.###.#.###",
    "#.....#...#.....#",
    "#.###.#.#.#.###.#",
    "#.......!...#...#",
    "#################",
  ],
  [
    "#################",
    "#.....#.........#",
    "#.###.#.#####.#.#",
    "#...#...#...#.#.#",
    "###.#####.#.#.#.#",
    "#...#...!.#...#.#",
    "#.#.#.#####.###.#",
    "#.#...#.....#...#",
    "#.#####.###.#.#.#",
    "#.......#.!...#.#",
    "#################",
  ],
  [
    "#################",
    "#.........#.....#",
    "#.#######.#.###.#",
    "#.#.....#...#...#",
    "#.#.###.#####.#.#",
    "#...#...!...#.#.#",
    "###.#.#####.#.#.#",
    "#...#.....#.#...#",
    "#.#######.#.###.#",
    "#.....!...#.....#",
    "#################",
  ],
];

const mazeStart = { row: 1, col: 1 };

function mazeKey(row: number, col: number) {
  return `${row}-${col}`;
}

function createMazePellets(rows: string[]) {
  const pellets = new Set<string>();
  rows.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (
        cell === "." &&
        !(rowIndex === mazeStart.row && colIndex === mazeStart.col)
      ) {
        pellets.add(mazeKey(rowIndex, colIndex));
      }
    });
  });
  return pellets;
}

function createMazeHazards(rows: string[]) {
  const hazards = new Set<string>();
  rows.forEach((row, rowIndex) => {
    [...row].forEach((cell, colIndex) => {
      if (cell === "!") {
        hazards.add(mazeKey(rowIndex, colIndex));
      }
    });
  });
  return hazards;
}

function pickRandomMazeRows(currentRows?: string[]) {
  const candidates = currentRows
    ? mazeTemplates.filter((template) => template !== currentRows)
    : mazeTemplates;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

const initialMazeRows = mazeTemplates[0];

function calculateRisk(record: Phase0MessyRecord, choice: PracticeChoice) {
  const matchedSignals = riskSignals.filter((signal) =>
    signal.pattern.test(record.rawText),
  );
  const statusRisk = record.verificationStatus === "verified" ? 0 : 12;
  const score = Math.min(
    98,
    baseRiskByChoice[choice] +
      statusRisk +
      matchedSignals.reduce((sum, signal) => sum + signal.weight, 0),
  );
  const factors = [
    record.verificationStatus === "verified"
      ? "查核狀態較完整，但仍需確認是否適合此流程"
      : "目前不是已確認資訊",
    ...matchedSignals.map((signal) => signal.label),
  ];

  return { score, factors };
}

function ListCard({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone?: "warning" | "danger";
}) {
  return (
    <section className={`v1-card ${tone ? `v1-card--${tone}` : ""}`}>
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

export function V1FlowPage() {
  const [selectedRecordId, setSelectedRecordId] = useState(
    practiceRecords[0]?.id ?? "",
  );
  const [practiceChoice, setPracticeChoice] =
    useState<PracticeChoice>("missing");
  const [mazeRows, setMazeRows] = useState(initialMazeRows);
  const [mazePlayer, setMazePlayer] = useState(mazeStart);
  const [mazePellets, setMazePellets] = useState(() =>
    createMazePellets(initialMazeRows),
  );
  const [mazeHits, setMazeHits] = useState(0);
  const selectedRecord =
    practiceRecords.find((record) => record.id === selectedRecordId) ??
    practiceRecords[0];
  const selectedPractice = practiceChoices.find(
    (choice) => choice.key === practiceChoice,
  )!;
  const riskAnalysis = calculateRisk(selectedRecord, practiceChoice);
  const mazeHazards = createMazeHazards(mazeRows);
  const totalMazePellets = createMazePellets(mazeRows).size;
  const calmScore = totalMazePellets - mazePellets.size;
  const mazeCleared = mazePellets.size === 0;
  const mazeColumnCount = mazeRows[0].length;
  const mazeRowCount = mazeRows.length;
  const mazePlayerStyle = {
    left: `${((mazePlayer.col + 0.5) / mazeColumnCount) * 100}%`,
    top: `${((mazePlayer.row + 0.5) / mazeRowCount) * 100}%`,
    width: `${82 / mazeColumnCount}%`,
  } satisfies CSSProperties;

  function selectBuiltInRecord(recordId: string) {
    setSelectedRecordId(recordId);
  }

  function moveMazePlayer(rowDelta: number, colDelta: number) {
    setMazePlayer((current) => {
      const next = {
        row: current.row + rowDelta,
        col: current.col + colDelta,
      };

      if (mazeRows[next.row]?.[next.col] === "#") {
        return current;
      }

      if (mazeHazards.has(mazeKey(next.row, next.col))) {
        setMazeHits((currentHits) => currentHits + 1);
        return mazeStart;
      }

      setMazePellets((currentPellets) => {
        const nextPellets = new Set(currentPellets);
        nextPellets.delete(mazeKey(next.row, next.col));
        return nextPellets;
      });

      return next;
    });
  }

  function resetMazeGame() {
    const nextRows = pickRandomMazeRows(mazeRows);
    setMazeRows(nextRows);
    setMazePlayer(mazeStart);
    setMazePellets(createMazePellets(nextRows));
    setMazeHits(0);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "INPUT" ||
        target?.tagName === "SELECT"
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const moves: Record<string, [number, number]> = {
        arrowdown: [1, 0],
        arrowleft: [0, -1],
        arrowright: [0, 1],
        arrowup: [-1, 0],
        a: [0, -1],
        d: [0, 1],
        s: [1, 0],
        w: [-1, 0],
      };
      const move = moves[key];

      if (!move) return;

      event.preventDefault();
      moveMazePlayer(move[0], move[1]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main className="layout v1-layout">
      <header className="hero v1-hero">
        <a className="text-link" href="../">
          回到 Phase 0
        </a>
        <p className="eyebrow">v1 流程設計</p>
        <h1>資訊整理者流程工作台</h1>
        <p>
          這個頁面把 `docs/flow.md` 的流程設計做成可瀏覽網頁。資料仍來自 Phase 0
          原始資訊；候選資料不代表已確認，也不能直接變成救災任務。
        </p>
      </header>

      <section className="v1-notice" aria-label="資料邊界提醒">
        <strong>資料邊界：</strong>
        這是前端-only 的學習原型，不使用後端、外部 API、真實地圖或 runtime LLM。
      </section>

      <section className="v1-overview" aria-label="v1 工作台摘要">
        <article>
          <span>{practiceRecords.length}</span>
          <p>Phase 0 原始資訊</p>
        </article>
        <article>
          <span>{practiceChoices.length}</span>
          <p>整理判斷選項</p>
        </article>
        <article>
          <span>{riskSignals.length}</span>
          <p>教學用風險線索</p>
        </article>
      </section>

      <section className="v1-flow" aria-label="v1 資訊流程">
        {flowSteps.map((step, index) => (
          <article className="v1-step" key={step.id}>
            <div className="v1-step__number">{step.id}</div>
            <div>
              <p className="v1-step__kicker">
                {index === 0 ? "入口" : "檢查點"}
              </p>
              <h2>{step.title}</h2>
              <p>{step.detail}</p>
            </div>
          </article>
        ))}
      </section>

      <section className="v1-example" aria-label="M-001 流程示範">
        <div>
          <p className="eyebrow">流程套用示範</p>
          <h2>用 M-001 看一次整理者會怎麼判斷</h2>
          <p>
            原文：「光復車站後方有人說需要十幾個人清泥，地址只有老雜貨店後面。」
            這筆資訊可以被整理，但還不能被顯示成已確認任務。
          </p>
        </div>
        <div className="v1-example__checks">
          {exampleChecks.map((check) => (
            <article className="v1-check" key={check.label}>
              <span>{check.label}</span>
              <strong>{check.result}</strong>
              <p>{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="v1-practice" aria-label="整理判斷練習">
        <div>
          <p className="eyebrow">互動練習</p>
          <h2>你會怎麼標示 M-001 到 M-010？</h2>
          <p>
            先選一筆 Phase 0
            原始資訊，再點一個判斷看看流程會輸出什麼結果。這只是練習，不會把結果存成正式資料。
          </p>
        </div>

        <div className="v1-practice__layout">
          <aside className="v1-record-list" aria-label="選擇 M-001 到 M-010">
            {practiceRecords.map((record) => (
              <button
                className={record.id === selectedRecord.id ? "active" : ""}
                key={record.id}
                type="button"
                onClick={() => selectBuiltInRecord(record.id)}
              >
                <span>{record.id}</span>
                <small>
                  {record.verificationStatus === "unverified"
                    ? "未查核"
                    : "待確認"}
                </small>
              </button>
            ))}
          </aside>

          <article className="v1-record-preview">
            <div className="v1-record-preview__header">
              <h3>{selectedRecord.id}</h3>
              <StatusBadge status={selectedRecord.verificationStatus} />
            </div>
            <p>{selectedRecord.rawText}</p>
            <SourceLabel sourceType={selectedRecord.sourceType} />
          </article>
        </div>

        <div className="v1-practice__options">
          {practiceChoices.map((choice) => (
            <button
              className={choice.key === practiceChoice ? "active" : ""}
              key={choice.key}
              type="button"
              onClick={() => setPracticeChoice(choice.key)}
            >
              {choice.label}
            </button>
          ))}
        </div>

        <article className="v1-practice__result" aria-live="polite">
          <div className="v1-practice__result-header">
            <span>流程輸出：{selectedRecord.id}</span>
            <strong>{selectedPractice.result}</strong>
          </div>
          <div
            className="v1-meter"
            aria-label={`風險提示 ${riskAnalysis.score}%`}
          >
            <div style={{ width: `${riskAnalysis.score}%` }} />
          </div>
          <dl className="v1-practice__meta">
            <div>
              <dt>對應流程</dt>
              <dd>步驟 {selectedPractice.stepId}</dd>
            </div>
            <div>
              <dt>風險提示</dt>
              <dd>{riskAnalysis.score}%</dd>
            </div>
          </dl>
          <p>{selectedPractice.detail}</p>
          <div className="v1-risk-factors">
            <span>演算線索</span>
            <ul>
              {riskAnalysis.factors.map((factor) => (
                <li key={factor}>{factor}</li>
              ))}
            </ul>
          </div>
          <p className="v1-practice__next">
            下一步：{selectedPractice.nextStep}
          </p>
        </article>
      </section>

      <section className="v1-decision-grid" aria-label="流程重點">
        <ListCard title="人工確認點" items={reviewPoints} tone="warning" />
        <ListCard
          title="不能自動處理的分支"
          items={blockedBranches}
          tone="danger"
        />
        <ListCard title="操作或判斷紀錄" items={logItems} />
        <ListCard title="仍不確定的流程點" items={openQuestions} />
      </section>

      <section className="v1-summary">
        <p className="eyebrow">流程修正</p>
        <h2>資訊足夠，也仍然不是已確認事實</h2>
        <p>
          原本流程可能讓「資訊足夠」的資料直接變成候選資料。修正後加入「是否有衝突或高風險」和「仍標示尚未確認」兩個檢查，避免讓候選資料看起來像正式結論。
        </p>
      </section>

      <section className="v1-break-game" aria-label="休息一下">
        <div>
          <p className="eyebrow">休息一下</p>
          <h2>小精靈整理迷宮</h2>
          <p>
            用 WASD
            或方向鍵吃掉雜訊豆；踩到干擾格會回到起點。這只是頁面底部的小彩蛋。
          </p>
        </div>
        <div
          className="v1-maze"
          style={{
            gridTemplateColumns: `repeat(${mazeColumnCount}, 1fr)`,
            gridTemplateRows: `repeat(${mazeRowCount}, 1fr)`,
          }}
          aria-label="小精靈迷宮"
        >
          {mazeRows.flatMap((row, rowIndex) =>
            [...row].map((cell, colIndex) => {
              const key = mazeKey(rowIndex, colIndex);
              const hasPellet = mazePellets.has(key);
              const isHazard = mazeHazards.has(key);
              return (
                <div
                  className={`v1-maze__cell ${
                    cell === "#" ? "wall" : "path"
                  } ${isHazard ? "hazard" : ""}`}
                  key={key}
                >
                  {hasPellet ? (
                    <span className="v1-maze__pellet" />
                  ) : isHazard ? (
                    <span className="v1-maze__hazard" />
                  ) : null}
                </div>
              );
            }),
          )}
          <div className="v1-maze__runner" aria-hidden="true">
            <span className="v1-maze__player" style={mazePlayerStyle} />
          </div>
        </div>
        <div className="v1-maze__controls" aria-label="小精靈方向鍵">
          <button type="button" onClick={() => moveMazePlayer(-1, 0)}>
            W 向上
          </button>
          <button type="button" onClick={() => moveMazePlayer(0, -1)}>
            A 向左
          </button>
          <button type="button" onClick={() => moveMazePlayer(0, 1)}>
            D 向右
          </button>
          <button type="button" onClick={() => moveMazePlayer(1, 0)}>
            S 向下
          </button>
        </div>
        <div className="v1-break-game__status" aria-live="polite">
          <span>
            冷靜值 {calmScore}/{totalMazePellets} · 干擾 {mazeHits}
          </span>
          <div aria-hidden="true">
            <span
              style={{ width: `${(calmScore / totalMazePellets) * 100}%` }}
            />
          </div>
          <p>
            {mazeCleared
              ? "迷宮清空完成。可以回去面對下一筆資訊了。"
              : "避開紅色干擾格，吃掉雜訊豆，就少一點資訊噪音。"}
          </p>
          <button type="button" onClick={resetMazeGame}>
            重新整理
          </button>
        </div>
      </section>
    </main>
  );
}
