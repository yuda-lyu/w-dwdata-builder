# w-dwdata-builder 規則帳本(藍圖)

> 本檔為程式碼須長成什麼樣之規則,附判準與對應測試;**現況**(各條做到哪裡)見 `sgud/state/state.md`。
> 套件定位:`WDwdataBuilder`——基於檔案之下載數據與任務建構器(下載、比對、依新增/變更/刪除呼叫使用端函數、搬移結果),本身不列舉資料夾,以使用端傳入之 `funGetCurrent` 取得既有數據。

## 1. wsemi 列舉函數之用法(`fsTreeFolder` 等)

> 需求出處:wsemi 1.9.80 起列舉函數(`fsTreeFolder`、`fsTreeFolderWithHash`、`fsGetFilesInFolder`、`fsGetFilesWithHashInFolder`、`fsGetFoldersInFolder` 及各 `*Core`)之第 2 參數由 `levelLimit`(舊預設 1 層)改為 `opt = {}`;Gitea #220。
> 盤點指令(每處須為 `{ levelLimit: n }` 或表意窮舉之省略,不得為數字):`git grep -nE "\b(fsTreeFolder|fsTreeFolderWithHash|fsGetFilesInFolder|fsGetFilesWithHashInFolder|fsGetFoldersInFolder)(Core)?\s*\(" -- . ':!dist' ':!docs'`

| 條號 | 規則 | 判準 / 對應測試 | 狀態 |
|---|---|---|---|
| R-WS-01 | 本庫(含 `src` 之 JSDoc 範例、根目錄 `g*.mjs` 範例、README、測試)呼叫上列列舉函數,第 2 參數一律為物件;須維持舊行為「只列第 1 層」者寫 `{ levelLimit: 1 }`,**不得省略第 2 參數**(新版省略即窮舉全部層級),**不得傳數字**(新版拋 `invalid opt: must be an object`) | 盤點指令見本節表上方;站點全集見 `sgud/state/state.md`;`test/unit-once.test.mjs`、`test/unit-srLog.test.mjs`、`test/unit-timer.test.mjs` 之 `funGetCurrent` 若用舊寫法會於讀取既有數據處拋錯而轉紅(修前 10 案紅、修後 14 案綠) | 已做 |
| R-WS-02 | 需求依賴 `wsemi` ≥ 1.9.80(`package.json` 之 `dependencies`);舊版 wsemi 遇物件之第 2 參數視為無效層數而取 1 層,故本庫之寫法於新舊版皆為第 1 層,但升版後才有「數字即拋錯」之保護 | `package.json` 之 `wsemi` 版本範圍 | 已做 |
