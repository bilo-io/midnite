import{n as T}from"./iframe-Cz1STkNn.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-VniRue45.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BTnMkm5U.js";import"./index-D9Bb3jTe.js";import"./check-B66MxYDM.js";import"./project-tag-a9m3f9RM.js";import"./inbound-DCvJZueD.js";import"./project-modal-qql9jMKV.js";import"./export-menu-D9_6mC-Q.js";import"./client-LJnBqKxZ.js";import"./markdown-preview-C4XVxiHS.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C7mfxTbu.js";import"./copy-28jSnAEL.js";import"./file-code-corner-DGDUKg7r.js";import"./loader-circle-DKzzsIWr.js";import"./api-QR_eMQtt.js";import"./folder-open-BY9dKaLS.js";import"./folder-BsDhbojL.js";import"./tag-color-picker-Cs4iySpu.js";import"./source-list-editor-DSkRB5F4.js";import"./core.esm-VbRt9FX-.js";import"./source-icon-DOWxNzZ1.js";import"./globe-DcCoQmrX.js";import"./sticky-note-Td71Kkqx.js";import"./plus-Dlkm-EcS.js";import"./external-link-EvduyE18.js";import"./task-row-1fLw1Ljy.js";import"./blocked-badge-DPiDulQh.js";import"./selectable-icon-Cz1q0n8A.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CY-9yex2.js";import"./pencil-2OIMvSv7.js";import"./trash-2-CsTbYyEb.js";import"./confirm-dialog-r8fDvl83.js";import"./triangle-alert-BUc5o9GK.js";import"./refresh-cw-DwDQTm9y.js";import"./index-5T0W_wR2.js";import"./lightbulb-DyMycNf-.js";import"./templates-B6M1OYb3.js";import"./sparkles-BGlp023H.js";import"./brain-QNLqhldL.js";import"./chevron-right-CNJ-ILJS.js";import"./spinner-CPVUdAOS.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BDNXW2BL.js";import"./useQuery-BAAAQQ_f.js";import"./presentation-cj8x1sL-.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: [project, projectMinimal]
  }, {
    match: '/tasks',
    json: tasks
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByRole('heading', {
      name: 'Board Room'
    })).toBeInTheDocument();
    // The project list loads asynchronously (Promise.all of three endpoints).
    await expect(await canvas.findByText(project.name)).toBeInTheDocument();
    await expect(canvas.getByText(projectMinimal.name)).toBeInTheDocument();
  }
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: []
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText('No projects yet.')).toBeInTheDocument();
  }
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};r.parameters={...r.parameters,docs:{...(_=r.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: []
  }, {
    match: '/memories',
    json: {
      memories: []
    }
  }]),
  play: async ({
    canvasElement
  }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText(/Couldn’t load projects/)).toBeInTheDocument();
  }
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const It=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,It as __namedExportsOrder,kt as default};
