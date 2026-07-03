import{h as A,n as a,f as R}from"./iframe-CyuGqAe9.js";import{i as $}from"./mock-fetch-aFrr3kfG.js";import{q as K,n as Y}from"./fixtures-CckvYj1j.js";import{D as L}from"./api-Bq8Fx77f.js";import{u as z}from"./use-polling-D7lok-IQ.js";import{W as V}from"./spinner-BwwJECnL.js";import{W as q}from"./widget-card-DyCLKZ1Y.js";import{R as G}from"./refresh-cw-CRltIGHy.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-caimLB85.js";import"./useQuery-Bye5SmfI.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const H=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],P=A("chart-column",H);function C(e){const t=new Date(e),n=t.getFullYear(),o=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0");return`${n}-${o}-${r}`}function U(e){const t=e.events.at(-1);var n;const o=(n=t==null?void 0:t.at)!==null&&n!==void 0?n:e.updatedAt;if(!o)return null;const r=new Date(o).getTime();return Number.isFinite(r)?r:null}function Z(e,t,n){const o=[],r=new Map,v=864e5;for(let s=t-1;s>=0;s--){const c=new Date(n-s*v),d=C(c.getTime());r.set(d,o.length),o.push({key:d,label:String(c.getDate()),count:0})}for(const s of e){if(s.status!=="done")continue;const c=U(s);if(c==null)continue;const d=r.get(C(c));d!=null&&(o[d].count+=1)}return o}const J=6e4,Q=14;function F(){var e,t;const{data:n,error:o,loading:r,refresh:v}=z(()=>L(),J),s=n?Z(n,Q,Date.now()):[],c=s.reduce((i,f)=>Math.max(i,f.count),0),d=s.slice(-7).reduce((i,f)=>i+f.count,0);return a.jsx(q,{title:"Throughput",icon:P,actions:a.jsx("button",{type:"button",onClick:v,"aria-label":"Refresh throughput",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(G,{className:R("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"flex flex-col p-4",children:o&&!n?a.jsx("p",{className:"m-auto text-sm text-destructive",children:"Couldn’t load tasks."}):!n&&r?a.jsx(V,{}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{children:[a.jsx("span",{className:"text-3xl font-semibold tabular-nums leading-none",children:d}),a.jsx("span",{className:"ml-1.5 text-xs text-muted-foreground",children:"done this week"})]}),a.jsx("div",{className:"mt-auto flex h-16 items-end gap-1","aria-hidden":!0,children:s.map(i=>a.jsx("div",{className:"flex-1 rounded-sm bg-primary/60",style:{height:`${c>0?Math.max(4,i.count/c*100):4}%`},title:`${i.key}: ${i.count}`},i.key))}),a.jsxs("div",{className:"mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground",children:[a.jsx("span",{children:(e=s[0])===null||e===void 0?void 0:e.label}),a.jsx("span",{children:(t=s.at(-1))===null||t===void 0?void 0:t.label})]})]})})}F.__docgenInfo={description:"",methods:[],displayName:"ThroughputWidget"};var x,y,_,w,g,k,D,T,E,b,j,B,N,S,I;const{expect:p,within:M}=__STORYBOOK_MODULE_TEST__,O=Date.parse("2026-06-23T12:00:00.000Z"),X=864e5,tt=e=>new Date(O-e*X).toISOString(),h=(e,t)=>({...Y,id:e,updatedAt:tt(t)}),et=[h("d0",0),h("d1",1),h("d2",2),h("d9",9),K];function W(e){const t=Date.now;Date.now=()=>O;const n=$(e);return()=>{Date.now=t,n()}}const pt={title:"Widgets/ThroughputWidget",component:F,decorators:[e=>a.jsx("div",{className:"h-64 w-80",children:a.jsx(e,{})})]},l={beforeEach:()=>W([{match:"/tasks",json:et}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("3")).toBeInTheDocument()}},u={beforeEach:()=>W([{match:"/tasks",json:[]}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("0")).toBeInTheDocument()}},m={beforeEach:()=>W([{match:"/tasks",status:500}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("Couldn’t load tasks.")).toBeInTheDocument()}};l.parameters={...l.parameters,docs:{...(x=l.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  beforeEach: () => pinNow([{
    match: '/tasks',
    json: TASKS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    // d0/d1/d2 are within the last 7 days; d9 is older, taskFeature isn't done.
    await expect(canvas.getByText('3')).toBeInTheDocument();
  }
}`,...(_=l.parameters)===null||_===void 0||(y=_.docs)===null||y===void 0?void 0:y.source},description:{story:"Done tasks bucketed by day; the headline counts the last 7 days.",...(g=l.parameters)===null||g===void 0||(w=g.docs)===null||w===void 0?void 0:w.description}}};u.parameters={...u.parameters,docs:{...(k=u.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  beforeEach: () => pinNow([{
    match: '/tasks',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    await expect(canvas.getByText('0')).toBeInTheDocument();
  }
}`,...(T=u.parameters)===null||T===void 0||(D=T.docs)===null||D===void 0?void 0:D.source},description:{story:"No tasks → a zero headline (the chart still renders its flat baseline).",...(b=u.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};m.parameters={...m.parameters,docs:{...(j=m.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  beforeEach: () => pinNow([{
    match: '/tasks',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load tasks.')).toBeInTheDocument();
  }
}`,...(N=m.parameters)===null||N===void 0||(B=N.docs)===null||B===void 0?void 0:B.source},description:{story:"Gateway `/tasks` fails → the error fallback.",...(I=m.parameters)===null||I===void 0||(S=I.docs)===null||S===void 0?void 0:S.description}}};const ht=["Default","Empty","Error"];export{l as Default,u as Empty,m as Error,ht as __namedExportsOrder,pt as default};
