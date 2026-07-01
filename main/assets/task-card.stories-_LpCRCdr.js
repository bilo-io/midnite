import{n as J}from"./iframe-DJr7qVNo.js";import{t as V,e as l,k as X,l as Z,q as p,r as $,u as ee}from"./fixtures-CckvYj1j.js";import{T as ae}from"./task-card-CToXeVTW.js";import"./preload-helper-Dp1pzeXC.js";import"./inbound-CbJZzwyX.js";import"./blocked-badge-B7FTUDKR.js";import"./pr-status-chip-BAvXL3qU.js";import"./git-merge-CnK_r6pm.js";import"./project-tag-bB-RAwE0.js";import"./source-icon-CZYHKUIe.js";import"./globe-DW0-XAJU.js";import"./sticky-note-BjV0VPoG.js";import"./api-A95bhGP6.js";import"./check-Dt-62BLG.js";var u,m,v,_,g,k,w,h,T,y,j,B,A,x,S,I,Q,f,E,C,F,W,U,N,R,K,O,D,b,Y,q,G,H,L;const{expect:M,fn:te,userEvent:re,within:z}=__STORYBOOK_MODULE_TEST__,we={title:"Components/TaskCard",component:ae,decorators:[e=>J.jsx("div",{className:"max-w-xs",children:J.jsx(e,{})})],args:{onSelect:te()}},t={args:{task:p,project:l},play:async({args:e,canvasElement:a})=>{const P=z(a);await re.click(P.getByText(p.title)),await M(e.onSelect).toHaveBeenCalledOnce()}},i={args:{task:X,project:l}},c={args:{task:$}},r={args:{task:V},play:async({canvasElement:e})=>{const a=z(e);await M(a.getByText("Answered")).toBeInTheDocument()}},d={args:{task:Z,project:{tag:"GATEWAY",color:"#0ea5e9"}}},o={args:{task:ee}},s={args:{task:p,project:l,onSelect:void 0}},n={args:{task:{...p,repo:"acme/api"},project:l},play:async({canvasElement:e})=>{const a=z(e);await M(a.getByText("acme/api")).toBeInTheDocument()}};t.parameters={...t.parameters,docs:{...(u=t.parameters)===null||u===void 0?void 0:u.docs,source:{originalSource:`{
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
}`,...(v=t.parameters)===null||v===void 0||(m=v.docs)===null||m===void 0?void 0:m.source},description:{story:"A feature with a project tag and source links.",...(g=t.parameters)===null||g===void 0||(_=g.docs)===null||_===void 0?void 0:_.description}}};i.parameters={...i.parameters,docs:{...(k=i.parameters)===null||k===void 0?void 0:k.docs,source:{originalSource:`{
  args: {
    task: taskBug,
    project: projectTagInfo
  }
}`,...(h=i.parameters)===null||h===void 0||(w=h.docs)===null||w===void 0?void 0:w.source}}};c.parameters={...c.parameters,docs:{...(T=c.parameters)===null||T===void 0?void 0:T.docs,source:{originalSource:`{
  args: {
    task: taskQuestion
  }
}`,...(j=c.parameters)===null||j===void 0||(y=j.docs)===null||y===void 0?void 0:y.source}}};r.parameters={...r.parameters,docs:{...(B=r.parameters)===null||B===void 0?void 0:B.docs,source:{originalSource:`{
  args: {
    task: taskAnsweredQuestion
  },
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Answered')).toBeInTheDocument();
  }
}`,...(x=r.parameters)===null||x===void 0||(A=x.docs)===null||A===void 0?void 0:A.source},description:{story:'A question answered inline at intake — resolved to Done with an "Answered" badge.',...(I=r.parameters)===null||I===void 0||(S=I.docs)===null||S===void 0?void 0:S.description}}};d.parameters={...d.parameters,docs:{...(Q=d.parameters)===null||Q===void 0?void 0:Q.docs,source:{originalSource:`{
  args: {
    task: taskChore,
    project: {
      tag: 'GATEWAY',
      color: '#0ea5e9'
    }
  }
}`,...(E=d.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.source}}};o.parameters={...o.parameters,docs:{...(C=o.parameters)===null||C===void 0?void 0:C.docs,source:{originalSource:`{
  args: {
    task: taskUnknown
  }
}`,...(W=o.parameters)===null||W===void 0||(F=W.docs)===null||F===void 0?void 0:F.source},description:{story:'No `kind` set — falls back to the neutral "Task" badge.',...(N=o.parameters)===null||N===void 0||(U=N.docs)===null||U===void 0?void 0:U.description}}};s.parameters={...s.parameters,docs:{...(R=s.parameters)===null||R===void 0?void 0:R.docs,source:{originalSource:`{
  args: {
    task: taskFeature,
    project: projectTagInfo,
    onSelect: undefined
  }
}`,...(O=s.parameters)===null||O===void 0||(K=O.docs)===null||K===void 0?void 0:K.source},description:{story:"Without `onSelect` the card renders as a static div instead of a button.",...(b=s.parameters)===null||b===void 0||(D=b.docs)===null||D===void 0?void 0:D.description}}};n.parameters={...n.parameters,docs:{...(Y=n.parameters)===null||Y===void 0?void 0:Y.docs,source:{originalSource:`{
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
}`,...(G=n.parameters)===null||G===void 0||(q=G.docs)===null||q===void 0?void 0:q.source},description:{story:"A task assigned to a repo shows the repo chip alongside the project tag.",...(L=n.parameters)===null||L===void 0||(H=L.docs)===null||H===void 0?void 0:H.description}}};const he=["Feature","Bug","Question","AnsweredQuestion","Chore","UnknownKind","NonInteractive","WithRepo"];export{r as AnsweredQuestion,i as Bug,d as Chore,t as Feature,s as NonInteractive,c as Question,o as UnknownKind,n as WithRepo,he as __namedExportsOrder,we as default};
