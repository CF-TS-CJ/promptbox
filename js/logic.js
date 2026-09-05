(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.PromptBox = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  function createId() {
    return (
      "pb-" +
      Date.now().toString(36) +
      "-" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function isoDate() {
    return new Date().toISOString();
  }

  function isDateString(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
  }

  function parseTags(input) {
    if (Array.isArray(input)) {
      input = input.join(",");
    }
    const seen = new Set();
    const tags = [];
    for (const rawTag of String(input || "").split(/[,，;；、\s]+/)) {
      const tag = rawTag.trim();
      const key = tag.toLocaleLowerCase();
      if (tag && !seen.has(key)) {
        seen.add(key);
        tags.push(tag);
      }
    }
    return tags.slice(0, 30);
  }

  function normalizeItem(input) {
    const data = input && typeof input === "object" ? input : {};
    const now = isoDate();
    const createdAt = isDateString(data.createdAt) ? data.createdAt : now;
    const updatedAt = isDateString(data.updatedAt)
      ? data.updatedAt
      : data.createdAt
        ? createdAt
        : now;

    return {
      id:
        typeof data.id === "string" && data.id.trim()
          ? data.id.trim()
          : createId(),
      title: String(data.title || "").trim() || "未命名片段",
      content: String(data.content || "").trim(),
      tags: parseTags(data.tags),
      favorite: Boolean(data.favorite),
      createdAt,
      updatedAt
    };
  }

  function createItem(input) {
    const item = normalizeItem(input);
    if (!item.content) {
      throw new Error("片段内容不能为空");
    }
    return item;
  }

  function updateItem(items, id, patch) {
    const existing = items.find(function (item) {
      return item.id === id;
    });
    if (!existing) {
      return items;
    }

    const next = normalizeItem({
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: isoDate()
    });
    if (!next.content) {
      throw new Error("片段内容不能为空");
    }

    return items.map(function (item) {
      return item.id === id ? next : item;
    });
  }

  function removeItem(items, id) {
    return items.filter(function (item) {
      return item.id !== id;
    });
  }

  function parseImport(text) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error("文件不是有效的 JSON");
    }

    const list = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.items)
        ? parsed.items
        : null;

    if (!list) {
      throw new Error("JSON 中找不到提示词数据");
    }
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    return list.map(function (item) {
      return normalizeItem(item);
    });
  }

  function mergeItems(current, incoming) {
    const byId = new Map(
      current.map(function (item) {
        return [item.id, item];
      })
    );

    for (const item of incoming) {
      const normalized = normalizeItem(item);
      const existing = byId.get(normalized.id);
      if (existing) {
        byId.set(normalized.id, {
          ...existing,
          ...normalized,
          createdAt: existing.createdAt,
          updatedAt: normalized.updatedAt || isoDate()
        });
      } else {
        byId.set(normalized.id, normalized);
      }
    }

    return Array.from(byId.values()).sort(compareByUpdatedAt);
  }

  function compareByUpdatedAt(a, b) {
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  }

  function filterItems(items, options) {
    const opts = options || {};
    const query = String(opts.query || "").trim().toLocaleLowerCase();
    const tag = opts.tag && opts.tag !== "all" ? opts.tag : null;
    const favoriteOnly = Boolean(opts.favorite);

    return items
      .filter(function (item) {
        if (favoriteOnly && !item.favorite) {
          return false;
        }
        if (tag && !item.tags.includes(tag)) {
          return false;
        }
        if (!query) {
          return true;
        }

        const terms = query.split(/\s+/);
        const haystack = [
          item.title,
          item.content,
          item.tags.join(" ")
        ]
          .join("\n")
          .toLocaleLowerCase();
        return terms.every(function (term) {
          return haystack.includes(term);
        });
      })
      .sort(compareByUpdatedAt);
  }

  function tagStats(items) {
    const counts = new Map();
    for (const item of items) {
      for (const tag of item.tags) {
        counts.set(tag, (counts.get(tag) || 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(function (entry) {
        return { name: entry[0], count: entry[1] };
      })
      .sort(function (a, b) {
        return (
          b.count - a.count ||
          a.name.localeCompare(b.name, "zh-CN", { sensitivity: "base" })
        );
      });
  }

  function favoriteCount(items) {
    return items.reduce(function (count, item) {
      return count + (item.favorite ? 1 : 0);
    }, 0);
  }

  function exportPayload(items) {
    return JSON.stringify(
      {
        app: "promptbox",
        version: 1,
        exportedAt: isoDate(),
        items
      },
      null,
      2
    );
  }

  function sampleItems() {
    const created = new Date();
    const day = 24 * 60 * 60 * 1000;

    return [
      normalizeItem({
        id: "sample-summary",
        title: "结构化总结长文",
        content:
          "请把下面的内容整理成一份结构化总结：先用三句话概括核心观点，再按主题列出要点，最后指出文中的关键数据和可能的遗漏。请使用清晰的小标题。",
        tags: ["总结", "分析", "阅读"],
        favorite: true,
        createdAt: new Date(created.getTime() - 2 * day).toISOString()
      }),
      normalizeItem({
        id: "sample-table",
        title: "把信息做成对比表格",
        content:
          "请把下面的信息整理成对比表格。列为：项目、用途、优点、局限、适合场景。不要加入表中没有的信息；拿不准的地方用“未知”标注。",
        tags: ["表格", "整理"],
        favorite: false,
        createdAt: new Date(created.getTime() - 4 * day).toISOString()
      }),
      normalizeItem({
        id: "sample-teacher",
        title: "用新手能懂的方式解释概念",
        content:
          "请用初学者也能听懂的方式解释“<概念>”。先给一个生活中的比喻，再讲正式定义，最后用三步说明它是怎么工作的。避免堆砌术语，并告诉我哪些词值得进一步学习。",
        tags: ["学习", "解释"],
        favorite: false,
        createdAt: new Date(created.getTime() - 6 * day).toISOString()
      }),
      normalizeItem({
        id: "sample-review",
        title: "复盘一次项目或对话",
        content:
          "以下是最近完成的项目/对话记录。请按下面顺序帮我复盘：1. 目标和实际结果分别是什么；2. 哪些选择有效；3. 哪里浪费了时间；4. 下次遇到同类任务，第一步应该怎么调整。",
        tags: ["复盘", "写作"],
        favorite: true,
        createdAt: new Date(created.getTime() - 8 * day).toISOString()
      })
    ].sort(compareByUpdatedAt);
  }

  return {
    createItem,
    exportPayload,
    favoriteCount,
    filterItems,
    mergeItems,
    normalizeItem,
    parseImport,
    removeItem,
    sampleItems,
    tagStats,
    updateItem
  };
});
