import{aN as D,b1 as T,a_ as e,aL as I}from"./iframe-BnX4h3ux.js";import{i as C}from"./mock-fetch-aFrr3kfG.js";import{l as L}from"./index-b9lOXdxt.js";import{E as W}from"./api-BrOqZxqt.js";import{u as Z}from"./use-polling-BdeHK9HW.js";import{A as F}from"./agent-cli-logo-DUkQic7T.js";import{B as R}from"./bot-B1kDl-tR.js";import{W as q}from"./spinner-D8K42EDR.js";import{W as U}from"./widget-card-IkmfVEta.js";import{R as H}from"./refresh-cw-CWWOABr2.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-HwFxntCl.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const P=[["path",{d:"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",key:"1n2ejm"}],["path",{d:"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",key:"1qfcsi"}]],$=D("messages-square",P);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const z=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],G=D("users",z);function S({council:t,className:a}){const n=T("council");var s;const l=(s=t.consultationCount)!==null&&s!==void 0?s:0;return e.jsxs("span",{className:I("flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground",a),children:[e.jsxs("span",{className:"flex items-center gap-1",title:n("stats.members",{count:t.members.length}),children:[e.jsx(R,{className:"h-3.5 w-3.5"}),t.members.length]}),e.jsxs("span",{className:"flex items-center gap-1",title:n("stats.consultations",{count:l}),children:[e.jsx($,{className:"h-3.5 w-3.5"}),l]})]})}S.__docgenInfo={description:`Inline member + consultation counts for a council, each with an icon — members
(🤖) and consultations/runs (💬). Shared by the councils list/grid/table and
the dashboard widget so the two always read the same.`,methods:[],displayName:"CouncilStats",props:{council:{required:!0,tsType:{name:"Council"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const K=6e4;function M(){const t=T("council"),{data:a,error:n,loading:s,refresh:l}=Z(()=>W(),K),B=(a??[]).filter(o=>!o.archived).sort((o,O)=>new Date(O.updatedAt).getTime()-new Date(o.updatedAt).getTime());return e.jsx(U,{title:t("widget.title"),icon:G,actions:e.jsx("button",{type:"button",onClick:l,"aria-label":t("widget.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(H,{className:I("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:n&&!a?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:t("widget.error")}):!a&&s?e.jsx(q,{}):B.length===0?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:t("widget.empty")}):e.jsx("ul",{className:"divide-y divide-border/30",children:B.map(o=>e.jsx(V,{council:o},o.id))})})}function V({council:t}){const a=T("council"),n=[...new Set(t.members.map(s=>s.provider))];return e.jsx("li",{children:e.jsxs(L,{href:`/councils/view?id=${t.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block truncate text-sm font-medium",children:t.name}),n.length>0?e.jsx("span",{className:"mt-1 flex items-center -space-x-1",children:n.slice(0,5).map(s=>e.jsx("span",{className:"flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background",children:e.jsx(F,{cli:s,className:"h-2.5 w-2.5"})},s))}):e.jsx("span",{className:"block text-[11px] text-muted-foreground",children:a("widget.noMembers")})]}),e.jsx(S,{council:t})]})})}M.__docgenInfo={description:"",methods:[],displayName:"CouncilsWidget"};var m,u,p,h,v,f,x,y,_,g,w,b,N,E,j;const{expect:d,within:k}=__STORYBOOK_MODULE_TEST__,A=[{id:"c1",name:"Architecture review",synthProvider:"antigravity",defaultFormat:"debate",members:[{id:"m1",councilId:"c1",name:"Optimist",provider:"claude",role:"Make the strongest case in favour.",position:0,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"},{id:"m2",councilId:"c1",name:"Skeptic",provider:"codex",role:"Argue the contrary view.",position:1,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"}],consultationCount:4,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"c2",name:"Naming bikeshed",synthProvider:"claude",defaultFormat:"brainstorm",members:[],consultationCount:0,createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],ie={title:"Widgets/CouncilsWidget",component:M,decorators:[t=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(t,{})})]},r={beforeEach:()=>C([{match:"/councils",json:A}]),play:async({canvasElement:t})=>{const a=k(t);await d(await a.findByText(A[0].name)).toBeInTheDocument(),await d(a.getByText("No members")).toBeInTheDocument()}},c={beforeEach:()=>C([{match:"/councils",json:[]}]),play:async({canvasElement:t})=>{const a=k(t);await d(await a.findByText("No councils yet.")).toBeInTheDocument()}},i={beforeEach:()=>C([{match:"/councils",status:500}]),play:async({canvasElement:t})=>{const a=k(t);await d(await a.findByText("Couldn’t load councils.")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/councils',
    json: COUNCILS
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(COUNCILS[0]!.name)).toBeInTheDocument();
    // A member-less council renders the "No members" fallback row.
    await expect(canvas.getByText('No members')).toBeInTheDocument();
  }
}`,...(p=r.parameters)===null||p===void 0||(u=p.docs)===null||u===void 0?void 0:u.source},description:{story:"Active councils loaded from the gateway, newest first.",...(v=r.parameters)===null||v===void 0||(h=v.docs)===null||h===void 0?void 0:h.description}}};c.parameters={...c.parameters,docs:{...(f=c.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/councils',
    json: []
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No councils yet.')).toBeInTheDocument();
  }
}`,...(y=c.parameters)===null||y===void 0||(x=y.docs)===null||x===void 0?void 0:x.source},description:{story:"No councils yet → the empty-state message.",...(g=c.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(w=i.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/councils',
    status: 500
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('Couldn’t load councils.')).toBeInTheDocument();
  }
}`,...(N=i.parameters)===null||N===void 0||(b=N.docs)===null||b===void 0?void 0:b.source},description:{story:"Gateway councils endpoint fails → the error fallback.",...(j=i.parameters)===null||j===void 0||(E=j.docs)===null||E===void 0?void 0:E.description}}};const le=["Default","Empty","Error"];export{r as Default,c as Empty,i as Error,le as __namedExportsOrder,ie as default};
