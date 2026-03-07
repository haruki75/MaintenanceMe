const APP_STATE_STORAGE_KEY = "maintenance-me-state-v1";
const TASKS_STORAGE_KEY = "maintenance-me-tasks-v1";
const TECHNICIANS_STORAGE_KEY = "maintenance-me-technicians-v1";
const TICKETS = ["SAAS", "DSO", "DEV"];
const TASK_TEMPLATES = {
  ORACLE_DB_SAAS: {
    title: "Oracle DB SAAS maintenance",
    tickets: ["SAAS", "DEV"],
    downtimeType: "TOTAL",
  },
};
const OFFICE_LINK_INPUT_IDS = {
  SAAS: "ticketLinkSAAS",
  DSO: "ticketLinkDSO",
  DEV: "ticketLinkDEV",
};
const QUICK_OFFICE_LINK_INPUT_IDS = {
  SAAS: "quickTicketLinkSAAS",
  DSO: "quickTicketLinkDSO",
  DEV: "quickTicketLinkDEV",
};
const loadedState = loadAppState();

const state = {
  currentMonthDate: new Date(),
  selectedDate: toISODate(new Date()),
  tasks: loadedState.tasks,
  technicians: loadedState.technicians,
  editingTaskId: null,
  dayPanelOpen: false,
  search: {
    fromDate: "",
    toDate: "",
    dayType: "ALL",
    quarter: "ALL",
    year: String(new Date().getFullYear()),
  },
};

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const taskForm = document.getElementById("taskForm");
const taskStartDateInput = document.getElementById("taskStartDateInput");
const taskEndDateInput = document.getElementById("taskEndDateInput");
const taskTechniciansSelect = document.getElementById("taskTechniciansSelect");
const taskTemplateSelect = document.getElementById("taskTemplateSelect");
const applyTemplateBtn = document.getElementById("applyTemplateBtn");
const taskFormModeLabel = document.getElementById("taskFormModeLabel");
const taskSubmitBtn = document.getElementById("taskSubmitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const tasksTitle = document.getElementById("tasksTitle");
const taskList = document.getElementById("taskList");
const taskItemTemplate = document.getElementById("taskItemTemplate");
const dayPanel = document.getElementById("dayPanel");
const dayPanelBackdrop = document.getElementById("dayPanelBackdrop");
const closeDayPanelBtn = document.getElementById("closeDayPanelBtn");
const quickEditModal = document.getElementById("quickEditModal");
const quickEditBackdrop = document.getElementById("quickEditBackdrop");
const closeQuickEditBtn = document.getElementById("closeQuickEditBtn");
const cancelQuickEditBtn = document.getElementById("cancelQuickEditBtn");
const quickEditForm = document.getElementById("quickEditForm");
const quickEditTaskId = document.getElementById("quickEditTaskId");
const quickEditTitle = document.getElementById("quickEditTitle");
const quickEditStartDate = document.getElementById("quickEditStartDate");
const quickEditEndDate = document.getElementById("quickEditEndDate");
const quickEditTechnicians = document.getElementById("quickEditTechnicians");
const quickEditDowntimeType = document.getElementById("quickEditDowntimeType");
const quickEditNotes = document.getElementById("quickEditNotes");
const quickTicketCheckboxes = Array.from(quickEditForm.querySelectorAll('input[name="tickets"]'));
const technicianForm = document.getElementById("technicianForm");
const technicianNameInput = document.getElementById("technicianNameInput");
const technicianList = document.getElementById("technicianList");
const searchForm = document.getElementById("searchForm");
const filterFromDate = document.getElementById("filterFromDate");
const filterToDate = document.getElementById("filterToDate");
const filterDayType = document.getElementById("filterDayType");
const filterQuarter = document.getElementById("filterQuarter");
const filterYear = document.getElementById("filterYear");
const applyQuarterBtn = document.getElementById("applyQuarterBtn");
const resetFiltersBtn = document.getElementById("resetFiltersBtn");
const searchResultsTitle = document.getElementById("searchResultsTitle");
const searchResultsList = document.getElementById("searchResultsList");
const taskTicketCheckboxes = Array.from(document.querySelectorAll('input[name="tickets"]'));

document.getElementById("prevMonthBtn").addEventListener("click", () => {
  state.currentMonthDate = new Date(
    state.currentMonthDate.getFullYear(),
    state.currentMonthDate.getMonth() - 1,
    1
  );
  renderCalendar();
});

document.getElementById("nextMonthBtn").addEventListener("click", () => {
  state.currentMonthDate = new Date(
    state.currentMonthDate.getFullYear(),
    state.currentMonthDate.getMonth() + 1,
    1
  );
  renderCalendar();
});

document.getElementById("todayBtn").addEventListener("click", () => {
  const today = new Date();
  state.currentMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
  state.selectedDate = toISODate(today);
  state.dayPanelOpen = true;
  renderAll();
});

applyTemplateBtn.addEventListener("click", () => {
  applySelectedTemplate();
});

taskTemplateSelect.addEventListener("change", () => {
  applySelectedTemplate();
});

taskTicketCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    applyTicketLinkVisibility();
  });
});

