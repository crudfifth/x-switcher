interface Account {
  name?: string;
  twid: string;
  cookies: chrome.cookies.Cookie[];
  tag?: string;
  email?: string;
  password?: string;
  memo?: string;
}

interface SortableOptions {
  animation?: number;
  handle?: string;
  onEnd?: (evt: { oldIndex: number; newIndex: number }) => void;
}

interface SortableStatic {
  create: (element: HTMLElement, options: SortableOptions) => void;
}

declare const Sortable: SortableStatic;

// DOM要素の参照を取得
const accountTableBody = document.querySelector("#account-table tbody") as HTMLTableSectionElement;
const selectAllCheckbox = document.getElementById("select-all") as HTMLInputElement;
const deleteSelectedButton = document.getElementById("delete-selected-btn") as HTMLButtonElement;
const exportButton = document.getElementById("export-data") as HTMLButtonElement;
const importButton = document.getElementById("import-data") as HTMLButtonElement;
const importFileInput = document.getElementById("import-file") as HTMLInputElement;
const editToggleButton = document.getElementById("edit-toggle") as HTMLButtonElement;

let accounts: Account[] = []; // アカウント一覧を保持
let isEditMode = false; // 編集モードの状態

// 初期化処理
document.addEventListener("DOMContentLoaded", async () => {
  const data = await chrome.storage.local.get(["accounts"]);
  accounts = data.accounts ?? [];
  renderAccountTable();

  // SortableJS を使って行の並び替え機能を追加
  Sortable.create(accountTableBody, {
    animation: 150,
    handle: "tr",
    onEnd: () => {
      handleSortEnd();
    },
  });
});

// アカウント一覧テーブルを描画
function renderAccountTable(): void {
  accountTableBody.innerHTML = "";

  for (const [index, account] of accounts.entries()) {
    const row = document.createElement("tr");

    // 各セルを描画（編集モードならinput表示）
    row.innerHTML = `
      <td><input type="checkbox" class="account-checkbox" data-index="${index}" /></td>
      <td>${account.name ?? account.twid}</td>
      <td>${renderCell(account.tag, index, "tag")}</td>
      <td>${renderCell(account.email, index, "email")}</td>
      <td>${renderCell(account.password, index, "password")}</td>
      <td>${renderCell(account.memo, index, "memo")}</td>
    `;

    accountTableBody.appendChild(row);
  }

  // チェックボックスのイベント追加
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".account-checkbox");
  for (const cb of Array.from(checkboxes)) {
    cb.addEventListener("change", handleCheckboxChange);
  }

  updateDeleteButtonState();
}

// セルの中身を生成（編集モードならinput、それ以外は文字列）
function renderCell(value: string | undefined, index: number, field: keyof Account): string {
  if (!isEditMode) return value ?? "";
  return `<input type="text" data-index="${index}" data-field="${field}" value="${value ?? ""}" />`;
}

// 並び替え終了時の処理（accountsを並び替えて保存）
async function handleSortEnd(): Promise<void> {
  const newAccounts: Account[] = [];
  const rows = Array.from(accountTableBody.querySelectorAll("tr"));

  for (const row of rows) {
    const indexAttr = row.querySelector("input.account-checkbox")?.getAttribute("data-index");
    const index = typeof indexAttr === "string" ? Number.parseInt(indexAttr, 10) : Number.NaN;
    if (!Number.isNaN(index)) {
      newAccounts.push(accounts[index]);
    }
  }

  accounts = newAccounts;
  await chrome.storage.local.set({ accounts });
  renderAccountTable();
}

// チェックボックスの状態を監視
function handleCheckboxChange(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".account-checkbox");

  let anyChecked = false;
  let allChecked = true;

  for (const cb of Array.from(checkboxes)) {
    if (cb.checked) {
      anyChecked = true;
    } else {
      allChecked = false;
    }
  }

  deleteSelectedButton.disabled = !anyChecked;
  selectAllCheckbox.checked = allChecked;
}

// 全選択チェックボックスの挙動
selectAllCheckbox.addEventListener("change", () => {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".account-checkbox");
  for (const cb of Array.from(checkboxes)) {
    cb.checked = selectAllCheckbox.checked;
  }
  updateDeleteButtonState();
});

// 選択されたアカウントを削除
deleteSelectedButton.addEventListener("click", async () => {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".account-checkbox:checked");
  const indexesToDelete: number[] = [];

  for (const cb of Array.from(checkboxes)) {
    const indexAttr = cb.dataset.index;
    const parsed = typeof indexAttr === "string" ? Number.parseInt(indexAttr, 10) : Number.NaN;
    if (!Number.isNaN(parsed)) {
      indexesToDelete.push(parsed);
    }
  }

  accounts = accounts.filter((_, index) => !indexesToDelete.includes(index));
  await chrome.storage.local.set({ accounts });
  renderAccountTable();
});

// アカウントをJSONでエクスポート
exportButton.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(accounts, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "accounts.json";
  a.click();
  URL.revokeObjectURL(url);
});

// JSONファイルからアカウントをインポート
importButton.addEventListener("click", async () => {
  const file = importFileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const result = e.target?.result;
      if (typeof result === "string") {
        const imported = JSON.parse(result) as Account[];
        accounts = imported;
        await chrome.storage.local.set({ accounts });
        renderAccountTable();
      }
    } catch (error) {
      alert("インポートに失敗しました: 不正なJSONファイルです");
    }
  };
  reader.readAsText(file);
});

// 編集モード切り替えボタンの挙動
editToggleButton.addEventListener("click", async () => {
  if (isEditMode) {
    // 編集モード解除時に値を保存
    const inputs = document.querySelectorAll<HTMLInputElement>("td input[type='text']");
    for (const input of Array.from(inputs)) {
      const index = Number.parseInt(input.dataset.index ?? "-1", 10);
      const field = input.dataset.field as keyof Account;

      if (field === "cookies") continue; // Cookie配列は編集対象外としてスキップ

      if (accounts[index] && field) {
        accounts[index][field] = input.value;
      }
    }
    await chrome.storage.local.set({ accounts });
    editToggleButton.textContent = "編集モードにする";
  } else {
    // 編集モードに入る
    editToggleButton.textContent = "保存する";
  }

  isEditMode = !isEditMode;
  renderAccountTable();
});

// 削除ボタンの有効/無効を制御
function updateDeleteButtonState(): void {
  const checkboxes = document.querySelectorAll<HTMLInputElement>(".account-checkbox");

  let anyChecked = false;
  for (const cb of Array.from(checkboxes)) {
    if (cb.checked) {
      anyChecked = true;
      break;
    }
  }

  deleteSelectedButton.disabled = !anyChecked;
}
