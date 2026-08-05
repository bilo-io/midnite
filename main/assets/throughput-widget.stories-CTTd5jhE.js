import{b2 as K,a$ as a,aM as L}from"./iframe-DpLYv7In.js";import{i as Y}from"./mock-fetch-aFrr3kfG.js";import{q,n as z}from"./fixtures-BZzR_DAR.js";import{$ as G}from"./api-Df-GKKZj.js";import{u as H,C as P}from"./dashboard-widget-labels-DlJoQMda.js";import{u as U}from"./use-polling-5kTrsROm.js";import{W as Z}from"./spinner-URHZoup1.js";import{W as J}from"./widget-card-DtkLdpVY.js";import{R as Q}from"./refresh-cw-DSui6WfA.js";import"./preload-helper-Dp1pzeXC.js";import"./star-DwrU4cjo.js";import"./chart-line-DeAxkzAX.js";import"./layout-grid-DWVsKQxf.js";import"./globe-CrStffCz.js";import"./database-CDciT8lz.js";import"./rocket-BDssEpCv.js";import"./newspaper-DA7P55bq.js";import"./users-I0mUJ80J.js";import"./folder-git-2-DoW5oJdi.js";import"./bot-CbTuXrdb.js";import"./brain-AumLSRyT.js";import"./workflow-CRSl9vXp.js";import"./square-terminal-D8e2EbMq.js";import"./clock-CSXsOBiF.js";import"./sticky-note-C9F_387C.js";import"./useQuery-CCPaPbrG.js";function A(e){const t=new Date(e),n=t.getFullYear(),i=String(t.getMonth()+1).padStart(2,"0"),s=String(t.getDate()).padStart(2,"0");return`${n}-${i}-${s}`}function V(e){const t=e.updatedAt;if(!t)return null;const n=new Date(t).getTime();return Number.isFinite(n)?n:null}function X(e,t,n){const i=[],s=new Map,v=864e5;for(let r=t-1;r>=0;r--){const d=new Date(n-r*v),o=A(d.getTime());s.set(o,i.length),i.push({key:o,label:String(d.getDate()),count:0})}for(const r of e){if(r.status!=="done")continue;const d=V(r);if(d==null)continue;const o=s.get(A(d));o!=null&&(i[o].count+=1)}return i}const tt=6e4,et=14;function O(){var e,t;const n=K("dashboard"),i=H(),{data:s,error:v,loading:r,refresh:d}=U(()=>G(),tt),o=s?X(s,et,Date.now()):[],M=o.reduce((c,f)=>Math.max(c,f.count),0),$=o.slice(-7).reduce((c,f)=>c+f.count,0);return a.jsx(J,{title:i.label("throughput"),icon:P,actions:a.jsx("button",{type:"button",onClick:d,"aria-label":n("throughput.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(Q,{className:L("h-3 w-3",r&&"animate-spin")})}),bodyClassName:"flex flex-col p-4",children:v&&!s?a.jsx("p",{className:"m-auto text-sm text-destructive",children:n("throughput.error")}):!s&&r?a.jsx(Z,{}):a.jsxs(a.Fragment,{children:[a.jsxs("div",{children:[a.jsx("span",{className:"text-3xl font-semibold tabular-nums leading-none",children:$}),a.jsx("span",{className:"ml-1.5 text-xs text-muted-foreground",children:n("throughput.doneThisWeek")})]}),a.jsx("div",{className:"mt-auto flex h-16 items-end gap-1","aria-hidden":!0,children:o.map(c=>a.jsx("div",{className:"flex-1 rounded-sm bg-primary/60",style:{height:`${M>0?Math.max(4,c.count/M*100):4}%`},title:n("throughput.barTooltip",{day:c.key,count:c.count})},c.key))}),a.jsxs("div",{className:"mt-1 flex justify-between text-[10px] tabular-nums text-muted-foreground",children:[a.jsx("span",{children:(e=o[0])===null||e===void 0?void 0:e.label}),a.jsx("span",{children:(t=o.at(-1))===null||t===void 0?void 0:t.label})]})]})})}O.__docgenInfo={description:"",methods:[],displayName:"ThroughputWidget"};var x,y,_,g,w,D,T,k,E,b,j,B,S,N,W;const{expect:p,within:I}=__STORYBOOK_MODULE_TEST__,R=Date.parse("2026-06-23T12:00:00.000Z"),at=864e5,nt=e=>new Date(R-e*at).toISOString(),h=(e,t)=>({...z,id:e,updatedAt:nt(t)}),F=[h("d0",0),h("d1",1),h("d2",2),h("d9",9),q];function C(e){const t=Date.now;Date.now=()=>R;const n=Y(e);return()=>{Date.now=t,n()}}const Nt={title:"Widgets/ThroughputWidget",component:O,decorators:[e=>a.jsx("div",{className:"h-64 w-80",children:a.jsx(e,{})})]},l={beforeEach:()=>C([{match:"/tasks",json:{items:F,total:F.length}}]),play:async({canvasElement:e})=>{const t=I(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("3")).toBeInTheDocument()}},m={beforeEach:()=>C([{match:"/tasks",json:{items:[],total:0}}]),play:async({canvasElement:e})=>{const t=I(e);await p(await t.findByText("done this week")).toBeInTheDocument(),await p(t.getByText("0")).toBeInTheDocument()}},u={beforeEach:()=>C([{match:"/tasks",status:500}]),play:async({canvasElement:e})=>{const t=I(e);await p(await t.findByText("Couldn’t load tasks.")).toBeInTheDocument()}};l.parameters={...l.parameters,docs:{...(x=l.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
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
}`,...(_=l.parameters)===null||_===void 0||(y=_.docs)===null||y===void 0?void 0:y.source},description:{story:"Done tasks bucketed by day; the headline counts the last 7 days.",...(w=l.parameters)===null||w===void 0||(g=w.docs)===null||g===void 0?void 0:g.description}}};m.parameters={...m.parameters,docs:{...(D=m.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
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
}`,...(k=m.parameters)===null||k===void 0||(T=k.docs)===null||T===void 0?void 0:T.source},description:{story:"No tasks → a zero headline (the chart still renders its flat baseline).",...(b=m.parameters)===null||b===void 0||(E=b.docs)===null||E===void 0?void 0:E.description}}};u.parameters={...u.parameters,docs:{...(j=u.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
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
}`,...(S=u.parameters)===null||S===void 0||(B=S.docs)===null||B===void 0?void 0:B.source},description:{story:"Gateway `/tasks` fails → the error fallback.",...(W=u.parameters)===null||W===void 0||(N=W.docs)===null||N===void 0?void 0:N.description}}};const Wt=["Default","Empty","Error"];export{l as Default,m as Empty,u as Error,Wt as __namedExportsOrder,Nt as default};
