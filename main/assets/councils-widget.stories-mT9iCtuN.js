import{h as B,n as e,f as A}from"./iframe-CNz5KHij.js";import{i as E}from"./mock-fetch-aFrr3kfG.js";import{l as M}from"./index-BMMtNKka.js";import{p as O}from"./api-4WxRUCnO.js";import{u as R}from"./use-polling-D983M5es.js";import{A as W}from"./agent-cli-logo-C8uipvt-.js";import{B as Z}from"./bot-DjTbdnmn.js";import{W as F}from"./spinner-B3qdNRui.js";import{W as L}from"./widget-card-DfQInYWT.js";import{R as q}from"./refresh-cw-D9jroR6t.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-B8us280C.js";import"./useQuery-DeYjPlPh.js";/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const U=[["path",{d:"M16 10a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 14.286V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",key:"1n2ejm"}],["path",{d:"M20 9a2 2 0 0 1 2 2v10.286a.71.71 0 0 1-1.212.502l-2.202-2.202A2 2 0 0 0 17.172 19H10a2 2 0 0 1-2-2v-1",key:"1qfcsi"}]],H=B("messages-square",U);/**
 * @license lucide-react v1.17.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const $=[["path",{d:"M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2",key:"1yyitq"}],["path",{d:"M16 3.128a4 4 0 0 1 0 7.744",key:"16gr8j"}],["path",{d:"M22 21v-2a4 4 0 0 0-3-3.87",key:"kshegd"}],["circle",{cx:"9",cy:"7",r:"4",key:"nufk8"}]],P=B("users",$);function D({council:t,className:a}){var s;const i=(s=t.consultationCount)!==null&&s!==void 0?s:0;return e.jsxs("span",{className:A("flex shrink-0 items-center gap-3 text-xs tabular-nums text-muted-foreground",a),children:[e.jsxs("span",{className:"flex items-center gap-1",title:`${t.members.length} members`,children:[e.jsx(Z,{className:"h-3.5 w-3.5"}),t.members.length]}),e.jsxs("span",{className:"flex items-center gap-1",title:`${i} consultations`,children:[e.jsx(H,{className:"h-3.5 w-3.5"}),i]})]})}D.__docgenInfo={description:`Inline member + consultation counts for a council, each with an icon — members
(🤖) and consultations/runs (💬). Shared by the councils list/grid/table and
the dashboard widget so the two always read the same.`,methods:[],displayName:"CouncilStats",props:{council:{required:!0,tsType:{name:"Council"},description:""},className:{required:!1,tsType:{name:"string"},description:""}}};const z=6e4;function I(){const{data:t,error:a,loading:s,refresh:i}=R(()=>O(),z),C=(t??[]).filter(o=>!o.archived).sort((o,S)=>new Date(S.updatedAt).getTime()-new Date(o.updatedAt).getTime());return e.jsx(L,{title:"Councils",icon:P,actions:e.jsx("button",{type:"button",onClick:i,"aria-label":"Refresh councils",className:"rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",children:e.jsx(q,{className:A("h-3 w-3",s&&"animate-spin")})}),bodyClassName:"overflow-auto",children:a&&!t?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-destructive",children:"Couldn’t load councils."}):!t&&s?e.jsx(F,{}):C.length===0?e.jsx("p",{className:"px-4 py-6 text-center text-sm text-muted-foreground",children:"No councils yet."}):e.jsx("ul",{className:"divide-y divide-border/30",children:C.map(o=>e.jsx(G,{council:o},o.id))})})}function G({council:t}){const a=[...new Set(t.members.map(s=>s.provider))];return e.jsx("li",{children:e.jsxs(M,{href:`/councils/view?id=${t.id}`,className:"flex items-center gap-2 px-4 py-2 transition-colors hover:bg-accent",children:[e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block truncate text-sm font-medium",children:t.name}),a.length>0?e.jsx("span",{className:"mt-1 flex items-center -space-x-1",children:a.slice(0,5).map(s=>e.jsx("span",{className:"flex h-4 w-4 items-center justify-center rounded-full border border-border/60 bg-background",children:e.jsx(W,{cli:s,className:"h-2.5 w-2.5"})},s))}):e.jsx("span",{className:"block text-[11px] text-muted-foreground",children:"No members"})]}),e.jsx(D,{council:t})]})})}I.__docgenInfo={description:"",methods:[],displayName:"CouncilsWidget"};var d,m,u,p,h,v,f,x,y,_,g,b,w,N,j;const{expect:l,within:T}=__STORYBOOK_MODULE_TEST__,k=[{id:"c1",name:"Architecture review",synthProvider:"gemini",defaultFormat:"debate",members:[{id:"m1",councilId:"c1",name:"Optimist",provider:"claude",role:"Make the strongest case in favour.",position:0,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"},{id:"m2",councilId:"c1",name:"Skeptic",provider:"codex",role:"Argue the contrary view.",position:1,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-01T09:00:00.000Z"}],consultationCount:4,createdAt:"2026-06-01T09:00:00.000Z",updatedAt:"2026-06-21T09:00:00.000Z"},{id:"c2",name:"Naming bikeshed",synthProvider:"claude",defaultFormat:"brainstorm",members:[],consultationCount:0,createdAt:"2026-06-02T09:00:00.000Z",updatedAt:"2026-06-20T09:00:00.000Z"}],ce={title:"Widgets/CouncilsWidget",component:I,decorators:[t=>e.jsx("div",{className:"h-80 w-80",children:e.jsx(t,{})})]},n={beforeEach:()=>E([{match:"/councils",json:k}]),play:async({canvasElement:t})=>{const a=T(t);await l(await a.findByText(k[0].name)).toBeInTheDocument(),await l(a.getByText("No members")).toBeInTheDocument()}},r={beforeEach:()=>E([{match:"/councils",json:[]}]),play:async({canvasElement:t})=>{const a=T(t);await l(await a.findByText("No councils yet.")).toBeInTheDocument()}},c={beforeEach:()=>E([{match:"/councils",status:500}]),play:async({canvasElement:t})=>{const a=T(t);await l(await a.findByText("Couldn’t load councils.")).toBeInTheDocument()}};n.parameters={...n.parameters,docs:{...(d=n.parameters)===null||d===void 0?void 0:d.docs,source:{originalSource:`{
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
}`,...(u=n.parameters)===null||u===void 0||(m=u.docs)===null||m===void 0?void 0:m.source},description:{story:"Active councils loaded from the gateway, newest first.",...(h=n.parameters)===null||h===void 0||(p=h.docs)===null||p===void 0?void 0:p.description}}};r.parameters={...r.parameters,docs:{...(v=r.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
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
}`,...(x=r.parameters)===null||x===void 0||(f=x.docs)===null||f===void 0?void 0:f.source},description:{story:"No councils yet → the empty-state message.",...(_=r.parameters)===null||_===void 0||(y=_.docs)===null||y===void 0?void 0:y.description}}};c.parameters={...c.parameters,docs:{...(g=c.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
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
}`,...(w=c.parameters)===null||w===void 0||(b=w.docs)===null||b===void 0?void 0:b.source},description:{story:"Gateway councils endpoint fails → the error fallback.",...(j=c.parameters)===null||j===void 0||(N=j.docs)===null||N===void 0?void 0:N.description}}};const ie=["Default","Empty","Error"];export{n as Default,r as Empty,c as Error,ie as __namedExportsOrder,ce as default};