cancelEditBtn.addEventListener("click", () => {
  resetTaskFormToCreateMode();
});

closeDayPanelBtn.addEventListener("click", () => {
  closeDayPanel();
});

dayPanelBackdrop.addEventListener("click", () => {
  closeDayPanel();
});

closeQuickEditBtn.addEventListener("click", () => {
  closeQuickEdit();
});

cancelQuickEditBtn.addEventListener("click", () => {
  closeQuickEdit();
});

quickEditBackdrop.addEventListener("click", () => {
  closeQuickEdit();
});

quickTicketCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    applyQuickTicketLinkVisibility();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.dayPanelOpen) {
    closeDayPanel();
  }
  if (event.key === "Escape" && !quickEditModal.classList.contains("hidden")) {
    closeQuickEdit();
  }
});

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.search = {
    fromDate: filterFromDate.value || "",
    toDate: filterToDate.value || "",
    dayType: filterDayType.value || "ALL",
    quarter: filterQuarter.value || "ALL",
    year: normalizeFilterYear(filterYear.value),
  };
  renderSearchResults();
});

applyQuarterBtn.addEventListener("click", () => {
  const quarter = filterQuarter.value;
  const year = Number(normalizeFilterYear(filterYear.value));
  if (quarter === "ALL") return;

  const bounds = getQuarterBounds(year, quarter);
  filterFromDate.value = bounds.fromDate;
  filterToDate.value = bounds.toDate;
  state.search.fromDate = bounds.fromDate;
  state.search.toDate = bounds.toDate;
  state.search.quarter = quarter;
  state.search.year = String(year);
  renderSearchResults();
});

resetFiltersBtn.addEventListener("click", () => {
  filterFromDate.value = "";
  filterToDate.value = "";
  filterDayType.value = "ALL";
  filterQuarter.value = "ALL";
  filterYear.value = String(new Date().getFullYear());
  state.search = {
    fromDate: "",
    toDate: "",
    dayType: "ALL",
    quarter: "ALL",
    year: String(new Date().getFullYear()),
  };
  renderSearchResults();
});

technicianForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const name = String(technicianNameInput.value || "").trim();
  if (!name) return;

  const duplicate = state.technicians.some(
    (technician) => technician.toLowerCase() === name.toLowerCase()
  );
  if (duplicate) return;

  state.technicians.push(name);
  state.technicians.sort((a, b) => a.localeCompare(b));
  persistTechnicians();

  technicianForm.reset();
  renderTechnicians();
});

technicianList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("delete-tech-btn")) return;

  const { name } = target.dataset;
  if (!name) return;

  state.technicians = state.technicians.filter((technician) => technician !== name);
  persistTechnicians();
  renderTechnicians();
});

taskForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(taskForm);
  const technicians = form
    .getAll("technicians")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const tickets = form.getAll("tickets").filter((value) => TICKETS.includes(value));
  const officeLinks = collectOfficeLinks(form, tickets);
  const startDate = String(form.get("startDate") || "");
  const endDate = String(form.get("endDate") || "");

  const templateKey = String(form.get("template") || "");
  const template = TASK_TEMPLATES[templateKey] || null;
  const taskPayload = {
    title: String(form.get("title")).trim(),
    date: startDate,
    startDate,
    endDate,
    technicians,
    tickets,
    expectedTickets: template ? [...template.tickets] : [],
    templateKey: template ? templateKey : "",
    officeLinks,
    downtimeType: String(form.get("downtimeType")),
    notes: String(form.get("notes") || "").trim(),
  };

  if (!taskPayload.title || !taskPayload.startDate || !taskPayload.endDate) {
    return;
  }

  if (taskPayload.endDate < taskPayload.startDate) {
    alert("The end date must be on or after the start date.");
    return;
  }

  const now = new Date().toISOString();
  if (state.editingTaskId) {
    const index = state.tasks.findIndex((task) => task.id === state.editingTaskId);
    if (index !== -1) {
      state.tasks[index] = {
        ...state.tasks[index],
        ...taskPayload,
        updatedAt: now,
      };
    }
  } else {
    state.tasks.push({
      ...taskPayload,
      id: crypto.randomUUID(),
      createdAt: now,
    });
  }
  persistTasks();

  state.selectedDate = taskPayload.startDate;
  state.currentMonthDate = new Date(`${taskPayload.startDate}T00:00:00`);
  state.dayPanelOpen = true;
  resetTaskFormToCreateMode();
  renderAll();
});

taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains("edit-btn")) {
    const { id } = target.dataset;
    if (!id) return;
    const task = state.tasks.find((item) => item.id === id);
    if (!task) return;
    openQuickEdit(task);
    return;
  }

  if (target.classList.contains("delete-btn")) {
    const { id } = target.dataset;
    if (!id) return;
    state.tasks = state.tasks.filter((task) => task.id !== id);
    persistTasks();
    renderAll();
  }
});

searchResultsList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (!target.classList.contains("edit-btn")) return;
  const { id } = target.dataset;
  if (!id) return;
  const task = state.tasks.find((item) => item.id === id);
  if (!task) return;
  openQuickEdit(task);
});

quickEditForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const id = quickEditTaskId.value;
  if (!id) return;
  const index = state.tasks.findIndex((task) => task.id === id);
  if (index === -1) return;

  const form = new FormData(quickEditForm);
  const startDate = String(form.get("startDate") || "");
  const endDate = String(form.get("endDate") || "");
  if (!startDate || !endDate) return;
  if (endDate < startDate) {
    alert("The end date must be on or after the start date.");
    return;
  }

  const tickets = form.getAll("tickets").filter((value) => TICKETS.includes(value));
  const officeLinks = collectOfficeLinks(form, tickets, QUICK_OFFICE_LINK_INPUT_IDS);
  const technicians = form
    .getAll("technicians")
    .map((value) => String(value).trim())
    .filter(Boolean);

  state.tasks[index] = {
    ...state.tasks[index],
    title: String(form.get("title") || "").trim(),
    date: startDate,
    startDate,
    endDate,
    technicians,
    tickets,
    officeLinks,
    downtimeType: String(form.get("downtimeType") || "BACKEND"),
    notes: String(form.get("notes") || "").trim(),
    updatedAt: new Date().toISOString(),
  };
  persistTasks();
  state.selectedDate = startDate;
  state.currentMonthDate = new Date(`${startDate}T00:00:00`);
  closeQuickEdit();
  renderAll();
});

function renderAll() {
  renderCalendar();
  if (state.dayPanelOpen) {
    renderTasksForSelectedDate();
  }
  renderDayPanelVisibility();
  renderTechnicians();
  renderTaskFormMode();
  applyTicketLinkVisibility();
  syncSearchInputsFromState();
  renderSearchResults();
  if (!state.editingTaskId) {
    taskStartDateInput.value = state.selectedDate;
    taskEndDateInput.value = state.selectedDate;
  }
}

function renderCalendar() {
  const year = state.currentMonthDate.getFullYear();
  const month = state.currentMonthDate.getMonth();
  const monthStart = new Date(year, month, 1);
  const firstDayIndex = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  monthLabel.textContent = monthStart.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  calendarGrid.innerHTML = "";

  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  weekDays.forEach((name) => {
    const header = document.createElement("div");
    header.className = "badge";
    header.textContent = name;
    calendarGrid.appendChild(header);
  });

  for (let i = 0; i < 42; i += 1) {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "calendar-cell";

    let day;
    let muted = false;

    if (i < firstDayIndex) {
      day = daysInPrevMonth - firstDayIndex + i + 1;
      muted = true;
      cell.dataset.date = toISODate(new Date(year, month - 1, day));
    } else if (i >= firstDayIndex + daysInMonth) {
      day = i - (firstDayIndex + daysInMonth) + 1;
      muted = true;
      cell.dataset.date = toISODate(new Date(year, month + 1, day));
    } else {
      day = i - firstDayIndex + 1;
      cell.dataset.date = toISODate(new Date(year, month, day));
    }

    const date = parseISODate(cell.dataset.date);
    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = String(day);

    const dayTasks = getTasksForDate(cell.dataset.date);
    const eventsCount = dayTasks.length;
    const incompleteCount = dayTasks.filter((task) => getTaskCompletionIssues(task).length > 0).length;
    const badge = document.createElement("span");
    badge.className = "events-count";
    if (eventsCount > 0) {
      badge.textContent = `${eventsCount} ${eventsCount === 1 ? "task" : "tasks"}`;
    }
    const warningBadge = document.createElement("span");
    warningBadge.className = "warning-count";
    if (incompleteCount > 0) {
      warningBadge.textContent = `${incompleteCount} incomplete`;
      cell.classList.add("has-warning");
    }

    cell.appendChild(dayNumber);
    cell.appendChild(badge);
    cell.appendChild(warningBadge);

    if (muted) cell.classList.add("muted");
    if (isWeekend(date)) cell.classList.add("weekend");
    if (isHolidayItaly(date)) cell.classList.add("holiday");
    if (cell.dataset.date === state.selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", () => {
      state.selectedDate = cell.dataset.date;
      if (muted) {
        state.currentMonthDate = new Date(
          parseISODate(cell.dataset.date).getFullYear(),
          parseISODate(cell.dataset.date).getMonth(),
          1
        );
      }
      openDayPanel(state.selectedDate);
      renderAll();
    });

    calendarGrid.appendChild(cell);
  }
}

