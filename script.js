const STORAGE_KEY = "mobileBudgetEntries";
const BUDGET_KEY = "mobileBudgetMonthlyBudgets";
const FIXED_COST_KEY = "mobileBudgetFixedCosts";

const expenseCategories = [
  "食費",
  "外食",
  "交通費",
  "ガソリン",
  "車",
  "家賃",
  "光熱費",
  "通信費",
  "旅行",
  "交際費",
  "日用品",
  "趣味",
  "その他",
];

const incomeCategories = ["給料", "仕送り", "アルバイト", "その他"];

const form = document.getElementById("entryForm");
const editingIdInput = document.getElementById("editingId");
const entryDateInput = document.getElementById("entryDate");
const entryTypeInput = document.getElementById("entryType");
const entryAmountInput = document.getElementById("entryAmount");
const entryCategoryInput = document.getElementById("entryCategory");
const entryMemoInput = document.getElementById("entryMemo");
const submitButton = document.getElementById("submitButton");
const resetFormButton = document.getElementById("resetFormButton");
const filterMonthInput = document.getElementById("filterMonth");
const monthlyBudgetInput = document.getElementById("monthlyBudget");
const saveBudgetButton = document.getElementById("saveBudgetButton");
const csvButton = document.getElementById("csvButton");
const csvImportButton = document.getElementById("csvImportButton");
const csvFileInput = document.getElementById("csvFileInput");
const bonusPanel = document.getElementById("bonusPanel");
const bonusAmountEl = document.getElementById("bonusAmount");
const bonusMessageEl = document.getElementById("bonusMessage");
const bonusCloseButton = document.getElementById("bonusCloseButton");
const fixedCostForm = document.getElementById("fixedCostForm");
const editingFixedIdInput = document.getElementById("editingFixedId");
const fixedNameInput = document.getElementById("fixedName");
const fixedAmountInput = document.getElementById("fixedAmount");
const fixedCategoryInput = document.getElementById("fixedCategory");
const fixedSubmitButton = document.getElementById("fixedSubmitButton");
const resetFixedButton = document.getElementById("resetFixedButton");
const viewTabs = document.querySelectorAll(".view-tab");
const viewSections = document.querySelectorAll(".view-section");

const totalIncomeEl = document.getElementById("totalIncome");
const totalExpenseEl = document.getElementById("totalExpense");
const fixedTotalEl = document.getElementById("fixedTotal");
const summaryFixedTotalEl = document.getElementById("summaryFixedTotal");
const monthlyBalanceEl = document.getElementById("monthlyBalance");
const remainingBudgetEl = document.getElementById("remainingBudget");
const dailyAllowanceEl = document.getElementById("dailyAllowance");
const remainingCard = document.querySelector(".summary-card.remaining");
const dailyCard = document.querySelector(".summary-card.daily");
const balanceCard = document.querySelector(".summary-card.balance");
const calendarMonthTotalEl = document.getElementById("calendarMonthTotal");
const calendarGridEl = document.getElementById("calendarGrid");
const dayDetailEl = document.getElementById("dayDetail");
const categoryListEl = document.getElementById("categoryList");
const historyListEl = document.getElementById("historyList");
const fixedListEl = document.getElementById("fixedList");

let entries = loadEntries();
let budgets = loadBudgets();
let fixedCosts = loadFixedCosts();
let selectedCalendarDate = toDateValue(new Date());

init();

function init() {
  const today = new Date();
  entryDateInput.value = toDateValue(today);
  filterMonthInput.value = toMonthValue(today);

  updateCategoryOptions();
  updateFixedCategoryOptions();
  loadBudgetForSelectedMonth();
  registerServiceWorker();
  setActiveView("home");
  render();

  viewTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveView(tab.dataset.targetView));
  });
  form.addEventListener("submit", handleFormSubmit);
  fixedCostForm.addEventListener("submit", handleFixedCostSubmit);
  entryTypeInput.addEventListener("change", updateCategoryOptions);
  filterMonthInput.addEventListener("change", () => {
    selectedCalendarDate = getDefaultSelectedDate(filterMonthInput.value);
    loadBudgetForSelectedMonth();
    render();
  });
  saveBudgetButton.addEventListener("click", saveBudget);
  resetFormButton.addEventListener("click", resetForm);
  resetFixedButton.addEventListener("click", resetFixedForm);
  csvButton.addEventListener("click", exportCsv);
  csvImportButton.addEventListener("click", () => csvFileInput.click());
  csvFileInput.addEventListener("change", importCsv);
  bonusCloseButton.addEventListener("click", () => {
    bonusPanel.hidden = true;
  });
}

