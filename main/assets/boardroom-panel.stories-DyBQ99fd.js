import{aX as T}from"./iframe-CUlcPxi-.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DLlMfi_Z.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CQ-BkcQk.js";import"./Select-ef7c0426.esm-D1GiREd2.js";import"./chevron-down-C5UsFrop.js";import"./check-DKlmBT20.js";import"./project-tag-CXp82O1s.js";import"./project-modal-oKBFccq1.js";import"./export-menu-BaVWH5La.js";import"./client-AymMeh9M.js";import"./markdown-preview-CvPmHGU-.js";import"./index.dom-D_wTd2ti.js";import"./file-text-C0M6XGzN.js";import"./copy-CnJyraY4.js";import"./file-code-corner-4vM5K6EA.js";import"./loader-circle-DnArweyU.js";import"./api-CdK8KWtp.js";import"./folder-open-3xhrNfP5.js";import"./folder-CJVHoWpF.js";import"./tag-color-picker-CPLPSRtR.js";import"./sparkles-B4eMafwM.js";import"./brain-DIaMu-E2.js";import"./chevron-right-BPQqbx_R.js";import"./markdown-editor-TsbnRAt6.js";import"./pencil-DECWDZaE.js";import"./trash-2-BCz3p7cp.js";import"./confirm-dialog-C386DNYw.js";import"./index-K7Pm0ij0.js";import"./triangle-alert-Cvdnxc4T.js";import"./templates-Dwtczdxj.js";import"./plus-DXAvH1lU.js";import"./task-row-DhqlgMHF.js";import"./i18n-labels-6lVBTK6Q.js";import"./selectable-icon-oxyTrH4m.js";import"./hover-expand-button-BsgkuiuL.js";import"./index-6CmBilmO.js";import"./data-refresh-BlZ7vbGr.js";import"./rotate-ccw-DGa4Fl6P.js";import"./play-CHe8LFE8.js";import"./square-terminal-DI_Orv56.js";import"./task-columns-BUR8DOSo.js";import"./spinner-C_zkI1vw.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DsJ_SYO-.js";import"./useQuery-BOGqpQO7.js";import"./presentation-CY-80k1Q.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
