import{n as T}from"./iframe-DvVe4A6D.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-CckvYj1j.js";import{B as I}from"./boardroom-panel-BPYCPVxj.js";import"./preload-helper-Dp1pzeXC.js";import"./Select-ef7c0426.esm-DcF5KZ0m.js";import"./index-CCMh9Dwi.js";import"./check-CPIh5aCr.js";import"./project-tag-yS2_mW4n.js";import"./inbound-B8us280C.js";import"./project-modal-CsvegGiw.js";import"./export-menu-BI4zFvX8.js";import"./client-PJSD-E3G.js";import"./markdown-preview-BWhUy1YW.js";import"./file-text-2HbuFbp6.js";import"./copy-sFWw8rAK.js";import"./loader-circle-DNvF26xo.js";import"./api-4WxRUCnO.js";import"./folder-open-CH5a5Csl.js";import"./folder-B1v2FtH3.js";import"./tag-color-picker-2R9C46P3.js";import"./source-list-editor-Jzyh-0JI.js";import"./confirm-dialog-BkP8IIlU.js";import"./triangle-alert-DtEMlhrV.js";import"./source-icon-BLhdWnc4.js";import"./globe-DAP0lkLV.js";import"./sticky-note-DSbL4tcf.js";import"./plus-CKd2C8nA.js";import"./external-link-gJEzfnbl.js";import"./task-row-3_iyza26.js";import"./blocked-badge-B8ncLfyq.js";import"./selectable-icon-Dtdb2U9L.js";import"./task-columns-DXf2yYcn.js";import"./markdown-editor-MmjvQgJc.js";import"./pencil-CylB1yAg.js";import"./trash-2-CpvDsJOH.js";import"./refresh-cw-DRr-gChu.js";import"./index-D_LlzobA.js";import"./lightbulb-CP7QL4m9.js";import"./templates-B6M1OYb3.js";import"./sparkles-KM1eS_DT.js";import"./brain-C7xXulVP.js";import"./chevron-right-Ckd86IAm.js";import"./spinner-CUlnlj3w.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CF322OXh.js";import"./useQuery-VJ4jM9TB.js";import"./presentation-BZPs8iw9.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:n,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,Tt={title:"Office/BoardroomPanel",component:I,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:[x,D]},{match:"/tasks",json:k},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await n(await o.findByText(x.name)).toBeInTheDocument(),await n(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:[]},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText("No projects yet.")).toBeInTheDocument()}},r={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:[]},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await n(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=r.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=r.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const xt=["Default","Empty","Error"];export{e as Default,a as Empty,r as Error,xt as __namedExportsOrder,Tt as default};