function handleFormSubmit(event) {
  event.preventDefault();

  const entry = {
    id: editingIdInput.value || createId(),
    date: entryDateInput.value,
    type: entryTypeInput.value,
    amount: Number(entryAmountInput.value),
    category: entryCategoryInput.value,
    memo: entryMemoInput.value.trim(),
  };

  if (!entry.date || !entry.amount || entry.amount <= 0 || !entry.category) {
    alert("日付、金額、カテゴリを入力してください。");
    return;
  }

  if (editingIdInput.value) {
    entries = entries.map((item) => (item.id === entry.id ? entry : item));
  } else {
    entries.push(entry);
  }

  saveEntries();
  filterMonthInput.value = entry.date.slice(0, 7);
  selectedCalendarDate = entry.date;
  resetForm();
  loadBudgetForSelectedMonth();
  render();
  setActiveView("home");
}

function updateCategoryOptions() {
  const currentValue = entryCategoryInput.value;
  const categories = entryTypeInput.value === "income" ? incomeCategories : expenseCategories;

  entryCategoryInput.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");

  if (categories.includes(currentValue)) {
    entryCategoryInput.value = currentValue;
  }
}

function updateFixedCategoryOptions() {
  fixedCategoryInput.innerHTML = expenseCategories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join("");
}

function handleFixedCostSubmit(event) {
  event.preventDefault();

  const fixedCost = {
    id: editingFixedIdInput.value || createId(),
    name: fixedNameInput.value.trim(),
    amount: Number(fixedAmountInput.value),
    category: fixedCategoryInput.value,
  };

  if (!fixedCost.name || !fixedCost.amount || fixedCost.amount <= 0 || !fixedCost.category) {
    alert("固定費の項目名、金額、カテゴリを入力してください。");
    return;
  }

  if (editingFixedIdInput.value) {
    fixedCosts = fixedCosts.map((item) => (item.id === fixedCost.id ? fixedCost : item));
  } else {
    fixedCosts.push(fixedCost);
  }

  saveFixedCosts();
  resetFixedForm();
  render();
}

function saveBudget() {
  const month = filterMonthInput.value;
  const amount = Number(monthlyBudgetInput.value || 0);

  budgets[month] = Math.max(0, amount);
  saveBudgets();
  render();
}

function loadBudgetForSelectedMonth() {
  monthlyBudgetInput.value = budgets[filterMonthInput.value] ?? "";
}

function render() {
  const month = filterMonthInput.value;
  const monthEntries = entries
    .filter((entry) => entry.date.startsWith(month))
    .sort((a, b) => b.date.localeCompare(a.date));
  const fixedEntries = getFixedEntriesForMonth(month);

  // 表示中の月だけを対象に、カード用の合計値を作ります。
  const totalIncome = sumByType(monthEntries, "income");
  const variableExpense = sumByType(monthEntries, "expense");
  const fixedExpense = fixedEntries.reduce((total, entry) => total + entry.amount, 0);
  const totalExpense = variableExpense + fixedExpense;
  const balance = totalIncome - totalExpense;
  const budget = Number(budgets[month] || 0);
  const remaining = budget - variableExpense;
  const dailyBudget = getDailyBudgetInfo(month, budget, variableExpense);

  totalIncomeEl.textContent = formatYen(totalIncome);
  totalExpenseEl.textContent = formatYen(totalExpense);
  fixedTotalEl.textContent = formatYen(fixedExpense);
  summaryFixedTotalEl.textContent = formatYen(fixedExpense);
  monthlyBalanceEl.textContent = formatYen(balance);
  remainingBudgetEl.textContent = budget ? formatYen(remaining) : "未設定";
  dailyAllowanceEl.textContent = budget ? formatYen(dailyBudget.remaining) : "未設定";

  balanceCard.classList.toggle("negative", balance < 0);
  dailyCard.classList.toggle("negative", budget > 0 && dailyBudget.remaining < 0);
  remainingCard.classList.toggle("danger", budget > 0 && remaining < 0);
  remainingCard.classList.toggle("warning", budget > 0 && remaining >= 0 && remaining <= budget * 0.2);

  renderCategoryList([...monthEntries, ...fixedEntries]);
  renderCalendar(monthEntries, month);
  renderFixedCostList();
  renderHistoryList(monthEntries);
  renderDailyBonus(month, budget);
}

