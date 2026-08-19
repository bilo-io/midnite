import{b4 as N,b1 as a,aO as S}from"./iframe-C9h0ttrh.js";import{i as B}from"./mock-fetch-aFrr3kfG.js";import{_ as L}from"./api-BmZNK2cC.js";import{u as M,A as O}from"./dashboard-widget-labels-CKzQiorL.js";import{h as F}from"./i18n-labels-Dtqyfl6Q.js";import{u as K}from"./use-polling-BvHAu9Ww.js";import{W as z}from"./spinner-BVt7iuAA.js";import{W as G}from"./widget-card-BnzAkdMx.js";import{R as P}from"./refresh-cw-RUTmWXaK.js";import"./preload-helper-Dp1pzeXC.js";import"./star-MX52wPq-.js";import"./chart-line-BnmBgWgI.js";import"./layout-grid-doQCNAdC.js";import"./globe-B8-1cZis.js";import"./database-D1ErCCN2.js";import"./memory-stick-DtSAJM4i.js";import"./rocket-kVlA-PKy.js";import"./newspaper-DvIKgOxk.js";import"./users-BkaGWBbB.js";import"./folder-git-2-CAwSeEgA.js";import"./bot-10Pdjj9t.js";import"./brain-BVwnGqEX.js";import"./workflow-CL9pEKSp.js";import"./square-terminal-DnILHVpc.js";import"./clock-ELWF04KM.js";import"./sticky-note-BiVYgfw7.js";import"./useQuery-DBhUJx4Y.js";function U(t){const e=t.replace(/[._-]+/g," ").trim();return e.charAt(0).toUpperCase()+e.slice(1)}function Y(t){return t.replace(/[._-]+(.)/g,(e,i)=>i.toUpperCase())}function Z(){const t=N("dashboard");return e=>{const i=`activity.kinds.${Y(e)}`;return t.has(i)?t(i):U(e)}}const $=2e4,A=12;function V(t){const e=[];for(let i=0;i<t.length;i++){const r=t[i],s=new Date(r.at).getTime();Number.isFinite(s)&&e.push({id:`${r.taskId}:${i}`,title:r.title,kind:r.kind,at:s})}return e.sort((i,r)=>r.at-i.at).slice(0,A)}function W(){const t=N("dashboard"),e=M(),i=Z(),r=F(),{data:s,error:C,loading:D,refresh:R}=K(()=>L(A),$),I=s?V(s):[];return a.jsx(G,{title:e.label("activity"),icon:O,actions:a.jsx("button",{type:"button",onClick:R,"aria-label":t("activity.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:a.jsx(P,{className:S("h-3 w-3",D&&"animate-spin")})}),bodyClassName:"overflow-auto",children:C&&!s?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:t("activity.error")}):!s&&D?a.jsx(z,{}):I.length===0?a.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:t("activity.empty")}):a.jsx("ul",{className:"divide-y divide-border/30",children:I.map(m=>a.jsxs("li",{className:"flex items-baseline gap-2 px-4 py-2",children:[a.jsxs("span",{className:"min-w-0 flex-1",children:[a.jsx("span",{className:"text-[11px] font-medium uppercase tracking-wide text-muted-foreground",children:i(m.kind)}),a.jsx("span",{className:"block truncate text-sm",children:m.title})]}),a.jsx("span",{className:"shrink-0 text-[11px] tabular-nums text-muted-foreground",children:r(m.at)})]},m.id))})})}W.__docgenInfo={description:"",methods:[],displayName:"ActivityWidget"};var l,p,u,v,h,y,x,f,_,g,k,T,E,w,b;const{expect:d,within:j}=__STORYBOOK_MODULE_TEST__,H=[{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"agent.started",at:"2026-06-21T09:00:00.000Z"},{taskId:"t1",title:"Wire up the scheduler tick metric",kind:"task.created",at:"2026-06-21T08:30:00.000Z"},{taskId:"t2",title:"Review the repo registry migration",kind:"pr.merged",at:"2026-06-21T07:00:00.000Z"}],Et={title:"Widgets/ActivityWidget",component:W,decorators:[t=>a.jsx("div",{className:"h-80 w-80",children:a.jsx(t,{})})]},n={beforeEach:()=>B([{match:"/tasks/activity",json:H}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Agent started")).toBeInTheDocument(),await d(e.getByText("Pr merged")).toBeInTheDocument(),await d(e.getAllByText("Wire up the scheduler tick metric").length).toBeGreaterThan(0)}},o={beforeEach:()=>B([{match:"/tasks/activity",json:[]}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("No activity yet.")).toBeInTheDocument()}},c={beforeEach:()=>B([{match:"/tasks/activity",status:500}]),play:async({canvasElement:t})=>{const e=j(t);await d(await e.findByText("Couldn’t load activity.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(l=n.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(E=c.parameters)===null||E===void 0||(T=E.docs)===null||T===void 0?void 0:T.source},description:{story:"Gateway activity endpoint fails → the error fallback.",...(b=c.parameters)===null||b===void 0||(w=b.docs)===null||w===void 0?void 0:w.description}}};const wt=["Default","Empty","Error"];export{n as Default,o as Empty,c as Error,wt as __namedExportsOrder,Et as default};
