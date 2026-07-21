import{aX as T}from"./iframe-Chfe_yyu.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-D861YKoz.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CCrl9ZdV.js";import"./Select-ef7c0426.esm-dke19RAq.js";import"./chevron-down-CD2txmuJ.js";import"./check-C-N8ojlB.js";import"./project-tag-CXluQ5Xk.js";import"./project-modal-BJ4b_LZI.js";import"./export-menu-BMgsV09H.js";import"./client-Dn_07fsb.js";import"./markdown-preview-CHn_BAqL.js";import"./index.dom-D_wTd2ti.js";import"./file-text-DxW42wT2.js";import"./copy-wv8gmsS-.js";import"./file-code-corner-Bmqg-70x.js";import"./loader-circle-DwNLM3qU.js";import"./api-Bw2TaCuL.js";import"./folder-open-CBfTqjmP.js";import"./folder-CSJM9aVX.js";import"./tag-color-picker-DJD5s_3X.js";import"./sparkles-Ca79iEfx.js";import"./brain-NMp1pRam.js";import"./chevron-right-CgTgQd19.js";import"./markdown-editor-BhaeTSC4.js";import"./pencil-DNwvajXr.js";import"./trash-2-NruoWCGm.js";import"./confirm-dialog-Ce5fatEw.js";import"./index-C8aWVn71.js";import"./triangle-alert-DHh26j0A.js";import"./templates-B6M1OYb3.js";import"./plus-k-gCTPaN.js";import"./task-row-BlP54nNb.js";import"./blocked-badge-BAlZ9yhl.js";import"./selectable-icon-DhuIH_8f.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-C31ZjFv4.js";import"./arrow-left-C1Em4siw.js";import"./spinner-DKuwCQW-.js";import"./task-route-D70_7rUP.js";import"./data-refresh-DCoLd0ZF.js";import"./use-api-data-BVSK64gV.js";import"./useQuery-DW8GKkbA.js";import"./presentation-Cl5yrQiK.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