function renderCategoryList(monthEntries) {
  const expenseEntries = monthEntries.filter((entry) => entry.type === "expense");

  // 支出カテゴリごとの合計を作り、金額が大きい順に表示します。
  const totals = expenseEntries.reduce((result, entry) => {
    result[entry.category] = (result[entry.category] || 0) + entry.amount;
    return result;
  }, {});

  const sortedTotals = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const maxAmount = sortedTotals[0]?.[1] || 0;

  if (!sortedTotals.length) {
    categoryListEl.innerHTML = '<p class="empty-state">この月の支出はまだありません。</p>';
    return;
  }

  categoryListEl.innerHTML = sortedTotals
    .map(([category, amount]) => {
      const width = maxAmount ? Math.round((amount / maxAmount) * 100) : 0;
      return `
        <div class="category-item">
          <div>
            <div class="category-name">${escapeHtml(category)}</div>
            <div class="category-bar" aria-hidden="true"><span style="width: ${width}%"></span></div>
          </div>
          <div class="category-amount">${formatYen(amount)}</div>
        </div>
      `;
    })
    .join("");
}

function renderHistoryList(monthEntries) {
  if (!monthEntries.length) {
    historyListEl.innerHTML = '<p class="empty-state">この月の記録はまだありません。</p>';
    return;
  }

  historyListEl.innerHTML = monthEntries
    .map((entry) => {
      const sign = entry.type === "income" ? "+" : "-";
      const typeLabel = entry.type === "income" ? "収入" : "支出";
      return `
        <article class="history-item">
          <div class="history-main">
            <div>
              <div class="history-date">${entry.date}・${typeLabel}</div>
              <div class="history-category">${escapeHtml(entry.category)}</div>
              ${entry.memo ? `<div class="history-memo">${escapeHtml(entry.memo)}</div>` : ""}
            </div>
            <div class="history-amount ${entry.type}">${sign}${formatYen(entry.amount)}</div>
          </div>
          <div class="history-actions">
            <button type="button" class="edit-button" data-action="edit" data-id="${entry.id}">編集</button>
            <button type="button" class="delete-button" data-action="delete" data-id="${entry.id}">削除</button>
          </div>
        </article>
      `;
    })
    .join("");

  historyListEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleHistoryAction);
  });
}

function renderCalendar(monthEntries, month) {
  const expenseEntries = monthEntries.filter((entry) => entry.type === "expense");
  const dailyExpenses = expenseEntries.reduce((result, entry) => {
    result[entry.date] = (result[entry.date] || 0) + entry.amount;
    return result;
  }, {});
  const selectedEntries = expenseEntries.filter((entry) => entry.date === selectedCalendarDate);
  const monthTotal = expenseEntries.reduce((total, entry) => total + entry.amount, 0);
  const [year, monthNumber] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNumber - 1, 1);
  const lastDay = new Date(year, monthNumber, 0);
  const todayValue = toDateValue(new Date());
  const cells = [];

  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push('<div class="calendar-day empty" aria-hidden="true"></div>');
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const dateValue = `${month}-${String(day).padStart(2, "0")}`;
    const amount = dailyExpenses[dateValue] || 0;
    const classes = [
      "calendar-day",
      amount ? "has-expense" : "",
      dateValue === selectedCalendarDate ? "selected" : "",
      dateValue === todayValue ? "today" : "",
    ].filter(Boolean).join(" ");

    cells.push(`
      <button type="button" class="${classes}" data-date="${dateValue}" aria-label="${day}日 ${amount ? formatYen(amount) : "支出なし"}">
        <span class="calendar-date">${day}</span>
        <span class="calendar-amount">${amount ? shortYen(amount) : ""}</span>
      </button>
    `);
  }

  calendarMonthTotalEl.textContent = formatYen(monthTotal);
  calendarGridEl.innerHTML = cells.join("");
  calendarGridEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      selectedCalendarDate = button.dataset.date;
      render();
    });
  });

  renderDayDetail(selectedCalendarDate, selectedEntries);
}

