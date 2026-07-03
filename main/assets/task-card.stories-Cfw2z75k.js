import{n as ne}from"./iframe-CyuGqAe9.js";import{t as de,e as l,k as ce,l as le,q as t,r as pe,u as ue}from"./fixtures-CckvYj1j.js";import{T as me}from"./task-card-BZ73A-2f.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-caimLB85.js";import"./blocked-badge-CCv8Ox3f.js";import"./pr-status-chip-CptdJSKh.js";import"./git-merge-BpBCBn8h.js";import"./project-tag-BWdYwb7a.js";import"./source-icon-CjIqIx4j.js";import"./globe-keD1o-8D.js";import"./sticky-note-CAwZ3pnW.js";import"./api-Bq8Fx77f.js";import"./check-CSptye5O.js";var g,k,h,w,y,B,T,x,j,I,H,R,A,S,E,f,Q,F,O,C,b,W,D,N,U,K,L,Y,q,G,P,M,z,J,V,X,Z,$,ee,ae,te,se,oe,re;const{expect:p,fn:ve,userEvent:_e,within:u}=__STORYBOOK_MODULE_TEST__,Ee={title:"Components/TaskCard",component:me,decorators:[e=>ne.jsx("div",{className:"max-w-xs",children:ne.jsx(e,{})})],args:{onSelect:ve()}},s={args:{task:t,project:l},play:async({args:e,canvasElement:a})=>{const ie=u(a);await _e.click(ie.getByText(t.title)),await p(e.onSelect).toHaveBeenCalledOnce()}},m={args:{task:ce,project:l}},v={args:{task:pe}},o={args:{task:de},play:async({canvasElement:e})=>{const a=u(e);await p(a.getByText("Answered")).toBeInTheDocument()}},_={args:{task:le,project:{tag:"GATEWAY",color:"#0ea5e9"}}},r={args:{task:ue}},n={args:{task:t,project:l,onSelect:void 0}},i={args:{task:{...t,repo:"acme/api"},project:l},play:async({canvasElement:e})=>{const a=u(e);await p(a.getByText("acme/api")).toBeInTheDocument()}},d={args:{task:{...t,status:"todo",heldReason:"over-budget"},project:l},play:async({canvasElement:e})=>{const a=u(e);await p(a.getByText("Held: over budget")).toBeInTheDocument()}},c={args:{task:{...t,status:"todo",heldReason:"rate-limited"}},play:async({canvasElement:e})=>{const a=u(e);await p(a.getByText("Held: rate-limited")).toBeInTheDocument()}};s.parameters={...s.parameters,docs:{...(g=s.parameters)===null||g===void 0?void 0:g.docs,source:{originalSource:`{
  args: {
    task: taskFeature,
    project: projectTagInfo
  },
  // With \`onSelect\` set the card is a button — clicking it selects the task.
  play: async ({
    args,
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText(taskFeature.title));
    await expect(args.onSelect).toHaveBeenCalledOnce();
  }
}`,...(h=s.parameters)===null||h===void 0||(k=h.docs)===null||k===void 0?void 0:k.source},description:{story:"A feature with a project tag and source links.",...(y=s.parameters)===null||y===void 0||(w=y.docs)===null||w===void 0?void 0:w.description}}};m.parameters={...m.parameters,docs:{...(B=m.parameters)===null||B===void 0?void 0:B.docs,source:{originalSource:`{
  args: {
    task: taskBug,
    project: projectTagInfo
  }
}`,...(x=m.parameters)===null||x===void 0||(T=x.docs)===null||T===void 0?void 0:T.source}}};v.parameters={...v.parameters,docs:{...(j=v.parameters)===null||j===void 0?void 0:j.docs,source:{originalSource:`{
  args: {
    task: taskQuestion
  }
}`,...(H=v.parameters)===null||H===void 0||(I=H.docs)===null||I===void 0?void 0:I.source}}};o.parameters={...o.parameters,docs:{...(R=o.parameters)===null||R===void 0?void 0:R.docs,source:{originalSource:`{
  args: {
    task: taskAnsweredQuestion
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Answered')).toBeInTheDocument();
  }
}`,...(S=o.parameters)===null||S===void 0||(A=S.docs)===null||A===void 0?void 0:A.source},description:{story:'A question answered inline at intake — resolved to Done with an "Answered" badge.',...(f=o.parameters)===null||f===void 0||(E=f.docs)===null||E===void 0?void 0:E.description}}};_.parameters={..._.parameters,docs:{...(Q=_.parameters)===null||Q===void 0?void 0:Q.docs,source:{originalSource:`{
  args: {
    task: taskChore,
    project: {
      tag: 'GATEWAY',
      color: '#0ea5e9'
    }
  }
}`,...(O=_.parameters)===null||O===void 0||(F=O.docs)===null||F===void 0?void 0:F.source}}};r.parameters={...r.parameters,docs:{...(C=r.parameters)===null||C===void 0?void 0:C.docs,source:{originalSource:`{
  args: {
    task: taskUnknown
  }
}`,...(W=r.parameters)===null||W===void 0||(b=W.docs)===null||b===void 0?void 0:b.source},description:{story:'No `kind` set — falls back to the neutral "Task" badge.',...(N=r.parameters)===null||N===void 0||(D=N.docs)===null||D===void 0?void 0:D.description}}};n.parameters={...n.parameters,docs:{...(U=n.parameters)===null||U===void 0?void 0:U.docs,source:{originalSource:`{
  args: {
    task: taskFeature,
    project: projectTagInfo,
    onSelect: undefined
  }
}`,...(L=n.parameters)===null||L===void 0||(K=L.docs)===null||K===void 0?void 0:K.source},description:{story:"Without `onSelect` the card renders as a static div instead of a button.",...(q=n.parameters)===null||q===void 0||(Y=q.docs)===null||Y===void 0?void 0:Y.description}}};i.parameters={...i.parameters,docs:{...(G=i.parameters)===null||G===void 0?void 0:G.docs,source:{originalSource:`{
  args: {
    task: {
      ...taskFeature,
      repo: 'acme/api'
    },
    project: projectTagInfo
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('acme/api')).toBeInTheDocument();
  }
}`,...(M=i.parameters)===null||M===void 0||(P=M.docs)===null||P===void 0?void 0:P.source},description:{story:"A task assigned to a repo shows the repo chip alongside the project tag.",...(J=i.parameters)===null||J===void 0||(z=J.docs)===null||z===void 0?void 0:z.description}}};d.parameters={...d.parameters,docs:{...(V=d.parameters)===null||V===void 0?void 0:V.docs,source:{originalSource:`{
  args: {
    task: {
      ...taskFeature,
      status: 'todo',
      heldReason: 'over-budget'
    },
    project: projectTagInfo
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Held: over budget')).toBeInTheDocument();
  }
}`,...(Z=d.parameters)===null||Z===void 0||(X=Z.docs)===null||X===void 0?void 0:X.source},description:{story:"Phase 50 B — a ready `todo` task the scheduler is holding because the hard\n daily/monthly spend cap is exceeded. New agents won't spawn until it clears.",...(ee=d.parameters)===null||ee===void 0||($=ee.docs)===null||$===void 0?void 0:$.description}}};c.parameters={...c.parameters,docs:{...(ae=c.parameters)===null||ae===void 0?void 0:ae.docs,source:{originalSource:`{
  args: {
    task: {
      ...taskFeature,
      status: 'todo',
      heldReason: 'rate-limited'
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Held: rate-limited')).toBeInTheDocument();
  }
}`,...(se=c.parameters)===null||se===void 0||(te=se.docs)===null||te===void 0?void 0:te.source},description:{story:"Phase 50 B — held because the per-hour spawn-rate cap is full.",...(re=c.parameters)===null||re===void 0||(oe=re.docs)===null||oe===void 0?void 0:oe.description}}};const fe=["Feature","Bug","Question","AnsweredQuestion","Chore","UnknownKind","NonInteractive","WithRepo","HeldOverBudget","HeldRateLimited"];export{o as AnsweredQuestion,m as Bug,_ as Chore,s as Feature,d as HeldOverBudget,c as HeldRateLimited,n as NonInteractive,v as Question,r as UnknownKind,i as WithRepo,fe as __namedExportsOrder,Ee as default};
