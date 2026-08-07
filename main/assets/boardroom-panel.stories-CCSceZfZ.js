import{b1 as T}from"./iframe-KMlIBV4_.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BVBylOHg.js";import"./preload-helper-Dp1pzeXC.js";import"./index-B9j58Npd.js";import"./Select-ef7c0426.esm-lYMvhqfW.js";import"./chevron-down-DflNbZYE.js";import"./check-DM_W3Lsg.js";import"./project-tag-C98ITMV0.js";import"./project-modal-C6z1TT70.js";import"./export-menu-BNLWA_Od.js";import"./client-Cvcsr1ry.js";import"./markdown-preview-DijPI9Rh.js";import"./index.dom-D_wTd2ti.js";import"./copy-BKZcA5N7.js";import"./file-code-corner-g8Vw8dVk.js";import"./file-text-CWb5SI4n.js";import"./loader-circle-qjzoEtaa.js";import"./api-Y_bSZqsN.js";import"./folder-open-MXmDq0wS.js";import"./folder-D7rpVmXA.js";import"./tag-color-picker-CH4zrxZ_.js";import"./sparkles-BEKEN9Zg.js";import"./brain-epGdpGSq.js";import"./chevron-right-3VDnU3Ty.js";import"./markdown-editor-Bnq-Mz_i.js";import"./pencil-C9QBfqEB.js";import"./trash-2-DSS3jmYl.js";import"./confirm-dialog-Bj8trpau.js";import"./templates-CiDP9Sw1.js";import"./project-template-labels-MqbbVOlY.js";import"./plus-Dp4wqKtX.js";import"./task-row-BzMhkXbR.js";import"./blocked-badge-1DFYjmNn.js";import"./selectable-icon-TmefpPon.js";import"./hover-expand-button-BfmxtdL8.js";import"./index-B7eozYAN.js";import"./data-refresh-cwGi3ZJD.js";import"./rotate-ccw-BRJJyRnZ.js";import"./play-NkoGXNnp.js";import"./square-terminal-BG07kAiz.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-QDlNF87M.js";import"./spinner-C6ulAPee.js";import"./task-route-D70_7rUP.js";import"./use-api-data-DR_p5evN.js";import"./useQuery-BimcCUrE.js";import"./presentation-Buh12Ma6.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
