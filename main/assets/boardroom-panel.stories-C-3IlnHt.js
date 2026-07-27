import{a$ as T}from"./iframe-DozFiqtH.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Ch-4nyCm.js";import"./preload-helper-Dp1pzeXC.js";import"./index-wDMr3OSJ.js";import"./Select-ef7c0426.esm-obT0ZX02.js";import"./chevron-down-CIhPfZns.js";import"./check-DM55KMvD.js";import"./project-tag-B6pWHrx7.js";import"./project-modal-X3TQYfqn.js";import"./export-menu-G6VA8qJk.js";import"./client-xj7__NZv.js";import"./markdown-preview-D2cBKOJW.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DR158TMw.js";import"./copy-GQGuCI-d.js";import"./file-code-corner-vg0Vdd63.js";import"./loader-circle-Cfo78KpU.js";import"./api-CbGkY1g9.js";import"./folder-open-dXe1Texv.js";import"./folder-D8prwrYm.js";import"./tag-color-picker-uu987Kli.js";import"./sparkles-D2DgB56r.js";import"./brain-CVLfm6AX.js";import"./chevron-right-o64ek2T_.js";import"./markdown-editor-B1RkLGyB.js";import"./pencil-DyRaLhge.js";import"./trash-2-B4-uGMLs.js";import"./confirm-dialog-DrIlvT1c.js";import"./index-EPSG3_IO.js";import"./triangle-alert-BCFU0Vj6.js";import"./templates-CIzH5oWs.js";import"./plus-Bmxxs2IC.js";import"./task-row-v1d9h9yA.js";import"./i18n-labels-BHh-MTFy.js";import"./selectable-icon-DjFdJjER.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DncAiPXF.js";import"./arrow-left-B6eu0mrn.js";import"./spinner-CN4O4T5v.js";import"./task-route-D70_7rUP.js";import"./data-refresh-BrAlV-7C.js";import"./use-api-data-Te6sXENp.js";import"./useQuery-MuxfxkNl.js";import"./presentation-CfHFwj2g.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Bt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Bt as __namedExportsOrder,wt as default};
