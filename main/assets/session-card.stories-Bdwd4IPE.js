import{aX as e}from"./iframe-C1xKAh6G.js";import{g as B,s as H,h as d,i as K,j as M,e as U}from"./fixtures-BZzR_DAR.js";import{S as X,a as Y,b as q}from"./session-card-B8nOMS5f.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C2piPofu.js";import"./index-BsItoPXa.js";import"./Select-ef7c0426.esm-DOAILYgh.js";import"./chevron-down-C0yxmy7H.js";import"./check-BHnZF4Ef.js";import"./project-tag-CIV2GW02.js";import"./selectable-icon-4aClfnkw.js";import"./bot-message-square-B6XEiN6b.js";import"./arrow-up-right-DgEBNBdz.js";var l,c,m,p,u,v,g,_,x,y,S,w,R,j,h,N,f,C,I,k,L,b,T,D;const{expect:z,fn:E,userEvent:A,within:F}=__STORYBOOK_MODULE_TEST__,ts={title:"Components/SessionCard",component:X,args:{onClick:E()}},o={args:{session:d,layout:"grid"},decorators:[s=>e.jsx("div",{className:"max-w-xs",children:e.jsx(s,{})})],play:async({args:s,canvasElement:O})=>{const W=F(O);await A.click(W.getByText(d.title)),await z(s.onClick).toHaveBeenCalledOnce()}},i={args:{session:K,layout:"grid"},decorators:[s=>e.jsx("div",{className:"max-w-xs",children:e.jsx(s,{})})]},t={args:{session:H,layout:"list"},decorators:[s=>e.jsx("div",{className:"max-w-2xl",children:e.jsx(s,{})})]},a={args:{session:B,layout:"grid"},decorators:[s=>e.jsx("div",{className:"max-w-xs",children:e.jsx(s,{})})]},r={args:{session:d,layout:"list"},render:()=>e.jsx("div",{className:"max-w-3xl rounded-lg border border-border/60",children:M.map(s=>e.jsx(Y,{session:s,project:U,onClick:E()},s.id))})},n={args:{session:d,layout:"grid"},render:()=>e.jsx("div",{className:"flex items-center gap-6",children:["running","waiting","completed","idle"].map(s=>e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(q,{status:s}),e.jsx("span",{className:"text-xs text-muted-foreground",children:s})]},s))})};o.parameters={...o.parameters,docs:{...(l=o.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  args: {
    session: sessionRunning,
    layout: 'grid'
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>],
  // The whole card is clickable — opening the session.
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(sessionRunning.title));
    await expect(args.onClick).toHaveBeenCalledOnce();
  }
}`,...(m=o.parameters)===null||m===void 0||(c=m.docs)===null||c===void 0?void 0:c.source},description:{story:"Running sessions pulse their status dot.",...(u=o.parameters)===null||u===void 0||(p=u.docs)===null||p===void 0?void 0:p.description}}};i.parameters={...i.parameters,docs:{...(v=i.parameters)===null||v===void 0?void 0:v.docs,source:{originalSource:`{
  args: {
    session: sessionWaiting,
    layout: 'grid'
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(_=i.parameters)===null||_===void 0||(g=_.docs)===null||g===void 0?void 0:g.source}}};t.parameters={...t.parameters,docs:{...(x=t.parameters)===null||x===void 0?void 0:x.docs,source:{originalSource:`{
  args: {
    session: sessionCompleted,
    layout: 'list'
  },
  decorators: [Story => <div className="max-w-2xl">
        <Story />
      </div>]
}`,...(S=t.parameters)===null||S===void 0||(y=S.docs)===null||y===void 0?void 0:y.source}}};a.parameters={...a.parameters,docs:{...(w=a.parameters)===null||w===void 0?void 0:w.docs,source:{originalSource:`{
  args: {
    session: sessionIdle,
    layout: 'grid'
  },
  decorators: [Story => <div className="max-w-xs">
        <Story />
      </div>]
}`,...(j=a.parameters)===null||j===void 0||(R=j.docs)===null||R===void 0?void 0:R.source},description:{story:"Idle, no context ring (no token counts reported).",...(N=a.parameters)===null||N===void 0||(h=N.docs)===null||h===void 0?void 0:h.description}}};r.parameters={...r.parameters,docs:{...(f=r.parameters)===null||f===void 0?void 0:f.docs,source:{originalSource:`{
  args: {
    session: sessionRunning,
    layout: 'list'
  },
  render: () => <div className="max-w-3xl rounded-lg border border-border/60">
      {sessions.map(s => <SessionRow key={s.id} session={s} project={projectTagInfo} onClick={fn()} />)}
    </div>
}`,...(I=r.parameters)===null||I===void 0||(C=I.docs)===null||C===void 0?void 0:C.source},description:{story:"The flat table-row variant used inside the Sessions accordions.",...(L=r.parameters)===null||L===void 0||(k=L.docs)===null||k===void 0?void 0:k.description}}};n.parameters={...n.parameters,docs:{...(b=n.parameters)===null||b===void 0?void 0:b.docs,source:{originalSource:`{
  args: {
    session: sessionRunning,
    layout: 'grid'
  },
  render: () => <div className="flex items-center gap-6">
      {(['running', 'waiting', 'completed', 'idle'] as const).map(status => <div key={status} className="flex items-center gap-2">
          <SessionStatusDot status={status} />
          <span className="text-xs text-muted-foreground">{status}</span>
        </div>)}
    </div>
}`,...(D=n.parameters)===null||D===void 0||(T=D.docs)===null||T===void 0?void 0:T.source}}};const ns=["Running","Waiting","ListLayout","Idle","Rows","StatusDots"];export{a as Idle,t as ListLayout,r as Rows,o as Running,n as StatusDots,i as Waiting,ns as __namedExportsOrder,ts as default};
