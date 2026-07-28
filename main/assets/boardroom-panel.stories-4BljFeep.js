import{aX as T}from"./iframe-D2e4yNJo.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DoSj3M_Q.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C-tYSUiV.js";import"./Select-ef7c0426.esm-Bqy0DnVB.js";import"./chevron-down-U-BDtWta.js";import"./check-B29RC21S.js";import"./project-tag-BgTO4fuF.js";import"./project-modal-2gLlg07Y.js";import"./export-menu-BJ8JS6It.js";import"./client-BdZMxiyy.js";import"./markdown-preview-BBa0Vaob.js";import"./index.dom-D_wTd2ti.js";import"./file-text-ZZZjC27b.js";import"./copy-BzFazMVP.js";import"./file-code-corner-BbYpnq_Q.js";import"./loader-circle-CSlYwnFm.js";import"./api-CcMQtoRc.js";import"./folder-open-DsWjjVKq.js";import"./folder-Dm7RO5x7.js";import"./tag-color-picker-BH9q0jBd.js";import"./sparkles-CPmB_0RF.js";import"./brain-DP973nVK.js";import"./chevron-right-BG6uaubw.js";import"./markdown-editor-BjRve0Gw.js";import"./pencil-BIbey_ZC.js";import"./trash-2-DYkOkBdr.js";import"./confirm-dialog-BHRu4OlN.js";import"./index-mHhoxUdr.js";import"./triangle-alert-DLN9sZOz.js";import"./templates-CORcmm2E.js";import"./plus-CRyjpmYO.js";import"./task-row-BpvndXVa.js";import"./i18n-labels-rrdOrKK4.js";import"./selectable-icon-B5ndWLUe.js";import"./task-columns-BUR8DOSo.js";import"./spinner-D1pHRtKb.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BmS3bhqi.js";import"./use-api-data-X9llWhQu.js";import"./useQuery-M96tZgW_.js";import"./presentation-Da6vJDSg.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,ft={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Et=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Et as __namedExportsOrder,ft as default};
