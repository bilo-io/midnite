import{aX as T}from"./iframe-CPAYwQxp.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BKxqMXp9.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Desl17D3.js";import"./Select-ef7c0426.esm-x5sLzWHH.js";import"./chevron-down-LwuG85d9.js";import"./check-B3uGI09g.js";import"./project-tag-DdrRuVy9.js";import"./project-modal-BQcjILlZ.js";import"./export-menu-Be5rDs5F.js";import"./client-CMb9gmEH.js";import"./markdown-preview-DH1ykCN_.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Diq8UEiS.js";import"./copy-DWXsTuYy.js";import"./file-code-corner-DTxmWNE0.js";import"./loader-circle-BLkPhJRK.js";import"./api-HGRhlxo0.js";import"./folder-open-CobQYDha.js";import"./folder-Bng52scK.js";import"./tag-color-picker-rzoYjKM9.js";import"./sparkles-B_s3InOR.js";import"./brain-BEysMyWo.js";import"./chevron-right-DNwiGD5l.js";import"./markdown-editor-DWxYmDnA.js";import"./pencil-DtoLVncd.js";import"./trash-2-QcMxYDDa.js";import"./confirm-dialog-BKvr9oOI.js";import"./index-C_FbQ7B4.js";import"./triangle-alert-DTsL3LTG.js";import"./templates-DUUZz1L7.js";import"./plus-0FRerCOS.js";import"./task-row-Do95tU1s.js";import"./i18n-labels-B3NVMLIw.js";import"./selectable-icon-CG3oIsF_.js";import"./hover-expand-button-G8BB-nSa.js";import"./index-Df41uKQS.js";import"./data-refresh-BfcWmvWJ.js";import"./rotate-ccw-D3xBszkK.js";import"./play-IKd_-JNz.js";import"./square-terminal-CcfgP4IB.js";import"./task-columns-BUR8DOSo.js";import"./spinner-DjL55wXM.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BRscoHei.js";import"./useQuery-B4LhWA-z.js";import"./presentation-xxtZ4jGd.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
