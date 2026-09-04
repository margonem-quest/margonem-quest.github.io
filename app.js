const starterQuests = [];

const STORAGE_KEY = "margonemQuestHelper.quests";
const PROGRESS_KEY = "margonemQuestHelper.progress";
const THEME_KEY = "margonemQuestHelper.theme";

const state = {
  quests: [],
  selectedId: null,
  progress: {}
};

const questList = document.querySelector("#questList");
const searchInput = document.querySelector("#searchInput");
const levelFilter = document.querySelector("#levelFilter");
const resultsInfo = document.querySelector("#resultsInfo");
const emptyState = document.querySelector("#emptyState");
const questDetails = document.querySelector("#questDetails");
const questTitle = document.querySelector("#questTitle");
const questMeta = document.querySelector("#questMeta");
const questDescription = document.querySelector("#questDescription");
const questStart = document.querySelector("#questStart");
const questExperience = document.querySelector("#questExperience");
const questGold = document.querySelector("#questGold");
const rewardItemsSection = document.querySelector("#rewardItemsSection");
const rewardItemsList = document.querySelector("#rewardItemsList");
const stepsList = document.querySelector("#stepsList");
const resetProgressBtn = document.querySelector("#resetProgressBtn");
const editQuestBtn = document.querySelector("#editQuestBtn");
const addQuestPanel = document.querySelector("#addQuestPanel");
const addQuestForm = document.querySelector("#addQuestForm");
const showAddFormBtn = document.querySelector("#showAddFormBtn");
const closeAddFormBtn = document.querySelector("#closeAddFormBtn");
const themeToggle = document.querySelector("#themeToggle");
const questFormTitle = document.querySelector("#questFormTitle");
const saveQuestBtn = document.querySelector("#saveQuestBtn");
const stepsEditor = document.querySelector("#stepsEditor");
const formatButtons = document.querySelectorAll(".format-btn");

function loadData() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
  state.quests = Array.isArray(stored) ? stored : starterQuests;

  const removedDemoIds = new Set(["zaginiony-zwiadowca", "stara-mapa"]);
  state.quests = state.quests.filter(quest => !removedDemoIds.has(quest.id));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quests));

  state.progress = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}");
  delete state.progress["zaginiony-zwiadowca"];
  delete state.progress["stara-mapa"];
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));

  const theme = localStorage.getItem(THEME_KEY);
  if (theme === "light") {
    document.body.classList.add("light");
    themeToggle.textContent = "☀️";
  }
}

function saveQuests() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.quests));
}

function saveProgress() {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state.progress));
}

function matchesLevel(level, filter) {
  if (filter === "all") return true;
  if (filter === "1-20") return level >= 1 && level <= 20;
  if (filter === "21-50") return level >= 21 && level <= 50;
  if (filter === "51+") return level >= 51;
  return true;
}

function getFilteredQuests() {
  const query = searchInput.value.trim().toLowerCase();
  const level = levelFilter.value;

  return state.quests.filter(quest => {
    const inText = [
      quest.title,
      quest.start,
      quest.description,
      ...(quest.steps || [])
    ].join(" ").toLowerCase().includes(query);

    return inText && matchesLevel(Number(quest.level), level);
  });
}

function renderQuestList() {
  const quests = getFilteredQuests();
  questList.innerHTML = "";
  resultsInfo.textContent = `Znaleziono: ${quests.length}`;

  if (!quests.length) {
    questList.innerHTML = '<p class="muted">Brak questów pasujących do filtrów.</p>';
    return;
  }

  quests.forEach(quest => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quest-card" + (state.selectedId === quest.id ? " active" : "");
    button.innerHTML = `
      <strong>${escapeHtml(quest.title)}</strong>
      <span>Poziom ${quest.level} • ${escapeHtml(quest.start)}</span>
    `;
    button.addEventListener("click", () => selectQuest(quest.id));
    questList.appendChild(button);
  });
}

function selectQuest(id) {
  state.selectedId = id;
  renderQuestList();
  renderDetails();
}

