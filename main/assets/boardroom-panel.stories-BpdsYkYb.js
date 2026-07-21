import{l as T}from"./iframe-Cg2o_Bk-.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BXZZ1C6b.js";import"./preload-helper-Dp1pzeXC.js";import"./index-CbYVl3vK.js";import"./index-Bw-__ywM.js";import"./Select-ef7c0426.esm-BlqT6X20.js";import"./chevron-down-3i-4yyLW.js";import"./check-CKIAQW2Y.js";import"./project-tag-C79VjqWu.js";import"./site-links-BhZk_F72.js";import"./project-modal-B4178Os2.js";import"./export-menu-67f6J86c.js";import"./client-CvmEeLGy.js";import"./markdown-preview-CSJgyjZY.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BpA8qNpb.js";import"./copy-C4xCETH5.js";import"./file-code-corner-_e7vfKHt.js";import"./loader-circle-CvljujOb.js";import"./api-CJSY_K2f.js";import"./folder-open-BK6Kvm5z.js";import"./folder-B7A1myN_.js";import"./tag-color-picker-Dww-Mcpx.js";import"./sparkles-zNWOS-pY.js";import"./brain-BbmngoGp.js";import"./chevron-right-CJKK8M78.js";import"./markdown-editor-BRV3VD_M.js";import"./pencil-Cde1HOwV.js";import"./trash-2-C38F6-sq.js";import"./confirm-dialog-Di0qRtPT.js";import"./triangle-alert-DgzQ2CjE.js";import"./templates-B6M1OYb3.js";import"./plus-07WdCAvi.js";import"./task-row-c39ZUFY8.js";import"./blocked-badge-By_50ja3.js";import"./selectable-icon-pMkpMezb.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-DL5J-424.js";import"./arrow-left-DRhuQn9L.js";import"./spinner-JnBEP7Uf.js";import"./task-route-D70_7rUP.js";import"./data-refresh-CHhBKfBG.js";import"./use-api-data-Dy-FGUKy.js";import"./useQuery-DT68ppIB.js";import"./presentation-CRom9_3c.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,Bt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
}`,...(y=n.parameters)===null||y===void 0||(j=y.docs)===null||j===void 0?void 0:j.source},description:{story:"A failed load (the combined fetch rejects) → the error fallback.",...(E=n.parameters)===null||E===void 0||(f=E.docs)===null||f===void 0?void 0:f.description}}};const Tt=["Default","Empty","Error"];export{o as Default,a as Empty,n as Error,Tt as __namedExportsOrder,Bt as default};
