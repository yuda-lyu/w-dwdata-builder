import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataBuilder from '../src/WDwdataBuilder.mjs'


describe('srLog', function() {

    //msgErrFunAdd, funAdd拋出之錯誤訊息
    let msgErrFunAdd = 'mock error from funAdd'

    //msgErrFunDownload, funDownload拋出之錯誤訊息
    let msgErrFunDownload = 'mock error from funDownload'

    //itemsDownload, 下載數據
    let itemsDownload = [
        {
            'id': '114115',
            'tag': '2025082116374751115',
            'number': '115',
            'time': '2025-08-21T16:37:47+08:00',
            'timeRec': '2025-08-21 16:37:47',
            'timeTag': '20250821163747',
            'ml': '5.1',
        },
        {
            'id': '114116',
            'tag': '2025082214061554116',
            'number': '116',
            'time': '2025-08-22T14:06:15+08:00',
            'timeRec': '2025-08-22 14:06:15',
            'timeTag': '20250822140615',
            'ml': '5.4',
        },
    ]

    //itemsCurrent, 前次數據, 預置於fdDwCurrent, 故差異為新增1筆id[114116]
    let itemsCurrent = [
        itemsDownload[0],
    ]

    //rmTime, 移除紀錄內之執行時間欄位
    let rmTime = (v) => {
        let r = { ...v }
        delete r.timeRunStart
        delete r.timeRunEnd
        delete r.timeRunSpent
        return r
    }

    //test, 執行一次偵測並蒐集srLog各函數與change事件所收到之紀錄
    let test = async(opt = {}) => {

        //useSrLog, 是否提供srLog
        let useSrLog = _.get(opt, 'useSrLog', true)

        //keysSrLog, srLog內所提供之函數
        let keysSrLog = _.get(opt, 'keysSrLog', ['info', 'warn', 'error'])

        //errFunAdd, funAdd是否拋錯
        let errFunAdd = _.get(opt, 'errFunAdd', false)

        //errFunDownload, funDownload是否拋錯
        let errFunDownload = _.get(opt, 'errFunDownload', false)

        //useShowLog, 未給予時不傳入optDB, 用以驗證預設值
        let useShowLog = _.get(opt, 'useShowLog', null)

        //tag, 各測試使用獨立資料夾
        let tag = _.get(opt, 'tag', 'c0')

        let pm = w.genPm()

        //msChange, msInfo, msWarn, msError
        let msChange = []
        let msInfo = []
        let msWarn = []
        let msError = []

        //nArgs, 各次呼叫srLog函數所接收之參數數量
        let nArgs = []

        //msConsole, 攔截console.log之輸出
        let msConsole = []
        let consoleLogOri = console.log
        console.log = (...args) => {
            msConsole.push(args)
        }

        //fdResult, 額外創建供另產結果之用
        let fdResult = `./_srLog_${tag}_result`
        w.fsCleanFolder(fdResult)

        //fdTagRemove
        let fdTagRemove = `./_srLog_${tag}_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdDwAttime
        let fdDwAttime = `./_srLog_${tag}_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent, 預置前次數據, 供funGetCurrent取得
        let fdDwCurrent = `./_srLog_${tag}_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)
        _.each(itemsCurrent, (v) => {
            fs.writeFileSync(`${fdDwCurrent}/${v.id}.json`, JSON.stringify(v), 'utf8')
        })

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./_srLog_${tag}_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./_srLog_${tag}_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

        //funDownload
        let funDownload = async() => {

            if (errFunDownload) {
                throw new Error(msgErrFunDownload)
            }

            //items
            let items = itemsDownload

            _.each(items, (v) => {

                let fp = `${fdDwAttime}/${v.id}.json`

                fs.writeFileSync(fp, JSON.stringify(v), 'utf8')

            })

            return items
        }

        //funGetCurrent
        let funGetCurrent = async() => {

            //vfps
            let vfps = w.fsTreeFolder(fdDwCurrent, 1)

            //items
            let items = []
            _.each(vfps, (v) => {

                let j = fs.readFileSync(v.path, 'utf8')
                let item = JSON.parse(j)

                items.push(item)

            })

            return items
        }

        //funRemove
        let funRemove = async(v) => {
            //do somethings
        }

        //funAdd
        let funAdd = async(v) => {
            if (errFunAdd) {
                throw new Error(msgErrFunAdd)
            }
        }

        //funModify
        let funModify = async(v) => {
            //do somethings
        }

        //srLog
        let srLogAll = {
            info: (...args) => {
                nArgs.push(_.size(args))
                msInfo.push({ ...args[0] })
            },
            warn: (...args) => {
                nArgs.push(_.size(args))
                msWarn.push({ ...args[0] })
            },
            error: (...args) => {
                nArgs.push(_.size(args))
                msError.push({ ...args[0] })
            },
        }
        let srLog = null
        if (useSrLog) {
            srLog = _.pick(srLogAll, keysSrLog)
        }

        let optDB = {
            fdTagRemove,
            fdDwAttime,
            fdDwCurrent,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            srLog,
            funDownload,
            funGetCurrent,
            funRemove,
            funAdd,
            funModify,
        }
        if (_.isBoolean(useShowLog)) {
            optDB.useShowLog = useShowLog
        }
        let ev = await WDwdataBuilder(optDB)
            .catch((err) => {
                console.log(err)
            })
        ev.on('change', (msg) => {
            msChange.push({ ...msg })
        })
        ev.on('end', () => {

            w.fsDeleteFolder(fdResult)
            w.fsDeleteFolder(fdTagRemove)
            w.fsDeleteFolder(fdDwAttime)
            w.fsDeleteFolder(fdDwCurrent)
            w.fsDeleteFolder(fdTaskCpActualSrc)
            w.fsDeleteFolder(fdTaskCpSrc)

            console.log = consoleLogOri

            pm.resolve({ msChange, msInfo, msWarn, msError, nArgs, msConsole })
        })

        return pm
    }

    //msChangeNormal, 無錯誤時各階段所發送之紀錄
    let msChangeNormal = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'done' },
        { type: 'info', event: 'proc-callfun-download', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-download', num: 2, msg: 'done' },
        { type: 'info', event: 'proc-callfun-getCurrent', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getCurrent', num: 1, msg: 'done' },
        { type: 'info', event: 'proc-compare', msg: 'start...' },
        {
            type: 'info',
            event: 'proc-compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'done' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'done' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    //msChangeError, funAdd拋錯時各階段所發送之紀錄, 因beforeEnd階段不論有無錯誤皆執行, 故仍有proc-callfun-beforeEnd
    let msChangeError = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'done' },
        { type: 'info', event: 'proc-callfun-download', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-download', num: 2, msg: 'done' },
        { type: 'info', event: 'proc-callfun-getCurrent', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-getCurrent', num: 1, msg: 'done' },
        { type: 'info', event: 'proc-compare', msg: 'start...' },
        {
            type: 'info',
            event: 'proc-compare',
            numRemove: 0,
            numAdd: 1,
            numModify: 0,
            numSame: 1,
            msg: 'done'
        },
        { type: 'info', event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { type: 'error', event: 'proc-add-callfun-add', id: '114116', msg: msgErrFunAdd },
        { type: 'info', event: 'cancel-stage-main', msg: 'error at proc-add-callfun-add' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'done' },
        { type: 'info', event: 'cancel-stage-beforeEnd', msg: 'error at proc-add-callfun-add' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    //pickByType, 自change紀錄取出指定type者, 並還原成srLog所接收之紀錄(不含type)
    let pickByType = (ms, type) => {
        return ms
            .filter((v) => {
                return v.type === type
            })
            .map((v) => {
                let r = { ...v }
                delete r.type
                return r
            })
    }

    it('test srLog: 提供info與warn與error時, 各階段事件紀錄於srLog.info', async () => {
        let r = await test({ tag: 'c1' })
        let rr = pickByType(msChangeNormal, 'info')
        assert.strict.deepEqual(r.msInfo.map(rmTime), rr)
    })

    it('test srLog: 提供info與warn與error時, srLog各函數僅接收一紀錄物件', async () => {
        let r = await test({ tag: 'c2' })
        let rr = _.uniq(r.nArgs)
        assert.strict.deepEqual(rr, [1])
    })

    it('test srLog: 提供info與warn與error時, srLog紀錄與change事件內容一致且type為info', async () => {
        let r = await test({ tag: 'c3' })
        let rr = r.msInfo.map((v) => {
            return { type: 'info', ...v }
        })
        assert.strict.deepEqual(r.msChange, rr)
    })

    it('test srLog: 無錯誤時不呼叫srLog.warn與srLog.error', async () => {
        let r = await test({ tag: 'c4' })
        let rr = { numWarn: 0, numError: 0 }
        assert.strict.deepEqual({ numWarn: _.size(r.msWarn), numError: _.size(r.msError) }, rr)
    })

    it('test srLog: funAdd拋錯時, 錯誤紀錄於srLog.error且change事件type為error', async () => {
        let r = await test({ tag: 'c5', errFunAdd: true })
        let rr = pickByType(msChangeError, 'error')
        assert.strict.deepEqual(r.msError, rr)
        assert.strict.deepEqual(pickByType(r.msChange, 'error'), rr)
    })

    it('test srLog: funAdd拋錯時, 後續取消與結束階段仍紀錄於srLog.info', async () => {
        let r = await test({ tag: 'c6', errFunAdd: true })
        let rr = pickByType(msChangeError, 'info')
        assert.strict.deepEqual(r.msInfo.map(rmTime), rr)
    })

    it('test srLog: 僅提供info時, 未提供之error不影響change事件發送', async () => {
        let r = await test({ tag: 'c7', errFunAdd: true, keysSrLog: ['info'] })
        let rr = msChangeError
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
        assert.strict.deepEqual(r.msInfo.map(rmTime), pickByType(msChangeError, 'info'))
        assert.strict.deepEqual(_.size(r.msError), 0)
    })

    it('test srLog: 未提供srLog時, change事件仍完整發送', async () => {
        let r = await test({ tag: 'c8', errFunAdd: true, useSrLog: false })
        let rr = msChangeError
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
    })

    //cntConsole, 統計console.log所收到之輸出類別
    let cntConsole = (ms) => {
        let numErr = _.size(ms.filter((v) => {
            return _.get(v, [0]) instanceof Error
        }))
        let numCancel = _.size(ms.filter((v) => {
            return _.get(v, [0]) === 'error occurred, task canceled'
        }))
        return { numErr, numCancel, numAll: _.size(ms) }
    }

    it('test srLog: useShowLog預設為true時, 錯誤與取消訊息輸出至console', async () => {
        let r = await test({ tag: 'c9', errFunAdd: true })
        let rr = { numErr: 1, numCancel: 2, numAll: 3 } //funAdd之catch輸出1次錯誤, 主階段與結束前階段各輸出1次取消訊息
        assert.strict.deepEqual(cntConsole(r.msConsole), rr)
    })

    it('test srLog: useShowLog為false時, 不輸出至console', async () => {
        let r = await test({ tag: 'c10', errFunAdd: true, useShowLog: false })
        let rr = { numErr: 0, numCancel: 0, numAll: 0 }
        assert.strict.deepEqual(cntConsole(r.msConsole), rr)
    })

    it('test srLog: useShowLog為false時, srLog紀錄不受影響', async () => {
        let r = await test({ tag: 'c11', errFunAdd: true, useShowLog: false })
        assert.strict.deepEqual(r.msInfo.map(rmTime), pickByType(msChangeError, 'info'))
        assert.strict.deepEqual(r.msError, pickByType(msChangeError, 'error'))
    })

    //msChangeErrDownload, funDownload拋錯時各階段所發送之紀錄, 因下載階段事件名固定為proc-callfun-download, 故取消訊息亦須為error at proc-callfun-download
    let msChangeErrDownload = [
        { type: 'info', event: 'start', msg: 'running...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-afterStart', msg: 'done' },
        { type: 'info', event: 'proc-callfun-download', msg: 'start...' },
        { type: 'error', event: 'proc-callfun-download', msg: msgErrFunDownload },
        { type: 'info', event: 'cancel-stage-main', msg: 'error at proc-callfun-download' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { type: 'info', event: 'proc-callfun-beforeEnd', msg: 'done' },
        { type: 'info', event: 'cancel-stage-beforeEnd', msg: 'error at proc-callfun-download' },
        { type: 'info', event: 'end', msg: 'done' },
    ]

    it('test srLog: funDownload拋錯時, 取消訊息使用下載階段事件名', async () => {
        let r = await test({ tag: 'c12', errFunDownload: true })
        let rr = msChangeErrDownload
        assert.strict.deepEqual(r.msChange.map(rmTime), rr)
    })

})