function renderDetails() {
  const quest = state.quests.find(q => q.id === state.selectedId);

  if (!quest) {
    emptyState.classList.remove("hidden");
    questDetails.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  questDetails.classList.remove("hidden");

  questTitle.textContent = quest.title;
  questMeta.textContent = `Quest • poziom ${quest.level}`;
  questDescription.textContent = quest.description;
  questStart.textContent = quest.start;
  questExperience.textContent = `${Number(quest.experience || 0).toLocaleString("pl-PL")} exp`;
  questGold.textContent = `${Number(quest.gold || 0).toLocaleString("pl-PL")} złota`;

  rewardItemsList.innerHTML = "";
  const rewardItems = Array.isArray(quest.rewardItems) ? quest.rewardItems : [];

  if (rewardItems.length) {
    rewardItemsSection.classList.remove("hidden");
    rewardItems.forEach(item => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(item.name)}</span><strong>× ${Number(item.quantity || 1)}</strong>`;
      rewardItemsList.appendChild(li);
    });
  } else {
    rewardItemsSection.classList.add("hidden");
  }

  stepsList.innerHTML = "";
  const doneSteps = state.progress[quest.id] || [];

  const lastItemAtLevel = {};

  quest.steps.forEach((step, index) => {
    const rawStep = typeof step === "string" ? step : String(step);
    const hashMatch = rawStep.match(/^(#{1,4})\s*/);
    const requestedLevel = hashMatch ? hashMatch[1].length : 0;
    const cleanText = hashMatch ? rawStep.slice(hashMatch[0].length) : rawStep;

    // If a parent level is missing, attach the item to the deepest available parent.
    let level = requestedLevel;
    if (level > 0) {
      while (level > 0 && !lastItemAtLevel[level - 1]) {
        level--;
      }
    }

    const item = document.createElement("li");
    item.className = level === 0 ? "step-item" : `nested-step-item level-${level}`;

    if (level === 0) {
      const label = document.createElement("label");
      label.className = "step-label" + (doneSteps.includes(index) ? " done" : "");
      label.innerHTML = `
        <span class="step-number"></span>
        <input type="checkbox" ${doneSteps.includes(index) ? "checked" : ""} />
        <span class="step-text">${formatQuestText(cleanText)}</span>
      `;

      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => toggleStep(quest.id, index, checkbox.checked));
      item.appendChild(label);
      stepsList.appendChild(item);
    } else {
      const label = document.createElement("label");
      label.className = `substep-label substep-level-${level}` + (doneSteps.includes(index) ? " done" : "");
      label.innerHTML = `
        <input type="checkbox" ${doneSteps.includes(index) ? "checked" : ""} />
        <span class="substep-bullet">${"↳".repeat(Math.min(level, 4))}</span>
        <span class="step-text">${formatQuestText(cleanText)}</span>
      `;

      const checkbox = label.querySelector("input");
      checkbox.addEventListener("change", () => toggleStep(quest.id, index, checkbox.checked));
      item.appendChild(label);

      const parent = lastItemAtLevel[level - 1];
      let childList = parent.querySelector(":scope > .substeps-list");
      if (!childList) {
        childList = document.createElement("ul");
        childList.className = `substeps-list substeps-level-${level}`;
        parent.appendChild(childList);
      }
      childList.appendChild(item);
    }

    lastItemAtLevel[level] = item;
    for (let deeper = level + 1; deeper <= 4; deeper++) {
      delete lastItemAtLevel[deeper];
    }
  });
}

function toggleStep(questId, stepIndex, checked) {
  const done = new Set(state.progress[questId] || []);
  checked ? done.add(stepIndex) : done.delete(stepIndex);
  state.progress[questId] = [...done];
  saveProgress();
  renderDetails();
}

resetProgressBtn.addEventListener("click", () => {
  if (!state.selectedId) return;
  delete state.progress[state.selectedId];
  saveProgress();
  renderDetails();
});

searchInput.addEventListener("input", renderQuestList);
levelFilter.addEventListener("change", renderQuestList);

function openQuestForm(quest = null) {
  addQuestForm.reset();

  if (quest) {
    questFormTitle.textContent = "Edytuj questa";
    saveQuestBtn.textContent = "Zapisz zmiany";

    addQuestForm.elements.editId.value = quest.id;
    addQuestForm.elements.title.value = quest.title;
    addQuestForm.elements.level.value = quest.level;
    addQuestForm.elements.start.value = quest.start;
    addQuestForm.elements.experience.value = quest.experience || 0;
    addQuestForm.elements.gold.value = quest.gold || 0;
    addQuestForm.elements.description.value = quest.description;
    addQuestForm.elements.rewardItems.value = (quest.rewardItems || [])
      .map(item => `${item.name} | ${item.quantity}`)
      .join("\n");
    addQuestForm.elements.steps.value = quest.steps.join("\n");
  } else {
    questFormTitle.textContent = "Dodaj nowego questa";
    saveQuestBtn.textContent = "Zapisz questa";
    addQuestForm.elements.editId.value = "";
  }

  addQuestPanel.classList.remove("hidden");
  addQuestPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

showAddFormBtn.addEventListener("click", () => {
  openQuestForm();
});

editQuestBtn.addEventListener("click", () => {
  const quest = state.quests.find(q => q.id === state.selectedId);
  if (!quest) return;
  openQuestForm(quest);
});

closeAddFormBtn.addEventListener("click", () => {
  addQuestPanel.classList.add("hidden");
  addQuestForm.reset();
});

addQuestForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(addQuestForm);

  const editId = data.get("editId");
  const title = data.get("title").trim();
  const level = Number(data.get("level"));
  const start = data.get("start").trim();
  const experience = Number(data.get("experience")) || 0;
  const gold = Number(data.get("gold")) || 0;
  const description = data.get("description").trim();
  const rewardItems = data.get("rewardItems")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const parts = line.split("|");
      const name = (parts[0] || "").trim();
      const quantity = Math.max(1, Number((parts[1] || "1").trim()) || 1);
      return { name, quantity };
    })
    .filter(item => item.name);
  const steps = data.get("steps")
    .split("\n")
    .map(step => step.trim())
    .filter(Boolean);

  if (editId) {
    const questIndex = state.quests.findIndex(q => q.id === editId);
    if (questIndex === -1) return;

    state.quests[questIndex] = {
      ...state.quests[questIndex],
      title,
      level,
      start,
      experience,
      gold,
      rewardItems,
      description,
      steps
    };

    saveQuests();
    addQuestPanel.classList.add("hidden");
    addQuestForm.reset();
    renderQuestList();
    renderDetails();
    return;
  }

  const baseId = slugify(title);
  let id = baseId || `quest-${Date.now()}`;
  let suffix = 2;

  while (state.quests.some(q => q.id === id)) {
    id = `${baseId}-${suffix++}`;
  }

  const quest = { id, title, level, start, experience, gold, rewardItems, description, steps };
  state.quests.push(quest);
  saveQuests();

  addQuestForm.reset();
  addQuestPanel.classList.add("hidden");
  searchInput.value = "";
  levelFilter.value = "all";
  selectQuest(id);
});

themeToggle.addEventListener("click", () => {
  document.body.classList.toggle("light");
  const light = document.body.classList.contains("light");
  localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  themeToggle.textContent = light ? "☀️" : "🌙";
});

function wrapSelection(textarea, before, after = before) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selected = textarea.value.slice(start, end);

  if (!selected) return;

  textarea.setRangeText(`${before}${selected}${after}`, start, end, "select");
  textarea.focus();
}

function applyEditorFormat(format) {
  if (format === "bold") wrapSelection(stepsEditor, "**");
  if (format === "italic") wrapSelection(stepsEditor, "*");
  if (format === "underline") wrapSelection(stepsEditor, "__");
}

formatButtons.forEach(button => {
  button.addEventListener("click", () => applyEditorFormat(button.dataset.format));
});

stepsEditor.addEventListener("keydown", event => {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return;

  const key = event.key.toLowerCase();
  if (!["b", "i", "u"].includes(key)) return;

  event.preventDefault();
  if (key === "b") applyEditorFormat("bold");
  if (key === "i") applyEditorFormat("italic");
  if (key === "u") applyEditorFormat("underline");
});

function formatQuestText(value) {
  let safe = escapeHtml(value);

  // **tekst** = pogrubienie
  safe = safe.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // *tekst* = kursywa
  safe = safe.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  // __tekst__ = podkreślenie
  safe = safe.replace(/__([^_]+)__/g, "<u>$1</u>");

  return safe;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadData();
renderQuestList();
