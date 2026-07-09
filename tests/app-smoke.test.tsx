import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "../src/app/App";

describe("App", () => {
  beforeEach(() => {
    window.history.pushState({}, "", "/");
  });

  it("renders starter title", () => {
    render(<App />);
    expect(screen.getByText("災害資訊整理工作台")).toBeInTheDocument();
  });

  it("keeps the home page focused on phase 0 tabs", () => {
    render(<App />);

    expect(
      screen.getByRole("button", { name: "原始資訊" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "整理工作台" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "通報" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "地點" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "志工任務" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "人員指派" }),
    ).not.toBeInTheDocument();
  });

  it("shows review states in the phase 0 workbench", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(
      screen.getByText(
        "第一階段的成功不是分類正確，而是把為什麼現在還不能判斷說清楚。",
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByText("待人工確認").length).toBeGreaterThan(0);
    expect(screen.getAllByText("未查核").length).toBeGreaterThan(0);
  });

  it("shows editable phase 0 drafts as learner work", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "整理工作台" }));

    expect(screen.getByText(/Starter 已建立 6 筆整理草稿/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "保存草稿" }),
    ).toBeInTheDocument();
  });

  it("renders the v1 flow page from /v1/", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    expect(screen.getByText("資訊整理者流程工作台")).toBeInTheDocument();
    expect(screen.getByText("人工確認點")).toBeInTheDocument();
    expect(screen.getByText("不能自動處理的分支")).toBeInTheDocument();
    expect(screen.getByText(/資料仍來自 Phase 0 原始資訊/)).toBeInTheDocument();
    expect(
      screen.getByText("用 M-001 看一次整理者會怎麼判斷"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "回到 Phase 0" })).toHaveAttribute(
      "href",
      "../",
    );
  });

  it("updates the v1 practice result when learner chooses another judgement", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    expect(
      screen.getByText("你會怎麼標示 M-001 到 M-010？"),
    ).toBeInTheDocument();
    expect(screen.getByText("流程輸出：M-001")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /M-010/ }));

    expect(screen.getByText(/溪畔活動中心現場更新｜14:35/)).toBeInTheDocument();
    expect(screen.getByText("流程輸出：M-010")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "看起來有行動風險" }));

    expect(screen.getByText("不能直接變成任務")).toBeInTheDocument();
    expect(screen.getByText("步驟 03")).toBeInTheDocument();
    expect(screen.getByText("81%")).toBeInTheDocument();
    expect(
      screen.getByText(/不能讓志工依這段文字直接前往/),
    ).toBeInTheDocument();
    expect(screen.getByText("演算線索")).toBeInTheDocument();
    expect(screen.getByText("目前不是已確認資訊")).toBeInTheDocument();
    expect(screen.getByText("有時間敏感或可能過期的描述")).toBeInTheDocument();
    expect(
      screen.getByText(/先擋下行動用途，交由人工確認是否仍有需求/),
    ).toBeInTheDocument();
  });

  it("lets learners play the quiet maze game at the bottom", () => {
    window.history.pushState({}, "", "/v1/");

    render(<App />);

    expect(screen.getByText("小精靈整理迷宮")).toBeInTheDocument();
    expect(screen.getByText(/兩個錯誤會自己追過來/)).toBeInTheDocument();
    expect(screen.getByText(/^冷靜值 0\/\d+ · 干擾 0$/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "d" });

    expect(screen.getByText(/^冷靜值 1\/\d+ · 干擾 0$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "D 向右" }));

    expect(screen.getByText(/^冷靜值 2\/\d+ · 干擾 0$/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重新整理" }));

    expect(screen.getByText(/^冷靜值 0\/\d+ · 干擾 0$/)).toBeInTheDocument();
  });
});