function renderDayDetail(date, dayEntries) {
  const total = dayEntries.reduce((sum, entry) => sum + entry.amount, 0);

  if (!date.startsWith(filterMonthInput.value)) {
    dayDetailEl.innerHTML = '<p class="empty-state">日付を選ぶと明細が表示されます。</p>';
    return;
  }

  if (!dayEntries.length) {
    dayDetailEl.innerHTML = `
      <div class="day-detail-header">
        <span>${date}</span>
        <strong>支出なし</strong>
      </div>
    `;
    return;
  }

  dayDetailEl.innerHTML = `
    <div class="day-detail-header">
      <span>${date}</span>
      <strong>${formatYen(total)}</strong>
    </div>
    ${dayEntries.map((entry) => `
      <article class="history-item">
        <div class="history-main">
          <div>
            <div class="history-category">${escapeHtml(entry.category)}</div>
            ${entry.memo ? `<div class="history-memo">${escapeHtml(entry.memo)}</div>` : ""}
          </div>
          <div class="history-amount expense">-${formatYen(entry.amount)}</div>
        </div>
      </article>
    `).join("")}
  `;
}

function renderFixedCostList() {
  const sortedFixedCosts = fixedCosts.slice().sort((a, b) => b.amount - a.amount);

  if (!sortedFixedCosts.length) {
    fixedListEl.innerHTML = '<p class="empty-state">固定費はまだ登録されていません。</p>';
    return;
  }

  fixedListEl.innerHTML = sortedFixedCosts
    .map((fixedCost) => `
      <article class="history-item">
        <div class="history-main">
          <div>
            <div class="history-date">毎月・固定費</div>
            <div class="history-category">${escapeHtml(fixedCost.name)}</div>
            <div class="history-memo">${escapeHtml(fixedCost.category)}</div>
          </div>
          <div class="history-amount fixed">${formatYen(fixedCost.amount)}</div>
        </div>
        <div class="history-actions">
          <button type="button" class="edit-button" data-action="edit" data-id="${fixedCost.id}">編集</button>
          <button type="button" class="delete-button" data-action="delete" data-id="${fixedCost.id}">削除</button>
        </div>
      </article>
    `)
    .join("");

  fixedListEl.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", handleFixedCostAction);
  });
}

function handleHistoryAction(event) {
  const id = event.currentTarget.dataset.id;
  const action = event.currentTarget.dataset.action;
  const entry = entries.find((item) => item.id === id);

  if (!entry) return;

  if (action === "delete") {
    if (!confirm("この記録を削除しますか？")) return;
    entries = entries.filter((item) => item.id !== id);
    saveEntries();
    render();
    return;
  }

  editingIdInput.value = entry.id;
  entryDateInput.value = entry.date;
  entryTypeInput.value = entry.type;
  updateCategoryOptions();
  entryCategoryInput.value = entry.category;
  entryAmountInput.value = entry.amount;
  entryMemoInput.value = entry.memo;
  submitButton.textContent = "更新する";
  setActiveView("entry");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleFixedCostAction(event) {
  const id = event.currentTarget.dataset.id;
  const action = event.currentTarget.dataset.action;
  const fixedCost = fixedCosts.find((item) => item.id === id);

  if (!fixedCost) return;

  if (action === "delete") {
    if (!confirm("この固定費を削除しますか？")) return;
    fixedCosts = fixedCosts.filter((item) => item.id !== id);
    saveFixedCosts();
    render();
    return;
  }

  editingFixedIdInput.value = fixedCost.id;
  fixedNameInput.value = fixedCost.name;
  fixedAmountInput.value = fixedCost.amount;
  fixedCategoryInput.value = fixedCost.category;
  fixedSubmitButton.textContent = "固定費を更新";
  setActiveView("budget");
  document.getElementById("fixedTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setActiveView(viewName) {
  viewTabs.forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.targetView === viewName);
  });

  viewSections.forEach((section) => {
    section.classList.toggle("view-hidden", section.dataset.view !== viewName);
  });

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetForm() {
  editingIdInput.value = "";
  form.reset();
  entryDateInput.value = toDateValue(new Date());
  entryTypeInput.value = "expense";
  updateCategoryOptions();
  submitButton.textContent = "登録する";
}

