import{aW as T}from"./iframe-DD6J2V9Z.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-JN15L-bk.js";import"./preload-helper-Dp1pzeXC.js";import"./index-fOywJmWU.js";import"./Select-ef7c0426.esm-CynbO7tK.js";import"./chevron-down-BFjzmdj6.js";import"./check-Ds6ZIPnX.js";import"./project-tag-w20hYnrJ.js";import"./project-modal-mYJHriRq.js";import"./export-menu-BWouxW_8.js";import"./client-6Vscr_d0.js";import"./markdown-preview-CsdYLdnj.js";import"./index.dom-D_wTd2ti.js";import"./file-text-CPRES2UB.js";import"./copy-gFFkSnOB.js";import"./file-code-corner-BDPPKrxN.js";import"./loader-circle-CAnXLVe8.js";import"./api-BWp-Xm6J.js";import"./folder-open-CyLHxIC3.js";import"./folder-BCiEL-GS.js";import"./tag-color-picker-NqcvZvut.js";import"./sparkles-j56IR1z4.js";import"./brain-B3m5IKlJ.js";import"./chevron-right-Bj9Y-oQU.js";import"./markdown-editor-BQctCXfP.js";import"./pencil-MXKOkNud.js";import"./trash-2-DKk_RvWC.js";import"./confirm-dialog-DM-h8Uzw.js";import"./index-C5IrUWvr.js";import"./triangle-alert-CAnzormr.js";import"./templates-B6M1OYb3.js";import"./plus-tWibeJVE.js";import"./task-row-DD1n9JkG.js";import"./i18n-labels-b_5SlVLg.js";import"./selectable-icon-CLozF4Ie.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-B3ciXrKi.js";import"./arrow-left-nKQGunEB.js";import"./spinner-BGnqmzrk.js";import"./task-route-D70_7rUP.js";import"./data-refresh-Do1rxecL.js";import"./use-api-data-BLGjuUA3.js";import"./useQuery-CLjVZAk7.js";import"./presentation-CBd9sTMU.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
