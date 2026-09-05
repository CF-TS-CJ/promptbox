(function () {
  "use strict";

  const STORAGE_KEY = "promptbox.items.v1";
  const THEME_KEY = "promptbox.theme.v1";

  const ESCAPES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  const ICONS = {
    plus:
      '<path d="M12 5v14"></path><path d="M5 12h14"></path>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>',
    edit: '<path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path>',
    trash:
      '<path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><path d="M10 11v6"></path><path d="M14 11v6"></path>',
    star: '<path d="M11.5 2.6a.6.6 0 0 1 1 0l2.6 5.3 5.9.9a.6.6 0 0 1 .3 1l-4.2 4.1 1 5.8a.6.6 0 0 1-.8.6l-5.3-2.8-5.3 2.8a.6.6 0 0 1-.8-.6l1-5.8L2.7 9.8a.6.6 0 0 1 .3-1l5.9-.9Z"></path>',
    check: '<path d="M20 6 9 17l-5-5"></path>',
    download:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m7 10 5 5 5-5"></path><path d="M12 15V3"></path>',
    upload:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><path d="m17 8-5-5-5 5"></path><path d="M12 3v12"></path>',
    sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="m4.93 4.93 1.41 1.41"></path><path d="m17.66 17.66 1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="m6.34 17.66-1.41 1.41"></path><path d="m19.07 4.93-1.41 1.41"></path>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>',
    x: '<path d="M18 6 6 18"></path><path d="m6 6 12 12"></path>',
    inbox:
      '<path d="M22 12h-6l-2 3h-4l-2-3H2"></path><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1Z"></path>'
  };

  const dom = {};
  let items = [];
  let editingId = null;
  let toastTimer = null;

  const filterState = {
    query: "",
    tag: "all",
    view: "all"
  };

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (char) {
      return ESCAPES[char];
    });
  }

  function icon(name) {
    return (
      '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      ICONS[name] +
      "</svg>"
    );
  }

  function cacheDom() {
    dom.themeToggle = document.getElementById("themeToggle");
    dom.totalStat = document.getElementById("totalStat");
    dom.favoriteStat = document.getElementById("favoriteStat");
    dom.tagStat = document.getElementById("tagStat");
    dom.searchInput = document.getElementById("searchInput");
    dom.importInput = document.getElementById("importInput");
    dom.importButton = document.getElementById("importButton");
    dom.exportButton = document.getElementById("exportButton");
    dom.addButton = document.getElementById("addButton");
    dom.tagChips = document.getElementById("tagChips");
    dom.collection = document.getElementById("collection");
    dom.editorDialog = document.getElementById("editorDialog");
    dom.editorForm = document.getElementById("editorForm");
    dom.editorDialogTitle = document.getElementById("editorDialogTitle");
    dom.closeEditorButton = document.getElementById("closeEditorButton");
    dom.cancelEditorButton = document.getElementById("cancelEditorButton");
    dom.titleInput = document.getElementById("titleInput");
    dom.contentInput = document.getElementById("contentInput");
    dom.contentCount = document.getElementById("contentCount");
    dom.tagsInput = document.getElementById("tagsInput");
    dom.favoriteInput = document.getElementById("favoriteInput");
    dom.toast = document.getElementById("toast");
  }

  function loadItems() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }
      return parsed.map(PromptBox.normalizeItem);
    } catch (error) {
      return [];
    }
  }

  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function showToast(message, isError) {
    window.clearTimeout(toastTimer);
    dom.toast.textContent = message;
    dom.toast.classList.toggle("is-error", Boolean(isError));
    dom.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(function () {
      dom.toast.classList.remove("is-visible");
    }, 2400);
  }

  function visibleItems() {
    return PromptBox.filterItems(items, {
      query: filterState.query,
      tag: filterState.tag,
      favorite: filterState.view === "favorite"
    });
  }

  function renderStats() {
    const uniqueTags = new Set();
    for (const item of items) {
      for (const tag of item.tags) {
        uniqueTags.add(tag);
      }
    }

    dom.totalStat.innerHTML =
      "<strong>" + items.length + "</strong> 条";
    dom.favoriteStat.innerHTML =
      "<strong>" +
      PromptBox.favoriteCount(items) +
      "</strong> 收藏";
    dom.tagStat.innerHTML =
      "<strong>" + uniqueTags.size + "</strong> 标签";
  }

  function renderTagChips() {
    const tags = PromptBox.tagStats(items);
    let html =
      '<button class="tag-chip' +
      (filterState.tag === "all" ? " is-active" : "") +
      '" type="button" data-tag="all">所有标签</button>';

    for (const tag of tags) {
      html +=
        '<button class="tag-chip' +
        (filterState.tag === tag.name ? " is-active" : "") +
        '" type="button" data-tag="' +
        escapeHtml(tag.name) +
        '">' +
        escapeHtml(tag.name) +
        "<span>" +
        tag.count +
        "</span></button>";
    }

    dom.tagChips.innerHTML = html;
  }

  function formatUpdatedAt(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "";
    }
    const currentYear = new Date().getFullYear();
    const options =
      date.getFullYear() === currentYear
        ? { month: "long", day: "numeric" }
        : { year: "numeric", month: "long", day: "numeric" };
    return "更新于 " + new Intl.DateTimeFormat("zh-CN", options).format(date);
  }

  function cardHtml(item) {
    const tags = item.tags.length
      ? item.tags
          .map(function (tag) {
            return '<span class="mini-tag">' + escapeHtml(tag) + "</span>";
          })
          .join("")
      : "";

    return (
      '<article class="prompt-card' +
      (item.favorite ? " is-favorite" : "") +
      '" data-id="' +
      escapeHtml(item.id) +
      '">' +
      '<header class="card-head"><h3>' +
      escapeHtml(item.title) +
      "</h3>" +
      '<button class="fav-btn' +
      (item.favorite ? " is-on" : "") +
      '" type="button" data-action="favorite" title="' +
      (item.favorite ? "取消收藏" : "设为收藏") +
      '" aria-label="' +
      (item.favorite ? "取消收藏" : "设为收藏") +
      '">' +
      icon("star") +
      "</button></header>" +
      '<p class="card-content">' +
      escapeHtml(item.content) +
      "</p>" +
      (tags ? '<div class="card-tags">' + tags + "</div>" : "") +
      '<footer class="card-foot"><span class="updated-at">' +
      escapeHtml(formatUpdatedAt(item.updatedAt)) +
      "</span>" +
      '<div class="card-actions">' +
      '<button class="icon-btn" type="button" data-action="copy" title="复制内容" aria-label="复制内容">' +
      icon("copy") +
      "</button>" +
      '<button class="icon-btn" type="button" data-action="edit" title="编辑" aria-label="编辑">' +
      icon("edit") +
      "</button>" +
      '<button class="icon-btn" type="button" data-action="delete" title="删除" aria-label="删除">' +
      icon("trash") +
      "</button>" +
      "</div></footer></article>"
    );
  }

  function renderCollection() {
    const list = visibleItems();

    if (!list.length) {
      if (!items.length) {
        dom.collection.innerHTML =
          '<div class="empty-state">' +
          icon("inbox") +
          "<h2>还没有收藏任何片段</h2>" +
          "<p>可以先从示例开始，看看它长什么样。</p>" +
          '<button class="btn" type="button" data-action="load-demo">载入示例</button>' +
          "</div>";
      } else {
        dom.collection.innerHTML =
          '<div class="empty-state">' +
          icon("inbox") +
          "<h2>没有匹配的片段</h2>" +
          "<p>换个关键词，或者清除当前筛选条件。</p>" +
          '<button class="btn" type="button" data-action="clear-filters">清除筛选</button>' +
          "</div>";
      }
      return;
    }

    dom.collection.innerHTML = list.map(cardHtml).join("");
  }

  function render() {
    renderStats();
    renderTagChips();
    renderCollection();
  }

  function updateSegmentButtons() {
    const segments = document.querySelectorAll(".segment");
    for (const segment of segments) {
      const isActive = segment.dataset.view === filterState.view;
      segment.classList.toggle("is-active", isActive);
      segment.setAttribute("aria-pressed", String(isActive));
    }
  }

  function resetFilters() {
    filterState.query = "";
    filterState.tag = "all";
    filterState.view = "all";
    dom.searchInput.value = "";
    updateSegmentButtons();
    render();
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    dom.themeToggle.innerHTML = icon(theme === "dark" ? "sun" : "moon");
    dom.themeToggle.setAttribute(
      "aria-label",
      theme === "dark" ? "切换到亮色主题" : "切换到暗色主题"
    );
    dom.themeToggle.title =
      theme === "dark" ? "切换到亮色主题" : "切换到暗色主题";
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (error) {
      // Theme is optional when storage is unavailable.
    }
  }

  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    setTheme(next);
  }

  function initTheme() {
    let theme = null;
    try {
      theme = localStorage.getItem(THEME_KEY);
    } catch (error) {
      theme = null;
    }
    if (theme !== "light" && theme !== "dark") {
      theme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    setTheme(theme);
  }

  function openEditor(item) {
    editingId = item ? item.id : null;
    dom.editorDialogTitle.textContent = item ? "编辑片段" : "新建片段";
    dom.titleInput.value = item ? item.title : "";
    dom.contentInput.value = item ? item.content : "";
    dom.tagsInput.value = item ? item.tags.join("、") : "";
    dom.favoriteInput.checked = item ? item.favorite : false;
    updateContentCount();
    dom.editorDialog.showModal();
    window.setTimeout(function () {
      dom.titleInput.focus();
    }, 0);
  }

  function closeEditor() {
    dom.editorDialog.close();
    editingId = null;
  }

  function saveFromEditor(event) {
    event.preventDefault();
    const title = dom.titleInput.value.trim();
    const content = dom.contentInput.value.trim();

    if (!content) {
      dom.contentInput.focus();
      showToast("提示词内容不能为空", true);
      return;
    }

    const data = {
      title,
      content,
      tags: dom.tagsInput.value,
      favorite: dom.favoriteInput.checked
    };

    if (editingId) {
      items = PromptBox.updateItem(items, editingId, data);
      showToast("已保存修改");
    } else {
      items = [PromptBox.createItem(data)].concat(items);
      showToast("已新建片段");
    }

    saveItems();
    closeEditor();
    render();
  }

  function updateContentCount() {
    dom.contentCount.textContent = dom.contentInput.value.length + " 字";
  }

  function legacyCopy(text) {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    if (!ok) {
      throw new Error("copy failed");
    }
  }

  function copyText(text, button) {
    const done = function () {
      button.classList.add("is-copied");
      button.setAttribute("aria-label", "已复制");
      button.title = "已复制";
      button.innerHTML = icon("check");
      window.setTimeout(function () {
        button.classList.remove("is-copied");
        button.setAttribute("aria-label", "复制内容");
        button.title = "复制内容";
        button.innerHTML = icon("copy");
      }, 1400);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () {
        try {
          legacyCopy(text);
          done();
        } catch (error) {
          showToast("复制失败，请手动复制", true);
        }
      });
      return;
    }

    try {
      legacyCopy(text);
      done();
    } catch (error) {
      showToast("复制失败，请手动复制", true);
    }
  }

  function exportItems() {
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([PromptBox.exportPayload(items)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "promptbox-backup-" + date + ".json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1200);
    showToast("已导出 " + items.length + " 条片段");
  }

  async function importFile(file) {
    try {
      const text = await file.text();
      const incoming = PromptBox.parseImport(text);
      if (!incoming.length) {
        showToast("文件里没有可导入的内容", true);
        return;
      }
      items = PromptBox.mergeItems(items, incoming);
      saveItems();
      render();
      showToast("已导入 " + incoming.length + " 条片段");
    } catch (error) {
      showToast(error.message || "导入失败", true);
    } finally {
      dom.importInput.value = "";
    }
  }

  function handleCollectionClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const action = button.dataset.action;
    const card = button.closest(".prompt-card");

    if (action === "load-demo") {
      items = PromptBox.sampleItems();
      saveItems();
      render();
      showToast("已载入示例数据，可随时删除");
      return;
    }

    if (action === "clear-filters") {
      resetFilters();
      return;
    }

    if (!card) {
      return;
    }

    const id = card.dataset.id;
    const item = items.find(function (candidate) {
      return candidate.id === id;
    });
    if (!item) {
      return;
    }

    if (action === "favorite") {
      items = PromptBox.updateItem(items, id, {
        favorite: !item.favorite
      });
      saveItems();
      render();
      return;
    }

    if (action === "copy") {
      copyText(item.content, button);
      return;
    }

    if (action === "edit") {
      openEditor(item);
      return;
    }

    if (action === "delete") {
      const title = item.title.length > 24 ? item.title.slice(0, 24) + "…" : item.title;
      if (window.confirm("确定删除“" + title + "”吗？")) {
        items = PromptBox.removeItem(items, id);
        saveItems();
        render();
        showToast("已删除");
      }
    }
  }

  function bindEvents() {
    dom.addButton.addEventListener("click", function () {
      openEditor(null);
    });

    dom.themeToggle.addEventListener("click", toggleTheme);

    dom.importButton.addEventListener("click", function () {
      dom.importInput.click();
    });

    dom.importInput.addEventListener("change", function () {
      const file = dom.importInput.files && dom.importInput.files[0];
      if (file) {
        importFile(file);
      }
    });

    dom.exportButton.addEventListener("click", exportItems);

    dom.searchInput.addEventListener("input", function () {
      filterState.query = dom.searchInput.value;
      renderCollection();
    });

    document
      .querySelectorAll(".segment")
      .forEach(function (segment) {
        segment.addEventListener("click", function () {
          filterState.view = segment.dataset.view;
          updateSegmentButtons();
          renderCollection();
        });
      });

    dom.tagChips.addEventListener("click", function (event) {
      const chip = event.target.closest("button[data-tag]");
      if (!chip) {
        return;
      }
      filterState.tag = chip.dataset.tag;
      renderTagChips();
      renderCollection();
    });

    dom.collection.addEventListener("click", handleCollectionClick);

    dom.editorForm.addEventListener("submit", saveFromEditor);
    dom.closeEditorButton.addEventListener("click", closeEditor);
    dom.cancelEditorButton.addEventListener("click", closeEditor);
    dom.contentInput.addEventListener("input", updateContentCount);
  }

  function init() {
    cacheDom();
    initTheme();

    const demoRequested =
      new URLSearchParams(window.location.search).get("demo") === "1";
    items = loadItems();
    if (demoRequested && !items.length) {
      items = PromptBox.sampleItems();
      saveItems();
    }

    bindEvents();
    render();
  }

  init();
})();
