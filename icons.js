const paths={
 share:'M12 16V2m-5 5 5-5 5 5 M5 12H3v10h18V12h-2',play:'M7 3 19 12 7 21z',pause:'M8 4v16M16 4v16',
 sound:'M11 4 6 8H2v8h4l5 4z M15 8q5 4 0 8 M18 5q8 7 0 14',mute:'M11 4 6 8H2v8h4l5 4z M16 9l6 6m0-6-6 6',
 pick:'M3 20 17 6h4V3h-5L1 18',bent:'M3 20 10 13l6-1 2-6h3V3h-5l-2 6-6 2-7 7',broken:'M2 20l6-6m3-3 5-6h5V2h-6l-6 7 M9 14l3 3m-5-7-3-2',
 shield:'M12 2 3 6v6q0 7 9 10 9-3 9-10V6z',new:'M4 5h9M4 5v6M4 5a9 9 0 1 1-1 12 M12 8v8m-4-4h8',
 undo:'M9 5 3 11l6 6M3 11h12a6 6 0 0 1 6 6',reset:'M4 5v6h6 M4 11a8 8 0 1 1 0 5',
 links:'m9 15 6-6 M8 17l-2 2a4 4 0 0 1-5-5l5-5a4 4 0 0 1 5 0 M16 7l2-2a4 4 0 0 1 5 5l-5 5a4 4 0 0 1-5 0',
 hidden:'M2 2l20 20M3 8l-2 4q11 14 22 0l-3-4 M8 5q6-2 10 1',menu:'M4 6h16M4 12h16M4 18h16',
 lock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',unlock:'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0 M12 14v3'
};
export function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.pick}"/></svg>`;}
