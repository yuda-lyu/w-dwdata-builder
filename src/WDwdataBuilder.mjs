import path from 'path'
import get from 'lodash-es/get.js'
import each from 'lodash-es/each.js'
import size from 'lodash-es/size.js'
import isestr from 'wsemi/src/isestr.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import isbol from 'wsemi/src/isbol.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import fsIsFolder from 'wsemi/src/fsIsFolder.mjs'
import fsCreateFolder from 'wsemi/src/fsCreateFolder.mjs'
import fsSyncFolder from 'wsemi/src/fsSyncFolder.mjs'
import fsIsFile from 'wsemi/src/fsIsFile.mjs'
import fsCopyFile from 'wsemi/src/fsCopyFile.mjs'
import fsDeleteFile from 'wsemi/src/fsDeleteFile.mjs'
import WDataScheduler from 'w-data-scheduler/src/WDataScheduler.mjs'


/**
 * 基於檔案之下載數據變更驅動任務建構器
 *
 * 外部調用僅須提供下載數據，並須放置於fdDwAttime，前次數據程序會於結束前自動備份，並放置於fdDwCurrent
 *
 * funAdd、funModify、funRemove逐項呼叫，任一項失敗(拋錯或reject)僅該項失敗，其餘項照常處理。結束前依本輪結果(即funBeforeEnd所接收者)更新fdDwCurrent，只讓處理成功之項進入，使處理失敗與未處理之項下輪仍比對出差異而重試：
 * (1) 本輪取消(msgCancel有值，例如funAfterStart、funDownload、funGetCurrent或比對拋錯、無數據、無差異)時不同步；
 * (2) 比對出之項全部處理成功時，將fdDwAttime完全同步至fdDwCurrent；
 * (3) 有處理失敗或未處理之項時，僅逐項搬移處理成功之項：新增與變更項以fdDwAttime/<主鍵值>.json覆蓋fdDwCurrent內同名檔，刪除項移除fdDwCurrent/<主鍵值>.json，其餘檔案維持前次內容。
 * 故各項數據須各自存為第1層之<主鍵值>.json且該檔僅含該項。處理成功而找不到數據檔(含主鍵值帶路徑分隔字元)之項不搬移，下輪依funGetCurrent比對結果再處理，並發出1筆warn事件move-data-to-current(欄位num為項數)。
 * 檔案複製或刪除失敗時其餘項照常搬移，之後於結束前階段記錄error事件，且不呼叫funBeforeEnd
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.keyId='keyId'] 輸入各筆數據之主鍵字串，預設'keyId'
 * @param {String} [opt.fdTagRemove='./_tagRemove'] 輸入暫存標記為刪除數據資料夾字串，預設'./_tagRemove'
 * @param {String} [opt.fdDwAttime='./_dwAttime'] 輸入儲存下載數據資料夾字串，各項數據存為<主鍵值>.json，預設'./_dwAttime'
 * @param {String} [opt.fdDwCurrent='./_dwCurrent'] 輸入儲存前次數據資料夾字串，僅收處理成功之項(見上方說明)，預設'./_dwCurrent'
 * @param {String} [opt.fdTaskCpActualSrc=`./_taskCpActualSrc`] 輸入任務狀態之來源端完整資料夾字串，預設`./_taskCpActualSrc`
 * @param {String} [opt.fdTaskCpSrc=`./_taskCpSrc`] 輸入任務狀態之來源端資料夾字串，預設`./_taskCpSrc`
 * @param {Object} [opt.srLog=null] 輸入事件紀錄物件，需提供函數info、warn與error，各接收一紀錄物件，供偵測數據變更時紀錄各階段事件，未提供時不進行紀錄，其中warn用於本輪有逐項處理失敗項(事件fail-items-stage-main)與成功項找不到數據檔(事件move-data-to-current)時之紀錄，預設null
 * @param {Boolean} [opt.useShowLog=true] 輸入是否於偵測過程將錯誤與取消訊息輸出至console布林值，預設true
 * @param {Function} [opt.funDownload=null] 輸入取得下載數據之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funGetCurrent=null] 輸入取得前次數據之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funAdd=null] 輸入當有新資料時，需要連動處理之函數，須可重複執行，預設null
 * @param {Function} [opt.funModify=null] 輸入當有資料需更新時，需要連動處理之函數，須可重複執行，預設null
 * @param {Function} [opt.funRemove=null] 輸入當有資料需刪除時，需要連動處理之函數，須可重複執行，預設null
 * @param {Function} [opt.funAfterStart=null] 輸入偵測程序剛開始啟動時，需要處理之函數，預設null
 * @param {Function} [opt.funBeforeEnd=null] 輸入偵測程序要結束前，需要處理之函數，接收本輪結果物件{ success: { add, modify, remove }, failed, msgCancel }：success各陣列為處理成功之主鍵值，failed各項為{ id, mode, event, msg }，msgCancel為本輪取消訊息(否則為空字串)；呼叫時fdDwCurrent已依上方說明更新完畢，預設null
 * @param {Number} [opt.timeToleranceRemove=0] 輸入刪除任務之防抖時長，單位ms，預設0，代表不使用
 * @returns {Object} 回傳事件物件，可呼叫函數on監聽change與end事件，end事件之監聽函數接收本輪結果物件(內容同funBeforeEnd所接收者)
 * @example
 *
 * import fs from 'fs'
 * import _ from 'lodash-es'
 * import w from 'wsemi'
 * import WDwdataBuilder from './src/WDwdataBuilder.mjs'
 *
 * //fdResult, 額外創建供另產結果之用
 * let fdResult = `./_result`
 * w.fsCleanFolder(fdResult)
 *
 * //fdTagRemove
 * let fdTagRemove = `./_tagRemove`
 * w.fsCleanFolder(fdTagRemove)
 *
 * //fdDwAttime
 * let fdDwAttime = `./_dwAttime`
 * w.fsCleanFolder(fdDwAttime)
 *
 * //fdDwCurrent
 * let fdDwCurrent = `./_dwCurrent`
 * w.fsCleanFolder(fdDwCurrent)
 *
 * //fdTaskCpActualSrc
 * let fdTaskCpActualSrc = `./_taskCpActualSrc`
 * w.fsCleanFolder(fdTaskCpActualSrc)
 *
 * //fdTaskCpSrc
 * let fdTaskCpSrc = `./_taskCpSrc`
 * w.fsCleanFolder(fdTaskCpSrc)
 *
 * //funDownload
 * let funDownload = async() => {
 *
 *     //items
 *     let items = [
 *         {
 *             'id': '114115',
 *             'tag': '2025082116374751115',
 *             'number': '115',
 *             'time': '2025-08-21T16:37:47+08:00',
 *             'timeRec': '2025-08-21 16:37:47',
 *             'timeTag': '20250821163747',
 *             'ml': '5.1',
 *         },
 *         {
 *             'id': '114116',
 *             'tag': '2025082214061554116',
 *             'number': '116',
 *             'time': '2025-08-22T14:06:15+08:00',
 *             'timeRec': '2025-08-22 14:06:15',
 *             'timeTag': '20250822140615',
 *             'ml': '5.4',
 *         },
 *     ]
 *
 *     _.each(items, (v) => {
 *
 *         let fp = `${fdDwAttime}/${v.id}.json`
 *
 *         fs.writeFileSync(fp, JSON.stringify(v), 'utf8')
 *
 *     })
 *
 *     return items
 * }
 *
 * //funGetCurrent
 * let funGetCurrent = async() => {
 *
 *     //vfps
 *     let vfps = w.fsTreeFolder(fdDwCurrent, { levelLimit: 1 })
 *     // console.log('vfps', vfps)
 *
 *     //items
 *     let items = []
 *     _.each(vfps, (v) => {
 *
 *         let j = fs.readFileSync(v.path, 'utf8')
 *         let item = JSON.parse(j)
 *
 *         items.push(item)
 *
 *     })
 *
 *     return items
 * }
 *
 * //funRemove
 * let funRemove = async(v) => {
 *
 *     let fd = `${fdResult}/${v.id}`
 *
 *     if (w.fsIsFolder(fd)) {
 *         w.fsDeleteFolder(fd)
 *     }
 *
 * }
 *
 * //funAdd
 * let funAdd = async(v) => {
 *
 *     let fd = `${fdResult}/${v.id}`
 *
 *     if (w.fsIsFolder(fd)) {
 *         w.fsCleanFolder(fd)
 *     }
 *
 *     //do somethings
 *
 * }
 *
 * //funModify
 * let funModify = async(v) => {
 *
 *     let fd = `${fdResult}/${v.id}`
 *
 *     if (w.fsIsFolder(fd)) {
 *         w.fsCleanFolder(fd)
 *     }
 *
 *     //do somethings
 *
 * }
 *
 * let opt = {
 *     fdTagRemove,
 *     fdDwAttime,
 *     fdDwCurrent,
 *     fdTaskCpActualSrc,
 *     fdTaskCpSrc,
 *     funDownload,
 *     funGetCurrent,
 *     funRemove,
 *     funAdd,
 *     funModify,
 * }
 * let ev = await WDwdataBuilder(opt)
 *     .catch((err) => {
 *         console.log(err)
 *     })
 * ev.on('change', (msg) => {
 *     delete msg.type
 *     delete msg.timeRunStart
 *     delete msg.timeRunEnd
 *     delete msg.timeRunSpent
 *     console.log('change', msg)
 * })
 * // change { event: 'start', msg: 'running...' }
 * // change { event: 'proc-callfun-afterStart', msg: 'start...' }
 * // change { event: 'proc-callfun-afterStart', msg: 'done' }
 * // change { event: 'proc-callfun-download', msg: 'start...' }
 * // change { event: 'proc-callfun-download', num: 2, msg: 'done' }
 * // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
 * // change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
 * // change { event: 'proc-compare', msg: 'start...' }
 * // change {
 * //   event: 'proc-compare',
 * //   numRemove: 0,
 * //   numAdd: 2,
 * //   numModify: 0,
 * //   numSame: 0,
 * //   msg: 'done'
 * // }
 * // change { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' }
 * // change { event: 'proc-add-callfun-add', id: '114115', msg: 'done' }
 * // change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
 * // change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
 * // change { event: 'proc-callfun-beforeEnd', msg: 'start...' }
 * // change { event: 'proc-callfun-beforeEnd', msg: 'done' }
 * // change { event: 'end', msg: 'done' }
 *
 */
