import{aO as O,b2 as T,a$ as e,aM as k}from"./iframe-XPm5dhjm.js";import{i as C}from"./mock-fetch-aFrr3kfG.js";import{l as W}from"./index-Bj3i4008.js";import{E as Z}from"./api-Bijz-e3A.js";import{u as F}from"./use-polling-BOxxv3z5.js";import{A as L}from"./agent-cli-logo-BKy_SmRs.js";import{B as R}from"./bot-D7Y4fl6K.js";import{W as U}from"./spinner-BKXXRgwU.js";import{W as q}from"./widget-card-BRL1aQyo.js";import{U as H}from"./users-CeYdTgDt.js";import{R as P}from"./refresh-cw-BXViU5Lr.js";import"./preload-helper-Dp1pzeXC.js";import"./useQuery-D4IrmZeQ.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",key:"1n2ejm"}],["path",{d:"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",key:"1qfcsi"}]],z=O("messages-square",$);function I({council:t,className:a}){const o=T("council");var s;const l=(s=t.consultationCount)!==null&&s!==void 0?s:0;return e.jsxs("span",{className:k("flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground",a),children:[e.jsxs("span",{className:"flex items-center gap-1",title:o("stats.members",{count:t.members.length}),children:[e.jsx(R,{className:"h-3.5 w-3.5"}),t.members.length]}),e.jsxs("span",{className:"flex items-center gap-1",title:o("stats.consultations",{count:l}),children:[e.jsx(z,{className:"h-3.5 w-3.5"}),l]})]})}I.__docgenInfo={description:`Inline member + consultation counts for a council, each with an icon — members
(🤖) and consultations/runs (💬). Shared by the councils list/grid/table and
the dashboard widget so the two always read the same.`,methods:[],displayName:"CouncilStats",props:{council:{required:!0,tsType:{name:"Council"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const G=6e4;function S(){const t=T("council"),{data:a,error:o,loading:s,refresh:l}=F(()=>Z(),G),A=(a??[]).filter(n=>!n.archived).sort((n,M)=>new Date(M.updatedAt).getTime()-new Date(n.updatedAt).getTime());return e.jsx(q,{title:t("widget.title"),icon:H,actions:e.jsx("button",{type:"button",onClick:l,"aria-label":t("widget.refresh"),className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(P,{className:k("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:o&&!a?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:t("widget.error")}):!a&&s?e.jsx(U,{}):A.length===0?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:t("widget.empty")}):e.jsx("ul",{className:"divide-y divide-border/30",children:A.map(n=>e.jsx(K,{council:n},n.id))})})}function K({council:t}){const a=T("council"),o=[...new Set(t.members.map(s=>s.provider))];return e.jsx("li",{children:e.jsxs(W,{href:`/councils/view?id=${t.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block truncate text-sm font-medium",children:t.name}),o.length>0?e.jsx("span",{className:"mt-1 flex items-center -space-x-1",children:o.slice(0,5).map(s=>e.jsx("span",{className:"flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background",children:e.jsx(L,{cli:s,className:"h-2.5 w-2.5"})},s))}):e.jsx("span",{className:"block text-[11px] text-muted-foreground",children:a("widget.noMembers")})]}),e.jsx(I,{council:t})]})})}S.__docgenInfo={description:"",methods:[],displayName:"CouncilsWidget"};var m,u,p,h,v,f,x,y,_,g,w,b,E,N,j;const{expect:d,within:B}=__STORYBOOK_MODULE_TEST__,D=[{id:"c1",name:"Architecture review",synthProvider:"antigravity",defaultFormat:"debate",members:[{id:"m1",councilId:"c1",name:"Optimist",provider:"claude",role:"Make the strongest case in favour.",position:0,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"},{id:"m2",councilId:"c1",name:"Skeptic",provider:"codex",role:"Argue the contrary view.",position:1,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"}],consultationCount:4,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"c2",name:"Naming bikeshed",synthProvider:"claude",defaultFormat:"brainstorm",members:[],consultationCount:0,createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],ie={title:"Widgets/CouncilsWidget",component:S,decorators:[t=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(t,{})})]},r={beforeEach:()=>C([{match:"/councils",json:D}]),play:async({canvasElement:t})=>{const a=B(t);await d(await a.findByText(D[0].name)).toBeInTheDocument(),await d(a.getByText("No members")).toBeInTheDocument()}},c={beforeEach:()=>C([{match:"/councils",json:[]}]),play:async({canvasElement:t})=>{const a=B(t);await d(await a.findByText("No councils yet.")).toBeInTheDocument()}},i={beforeEach:()=>C([{match:"/councils",status:500}]),play:async({canvasElement:t})=>{const a=B(t);await d(await a.findByText("Couldn’t load councils.")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(m=r.parameters)===null||m===void 0?void 0:m.docs,source:{originalSource:`{
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
}`,...(E=i.parameters)===null||E===void 0||(b=E.docs)===null||b===void 0?void 0:b.source},description:{story:"Gateway councils endpoint fails → the error fallback.",...(j=i.parameters)===null||j===void 0||(N=j.docs)===null||N===void 0?void 0:N.description}}};const le=["Default","Empty","Error"];export{r as Default,c as Empty,i as Error,le as __namedExportsOrder,ie as default};
