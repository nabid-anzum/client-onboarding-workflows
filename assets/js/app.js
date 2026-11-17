"use strict";

document.addEventListener("DOMContentLoaded", function () {

    const STORAGE_KEY = "clientflow_clients_v1";
    const $ = id => document.getElementById(id);

    let clients = [];
    let storageReady = false;

    function notify(message, isError = false) {
        const feedback = $("feedback");
        feedback.textContent = message;
        feedback.classList.toggle("error", isError);
    }

    function initializeStorage() {
        try {
            const testKey = "clientflow_test";
            localStorage.setItem(testKey, "ok");
            localStorage.removeItem(testKey);

            const raw = localStorage.getItem(STORAGE_KEY);
            const saved = raw ? JSON.parse(raw) : [];

            if (!Array.isArray(saved)) {
                throw new Error("Invalid stored data");
            }

            clients = saved.filter(item =>
                item && typeof item === "object" &&
                typeof item.id === "string"
            );

            storageReady = true;
            $("storage-message").textContent =
                "Local browser storage is available.";

        } catch (error) {
            storageReady = false;
            $("storage-message").textContent =
                "Storage unavailable or saved data is invalid.";
            $("storage-message").classList.add("warning");
            $("save-client").disabled = true;
            notify("Saving is disabled until storage is available.", true);
        }
    }

    function saveClients(nextClients) {
        if (!storageReady) return false;

        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(nextClients)
            );
            clients = nextClients;
            window.dispatchEvent(new Event("clientflow:clients-changed"));
            return true;
        } catch (error) {
            notify("Unable to save data in this browser.", true);
            return false;
        }
    }

    function switchTab(tab) {
        $("dashboard-view").hidden = tab !== "dashboard";
        $("clients-view").hidden = tab !== "clients";
        $("tasks-view").hidden = tab !== "tasks";
        $("checklists-view").hidden = tab !== "checklists";
        $("reports-view").hidden = tab !== "reports";

        document.querySelectorAll("[data-tab]").forEach(btn => {
            const active = btn.dataset.tab === tab;
            btn.classList.toggle("active", active);

            if (active) {
                btn.setAttribute("aria-current", "page");
            } else {
                btn.removeAttribute("aria-current");
            }
        });
    }

    function makeCell(value) {
        const td = document.createElement("td");
        td.textContent = value || "-";
        return td;
    }

    function makeButton(label, action, id, danger = false) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = label;
        btn.dataset.action = action;
        btn.dataset.id = id;
        btn.className = danger
            ? "btn btn-small btn-danger"
            : "btn btn-small btn-secondary";
        return btn;
    }

    function renderDashboard() {
        const total = clients.length;
        const completed = clients.filter(
            c => c.stage === "Completed"
        ).length;
        const active = total - completed;
        const rate = total
            ? Math.round(completed / total * 100)
            : 0;

        $("total-clients").textContent = total;
        $("active-clients").textContent = active;
        $("completed-clients").textContent = completed;
        $("completion-rate").textContent = rate + "%";
        $("progress-percent").textContent = rate + "%";
        $("completion-progress").value = rate;

        $("completion-detail").textContent =
            completed + " of " + total +
            " clients completed onboarding.";

        const recent = $("recent-clients");
        recent.replaceChildren();

        const sorted = [...clients].sort((a, b) =>
            String(b.createdAt || "").localeCompare(
                String(a.createdAt || "")
            )
        );

        if (!sorted.length) {
            const li = document.createElement("li");
            li.textContent = "No clients added yet.";
            recent.appendChild(li);
            return;
        }

        sorted.slice(0, 5).forEach(client => {
            const li = document.createElement("li");
            const company = document.createElement("strong");
            const stage = document.createElement("span");

            company.textContent = client.company;
            stage.textContent = client.stage;

            li.append(company, stage);
            recent.appendChild(li);
        });
    }

    function renderClients() {
        const query = $("client-search").value
            .trim().toLowerCase();
        const stageFilter = $("stage-filter").value;

        const filtered = clients.filter(client => {
            const searchable = [
                client.company,
                client.contact,
                client.email
            ].join(" ").toLowerCase();

            const matchesSearch = searchable.includes(query);
            const matchesStage = stageFilter === "all" ||
                client.stage === stageFilter;

            return matchesSearch && matchesStage;
        });

        $("client-count").textContent =
            filtered.length + " shown of " +
            clients.length + " clients";

        const tbody = $("clients-table-body");
        tbody.replaceChildren();

        filtered.forEach(client => {
            const tr = document.createElement("tr");

            tr.appendChild(makeCell(client.company));
            tr.appendChild(makeCell(
                client.contact + " (" + client.email + ")"
            ));
            tr.appendChild(makeCell(client.service));

            const stageTd = document.createElement("td");
            const badge = document.createElement("span");
            badge.className = "stage-badge";

            if (client.stage === "Completed") {
                badge.classList.add("completed");
            } else if (client.stage === "In Progress") {
                badge.classList.add("progress");
            }

            badge.textContent = client.stage;
            stageTd.appendChild(badge);
            tr.appendChild(stageTd);

            tr.appendChild(makeCell(client.startDate));

            const actionsTd = document.createElement("td");
            const actions = document.createElement("div");
            actions.className = "action-buttons";

            actions.appendChild(
                makeButton("Edit", "edit", client.id)
            );
            actions.appendChild(
                makeButton("Delete", "delete", client.id, true)
            );

            actionsTd.appendChild(actions);
            tr.appendChild(actionsTd);
            tbody.appendChild(tr);
        });

        $("empty-state").hidden = filtered.length > 0;
        $("empty-state").textContent = clients.length
            ? "No clients match your filters."
            : "No clients added yet. Use the form above.";
    }

    function renderAll() {
        renderDashboard();
        renderClients();
    }

    function todayLocal() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        return year + "-" + month + "-" + day;
    }

    function resetForm() {
        $("client-form").reset();
        $("client-id").value = "";
        $("start-date").value = todayLocal();
        $("stage").value = "Intake";
        $("form-title").textContent = "Add a Client";
        $("save-client").textContent = "Save Client";
        $("cancel-edit").hidden = true;
    }

    function editClient(id) {
        const client = clients.find(c => c.id === id);
        if (!client) return;

        $("client-id").value = client.id;
        $("company").value = client.company;
        $("contact").value = client.contact;
        $("email").value = client.email;
        $("service").value = client.service;
        $("start-date").value = client.startDate;
        $("stage").value = client.stage;

        $("form-title").textContent = "Edit Client";
        $("save-client").textContent = "Update Client";
        $("cancel-edit").hidden = false;

        $("client-form").scrollIntoView({ behavior: "smooth" });
        $("company").focus();
    }

    function deleteClient(id) {
        const client = clients.find(c => c.id === id);
        if (!client) return;

        let linkedTaskCount = 0;

        try {
            const rawTasks = localStorage.getItem("clientflow_tasks_v1");
            const storedTasks = rawTasks ? JSON.parse(rawTasks) : [];

            if (!Array.isArray(storedTasks)) {
                throw new Error("Invalid task data");
            }

            linkedTaskCount = storedTasks.filter(
                task => task && task.clientId === id
            ).length;

        } catch (error) {
            notify("Cannot verify linked tasks. Client was not deleted.", true);
            return;
        }

        if (linkedTaskCount > 0) {
            notify(
                "This client has " + linkedTaskCount +
                " linked task(s). Delete or reassign them before deleting the client.",
                true
            );
            return;
        }

        const confirmed = window.confirm(
            "Delete client '" + client.company +
            "'? This cannot be undone."
        );

        if (!confirmed) return;

        const next = clients.filter(c => c.id !== id);

        if (saveClients(next)) {
            if ($("client-id").value === id) {
                resetForm();
            }

            renderAll();
            notify("Client deleted successfully.");
        }
    }

    document.querySelectorAll("[data-tab]").forEach(btn => {
        btn.addEventListener("click", () => {
            switchTab(btn.dataset.tab);
        });
    });

    $("dashboard-add").addEventListener("click", () => {
        switchTab("clients");
        resetForm();
        $("company").focus();
    });

    $("cancel-edit").addEventListener("click", resetForm);

    $("client-search").addEventListener("input", renderClients);
    $("stage-filter").addEventListener("change", renderClients);

    $("client-form").addEventListener("submit", function (event) {
        event.preventDefault();

        if (!storageReady) {
            notify("Browser storage is unavailable.", true);
            return;
        }

        const existingId = $("client-id").value;
        const existing = clients.find(c => c.id === existingId);

        if (existingId && !existing) {
            notify("Client record no longer exists.", true);
            return;
        }

        const client = {
            id: existingId ||
                "client_" + Date.now().toString(36) +
                Math.random().toString(36).slice(2, 9),
            company: $("company").value.trim(),
            contact: $("contact").value.trim(),
            email: $("email").value.trim().toLowerCase(),
            service: $("service").value,
            startDate: $("start-date").value,
            stage: $("stage").value,
            createdAt: existing
                ? existing.createdAt
                : new Date().toISOString()
        };

        if (!client.company || !client.contact ||
            !client.email || !client.service ||
            !client.startDate) {
            notify("Please complete all required fields.", true);
            return;
        }

        const next = existing
            ? clients.map(c => c.id === existingId ? client : c)
            : [client, ...clients];

        if (saveClients(next)) {
            resetForm();
            renderAll();

            notify(existing
                ? "Client updated successfully."
                : "New client added successfully.");
        }
    });

    $("clients-table-body").addEventListener("click", event => {
        const btn = event.target.closest("button[data-action]");
        if (!btn) return;

        if (btn.dataset.action === "edit") {
            editClient(btn.dataset.id);
        } else if (btn.dataset.action === "delete") {
            deleteClient(btn.dataset.id);
        }
    });

    initializeStorage();
    resetForm();
    renderAll();
    switchTab("dashboard");
});
