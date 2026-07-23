import{aU as T}from"./iframe-Bex7MJ7s.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-NpDZf1uS.js";import"./preload-helper-Dp1pzeXC.js";import"./index-BGsh9AI0.js";import"./Select-ef7c0426.esm-m-Nw3XwC.js";import"./chevron-down-6NTQWZM5.js";import"./check-Br7GPob0.js";import"./project-tag-bsJMgdUk.js";import"./project-modal-B-PXrwnE.js";import"./export-menu-BMG4NzLr.js";import"./client-BduYfLD1.js";import"./markdown-preview-XmWROqIV.js";import"./index.dom-D_wTd2ti.js";import"./file-text-k1QIfIsC.js";import"./copy-5-V1W3PS.js";import"./file-code-corner-oE8LGsmm.js";import"./loader-circle-TLgmSADb.js";import"./api-DM0V0dcU.js";import"./folder-open-CNcFoQHU.js";import"./folder-BhIpe_vC.js";import"./tag-color-picker-CObo8TJK.js";import"./sparkles-R2blPfm6.js";import"./brain-BwF-Ustt.js";import"./chevron-right-CS7tuvfs.js";import"./markdown-editor-Dg8GoezJ.js";import"./pencil-B-ov6kXF.js";import"./trash-2-BNlMC15f.js";import"./confirm-dialog-C8DKXoAN.js";import"./index-ColvGFBv.js";import"./triangle-alert-CDKTUso9.js";import"./templates-B6M1OYb3.js";import"./plus-C6jqQGXy.js";import"./task-row-DHeHdmAg.js";import"./i18n-labels-CBcRdeOB.js";import"./selectable-icon-BqH8kzYv.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-BRjTXtsh.js";import"./arrow-left-C7hJxgIY.js";import"./spinner-C8O5MkXG.js";import"./task-route-D70_7rUP.js";import"./data-refresh-ClO6FsPz.js";import"./use-api-data-BenZJUsn.js";import"./useQuery-DrsycRBt.js";import"./presentation-avpV9IQi.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