function renderTasksForSelectedDate() {
  const date = parseISODate(state.selectedDate);
  const dayType = getDayTypeLabel(date);

  tasksTitle.textContent = `${state.selectedDate} - ${dayType}`;
  const tasks = getTasksForDate(state.selectedDate);
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "No scheduled tasks.";
    taskList.appendChild(empty);
    return;
  }

  tasks
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .forEach((task) => {
      const node = taskItemTemplate.content.cloneNode(true);
      const taskItem = node.querySelector(".task-item");
      const title = node.querySelector(".task-title");
      const statusNode = node.querySelector(".task-status");
      const meta = node.querySelector(".task-meta");
      const alertNode = node.querySelector(".task-alert");
      const notes = node.querySelector(".task-notes");
      const deleteBtn = node.querySelector(".delete-btn");
      const editBtn = node.querySelector(".edit-btn");
      const taskMain = node.querySelector(".task-main");
      const issues = getTaskCompletionIssues(task);
      const isIncomplete = issues.length > 0;

      title.textContent = task.title;
      statusNode.textContent = isIncomplete ? "INCOMPLETE" : "COMPLETE";
      statusNode.className = `task-status ${isIncomplete ? "incomplete" : "complete"}`;
      meta.textContent = [
        `Range: ${getTaskDateRangeLabel(task)}`,
        `Technicians: ${task.technicians.length ? task.technicians.join(", ") : "None"}`,
        `Tickets: ${task.tickets.length ? task.tickets.join(", ") : "None"}`,
        `Downtime: ${task.downtimeType === "TOTAL" ? "Total" : "Backend only"}`,
      ].join(" | ");
      alertNode.textContent = isIncomplete ? `Attention: ${issues.join(" | ")}` : "";
      notes.textContent = task.notes ? `Notes: ${task.notes}` : "";
      deleteBtn.dataset.id = task.id;
      editBtn.dataset.id = task.id;
      if (isIncomplete) taskItem.classList.add("warning");
      const linksNode = buildSupportLinksNode(task.officeLinks);
      if (linksNode) taskMain.appendChild(linksNode);

      taskList.appendChild(node);
    });
}

function openDayPanel(dateISO) {
  state.selectedDate = dateISO;
  state.dayPanelOpen = true;
}

function closeDayPanel() {
  state.dayPanelOpen = false;
  renderAll();
}

function renderDayPanelVisibility() {
  dayPanel.classList.toggle("hidden", !state.dayPanelOpen);
  dayPanelBackdrop.classList.toggle("hidden", !state.dayPanelOpen);
}

function renderTechnicians() {
  const selectedValues = new Set(
    Array.from(taskTechniciansSelect.selectedOptions).map((option) => option.value)
  );
  taskTechniciansSelect.innerHTML = "";
  technicianList.innerHTML = "";

  if (state.technicians.length === 0) {
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "No technicians available yet";
    placeholder.disabled = true;
    placeholder.selected = true;
    taskTechniciansSelect.appendChild(placeholder);
    taskTechniciansSelect.required = false;
  } else {
    taskTechniciansSelect.required = false;
    state.technicians.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = selectedValues.has(name);
      taskTechniciansSelect.appendChild(option);

      const listItem = document.createElement("li");
      listItem.className = "technician-item";

      const nameSpan = document.createElement("span");
      nameSpan.textContent = name;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "danger delete-tech-btn";
      deleteButton.dataset.name = name;
      deleteButton.textContent = "Remove";

      listItem.appendChild(nameSpan);
      listItem.appendChild(deleteButton);
      technicianList.appendChild(listItem);
    });
  }
}

