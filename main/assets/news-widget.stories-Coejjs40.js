import{h as T,n as e,f as d}from"./iframe-kXbbvWEw.js";import{i as M}from"./mock-fetch-aFrr3kfG.js";import{N as z,s as V}from"./inbound-CbJZzwyX.js";import{u as K}from"./api-A95bhGP6.js";import{u as P}from"./use-polling-BiHaLgS_.js";import{W as Q}from"./spinner-nwdlmmLh.js";import{W as X}from"./widget-card-ByU69sqt.js";import{N as Y}from"./newspaper-Bi2BBmDH.js";import{L as J}from"./layout-grid-DzUypCBU.js";import{R as Z}from"./refresh-cw-DUANRlQy.js";import{C as ee}from"./clock-CrPMw4yA.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-Bje3Y1Df.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const te=[["path",{d:"m5 12 7-7 7 7",key:"hav0vg"}],["path",{d:"M12 19V5",key:"x0mq9r"}]],re=T("arrow-up",te);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=[["path",{d:"M3 5h.01",key:"18ugdj"}],["path",{d:"M3 12h.01",key:"nlz23k"}],["path",{d:"M3 19h.01",key:"noohij"}],["path",{d:"M8 5h13",key:"1pao27"}],["path",{d:"M8 12h13",key:"1za7za"}],["path",{d:"M8 19h13",key:"m83p4d"}]],se=T("list",ae);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ne=[["path",{d:"M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z",key:"18887p"}]],oe=T("message-square",ne),ie=5*6e4;function I(t){if(!t)return null;try{return new URL(t).hostname.replace(/^www\./,"")}catch{return null}}function ce(t){const a=Date.now()/1e3-t,s=Math.floor(a/3600);return s<1?`${Math.max(1,Math.floor(a/60))}m`:s<24?`${s}h`:`${Math.floor(s/24)}d`}function R(t){var a;return(a=t.url)!==null&&a!==void 0?a:`https://news.ycombinator.com/item?id=${t.id}`}function G({story:t}){return e.jsxs("div",{className:"flex items-center gap-2.5 text-[11px] text-muted-foreground",children:[e.jsxs("span",{className:"inline-flex items-center gap-0.5 font-medium text-orange-500",children:[e.jsx(re,{className:"h-3 w-3"}),t.score]}),e.jsxs("span",{className:"inline-flex items-center gap-0.5",children:[e.jsx(oe,{className:"h-3 w-3"}),t.comments]}),e.jsxs("span",{className:"inline-flex items-center gap-0.5",children:[e.jsx(ee,{className:"h-3 w-3"}),ce(t.time)]})]})}function D(t){return t<3?"text-primary":"text-muted-foreground"}function le({host:t}){return e.jsx("span",{className:"truncate rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground",children:t})}function de({story:t,index:a}){const s=I(t.url);return e.jsx("li",{children:e.jsxs("a",{href:R(t),target:"_blank",rel:"noopener noreferrer",className:"group flex gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-accent/60",children:[e.jsx("span",{className:d("mt-0.5 w-5 shrink-0 text-right text-sm font-semibold tabular-nums",D(a)),children:a+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("p",{className:"line-clamp-2 text-sm font-medium leading-snug transition-colors group-hover:text-primary",children:t.title}),e.jsxs("div",{className:"mt-1 flex min-w-0 items-center gap-2",children:[s&&e.jsx(le,{host:s}),e.jsx(G,{story:t})]})]})]})})}function me({story:t,index:a}){const s=I(t.url);return e.jsxs("a",{href:R(t),target:"_blank",rel:"noopener noreferrer",className:"group flex flex-col gap-2 rounded-lg border border-border/60 bg-card/40 p-2.5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm",children:[e.jsxs("div",{className:"flex items-start gap-1.5",children:[e.jsx("span",{className:d("text-xs font-bold leading-5 tabular-nums",D(a)),children:a+1}),e.jsx("p",{className:"line-clamp-3 text-xs font-medium leading-snug transition-colors group-hover:text-primary",children:t.title})]}),e.jsxs("div",{className:"mt-auto flex min-w-0 flex-col gap-1",children:[s&&e.jsx("span",{className:"truncate text-[10px] text-muted-foreground",children:s}),e.jsx(G,{story:t})]})]})}function $({config:t,onConfigChange:a}){const{count:s}=t;var m;const u=(m=t.layout)!==null&&m!==void 0?m:"list",{data:n,error:H,loading:O,refresh:A}=P(()=>K(s),ie,[s]),B=[];for(let r=V;r<=z;r++)B.push(r);const U=r=>a({...t,layout:r});return e.jsx(X,{title:"Hacker News",icon:Y,actions:e.jsxs(e.Fragment,{children:[e.jsx("div",{className:"flex items-center rounded-md border border-border/60 p-0.5",children:[["list",se],["grid",J]].map(([r,o])=>e.jsx("button",{type:"button",onClick:()=>U(r),"aria-label":`${r} view`,"aria-pressed":u===r,className:d("rounded p-1 transition-colors",u===r?"bg-accent text-foreground":"text-muted-foreground hover:text-foreground"),children:e.jsx(o,{className:"h-3 w-3"})},r))}),e.jsx("select",{value:s,onChange:r=>a({...t,count:Number(r.target.value)}),"aria-label":"Number of stories",className:"rounded-md border border-border/60 bg-transparent px-1 py-0.5 text-[10px] text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",children:B.map(r=>e.jsx("option",{value:r,children:r},r))}),e.jsx("button",{type:"button",onClick:A,"aria-label":"Refresh stories",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(Z,{className:d("h-3 w-3",O&&"animate-spin")})})]}),bodyClassName:"overflow-auto",children:H&&!n?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load stories."}):!n&&O?e.jsx(Q,{}):u==="grid"?e.jsx("div",{className:"grid grid-cols-2 gap-2 p-2",children:n==null?void 0:n.map((r,o)=>e.jsx(me,{story:r,index:o},r.id))}):e.jsx("ol",{className:"space-y-0.5 p-2",children:n==null?void 0:n.map((r,o)=>e.jsx(de,{story:r,index:o},r.id))})})}$.__docgenInfo={description:"",methods:[],displayName:"NewsWidget",props:{config:{required:!0,tsType:{name:"WidgetConfig['news']",raw:"WidgetConfig['news']"},description:""},onConfigChange:{required:!0,tsType:{name:"signature",type:"function",raw:"(config: WidgetConfig['news']) => void",signature:{arguments:[{type:{name:"WidgetConfig['news']",raw:"WidgetConfig['news']"},name:"config"}],return:{name:"void"}}},description:""}}};var p,h,x,f,g,v,y,w,_,b,N,j,k,E,C;const{expect:S,fn:F,within:L}=__STORYBOOK_MODULE_TEST__,W=[{id:1,title:"Show HN: a multitask orchestrator for Claude Code",url:"https://example.com/midnite",score:412,by:"ada",comments:87,time:1718e6},{id:2,title:"The unreasonable effectiveness of SQLite",url:"https://example.com/sqlite",score:298,by:"grace",comments:54,time:17179e5},{id:3,title:"Ask HN: how do you test data-fetching components?",score:156,by:"linus",comments:132,time:17178e5},{id:4,title:"A field guide to Vitest browser mode",url:"https://example.com/vitest",score:88,by:"margaret",comments:12,time:17177e5},{id:5,title:"Why your kanban board should be a state machine",url:"https://example.com/kanban",score:61,by:"edsger",comments:9,time:17176e5}],ke={title:"Widgets/NewsWidget",component:$,args:{config:{count:5,layout:"list"},onConfigChange:F()},decorators:[t=>e.jsx("div",{className:"h-96 w-80",children:e.jsx(t,{})})]},q=[{match:"/news",json:{stories:W}}],i={beforeEach:()=>M(q),play:async({canvasElement:t})=>{const a=L(t);await S(await a.findByText(W[0].title)).toBeInTheDocument()}},c={args:{config:{count:5,layout:"grid"},onConfigChange:F()},beforeEach:()=>M(q),play:async({canvasElement:t})=>{const a=L(t);await S(await a.findByText(W[1].title)).toBeInTheDocument()}},l={beforeEach:()=>M([{match:"/news",status:500}]),play:async({canvasElement:t})=>{const a=L(t);await S(await a.findByText("Couldn’t load stories.")).toBeInTheDocument()}};i.parameters={...i.parameters,docs:{...(p=i.parameters)===null||p===void 0?void 0:p.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch(newsOk),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(STORIES[0]!.title)).toBeInTheDocument();
  }
}`,...(x=i.parameters)===null||x===void 0||(h=x.docs)===null||h===void 0?void 0:h.source},description:{story:"Stories loaded from the gateway proxy, list layout.",...(g=i.parameters)===null||g===void 0||(f=g.docs)===null||f===void 0?void 0:f.description}}};c.parameters={...c.parameters,docs:{...(v=c.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    config: {
      count: 5,
      layout: 'grid'
    },
    onConfigChange: fn()
  },
  beforeEach: () => installMockFetch(newsOk),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(STORIES[1]!.title)).toBeInTheDocument();
  }
}`,...(w=c.parameters)===null||w===void 0||(y=w.docs)===null||y===void 0?void 0:y.source},description:{story:"Two-column grid layout.",...(b=c.parameters)===null||b===void 0||(_=b.docs)===null||_===void 0?void 0:_.description}}};l.parameters={...l.parameters,docs:{...(N=l.parameters)===null||N===void 0?void 0:N.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/news',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load stories.')).toBeInTheDocument();
  }
}`,...(k=l.parameters)===null||k===void 0||(j=k.docs)===null||j===void 0?void 0:j.source},description:{story:"Gateway proxy fails → the error fallback.",...(C=l.parameters)===null||C===void 0||(E=C.docs)===null||E===void 0?void 0:E.description}}};const Ee=["List","Grid","Error"];export{l as Error,c as Grid,i as List,Ee as __namedExportsOrder,ke as default};
