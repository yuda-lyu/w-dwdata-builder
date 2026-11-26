# w-dwdata-builder 狀態(現況)

> 只記現況,不寫過程(過程見經驗)。規則見 `sgud/rule/rulebook.md`。

## 1. wsemi 列舉函數之第 2 參數遷移(R-WS-01、R-WS-02)

- 2026-11-26 完成:依賴升至 `wsemi` ^1.9.80、`w-data-scheduler` ^1.0.73、`w-package-tools` ^1.1.32(devDependencies)。
- 本庫 `src` 無實際列舉呼叫(只有 JSDoc 範例);既有數據之列舉由使用端之 `funGetCurrent` 負責。站點全集(皆已為 `fsTreeFolder(fdDwCurrent, { levelLimit: 1 })`,語意為只列第 1 層,與舊寫法一致):
  - `src/WDwdataBuilder.mjs:108`(JSDoc 範例)
  - `README.md:93`(範例)
  - `g.mjs:71`、`g_timer.mjs:225`(根目錄範例)
  - `test/unit-once.test.mjs:80`、`test/unit-srLog.test.mjs:143`、`test/unit-timer.test.mjs:234`
- 測試:`npm test`(3 檔 14 案)全綠;同批測試以舊寫法對 wsemi 1.9.80 執行為 10 案紅、4 案綠。
- 已知缺口:無。測試用之 `fdDwCurrent` 只含檔案、無子資料夾,故既有測試無法分辨「第 1 層」與「窮舉」,此為使用端回呼之用法,非 `src` 行為。
