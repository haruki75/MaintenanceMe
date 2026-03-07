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
const loadedState = loadAppState();

const state = {
  currentMonthDate: new Date(),
  selectedDate: toISODate(new Date()),
  tasks: loadedState.tasks,
  technicians: loadedState.technicians,
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
const taskDateInput = document.getElementById("taskDateInput");
const taskTechniciansSelect = document.getElementById("taskTechniciansSelect");
const taskTemplateSelect = document.getElementById("taskTemplateSelect");
const applyTemplateBtn = document.getElementById("applyTemplateBtn");
const tasksTitle = document.getElementById("tasksTitle");
const taskList = document.getElementById("taskList");
const taskItemTemplate = document.getElementById("taskItemTemplate");
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

  const task = {
    id: crypto.randomUUID(),
    title: String(form.get("title")).trim(),
    date: String(form.get("date")),
    technicians,
    tickets,
    officeLinks,
    downtimeType: String(form.get("downtimeType")),
    notes: String(form.get("notes") || "").trim(),
    createdAt: new Date().toISOString(),
  };

  if (!task.title || !task.date || task.technicians.length === 0) {
    return;
  }

  state.tasks.push(task);
  persistTasks();

  state.selectedDate = task.date;
  state.currentMonthDate = new Date(`${task.date}T00:00:00`);
  taskForm.reset();
  taskTemplateSelect.value = "";
  applyTicketLinkVisibility();
  taskDateInput.value = state.selectedDate;
  renderAll();
});

taskList.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains("delete-btn")) {
    const { id } = target.dataset;
    if (!id) return;
    state.tasks = state.tasks.filter((task) => task.id !== id);
    persistTasks();
    renderAll();
  }
});

function renderAll() {
  renderCalendar();
  renderTasksForSelectedDate();
  renderTechnicians();
  applyTicketLinkVisibility();
  syncSearchInputsFromState();
  renderSearchResults();
  taskDateInput.value = state.selectedDate;
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

    const eventsCount = getTasksForDate(cell.dataset.date).length;
    const badge = document.createElement("span");
    badge.className = "events-count";
    if (eventsCount > 0) {
      badge.textContent = `${eventsCount} ${eventsCount === 1 ? "task" : "tasks"}`;
    }

    cell.appendChild(dayNumber);
    cell.appendChild(badge);

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
      const title = node.querySelector(".task-title");
      const meta = node.querySelector(".task-meta");
      const notes = node.querySelector(".task-notes");
      const deleteBtn = node.querySelector(".delete-btn");
      const taskMain = node.querySelector(".task-main");

      title.textContent = task.title;
      meta.textContent = [
        `Technicians: ${task.technicians.join(", ")}`,
        `Tickets: ${task.tickets.length ? task.tickets.join(", ") : "None"}`,
        `Downtime: ${task.downtimeType === "TOTAL" ? "Total" : "Backend only"}`,
      ].join(" | ");
      notes.textContent = task.notes ? `Notes: ${task.notes}` : "";
      deleteBtn.dataset.id = task.id;
      const linksNode = buildSupportLinksNode(task.officeLinks);
      if (linksNode) taskMain.appendChild(linksNode);

      taskList.appendChild(node);
    });
}

function renderTechnicians() {
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
    taskTechniciansSelect.required = true;
    state.technicians.forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
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
      if (a.date !== b.date) return a.date.localeCompare(b.date);
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

    const main = document.createElement("div");
    main.className = "task-main";

    const title = document.createElement("h3");
    title.className = "task-title";
    title.textContent = `${task.title} (${task.date})`;

    const meta = document.createElement("p");
    meta.className = "task-meta";
    meta.textContent = [
      `Type: ${getDayTypeLabel(parseISODate(task.date))}`,
      `Technicians: ${task.technicians.join(", ")}`,
      `Tickets: ${task.tickets.length ? task.tickets.join(", ") : "None"}`,
      `Downtime: ${task.downtimeType === "TOTAL" ? "Total" : "Backend only"}`,
    ].join(" | ");

    const notes = document.createElement("p");
    notes.className = "task-notes";
    notes.textContent = task.notes ? `Notes: ${task.notes}` : "";

    main.appendChild(title);
    main.appendChild(meta);
    main.appendChild(notes);
    const linksNode = buildSupportLinksNode(task.officeLinks);
    if (linksNode) main.appendChild(linksNode);
    item.appendChild(main);
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
  if (filters.fromDate && task.date < filters.fromDate) return false;
  if (filters.toDate && task.date > filters.toDate) return false;

  const taskDate = parseISODate(task.date);
  if (filters.dayType !== "ALL") {
    const taskDayType = getDayType(taskDate);
    if (taskDayType !== filters.dayType) return false;
  }

  if (filters.quarter !== "ALL") {
    const bounds = getQuarterBounds(Number(normalizeFilterYear(filters.year)), filters.quarter);
    if (task.date < bounds.fromDate || task.date > bounds.toDate) return false;
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

function collectOfficeLinks(form, tickets) {
  const officeLinks = {};
  tickets.forEach((ticket) => {
    const inputName = OFFICE_LINK_INPUT_IDS[ticket];
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

function getTasksForDate(dateISO) {
  return state.tasks.filter((task) => task.date === dateISO);
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
      const normalized = {
        id: typeof task.id === "string" && task.id ? task.id : crypto.randomUUID(),
        title: String(task.title || "").trim(),
        date: typeof task.date === "string" ? task.date : "",
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
