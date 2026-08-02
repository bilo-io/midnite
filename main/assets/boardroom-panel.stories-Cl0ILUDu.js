import{a_ as T}from"./iframe-DGTzC655.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-Bbni24hC.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DtSqUx_P.js";import"./Select-ef7c0426.esm-B91OB_Ca.js";import"./chevron-down-Dzfo0S2z.js";import"./check-1Qsczorf.js";import"./project-tag-Hqv6WuUW.js";import"./project-modal-rJvVGT4M.js";import"./export-menu-Du2R4M2o.js";import"./client-DVM2bddV.js";import"./markdown-preview-LiVLujgH.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CgI4iZGn.js";import"./copy-DwMWbPGY.js";import"./file-code-corner-CnJlniry.js";import"./loader-circle-CEgbo75J.js";import"./api-C-ORmROe.js";import"./folder-open-DvrJTfEc.js";import"./folder-5z9QcxzC.js";import"./tag-color-picker-8uBr7lmB.js";import"./sparkles-CFUMhXIV.js";import"./brain-BBigkZ5w.js";import"./chevron-right-DP3dKKLL.js";import"./markdown-editor-BPdc5U3D.js";import"./pencil-C33RNF2s.js";import"./trash-2-DYjGCppr.js";import"./confirm-dialog-FnNQBX7T.js";import"./index-DkH9PpOg.js";import"./templates-CvusFARI.js";import"./plus-CVJEZdtw.js";import"./task-row-CmM4XkN9.js";import"./blocked-badge-D5UDJxdt.js";import"./selectable-icon-DQHJaOvb.js";import"./hover-expand-button-DNQS8v0p.js";import"./index-CiF2WvTa.js";import"./data-refresh-Bo76m2Fd.js";import"./rotate-ccw-IdHjHSsf.js";import"./play-DIiPk1IC.js";import"./square-terminal-Da8kjznX.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-B49Up_QR.js";import"./spinner-CTUfBIR4.js";import"./task-route-D70_7rUP.js";import"./use-api-data-p86y0hE7.js";import"./useQuery-DdeOeSsq.js";import"./presentation-Bxu5Zhqu.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
