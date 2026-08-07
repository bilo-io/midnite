import{b0 as T}from"./iframe-DlBfs_lR.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CevMNIHJ.js";import"./preload-helper-Dp1pzeXC.js";import"./index-Dqr_Nyuo.js";import"./Select-ef7c0426.esm-IVLRAlso.js";import"./chevron-down-BAaOqp_j.js";import"./check-Crqnyvo_.js";import"./project-tag-DZtiWFEM.js";import"./project-modal-hEqdqehY.js";import"./export-menu-ICGxSu4P.js";import"./client-Tl0zibvU.js";import"./markdown-preview-BgBspyNA.js";import"./index.dom-D_wTd2ti.js";import"./copy-CuHNImyk.js";import"./file-code-corner-mj4G8WPf.js";import"./file-text-Df17ZioT.js";import"./loader-circle-Dq3TJOMa.js";import"./api-BuvDpgZJ.js";import"./folder-open-eoRRj5Ad.js";import"./folder-CXItTM2t.js";import"./tag-color-picker-l-lSfzY6.js";import"./sparkles-Bvgftha0.js";import"./brain-Dn-pR13_.js";import"./chevron-right-CQo3wZWb.js";import"./markdown-editor-DI_onJDM.js";import"./pencil-UV-hNNcI.js";import"./trash-2-CN6JYMdu.js";import"./confirm-dialog-DIQnjAJ7.js";import"./templates-DXNpXsAG.js";import"./project-template-labels-CIBjVYxO.js";import"./plus-Cg5jqMdo.js";import"./task-row-CXYtRGT3.js";import"./blocked-badge-DS_gTvGN.js";import"./selectable-icon-Fyalfz9W.js";import"./hover-expand-button-s6-hQg9i.js";import"./index-bZDX5cEx.js";import"./data-refresh-_SyiZq5D.js";import"./rotate-ccw-Cx-mFE8b.js";import"./play-CtJKqIDI.js";import"./square-terminal-CP9Ad_2_.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-62cKiE26.js";import"./spinner-COMJaosQ.js";import"./task-route-D70_7rUP.js";import"./use-api-data--rGxyYUI.js";import"./useQuery-Dy2BILXM.js";import"./presentation-BN0xA9x2.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