let WDwdataBuilder = async(opt = {}) => {

    //keyId
    let keyId = get(opt, 'keyId')
    if (!isestr(keyId)) {
        keyId = `id`
    }

    //fdTagRemove, 暫存標記為刪除數據資料夾
    let fdTagRemove = get(opt, 'fdTagRemove')
    if (!isestr(fdTagRemove)) {
        fdTagRemove = `./_tagRemove`
    }

    //fdDwAttime
    let fdDwAttime = get(opt, 'fdDwAttime')
    if (!isestr(fdDwAttime)) {
        fdDwAttime = `./_dwAttime`
    }
    if (!fsIsFolder(fdDwAttime)) {
        fsCreateFolder(fdDwAttime)
    }

    //fdDwCurrent
    let fdDwCurrent = get(opt, 'fdDwCurrent')
    if (!isestr(fdDwCurrent)) {
        fdDwCurrent = `./_dwCurrent`
    }
    if (!fsIsFolder(fdDwCurrent)) {
        fsCreateFolder(fdDwCurrent)
    }

    //fdTaskCpActualSrc, 儲存完整任務狀態資料夾
    let fdTaskCpActualSrc = get(opt, 'fdTaskCpActualSrc')
    if (!isestr(fdTaskCpActualSrc)) {
        fdTaskCpActualSrc = `./_taskCpActualSrc`
    }
    if (!fsIsFolder(fdTaskCpActualSrc)) {
        fsCreateFolder(fdTaskCpActualSrc)
    }

    //fdTaskCpSrc
    let fdTaskCpSrc = get(opt, 'fdTaskCpSrc')
    if (!isestr(fdTaskCpSrc)) {
        fdTaskCpSrc = `./_taskCpSrc`
    }
    if (!fsIsFolder(fdTaskCpSrc)) {
        fsCreateFolder(fdTaskCpSrc)
    }

    //srLog
    let srLog = get(opt, 'srLog', null)

    //useShowLog
    let useShowLog = get(opt, 'useShowLog')
    if (!isbol(useShowLog)) {
        useShowLog = true
    }

    //funDownload
    let funDownload = get(opt, 'funDownload')
    if (!isfun(funDownload)) {
        throw new Error(`invalid funDownload`)
    }

    //funGetCurrent
    let funGetCurrent = get(opt, 'funGetCurrent')
    if (!isfun(funGetCurrent)) {
        throw new Error(`invalid funGetCurrent`)
    }

    //funAdd
    let funAdd = get(opt, 'funAdd')
    if (!isfun(funAdd)) {
        throw new Error(`invalid funAdd`)
    }

    //funModify
    let funModify = get(opt, 'funModify')
    if (!isfun(funModify)) {
        throw new Error(`invalid funModify`)
    }

    //funRemove
    let funRemove = get(opt, 'funRemove')
    if (!isfun(funRemove)) {
        throw new Error(`invalid funRemove`)
    }

    //funAfterStartCall
    let funAfterStartCall = get(opt, 'funAfterStart')

    //funBeforeEndCall
    let funBeforeEndCall = get(opt, 'funBeforeEnd')

    //timeToleranceRemove
    let timeToleranceRemove = get(opt, 'timeToleranceRemove')
    if (!isp0int(timeToleranceRemove)) {
        timeToleranceRemove = 0
    }
    timeToleranceRemove = cdbl(timeToleranceRemove)

    //ev, 排程器回傳之事件物件
    let ev = null

    //eventNameProcCompare, 比對階段之事件名
    let eventNameProcCompare = 'proc-compare'

    //numCompared, 本輪比對出之待處理項數(刪除、新增與變更), 由比對完成事件取得, 比對未完成時為null
    let numCompared = null

    //getFpItem, 取得資料夾fd內主鍵值id之數據檔<id>.json路徑, id帶路徑分隔字元而不能作為單一檔名時回傳空字串, 避免操作到fd以外之檔案
    let getFpItem = (fd, id) => {
        let fn = `${id}.json`
        if (path.basename(fn) !== fn) {
            return ''
        }
        return `${fd}/${fn}`
    }

    //emitWarn, 發出warn之change事件並呼叫srLog.warn, 紀錄通道拋錯不影響結束前階段
    let emitWarn = (o) => {
        try {
            ev.emit('change', { type: 'warn', ...o })
            if (isfun(get(srLog, 'warn'))) {
                srLog.warn(o)
            }
        }
        catch (err) {}
    }

    //moveItems, 僅將處理成功之項搬入fdDwCurrent: 刪除項移除其數據檔, 新增與變更項以fdDwAttime之數據檔覆蓋
    let moveItems = (success) => {

        //numNoFile, 找不到數據檔之項數
        let numNoFile = 0

        //errMove, 第1個搬移錯誤, 單項錯誤不中止其餘項之搬移
        let errMove = null

        //keepError
        let keepError = (r) => {
            if (r.error && errMove === null) {
                errMove = r.error
            }
        }

        //remove, 須先刪除再複製
        each(success.remove, (id) => {
            let fp = getFpItem(fdDwCurrent, id)
            if (!fsIsFile(fp)) {
                numNoFile++
                return
            }
            keepError(fsDeleteFile(fp))
        })

        //add, modify
        each([...success.add, ...success.modify], (id) => {
            let fpSrc = getFpItem(fdDwAttime, id)
            if (!fsIsFile(fpSrc)) {
                numNoFile++
                return
            }
            keepError(fsCopyFile(fpSrc, getFpItem(fdDwCurrent, id)))
        })

        //check
        if (numNoFile > 0) {
            emitWarn({ event: 'move-data-to-current', num: numNoFile, msg: 'data files of some processed items not found, not moved' })
        }

        //check
        if (errMove !== null) {
            throw errMove
        }

    }

    //funBeforeEndNec, 依排程器交來之本輪結果更新fdDwCurrent
    let funBeforeEndNec = async(res) => {

        //check, 本輪取消(階段層級錯誤、無數據、無差異等)時不同步, fdDwCurrent維持前次內容
        if (get(res, 'msgCancel') !== '') {
            return
        }

        //success
        let success = res.success

        //check, 比對出之項全部處理成功時, 將fdDwAttime完全同步至fdDwCurrent
        if (size(success.add) + size(success.modify) + size(success.remove) === numCompared) {
            await fsSyncFolder(fdDwAttime, fdDwCurrent)
            return
        }

        //有處理失敗或未處理之項, 僅搬移成功項, 其餘維持前次內容, 使下輪比對仍有差異而重試
        moveItems(success)

    }

    let funAfterStart = async() => {

        if (isfun(funAfterStartCall)) {
            let r = funAfterStartCall()
            if (ispm(r)) {
                r = await r
            }
        }

        //無funAfterStartNec

    }

    let funBeforeEnd = async(res) => {

        await funBeforeEndNec(res)

        if (isfun(funBeforeEndCall)) {
            let r = funBeforeEndCall(res)
            if (ispm(r)) {
                r = await r
            }
        }

    }

    let optSdr = {
        keyId,
        fdTagRemove,
        fdTaskCpActualSrc,
        fdTaskCpSrc,
        srLog,
        useShowLog,
        funGetNew: funDownload,
        funGetCurrent,
        funAdd,
        funModify,
        funRemove,
        funAfterStart,
        funBeforeEnd,
        timeToleranceRemove,
        eventNameProcCallfunGetNew: 'proc-callfun-download',
        eventNameProcCompare,
    }
    ev = await WDataScheduler(optSdr)

    //on, 排程器開始偵測前先延遲脫勾, 故取得ev後立即監聽可收到比對完成事件
    ev.on('change', (msg) => {
        if (msg.event === eventNameProcCompare && msg.msg === 'done') {
            numCompared = msg.numRemove + msg.numAdd + msg.numModify
        }
    })

    return ev
}


export default WDwdataBuilder
