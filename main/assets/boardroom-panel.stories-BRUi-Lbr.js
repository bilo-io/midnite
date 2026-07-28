import{aX as T}from"./iframe-DAMAKIsi.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BHPay0t4.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DWtX9coI.js";import"./Select-ef7c0426.esm-B5a6i_ou.js";import"./chevron-down-BGyHDD1X.js";import"./check-Cm8tIL1C.js";import"./project-tag-COcFMR3_.js";import"./project-modal-DAucMBqt.js";import"./export-menu-kFDBozJN.js";import"./client-Cbfujt0F.js";import"./markdown-preview-F8AfRfIT.js";import"./index.dom-D_wTd2ti.js";import"./file-text-ZhT4vSKk.js";import"./copy-B-1qXURk.js";import"./file-code-corner-CUI2KrKn.js";import"./loader-circle-WInSQoxi.js";import"./api-Cf3xAxtZ.js";import"./folder-open-BhnkteeT.js";import"./folder-Neh0D3yc.js";import"./tag-color-picker-CMFYWFQ0.js";import"./sparkles-Cqmre-0c.js";import"./brain-D2jifDvi.js";import"./chevron-right-BUzG93L0.js";import"./markdown-editor-BYD0gJcl.js";import"./pencil-CfIEUEf5.js";import"./trash-2-DzIhcYGU.js";import"./confirm-dialog-E9atywT2.js";import"./index-Cwaii1aI.js";import"./triangle-alert-CR7Lln8a.js";import"./templates-BS-RP0_S.js";import"./plus-D85K9vaG.js";import"./task-row-CBiNpoiY.js";import"./i18n-labels-Cx6pD8Ae.js";import"./selectable-icon-B5DkYWc4.js";import"./hover-expand-button-BX6to5AD.js";import"./index-4VMWshsF.js";import"./data-refresh-CpTj2Jd0.js";import"./rotate-ccw-Cj8Capa4.js";import"./play-CmVEwy0f.js";import"./square-terminal-CJkW7rnp.js";import"./task-columns-BUR8DOSo.js";import"./spinner-BIOwXdzS.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DhFO_1Xk.js";import"./useQuery--jqsWrk7.js";import"./presentation-CqMhLKbs.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
