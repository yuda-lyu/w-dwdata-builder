import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataBuilder from '../src/WDwdataBuilder.mjs'


//結束前依本輪結果更新fdDwCurrent(sgud/rule R-DW-01):
//  本輪取消(msgCancel有值)時不同步;
//  比對出之項全部處理成功時將fdDwAttime完全同步至fdDwCurrent;
//  其餘僅搬移處理成功之項(<主鍵值>.json), 處理失敗與未處理之項維持前次內容, 下輪重試
describe('syncCurrent', function() {

    //fdRoot, 各案使用獨立資料夾
    let fdRoot = `./test/_tmp/syncCurrent`

    after(function() {
        w.fsDeleteFolder(fdRoot)
    })

    //getEnv, 建立一案之各資料夾, fdAttimeSub與fdCurrentSub供指定fdDwAttime與fdDwCurrent之相對位置
    let getEnv = (tag, { fdAttimeSub = 'dwAttime', fdCurrentSub = 'dwCurrent' } = {}) => {
        let fd = `${fdRoot}/${tag}`
        w.fsCleanFolder(fd)
        let env = {
            fd,
            fdTagRemove: `${fd}/tagRemove`,
            fdDwAttime: `${fd}/${fdAttimeSub}`,
            fdDwCurrent: `${fd}/${fdCurrentSub}`,
            fdTaskCpActualSrc: `${fd}/taskCpActualSrc`,
            fdTaskCpSrc: `${fd}/taskCpSrc`,
        }
        w.fsCreateFolder(env.fdDwAttime)
        w.fsCreateFolder(env.fdDwCurrent)
        return env
    }

    //snap, 取得資料夾內全部檔案之{相對路徑: 內容}
    let snap = (fd, pre = '') => {
        let r = {}
        _.each(fs.readdirSync(fd, { withFileTypes: true }), (v) => {
            let fp = `${fd}/${v.name}`
            if (v.isDirectory()) {
                Object.assign(r, snap(fp, `${pre}${v.name}/`))
            }
            else {
                r[`${pre}${v.name}`] = fs.readFileSync(fp, 'utf8')
            }
        })
        return r
    }

    //writeItem, 一項存為<主鍵值>.json
    let writeItem = (fd, item, keyId = 'id') => {
        fs.writeFileSync(`${fd}/${item[keyId]}.json`, JSON.stringify(item), 'utf8')
    }

    //readItems, 讀取資料夾第1層之各json檔
    let readItems = (fd) => {
        let items = []
        _.each(fs.readdirSync(fd, { withFileTypes: true }), (v) => {
            if (!v.isDirectory() && _.endsWith(v.name, '.json')) {
                items.push(JSON.parse(fs.readFileSync(`${fd}/${v.name}`, 'utf8')))
            }
        })
        return items
    }

    //toFiles, 各項以writeItem存放時之{檔名: 內容}
    let toFiles = (items, keyId = 'id') => {
        let r = {}
        _.each(items, (v) => {
            r[`${v[keyId]}.json`] = JSON.stringify(v)
        })
        return r
    }

    //old, neu, 前次與本次之項, 各項內容皆相異
    let old = (id) => {
        return { id, ver: '1', note: `old-${id}` }
    }
    let neu = (id) => {
        return { id, ver: '2', note: `new-${id}` }
    }

    //itemsCur, itemsDw, 前次數據與本輪下載數據: 新增a1與a2, 變更m1與m2, 刪除r1與r2, 相同s1
    let itemsCur = [old('m1'), old('m2'), old('r1'), old('r2'), old('s1')]
    let itemsDw = [neu('a1'), neu('a2'), neu('m1'), neu('m2'), old('s1')]

    //txtSame, 本輪下載之s1內容: 物件與前次相同而檔案文字不同, 用以分辨相同項有無被搬移
    let txtSame = JSON.stringify(old('s1'), null, 2)

    //putCurrent, 預置前次數據
    let putCurrent = (env, items = itemsCur, keyId = 'id') => {
        _.each(items, (v) => {
            writeItem(env.fdDwCurrent, v, keyId)
        })
    }

    //run, 執行一輪偵測, 至end事件後回傳各接收端所得
    let run = async(env, opt = {}) => {

        let keyId = _.get(opt, 'keyId', 'id')
        let download = _.get(opt, 'download', itemsDw)
        let fails = {
            add: _.get(opt, 'failAdd', []),
            modify: _.get(opt, 'failModify', []),
            remove: _.get(opt, 'failRemove', []),
        }

        //funDownload, 清空fdDwAttime後每項存為<主鍵值>.json, s1以不同之檔案文字存放
        let funDownload = _.get(opt, 'funDownload', async() => {
            w.fsCleanFolder(env.fdDwAttime)
            _.each(download, (v) => {
                writeItem(env.fdDwAttime, v, keyId)
            })
            if (_.some(download, (v) => {
                return v[keyId] === 's1'
            })) {
                fs.writeFileSync(`${env.fdDwAttime}/s1.json`, txtSame, 'utf8')
            }
            return _.cloneDeep(download)
        })

        let funGetCurrent = _.get(opt, 'funGetCurrent', async() => {
            return readItems(env.fdDwCurrent)
        })

        //calls, 各項處理函數之呼叫紀錄
        let calls = []
        let gen = (mode) => {
            return async(v) => {
                let id = v[keyId]
                calls.push(`${mode}:${id}`)
                let hook = _.get(opt, `hook.${mode}`)
                if (_.isFunction(hook)) {
                    await hook(v)
                }
                if (_.includes(fails[mode], id)) {
                    throw new Error(`mock fail ${mode}`)
                }
            }
        }

        //funBeforeEnd, 記錄所收引數與呼叫當下fdDwCurrent之內容
        let argsBeforeEnd = []
        let snapAtBeforeEnd = null
        let funBeforeEnd = async(...args) => {
            argsBeforeEnd.push(_.cloneDeep(args))
            snapAtBeforeEnd = snap(env.fdDwCurrent)
        }

        let msChange = []
        let msWarn = []
        let msError = []
        let srLog = _.get(opt, 'srLog', {
            info: () => {},
            warn: (o) => {
                msWarn.push(_.cloneDeep(o))
            },
            error: (o) => {
                msError.push(_.cloneDeep(o))
            },
        })

        let optBdr = {
            keyId,
            fdTagRemove: env.fdTagRemove,
            fdDwAttime: env.fdDwAttime,
            fdDwCurrent: env.fdDwCurrent,
            fdTaskCpActualSrc: env.fdTaskCpActualSrc,
            fdTaskCpSrc: env.fdTaskCpSrc,
            srLog,
            useShowLog: _.get(opt, 'useShowLog', false),
            funDownload,
            funGetCurrent,
            funAdd: gen('add'),
            funModify: gen('modify'),
            funRemove: gen('remove'),
            funAfterStart: _.get(opt, 'funAfterStart'),
            funBeforeEnd,
            timeToleranceRemove: _.get(opt, 'timeToleranceRemove', 0),
        }

        let pm = w.genPm()
        let ev = await WDwdataBuilder(optBdr)
        let hookEv = _.get(opt, 'hookEv')
        if (_.isFunction(hookEv)) {
            hookEv(ev)
        }
        ev.on('change', (msg) => {
            msChange.push(_.cloneDeep(msg))
        })
        ev.on('end', (res) => {
            pm.resolve(_.cloneDeep(res))
        })
        let resEnd = await pm

        return {
            calls,
            resEnd,
            argsBeforeEnd,
            snapAtBeforeEnd,
            msChange,
            msWarn,
            msError,
            snapCur: snap(env.fdDwCurrent),
        }
    }

    //warnsMove, 取出搬移階段之warn紀錄
    let warnsMove = (ms) => {
        return _.filter(ms, (v) => {
            return v.event === 'move-data-to-current'
        })
    }

    //runBase, 以預置之前次數據執行一輪, 回傳執行結果與執行前之fdDwCurrent內容
    let runBase = async(tag, opt = {}) => {
        let env = getEnv(tag)
        putCurrent(env)
        let snapBefore = snap(env.fdDwCurrent)
        let r = await run(env, opt)
        return { env, snapBefore, ...r }
    }

    it('比對出之項全部成功時, fdDwAttime完全同步至fdDwCurrent(含相同項之檔案與非逐項之檔案)', async function() {
        let env = getEnv('allOk')
        putCurrent(env)
        fs.writeFileSync(`${env.fdDwCurrent}/stale.txt`, 'stale', 'utf8')
        let funDownload = async() => {
            w.fsCleanFolder(env.fdDwAttime)
            _.each(itemsDw, (v) => {
                writeItem(env.fdDwAttime, v)
            })
            fs.writeFileSync(`${env.fdDwAttime}/s1.json`, txtSame, 'utf8')
            fs.writeFileSync(`${env.fdDwAttime}/meta.txt`, 'meta', 'utf8')
            return _.cloneDeep(itemsDw)
        }
        let r = await run(env, { funDownload })
        let rr = { ...toFiles(itemsDw), 's1.json': txtSame, 'meta.txt': 'meta' }
        assert.strict.deepEqual(r.snapCur, rr)
        assert.strict.deepEqual(r.resEnd.failed, [])
        assert.strict.deepEqual(warnsMove(r.msWarn), [])
    })

    it('新增: 失敗項不出現於fdDwCurrent, 成功項以本輪內容進入', async function() {
        let r = await runBase('addFail', { failAdd: ['a1'] })
        let rr = {
            ...toFiles([neu('a2'), neu('m1'), neu('m2'), old('s1')]),
        }
        assert.strict.deepEqual(r.snapCur, rr)
        assert.strict.deepEqual(r.resEnd.failed, [{ id: 'a1', mode: 'add', event: 'proc-add-callfun-add', msg: 'funAdd failed' }])
    })

    it('變更: 失敗項保留前次版本, 成功項以本輪內容覆蓋', async function() {
        let r = await runBase('modifyFail', { failModify: ['m1'] })
        let rr = toFiles([neu('a1'), neu('a2'), old('m1'), neu('m2'), old('s1')])
        assert.strict.deepEqual(r.snapCur, rr)
    })

    it('刪除: 失敗項不刪除, 成功項自fdDwCurrent刪除', async function() {
        let r = await runBase('removeFail', { failRemove: ['r1'] })
        let rr = toFiles([neu('a1'), neu('a2'), neu('m1'), neu('m2'), old('r1'), old('s1')])
        assert.strict.deepEqual(r.snapCur, rr)
    })

    it('新增、變更、刪除各項成功與失敗之全部組合(2的6次方)', async function() {
        let ids = ['a1', 'a2', 'm1', 'm2', 'r1', 'r2']
        for (let mask = 0; mask < 64; mask++) {
            let fail = _.filter(ids, (id, i) => {
                return (mask & (1 << i)) !== 0
            })
            let r = await runBase(`combo${mask}`, {
                failAdd: _.intersection(fail, ['a1', 'a2']),
                failModify: _.intersection(fail, ['m1', 'm2']),
                failRemove: _.intersection(fail, ['r1', 'r2']),
            })
            //rr, 失敗之新增不出現、失敗之變更保留舊版、失敗之刪除保留; 相同項僅於全部成功時隨完全同步更新檔案
            let rr = toFiles(_.compact([
                _.includes(fail, 'a1') ? null : neu('a1'),
                _.includes(fail, 'a2') ? null : neu('a2'),
                _.includes(fail, 'm1') ? old('m1') : neu('m1'),
                _.includes(fail, 'm2') ? old('m2') : neu('m2'),
                _.includes(fail, 'r1') ? old('r1') : null,
                _.includes(fail, 'r2') ? old('r2') : null,
                old('s1'),
            ]))
            if (mask === 0) {
                rr['s1.json'] = txtSame
            }
            assert.strict.deepEqual(r.snapCur, rr, `mask=${mask}`)
            assert.strict.deepEqual(_.sortBy(_.map(r.resEnd.failed, 'id')), fail, `mask=${mask}`)
        }
    })

    it('全部失敗時, fdDwCurrent與前次逐位相同', async function() {
        let r = await runBase('allFail', { failAdd: ['a1', 'a2'], failModify: ['m1', 'm2'], failRemove: ['r1', 'r2'] })
        assert.strict.deepEqual(r.snapCur, r.snapBefore)
        assert.strict.equal(r.resEnd.failed.length, 6)
    })

    it('funBeforeEnd收到本輪結果, 且被呼叫時fdDwCurrent已更新完畢, end事件亦收到同內容', async function() {
        let r = await runBase('beforeEndRes', { failAdd: ['a1'], failRemove: ['r2'] })
        let rr = {
            success: { add: ['a2'], modify: ['m1', 'm2'], remove: ['r1'] },
            failed: [
                { id: 'r2', mode: 'remove', event: 'proc-remove-callfun-remove', msg: 'funRemove failed' },
                { id: 'a1', mode: 'add', event: 'proc-add-callfun-add', msg: 'funAdd failed' },
            ],
            msgCancel: '',
        }
        assert.strict.deepEqual(r.argsBeforeEnd, [[rr]])
        assert.strict.deepEqual(r.resEnd, rr)
        assert.strict.deepEqual(r.snapAtBeforeEnd, toFiles([neu('a2'), neu('m1'), neu('m2'), old('r2'), old('s1')]))
        assert.strict.deepEqual(r.snapAtBeforeEnd, r.snapCur)
    })

    it('全部成功時funBeforeEnd亦收到本輪結果', async function() {
        let r = await runBase('beforeEndOk')
        let rr = {
            success: { add: ['a1', 'a2'], modify: ['m1', 'm2'], remove: ['r1', 'r2'] },
            failed: [],
            msgCancel: '',
        }
        assert.strict.deepEqual(r.argsBeforeEnd, [[rr]])
        assert.strict.deepEqual(r.snapAtBeforeEnd, r.snapCur)
    })

    //casesCancel, 本輪取消之各種情況, 皆先於fdDwAttime寫入與前次不同之內容
    let writeDw = (env, items) => {
        w.fsCleanFolder(env.fdDwAttime)
        _.each(items, (v) => {
            writeItem(env.fdDwAttime, v)
        })
    }
    let casesCancel = [
        {
            name: 'funAfterStart拋錯',
            msgCancel: 'error at proc-callfun-afterStart',
            opt: (env) => {
                writeDw(env, [neu('a1')])
                return {
                    funAfterStart: async() => {
                        throw new Error('mock afterStart')
                    },
                }
            },
        },
        {
            name: 'funDownload寫入部分檔案後拋錯',
            msgCancel: 'error at proc-callfun-download',
            opt: (env) => {
                return {
                    funDownload: async() => {
                        writeDw(env, [neu('a1'), neu('m1')])
                        throw new Error('mock download')
                    },
                }
            },
        },
        {
            name: 'funDownload回傳非陣列',
            msgCancel: 'error at proc-callfun-download',
            opt: (env) => {
                return {
                    funDownload: async() => {
                        writeDw(env, [neu('a1'), neu('m1')])
                        return null
                    },
                }
            },
        },
        {
            name: '無數據(funDownload回傳空陣列, fdDwAttime為空)',
            msgCancel: 'no data',
            opt: (env) => {
                return {
                    funDownload: async() => {
                        writeDw(env, [])
                        return []
                    },
                }
            },
        },
        {
            name: 'funGetCurrent拋錯',
            msgCancel: 'error at proc-callfun-getCurrent',
            opt: () => {
                return {
                    funGetCurrent: async() => {
                        throw new Error('mock getCurrent')
                    },
                }
            },
        },
        {
            name: '比對拋錯(下載數據之主鍵重複)',
            msgCancel: 'error at proc-compare',
            opt: () => {
                return {
                    download: [neu('a1'), neu('a1')],
                }
            },
        },
        {
            name: '無差異(fdDwAttime另有檔案且相同項之檔案文字不同)',
            msgCancel: 'no difference',
            opt: (env) => {
                return {
                    funDownload: async() => {
                        writeDw(env, itemsCur)
                        fs.writeFileSync(`${env.fdDwAttime}/s1.json`, txtSame, 'utf8')
                        fs.writeFileSync(`${env.fdDwAttime}/meta.txt`, 'meta', 'utf8')
                        return _.cloneDeep(itemsCur)
                    },
                }
            },
        },
    ]
    _.each(casesCancel, (c, k) => {
        it(`本輪取消時不同步: ${c.name}`, async function() {
            let env = getEnv(`cancel${k}`)
            putCurrent(env)
            let snapBefore = snap(env.fdDwCurrent)
            let r = await run(env, c.opt(env))
            assert.strict.deepEqual(r.snapCur, snapBefore)
            assert.strict.deepEqual(r.calls, [])
            assert.strict.deepEqual(r.argsBeforeEnd, [[{
                success: { add: [], modify: [], remove: [] },
                failed: [],
                msgCancel: c.msgCancel,
            }]])
        })
    })

    it('下輪重試: 失敗項下輪仍比對出差異, 修好後同步, 其後無差異', async function() {
        let env = getEnv('retry')
        putCurrent(env)
        let fail = { failAdd: ['a1'], failModify: ['m1'], failRemove: ['r1'] }

        //第1輪, 各一項失敗
        let r1 = await run(env, fail)
        assert.strict.deepEqual(r1.calls, ['remove:r1', 'remove:r2', 'add:a1', 'add:a2', 'modify:m1', 'modify:m2'])

        //第2輪, 仍失敗: 僅前次失敗之項再被處理
        let r2 = await run(env, fail)
        assert.strict.deepEqual(r2.calls, ['remove:r1', 'add:a1', 'modify:m1'])
        assert.strict.deepEqual(r2.snapCur, toFiles([neu('a2'), old('m1'), neu('m2'), old('r1'), old('s1')]))

        //第3輪, 修好: 三項重試成功, 本輪全部成功故完全同步
        let r3 = await run(env)
        assert.strict.deepEqual(r3.calls, ['remove:r1', 'add:a1', 'modify:m1'])
        assert.strict.deepEqual(r3.snapCur, { ...toFiles(itemsDw), 's1.json': txtSame })

        //第4輪, 無差異
        let r4 = await run(env)
        assert.strict.deepEqual(r4.calls, [])
        assert.strict.deepEqual(r4.resEnd.msgCancel, 'no difference')
        assert.strict.deepEqual(r4.snapCur, r3.snapCur)
    })

    it('逐項處理中途中止(msgCancel為空而有未處理之項)時, 僅成功項進fdDwCurrent, 未處理之項維持前次', async function() {
        let env = getEnv('unprocessed')
        putCurrent(env)

        //bad, 主鍵僅於比對時可讀取1次, 逐項處理讀取時拋錯, 使其後之項未被處理
        let n = 0
        let bad = { ver: '2', note: 'new-aBad' }
        Object.defineProperty(bad, 'id', {
            enumerable: true,
            get: () => {
                n++
                if (n > 1) {
                    throw new Error('mock getter')
                }
                return 'aBad'
            },
        })
        let funDownload = async() => {
            writeDw(env, [neu('a1'), neu('aBad'), neu('a3'), neu('m1'), neu('m2'), old('s1')])
            return [neu('a1'), bad, neu('a3'), neu('m1'), neu('m2'), old('s1')]
        }
        let r = await run(env, { funDownload })

        assert.strict.deepEqual(r.resEnd, {
            success: { add: ['a1'], modify: [], remove: ['r1', 'r2'] },
            failed: [],
            msgCancel: '',
        })
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a1'), old('m1'), old('m2'), old('s1')]))
    })

    it('比對未完成而msgCancel為空(紀錄與console皆拋錯)時, fdDwCurrent不變', async function() {
        let env = getEnv('noCompare')
        putCurrent(env)
        let snapBefore = snap(env.fdDwCurrent)
        let srLog = {
            info: (o) => {
                if (o.event === 'proc-compare') {
                    throw new Error('mock srLog.info')
                }
            },
        }
        let consoleLogOri = console.log
        console.log = () => {
            throw new Error('mock console.log')
        }
        let r = null
        try {
            r = await run(env, { srLog, useShowLog: true })
        }
        finally {
            console.log = consoleLogOri
        }
        assert.strict.deepEqual(r.resEnd, {
            success: { add: [], modify: [], remove: [] },
            failed: [],
            msgCancel: '',
        })
        assert.strict.deepEqual(r.snapCur, snapBefore)
    })

    it('呼叫端移除change監聽後, 仍僅依本輪結果搬移成功項', async function() {
        let env = getEnv('noListener')
        putCurrent(env)
        let r = await run(env, {
            failModify: ['m1'],
            hookEv: (ev) => {
                ev.removeAllListeners('change')
            },
        })
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a1'), neu('a2'), old('m1'), neu('m2'), old('s1')]))
    })

    it('刪除防抖(timeToleranceRemove>0): 成功之刪除項自fdDwCurrent刪除, 失敗者保留', async function() {
        let r = await runBase('debounce', { timeToleranceRemove: 600000, failRemove: ['r1'] })
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a1'), neu('a2'), neu('m1'), neu('m2'), old('r1'), old('s1')]))
        assert.strict.deepEqual(r.resEnd.success.remove, ['r2'])
    })

    it('刪除防抖(timeToleranceRemove>0)且全部成功時完全同步', async function() {
        let r = await runBase('debounceOk', { timeToleranceRemove: 600000 })
        assert.strict.deepEqual(r.snapCur, { ...toFiles(itemsDw), 's1.json': txtSame })
    })

    it('主鍵為有限數字且使用自訂keyId時, 依<主鍵值>.json搬移', async function() {
        let env = getEnv('numKey')
        let it0 = (no, ver) => {
            return { no, note: `${ver}-${no}` }
        }
        putCurrent(env, [it0(7, 'old'), it0(8, 'old'), it0(9, 'old')], 'no')
        let r = await run(env, {
            keyId: 'no',
            download: [it0(7, 'new'), it0(9, 'old'), it0(10, 'new'), it0(11, 'new')],
            failModify: [7],
            failAdd: [11],
        })
        assert.strict.deepEqual(r.snapCur, toFiles([it0(7, 'old'), it0(9, 'old'), it0(10, 'new')], 'no'))
        assert.strict.deepEqual(r.resEnd.success, { add: [10], modify: [], remove: [8] })
    })

    it('非逐項存放(整批單檔)之數據: 有失敗時fdDwCurrent不變並發出warn, 全部成功之輪才完全同步', async function() {
        let env = getEnv('bulk')
        let writeBulk = (fd, items) => {
            fs.writeFileSync(`${fd}/items.json`, JSON.stringify(items), 'utf8')
        }
        writeBulk(env.fdDwCurrent, itemsCur)
        let snapBefore = snap(env.fdDwCurrent)
        let funDownload = async() => {
            w.fsCleanFolder(env.fdDwAttime)
            writeBulk(env.fdDwAttime, itemsDw)
            return _.cloneDeep(itemsDw)
        }
        let funGetCurrent = async() => {
            return JSON.parse(fs.readFileSync(`${env.fdDwCurrent}/items.json`, 'utf8'))
        }

        //第1輪, a1失敗: 其餘5項成功但無逐項之檔案
        let r1 = await run(env, { funDownload, funGetCurrent, failAdd: ['a1'] })
        assert.strict.deepEqual(r1.snapCur, snapBefore)
        let warn = { event: 'move-data-to-current', num: 5, msg: 'data files of some processed items not found, not moved' }
        assert.strict.deepEqual(warnsMove(r1.msWarn), [warn])
        assert.strict.deepEqual(warnsMove(r1.msChange), [{ type: 'warn', ...warn }])

        //第2輪, 全部重新處理並成功
        let r2 = await run(env, { funDownload, funGetCurrent })
        assert.strict.deepEqual(r2.calls, ['remove:r1', 'remove:r2', 'add:a1', 'add:a2', 'modify:m1', 'modify:m2'])
        assert.strict.deepEqual(r2.snapCur, { 'items.json': JSON.stringify(itemsDw) })
        assert.strict.deepEqual(warnsMove(r2.msWarn), [])
    })

    it('部分成功項缺少本輪檔案時, 其餘成功項照常搬移並發出warn', async function() {
        let env = getEnv('missing')
        putCurrent(env)
        let funDownload = async() => {
            writeDw(env, [neu('a1'), neu('m1'), neu('m2'), old('s1')]) //a2未寫檔
            return _.cloneDeep(itemsDw)
        }
        let r = await run(env, { funDownload, failModify: ['m2'] })
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a1'), neu('m1'), old('m2'), old('s1')]))
        assert.strict.deepEqual(_.map(warnsMove(r.msWarn), 'num'), [1])
    })

    it('可逐項對應之數據於有失敗項之輪不發出搬移warn', async function() {
        let r = await runBase('noWarn', { failAdd: ['a1'] })
        assert.strict.deepEqual(warnsMove(r.msWarn), [])
        assert.strict.deepEqual(warnsMove(r.msChange), [])
    })

    it('搬移之warn通道拋錯時, funBeforeEnd仍被呼叫', async function() {
        let env = getEnv('warnThrow')
        putCurrent(env)
        let funDownload = async() => {
            writeDw(env, [neu('a1'), neu('m1'), neu('m2'), old('s1')]) //a2未寫檔
            return _.cloneDeep(itemsDw)
        }
        let srLog = {
            warn: () => {
                throw new Error('mock srLog.warn')
            },
        }
        let r = await run(env, { funDownload, failModify: ['m2'], srLog })
        assert.strict.equal(r.argsBeforeEnd.length, 1)
    })

    it('主鍵僅改大小寫(舊主鍵刪除、新主鍵新增)且有失敗項時, 先刪除再搬入, 新主鍵之數據檔保留', async function() {
        let env = getEnv('idCase')
        putCurrent(env, [old('Key')])
        let r = await run(env, { download: [neu('key'), neu('aFail')], failAdd: ['aFail'] })
        assert.strict.deepEqual(r.resEnd.success, { add: ['key'], modify: [], remove: ['Key'] })
        assert.strict.deepEqual(_.values(r.snapCur), [JSON.stringify(neu('key'))]) //不分大小寫之檔案系統上兩主鍵為同一檔名
    })

    it('主鍵含路徑分隔字元之項不依其路徑搬移或刪除, 不觸及fdDwAttime與fdDwCurrent以外之檔案', async function() {
        let env = getEnv('idPath', { fdAttimeSub: 'a/dwAttime', fdCurrentSub: 'b/dwCurrent' })
        let seps = ['/']
        if (process.platform === 'win32') {
            seps.push('\\')
        }
        let idsOut = _.map(seps, (sep, i) => {
            return `..${sep}outside${i}`
        })
        let idsVictim = _.map(seps, (sep, i) => {
            return `..${sep}victim${i}`
        })
        _.each(seps, (sep, i) => {
            fs.writeFileSync(`${env.fd}/b/victim${i}.json`, `victim${i}`, 'utf8')
        })
        let funDownload = async() => {
            _.each(seps, (sep, i) => {
                fs.writeFileSync(`${env.fd}/a/outside${i}.json`, `outside${i}`, 'utf8')
            })
            return [..._.map(idsOut, neu), neu('aFail')]
        }
        let funGetCurrent = async() => {
            return _.map(idsVictim, old)
        }
        let r = await run(env, { funDownload, funGetCurrent, failAdd: ['aFail'] })
        let rr = {}
        _.each(seps, (sep, i) => {
            rr[`victim${i}.json`] = `victim${i}`
        })
        assert.strict.deepEqual(snap(`${env.fd}/b`), rr)
        assert.strict.deepEqual(r.resEnd.success.add, idsOut)
        assert.strict.deepEqual(r.resEnd.success.remove, idsVictim)
        assert.strict.deepEqual(_.map(warnsMove(r.msWarn), 'num'), [seps.length * 2])
    })

    //beforeEndErrors, 取出結束前階段之error事件
    let beforeEndErrors = (ms) => {
        return _.filter(ms, (v) => {
            return v.type === 'error' && v.event === 'proc-callfun-beforeEnd'
        })
    }

    it('逐項搬移之複製失敗時, 其餘成功項照常搬移, 錯誤記錄於結束前階段且不呼叫funBeforeEnd', async function() {
        let env = getEnv('copyErr')
        putCurrent(env)
        let r = await run(env, {
            failModify: ['m2'],
            hook: {
                add: async(v) => {
                    if (v.id === 'a1') {
                        fs.mkdirSync(`${env.fdDwCurrent}/a1.json`) //使a1之複製目標成為資料夾
                    }
                },
            },
        })
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a2'), neu('m1'), old('m2'), old('s1')]))
        assert.strict.equal(beforeEndErrors(r.msChange).length, 1)
        assert.strict.deepEqual(r.argsBeforeEnd, [])
    })

    it('逐項搬移之刪除失敗時, 其餘成功項照常搬移, 錯誤記錄於結束前階段', async function() {
        let env = getEnv('unlinkErr')
        putCurrent(env)
        let unlinkOri = fs.unlinkSync
        fs.unlinkSync = (fp, ...args) => {
            if (_.endsWith(String(fp).replaceAll('\\', '/'), 'unlinkErr/dwCurrent/r1.json')) {
                throw Object.assign(new Error('mock unlink'), { code: 'EPERM' })
            }
            return unlinkOri(fp, ...args)
        }
        let r = null
        try {
            r = await run(env, { failModify: ['m2'] })
        }
        finally {
            fs.unlinkSync = unlinkOri
        }
        assert.strict.deepEqual(r.snapCur, toFiles([neu('a1'), neu('a2'), neu('m1'), old('m2'), old('r1'), old('s1')]))
        assert.strict.equal(beforeEndErrors(r.msChange).length, 1)
        assert.strict.deepEqual(r.argsBeforeEnd, [])
    })

    it('全部成功而完全同步失敗時, 錯誤記錄於結束前階段且不呼叫funBeforeEnd', async function() {
        let env = getEnv('syncErr')
        putCurrent(env)
        let createWriteStreamOri = fs.createWriteStream
        fs.createWriteStream = (fp, ...args) => {
            if (_.endsWith(String(fp).replaceAll('\\', '/'), 'syncErr/dwCurrent/a1.json')) {
                throw Object.assign(new Error('mock createWriteStream'), { code: 'EPERM' })
            }
            return createWriteStreamOri(fp, ...args)
        }
        let r = null
        try {
            r = await run(env)
        }
        finally {
            fs.createWriteStream = createWriteStreamOri
        }
        assert.strict.equal(beforeEndErrors(r.msChange).length, 1)
        assert.strict.deepEqual(r.argsBeforeEnd, [])
    })

})
