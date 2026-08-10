import{b0 as T}from"./iframe-DvByxioD.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CYsjG9ZX.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C0qaSSk1.js";import"./Select-ef7c0426.esm-Ty80QyRq.js";import"./chevron-down-CrSnI0MB.js";import"./check-BmdAJ142.js";import"./project-tag-DxYlEiEh.js";import"./project-modal-ChCMWXZN.js";import"./export-menu-7U64r0U-.js";import"./client-CdoCQXk-.js";import"./markdown-preview-DJ2xJ8gh.js";import"./index.dom-D_wTd2ti.js";import"./copy-DoDwlRFX.js";import"./file-code-corner-BZ9oTKMJ.js";import"./file-text-B4NG_tRo.js";import"./loader-circle-CvQGBtOH.js";import"./api-D91Cefj8.js";import"./folder-open-DRMazgfb.js";import"./folder-CG7wja2P.js";import"./tag-color-picker-D-MhImot.js";import"./sparkles-ToWXMYDB.js";import"./brain-BwFknR46.js";import"./chevron-right-CfaBSBdB.js";import"./markdown-editor-Csj4Hu2O.js";import"./pencil-CN0JRahP.js";import"./trash-2-D2NQfeTy.js";import"./confirm-dialog-Bcx214oV.js";import"./templates-jCLDy0m8.js";import"./project-template-labels-C2fU2Z0o.js";import"./plus-CfS_mCeQ.js";import"./task-row-B0o4cy59.js";import"./blocked-badge-BBKtgoaB.js";import"./selectable-icon-Dk86yx9v.js";import"./hover-expand-button-Djv4HDEo.js";import"./index-CQIuqQSb.js";import"./data-refresh-VlN73lkB.js";import"./rotate-ccw-WZSPukN1.js";import"./play-CC0P8I4F.js";import"./square-terminal-Cp0OQre0.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-T-syrlW0.js";import"./spinner-D_PC8i-G.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BP8DIv21.js";import"./useQuery-M0a7EJvX.js";import"./presentation-CeEDElsI.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Dt=["Default","Empty","Error"];export{e as Default,a as Empty,n as Error,Dt as __namedExportsOrder,xt as default};
