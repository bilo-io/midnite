import{aX as T}from"./iframe-kOSyFTCP.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-FzjKNB-Z.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DBz4stYP.js";import"./Select-ef7c0426.esm-DOG2V_Ub.js";import"./chevron-down-DDQ69fp-.js";import"./check-Q-wKFI1j.js";import"./project-tag-fc0zPmqn.js";import"./project-modal-_gRhDemq.js";import"./export-menu-BMuS3giI.js";import"./client-FAaF5yrJ.js";import"./markdown-preview-D5QEXK7J.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BJF8JBw1.js";import"./copy-brtU1RyQ.js";import"./file-code-corner-Bw5ctqIl.js";import"./loader-circle-ggulxtxe.js";import"./api-DB4fVA5O.js";import"./folder-open-CDfq0egt.js";import"./folder-CMatzmv8.js";import"./tag-color-picker-DizOlE5S.js";import"./sparkles-DVJdwr6f.js";import"./brain-BLyslAPq.js";import"./chevron-right-BhLgqrjt.js";import"./markdown-editor-CmRk3zqW.js";import"./pencil-CMXnMO3n.js";import"./trash-2-D6xU6A9X.js";import"./confirm-dialog-ry9LyozV.js";import"./index-IkkZQbkP.js";import"./triangle-alert-8Rweub8r.js";import"./templates-B6M1OYb3.js";import"./plus-CJccFASS.js";import"./task-row-dIdraujz.js";import"./blocked-badge-DMIbsbft.js";import"./selectable-icon-JYbiDaZo.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C7xQyTtS.js";import"./arrow-left-DoQYe-9I.js";import"./spinner-B-GYp_sl.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CamR5JPV.js";import"./use-api-data-BekcCStl.js";import"./useQuery-CUK4t1-j.js";import"./presentation-TK-vdaau.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
