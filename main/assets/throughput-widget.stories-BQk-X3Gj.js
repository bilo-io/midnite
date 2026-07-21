import{f as R,l as a,d as $}from"./iframe-BMnGZiab.js";import{i as K}from"./mock-fetch-aFrr3kfG.js";import{q as Y,n as L}from"./fixtures-BZzR_DAR.js";import{Y as z}from"./api-CJSY_K2f.js";import{u as V}from"./use-polling-DcIcHCCS.js";import{W as q}from"./spinner-DpwgqQHc.js";import{W as G}from"./widget-card-CvV2eJPX.js";import{R as H}from"./refresh-cw-Dm6q2BAS.js";import"./preload-helper-Dp1pzeXC.js";import"./site-links-BhZk_F72.js";import"./useQuery-DtDWpcRz.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["path",{d:"M3 3v16a2 2 0 0 0 2 2h16",key:"c24i48"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]],U=R("chart-column",P);function C(e){const t=new Date(e),n=t.getFullYear(),o=String(t.getMonth()+1).padStart(2,"0"),i=String(t.getDate()).padStart(2,"0");return`${n}-${o}-${i}`}function Z(e){const t=e.updatedAt;if(!t)return null;const n=new Date(t).getTime();return Number.isFinite(n)?n:null}function J(e,t,n){const o=[],i=new Map,v=864e5;for(let s=t-1;s>=0;s--){const r=new Date(n-s*v),d=C(r.getTime());i.set(d,o.length),o.push({key:d,label:String(r.getDate()),count:0})}for(const s of e){if(s.status!=="done")continue;const r=Z(s);if(r==null)continue;const d=i.get(C(r));d!=null&&(o[d].count+=1)}return o}const Q=6e4,X=14;function F(){var e,t;const{data:n,error:o,loading:i,refresh:v}=V(()=>z(),Q),s=n?J(n,X,Date.now()):[],r=s.reduce((c,f)=>Math.max(c,f.count),0),d=s.slice(-7).reduce((c,f)=>c+f.count,0);return a.jsx(G,{title:"Throughput",icon:U,actions:a.jsx("button",{type:"button",onClick:v,"aria-label":"Refresh throughput",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(H,{className:$("h-3 w-3",i&&"animate-spin")})}),bodyClassName:"flex flex-col p-4",children:o&&!n?a.jsx("p",{className:"m-auto text-sm text-destructive",children:"Couldn’t load tasks."}):!n&&i?a.jsx(q,{}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{children:[a.jsx("span",{className:"text-3xl font-semibold tabular-nums leading-none",children:d}),a.jsx("span",{className:"ml-1.5 text-xs text-muted-foreground",children:"done this week"})]}),a.jsx("div",{className:"mt-auto flex h-16 items-end gap-1","aria-hidden":!0,children:s.map(c=>a.jsx("div",{className:"flex-1 rounded-sm bg-primary/60",style:{height:`${r>0?Math.max(4,c.count/r*100):4}%`},title:`${c.key}: ${c.count}`},c.key))}),a.jsxs("div",{className:"mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground",children:[a.jsx("span",{children:(e=s[0])===null||e===void 0?void 0:e.label}),a.jsx("span",{children:(t=s.at(-1))===null||t===void 0?void 0:t.label})]})]})})}F.__docgenInfo={description:"",methods:[],displayName:"ThroughputWidget"};var x,y,_,g,w,k,D,T,E,b,j,B,N,S,I;const{expect:p,within:M}=__STORYBOOK_MODULE_TEST__,O=Date.parse("2026-06-23T12:00:00.000Z"),tt=864e5,et=e=>new Date(O-e*tt).toISOString(),h=(e,t)=>({...L,id:e,updatedAt:et(t)}),A=[h("d0",0),h("d1",1),h("d2",2),h("d9",9),Y];function W(e){const t=Date.now;Date.now=()=>O;const n=K(e);return()=>{Date.now=t,n()}}const pt={title:"Widgets/ThroughputWidget",component:F,decorators:[e=>a.jsx("div",{className:"h-64 w-80",children:a.jsx(e,{})})]},l={beforeEach:()=>W([{match:"/tasks",json:{items:A,total:A.length}}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("3")).toBeInTheDocument()}},m={beforeEach:()=>W([{match:"/tasks",json:{items:[],total:0}}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("0")).toBeInTheDocument()}},u={beforeEach:()=>W([{match:"/tasks",status:500}]),play:async({canvasElement:e})=>{const t=M(e);await p(await t.findByText("Couldn’t load tasks.")).toBeInTheDocument()}};l.parameters={...l.parameters,docs:{...(x=l.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  beforeEach: () => pinNow([{
    match: '/tasks',
    json: {
      items: TASKS,
      total: TASKS.length
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    // d0/d1/d2 are within the last 7 days; d9 is older, taskFeature isn't done.
    await expect(canvas.getByText('3')).toBeInTheDocument();
  }
}`,...(_=l.parameters)===null||_===void 0||(y=_.docs)===null||y===void 0?void 0:y.source},description:{story:"Done tasks bucketed by day; the headline counts the last 7 days.",...(w=l.parameters)===null||w===void 0||(g=w.docs)===null||g===void 0?void 0:g.description}}};m.parameters={...m.parameters,docs:{...(k=m.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  beforeEach: () => pinNow([{
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('done this week')).toBeInTheDocument();
    await expect(canvas.getByText('0')).toBeInTheDocument();
  }
}`,...(T=m.parameters)===null||T===void 0||(D=T.docs)===null||D===void 0?void 0:D.source},description:{story:"No tasks → a zero headline (the chart still renders its flat baseline).",...(b=m.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};u.parameters={...u.parameters,docs:{...(j=u.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
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
}`,...(N=u.parameters)===null||N===void 0||(B=N.docs)===null||B===void 0?void 0:B.source},description:{story:"Gateway `/tasks` fails → the error fallback.",...(I=u.parameters)===null||I===void 0||(S=I.docs)===null||S===void 0?void 0:S.description}}};const ht=["Default","Empty","Error"];export{l as Default,m as Empty,u as Error,ht as __namedExportsOrder,pt as default};
