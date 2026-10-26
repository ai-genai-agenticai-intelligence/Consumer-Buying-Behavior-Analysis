(() => {
    const customers = window.CUSTOMER_DATA || [];
    const stats = window.DASHBOARD_STATS || {};
    const colors = {
        ink: "#33483c",
        muted: "#89958e",
        grid: "#edf1ee",
        green: "#23835a",
        gray: "#a8b3ad",
        orange: "#e5843e",
    };

    const navButtons = [...document.querySelectorAll(".nav-link")];
    const sections = [...document.querySelectorAll(".page-section")];
    const breadcrumb = document.getElementById("breadcrumb-title");
    const sidebar = document.getElementById("sidebar");

    navButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const page = button.dataset.page;
            navButtons.forEach((item) => item.classList.toggle("active", item === button));
            sections.forEach((section) => {
                section.classList.toggle("active", section.id === `page-${page}`);
            });
            breadcrumb.textContent = button.querySelector("span:last-child").textContent;
            sidebar.classList.remove("open");
            window.dispatchEvent(new Event("resize"));
        });
    });

    document.getElementById("menu-toggle").addEventListener("click", () => {
        sidebar.classList.toggle("open");
    });
    document.addEventListener("click", (event) => {
        if (
            window.innerWidth <= 650
            && sidebar.classList.contains("open")
            && !sidebar.contains(event.target)
            && !event.target.closest("#menu-toggle")
        ) {
            sidebar.classList.remove("open");
        }
    });

    function setupCanvas(canvas, height) {
        if (!canvas) return null;
        const rect = canvas.getBoundingClientRect();
        if (!rect.width) return null;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.round(rect.width * ratio);
        canvas.height = Math.round(height * ratio);
        const context = canvas.getContext("2d");
        context.scale(ratio, ratio);
        context.clearRect(0, 0, rect.width, height);
        context.font = '10px "DM Sans", sans-serif';
        context.lineWidth = 1;
        return { context, width: rect.width, height };
    }

    function drawScatter() {
        const canvas = document.getElementById("scatter-chart");
        const chart = setupCanvas(canvas, canvas?.clientHeight || 264);
        if (!chart) return;
        const { context: ctx, width, height } = chart;
        const plot = { left: 48, right: 14, top: 14, bottom: 35 };
        const plotWidth = width - plot.left - plot.right;
        const plotHeight = height - plot.top - plot.bottom;
        const xMin = 18;
        const xMax = 60;
        const yMin = 0;
        const yMax = 160000;

        ctx.strokeStyle = colors.grid;
        ctx.fillStyle = colors.muted;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        [0, 40000, 80000, 120000, 160000].forEach((value) => {
            const y = plot.top + plotHeight * (1 - (value - yMin) / (yMax - yMin));
            ctx.beginPath();
            ctx.moveTo(plot.left, y);
            ctx.lineTo(width - plot.right, y);
            ctx.stroke();
            ctx.fillText(value === 0 ? "$0" : `$${value / 1000}k`, plot.left - 8, y);
        });

        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        [20, 30, 40, 50, 60].forEach((value) => {
            const x = plot.left + plotWidth * ((value - xMin) / (xMax - xMin));
            ctx.beginPath();
            ctx.moveTo(x, plot.top);
            ctx.lineTo(x, height - plot.bottom);
            ctx.stroke();
            ctx.fillStyle = colors.muted;
            ctx.fillText(String(value), x, height - plot.bottom + 9);
        });

        customers.forEach((customer) => {
            const x = plot.left + plotWidth * ((customer.Age - xMin) / (xMax - xMin));
            const y = plot.top + plotHeight * (1 - (customer.EstimatedSalary - yMin) / (yMax - yMin));
            ctx.beginPath();
            ctx.arc(x, y, 3.1, 0, Math.PI * 2);
            ctx.fillStyle = customer.Outcome === "Purchased" ? colors.green : colors.gray;
            ctx.globalAlpha = 0.76;
            ctx.fill();
            ctx.globalAlpha = 1;
        });

        ctx.fillStyle = colors.muted;
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("Age (years)", plot.left + plotWidth / 2, height - 1);
        ctx.save();
        ctx.translate(11, plot.top + plotHeight / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText("Estimated salary", 0, 0);
        ctx.restore();
    }

    function drawBars(canvasId, items, options = {}) {
        const canvas = document.getElementById(canvasId);
        const chart = setupCanvas(canvas, canvas?.clientHeight || 230);
        if (!chart || !items?.length) return;
        const { context: ctx, width, height } = chart;
        const plot = { left: 38, right: 12, top: 15, bottom: 36 };
        const plotWidth = width - plot.left - plot.right;
        const plotHeight = height - plot.top - plot.bottom;
        const maxValue = options.maxValue || 100;
        const barWidth = Math.min(44, (plotWidth / items.length) * 0.48);

        ctx.font = '9px "DM Sans", sans-serif';
        ctx.strokeStyle = colors.grid;
        ctx.fillStyle = colors.muted;
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        [0, 25, 50, 75, 100].forEach((value) => {
            const y = plot.top + plotHeight * (1 - value / maxValue);
            ctx.beginPath();
            ctx.moveTo(plot.left, y);
            ctx.lineTo(width - plot.right, y);
            ctx.stroke();
            ctx.fillText(`${value}%`, plot.left - 7, y);
        });

        items.forEach((item, index) => {
            const centerX = plot.left + plotWidth * ((index + 0.5) / items.length);
            const barHeight = Math.max(0, plotHeight * (item.rate / maxValue));
            const y = plot.top + plotHeight - barHeight;
            ctx.fillStyle = options.colors?.[index] || colors.green;
            ctx.beginPath();
            ctx.roundRect(centerX - barWidth / 2, y, barWidth, barHeight, [5, 5, 1, 1]);
            ctx.fill();

            ctx.fillStyle = colors.ink;
            ctx.textAlign = "center";
            ctx.textBaseline = "bottom";
            ctx.font = '600 9px "DM Sans", sans-serif';
            ctx.fillText(`${Math.round(item.rate)}%`, centerX, y - 5);
            ctx.fillStyle = colors.muted;
            ctx.textBaseline = "top";
            ctx.font = '9px "DM Sans", sans-serif';
            ctx.fillText(item.label, centerX, height - plot.bottom + 11);
        });
    }

    function drawCharts() {
        drawScatter();
        drawBars("age-chart", stats.age_groups);
        drawBars("gender-chart", stats.gender_rates, {
            colors: [colors.green, colors.orange],
        });
    }

    let resizeTimer;
    window.addEventListener("resize", () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(drawCharts, 100);
    });
    drawCharts();

    const ageInput = document.getElementById("age-input");
    const ageValue = document.getElementById("age-value");
    ageInput.addEventListener("input", () => {
        ageValue.textContent = `${ageInput.value} years`;
    });

    const predictionForm = document.getElementById("prediction-form");
    const predictionButton = predictionForm.querySelector("button[type=submit]");
    const resultPlaceholder = document.getElementById("result-placeholder");
    const resultContent = document.getElementById("result-content");
    const resultError = document.getElementById("prediction-error");

    predictionForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        resultError.classList.add("hidden");
        predictionButton.disabled = true;
        predictionButton.querySelector("span:first-child").textContent = "Analyzing profile…";

        try {
            const response = await fetch("/api/predict", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    age: ageInput.value,
                    salary: document.getElementById("salary-input").value,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Prediction failed. Please try again.");

            resultPlaceholder.classList.add("hidden");
            resultContent.classList.remove("hidden");
            const isLikely = result.prediction === 1;
            const probability = Math.round(result.probability * 100);
            document.getElementById("result-status").classList.toggle("unlikely", !isLikely);
            document.getElementById("result-label").textContent = isLikely ? "Purchase likely" : "Purchase unlikely";
            document.getElementById("probability-value").textContent = `${probability}%`;
            document.getElementById("probability-ring").style.background =
                `conic-gradient(#176b4a ${probability}%, #e8efe9 ${probability}% 100%)`;
            document.getElementById("result-age").textContent = `${result.age} years`;
            document.getElementById("result-salary").textContent =
                `$${new Intl.NumberFormat("en-US").format(result.salary)}`;
        } catch (error) {
            resultError.textContent = error.message;
            resultError.classList.remove("hidden");
        } finally {
            predictionButton.disabled = false;
            predictionButton.querySelector("span:first-child").textContent = "Estimate likelihood";
        }
    });

    const searchInput = document.getElementById("table-search");
    const outcomeFilter = document.getElementById("outcome-filter");
    const tableBody = document.getElementById("customer-table-body");
    const tableCount = document.getElementById("table-count");
    const pageIndicator = document.getElementById("page-indicator");
    const previousButton = document.getElementById("previous-page");
    const nextButton = document.getElementById("next-page");
    const downloadLink = document.getElementById("download-link");
    const pageSize = 10;
    let currentPage = 0;

    function renderTable() {
        const query = searchInput.value.trim().toLowerCase();
        const outcome = outcomeFilter.value;
        const filtered = customers.filter((customer) => {
            const outcomeMatches = outcome === "all"
                || (outcome === "purchased" && customer.Outcome === "Purchased")
                || (outcome === "not-purchased" && customer.Outcome === "Did not purchase");
            const searchMatches = !query || [
                customer["User ID"],
                customer.Gender,
                customer.Age,
                customer.EstimatedSalary,
                customer.Outcome,
            ].some((value) => String(value).toLowerCase().includes(query));
            return outcomeMatches && searchMatches;
        });

        const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
        currentPage = Math.min(currentPage, pageCount - 1);
        const visible = filtered.slice(currentPage * pageSize, (currentPage + 1) * pageSize);
        tableBody.innerHTML = visible.map((customer) => {
            const outcomeClass = customer.Outcome === "Purchased" ? "purchased" : "not-purchased";
            return `<tr>
                <td>${customer["User ID"]}</td>
                <td>${escapeHtml(customer.Gender)}</td>
                <td>${customer.Age}</td>
                <td>$${new Intl.NumberFormat("en-US").format(customer.EstimatedSalary)}</td>
                <td><span class="outcome-pill ${outcomeClass}">${customer.Outcome}</span></td>
            </tr>`;
        }).join("");

        tableCount.textContent = filtered.length
            ? `Showing ${currentPage * pageSize + 1}–${Math.min((currentPage + 1) * pageSize, filtered.length)} of ${filtered.length} customers`
            : "No customers match your search";
        pageIndicator.textContent = `${currentPage + 1} / ${pageCount}`;
        previousButton.disabled = currentPage === 0;
        nextButton.disabled = currentPage >= pageCount - 1;
        downloadLink.href = `/download?outcome=${encodeURIComponent(outcome)}`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
        })[character]);
    }

    searchInput.addEventListener("input", () => {
        currentPage = 0;
        renderTable();
    });
    outcomeFilter.addEventListener("change", () => {
        currentPage = 0;
        renderTable();
    });
    previousButton.addEventListener("click", () => {
        currentPage = Math.max(0, currentPage - 1);
        renderTable();
    });
    nextButton.addEventListener("click", () => {
        currentPage += 1;
        renderTable();
    });
    renderTable();
})();
