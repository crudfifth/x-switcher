interface Account {
  name: string;
  cookies: chrome.cookies.Cookie[];
}

document.addEventListener("DOMContentLoaded", () => {
  const accountList = document.getElementById("account-list") as HTMLDivElement;
  const saveButton = document.getElementById("save-session") as HTMLButtonElement;
  const exportButton = document.getElementById("export-data") as HTMLButtonElement;
  const importButton = document.getElementById("import-data") as HTMLButtonElement;
  const importFile = document.getElementById("import-file") as HTMLInputElement;
  const accountNameInput = document.getElementById("account-name") as HTMLInputElement;

  chrome.storage.local.get(["accounts"], (data) => {
    const accounts: Account[] = data.accounts || [];
    accounts.forEach((account, index) => {
      const button = document.createElement("button");
      button.textContent = account.name;
      button.classList.add("account-button");
      button.addEventListener("click", () => {
        chrome.runtime.sendMessage({ action: "load_session", index });
      });
      accountList.appendChild(button);
    });
  });

  saveButton.addEventListener("click", () => {
    const accountName = accountNameInput.value.trim();
    if (!accountName) return;

    chrome.runtime.sendMessage({ action: "save_session", name: accountName });
  });

  exportButton.addEventListener("click", () => {
    chrome.storage.local.get(["accounts"], (data) => {
      const json = JSON.stringify(data.accounts, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "x_accounts.json";
      a.click();
    });
  });
});
