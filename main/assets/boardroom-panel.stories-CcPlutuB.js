import{n as T}from"./iframe-BCLzkzeq.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-BhiEd_-1.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-BWunQGAG.js";import"./index-BgY6OMlm.js";import"./check-BHRITz07.js";import"./project-tag-DtEjPjum.js";import"./inbound-C72cBbSB.js";import"./project-modal-BWaWBqeU.js";import"./export-menu-DJ7rsNzo.js";import"./client-DiKEsL_I.js";import"./markdown-preview-Dv2iHdus.js";import"./file-text-Cftvs7y-.js";import"./copy-CfN3ZX50.js";import"./loader-circle-D740EQt7.js";import"./api-BCjkhNtG.js";import"./folder-open-DFgQzmKY.js";import"./folder-Dd_H-Mv3.js";import"./tag-color-picker-B4vui7BC.js";import"./source-list-editor-B7AoIEYk.js";import"./confirm-dialog-N8ZMcAQ7.js";import"./triangle-alert-BNfcsywI.js";import"./source-icon-qgJ5SmXO.js";import"./globe-CAVOC7Ue.js";import"./sticky-note-C0hD3v7x.js";import"./plus-Bb--JNjB.js";import"./external-link-85Oz2ikY.js";import"./task-row-D46UsuHW.js";import"./blocked-badge-Dwp4Q9BP.js";import"./selectable-icon-C8X_irEV.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-CCQWp6nG.js";import"./pencil-BQNQn3Ta.js";import"./trash-2-CTtHFKVl.js";import"./refresh-cw-BmDwa9WH.js";import"./index-BeQhEA0p.js";import"./lightbulb-CFZt4VMt.js";import"./templates-B6M1OYb3.js";import"./sparkles-CjdF7njT.js";import"./brain-B9gwAoB1.js";import"./chevron-right-D4y_Q9cv.js";import"./spinner-bcEUfzT_.js";import"./data-refresh-CicrcTPZ.js";import"./useQuery-Dr369N4m.js";import"./presentation-DxP0okYk.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,Tt as __namedExportsOrder,Bt as default};
