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

## 2. `fdDwCurrent` 之更新(結束前依本輪結果)

> 需求出處:使用端回報(處理失敗之項亦被同步進 `fdDwCurrent`,以其為比對基準者永不重試)。前提:`w-data-scheduler` ≥ 1.0.77,單項失敗不中止本輪,本輪結果 `{ success: { add, modify, remove }, failed, msgCancel }` 交 `funBeforeEnd` 與 `end` 事件。
> 站點盤點指令:`git grep -nE "fsSyncFolder|fsCopyFile|fsDeleteFile|funBeforeEndNec|funBeforeEndCall" -- src`;寫入或刪除 `fdDwCurrent` 內容之呼叫只限 `funBeforeEndNec`(完全同步)與 `moveItems`(逐項搬移)。

| 條號 | 規則 | 判準 / 對應測試 | 狀態 |
|---|---|---|---|
| R-DW-01 | 只讓處理成功之項進 `fdDwCurrent`:①`msgCancel` 非空字串(或未收到結果)時不同步;②完成判定只取正向證據:成功項總數(add+modify+remove)等於比對完成事件之 `numRemove+numAdd+numModify` 時,`fsSyncFolder(fdDwAttime, fdDwCurrent)` 完全同步;比對數未取得即視為未全部成功;③其餘(有失敗或未處理之項)僅逐項搬移成功項,不做資料夾同步,其他檔案維持前次內容(新增失敗者不出現、變更失敗者保留舊版、刪除失敗者不刪) | `test/unit-syncCurrent.test.mjs`(組合 64 格、取消 7 種、中途中止、重試至成功、防抖) | 已做 |
| R-DW-02 | 逐項搬移以第 1 層之 `<主鍵值>.json` 對應各項:刪除項先刪(`fdDwCurrent`),新增與變更項後複製(`fdDwAttime` → `fdDwCurrent`);主鍵值不能作為單一檔名(`path.basename` 不等於檔名)者不操作;找不到數據檔之成功項不搬,發 1 筆 `warn` 事件 `move-data-to-current`(`num`、固定訊息,不含主鍵值與路徑),紀錄通道拋錯不影響結束前階段;單項複製或刪除錯誤不中止其餘項,末了拋第 1 個錯誤(結束前階段記 `error`,不呼叫使用端 `funBeforeEnd`) | 同上(整批單檔、缺檔、路徑分隔字元、大小寫改名、複製與刪除失敗、warn 通道) | 已做 |
| R-DW-03 | `funBeforeEnd` 以排程器交來之本輪結果呼叫使用端 `funBeforeEnd(結果)`,呼叫時 `fdDwCurrent` 已更新完畢;`end` 事件與其他事件照樣往上傳;不設相容選項(原則 14) | `test/unit-syncCurrent.test.mjs`(結果與時點);`test/unit-srLog.test.mjs`(單項失敗之事件序列與 warn、console) | 已做 |
