import{aX as me}from"./iframe-Ln_xB0ra.js";import{t as ve,e as s,k as _e,l as ge,q as t,r as he,u as ke}from"./fixtures-BZzR_DAR.js";import{T as we}from"./task-card-BgWy3gKk.js";import"./preload-helper-Dp1pzeXC.js";import"./blocked-badge-BaDOCUXB.js";import"./reply-box-aaj66GHu.js";import"./index-qNTqXMqE.js";import"./Select-ef7c0426.esm-CK_lkYUi.js";import"./chevron-down-CWPfPTdg.js";import"./check-jat6RuUo.js";import"./api-COfa-pOQ.js";import"./pr-status-chip-CDeCWy5-.js";import"./git-merge-CIGCda-L.js";import"./project-tag-Bqx9jN0o.js";import"./source-icon-BZKg1Cz9.js";import"./globe-0XERNNfe.js";import"./file-text-CH2Q2Q6Y.js";import"./sticky-note-BIB8aOAP.js";import"./triangle-alert-CVwj2ou4.js";import"./shield-alert-BIRxOLan.js";import"./milestone-DR06OE_O.js";var h,k,w,y,B,T,x,j,I,E,H,R,S,A,f,W,F,Q,b,O,C,D,N,U,K,L,M,P,Y,q,G,X,z,J,V,Z,$,ee,ae,te,se,ne,oe,re,ie,de,ce,le,pe;const{expect:n,fn:ye,userEvent:Be,within:o}=__STORYBOOK_MODULE_TEST__,Me={title:"Components/TaskCard",component:we,decorators:[e=>me.jsx("div",{className:"max-w-xs",children:me.jsx(e,{})})],args:{onSelect:ye()}},r={args:{task:t,project:s},play:async({args:e,canvasElement:a})=>{const ue=o(a);await Be.click(ue.getByText(t.title)),await n(e.onSelect).toHaveBeenCalledOnce()}},v={args:{task:_e,project:s}},i={args:{task:{...t,milestoneId:"ms-1",milestoneName:"Public launch"},project:s},play:async({canvasElement:e})=>{const a=o(e);await n(a.getByText("Public launch")).toBeInTheDocument()}},_={args:{task:he}},d={args:{task:{...ve,answered:!0}},play:async({canvasElement:e})=>{const a=o(e);await n(a.getByText("Answered")).toBeInTheDocument()}},g={args:{task:ge,project:{tag:"GATEWAY",color:"#0ea5e9"}}},c={args:{task:ke}},l={args:{task:t,project:s,onSelect:void 0}},p={args:{task:{...t,repo:"acme/api"},project:s},play:async({canvasElement:e})=>{const a=o(e);await n(a.getByText("acme/api")).toBeInTheDocument()}},m={args:{task:{...t,status:"todo",heldReason:"over-budget"},project:s},play:async({canvasElement:e})=>{const a=o(e);await n(a.getByText("Held: over budget")).toBeInTheDocument()}},u={args:{task:{...t,status:"todo",heldReason:"rate-limited"}},play:async({canvasElement:e})=>{const a=o(e);await n(a.getByText("Held: rate-limited")).toBeInTheDocument()}};r.parameters={...r.parameters,docs:{...(h=r.parameters)===null||h===void 0?void 0:h.docs,source:{originalSource:`{
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
}`,...(w=r.parameters)===null||w===void 0||(k=w.docs)===null||k===void 0?void 0:k.source},description:{story:"A feature with a project tag and source links.",...(B=r.parameters)===null||B===void 0||(y=B.docs)===null||y===void 0?void 0:y.description}}};v.parameters={...v.parameters,docs:{...(T=v.parameters)===null||T===void 0?void 0:T.docs,source:{originalSource:`{
  args: {
    task: taskBug,
    project: projectTagInfo
  }
}`,...(j=v.parameters)===null||j===void 0||(x=j.docs)===null||x===void 0?void 0:x.source}}};i.parameters={...i.parameters,docs:{...(I=i.parameters)===null||I===void 0?void 0:I.docs,source:{originalSource:`{
  args: {
    task: {
      ...taskFeature,
      milestoneId: 'ms-1',
      milestoneName: 'Public launch'
    },
    project: projectTagInfo
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Public launch')).toBeInTheDocument();
  }
}`,...(H=i.parameters)===null||H===void 0||(E=H.docs)===null||E===void 0?void 0:E.source},description:{story:`Phase 58 F — a task assigned to a milestone shows a milestone chip (name joined
 onto the summary server-side).`,...(S=i.parameters)===null||S===void 0||(R=S.docs)===null||R===void 0?void 0:R.description}}};_.parameters={..._.parameters,docs:{...(A=_.parameters)===null||A===void 0?void 0:A.docs,source:{originalSource:`{
  args: {
    task: taskQuestion
  }
}`,...(W=_.parameters)===null||W===void 0||(f=W.docs)===null||f===void 0?void 0:f.source}}};d.parameters={...d.parameters,docs:{...(F=d.parameters)===null||F===void 0?void 0:F.docs,source:{originalSource:`{
  // The card reads the server-derived \`answered\` summary field (Phase 57 C).
  args: {
    task: {
      ...taskAnsweredQuestion,
      answered: true
    }
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Answered')).toBeInTheDocument();
  }
}`,...(b=d.parameters)===null||b===void 0||(Q=b.docs)===null||Q===void 0?void 0:Q.source},description:{story:'A question answered inline at intake — resolved to Done with an "Answered" badge.',...(C=d.parameters)===null||C===void 0||(O=C.docs)===null||O===void 0?void 0:O.description}}};g.parameters={...g.parameters,docs:{...(D=g.parameters)===null||D===void 0?void 0:D.docs,source:{originalSource:`{
  args: {
    task: taskChore,
    project: {
      tag: 'GATEWAY',
      color: '#0ea5e9'
    }
  }
}`,...(U=g.parameters)===null||U===void 0||(N=U.docs)===null||N===void 0?void 0:N.source}}};c.parameters={...c.parameters,docs:{...(K=c.parameters)===null||K===void 0?void 0:K.docs,source:{originalSource:`{
  args: {
    task: taskUnknown
  }
}`,...(M=c.parameters)===null||M===void 0||(L=M.docs)===null||L===void 0?void 0:L.source},description:{story:'No `kind` set — falls back to the neutral "Task" badge.',...(Y=c.parameters)===null||Y===void 0||(P=Y.docs)===null||P===void 0?void 0:P.description}}};l.parameters={...l.parameters,docs:{...(q=l.parameters)===null||q===void 0?void 0:q.docs,source:{originalSource:`{
  args: {
    task: taskFeature,
    project: projectTagInfo,
    onSelect: undefined
  }
}`,...(X=l.parameters)===null||X===void 0||(G=X.docs)===null||G===void 0?void 0:G.source},description:{story:"Without `onSelect` the card renders as a static div instead of a button.",...(J=l.parameters)===null||J===void 0||(z=J.docs)===null||z===void 0?void 0:z.description}}};p.parameters={...p.parameters,docs:{...(V=p.parameters)===null||V===void 0?void 0:V.docs,source:{originalSource:`{
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
}`,...($=p.parameters)===null||$===void 0||(Z=$.docs)===null||Z===void 0?void 0:Z.source},description:{story:"A task assigned to a repo shows the repo chip alongside the project tag.",...(ae=p.parameters)===null||ae===void 0||(ee=ae.docs)===null||ee===void 0?void 0:ee.description}}};m.parameters={...m.parameters,docs:{...(te=m.parameters)===null||te===void 0?void 0:te.docs,source:{originalSource:`{
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
}`,...(ne=m.parameters)===null||ne===void 0||(se=ne.docs)===null||se===void 0?void 0:se.source},description:{story:"Phase 50 B — a ready `todo` task the scheduler is holding because the hard\n daily/monthly spend cap is exceeded. New agents won't spawn until it clears.",...(re=m.parameters)===null||re===void 0||(oe=re.docs)===null||oe===void 0?void 0:oe.description}}};u.parameters={...u.parameters,docs:{...(ie=u.parameters)===null||ie===void 0?void 0:ie.docs,source:{originalSource:`{
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
}`,...(ce=u.parameters)===null||ce===void 0||(de=ce.docs)===null||de===void 0?void 0:de.source},description:{story:"Phase 50 B — held because the per-hour spawn-rate cap is full.",...(pe=u.parameters)===null||pe===void 0||(le=pe.docs)===null||le===void 0?void 0:le.description}}};const Pe=["Feature","Bug","WithMilestone","Question","AnsweredQuestion","Chore","UnknownKind","NonInteractive","WithRepo","HeldOverBudget","HeldRateLimited"];export{d as AnsweredQuestion,v as Bug,g as Chore,r as Feature,m as HeldOverBudget,u as HeldRateLimited,l as NonInteractive,_ as Question,c as UnknownKind,i as WithMilestone,p as WithRepo,Pe as __namedExportsOrder,Me as default};
