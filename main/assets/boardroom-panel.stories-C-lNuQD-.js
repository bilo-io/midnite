import{aU as T}from"./iframe-RUxLRQ-W.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-DNpRYf0E.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Cnf_ucsT.js";import"./Select-ef7c0426.esm-DieGl5RV.js";import"./chevron-down-Cu0JHjja.js";import"./check-xk4V8668.js";import"./project-tag-DgrZ3GE5.js";import"./project-modal-9Dgg6bUL.js";import"./export-menu-Djg1WusX.js";import"./client-B8Wv9_CC.js";import"./markdown-preview-C0l9Qa83.js";import"./index.dom-D_wTd2ti.js";import"./file-text-D0XNEdwL.js";import"./copy-BQjqGW7G.js";import"./file-code-corner-DVMcjwB-.js";import"./loader-circle-Ct7d1Gtq.js";import"./api-BzV0Zzg-.js";import"./folder-open-HuQ4NI8S.js";import"./folder-Dyj0Gsf4.js";import"./tag-color-picker-Chma4cpm.js";import"./sparkles-rTqupMnf.js";import"./brain-82mVNyyu.js";import"./chevron-right-B9HJ4kwQ.js";import"./markdown-editor-BF2LloE6.js";import"./pencil-DTKsX3u9.js";import"./trash-2-xW3ef78x.js";import"./confirm-dialog-DbFfY0JV.js";import"./index-CCiKSgr9.js";import"./triangle-alert-ifnqry6t.js";import"./templates-B6M1OYb3.js";import"./plus-D5620Ktc.js";import"./task-row-hsmI72IZ.js";import"./i18n-labels-D-H-Wyhr.js";import"./selectable-icon-DUXCEdeB.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DnvmwST8.js";import"./arrow-left-k0qjSIqp.js";import"./spinner-gkmLyuYm.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DeIOoiK_.js";import"./use-api-data-wS2xG85o.js";import"./useQuery-DdRVrzCU.js";import"./presentation-CT8im1DK.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
