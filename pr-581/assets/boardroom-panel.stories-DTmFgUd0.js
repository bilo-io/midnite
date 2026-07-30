import{aX as T}from"./iframe-CsL0iqw4.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BR-9TagD.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Jz63yV7B.js";import"./Select-ef7c0426.esm-BpZksOel.js";import"./chevron-down-DRkv64LO.js";import"./check-INuBivbv.js";import"./project-tag-DNgJ-pa-.js";import"./project-modal-BNBsAkV5.js";import"./export-menu-qyq8mNHd.js";import"./client-CghBiSrJ.js";import"./markdown-preview-s8IwK4b_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-SZJ1cnhz.js";import"./copy-7QY7pcvb.js";import"./file-code-corner-CpZqTEOs.js";import"./loader-circle-XLckS9BL.js";import"./api-BL5bvBY3.js";import"./folder-open-DjP54DcH.js";import"./folder-C_jmApJR.js";import"./tag-color-picker-DRcnYxbm.js";import"./sparkles-BytqrZBg.js";import"./brain-DL2Tjzdy.js";import"./chevron-right-CyfmnmSS.js";import"./markdown-editor-1d1ow9DM.js";import"./pencil-BDc0uosH.js";import"./trash-2-DpbM2XEy.js";import"./confirm-dialog-DYy2gjDW.js";import"./index-BJhEK0kP.js";import"./triangle-alert-CDDbw1Mw.js";import"./templates-DhQvcRM-.js";import"./plus-CQpVIONi.js";import"./task-row-lyBxuTZ7.js";import"./i18n-labels-D0vKWhxe.js";import"./selectable-icon-C-8gy7Vz.js";import"./hover-expand-button-DRvNL3Rp.js";import"./index-SdqF37tT.js";import"./data-refresh-B9C8kWRs.js";import"./rotate-ccw-DjjPOeg7.js";import"./play-rRmquy6y.js";import"./square-terminal-BDWzK8LV.js";import"./task-columns-BUR8DOSo.js";import"./spinner-AJB-xHcW.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DIKGsnTR.js";import"./useQuery-C_95Z7Le.js";import"./presentation-BNpUZ7s6.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