function resetFixedForm() {
  editingFixedIdInput.value = "";
  fixedCostForm.reset();
  updateFixedCategoryOptions();
  fixedSubmitButton.textContent = "固定費を追加";
}

function exportCsv() {
  if (!entries.length && !fixedCosts.length) {
    alert("出力できるデータがありません。");
    return;
  }

  // Excelでも開きやすいようにBOM付きUTF-8で出力します。
  const header = ["日付", "種別", "金額", "カテゴリ", "メモ"];
  const entryRows = entries
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry) => [
      entry.date,
      entry.type === "income" ? "収入" : "支出",
      entry.amount,
      entry.category,
      entry.memo,
    ]);
  const fixedRows = fixedCosts
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name, "ja"))
    .map((fixedCost) => [
      "毎月",
      "固定費",
      fixedCost.amount,
      fixedCost.category,
      fixedCost.name,
    ]);

  const rows = [...entryRows, ...fixedRows];
  const csv = [header, ...rows].map((row) => row.map(toCsvCell).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `kakeibo-${toDateValue(new Date())}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function importCsv(event) {
  const file = event.target.files[0];
  event.target.value = "";

  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCsv(String(reader.result || "").replace(/^\uFEFF/, ""));
      const result = importCsvRows(rows);
      render();
      alert(`CSV読み込み完了\n通常記録: ${result.entries}件\n固定費: ${result.fixedCosts}件\n重複: ${result.duplicates}件\nスキップ: ${result.skipped}件`);
    } catch {
      alert("CSVを読み込めませんでした。CSV出力したファイルと同じ形式か確認してください。");
    }
  };
  reader.onerror = () => {
    alert("CSVを読み込めませんでした。");
  };
  reader.readAsText(file);
}

function importCsvRows(rows) {
  const result = {
    entries: 0,
    fixedCosts: 0,
    duplicates: 0,
    skipped: 0,
  };

  if (rows.length <= 1) {
    result.skipped = rows.length;
    return result;
  }

  const bodyRows = rows.slice(1);
  const entryKeys = new Set(entries.map(getEntryKey));
  const fixedCostKeys = new Set(fixedCosts.map(getFixedCostKey));

  bodyRows.forEach((row) => {
    const [date, typeLabel, amountText, category, memo = ""] = row.map((cell) => cell.trim());
    const amount = Number(amountText.replace(/[¥,\s]/g, ""));

    if (!typeLabel || !amount || amount <= 0 || !category) {
      result.skipped += 1;
      return;
    }

    if (typeLabel === "固定費" || date === "毎月") {
      const fixedCost = {
        id: createId(),
        name: memo || category,
        amount,
        category,
      };
      const key = getFixedCostKey(fixedCost);

      if (fixedCostKeys.has(key)) {
        result.duplicates += 1;
        return;
      }

      fixedCosts.push(fixedCost);
      fixedCostKeys.add(key);
      result.fixedCosts += 1;
      return;
    }

    const type = typeLabel === "収入" ? "income" : typeLabel === "支出" ? "expense" : "";
    const isValidDate = /^\d{4}-\d{2}-\d{2}$/.test(date);

    if (!type || !isValidDate) {
      result.skipped += 1;
      return;
    }

    const entry = {
      id: createId(),
      date,
      type,
      amount,
      category,
      memo,
    };
    const key = getEntryKey(entry);

    if (entryKeys.has(key)) {
      result.duplicates += 1;
      return;
    }

    entries.push(entry);
    entryKeys.add(key);
    result.entries += 1;
  });

  saveEntries();
  saveFixedCosts();
  return result;
}

function sumByType(items, type) {
  return items
    .filter((entry) => entry.type === type)
    .reduce((total, entry) => total + entry.amount, 0);
}

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function loadBudgets() {
  try {
    return JSON.parse(localStorage.getItem(BUDGET_KEY)) || {};
  } catch {
    return {};
  }
}

function saveBudgets() {
  localStorage.setItem(BUDGET_KEY, JSON.stringify(budgets));
}

function loadFixedCosts() {
  try {
    return JSON.parse(localStorage.getItem(FIXED_COST_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFixedCosts() {
  localStorage.setItem(FIXED_COST_KEY, JSON.stringify(fixedCosts));
}

function getFixedEntriesForMonth(month) {
  return fixedCosts.map((fixedCost) => ({
    id: `fixed-${fixedCost.id}`,
    date: `${month}-01`,
    type: "expense",
    amount: fixedCost.amount,
    category: fixedCost.category,
    memo: fixedCost.name,
    fixed: true,
  }));
}

function getDailyBudgetInfo(month, budget, variableExpense) {
  const [year, monthNumber] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNumber, 0).getDate();
  const installments = getDailyBudgetInstallments(month, daysInMonth);
  const accrued = getAccruedDailyBudget(budget, installments, daysInMonth);

  return {
    accrued,
    remaining: accrued - variableExpense,
  };
}

function renderDailyBonus(month, budget) {
  const now = new Date();
  const currentMonth = toMonthValue(now);

  if (!budget || month !== currentMonth) {
    bonusPanel.hidden = true;
    return;
  }

  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayCount = getDailyBudgetInstallments(month, daysInMonth);
  const yesterdayCount = Math.max(0, todayCount - 1);
  const todayAdded = getAccruedDailyBudget(budget, todayCount, daysInMonth)
    - getAccruedDailyBudget(budget, yesterdayCount, daysInMonth);

  if (todayCount <= 0) {
    bonusAmountEl.textContent = `+${formatYen(getAccruedDailyBudget(budget, 1, daysInMonth))}`;
    bonusMessageEl.textContent = "朝5時になると今日の日割り予算が追加されます。";
  } else {
    bonusAmountEl.textContent = `+${formatYen(todayAdded)}`;
    bonusMessageEl.textContent = `今日の日割り予算が追加されました。${todayCount}日分まで反映中です。`;
  }

  bonusPanel.hidden = false;
}

function getAccruedDailyBudget(budget, installments, daysInMonth) {
  return installments === daysInMonth
    ? budget
    : Math.floor((budget * installments) / daysInMonth);
}

function getDailyBudgetInstallments(month, daysInMonth) {
  const now = new Date();
  const currentMonth = toMonthValue(now);

  if (month < currentMonth) {
    return daysInMonth;
  }

  if (month > currentMonth) {
    return 0;
  }

  const todayInstallment = now.getHours() >= 5 ? now.getDate() : now.getDate() - 1;
  return Math.min(daysInMonth, Math.max(0, todayInstallment));
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator) || location.protocol === "file:") {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

function formatYen(amount) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(amount);
}

function shortYen(amount) {
  if (amount >= 10000) {
    return `${Math.round(amount / 1000) / 10}万`;
  }

  return `¥${amount.toLocaleString("ja-JP")}`;
}

function toDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toMonthValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getDefaultSelectedDate(month) {
  const today = toDateValue(new Date());
  return today.startsWith(month) ? today : `${month}-01`;
}

function createId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let insideQuote = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"' && insideQuote && nextChar === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      insideQuote = !insideQuote;
      continue;
    }

    if (char === "," && !insideQuote) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !insideQuote) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      row.push(cell);
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value !== "")) {
    rows.push(row);
  }

  return rows;
}

function getEntryKey(entry) {
  return [entry.date, entry.type, entry.amount, entry.category, entry.memo].join("\u001F");
}

function getFixedCostKey(fixedCost) {
  return [fixedCost.name, fixedCost.amount, fixedCost.category].join("\u001F");
}

function toCsvCell(value) {
  let text = String(value ?? "");

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

// 画面に差し込む文字列はエスケープして、メモ入力からHTMLが混ざらないようにします。
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
