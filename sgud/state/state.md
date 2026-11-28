# w-dwdata-builder 狀態(現況)

> 只記現況,不寫過程(過程見經驗)。規則見 `sgud/rule/rulebook.md`。

## 1. wsemi 列舉函數之第 2 參數遷移(R-WS-01、R-WS-02)

- 2026-11-26 完成:依賴升至 `wsemi` ^1.9.80、`w-data-scheduler` ^1.0.73、`w-package-tools` ^1.1.32(devDependencies)。
- 本庫 `src` 無實際列舉呼叫(只有 JSDoc 範例);既有數據之列舉由使用端之 `funGetCurrent` 負責。站點全集(皆已為 `fsTreeFolder(fdDwCurrent, { levelLimit: 1 })`,語意為只列第 1 層,與舊寫法一致):
  - `src/WDwdataBuilder.mjs:121`(JSDoc 範例)
  - `README.md:93`(範例)
  - `g.mjs:71`、`g_timer.mjs:225`(根目錄範例)
  - `test/unit-once.test.mjs:80`、`test/unit-srLog.test.mjs:143`、`test/unit-timer.test.mjs:234`
- 當時之測試(3 檔 14 案)全綠;同批測試以舊寫法對 wsemi 1.9.80 執行為 10 案紅、4 案綠。現行案數見第 2 節。
- 已知缺口:無。測試用之 `fdDwCurrent` 只含檔案、無子資料夾,故既有測試無法分辨「第 1 層」與「窮舉」,此為使用端回呼之用法,非 `src` 行為。

## 2. 只讓處理成功之項進 `fdDwCurrent`(R-DW-01～03)

- 2026-11-28 完成,未提交、未發布(版本仍 1.1.45);依賴 `w-data-scheduler` ^1.0.77。
- 實作:`src/WDwdataBuilder.mjs` 之 `funBeforeEndNec`(依本輪結果)、`moveItems`(逐項)、`getFpItem`(主鍵值對檔名)、比對完成事件之監聽(`numCompared`)。
- README〈Breaking changes〉與 JSDoc 已載明行為改變;不設相容選項。
- 測試:`npm test`(4 檔 47 案:`unit-syncCurrent` 31、`unit-srLog` 14、`unit-once` 1、`unit-timer` 1)。
- 使用端(唯讀實跑):部分使用端套件之測試斷言舊事件序列,係升 `w-data-scheduler` 1.0.77 所致;以本庫改動前與改動後分別實跑,紅案相同。
- 已知限制:
  - 有失敗或未處理項之輪,未按 `<主鍵值>.json` 存放之數據(整批單檔、主鍵值帶路徑分隔字元、子資料夾)不更新 `fdDwCurrent`,下輪全部重新處理(至少一次語意,不遺失)。
  - 檔名不分大小寫之檔案系統上,僅大小寫不同之兩主鍵共用同一數據檔(下載端本即互相覆寫)。
  - JSDoc 之 `opt.keyId` 寫「預設 `'keyId'`」,實作之預設為 `'id'`(本輪前即如此,未改)。
