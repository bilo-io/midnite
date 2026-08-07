import{b1 as N,a_ as a,aL as L}from"./iframe-B6cRdJCM.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{Y as S}from"./api-BHtk7Id1.js";import{u as M,A as F}from"./dashboard-widget-labels-CqaobB59.js";import{h as K}from"./i18n-labels-Cp-wysUh.js";import{u as O}from"./use-polling-LpBvQpS1.js";import{W as Y}from"./spinner-C2vlqNWv.js";import{W as z}from"./widget-card-BTErbhxt.js";import{R as G}from"./refresh-cw-OgrRn0VN.js";import"./preload-helper-Dp1pzeXC.js";import"./star-CctvbgWe.js";import"./chart-line-oSpcMe27.js";import"./layout-grid-CzyjuoB1.js";import"./globe-COtwBNOE.js";import"./database-B0GFMaAS.js";import"./rocket-CKPI31qy.js";import"./newspaper-DSJtHeEl.js";import"./users-BGnpv9g2.js";import"./folder-git-2-BKYTJ6O0.js";import"./bot-BQ1XuyK0.js";import"./brain-pu0lifYY.js";import"./workflow-1wrGwEDl.js";import"./square-terminal-CggTgj4h.js";import"./clock-B1zPOEv2.js";import"./sticky-note-CPB0uP6D.js";import"./useQuery-Cqr84x33.js";function P(t){const e=t.replace(/[._-]+/g," ").trim();return e.charAt(0).toUpperCase()+e.slice(1)}function U(t){return t.replace(/[._-]+(.)/g,(e,i)=>i.toUpperCase())}function Z(){const t=N("dashboard");return e=>{const i=`activity.kinds.${U(e)}`;return t.has(i)?t(i):P(e)}}const $=2e4,A=12;function V(t){const e=[];for(let i=0;i<t.length;i++){const r=t[i],s=new Date(r.at).getTime();Number.isFinite(s)&&e.push({id:`${r.taskId}:${i}`,title:r.title,kind:r.kind,at:s})}return e.sort((i,r)=>r.at-i.at).slice(0,A)}function W(){const t=N("dashboard"),e=M(),i=Z(),r=K(),{data:s,error:C,loading:D,refresh:R}=O(()=>S(A),$),I=s?V(s):[];return a.jsx(z,{title:e.label("activity"),icon:F,actions:a.jsx("button",{type:"button",onClick:R,"aria-label":t("activity.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(G,{className:L("h-3 w-3",D&&"animate-spin")})}),bodyClassName:"overflow-auto",children:C&&!s?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:t("activity.error")}):!s&&D?a.jsx(Y,{}):I.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:t("activity.empty")}):a.jsx("ul",{className:"divide-y divide-border/30",children:I.map(m=>a.jsxs("li",{className:"flex items-baseline gap-2 px-4 py-2",children:[a.jsxs("span",{className:"min-w-0 flex-1",children:[a.jsx("span",{className:"text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:i(m.kind)}),a.jsx("span",{className:"block truncate text-sm",children:m.title})]}),a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:r(m.at)})]},m.id))})})}W.__docgenInfo={description:"",methods:[],displayName:"ActivityWidget"};var l,p,u,v,h,y,x,f,_,g,k,T,E,w,b;const{expect:d,within:j}=__STORYBOOK_MODULE_TEST__,H=[{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"agent.started",at:"2026-06-21T09:00:00.000Z"},{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"task.created",at:"2026-06-21T08:30:00.000Z"},{taskId:"t2",title:"Review the repo registry migration",kind:"pr.merged",at:"2026-06-21T07:00:00.000Z"}],Tt={title:"Widgets/ActivityWidget",component:W,decorators:[t=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(t,{})})]},n={beforeEach:()=>B([{match:"/tasks/activity",json:H}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Agent started")).toBeInTheDocument(),await d(e.getByText("Pr merged")).toBeInTheDocument(),await d(e.getAllByText("Wire up the scheduler tick metric").length).toBeGreaterThan(0)}},o={beforeEach:()=>B([{match:"/tasks/activity",json:[]}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("No activity yet.")).toBeInTheDocument()}},c={beforeEach:()=>B([{match:"/tasks/activity",status:500}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Couldn’t load activity.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(l=n.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    json: ACTIVITY
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    // Kind is humanized (\`agent.started\` → \`Agent started\`).
    await expect(await canvas.findByText('Agent started')).toBeInTheDocument();
    await expect(canvas.getByText('Pr merged')).toBeInTheDocument();
    await expect(canvas.getAllByText('Wire up the scheduler tick metric').length).toBeGreaterThan(0);
  }
}`,...(u=n.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.source},description:{story:"Recent events rendered newest-first, kinds humanized.",...(h=n.parameters)===null||h===void 0||(v=h.docs)===null||v===void 0?void 0:v.description}}};o.parameters={...o.parameters,docs:{...(y=o.parameters)===null||y===void 0?void 0:y.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No activity yet.')).toBeInTheDocument();
  }
}`,...(f=o.parameters)===null||f===void 0||(x=f.docs)===null||x===void 0?void 0:x.source},description:{story:"No recent events → the empty-state message.",...(g=o.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.description}}};c.parameters={...c.parameters,docs:{...(k=c.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/tasks/activity',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load activity.')).toBeInTheDocument();
  }
}`,...(E=c.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"Gateway activity endpoint fails → the error fallback.",...(b=c.parameters)===null||b===void 0||(w=b.docs)===null||w===void 0?void 0:w.description}}};const Et=["Default","Empty","Error"];export{n as Default,o as Empty,c as Error,Et as __namedExportsOrder,Tt as default};
