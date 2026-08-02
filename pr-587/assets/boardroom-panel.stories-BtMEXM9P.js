import{aZ as T}from"./iframe-Bs5jINoK.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DD2U7SHp.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DDddO7wA.js";import"./Select-ef7c0426.esm-BBFktxgK.js";import"./chevron-down-BepPUQ6p.js";import"./check-9xLPFIG4.js";import"./project-tag-BnQrMNXL.js";import"./project-modal-BwpWABrh.js";import"./export-menu-DsEGPmHC.js";import"./client-DLpOz3UU.js";import"./markdown-preview-DWxl1kPB.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CfjJuriH.js";import"./copy-CkgZphPo.js";import"./file-code-corner-TKZu3rBI.js";import"./loader-circle-0CARkvZS.js";import"./api-C3a39Hg4.js";import"./folder-open-B2NWE6YQ.js";import"./folder-CpwCLpl-.js";import"./tag-color-picker-C7dPboCK.js";import"./sparkles-BxoLzgSl.js";import"./brain-DyOgEQ5Q.js";import"./chevron-right-BnvYYCQe.js";import"./markdown-editor-DfNDEf_U.js";import"./pencil-Cuz71kFf.js";import"./trash-2-B5wTS88t.js";import"./confirm-dialog-Dz45KeX3.js";import"./index-quOr8a_U.js";import"./triangle-alert-x_nVslZC.js";import"./templates-ByrkpCcU.js";import"./plus-Qc9ACr5e.js";import"./task-row-uONGqaMi.js";import"./blocked-badge-CXCfhD2e.js";import"./selectable-icon-DW_3zi7p.js";import"./hover-expand-button-Dd38FM5V.js";import"./index-CMZxoKaS.js";import"./data-refresh-C0PAI0Eq.js";import"./rotate-ccw-RqUeLbs2.js";import"./play-ynOJJHZc.js";import"./square-terminal-DwLv4nUI.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-CAw3oiGW.js";import"./spinner-DyUJEx31.js";import"./task-route-D70_7rUP.js";import"./use-api-data-ChG4YG4d.js";import"./useQuery-BfNpDIHk.js";import"./presentation-B4esZxAQ.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Dt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(i=e.parameters)===null||i===void 0||(m=i.docs)===null||m===void 0?void 0:m.source},description:{story:"The projects hub: a row per active project, with its task count.",...(p=e.parameters)===null||p===void 0||(c=p.docs)===null||c===void 0?void 0:c.description}}};a.parameters={...a.parameters,docs:{...(l=a.parameters)===null||l===void 0?void 0:l.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const kt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,kt as __namedExportsOrder,Dt as default};
