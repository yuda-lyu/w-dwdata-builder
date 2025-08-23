# w-dwdata-builder
A builder for download data.

![language](https://img.shields.io/badge/language-JavaScript-orange.svg) 
[![npm version](http://img.shields.io/npm/v/w-dwdata-builder.svg?style=flat)](https://npmjs.org/package/w-dwdata-builder) 
[![license](https://img.shields.io/npm/l/w-dwdata-builder.svg?style=flat)](https://npmjs.org/package/w-dwdata-builder) 
[![npm download](https://img.shields.io/npm/dt/w-dwdata-builder.svg)](https://npmjs.org/package/w-dwdata-builder) 
[![npm download](https://img.shields.io/npm/dm/w-dwdata-builder.svg)](https://npmjs.org/package/w-dwdata-builder) 
[![jsdelivr download](https://img.shields.io/jsdelivr/npm/hm/w-dwdata-builder.svg)](https://www.jsdelivr.com/package/npm/w-dwdata-builder)

## Documentation
To view documentation or get support, visit [docs](https://yuda-lyu.github.io/w-dwdata-builder/global.html).

## Installation
### Using npm(ES6 module):
```alias
npm i w-dwdata-builder
```

#### Example:
> **Link:** [[dev source code](https://github.com/yuda-lyu/w-dwdata-builder/blob/master/g.mjs)]
```alias
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

    //reverse
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
    console.log('change', msg)
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
```
