import{aX as T}from"./iframe-Dr_VwFta.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-BQF6lR9n.js";import"./preload-helper-Dp1pzeXC.js";import"./index-DbknnWkK.js";import"./Select-ef7c0426.esm-DAVOj5bJ.js";import"./chevron-down-DQvzNExA.js";import"./check-DY-hLZWr.js";import"./project-tag-Bs2GOdeZ.js";import"./project-modal-DIi1iccF.js";import"./export-menu-BnZ4XTYk.js";import"./client-CfyM-BlH.js";import"./markdown-preview-BFOF95CL.js";import"./index.dom-D_wTd2ti.js";import"./file-text-BQ0MBE-U.js";import"./copy-B9ltfRSS.js";import"./file-code-corner-D0QfsMAt.js";import"./loader-circle-DTEd4G6m.js";import"./api-CleKQgFz.js";import"./folder-open-DMLYP9p9.js";import"./folder-DKkOlzov.js";import"./tag-color-picker-DG1gy-SP.js";import"./sparkles-Cs_jyHTG.js";import"./brain-CFKGUKH1.js";import"./chevron-right-DCYLM4Ch.js";import"./markdown-editor-Cq2IrOwF.js";import"./pencil-DeR-l2dr.js";import"./trash-2-059ARBlU.js";import"./confirm-dialog-DlRbtcY9.js";import"./index-CPeuVqq3.js";import"./triangle-alert-DAvh6LaN.js";import"./templates-BIfTjvPG.js";import"./plus-BibRmqiN.js";import"./task-row-B6Z_uvOY.js";import"./i18n-labels-Cjc-x4Lr.js";import"./selectable-icon-D5_o9uRB.js";import"./hover-expand-button-BHrZL0vf.js";import"./index-DubJRMxG.js";import"./data-refresh-DwVx7zZg.js";import"./rotate-ccw-BvjUw83q.js";import"./play-CPsT9xAk.js";import"./square-terminal-Dn8T12bp.js";import"./task-columns-BUR8DOSo.js";import"./spinner-BPFUiWzr.js";import"./task-route-D70_7rUP.js";import"./use-api-data-_vB2Uq6Z.js";import"./useQuery-CfLdcoAQ.js";import"./presentation-4OqAP2hr.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