function renderSearchResults() {
  const filteredTasks = state.tasks
    .filter((task) => matchesSearchFilters(task, state.search))
    .sort((a, b) => {
      const aStart = getTaskStartDate(a);
      const bStart = getTaskStartDate(b);
      if (aStart !== bStart) return aStart.localeCompare(bStart);
      return a.createdAt.localeCompare(b.createdAt);
    });

  searchResultsList.innerHTML = "";
  searchResultsTitle.textContent = `Results: ${filteredTasks.length} ${
    filteredTasks.length === 1 ? "task" : "tasks"
  }`;

  if (filteredTasks.length === 0) {
    const empty = document.createElement("li");
    empty.className = "task-item";
    empty.textContent = "No tasks match the selected criteria.";
    searchResultsList.appendChild(empty);
    return;
  }

  filteredTasks.forEach((task) => {
    const item = document.createElement("li");
    item.className = "task-item";
    const issues = getTaskCompletionIssues(task);
    if (issues.length) item.classList.add("warning");

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = task.title;
    const statusNode = document.createElement("p");
    const isIncomplete = issues.length > 0;
    statusNode.className = `task-status ${isIncomplete ? "incomplete" : "complete"}`;
    statusNode.textContent = isIncomplete ? "INCOMPLETE" : "COMPLETE";

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = [
      `Range: ${getTaskDateRangeLabel(task)}`,
      `Start day type: ${getDayTypeLabel(parseISODate(getTaskStartDate(task)))}`,
      `Technicians: ${task.technicians.length ? task.technicians.join(", ") : "None"}`,
      `Tickets: ${task.tickets.length ? task.tickets.join(", ") : "None"}`,
      `Downtime: ${task.downtimeType === "TOTAL" ? "Total" : "Backend only"}`,
    ].join(" | ");

    const alertNode = document.createElement("p");
    alertNode.className = "task-alert";
    alertNode.textContent = issues.length ? `Attention: ${issues.join(" | ")}` : "";

    const notes = document.createElement("p");
    notes.className = "task-notes";
    notes.textContent = task.notes ? `Notes: ${task.notes}` : "";

    main.appendChild(title);
    main.appendChild(statusNode);
    main.appendChild(meta);
    if (issues.length) main.appendChild(alertNode);
    main.appendChild(notes);
    const linksNode = buildSupportLinksNode(task.officeLinks);
    if (linksNode) main.appendChild(linksNode);
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "edit-btn";
    editBtn.dataset.id = task.id;
    editBtn.textContent = "Edit";
    actions.appendChild(editBtn);
    item.appendChild(main);
    item.appendChild(actions);
    searchResultsList.appendChild(item);
  });
}

function syncSearchInputsFromState() {
  filterFromDate.value = state.search.fromDate;
  filterToDate.value = state.search.toDate;
  filterDayType.value = state.search.dayType;
  filterQuarter.value = state.search.quarter;
  filterYear.value = state.search.year;
}

function matchesSearchFilters(task, filters) {
  const taskStartDate = getTaskStartDate(task);
  const taskEndDate = getTaskEndDate(task);
  if (filters.fromDate && taskEndDate < filters.fromDate) return false;
  if (filters.toDate && taskStartDate > filters.toDate) return false;

  if (filters.dayType !== "ALL") {
    if (!rangeHasDayType(taskStartDate, taskEndDate, filters.dayType)) return false;
  }

  if (filters.quarter !== "ALL") {
    const bounds = getQuarterBounds(Number(normalizeFilterYear(filters.year)), filters.quarter);
    if (taskEndDate < bounds.fromDate || taskStartDate > bounds.toDate) return false;
  }

  return true;
}

function applySelectedTemplate() {
  const templateKey = taskTemplateSelect.value;
  if (!templateKey || !TASK_TEMPLATES[templateKey]) return;

  const template = TASK_TEMPLATES[templateKey];
  const titleInput = taskForm.elements.namedItem("title");
  const downtimeSelect = taskForm.elements.namedItem("downtimeType");
  if (titleInput) titleInput.value = template.title;
  if (downtimeSelect) downtimeSelect.value = template.downtimeType;

  taskTicketCheckboxes.forEach((checkbox) => {
    checkbox.checked = template.tickets.includes(checkbox.value);
  });
  applyTicketLinkVisibility();
}

