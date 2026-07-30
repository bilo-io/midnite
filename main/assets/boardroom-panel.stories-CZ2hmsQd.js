import{aX as T}from"./iframe-BwJY7oEv.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CT132IkL.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CE7JHhYG.js";import"./Select-ef7c0426.esm-BBB-BAyB.js";import"./chevron-down-BZMGNW4M.js";import"./check-AcI_hyI-.js";import"./project-tag-BREQD1Xm.js";import"./project-modal-Dk7Tbvuj.js";import"./export-menu-DIzcKN83.js";import"./client-Cgp0f9p-.js";import"./markdown-preview-BUR3uZtm.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CNNmYtRW.js";import"./copy-cCr--dEH.js";import"./file-code-corner-CsqNmcJP.js";import"./loader-circle-CKAnhzvz.js";import"./api-DkRHPdCK.js";import"./folder-open-CDfNeP9j.js";import"./folder-Dll_zjvJ.js";import"./tag-color-picker-BTEEoQ8i.js";import"./sparkles-B2qAX_os.js";import"./brain-CU8nKeVN.js";import"./chevron-right-CluygHlW.js";import"./markdown-editor-Bz_AGZFR.js";import"./pencil-B8UEb5cL.js";import"./trash-2-BBi-QsYw.js";import"./confirm-dialog-BWLEgn6B.js";import"./index-BW56mZoE.js";import"./triangle-alert--7l-zhtC.js";import"./templates-C8PW-OX1.js";import"./plus-BRy0NyH5.js";import"./task-row-D2gzdrwz.js";import"./i18n-labels-VTDvWeVQ.js";import"./selectable-icon-QxPS4uFx.js";import"./hover-expand-button-DP6M9a72.js";import"./index-ClTxKH5f.js";import"./data-refresh-BROK_YZF.js";import"./rotate-ccw-CH3hPw6W.js";import"./play-nur6Lilh.js";import"./square-terminal-urIBVInH.js";import"./task-columns-BUR8DOSo.js";import"./spinner-CmYTxhoW.js";import"./task-route-D70_7rUP.js";import"./use-api-data-Ct1ahBzF.js";import"./useQuery-B-BNlxb2.js";import"./presentation-CWHgYrHY.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
