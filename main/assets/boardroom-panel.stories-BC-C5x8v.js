import{a$ as T}from"./iframe-BfPfIiqZ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DEljRjyy.js";import"./preload-helper-Dp1pzeXC.js";import"./index-t61nHQE_.js";import"./Select-ef7c0426.esm-CObZgfCw.js";import"./chevron-down-CPCPdVGK.js";import"./check-DFDOuL3i.js";import"./project-tag-DhkypL4P.js";import"./project-modal-Br9bJmza.js";import"./export-menu-CuGgYVio.js";import"./client-rEpo9FnO.js";import"./markdown-preview-CNDZVcrP.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CH7wljXA.js";import"./copy-GilGnw6S.js";import"./file-code-corner-CzVwl7Hp.js";import"./loader-circle-DlPtQJ0H.js";import"./api-ZPqpUz6P.js";import"./folder-open-BeEoTVyY.js";import"./folder-DqLrYSu8.js";import"./tag-color-picker-DveYZm_1.js";import"./sparkles-FVpMTbq3.js";import"./brain-KnXuDT2b.js";import"./chevron-right-CtMDEHaW.js";import"./markdown-editor-BcoCemvl.js";import"./pencil-DCDdlMSe.js";import"./trash-2-MJTPPaOb.js";import"./confirm-dialog-DSNIAlXX.js";import"./index-B5GGpOys.js";import"./triangle-alert-D7WZIEFT.js";import"./templates-BSzT3dul.js";import"./plus-CH8vYBIY.js";import"./task-row-FEG_dPb3.js";import"./i18n-labels-CrB_3HMz.js";import"./selectable-icon-_HY5zrZ0.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-D9H3p5wB.js";import"./arrow-left-B58NYdi5.js";import"./spinner-DfTZOHI6.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BZU4mnmB.js";import"./use-api-data-D-cAjMDd.js";import"./useQuery-CuXA4Iad.js";import"./presentation-AC5xa97m.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
