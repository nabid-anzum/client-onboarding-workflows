"use strict";

// The checklist uses existing task records, not a separate database.

document.addEventListener("DOMContentLoaded", function () {

    const CLIENTS_KEY = "clientflow_clients_v1";
    const TASKS_KEY = "clientflow_tasks_v1";
    const $ = id => document.getElementById(id);

    const STEPS = [
        {
            id: "intake",
            title: "Confirm intake and primary contact",
            owner: "Account Manager",
            priority: "High",
            days: 0,
            description: "Verify client contacts, service request, and onboarding expectations."
        },
        {
            id: "discovery",
            title: "Collect requirements and objectives",
            owner: "Project Manager",
            priority: "High",
            days: 1,
            description: "Record business goals, deliverables, stakeholders, and project needs."
        },
        {
            id: "assets",
            title: "Request assets and necessary access",
            owner: "Technical Lead",
            priority: "High",
            days: 2,
            description: "Request required assets securely. Never store passwords in task notes."
        },
        {
            id: "kickoff",
            title: "Hold client kickoff meeting",
            owner: "Account Manager",
            priority: "High",
            days: 3,
            description: "Agree on communication channels, milestones, and decision makers."
        },
        {
            id: "scope",
            title: "Confirm scope and acceptance criteria",
            owner: "Project Manager",
            priority: "High",
            days: 4,
            description: "Confirm deliverables, project boundaries, and success criteria."
        },
        {
            id: "plan",
            title: "Share timeline and responsibilities",
            owner: "Project Manager",
            priority: "Medium",
            days: 5,
            description: "Establish task ownership, milestones, and expected response times."
        },
        {
            id: "review",
            title: "Review initial project readiness",
            owner: "Delivery Team",
            priority: "Medium",
            days: 7,
            description: "Check dependencies, approvals, and initial delivery readiness."
        },
        {
            id: "handover",
            title: "Obtain onboarding sign-off",
            owner: "Account Manager",
            priority: "Medium",
            days: 10,
            description: "Confirm readiness to transition from onboarding to active delivery."
        }
    ];

    const STEP_IDS = new Set(STEPS.map(step => step.id));

    function getClients() {
        try {
            const data = JSON.parse(
                localStorage.getItem(CLIENTS_KEY) || "[]"
            );

            return Array.isArray(data)
                ? data.filter(c =>
                    c && typeof c.id === "string"
                )
                : [];

        } catch (error) {
            return [];
        }
    }

    function getTasks() {
        try {
            const data = JSON.parse(
                localStorage.getItem(TASKS_KEY) || "[]"
            );

            if (
                !Array.isArray(data) ||
                !data.every(t =>
                    t &&
                    typeof t.id === "string" &&
                    typeof t.clientId === "string" &&
                    typeof t.title === "string" &&
                    typeof t.owner === "string" &&
                    typeof t.dueDate === "string" &&
                    ["Low", "Medium", "High"].includes(t.priority) &&
                    ["Not Started", "In Progress", "Blocked", "Completed"]
                        .includes(t.status)
                )
            ) {
                return null;
            }

            return data;

        } catch (error) {
            return null;
        }
    }

    function showMessage(text, error = false) {
        const alert = $("checklist-alert");
        alert.textContent = text;
        alert.classList.toggle("checklist-error", error);
    }

    function saveTasks(data) {
        try {
            localStorage.setItem(
                TASKS_KEY,
                JSON.stringify(data)
            );

            window.dispatchEvent(
                new Event("clientflow:tasks-changed")
            );

            return true;

        } catch (error) {
            showMessage(
                "Unable to save. Browser storage may be disabled or full.",
                true
            );

            return false;
        }
    }

    function formatDateOffset(dateString, days) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
            dateString || ""
        );

        const base = match
            ? new Date(
                Number(match[1]),
                Number(match[2]) - 1,
                Number(match[3])
            )
            : new Date();

        base.setDate(base.getDate() + days);

        return base.getFullYear() + "-" +
            String(base.getMonth() + 1).padStart(2, "0") + "-" +
            String(base.getDate()).padStart(2, "0");
    }

    function findStepTask(tasks, clientId, stepId) {
        return tasks.find(task =>
            task.clientId === clientId &&
            task.templateStepId === stepId
        );
    }

    function renderDashboardSummary(clients, tasks) {
        const clientIds = new Set(
            clients.map(client => client.id)
        );

        const templateTasks = tasks.filter(task =>
            clientIds.has(task.clientId) &&
            STEP_IDS.has(task.templateStepId)
        );

        const startedIds = new Set(
            templateTasks.map(task => task.clientId)
        );

        const fullyCompleted = [...startedIds].filter(
            clientId => STEPS.every(step => {
                const task = findStepTask(
                    tasks, clientId, step.id
                );

                return task && task.status === "Completed";
            })
        ).length;

        const completedSteps = templateTasks.filter(
            task => task.status === "Completed"
        ).length;

        const possibleSteps = startedIds.size * STEPS.length;

        const completionRate = possibleSteps
            ? Math.round(completedSteps * 100 / possibleSteps)
            : 0;

        $("dashboard-checklist-started").textContent =
            startedIds.size;

        $("dashboard-checklist-finished").textContent =
            fullyCompleted;

        $("dashboard-checklist-rate").textContent =
            completionRate + "%";
    }

    function makeStepRow(step, task, index, editable) {
        const item = document.createElement("div");
        item.className = "checklist-item";

        if (task && task.status === "Completed") {
            item.classList.add("checklist-item-done");
        }

        const number = document.createElement("span");
        number.className = "checklist-number";
        number.textContent = String(index + 1).padStart(2, "0");

        const content = document.createElement("div");

        const title = document.createElement("strong");
        title.textContent = step.title;

        const details = document.createElement("div");
        details.className = "checklist-detail";

        details.textContent = task
            ? task.owner + " | Due: " + task.dueDate +
                " | " + task.status
            : step.owner + " | Not generated yet";

        content.append(title, details);

        const action = document.createElement("button");
        action.type = "button";

        action.className = "btn btn-small " +
            (
                task && task.status === "Completed"
                    ? "btn-secondary"
                    : "btn-primary"
            );

        action.textContent = !task
            ? "Not Created"
            : task.status === "Completed"
                ? "Reopen"
                : "Complete";

        action.disabled = !task || !editable;

        if (task) {
            action.dataset.stepTaskId = task.id;
        }

        item.append(number, content, action);
        return item;
    }

    function renderChecklist() {
        const clients = getClients();
        const tasks = getTasks();

        const clientId = $("checklist-client").value;
        const client = clients.find(c => c.id === clientId);

        const safeTasks = tasks || [];
        const writable = tasks !== null;

        $("checklist-storage-warning").hidden = writable;

        renderDashboardSummary(clients, safeTasks);

        const items = $("checklist-items");
        items.replaceChildren();

        const missing = client && tasks
            ? STEPS.filter(
                step => !findStepTask(
                    tasks, client.id, step.id
                )
            )
            : [];

        const button = $("checklist-generate");

        button.disabled =
            !client || !writable || missing.length === 0;

        button.textContent = !client
            ? "Select a Client"
            : !writable
                ? "Storage Unavailable"
                : missing.length
                    ? "Generate " + missing.length + " Missing Tasks"
                    : "All Tasks Generated";

        if (!client) {
            $("checklist-client-description").textContent =
                "No client selected. Add a client in the Clients tab.";

            $("checklist-progress-label").textContent = "0 / 8";
            $("checklist-progress-note").textContent =
                "Select a client to begin.";

            $("checklist-progress").value = 0;
            return;
        }

        const completed = STEPS.filter(step => {
            const task = findStepTask(
                safeTasks, clientId, step.id
            );

            return task && task.status === "Completed";
        }).length;

        const percent = Math.round(
            completed * 100 / STEPS.length
        );

        $("checklist-client-description").textContent =
            client.company + " | Start: " +
            (client.startDate || "Not set");

        $("checklist-progress-label").textContent =
            completed + " / " + STEPS.length;

        $("checklist-progress-note").textContent =
            percent + "% complete; " +
            missing.length + " steps not generated.";

        $("checklist-progress").value = percent;

        STEPS.forEach((step, index) => {
            items.appendChild(
                makeStepRow(
                    step,
                    findStepTask(
                        safeTasks, clientId, step.id
                    ),
                    index,
                    writable
                )
            );
        });
    }

    function refreshClientSelect() {
        const select = $("checklist-client");
        const previous = select.value;

        const clients = getClients().sort(
            (a, b) => String(a.company).localeCompare(
                String(b.company)
            )
        );

        select.replaceChildren();
        select.add(new Option("Select a client", ""));

        clients.forEach(client => {
            select.add(
                new Option(client.company, client.id)
            );
        });

        if (clients.some(c => c.id === previous)) {
            select.value = previous;
        } else if (clients.length) {
            select.value = clients[0].id;
        }

        renderChecklist();
    }

    function generateChecklist() {
        const client = getClients().find(
            c => c.id === $("checklist-client").value
        );

        const tasks = getTasks();

        if (!client || tasks === null) {
            showMessage(
                "Select a client with available task storage.",
                true
            );
            return;
        }

        const missing = STEPS.filter(
            step => !findStepTask(
                tasks, client.id, step.id
            )
        );

        if (!missing.length) {
            showMessage(
                "All eight onboarding tasks already exist."
            );
            return;
        }

        const now = new Date().toISOString();

        const generated = missing.map(step => ({
            id: "task_" +
                Date.now().toString(36) +
                Math.random().toString(36).slice(2, 9),

            clientId: client.id,
            templateStepId: step.id,
            title: step.title,
            description: step.description,
            owner: step.owner,

            dueDate: formatDateOffset(
                client.startDate, step.days
            ),

            priority: step.priority,
            status: "Not Started",
            createdAt: now,
            updatedAt: now
        }));

        if (saveTasks([...generated, ...tasks])) {
            showMessage(
                generated.length +
                " onboarding task(s) created for " +
                client.company + "."
            );
        }
    }

    function toggleStepTask(event) {
        const button = event.target.closest(
            "button[data-step-task-id]"
        );

        if (!button) return;

        const tasks = getTasks();

        if (tasks === null) {
            showMessage(
                "Task data could not be loaded safely.",
                true
            );
            return;
        }

        const clientId = $("checklist-client").value;

        const task = tasks.find(t =>
            t.id === button.dataset.stepTaskId &&
            t.clientId === clientId &&
            STEP_IDS.has(t.templateStepId)
        );

        if (!task) {
            showMessage(
                "Checklist task no longer exists.",
                true
            );
            renderChecklist();
            return;
        }

        const status = task.status === "Completed"
            ? "In Progress"
            : "Completed";

        const next = tasks.map(t =>
            t.id === task.id
                ? {
                    ...t,
                    status: status,
                    updatedAt: new Date().toISOString()
                }
                : t
        );

        if (saveTasks(next)) {
            showMessage(
                status === "Completed"
                    ? "Checklist step completed."
                    : "Checklist step reopened."
            );
        }
    }

    $("checklist-generate").addEventListener(
        "click", generateChecklist
    );

    $("checklist-client").addEventListener(
        "change", () => {
            showMessage("");
            renderChecklist();
        }
    );

    $("checklist-items").addEventListener(
        "click", toggleStepTask
    );

    $("checklist-view-tasks").addEventListener(
        "click", () => {
            document.querySelector(
                '[data-tab="tasks"]'
            ).click();
        }
    );

    document.querySelectorAll(
        '[data-tab="checklists"]'
    ).forEach(button => {
        button.addEventListener(
            "click", refreshClientSelect
        );
    });

    window.addEventListener(
        "clientflow:clients-changed",
        refreshClientSelect
    );

    window.addEventListener(
        "clientflow:tasks-changed",
        renderChecklist
    );

    refreshClientSelect();
});
