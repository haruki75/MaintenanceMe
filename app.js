const APP_STATE_STORAGE_KEY = "maintenance-me-state-v1";
const TASKS_STORAGE_KEY = "maintenance-me-tasks-v1";
const TECHNICIANS_STORAGE_KEY = "maintenance-me-technicians-v1";
const TICKETS = ["SAAS", "DSO", "DEV"];
const loadedState = loadAppState();

const state = {
  currentMonthDate: new Date(),
  selectedDate: toISODate(new Date()),
  tasks: loadedState.tasks,
  technicians: loadedState.technicians,
};

const monthLabel = document.getElementById("monthLabel");
const calendarGrid = document.getElementById("calendarGrid");
const taskForm = document.getElementById("taskForm");
const taskDateInput = document.getElementById("taskDateInput");
const taskTechniciansSelect = document.getElementById("taskTechniciansSelect");
const tasksTitle = document.getElementById("tasksTitle");
const taskList = document.getElementById("taskList");
const taskItemTemplate = document.getElementById("taskItemTemplate");
const technicianForm = document.getElementById("technicianForm");
const technicianNameInput = document.getElementById("technicianNameInput");
const technicianList = document.getElementById("technicianList");

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

  const task = {
    id: crypto.randomUUID(),
    title: String(form.get("title")).trim(),
    date: String(form.get("date")),
    technicians,
    tickets,
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
  const isHoliday = isHolidayItaly(date);
  const dayType = isHoliday ? "Holiday" : isWeekend(date) ? "Weekend" : "Weekday";

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

      title.textContent = task.title;
      meta.textContent = [
        `Technicians: ${task.technicians.join(", ")}`,
        `Tickets: ${task.tickets.length ? task.tickets.join(", ") : "None"}`,
        `Downtime: ${task.downtimeType === "TOTAL" ? "Total" : "Backend only"}`,
      ].join(" | ");
      notes.textContent = task.notes ? `Notes: ${task.notes}` : "";
      deleteBtn.dataset.id = task.id;

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
