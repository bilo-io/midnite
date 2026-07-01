import{h as n,n as s}from"./iframe-Bv7TZnSa.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const a=[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]],t=n("lock",a);function r({count:e}){return e<=0?null:s.jsxs("span",{"aria-label":`Blocked by ${e} task${e===1?"":"s"}`,className:"inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground",children:[s.jsx(t,{"aria-hidden":!0,className:"h-3 w-3"}),"Blocked",s.jsx("span",{className:"tabular-nums",children:e})]})}r.__docgenInfo={description:'A small "Blocked by N" pill shown on task cards/rows when a task has unmet\nblockers (Phase 27). Muted/locked styling matching the other card badges;\nrenders nothing when `count` is 0 so callers can pass it unconditionally.',methods:[],displayName:"BlockedBadge",props:{count:{required:!0,tsType:{name:"number"},description:""}}};export{r as B};
