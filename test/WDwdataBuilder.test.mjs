import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import assert from 'assert'
import WDwdataBuilder from '../src/WDwdataBuilder.mjs'


describe('WDwdataBuilder', function() {

    let test = async() => {

        let pm = w.genPm()

        let ms = []

        //fdDwAttime
        let fdDwAttime = `./_dwAttime`
        w.fsCleanFolder(fdDwAttime)

        //fdDwCurrent
        let fdDwCurrent = `./_dwCurrent`
        w.fsCleanFolder(fdDwCurrent)

        //fdResult
        let fdResult = './_result'
        w.fsCleanFolder(fdResult)

        //funDownload
        let funDownload = async() => {

            //reverse
            let items = [
                {
                    'id': '114116',
                    'tag': '2025082214061554116',
                    'number': '116',
                    'time': '2025-08-22T14:06:15+08:00',
                    'timeRec': '2025-08-22 14:06:15',
                    'timeTag': '20250822140615',
                    'ml': '5.4',
                },
                {
                    'id': '114115',
                    'tag': '2025082116374751115',
                    'number': '115',
                    'time': '2025-08-21T16:37:47+08:00',
                    'timeRec': '2025-08-21 16:37:47',
                    'timeTag': '20250821163747',
                    'ml': '5.1',
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
            if (msg.event === 'end') {
                // console.log('ms', ms)
                pm.resolve(ms)
            }
        })
        // change { event: 'start', msg: 'running...' }
        // change { event: 'proc-callfun-download', msg: 'start...' }
        // change { event: 'proc-callfun-download', msg: 'done' }
        // change { event: 'proc-callfun-getCurrent', msg: 'start...' }
        // change { event: 'proc-callfun-getCurrent', msg: 'done' }
        // change { event: 'compare', msg: 'start...' }
        // change { event: 'compare', msg: 'done' }
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
        { event: 'proc-callfun-download', msg: 'start...' },
        { event: 'proc-callfun-download', msg: 'done' },
        { event: 'proc-callfun-getCurrent', msg: 'start...' },
        { event: 'proc-callfun-getCurrent', msg: 'done' },
        { event: 'compare', msg: 'start...' },
        { event: 'compare', msg: 'done' },
        { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' },
        { event: 'proc-add-callfun-add', id: '114116', msg: 'done' },
        { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' },
        { event: 'proc-add-callfun-add', id: '114115', msg: 'done' },
        { event: 'end', msg: 'done' }
    ]

    it('test in localhost', async () => {
        let r = await test()
        let rr = ms
        assert.strict.deepEqual(r, rr)
    })

})
