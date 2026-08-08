import{b0 as T}from"./iframe-pWg6ZGrB.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-CcptiEZG.js";import"./preload-helper-Dp1pzeXC.js";import"./index-UGZ6tnU3.js";import"./Select-ef7c0426.esm-BqIheCCW.js";import"./chevron-down-Bg_Y5Vy9.js";import"./check-BiOl4hOc.js";import"./project-tag-CkZYhfF7.js";import"./project-modal-DpAsOWFj.js";import"./export-menu-SF2lqpLr.js";import"./client-BKKvCWCQ.js";import"./markdown-preview-CMBbz7ht.js";import"./index.dom-D_wTd2ti.js";import"./copy-P2n5MOUM.js";import"./file-code-corner-DQZzDwcy.js";import"./file-text-DhduFBI-.js";import"./loader-circle-hXqGYp0P.js";import"./api-Dcd-pKsf.js";import"./folder-open-CX02PR_g.js";import"./folder-CWc_SqFS.js";import"./tag-color-picker-CAIZ4F7B.js";import"./sparkles-Ci_VZQAH.js";import"./brain-D6eDBZ8k.js";import"./chevron-right-tNs75Zw3.js";import"./markdown-editor-CDc4IAcN.js";import"./pencil-WXvOzQ9J.js";import"./trash-2-DYWe6EYA.js";import"./confirm-dialog-t5CLlvqX.js";import"./templates-BogOa-4Q.js";import"./project-template-labels-Cw9WFy4j.js";import"./plus-SMKzRe_2.js";import"./task-row-CDEJs1Cq.js";import"./blocked-badge-WCi0SfC6.js";import"./selectable-icon-Cn6uBRBM.js";import"./hover-expand-button-CAc3mATs.js";import"./index-CJiLS91F.js";import"./data-refresh-CPI9p50a.js";import"./rotate-ccw-DB5Qqh5B.js";import"./play-DV1rIny7.js";import"./square-terminal-Bz3I2JgO.js";import"./task-columns-B1XLsCUu.js";import"./i18n-labels-DbAsHrp1.js";import"./spinner-BUHLEDib.js";import"./task-route-D70_7rUP.js";import"./use-api-data-BgDeL-ir.js";import"./useQuery-Cm_hkCGG.js";import"./presentation-C0JDyKq9.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:b,within:B}=__STORYBOOK_MODULE_TEST__,xt={title:"Office/BoardroomPanel",component:g,args:{onClose:b()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},e={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await o.findByText(x.name)).toBeInTheDocument(),await r(o.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const o=B(t);await r(await o.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};e.parameters={...e.parameters,docs:{...(s=e.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