function applyTicketLinkVisibility() {
  const selectedTickets = new Set(
    taskTicketCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value)
  );

  TICKETS.forEach((ticket) => {
    const row = document.querySelector(`[data-ticket-link-row="${ticket}"]`);
    const input = document.getElementById(OFFICE_LINK_INPUT_IDS[ticket]);
    if (!row || !input) return;
    const visible = selectedTickets.has(ticket);
    row.classList.toggle("hidden", !visible);
    if (!visible) input.value = "";
  });
}

function applyQuickTicketLinkVisibility() {
  const selectedTickets = new Set(
    quickTicketCheckboxes.filter((checkbox) => checkbox.checked).map((checkbox) => checkbox.value)
  );
  TICKETS.forEach((ticket) => {
    const row = document.querySelector(`[data-quick-ticket-link-row="${ticket}"]`);
    const input = document.getElementById(QUICK_OFFICE_LINK_INPUT_IDS[ticket]);
    if (!row || !input) return;
    const visible = selectedTickets.has(ticket);
    row.classList.toggle("hidden", !visible);
    if (!visible) input.value = "";
  });
}

function collectOfficeLinks(form, tickets, map = OFFICE_LINK_INPUT_IDS) {
  const officeLinks = {};
  tickets.forEach((ticket) => {
    const inputName = map[ticket];
    const value = String(form.get(inputName) || "").trim();
    if (value) officeLinks[ticket] = value;
  });
  return officeLinks;
}

function buildSupportLinksNode(officeLinks) {
  const normalized = normalizeOfficeLinks(officeLinks);
  const entries = Object.entries(normalized);
  if (entries.length === 0) return null;

  const container = document.createElement("p");
  container.className = "support-links";
  const prefix = document.createElement("span");
  prefix.textContent = "Support links:";
  container.appendChild(prefix);

  entries.forEach(([office, url]) => {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = office;
    container.appendChild(link);
  });
  return container;
}

function openQuickEdit(task) {
  quickEditTaskId.value = task.id;
  quickEditTitle.value = task.title || "";
  quickEditStartDate.value = getTaskStartDate(task);
  quickEditEndDate.value = getTaskEndDate(task);
  quickEditDowntimeType.value = task.downtimeType || "BACKEND";
  quickEditNotes.value = task.notes || "";

  renderQuickEditTechnicians(task.technicians || []);

  quickTicketCheckboxes.forEach((checkbox) => {
    checkbox.checked = task.tickets.includes(checkbox.value);
  });
  TICKETS.forEach((ticket) => {
    const input = document.getElementById(QUICK_OFFICE_LINK_INPUT_IDS[ticket]);
    if (!input) return;
    input.value = task.officeLinks?.[ticket] || "";
  });
  applyQuickTicketLinkVisibility();

  quickEditModal.classList.remove("hidden");
  quickEditBackdrop.classList.remove("hidden");
}

function closeQuickEdit() {
  quickEditForm.reset();
  quickEditModal.classList.add("hidden");
  quickEditBackdrop.classList.add("hidden");
}

function renderQuickEditTechnicians(selected) {
  const selectedSet = new Set(selected);
  quickEditTechnicians.innerHTML = "";
  if (state.technicians.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No technicians available yet";
    option.disabled = true;
    option.selected = true;
    quickEditTechnicians.appendChild(option);
    return;
  }
  state.technicians.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = selectedSet.has(name);
    quickEditTechnicians.appendChild(option);
  });
}

