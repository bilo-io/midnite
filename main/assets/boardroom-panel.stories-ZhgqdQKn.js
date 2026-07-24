import{aU as T}from"./iframe-G3xDzys3.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CqtdPo5Q.js";import"./preload-helper-Dp1pzeXC.js";import"./index-fhkGiQmC.js";import"./Select-ef7c0426.esm-BNEXNXid.js";import"./chevron-down-4pV-DDvK.js";import"./check-hWXIojSd.js";import"./project-tag-DPBELIGT.js";import"./project-modal-sVghnggX.js";import"./export-menu-CAAeG-Ze.js";import"./client-BwyOVoCS.js";import"./markdown-preview-oIx4uwbH.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DWrPJtlk.js";import"./copy-ymvXuccP.js";import"./file-code-corner-BPxLdlJU.js";import"./loader-circle-DVzC8C-W.js";import"./api-4F64Xvw2.js";import"./folder-open-BrorDjNv.js";import"./folder-0JPdRxcw.js";import"./tag-color-picker-Cj3jtMdy.js";import"./sparkles-B-_QxDsD.js";import"./brain-kGvkwywf.js";import"./chevron-right-DvaamM-t.js";import"./markdown-editor-BpIs7Yho.js";import"./pencil-C2DUBhZq.js";import"./trash-2-CQFvCnC6.js";import"./confirm-dialog-BudCmPBp.js";import"./index-DlMOO87E.js";import"./triangle-alert-CJTYIpHx.js";import"./templates-B6M1OYb3.js";import"./plus-BJTeDAB9.js";import"./task-row-DyAwey7s.js";import"./i18n-labels-BbGrq0DR.js";import"./selectable-icon-Bpd4_Ocv.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DPJgjGVq.js";import"./arrow-left-Rrt-QzPz.js";import"./spinner-Bn6oshkt.js";import"./task-route-D70_7rUP.js";import"./data-refresh-C2zr1I_P.js";import"./use-api-data-DZ6_iBU2.js";import"./useQuery-ChKj8l39.js";import"./presentation-BWSB8bgJ.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [project, projectMinimal],
      total: 2
    }
  }, {
    match: '/tasks',
    json: {
      items: tasks,
      total: tasks.length
    }
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
}`,...(i=o.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=o.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    json: {
      items: [],
      total: 0
    }
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(h=a.parameters)===null||h===void 0||(d=h.docs)===null||d===void 0?void 0:d.source},description:{story:"No projects → the empty-state message.",...(u=a.parameters)===null||u===void 0||(v=u.docs)===null||v===void 0?void 0:v.description}}};n.parameters={...n.parameters,docs:{...(_=n.parameters)===null||_===void 0?void 0:_.docs,source:{originalSource:`{
  beforeEach: () => installMockFetch([{
    match: '/projects',
    status: 500
  }, {
    match: '/tasks',
    json: {
      items: [],
      total: 0
    }
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Bt as __namedExportsOrder,wt as default};
