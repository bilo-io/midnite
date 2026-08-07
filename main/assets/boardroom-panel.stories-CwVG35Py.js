import{b1 as T}from"./iframe-Ca-MuGJ4.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DIaFy1kR.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Bq3Jsyqv.js";import"./Select-ef7c0426.esm-Dtv-oxYH.js";import"./chevron-down-CM1iNlGz.js";import"./check-BUfFT45s.js";import"./project-tag-BBc1-82N.js";import"./project-modal-Di7Vi8_u.js";import"./export-menu-DHy-2oXZ.js";import"./client-L6DJgq5K.js";import"./markdown-preview-C8tDxoCA.js";import"./index.dom-D_wTd2ti.js";import"./copy-DEfUb2Z9.js";import"./file-code-corner-B7RoV5Ro.js";import"./file-text-C1U_CEmA.js";import"./loader-circle-ME4BhDfy.js";import"./api-Bo8fV7ym.js";import"./folder-open-BzvSW_ax.js";import"./folder-CANMY8jb.js";import"./tag-color-picker-Cm7SIljj.js";import"./sparkles-DLHgAdcl.js";import"./brain-DYUOXJ1t.js";import"./chevron-right-BHdIciB0.js";import"./markdown-editor-B43v-Vgd.js";import"./pencil-BD_hbqXB.js";import"./trash-2-BXyaZLMd.js";import"./confirm-dialog-BqQjVRLe.js";import"./templates-C-htojI0.js";import"./project-template-labels-BpchYLNr.js";import"./plus-CMMinTB0.js";import"./task-row-UeOezo9D.js";import"./blocked-badge-CXOLklSb.js";import"./selectable-icon-BF7Z7uEX.js";import"./hover-expand-button-bbk_rJ-E.js";import"./index-BEGMl3cf.js";import"./data-refresh-DUbV4gAk.js";import"./rotate-ccw-B-YeUdfG.js";import"./play-DYTMguRo.js";import"./square-terminal-Ci77KHGY.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DbUP1WcY.js";import"./spinner-0eXoS5y8.js";import"./task-route-D70_7rUP.js";import"./use-api-data-D_vq53E5.js";import"./useQuery-B0UmHLbP.js";import"./presentation-BNZwdI9n.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
