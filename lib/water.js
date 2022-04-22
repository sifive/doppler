'use strict';

const tt = require('onml/tt.js');
const tAtX = require('./t-at-x.js');
const getX = require('./get-x.js');

const progress = (lane, desc, tStart, tFinish) => {
  const pco = {};

  const { tgcd, listing } = desc;
  const { signals, len } = lane;

  signals.map(sig => { sig.i = 0; });

  tStart /= tgcd;
  tFinish /= tgcd;

  console.log(tStart, tFinish);

  let cursor = tStart;

  for (let k = 0; k < 500; k++) {
    // move signal indexes to the first point after cursor
    signals.map(signal => {
      const wave = signal.wave;
      for (let i = signal.i || 0; i < wave.length; i++) {
        const t = wave[i][0];
        if (t > cursor) {
          signal.i = i;
          break;
        }
      }
    });

    // move cursor to the first point
    cursor = Math.min(...signals.map(e => e.wave[e.i][0]));

    if (cursor > tFinish) {
      break;
    }
    console.log(cursor);

    // collect all bricks at cursor
    signals.map(sig => {
      const [t, v] = sig.wave[sig.i];
      if (t === cursor) {

        let pc = v;
        let tail = false;
        let le = listing[pc];
        if (le === undefined) {
          pc = v - 2;
          le = listing[pc];
          tail = true;
        }

        if (le) {
          if (pco[pc] === undefined) {
            if (Object.keys(pco).length > len) {
              return;
            }
            pco[pc] = {op: le.op, asm: le.asm, bricks: []};
          }
          pco[pc].bricks.push({name: sig.name, label: sig.label, t, tail});
        }

      }
    });
  }


  Object.keys(pco).map((key, idx) => {
    if (pco[key] !== undefined) {
      pco[key].idx = idx;
    }
  });

  return pco;
};

const water = (lane, desc, pstate) => {
  const { width, sidebarWidth, yStep } = pstate;
  const xStartExact = tAtX(sidebarWidth, pstate);
  const xFinishExact = tAtX(width, pstate);
  const brickWidth = getX(pstate, 2) - getX(pstate, 0);


  const yStep2 = yStep >> 1;
  lane.signals.map(signal => {
    signal.wave = desc.chango[signal.ref].wave;
  });

  const pco = progress(lane, desc, xStartExact, xFinishExact);

  const pcs = Object.keys(pco).map(e => Number(e)).sort();

  console.log(lane.signals, pco, pcs);

  const mLanes = [];

  // const pco = getPco(desc, pstate, lane); // signals, dats, cycles, listing, state.cursor);
  // console.log(lane);
  for (let j = 0; j < lane.len - 2; j++) {
    const pc = pcs[j];
    const pcd = pco[pc];
    if (pc === undefined || pcd === undefined) {
      break;
    }

    const asm = pcd.asm.replace(/<.+>/, '\u25C6');
    const mLane = ['g', tt(0, Math.round(j * yStep2))];

    // striped background
    if (j & 1) {
      mLane.push(['rect', {width: width, height: yStep2 - 1, class: 'pc-odd'}]);
      // ['rect', {width: width, height: yStep2 - 2, class: (j & 1) ? 'pc-odd' : 'pc-even'}],
    }

    // dotted separator
    if ((j > 0) && (pc - pcs[j - 1] > 4)) {
      mLane.push(['line', {class: 'gap', x1: 0, y1: 0, x2: width, y2: 0}]);
    }

    // row header
    mLane.push(
      ['text', {x: 0,   'xml:space': 'preserve', y: Math.round(yStep2 * .7), class: 'pc-addr'}, parseInt(pc, 10).toString(16).padStart(12, ' ')],
      ['text', {x: 88,  y: Math.round(yStep2 * .7), class: 'pc-opcode'}, pcd.op],
      ['text', {x: 150, y: Math.round(yStep2 * .7), class: 'pc-asm'}, asm]
    );

    // bricks in row
    pcd.bricks.map(e => {
      mLane.push(['g', tt(getX(pstate, e.t)),
        ['rect', {
          class: e.name,
          width: brickWidth,
          height: (e.tail ? (yStep2 >> 1) : yStep2) - 3,
          y: e.tail ? ((yStep2 >> 1) + 1) : 1
        }],
        ...((brickWidth > 20) ? [['text', {class: e.name, width: brickWidth, x: brickWidth / 2, y: 16}, e.label]] : [])
      ]);
    });

    mLanes.push(mLane);
  }

  return mLanes;
};


module.exports = water;