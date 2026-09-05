const test = require("node:test");
const assert = require("node:assert/strict");
const PromptBox = require("../js/logic.js");

function makeItem(overrides) {
  return PromptBox.createItem({
    title: "测试片段",
    content: "请把这段文字翻译成英文。",
    tags: ["写作", "翻译"],
    ...overrides
  });
}

test("createItem normalizes a new snippet", () => {
  const item = makeItem();

  assert.ok(item.id);
  assert.equal(item.title, "测试片段");
  assert.deepEqual(item.tags, ["写作", "翻译"]);
  assert.equal(item.favorite, false);
  assert.equal(item.createdAt, item.updatedAt);
});

test("tags accept Chinese and English separators without duplicates", () => {
  const item = makeItem({ tags: "写作，翻译; prompt  prompt" });

  assert.deepEqual(item.tags, ["写作", "翻译", "prompt"]);
});

test("updateItem changes fields and keeps identity", () => {
  const item = makeItem();
  const items = [item];
  const updated = PromptBox.updateItem(items, item.id, {
    title: "新标题",
    favorite: true
  });

  assert.equal(updated.length, 1);
  assert.equal(updated[0].id, item.id);
  assert.equal(updated[0].title, "新标题");
  assert.equal(updated[0].favorite, true);
  assert.equal(updated[0].createdAt, item.createdAt);
  assert.ok(updated[0].updatedAt >= item.updatedAt);
});

test("updateItem rejects empty content", () => {
  const item = makeItem();

  assert.throws(function () {
    PromptBox.updateItem([item], item.id, { content: "   " });
  }, /不能为空/);
});

test("removeItem deletes only the requested id", () => {
  const first = makeItem({ title: "第一" });
  const second = makeItem({ title: "第二" });
  const remaining = PromptBox.removeItem([first, second], first.id);

  assert.deepEqual(
    remaining.map((item) => item.title),
    ["第二"]
  );
});

test("filterItems searches title, content and tags", () => {
  const writing = makeItem({
    title: "修改邮件",
    content: "请让语气更客气。",
    tags: ["写作"]
  });
  const code = makeItem({
    title: "解释代码",
    content: "请逐行说明。",
    tags: ["编程", "学习"]
  });
  const favorite = makeItem({
    title: "复盘",
    content: "请帮我总结这周。",
    tags: ["写作"],
    favorite: true
  });
  const items = [writing, code, favorite];

  assert.equal(PromptBox.filterItems(items, { query: "解释代码" }).length, 1);
  assert.equal(PromptBox.filterItems(items, { query: "语气" }).length, 1);
  assert.equal(PromptBox.filterItems(items, { query: "写作" }).length, 2);
  assert.equal(
    PromptBox.filterItems(items, { tag: "写作", favorite: true }).length,
    1
  );
});

test("tagStats counts unique tags", () => {
  const items = [
    makeItem({ tags: ["写作", "翻译"] }),
    makeItem({ tags: ["写作"] }),
    makeItem({ tags: ["编程"] })
  ];

  const stats = PromptBox.tagStats(items);
  const writing = stats.find((entry) => entry.name === "写作");

  assert.equal(writing.count, 2);
  assert.equal(stats.length, 3);
});

test("parseImport reads exported JSON payloads", () => {
  const items = [makeItem({ title: "导出测试" })];
  const payload = PromptBox.exportPayload(items);
  const parsed = PromptBox.parseImport(payload);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].title, "导出测试");
});

test("mergeItems updates existing ids and appends new ones", () => {
  const existing = makeItem({ title: "旧标题" });
  const incomingNew = makeItem({ title: "新片段" });
  const incomingSameId = {
    ...existing,
    title: "导入后的标题"
  };

  const merged = PromptBox.mergeItems([existing], [
    incomingSameId,
    incomingNew
  ]);

  assert.equal(merged.length, 2);
  assert.equal(
    merged.find((item) => item.id === existing.id).title,
    "导入后的标题"
  );
});