function enterEditMode(task) {
  state.editingTaskId = task.id;
  taskTemplateSelect.value = task.templateKey || "";
  taskForm.elements.namedItem("title").value = task.title || "";
  taskStartDateInput.value = getTaskStartDate(task);
  taskEndDateInput.value = getTaskEndDate(task);
  taskForm.elements.namedItem("downtimeType").value = task.downtimeType || "BACKEND";
  taskForm.elements.namedItem("notes").value = task.notes || "";

  taskTicketCheckboxes.forEach((checkbox) => {
    checkbox.checked = task.tickets.includes(checkbox.value);
  });
  TICKETS.forEach((ticket) => {
    const input = document.getElementById(OFFICE_LINK_INPUT_IDS[ticket]);
    if (!input) return;
    input.value = task.officeLinks?.[ticket] || "";
  });

  Array.from(taskTechniciansSelect.options).forEach((option) => {
    option.selected = task.technicians.includes(option.value);
  });

  renderTaskFormMode();
  applyTicketLinkVisibility();
  taskForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetTaskFormToCreateMode() {
  state.editingTaskId = null;
  taskForm.reset();
  taskTemplateSelect.value = "";
  applyTicketLinkVisibility();
  taskStartDateInput.value = state.selectedDate;
  taskEndDateInput.value = state.selectedDate;
  renderTaskFormMode();
}

function renderTaskFormMode() {
  const isEditing = Boolean(state.editingTaskId);
  taskFormModeLabel.textContent = isEditing ? "Edit mode" : "Create mode";
  taskSubmitBtn.textContent = isEditing ? "Save changes" : "Add task";
  cancelEditBtn.classList.toggle("hidden", !isEditing);
}

function getTaskCompletionIssues(task) {
  const issues = [];
  if (!task.technicians || task.technicians.length === 0) {
    issues.push("No technician assigned");
  }

  const expectedTickets = getExpectedTickets(task);
  if (expectedTickets.length) {
    const missing = expectedTickets.filter((ticket) => !task.tickets.includes(ticket));
    if (missing.length) issues.push(`Missing expected tickets: ${missing.join(", ")}`);
  }
  const missingLinks = getMissingJiraLinks(task);
  if (missingLinks.length) {
    issues.push(`Missing Jira links: ${missingLinks.join(", ")}`);
  }
  return issues;
}

function getExpectedTickets(task) {
  if (Array.isArray(task.expectedTickets)) {
    return task.expectedTickets.filter((ticket) => TICKETS.includes(ticket));
  }
  if (task.templateKey && TASK_TEMPLATES[task.templateKey]) {
    return TASK_TEMPLATES[task.templateKey].tickets.filter((ticket) => TICKETS.includes(ticket));
  }
  return [];
}

function getMissingJiraLinks(task) {
  const links = normalizeOfficeLinks(task.officeLinks);
  return (task.tickets || []).filter((ticket) => !links[ticket]);
}

function getTasksForDate(dateISO) {
  return state.tasks.filter((task) => {
    const startDate = getTaskStartDate(task);
    const endDate = getTaskEndDate(task);
    return dateISO >= startDate && dateISO <= endDate;
  });
}

function getTaskStartDate(task) {
  return typeof task.startDate === "string" && task.startDate ? task.startDate : task.date;
}

function getTaskEndDate(task) {
  if (typeof task.endDate === "string" && task.endDate) return task.endDate;
  return getTaskStartDate(task);
}

function getTaskDateRangeLabel(task) {
  const startDate = getTaskStartDate(task);
  const endDate = getTaskEndDate(task);
  if (startDate === endDate) return startDate;
  return `${startDate} -> ${endDate}`;
}

function rangeHasDayType(startDateISO, endDateISO, dayType) {
  let cursor = parseISODate(startDateISO);
  const end = parseISODate(endDateISO);
  while (cursor <= end) {
    if (getDayType(cursor) === dayType) return true;
    cursor.setDate(cursor.getDate() + 1);
  }
  return false;
}

function persistTasks() {
  persistAppState();
}

function persistTechnicians() {
  persistAppState();
}

function persistAppState() {
  try {
    localStorage.setItem(
      APP_STATE_STORAGE_KEY,
      JSON.stringify({
        tasks: state.tasks,
        technicians: state.technicians,
      })
    );
    // Keep legacy keys in sync for backwards compatibility.
    localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(state.tasks));
    localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(state.technicians));
  } catch {
    // Ignore storage errors (private mode/quota); app still works in-memory.
  }
}

function loadAppState() {
  try {
    const rawState = localStorage.getItem(APP_STATE_STORAGE_KEY);
    if (rawState) {
      const parsedState = JSON.parse(rawState);
      if (parsedState && typeof parsedState === "object") {
        return {
          tasks: normalizeTasks(parsedState.tasks),
          technicians: normalizeTechnicianList(parsedState.technicians),
        };
      }
    }
  } catch {
    // Fallback to legacy keys below.
  }

  try {
    const rawLegacyTasks = localStorage.getItem(TASKS_STORAGE_KEY);
    const rawLegacyTechnicians = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
    const legacyTasks = rawLegacyTasks ? normalizeTasks(JSON.parse(rawLegacyTasks)) : [];
    const legacyTechnicians = rawLegacyTechnicians
      ? normalizeTechnicianList(JSON.parse(rawLegacyTechnicians))
      : [];
    return { tasks: legacyTasks, technicians: legacyTechnicians };
  } catch {
    return { tasks: [], technicians: [] };
  }
}

