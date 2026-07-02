import{n as T}from"./iframe-DC3zcxlt.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-CUX9tFsL.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-8kKgqQdK.js";import"./index-0ituIJES.js";import"./check-9GDDLe77.js";import"./project-tag-BrFuqIRO.js";import"./inbound-srGy8HMv.js";import"./project-modal-J-kOlSqr.js";import"./export-menu-ECDGCzyO.js";import"./client-DF1Vf-lm.js";import"./markdown-preview-B-mpP14A.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CM0SVaFp.js";import"./copy-DGyJWQ2S.js";import"./file-code-corner-vZJFreiM.js";import"./loader-circle-B11Lpt3d.js";import"./api-e81uAW5a.js";import"./folder-open-COGj3Xfd.js";import"./folder-CZ-fN_ji.js";import"./tag-color-picker-CqN8lDNm.js";import"./source-list-editor-Rn850alQ.js";import"./core.esm-Dgluosyv.js";import"./source-icon-CzYSbfEn.js";import"./globe-BIFokWcK.js";import"./sticky-note-DU0AdhlW.js";import"./plus-FnU0F7FI.js";import"./external-link-BViAxoPW.js";import"./task-row-DMYF26ZD.js";import"./blocked-badge-CYAv9BDF.js";import"./selectable-icon-LTRKs8m9.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-Cyky_qrs.js";import"./pencil-D41wtOpq.js";import"./trash-2-CV9uCU7R.js";import"./confirm-dialog-6e_m9BbU.js";import"./triangle-alert-CT1zufkd.js";import"./refresh-cw-Dilv-2Aq.js";import"./index-CFldr1fN.js";import"./lightbulb-Dz3RSFcE.js";import"./templates-B6M1OYb3.js";import"./sparkles-D7mdx0nU.js";import"./brain-Da4c2wRr.js";import"./chevron-right-CQkOZ6_r.js";import"./spinner-BEpjPP76.js";import"./task-route-D70_7rUP.js";import"./data-refresh-Bq3qiRRd.js";import"./useQuery-CVM8c327.js";import"./presentation-CClDYctP.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,kt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
