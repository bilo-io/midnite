import{aX as T}from"./iframe-DV4ZKBnW.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Ctx9DjBm.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DlI2S46w.js";import"./Select-ef7c0426.esm-DrlAoEdq.js";import"./chevron-down-CEBoLECh.js";import"./check-t9sTEtT7.js";import"./project-tag-aeRTde6h.js";import"./project-modal-CfU6FIxp.js";import"./export-menu-BW3oaboP.js";import"./client-CPUmk0Ol.js";import"./markdown-preview-DvWj4eOr.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D9GTnjZW.js";import"./copy-Cv2wJ7BN.js";import"./file-code-corner-A_sWKuUl.js";import"./loader-circle-tepIZz6t.js";import"./api-Ci4qjtyl.js";import"./folder-open-Dqe8Y3DX.js";import"./folder-BCiQUmh7.js";import"./tag-color-picker--j2FMWg-.js";import"./sparkles-DL4zFBWx.js";import"./brain-Cz-ijPG-.js";import"./chevron-right-C7nzIGF5.js";import"./markdown-editor-BkcQitni.js";import"./pencil-C39q64fG.js";import"./trash-2-DyXekNmF.js";import"./confirm-dialog-B9OOxtHB.js";import"./index-mHO4Rn_n.js";import"./triangle-alert-C78OnYR-.js";import"./templates-CGTAbcw_.js";import"./plus-CHyFtMqU.js";import"./task-row-B3esUIW6.js";import"./i18n-labels-DA40VszQ.js";import"./selectable-icon-BW6hfRTx.js";import"./task-columns-BUR8DOSo.js";import"./spinner-CUwY7xxp.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DNMUYrUa.js";import"./use-api-data-CmTs7i1I.js";import"./useQuery-CqKyTArr.js";import"./presentation-m3TLBO_p.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,ft={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
