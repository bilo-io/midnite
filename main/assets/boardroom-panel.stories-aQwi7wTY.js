import{a$ as T}from"./iframe-ErTqIs5U.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CwfjEOnq.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BJ3wPdfM.js";import"./Select-ef7c0426.esm-CkdW5jqN.js";import"./chevron-down-CFlz4HBc.js";import"./check-xaBTdq-C.js";import"./project-tag-DyO1DsGm.js";import"./project-modal-dxinKn8p.js";import"./export-menu-BCGl2j0F.js";import"./client-CJ5qswQ4.js";import"./markdown-preview-BkOXDLaG.js";import"./index.dom-D_wTd2ti.js";import"./copy-1W8UYqmj.js";import"./file-code-corner-kNGyAvc2.js";import"./file-text-C2_AQRj8.js";import"./loader-circle-B0ZlQW99.js";import"./api-BcTsSGyT.js";import"./folder-open-D8kEXUUb.js";import"./folder-DvyCrgOI.js";import"./tag-color-picker-lE05ov7Y.js";import"./sparkles-Bs_Uezhr.js";import"./brain-JNWYFu_E.js";import"./chevron-right-C6NvYeDq.js";import"./markdown-editor-KUlqZpuZ.js";import"./pencil-CndWqWTm.js";import"./trash-2--9fOkH16.js";import"./confirm-dialog-zWZSPvac.js";import"./templates-CNWN9IRo.js";import"./project-template-labels-D5s-k5Qh.js";import"./plus-DE9RjYsL.js";import"./task-row--gcUryNY.js";import"./blocked-badge-CjuwAqve.js";import"./selectable-icon-B5ldu_5B.js";import"./hover-expand-button-BUZO7nI4.js";import"./index-D-OJsRsV.js";import"./data-refresh-3f4t7aCn.js";import"./rotate-ccw-BTOc1Eu3.js";import"./play-Bwl8WY5m.js";import"./square-terminal-D1w8WVoI.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-BhhnjMAw.js";import"./spinner-C1O47UGc.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DofY2EnU.js";import"./useQuery-BdWrptaN.js";import"./presentation-DlBPCu9e.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
