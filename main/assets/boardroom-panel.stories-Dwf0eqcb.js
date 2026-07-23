import{aU as T}from"./iframe-DLeraoju.js";import{i as w}from"./mock-fetch-aFrr3kfG.js";import{p as x,d as D,v as k}from"./fixtures-BZzR_DAR.js";import{B as g}from"./boardroom-panel-w3bLHVWo.js";import"./preload-helper-Dp1pzeXC.js";import"./index-C3aUEuMX.js";import"./Select-ef7c0426.esm-B6l0Gi7I.js";import"./chevron-down-Bmrm0Egb.js";import"./check-PugQV7Rd.js";import"./project-tag-DQvgoEyd.js";import"./project-modal-jBhmMwzr.js";import"./export-menu-BshC9IoE.js";import"./client-D33A9yMR.js";import"./markdown-preview-Cv0ofKO9.js";import"./index.dom-D_wTd2ti.js";import"./file-text-Muk5nN1o.js";import"./copy-DpHz3Bss.js";import"./file-code-corner-1kOl6fLD.js";import"./loader-circle-42xSyFfw.js";import"./api-DCvMs7Zt.js";import"./folder-open-B-Zrb1_r.js";import"./folder-DeY5o1MA.js";import"./tag-color-picker-kaBX3lKk.js";import"./sparkles-DAERdMJ0.js";import"./brain-BuDRlc-v.js";import"./chevron-right-IKyZ4OUZ.js";import"./markdown-editor-D59z4vtk.js";import"./pencil-2BlngtNI.js";import"./trash-2-4KLk-rW-.js";import"./confirm-dialog-Bw8Swsnf.js";import"./index-DI1nNaqM.js";import"./triangle-alert-_Bn6K87F.js";import"./templates-B6M1OYb3.js";import"./plus-D4NseWk3.js";import"./task-row-CuspKZA4.js";import"./i18n-labels-Duvftzw4.js";import"./selectable-icon-BPZPDDb5.js";import"./task-columns-DXf2yYcn.js";import"./refresh-cw-Bdv87O6z.js";import"./arrow-left-BvBXwsIy.js";import"./spinner-DBd64yv3.js";import"./task-route-D70_7rUP.js";import"./data-refresh-D8qatiV1.js";import"./use-api-data-oxx5Mo8K.js";import"./useQuery-CaUKZFvf.js";import"./presentation-2UZItjao.js";var s,m,i,c,p,l,d,h,v,u,_,j,y,f,E;const{expect:r,fn:I,within:B}=__STORYBOOK_MODULE_TEST__,wt={title:"Office/BoardroomPanel",component:g,args:{onClose:I()},decorators:[t=>T.jsx("div",{className:"relative h-[34rem] w-full max-w-xl",children:T.jsx(t,{})})]},o={beforeEach:()=>w([{match:"/projects",json:{items:[x,D],total:2}},{match:"/tasks",json:{items:k,total:k.length}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByRole("heading",{name:"Board Room"})).toBeInTheDocument(),await r(await e.findByText(x.name)).toBeInTheDocument(),await r(e.getByText(D.name)).toBeInTheDocument()}},a={beforeEach:()=>w([{match:"/projects",json:{items:[],total:0}},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText("No projects yet.")).toBeInTheDocument()}},n={beforeEach:()=>w([{match:"/projects",status:500},{match:"/tasks",json:{items:[],total:0}},{match:"/memories",json:{memories:[]}}]),play:async({canvasElement:t})=>{const e=B(t);await r(await e.findByText(/Couldn’t load projects/)).toBeInTheDocument()}};o.parameters={...o.parameters,docs:{...(s=o.parameters)===null||s===void 0?void 0:s.docs,source:{originalSource:`{
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
