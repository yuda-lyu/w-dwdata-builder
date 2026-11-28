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

//fdResult, 額外創建供另產結果之用
let fdResult = `./_result`
w.fsCleanFolder(fdResult)

//fdTagRemove
let fdTagRemove = `./_tagRemove`
w.fsCleanFolder(fdTagRemove)

//fdDwAttime
let fdDwAttime = `./_dwAttime`
w.fsCleanFolder(fdDwAttime)

//fdDwCurrent
let fdDwCurrent = `./_dwCurrent`
w.fsCleanFolder(fdDwCurrent)

//fdTaskCpActualSrc
let fdTaskCpActualSrc = `./_taskCpActualSrc`
w.fsCleanFolder(fdTaskCpActualSrc)

//fdTaskCpSrc
let fdTaskCpSrc = `./_taskCpSrc`
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
    let vfps = w.fsTreeFolder(fdDwCurrent, { levelLimit: 1 })
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
    fdTagRemove,
    fdDwAttime,
    fdDwCurrent,
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
    console.log('change', msg)
})
// change { event: 'start', msg: 'running...' }
// change { event: 'proc-callfun-afterStart', msg: 'start...' }
// change { event: 'proc-callfun-afterStart', msg: 'done' }
// change { event: 'proc-callfun-download', msg: 'start...' }
// change { event: 'proc-callfun-download', num: 2, msg: 'done' }
// change { event: 'proc-callfun-getCurrent', msg: 'start...' }
// change { event: 'proc-callfun-getCurrent', num: 0, msg: 'done' }
// change { event: 'proc-compare', msg: 'start...' }
// change {
//   event: 'proc-compare',
//   numRemove: 0,
//   numAdd: 2,
//   numModify: 0,
//   numSame: 0,
//   msg: 'done'
// }
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114115', msg: 'done' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'start...' }
// change { event: 'proc-add-callfun-add', id: '114116', msg: 'done' }
// change { event: 'proc-callfun-beforeEnd', msg: 'start...' }
// change { event: 'proc-callfun-beforeEnd', msg: 'done' }
// change { event: 'end', msg: 'done' }
```

## Breaking changes

### Only successfully processed items go into `fdDwCurrent`
Applies to the release after 1.1.45. It needs `w-data-scheduler` 1.0.77 or later, where one failing item no longer cancels the round.

Before `funBeforeEnd` is called, `fdDwCurrent` is updated from the result of the round.

- **Before**: `fdDwCurrent` was always made an exact copy of `fdDwAttime`, no matter whether items had failed or the round had been canceled. When `funGetCurrent` reads `fdDwCurrent`, a failed item was therefore never retried.
- **After**:
    - The round was canceled (`msgCancel` is not empty: an error of `funAfterStart`, `funDownload`, `funGetCurrent` or of the comparison, `no data`, `no difference`): `fdDwCurrent` is not changed.
    - Every item found by the comparison succeeded: `fdDwCurrent` is made an exact copy of `fdDwAttime` (as before).
    - Some items failed or were not processed: only the successful items are applied. An added or changed item copies `fdDwAttime/<id>.json` to `fdDwCurrent`, a removed item deletes `fdDwCurrent/<id>.json`, and all other files keep their previous content. So a failed addition does not appear, a failed change keeps the old version, a failed removal is not removed, and they are compared and processed again in the next round.
- **New**: `funBeforeEnd` receives the result of the round, and the `end` listeners receive the same content. A failed item is also reported by the `error` event of its stage and by the `warn` event `fail-items-stage-main`.

```alias
{
    success: { add: [], modify: [], remove: [] }, //ids (values of keyId) processed successfully
    failed: [ //failed items
        { id: '114116', mode: 'add', event: 'proc-add-callfun-add', msg: 'funAdd failed' },
    ],
    msgCancel: '', //why no item was processed in this round (e.g. 'no data', 'no difference'), otherwise ''
}
```

- **Migration**:
    - Store the data of each item as its own file `<id>.json` (`<id>` is the value of `keyId`) at the first level of `fdDwAttime`, containing only that item, as in the example above. In a round with failed or unprocessed items, a successful item without such a file (or whose id contains a path separator) is not applied; the `warn` event `move-data-to-current` reports how many (`num`), and the next round compares them again. With other layouts, such as all items in one file, `fdDwCurrent` is only updated in a round where every item succeeded.
    - `funAdd`, `funModify` and `funRemove` must be safe to call again.
    - Do not expect `fdDwCurrent` to equal `fdDwAttime` after every round, and treat an item as done only when it is in `success`.
    - If a file cannot be copied or deleted while applying the successful items, the other items are still applied, then an `error` event of `proc-callfun-beforeEnd` is recorded and `funBeforeEnd` is not called.
