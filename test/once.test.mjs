import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataBuilder from '../src/WDwdataBuilder.mjs'


describe('once', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

        //fdResult, 額外創建供另產結果之用
        let fdResult = `./_once_result`
        w.fsCleanFolder(fdResult)

        //fdDwAttime
        let fdDwAttime = `./_once_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./_once_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdTagRemove
        let fdTagRemove = `./_once_tagRemove`
        w.fsCleanFolder(fdTagRemove)

        //fdTaskCpActualSrc
        let fdTaskCpActualSrc = `./_once_taskCpActualSrc`
        w.fsCleanFolder(fdTaskCpActualSrc)

        //fdTaskCpSrc
        let fdTaskCpSrc = `./_once_taskCpSrc`
        w.fsCleanFolder(fdTaskCpSrc)

        //funDownload
        let funDownload = async() => {

            //items
            let items = [
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
            // console.log('vfps', vfps)

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

            let fd = `${fdResult}/${v.id}`

            if (w.fsIsFolder(fd)) {
                w.fsDeleteFolder(fd)
            }

        }

        //funAdd
        let funAdd = async(v) => {

            let fd = `${fdResult}/${v.id}`

            if (w.fsIsFolder(fd)) {
                w.fsCleanFolder(fd)
            }

            //do somethings

        }

        //funModify
        let funModify = async(v) => {

            let fd = `${fdResult}/${v.id}`

            if (w.fsIsFolder(fd)) {
                w.fsCleanFolder(fd)
            }

            //do somethings

        }

        let opt = {
            fdDwAttime,
            fdDwCurrent,
            fdTagRemove,
            fdTaskCpActualSrc,
            fdTaskCpSrc,
            funDownload,
            funGetCurrent,
            funRemove,
            funAdd,
            funModify,
        }
        let ev = await WDwdataBuilder(opt)
            .catch((err) => {
                console.log(err)
            })
        ev.on('change', (msg) => {
            delete msg.type
            delete msg.timeRunStart
            delete msg.timeRunEnd
            delete msg.timeRunSpent
            // console.log('change', msg)
            ms.push(msg)
        })
        ev.on('end', () => {
            w.fsDeleteFolder(fdResult)
            w.fsDeleteFolder(fdDwAttime)
            w.fsDeleteFolder(fdDwCurrent)
            w.fsDeleteFolder(fdTagRemove)
            w.fsDeleteFolder(fdTaskCpActualSrc)
            w.fsDeleteFolder(fdTaskCpSrc)
            // console.log('ms', ms)
            pm.resolve(ms)
        })
        // change { event: 'start', msg: 'running...' }
        // change { event: 'proc-callfun-afterStart', msg: 'start...' }
        // change { event: 'proc-callfun-afterStart', msg: 'done' }
        // change { event: 'proc-callfun-download', msg: 'start...' }
        // change { event: 'proc-callfun-download', num: 2, msg: 'done' }
        // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
        // change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
        // change { event: 'compare', msg: 'start...' }
        // change { event: 'compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' }
        // change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
        // change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
        // change { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' }
        // change { event: 'proc-add-callfun-add', id: '114115', msg: 'done' }
        // change {
        //   event: 'end',
        //   timeRunStart: '2025-08-23T15:47:24+08:00',
        //   timeRunEnd: '2025-08-23T15:47:24+08:00',
        //   timeRunSpent: '0s',
        //   msg: 'done'
        // }

        return pm
    }
    let ms = [
        { event: 'start', msg: 'running...' },
        { event: 'proc-callfun-afterStart', msg: 'start...' },
        { event: 'proc-callfun-afterStart', msg: 'done' },
        { event: 'proc-callfun-download', msg: 'start...' },
        { event: 'proc-callfun-download', num: 2, msg: 'done' },
        { event: 'proc-callfun-getCurrent', msg: 'start...' },
        { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' },
        { event: 'compare', msg: 'start...' },
        { event: 'compare', numRemove: 0, numAdd: 2, numModify: 0, numSame: 0, msg: 'done' },
        { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' },
        { event: 'proc-add-callfun-add', id: '114115', msg: 'done' },
        { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { event: 'proc-add-callfun-add', id: '114116', msg: 'done' },
        { event: 'proc-callfun-beforeEnd', msg: 'start...' },
        { event: 'proc-callfun-beforeEnd', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test in localhost', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