function normalizeTasks(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((task) => task && typeof task === "object")
    .map((task) => {
      const startDate = typeof task.startDate === "string" && task.startDate ? task.startDate : task.date;
      const endDate = typeof task.endDate === "string" && task.endDate ? task.endDate : startDate;
      const normalized = {
        id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
        title: String(task.title || "").trim(),
        date: typeof startDate === "string" ? startDate : "",
        startDate: typeof startDate === "string" ? startDate : "",
        endDate:
          typeof endDate === "string" && endDate >= startDate ? endDate : typeof startDate === "string" ? startDate : "",
        templateKey:
          typeof task.templateKey === "string" && TASK_TEMPLATES[task.templateKey] ? task.templateKey : "",
        expectedTickets: normalizeExpectedTickets(task.expectedTickets, task.templateKey),
        technicians: normalizeTechnicians(task.technicians),
        tickets: Array.isArray(task.tickets)
          ? task.tickets.map((ticket) => String(ticket)).filter((ticket) => TICKETS.includes(ticket))
          : [],
        officeLinks: normalizeOfficeLinks(task.officeLinks),
        downtimeType: task.downtimeType === "TOTAL" ? "TOTAL" : "BACKEND",
        notes: String(task.notes || "").trim(),
        createdAt:
          typeof task.createdAt === "string" && task.createdAt
            ? task.createdAt
            : new Date().toISOString(),
      };
      return normalized;
    })
    .filter((task) => task.date);
}

function normalizeTechnicianList(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set(
    value
      .filter((name) => typeof name === "string" && name.trim())
      .map((name) => name.trim())
  );
  return Array.from(unique).sort((a, b) => a.localeCompare(b));
}

function normalizeTechnicians(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return [];
}

function normalizeOfficeLinks(value) {
  if (!value || typeof value !== "object") return {};
  const normalized = {};
  TICKETS.forEach((ticket) => {
    const raw = value[ticket];
    if (typeof raw === "string" && raw.trim()) normalized[ticket] = raw.trim();
  });
  return normalized;
}

function normalizeExpectedTickets(value, templateKey) {
  if (Array.isArray(value)) {
    return value.map((ticket) => String(ticket)).filter((ticket) => TICKETS.includes(ticket));
  }
  if (templateKey && TASK_TEMPLATES[templateKey]) {
    return TASK_TEMPLATES[templateKey].tickets.filter((ticket) => TICKETS.includes(ticket));
  }
  return [];
}

function parseISODate(dateString) {
  return new Date(`${dateString}T00:00:00`);
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function getDayType(date) {
  if (isHolidayItaly(date)) return "HOLIDAY";
  if (isWeekend(date)) return "WEEKEND";
  return "WEEKDAY";
}

function getDayTypeLabel(date) {
  const dayType = getDayType(date);
  if (dayType === "HOLIDAY") return "Holiday";
  if (dayType === "WEEKEND") return "Weekend";
  return "Weekday";
}

function normalizeFilterYear(value) {
  const fallbackYear = String(new Date().getFullYear());
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 2000 || parsed > 2100) return fallbackYear;
  return String(parsed);
}

function getQuarterBounds(year, quarter) {
  const safeYear = Number.isInteger(year) ? year : new Date().getFullYear();
  const ranges = {
    Q1: { startMonth: 0, endMonth: 2 },
    Q2: { startMonth: 3, endMonth: 5 },
    Q3: { startMonth: 6, endMonth: 8 },
    Q4: { startMonth: 9, endMonth: 11 },
  };
  const selected = ranges[quarter] || ranges.Q1;
  const fromDate = toISODate(new Date(safeYear, selected.startMonth, 1));
  const toDate = toISODate(new Date(safeYear, selected.endMonth + 1, 0));
  return { fromDate, toDate };
}

function isHolidayItaly(date) {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const fixedHolidays = new Set([
    "01-01",
    "01-06",
    "04-25",
    "05-01",
    "06-02",
    "08-15",
    "11-01",
    "12-08",
    "12-25",
    "12-26",
  ]);
  if (fixedHolidays.has(mmdd)) return true;

  const easter = calculateEaster(date.getFullYear());
  const easterMonday = new Date(easter);
  easterMonday.setDate(easterMonday.getDate() + 1);
  return isSameDay(date, easter) || isSameDay(date, easterMonday);
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function calculateEaster(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

persistAppState();
renderAll();
