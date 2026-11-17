"use strict";

document.addEventListener("DOMContentLoaded", function () {
    const CLIENTS_KEY = "clientflow_clients_v1";
    const TASKS_KEY = "clientflow_tasks_v1";
    const FORMAT = "clientflow-backup";
    const STAGES = ["Intake", "Kickoff", "Requirements", "In Progress", "Completed"];
    const STATUSES = ["Not Started", "In Progress", "Blocked", "Completed"];
    const PRIORITIES = ["Low", "Medium", "High"];
    const STEP_IDS = ["intake", "discovery", "assets", "kickoff", "scope", "plan", "review", "handover"];
    const $ = id => document.getElementById(id);
    let pendingImport = null;

    function message(text, error = false) {
        $("report-message").textContent = text;
        $("report-message").classList.toggle("error", error);
    }

    function isDate(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(value + "T00:00:00");
        return !Number.isNaN(date.getTime()) &&
            date.getFullYear() === Number(value.slice(0, 4)) &&
            date.getMonth() + 1 === Number(value.slice(5, 7)) &&
            date.getDate() === Number(value.slice(8, 10));
    }

    function validateData(data) {
        if (!data || !Array.isArray(data.clients) || !Array.isArray(data.tasks)) {
            throw new Error("Backup must contain clients and tasks arrays.");
        }
        if (data.clients.length > 10000 || data.tasks.length > 30000) {
            throw new Error("This backup exceeds the supported record count.");
        }
        const clients = data.clients;
        const tasks = data.tasks;
        const clientIds = new Set();
        const taskIds = new Set();
        const templateKeys = new Set();
        for (const c of clients) {
            if (!c || typeof c !== "object" ||
                typeof c.id !== "string" || !c.id || clientIds.has(c.id) ||
                typeof c.company !== "string" || !c.company.trim() ||
                typeof c.contact !== "string" || !c.contact.trim() ||
                typeof c.email !== "string" || !c.email.trim() ||
                typeof c.service !== "string" || !c.service.trim() ||
                !STAGES.includes(c.stage) || !isDate(c.startDate)) {
                throw new Error("Client records have invalid or duplicate fields.");
            }
            clientIds.add(c.id);
        }
        for (const t of tasks) {
            if (!t || typeof t !== "object" ||
                typeof t.id !== "string" || !t.id || taskIds.has(t.id) ||
                !clientIds.has(t.clientId) ||
                typeof t.title !== "string" || !t.title.trim() ||
                typeof t.owner !== "string" || !t.owner.trim() ||
                !isDate(t.dueDate) || !STATUSES.includes(t.status) ||
                !PRIORITIES.includes(t.priority) ||
                (t.description != null && typeof t.description !== "string")) {
                throw new Error("Task records contain invalid data, duplicate IDs, or missing clients.");
            }
            if (t.templateStepId != null) {
                if (!STEP_IDS.includes(t.templateStepId)) {
                    throw new Error("Unknown checklist step in imported tasks.");
                }
                const key = t.clientId + ":" + t.templateStepId;
                if (templateKeys.has(key)) throw new Error("Duplicate checklist step for a client.");
                templateKeys.add(key);
            }
            taskIds.add(t.id);
        }
        return {clients, tasks};
    }

    function readData() {
        const clients = JSON.parse(localStorage.getItem(CLIENTS_KEY) || "[]");
        const tasks = JSON.parse(localStorage.getItem(TASKS_KEY) || "[]");
        return validateData({clients, tasks});
    }

    function localDay() {
        const d = new Date();
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
            "-" + String(d.getDate()).padStart(2, "0");
    }

    function plusDays(days) {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") +
            "-" + String(d.getDate()).padStart(2, "0");
    }

    function td(row, value) {
        const cell = document.createElement("td");
        cell.textContent = String(value);
        row.appendChild(cell);
    }

    function renderReports() {
        let clients, tasks;
        try {
            ({clients, tasks} = readData());
        } catch (error) {
            message("Unable to load reports: " + error.message, true);
            return;
        }
        message("");
        const today = localDay();
        const soon = plusDays(7);
        const completed = tasks.filter(t => t.status === "Completed");
        const overdue = tasks.filter(t => t.status !== "Completed" && t.dueDate < today);
        const blocked = tasks.filter(t => t.status === "Blocked");
        const atRisk = new Set(overdue.map(t => t.clientId));

        $("report-total-clients").textContent = clients.length;
        $("report-completed-clients").textContent = clients.filter(c => c.stage === "Completed").length;
        $("report-overdue-tasks").textContent = overdue.length;
        $("report-task-rate").textContent = (tasks.length ? Math.round(completed.length * 100 / tasks.length) : 0) + "%";
        $("report-blocked").textContent = blocked.length;
        $("report-due-soon").textContent = tasks.filter(t => t.status !== "Completed" && t.dueDate >= today && t.dueDate <= soon).length;
        $("report-clients-at-risk").textContent = atRisk.size;

        const statusBody = $("report-status-body");
        statusBody.replaceChildren();
        for (const status of STATUSES) {
            const row = document.createElement("tr");
            td(row, status);
            td(row, tasks.filter(t => t.status === status).length);
            statusBody.appendChild(row);
        }

        const clientBody = $("report-client-body");
        clientBody.replaceChildren();
        for (const client of [...clients].sort((a, b) => a.company.localeCompare(b.company))) {
            const assigned = tasks.filter(t => t.clientId === client.id);
            const done = assigned.filter(t => t.status === "Completed").length;
            const late = assigned.filter(t => t.status !== "Completed" && t.dueDate < today).length;
            const checklistDone = STEP_IDS.filter(id => assigned.some(t => t.templateStepId === id && t.status === "Completed")).length;
            const row = document.createElement("tr");
            for (const value of [client.company, client.stage, assigned.length, done, late, checklistDone + "/8"]) td(row, value);
            clientBody.appendChild(row);
        }
        $("report-empty").hidden = clients.length !== 0;
    }

    function timestamp() {
        const d = new Date();
        return localDay() + "_" + String(d.getHours()).padStart(2, "0") +
            String(d.getMinutes()).padStart(2, "0") + String(d.getSeconds()).padStart(2, "0");
    }

    function download(filename, content, mime) {
        const blob = new Blob([content], {type: mime});
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    }

    function exportJSON(data, prefix = "clientflow-backup") {
        download(prefix + "_" + timestamp() + ".json",
            JSON.stringify({format: FORMAT, version: 1, exportedAt: new Date().toISOString(), ...data}, null, 2),
            "application/json");
    }

    function csvValue(value) {
        let text = value == null ? "" : String(value);
        if (/^[=+\-@\t\r]/.test(text.trimStart())) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function exportCSV(kind) {
        const data = readData();
        const clientsById = new Map(data.clients.map(c => [c.id, c.company]));
        const columns = kind === "clients"
            ? ["Company", "Contact", "Email", "Service", "Start Date", "Stage", "Client ID"]
            : ["Task", "Client", "Owner", "Due Date", "Priority", "Status", "Description", "Checklist Step", "Task ID"];
        const rows = kind === "clients"
            ? data.clients.map(c => [c.company, c.contact, c.email, c.service, c.startDate, c.stage, c.id])
            : data.tasks.map(t => [t.title, clientsById.get(t.clientId) || "", t.owner, t.dueDate, t.priority, t.status, t.description || "", t.templateStepId || "", t.id]);
        const csv = [columns, ...rows].map(row => row.map(csvValue).join(",")).join("\r\n");
        download("clientflow-" + kind + "_" + timestamp() + ".csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
    }

    function safeExport(action) {
        try { action(); message("Download started. Check your browser Downloads folder."); }
        catch (error) { message("Export failed: " + error.message, true); }
    }

    async function previewImport() {
        pendingImport = null;
        $("report-import-apply").disabled = true;
        const file = $("report-import-file").files[0];
        if (!file) { $("report-import-preview").textContent = "No file selected."; return; }
        if (file.size > 5 * 1024 * 1024) {
            $("report-import-preview").textContent = "File too large (limit 5 MB).";
            return;
        }
        try {
            const payload = JSON.parse(await file.text());
            if (payload.format !== FORMAT || payload.version !== 1) {
                throw new Error("Not a supported ClientFlow JSON backup.");
            }
            pendingImport = validateData(payload);
            $("report-import-preview").textContent = "Validated: " + pendingImport.clients.length +
                " clients and " + pendingImport.tasks.length + " tasks. Import will replace current browser data.";
            $("report-import-apply").disabled = false;
            message("Backup file validated. Export current data before replacing it.");
        } catch (error) {
            $("report-import-preview").textContent = "Invalid backup: " + error.message;
            message("No existing data has been changed.", true);
        }
    }

    function applyImport() {
        if (!pendingImport) return;
        let existing;
        try { existing = readData(); }
        catch (error) { message("Cannot create a safe pre-import backup: " + error.message, true); return; }
        if (!window.confirm("Replace all locally saved clients and tasks? A pre-import backup download will start first.")) return;
        try { exportJSON(existing, "clientflow-before-import"); }
        catch (error) { message("Could not prepare backup: " + error.message, true); return; }
        if (!window.confirm("Verify the pre-import backup is saved in Downloads. Continue replacing browser data?")) return;
        let oldClients, oldTasks;
        try {
            oldClients = localStorage.getItem(CLIENTS_KEY);
            oldTasks = localStorage.getItem(TASKS_KEY);
            localStorage.setItem(CLIENTS_KEY, JSON.stringify(pendingImport.clients));
            localStorage.setItem(TASKS_KEY, JSON.stringify(pendingImport.tasks));
        } catch (error) {
            try {
                if (oldClients == null) localStorage.removeItem(CLIENTS_KEY);
                else localStorage.setItem(CLIENTS_KEY, oldClients);
                if (oldTasks == null) localStorage.removeItem(TASKS_KEY);
                else localStorage.setItem(TASKS_KEY, oldTasks);
                message("Import failed. Original data restored. " + error.message, true);
            } catch (restoreError) {
                message("Import failed and automatic restoration also failed. Restore your downloaded JSON backup.", true);
            }
            return;
        }
        window.location.reload();
    }

    $("report-export-json").addEventListener("click", () => safeExport(() => exportJSON(readData())));
    $("report-backup-again").addEventListener("click", () => safeExport(() => exportJSON(readData())));
    $("report-clients-csv").addEventListener("click", () => safeExport(() => exportCSV("clients")));
    $("report-tasks-csv").addEventListener("click", () => safeExport(() => exportCSV("tasks")));
    $("report-import-file").addEventListener("change", previewImport);
    $("report-import-apply").addEventListener("click", applyImport);
    document.querySelector('[data-tab="reports"]').addEventListener("click", renderReports);
    window.addEventListener("clientflow:clients-changed", renderReports);
    window.addEventListener("clientflow:tasks-changed", renderReports);
    renderReports();
});
