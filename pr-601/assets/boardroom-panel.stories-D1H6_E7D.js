import{aZ as T}from"./iframe-CntJAXSQ.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CuYZ68XK.js";import"./preload-helper-Dp1pzeXC.js";import"./index-490MRAhq.js";import"./Select-ef7c0426.esm-CgS_9Nkn.js";import"./chevron-down-DWCX2rQA.js";import"./check-B3A__-pr.js";import"./project-tag-CBbYMfsX.js";import"./project-modal-DSXcJkuG.js";import"./export-menu-C2UxpeoF.js";import"./client-BXRVasKv.js";import"./markdown-preview-B4tqtGHk.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Dt1GqdZ9.js";import"./copy-BQGJBfu4.js";import"./file-code-corner-DWR5Rg1H.js";import"./loader-circle-CKWmlm8C.js";import"./api-D393iBDt.js";import"./folder-open-BEMpdJy7.js";import"./folder-Dcg3rmRe.js";import"./tag-color-picker-CQ1yMnK5.js";import"./sparkles-BDe-0bcN.js";import"./brain-GNFy-akB.js";import"./chevron-right-D2NfN5oI.js";import"./markdown-editor-BWk7Cf64.js";import"./pencil-BYVUPpFH.js";import"./trash-2-DYW0ufDo.js";import"./confirm-dialog-DZhIZeIR.js";import"./templates-B2aKAjDE.js";import"./project-template-labels-CBpDrs0q.js";import"./plus-DTjnmLyq.js";import"./task-row-D2iOsSwW.js";import"./blocked-badge-CuaTdef6.js";import"./selectable-icon-Br07LQKU.js";import"./hover-expand-button-IgYZCTVW.js";import"./index-v7GAp9ji.js";import"./data-refresh-b-B3Wlzd.js";import"./rotate-ccw-C5M_IuVQ.js";import"./play-Yyyu44nq.js";import"./square-terminal-CeXSnBdU.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DCKs6xZ7.js";import"./spinner-CIy97OX1.js";import"./task-route-D70_7rUP.js";import"./use-api-data-XI1Rvn4d.js";import"./useQuery-ljqhbylZ.js";import"./presentation-MFstg6lF.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
