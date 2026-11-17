"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const TASKS_KEY = "clientflow_tasks_v1";
    const CLIENTS_KEY = "clientflow_clients_v1";
    const $ = id => document.getElementById(id);

    const statuses = [
        "Not Started", "In Progress", "Blocked", "Completed"
    ];

    const priorities = ["Low", "Medium", "High"];

    let tasks = [];
    let storageReady = false;

    function todayLocal() {
        const d = new Date();

        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }

    function getClients() {
        try {
            const stored = JSON.parse(
                localStorage.getItem(CLIENTS_KEY) || "[]"
            );

            return Array.isArray(stored)
                ? stored.filter(c => c && typeof c.id === "string")
                : [];

        } catch (error) {
            return [];
        }
    }

    function notify(message, isError = false) {
        const feedback = $("feedback");
        feedback.textContent = message;
        feedback.classList.toggle("error", isError);
    }

    function readTasks() {
        try {
            const testKey = "clientflow_tasks_storage_test";

            localStorage.setItem(testKey, "ok");
            localStorage.removeItem(testKey);

            const stored = JSON.parse(
                localStorage.getItem(TASKS_KEY) || "[]"
            );

            if (
                !Array.isArray(stored) ||
                !stored.every(task =>
                    task &&
                    typeof task.id === "string" &&
                    typeof task.clientId === "string" &&
                    typeof task.title === "string" &&
                    typeof task.owner === "string" &&
                    typeof task.dueDate === "string" &&
                    statuses.includes(task.status) &&
                    priorities.includes(task.priority)
                )
            ) {
                throw new Error("Invalid task data");
            }

            tasks = stored;
            storageReady = true;

        } catch (error) {
            storageReady = false;
            $("tasks-storage-error").hidden = false;
            $("task-save").disabled = true;
        }
    }

    function persistTasks(nextTasks) {
        if (!storageReady) {
            notify("Task storage is unavailable. Nothing was saved.", true);
            return false;
        }

        try {
            localStorage.setItem(
                TASKS_KEY,
                JSON.stringify(nextTasks)
            );

            tasks = nextTasks;
            renderAllTasks();
            window.dispatchEvent(new Event("clientflow:tasks-changed"));

            return true;

        } catch (error) {
            notify("Unable to save task data in this browser.", true);
            return false;
        }
    }

    function replaceOptions(select, options, placeholder) {
        const previous = select.value;

        select.replaceChildren();

        const first = new Option(placeholder, "");
        select.add(first);

        options.forEach(client => {
            select.add(new Option(client.company, client.id));
        });

        if (options.some(client => client.id === previous)) {
            select.value = previous;
        }
    }

    function refreshClientOptions() {
        const clients = getClients().sort((a, b) =>
            String(a.company).localeCompare(String(b.company))
        );

        replaceOptions(
            $("task-client"),
            clients,
            "Select client"
        );

        const filter = $("tasks-filter-client");
        const previousFilter = filter.value;

        filter.replaceChildren();
        filter.add(new Option("All clients", "all"));

        clients.forEach(client => {
            filter.add(new Option(client.company, client.id));
        });

        if (
            previousFilter === "all" ||
            clients.some(c => c.id === previousFilter)
        ) {
            filter.value = previousFilter;
        }

        $("tasks-no-clients").hidden = clients.length > 0;

        $("task-save").disabled =
            !storageReady || clients.length === 0;
    }

    function resetTaskForm() {
        $("task-form").reset();
        $("task-client").disabled = false;

        $("task-id").value = "";
        $("task-status").value = "Not Started";
        $("task-priority").value = "Medium";

        $("task-form-title").textContent = "Create a Task";
        $("task-save").textContent = "Save Task";
        $("task-cancel").hidden = true;
    }

    function taskIsOverdue(task) {
        return task.status !== "Completed" &&
            task.dueDate < todayLocal();
    }

    function renderTaskMetrics() {
        const total = tasks.length;

        const completed = tasks.filter(
            t => t.status === "Completed"
        ).length;

        const open = total - completed;

        const overdue = tasks.filter(taskIsOverdue).length;

        const rate = total
            ? Math.round(completed * 100 / total)
            : 0;

        $("task-stat-total").textContent = total;
        $("task-stat-open").textContent = open;
        $("task-stat-completed").textContent = completed;
        $("task-stat-overdue").textContent = overdue;

        $("dashboard-task-total").textContent = total;
        $("dashboard-task-overdue").textContent = overdue;
        $("dashboard-task-rate").textContent = rate + "%";
    }

    function createCell(value) {
        const cell = document.createElement("td");
        cell.textContent = value || "-";
        return cell;
    }

    function createAction(label, action, id, style = "secondary") {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "btn btn-small btn-" + style;
        button.textContent = label;

        button.dataset.taskAction = action;
        button.dataset.taskId = id;

        return button;
    }

    function renderTaskTable() {
        const clients = new Map(
            getClients().map(c => [c.id, c.company])
        );

        const query = $("tasks-search").value
            .toLowerCase().trim();

        const clientFilter = $("tasks-filter-client").value;
        const statusFilter = $("tasks-filter-status").value;
        const priorityFilter = $("tasks-filter-priority").value;

        const filtered = tasks.filter(task => {
            const clientName =
                clients.get(task.clientId) || "Deleted client";

            const searchable = [
                task.title,
                task.description || "",
                task.owner,
                clientName
            ].join(" ").toLowerCase();

            return searchable.includes(query) &&
                (
                    clientFilter === "all" ||
                    clientFilter === task.clientId
                ) &&
                (
                    statusFilter === "all" ||
                    statusFilter === task.status
                ) &&
                (
                    priorityFilter === "all" ||
                    priorityFilter === task.priority
                );

        }).sort((a, b) =>
            a.dueDate.localeCompare(b.dueDate) ||
            a.title.localeCompare(b.title)
        );

        $("task-result-count").textContent =
            filtered.length + " shown of " +
            tasks.length + " tasks";

        const body = $("tasks-table-body");
        body.replaceChildren();

        filtered.forEach(task => {
            const row = document.createElement("tr");

            const taskCell = document.createElement("td");
            const title = document.createElement("strong");

            title.textContent = task.title;
            taskCell.appendChild(title);

            if (task.description) {
                const description = document.createElement("div");
                description.className = "task-description";
                description.textContent = task.description;
                taskCell.appendChild(description);
            }

            row.appendChild(taskCell);

            row.appendChild(
                createCell(
                    clients.get(task.clientId) || "Deleted client"
                )
            );

            row.appendChild(createCell(task.owner));

            const dueCell = createCell(task.dueDate);

            if (taskIsOverdue(task)) {
                dueCell.classList.add("task-overdue");
                dueCell.title = "Overdue";
            }

            row.appendChild(dueCell);

            const priorityCell = document.createElement("td");
            const priority = document.createElement("span");

            priority.className =
                "task-pill priority-" + task.priority.toLowerCase();

            priority.textContent = task.priority;
            priorityCell.appendChild(priority);
            row.appendChild(priorityCell);

            const statusCell = document.createElement("td");
            const status = document.createElement("span");

            status.className =
                "task-pill status-" +
                task.status.toLowerCase().replaceAll(" ", "-");

            status.textContent = task.status;
            statusCell.appendChild(status);
            row.appendChild(statusCell);

            const actionCell = document.createElement("td");
            const actions = document.createElement("div");

            actions.className = "action-buttons";

            actions.appendChild(
                createAction(
                    task.status === "Completed"
                        ? "Reopen"
                        : "Complete",
                    "toggle",
                    task.id
                )
            );

            actions.appendChild(
                createAction("Edit", "edit", task.id)
            );

            actions.appendChild(
                createAction("Delete", "delete", task.id, "danger")
            );

            actionCell.appendChild(actions);
            row.appendChild(actionCell);
            body.appendChild(row);
        });

        $("tasks-empty").hidden = filtered.length > 0;

        $("tasks-empty").textContent = tasks.length
            ? "No tasks match the selected filters."
            : "No tasks yet. Create your first task above.";
    }

    function renderAllTasks() {
        renderTaskMetrics();
        renderTaskTable();
    }

    function editTask(id) {
        const task = tasks.find(t => t.id === id);
        if (!task) return;

        refreshClientOptions();

        $("task-id").value = task.id;
        $("task-client").value = task.clientId;
        $("task-client").disabled = Boolean(task.templateStepId);
        $("task-title").value = task.title;
        $("task-description").value = task.description || "";
        $("task-owner").value = task.owner;
        $("task-due-date").value = task.dueDate;
        $("task-priority").value = task.priority;
        $("task-status").value = task.status;

        $("task-form-title").textContent = "Edit Task";
        $("task-save").textContent = "Update Task";
        $("task-cancel").hidden = false;

        $("task-form").scrollIntoView({
            behavior: "smooth"
        });

        $("task-title").focus();
    }

    function saveFromForm(event) {
        event.preventDefault();

        if (!storageReady) return;

        const existingId = $("task-id").value;
        const existing = tasks.find(t => t.id === existingId);

        if (existingId && !existing) {
            notify("This task could not be found.", true);
            return;
        }

        const clientId = $("task-client").value;

        if (!getClients().some(c => c.id === clientId)) {
            notify("Please select an existing client.", true);
            return;
        }

        const task = {
            id: existingId ||
                "task_" + Date.now().toString(36) +
                Math.random().toString(36).slice(2, 9),

            clientId: existing && existing.templateStepId ? existing.clientId : clientId,
            templateStepId: existing ? existing.templateStepId : undefined,
            title: $("task-title").value.trim(),
            description: $("task-description").value.trim(),
            owner: $("task-owner").value.trim(),
            dueDate: $("task-due-date").value,
            priority: $("task-priority").value,
            status: $("task-status").value,

            createdAt: existing
                ? existing.createdAt
                : new Date().toISOString(),

            updatedAt: new Date().toISOString()
        };

        if (
            !task.title ||
            !task.owner ||
            !task.dueDate ||
            !statuses.includes(task.status) ||
            !priorities.includes(task.priority)
        ) {
            notify("Please complete all required task fields.", true);
            return;
        }

        const next = existing
            ? tasks.map(t => t.id === existing.id ? task : t)
            : [task, ...tasks];

        if (persistTasks(next)) {
            resetTaskForm();

            notify(
                existing
                    ? "Task updated successfully."
                    : "Task created successfully."
            );
        }
    }

    function actOnTask(event) {
        const button = event.target.closest(
            "button[data-task-action]"
        );

        if (!button) return;

        const task = tasks.find(
            t => t.id === button.dataset.taskId
        );

        if (!task) return;

        const action = button.dataset.taskAction;

        if (action === "edit") {
            editTask(task.id);

        } else if (action === "delete") {
            const confirmed = window.confirm(
                "Delete task '" + task.title +
                "'? This cannot be undone."
            );

            if (!confirmed) return;

            if (
                persistTasks(
                    tasks.filter(t => t.id !== task.id)
                )
            ) {
                if ($("task-id").value === task.id) {
                    resetTaskForm();
                }

                notify("Task deleted successfully.");
            }

        } else if (action === "toggle") {
            const newStatus = task.status === "Completed"
                ? "In Progress"
                : "Completed";

            const updated = {
                ...task,
                status: newStatus,
                updatedAt: new Date().toISOString()
            };

            const next = tasks.map(t =>
                t.id === task.id ? updated : t
            );

            if (persistTasks(next)) {
                notify(
                    newStatus === "Completed"
                        ? "Task completed."
                        : "Task reopened."
                );
            }
        }
    }

    document.querySelectorAll("[data-tab]").forEach(button => {
        button.addEventListener("click", () => {
            if (button.dataset.tab === "tasks") {
                refreshClientOptions();
                renderAllTasks();
            }
        });
    });

    $("tasks-add-client").addEventListener("click", () => {
        document.querySelector(
            '[data-tab="clients"]'
        ).click();

        $("company").focus();
    });

    $("task-form").addEventListener(
        "submit",
        saveFromForm
    );

    $("task-cancel").addEventListener(
        "click",
        resetTaskForm
    );

    $("tasks-table-body").addEventListener(
        "click",
        actOnTask
    );

    [
        "tasks-search",
        "tasks-filter-client",
        "tasks-filter-status",
        "tasks-filter-priority"
    ].forEach(id => {
        $(id).addEventListener(
            id === "tasks-search" ? "input" : "change",
            renderTaskTable
        );
    });

    window.addEventListener(
        "clientflow:clients-changed",
        () => {
            refreshClientOptions();
            renderAllTasks();
        }
    );

    readTasks();
    window.addEventListener("clientflow:tasks-changed", () => {
        readTasks();
        renderAllTasks();
    });
    resetTaskForm();
    refreshClientOptions();
    renderAllTasks();
});
