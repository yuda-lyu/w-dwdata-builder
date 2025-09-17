import get from 'lodash-es/get.js'
import isestr from 'wsemi/src/isestr.mjs'
import isp0int from 'wsemi/src/isp0int.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'
import fsIsFolder from 'wsemi/src/fsIsFolder.mjs'
import fsCreateFolder from 'wsemi/src/fsCreateFolder.mjs'
import fsSyncFolder from 'wsemi/src/fsSyncFolder.mjs'
import WDataScheduler from 'w-data-scheduler/src/WDataScheduler.mjs'


/**
 * 基於檔案之下載數據變更驅動任務建構器
 *
 * 外部調用僅須提供下載數據，並須放置於fdDwAttime，前次數據程序會於結束前自動備份，並放置於fdDwCurrent
 *
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {String} [opt.keyId='keyId'] 輸入各筆數據之主鍵字串，預設'keyId'
 * @param {String} [opt.fdTagRemove='./_tagRemove'] 輸入暫存標記為刪除數據資料夾字串，預設'./_tagRemove'
 * @param {String} [opt.fdDwAttime='./_dwAttime'] 輸入儲存下載數據資料夾字串，預設'./_dwAttime'
 * @param {String} [opt.fdDwCurrent='./_dwCurrent'] 輸入儲存前次數據資料夾字串，預設'./_dwCurrent'
 * @param {String} [opt.fdTaskCpActualSrc=`./_taskCpActualSrc`] 輸入任務狀態之來源端完整資料夾字串，預設`./_taskCpActualSrc`
 * @param {String} [opt.fdTaskCpSrc=`./_taskCpSrc`] 輸入任務狀態之來源端資料夾字串，預設`./_taskCpSrc`
 * @param {String} [opt.fdLog='./_logs'] 輸入儲存log資料夾字串，預設'./_logs'
 * @param {Function} [opt.funDownload=null] 輸入取得下載數據之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funGetCurrent=null] 輸入取得前次數據之函數，回傳資料陣列，預設null
 * @param {Function} [opt.funAdd=null] 輸入當有新資料時，需要連動處理之函數，預設null
 * @param {Function} [opt.funModify=null] 輸入當有資料需更新時，需要連動處理之函數，預設null
 * @param {Function} [opt.funRemove=null] 輸入當有資料需刪除時，需要連動處理之函數，預設null
 * @param {Function} [opt.funAfterStart=null] 輸入偵測程序剛開始啟動時，需要處理之函數，預設null
 * @param {Function} [opt.funBeforeEnd=null] 輸入偵測程序要結束前，需要處理之函數，預設null
 * @param {Number} [opt.timeToleranceRemove=0] 輸入刪除任務之防抖時長，單位ms，預設0，代表不使用
 * @returns {Object} 回傳事件物件，可呼叫函數on監聽change事件，可呼叫函數srlog額外進行事件紀錄
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
 *     let vfps = w.fsTreeFolder(fdDwCurrent, 1)
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

    //fdLog
    let fdLog = get(opt, 'fdLog')
    if (!isestr(fdLog)) {
        fdLog = './_logs'
    }
    if (!fsIsFolder(fdLog)) {
        fsCreateFolder(fdLog)
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

    //funBeforeEndNec
    let funBeforeEndNec = async() => {

        //fsSyncFolder, 將fdDwAttime完全同步至fdDwCurrent
        await fsSyncFolder(fdDwAttime, fdDwCurrent)

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

    let funBeforeEnd = async() => {

        await funBeforeEndNec()

        if (isfun(funBeforeEndCall)) {
            let r = funBeforeEndCall()
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
        fdLog,
        funGetNew: funDownload,
        funGetCurrent,
        funAdd,
        funModify,
        funRemove,
        funAfterStart,
        funBeforeEnd,
        timeToleranceRemove,
        eventNameProcCallfunGetNew: 'proc-callfun-download',
    }
    let ev = WDataScheduler(optSdr)

    return ev
}


export default WDwdataBuilder
