import fs from 'fs'
import _ from 'lodash-es'
import w from 'wsemi'
import WDwdataBuilder from './src/WDwdataBuilder.mjs'


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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-download', msg: 'start...' }
// change { event: 'proc-callfun-download', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
// change { event: 'compare', msg: 'start...' }
// change { event: 'compare', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'done' }
// change { event: 'end', msg: 'done' }


//node g.mjs
